import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {bindRig} from './animation.js';

// All vertices are authored in bind-pose metres. Continuous ring surfaces span
// each elbow/knee, with blended bone influences instead of separate joint balls.
const humanCache=new Map();let creatureCache;
const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};

function makeSkeleton(monster=false){
  const root=new THREE.Group(),bones=[],indices={};
  const bone=(name,x,y,z,parent)=>{const b=new THREE.Bone();b.name=`rig:${name}`;b.position.set(x,y,z);parent.add(b);indices[name]=bones.length;bones.push(b);return b;};
  const body=bone('body',0,monster?2.18:.86,0,root);
  const neck=bone('neck',0,monster?1.27:.65,monster?-.09:0,body);
  const head=bone('head',0,monster?.4:.21,monster?.15:.01,neck);
  const jaw=bone('jaw',0,monster?.17:.13,monster?.14:.12,neck);
  for(const s of [-1,1]){const side=s<0?'L':'R';const shoulder=bone(`shoulder${side}`,s*(monster?.54:.25),monster?1.17:.56,0,body);bone(`elbow${side}`,0,monster?-1.2:-.34,0,shoulder);const hip=bone(`hip${side}`,s*(monster?.22:.13),0,0,body);bone(`knee${side}`,0,monster?-1.1:-.4,0,hip);}
  root.updateMatrixWorld(true);return {root,bones,indices,body,neck,head,jaw,skeleton:new THREE.Skeleton(bones)};
}

class Surface {
  constructor(indices){this.indices=indices;this.p=[];this.uv=[];this.si=[];this.sw=[];this.tri=[];}
  vertex(x,y,z,weights,uv=[0,0]){this.p.push(x,y,z);this.uv.push(...uv);const entries=Object.entries(weights).filter(([,w])=>w>0);let total=entries.reduce((sum,[,w])=>sum+w,0)||1;for(let i=0;i<4;i++){this.si.push(entries[i]?this.indices[entries[i][0]]:0);this.sw.push(entries[i]?entries[i][1]/total:0);}return this.p.length/3-1;}
  loft(rings,weights,{segments=20,wrinkle=0,sculpt=null,angleStart=0,angleLength=Math.PI*2}={}){
    const start=this.p.length/3;
    rings.forEach((r,j)=>{for(let i=0;i<=segments;i++){const a=angleStart+i/segments*angleLength;let x=r.x+Math.cos(a)*r.rx,y=r.y,z=(r.z||0)+Math.sin(a)*r.rz;const ripple=wrinkle*Math.sin(j*2.3+a*5)*Math.sin(Math.PI*j/(rings.length-1));x+=Math.cos(a)*ripple;z+=Math.sin(a)*ripple;if(sculpt)[x,y,z]=sculpt(x,y,z,a,j);this.vertex(x,y,z,weights(x,y,z),[i/segments,j/(rings.length-1)]);}});
    const ascending=rings.at(-1).y>rings[0].y;
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<segments;i++){const a=start+j*(segments+1)+i,b=a+segments+1;if(ascending)this.tri.push(a,b,a+1,a+1,b,b+1);else this.tri.push(a,a+1,b,a+1,b+1,b);}
  }
  append(geometry,weights,transform=new THREE.Matrix4()){
    const p=geometry.attributes.position,uv=geometry.attributes.uv,start=this.p.length/3,v=new THREE.Vector3();for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(transform);this.vertex(v.x,v.y,v.z,typeof weights==='function'?weights(v.x,v.y,v.z):weights,uv?[uv.getX(i),uv.getY(i)]:[0,0]);}
    const idx=geometry.index;for(let i=0;i<(idx?.count??p.count);i++)this.tri.push(start+(idx?idx.getX(i):i));geometry.dispose();
  }
  tube(points,radius,weights,segments=28,sides=6){this.append(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),segments,radius,sides,false),weights);}
  geometry(){const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(this.uv,2));g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(this.si,4));g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(this.sw,4));g.setIndex(this.tri);g.computeVertexNormals();g.computeBoundingBox();g.computeBoundingSphere();return g;}
}

const ring=(y,rx,rz,x=0,z=0)=>({x,y,z,rx,rz});
function ellipsoid(surface,center,radii,weights,width=12,height=8){const m=new THREE.Matrix4().compose(new THREE.Vector3(...center),new THREE.Quaternion(),new THREE.Vector3(...radii));surface.append(new THREE.SphereGeometry(1,width,height),weights,m);}
function patch(surface,rows,weights){const start=surface.p.length/3;rows.forEach((row,j)=>row.forEach((p,i)=>surface.vertex(...p,weights,[i/(row.length-1),j/(rows.length-1)])));const width=rows[0].length;for(let j=0;j<rows.length-1;j++)for(let i=0;i<width-1;i++){const a=start+j*width+i,b=a+width;surface.tri.push(a,b,a+1,a+1,b,b+1);}}

function humanGeometry(longHair){
  if(humanCache.has(longHair))return humanCache.get(longHair);
  const {indices}=makeSkeleton(),skin=new Surface(indices),shirt=new Surface(indices),pants=new Surface(indices),shoes=new Surface(indices),sole=new Surface(indices),hair=new Surface(indices),eyes=new Surface(indices),iris=new Surface(indices),dark=new Surface(indices),trim=new Surface(indices);
  const torsoWeight=(x,y)=>y>1.59?{head:1}:y>1.46?{body:1-smooth(1.46,1.59,y),neck:smooth(1.46,1.59,y)}:{body:1};
  skin.loft([ring(.86,.18,.13),ring(1.03,.18,.12),ring(1.27,.23,.14),ring(1.42,.25,.13),ring(1.48,.13,.095),ring(1.52,.065,.065),ring(1.58,.067,.065,0,.005),ring(1.605,.085,.075,0,.03),ring(1.64,.115,.10,0,.025),ring(1.69,.135,.123,0,.012),ring(1.75,.145,.136),ring(1.81,.143,.137,0,-.008),ring(1.87,.127,.127,0,-.015),ring(1.915,.088,.085,0,-.016),ring(1.94,.005,.005,0,-.016)],torsoWeight,{segments:36,sculpt:(x,y,z,a)=>{if(y>1.62&&y<1.79&&Math.sin(a)>.4){const cheek=Math.exp(-(((y-1.71)/.045)**2))*Math.exp(-(((Math.abs(x)-.095)/.04)**2));z+=cheek*.012;}return[x,y,z];}});
  shirt.loft([ring(.845,.184,.139),ring(.88,.191,.145),ring(.95,.19,.135),ring(1.06,.194,.132),ring(1.2,.229,.145),ring(1.32,.249,.151),ring(1.41,.265,.142),ring(1.465,.222,.115),ring(1.495,.083,.075)],()=>({body:1}),{segments:36,wrinkle:.0038});
  pants.loft([ring(.74,.18,.13),ring(.81,.204,.146),ring(.87,.202,.145),ring(.9,.192,.135)],()=>({body:1}),{segments:28,wrinkle:.002});
  for(const s of [-1,1]){
    const side=s<0?'L':'R',shoulder=`shoulder${side}`,elbow=`elbow${side}`,hip=`hip${side}`,knee=`knee${side}`;
    const armWeight=(x,y)=>{const e=1-smooth(1.045,1.17,y),b=smooth(1.39,1.47,y)*.5;return {[elbow]:e,[shoulder]:(1-e)*(1-b),body:(1-e)*b};};
    skin.loft([ring(1.455,.077,.073,s*.25),ring(1.38,.078,.075,s*.275),ring(1.27,.071,.066,s*.286),ring(1.16,.063,.059,s*.29),ring(1.10,.061,.058,s*.29),ring(1.055,.064,.06,s*.289),ring(.98,.064,.052,s*.29),ring(.88,.048,.038,s*.29),ring(.81,.034,.029,s*.29),ring(.775,.039,.026,s*.29),ring(.735,.052,.024,s*.29,.009),ring(.695,.048,.023,s*.29,.015),ring(.681,.041,.018,s*.29,.015)],armWeight,{segments:20,sculpt:(x,y,z,a)=>[x,y,z+(y<1.04&&y>.85?Math.cos(a*2)*.003:0)]});
    shirt.loft([ring(1.483,.003,.003,s*.25),ring(1.475,.039,.038,s*.25),ring(1.455,.071,.071,s*.25),ring(1.40,.085,.078,s*.27),ring(1.32,.085,.076,s*.282),ring(1.245,.078,.071,s*.29),ring(1.23,.079,.072,s*.29)],armWeight,{segments:28,wrinkle:.0012});
    // A flattened sewn deltoid bridge overlaps the torso and sleeve surfaces.
    // Its weights transition across the shoulder, so posed arms retain coverage.
    const shoulderBridge=(x)=>{const t=smooth(.15,.33,Math.abs(x));return {body:1-t,[shoulder]:t};};
    ellipsoid(shirt,[s*.235,1.435,0],[.115,.05,.105],shoulderBridge,20,10);
    for(let f=0;f<4;f++){const x=s*.29+(f-1.5)*.022,length=[.105,.13,.12,.09][f],start=.696;
      skin.loft([ring(start,.011,.012,x,.018),ring(start-.035,.012,.012,x,.023),ring(start-length*.65,.009,.01,x+s*.002,.036),ring(start-length,.006,.007,x+s*.004,.051),ring(start-length-.006,.001,.001,x+s*.004,.05)],()=>({[elbow]:1}),{segments:8});
    }
    skin.loft([ring(.76,.017,.015,s*.335,.005),ring(.724,.017,.014,s*.35,.018),ring(.689,.014,.013,s*.356,.037),ring(.665,.008,.009,s*.35,.055),ring(.66,.001,.001,s*.348,.056)],()=>({[elbow]:1}),{segments:10});
    const legWeight=(x,y)=>{const t=1-smooth(.4,.53,y);return {[hip]:1-t,[knee]:t};};
    pants.loft([ring(.87,.102,.118,s*.12),ring(.77,.105,.112,s*.13),ring(.65,.092,.096,s*.13),ring(.54,.078,.081,s*.13),ring(.47,.078,.079,s*.13,.002),ring(.41,.08,.077,s*.13),ring(.31,.073,.071,s*.13),ring(.18,.057,.057,s*.13),ring(.12,.056,.052,s*.13),ring(.105,.059,.054,s*.13)],legWeight,{segments:24,wrinkle:.0028});
    const foot={[knee]:1};
    shoes.loft([ring(.037,.09,.154,s*.13,.063),ring(.055,.096,.172,s*.13,.068),ring(.095,.094,.167,s*.13,.066),ring(.13,.08,.139,s*.13,.038),ring(.157,.059,.09,s*.13,-.008),ring(.165,.045,.053,s*.13,-.02)],()=>foot,{segments:28});
    sole.loft([ring(.012,.001,.001,s*.13,.065),ring(.013,.091,.161,s*.13,.065),ring(.026,.098,.175,s*.13,.066),ring(.045,.098,.174,s*.13,.066)],()=>foot,{segments:28});
    for(let l=0;l<4;l++)trim.tube([[s*.13-.04,.143-l*.009,.01+l*.023],[s*.13,.151-l*.009,.021+l*.023],[s*.13+.04,.143-l*.009,.01+l*.023]],.0022,foot,8,4);
    trim.tube([[s*.23,.88,.04],[s*.22,.72,.045],[s*.208,.5,.035],[s*.193,.24,.035],[s*.186,.12,.028]],.0014,legWeight,22,4);
    // Modeled ear helix and lobe, joined to the head rather than a joint sphere.
    skin.loft([ring(1.655,.006,.008,s*.15,-.005),ring(1.675,.019,.021,s*.158,-.003),ring(1.72,.025,.027,s*.161,-.007),ring(1.765,.021,.025,s*.16,-.012),ring(1.785,.007,.009,s*.151,-.016)],()=>({head:1}),{segments:14});
    dark.tube([[s*.161,1.69,.017],[s*.174,1.715,.018],[s*.174,1.745,.014]],.0038,{head:1},9,5);
    const eyeX=s*.063,eyeY=1.756,eyeZ=.132;
    ellipsoid(eyes,[eyeX,eyeY,eyeZ],[.025,.0095,.010],{head:1},16,8);
    const im=new THREE.Matrix4().makeTranslation(eyeX,eyeY,eyeZ+.0098);iris.append(new THREE.CircleGeometry(.0065,18),{head:1},im);
    dark.append(new THREE.CircleGeometry(.0032,14),{head:1},new THREE.Matrix4().makeTranslation(eyeX,eyeY,eyeZ+.0102));
    const upper=[],lower=[],brow=[];for(let k=0;k<=8;k++){const t=k/8,x=eyeX-.025+t*.05;upper.push([x,eyeY+Math.sin(t*Math.PI)*.0095,eyeZ+.008]);lower.push([x,eyeY-Math.sin(t*Math.PI)*.006,eyeZ+.008]);brow.push([x,eyeY+.026+Math.sin(t*Math.PI)*.004,eyeZ+.003]);}
    skin.tube(upper,.0015,{head:1},16,5);skin.tube(lower,.0012,{head:1},16,5);hair.tube(brow,.0022,{head:1},16,5);
  }
  // Nasal bridge/tip is a sculpted grid surface; nostrils and lip rolls are modeled.
  const noseRows=[];for(let j=0;j<9;j++){const t=j/8,y=1.795-t*.091,w=.011+Math.sin(t*Math.PI)*.006+(t>.7?.01:0),row=[];for(let i=0;i<9;i++){const u=i/8*2-1;row.push([u*w,y,.126+Math.sin(t*Math.PI*.88)*(.018+.05*(1-u*u))]);}noseRows.push(row);}patch(skin,noseRows,{head:1});
  for(const s of [-1,1])ellipsoid(dark,[s*.016,1.71,.169],[.006,.0028,.004],{head:1},8,5);
  skin.tube([[-.044,1.665,.12],[-.022,1.668,.137],[0,1.665,.147],[.022,1.668,.137],[.044,1.665,.12]],.004,{head:1},20,6);
  skin.tube([[-.043,1.661,.12],[0,1.654,.144],[.043,1.661,.12]],.005,{head:1},20,6);
  dark.tube([[-.04,1.663,.123],[0,1.661,.146],[.04,1.663,.123]],.0011,{head:1},18,4);
  // Collar flaps, raised placket, cuffs and actual buttons provide clothing scale.
  for(const s of [-1,1])patch(shirt,[[[s*.016,1.494,.074],[s*.079,1.492,.076],[s*.124,1.454,.117]],[[s*.018,1.457,.124],[s*.065,1.414,.153],[s*.119,1.449,.129]]],{body:1});
  trim.tube([[0,1.48,.092],[0,1.43,.146],[0,1.34,.155]],.003,{body:1},16,4);
  for(let j=0;j<3;j++)ellipsoid(trim,[.006,1.435-j*.035,.151],[.005,.005,.0025],{body:1},8,5);
  // A fitted scalp follows the head profile. Each lock is a tapered waved ribbon.
  hair.loft([ring(1.79,.162,.155,0,-.0053),ring(1.81,.161,.155,0,-.008),ring(1.87,.145,.145,0,-.015),ring(1.915,.106,.103,0,-.016),ring(1.94,.023,.023,0,-.016),ring(1.954,.001,.001,0,-.016)],()=>({head:1}),{segments:40});
  if(longHair)hair.loft([ring(1.84,.166,.157,0,-.025),ring(1.76,.174,.162,0,-.03),ring(1.65,.179,.157,0,-.038),ring(1.53,.185,.15,0,-.043),ring(1.43,.179,.137,0,-.052),ring(1.40,.163,.12,0,-.055)],()=>({head:1}),{segments:36,angleStart:Math.PI*.75,angleLength:Math.PI*1.5,wrinkle:.004});
  const lockCount=longHair?49:38;
  for(let i=0;i<lockCount;i++){
    const a=i/lockCount*Math.PI*2,front=Math.sin(a)>.6;const rows=[];const length=longHair?(front?.082:.46):.065+(i%4)*.008;
    for(let j=0;j<9;j++){const t=j/8,angle=a+Math.sin(t*7+i*.7)*.065*t,r=.126+Math.sin(t*Math.PI)*.045;const x=Math.cos(angle)*r+(longHair?Math.sin(t*11+i)*.016*t:0),y=1.87-t*length,z=-.025+Math.sin(angle)*r-(longHair&&!front?t*.015:0);const width=(1-t*.8)*(longHair?.018:.021),dx=Math.cos(angle+Math.PI/2)*width,dz=Math.sin(angle+Math.PI/2)*width;rows.push([[x-dx,y,z-dz],[x,y+.003,z],[x+dx,y,z+dz]]);}
    patch(hair,rows,{head:1});
  }
  const result={skin:skin.geometry(),shirt:shirt.geometry(),pants:pants.geometry(),shoes:shoes.geometry(),sole:sole.geometry(),hair:hair.geometry(),eyes:eyes.geometry(),iris:iris.geometry(),dark:dark.geometry(),trim:trim.geometry()};
  // Adult head proportions, including every facial feature and hair vertex.
  for(const geometry of Object.values(result)){const p=geometry.attributes.position,weights=geometry.attributes.skinWeight,bones=geometry.attributes.skinIndex;for(let i=0;i<p.count;i++){let headWeight=0;for(let j=0;j<4;j++)if(bones.getComponent(i,j)===indices.head)headWeight+=weights.getComponent(i,j);if(headWeight>0){p.setX(i,p.getX(i)*(1-.26*headWeight));p.setZ(i,p.getZ(i)*(1-.15*headWeight));if(p.getY(i)>1.6)p.setY(i,1.6+(p.getY(i)-1.6)*(1-.18*headWeight));}}p.needsUpdate=true;geometry.computeVertexNormals();geometry.computeBoundingBox();geometry.computeBoundingSphere();}
  humanCache.set(longHair,result);return result;
}

function material(color,roughness=.8){return new THREE.MeshStandardMaterial({color,roughness,metalness:0});}
function assemble(data,geometries,materials){
  const actor=data.root;actor.name='character';const meshes={};for(const[name,geometry]of Object.entries(geometries)){const mesh=new THREE.SkinnedMesh(geometry,materials[name]);mesh.name=`surface:${name}`;mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;actor.add(mesh);actor.updateMatrixWorld(true);mesh.bind(data.skeleton);meshes[name]=mesh;}
  const rig=bindRig(actor);actor.userData={rig,materials:[...new Set(Object.values(materials))],arms:[rig.joints.shoulderL,rig.joints.shoulderR],legs:[rig.joints.hipL,rig.joints.hipR],parts:{body:data.body,neck:data.neck,jaw:data.jaw,skull:data.head,torso:meshes.skin},meshes};return actor;
}

export function createHuman({color='#46627b',hairColor='#302a23',longHair=false,skinColor='#ab9583'}={}){
  const data=makeSkeleton(),materials={skin:material(skinColor,.76),shirt:material(color,.91),pants:material('#20292d',.95),shoes:material('#171b1d',.8),sole:material('#464747',.87),hair:material(hairColor,.88),eyes:material('#b0ada0',.38),iris:material('#4b4937',.5),dark:material('#312b27',.8),trim:material('#8a8d81',.85)};
  materials.hair.side=materials.shirt.side=THREE.DoubleSide;const actor=assemble(data,humanGeometry(longHair),materials);actor.userData.kind='human';return actor;
}

function monsterGeometry(){
  if(creatureCache)return creatureCache;const {indices}=makeSkeleton(true),skin=new Surface(indices),jaw=new Surface(indices),dark=new Surface(indices),horns=new Surface(indices),teeth=new Surface(indices),eyes=new Surface(indices);
  const bodyWeight=(x,y)=>y>3.69?{head:1}:y>3.3?{body:1-smooth(3.3,3.69,y),neck:smooth(3.3,3.69,y)}:{body:1};
  skin.loft([ring(1.84,.001,.001),ring(1.88,.21,.15),ring(2.04,.25,.17),ring(2.2,.23,.15),ring(2.36,.21,.145),ring(2.55,.29,.20),ring(2.75,.39,.235),ring(2.98,.46,.245),ring(3.15,.48,.23),ring(3.29,.31,.18),ring(3.37,.115,.115,0,-.06),ring(3.56,.115,.125,0,-.04),ring(3.65,.15,.16,0,.025),ring(3.77,.19,.20,0,.04),ring(3.95,.23,.23,0,.025),ring(4.075,.19,.19,0,-.005),ring(4.16,.085,.10,0,-.025),ring(4.18,.005,.005,0,-.025)],bodyWeight,{segments:40,sculpt:(x,y,z,a)=>{const front=Math.max(0,Math.sin(a));if(y>2.48&&y<3.13){z+=Math.pow(front,3)*Math.sin((y-2.48)*54)*.018;x+=Math.cos(a)*Math.sin(y*54)*.007;}z+=Math.cos(a*6+y*13)*.004;return[x,y,z];}});
  for(const s of [-1,1]){
    const side=s<0?'L':'R',shoulder=`shoulder${side}`,elbow=`elbow${side}`,hip=`hip${side}`,knee=`knee${side}`;
    const armWeight=(x,y)=>{const e=1-smooth(2.03,2.28,y),b=smooth(3.1,3.4,y)*.45;return {[elbow]:e,[shoulder]:(1-e)*(1-b),body:(1-e)*b};};
    skin.loft([ring(3.35,.14,.14,s*.49),ring(3.2,.145,.13,s*.55),ring(2.98,.115,.105,s*.57),ring(2.65,.085,.075,s*.57),ring(2.3,.075,.069,s*.56),ring(2.16,.075,.07,s*.55),ring(2.03,.082,.07,s*.55),ring(1.8,.075,.06,s*.55),ring(1.46,.045,.043,s*.55),ring(1.17,.035,.035,s*.55),ring(1.08,.065,.027,s*.55,.02),ring(.98,.063,.025,s*.55,.025)],armWeight,{segments:24,sculpt:(x,y,z,a)=>[x+Math.cos(a*3+y*8)*.006,y,z+Math.cos(a*4)*.005]});
    ellipsoid(skin,[s*.45,3.26,0],[.23,.2,.18],(x)=>{const t=smooth(.27,.61,Math.abs(x));return {body:1-t,[shoulder]:t};},24,12);
    ellipsoid(skin,[s*.18,2.05,0],[.15,.2,.16],(x,y)=>{const t=(1-smooth(2.0,2.22,y))*smooth(.035,.3,Math.abs(x));return {body:1-t,[hip]:t};},24,12);
    for(let f=0;f<4;f++){const x=s*.55+(f-1.5)*.034,length=.25+(f%3)*.04;skin.loft([ring(1.02,.016,.017,x,.024),ring(.93,.015,.014,x,.048),ring(1.02-length,.009,.011,x,.11),ring(.99-length,.002,.002,x,.13)],()=>({[elbow]:1}),{segments:9});}
    const legWeight=(x,y)=>{const t=1-smooth(.97,1.2,y);return {[hip]:1-t,[knee]:t};};
    skin.loft([ring(2.12,.13,.14,s*.21),ring(1.95,.145,.145,s*.22),ring(1.7,.11,.11,s*.23),ring(1.4,.084,.084,s*.23),ring(1.17,.072,.08,s*.23,.01),ring(1.07,.079,.086,s*.23,.025),ring(.97,.068,.075,s*.23,.03),ring(.76,.063,.065,s*.23,.045),ring(.41,.043,.05,s*.23,.04),ring(.17,.045,.055,s*.23,.04),ring(.08,.083,.19,s*.23,.11),ring(.025,.09,.23,s*.23,.14),ring(.014,.001,.001,s*.23,.14)],legWeight,{segments:24});
    const points=[[s*.18,4.02,.0],[s*.3,4.27,-.025],[s*.4,4.53,-.07],[s*.5,4.76,-.03],[s*(s>0?.65:.55),s>0?4.99:4.83,.02]];
    const hornRows=points.map((p,i)=>ring(p[1],.075*(1-i/(points.length-.5)),.065*(1-i/(points.length-.5)),p[0],p[2]));horns.loft(hornRows,()=>({head:1}),{segments:12,wrinkle:.004});
    horns.tube([[s*.39,4.47,-.06],[s*.58,4.57,-.03],[s*.75,4.68,.02]],.022,{head:1},12,6);
    ellipsoid(dark,[s*.102,3.996,.236],[.075,.043,.018],{head:1},14,8);ellipsoid(eyes,[s*.105,3.997,.252],[.026,.009,.005],{head:1},12,6);
    skin.tube([[s*.16,3.92,.19],[s*.19,3.8,.22],[s*.18,3.64,.20]],.027,{head:1},18,7);
  }
  // The lower jaw is weighted separately, with an actual dark throat and interlocking teeth.
  jaw.loft([ring(3.49,.085,.09,0,.15),ring(3.53,.16,.13,0,.16),ring(3.57,.19,.145,0,.15),ring(3.61,.17,.14,0,.14)],()=>({jaw:1}),{segments:28});
  ellipsoid(dark,[0,3.74,.235],[.139,.21,.027],{head:1},20,14);
  for(let i=0;i<12;i++){const lower=i%2===1,x=(Math.floor(i/2)-2.5)*.043,y=lower?3.61:3.86;const g=new THREE.ConeGeometry(.013,.105+(i%3)*.011,7);const m=new THREE.Matrix4().compose(new THREE.Vector3(x,y,.266),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),lower?0:Math.PI),new THREE.Vector3(1,1,1));teeth.append(g,lower?{jaw:1}:{head:1},m);}
  creatureCache={skin:skin.geometry(),jaw:jaw.geometry(),dark:dark.geometry(),horns:horns.geometry(),teeth:teeth.geometry(),eyes:eyes.geometry()};return creatureCache;
}

export function createCreature(){
  const data=makeSkeleton(true),materials={skin:material('#647467',.73),jaw:material('#596655',.72),dark:material('#050a09',.95),horns:material('#8c9780',.78),teeth:material('#a4ac8e',.63),eyes:new THREE.MeshBasicMaterial({color:'#adae80'})};
  const actor=assemble(data,monsterGeometry(),materials);actor.userData.kind='creature';return actor;
}

export function characterStats(actor){let triangles=0,vertices=0,skinnedMeshes=0;actor.traverse(o=>{if(o.isSkinnedMesh){triangles+=(o.geometry.index?.count??o.geometry.attributes.position.count)/3;vertices+=o.geometry.attributes.position.count;skinnedMeshes++;}});return {triangles,vertices,skinnedMeshes,bones:Object.keys(actor.userData.rig.joints).length};}

export function cloneCharacter(source){
  // SkeletonUtils remaps every skinned surface onto the cloned Bones.
  const data=source.userData;source.userData={};let actor;try{actor=cloneSkeleton(source);}finally{source.userData=data;}
  const materialCopies=new Map(),meshes={};actor.traverse(o=>{if(o.isSkinnedMesh){if(!materialCopies.has(o.material))materialCopies.set(o.material,o.material.clone());o.material=materialCopies.get(o.material);meshes[o.name.slice('surface:'.length)]=o;}});
  const rig=bindRig(actor);rig.rest=Object.fromEntries(Object.entries(data.rig.rest).map(([name,p])=>[name,{...p}]));actor.userData={kind:data.kind,rig,materials:[...materialCopies.values()],meshes,arms:[rig.joints.shoulderL,rig.joints.shoulderR],legs:[rig.joints.hipL,rig.joints.hipR],parts:{body:rig.joints.body,neck:rig.joints.neck,jaw:rig.joints.jaw,skull:rig.joints.head,torso:meshes.skin}};return actor;
}
