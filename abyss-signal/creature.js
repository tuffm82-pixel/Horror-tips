import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Original, locally authored creature. Rigid articulated sections are merged by
// material so the fine silhouette does not become hundreds of mobile draw calls.
export function createCreature() {
  const group = new THREE.Group();
  group.name = 'The Bellkeeper';
  const geometryPool = new Set(), materialPool = new Set();
  const bump = surfaceTexture();
  const materials = {
    skin: new THREE.MeshPhysicalMaterial({ color: 0x566663, roughness: .39, metalness: .08, clearcoat: .7, clearcoatRoughness: .24, bumpMap: bump, bumpScale: .025 }),
    plate: new THREE.MeshStandardMaterial({ color: 0x465a58, roughness: .48, metalness: .61, bumpMap: bump, bumpScale: .018 }),
    rust: new THREE.MeshStandardMaterial({ color: 0x6c4730, roughness: .7, metalness: .47, bumpMap: bump, bumpScale: .02 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x020707, roughness: .8 }),
    bone: new THREE.MeshStandardMaterial({ color: 0x8a9684, roughness: .5, bumpMap: bump, bumpScale: .012 }),
    glow: new THREE.MeshStandardMaterial({ color: 0x9ad8ba, emissive: 0x42a898, emissiveIntensity: 1.7, roughness: .3 })
  };
  Object.values(materials).forEach(m => materialPool.add(m));
  function part(parent, name, position = [0,0,0]) {
    const node = new THREE.Group(); node.name = name; node.position.set(...position); parent.add(node);
    const pending = new Map();
    return {
      node,
      add(geometry, material, position=[0,0,0], scale=[1,1,1], rotation=[0,0,0]) {
        const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(...scale));
        geometry.applyMatrix4(matrix);
        if (!pending.has(material)) pending.set(material, []);
        pending.get(material).push(geometry);
      },
      finish() {
        for (const [key, geometries] of pending) {
          const geometry = mergeGeometries(geometries, false);
          geometries.forEach(g => g.dispose());
          geometry.computeBoundingSphere(); geometryPool.add(geometry);
          const mesh = new THREE.Mesh(geometry, materials[key]); mesh.castShadow = true; mesh.receiveShadow = true; node.add(mesh);
        }
        pending.clear(); return node;
      }
    };
  }
  const sphere = (segments=14) => new THREE.SphereGeometry(1, segments, 10);
  const tube = (points,radius=.025,segments=12) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))), segments, radius, 5, false);
  const torus = (radius, width, arc=Math.PI*2) => new THREE.TorusGeometry(radius,width,5,24,arc);
  const core = part(group,'carapace',[0,1.47,.1]);
  core.add(sphere(20),'skin',[0,.22,0],[.36,.56,.235]);
  core.add(sphere(),'dark',[0,-.2,.02],[.24,.3,.18]);
  // Overlapping shell plates make a compressed diving suit shape, but the seams
  // contain an organism instead of a person. No blood or exposed human anatomy.
  for (let i=0;i<7;i++) {
    const y=-.1+i*.115, width=.25+Math.sin(i/7*Math.PI)*.14;
    core.add(tube([[-width,y,.05],[-width*.72,y+.06,-.18],[0,y+.025,-.245],[width*.72,y+.06,-.18],[width,y,.05]],.033,16),'plate');
    core.add(tube([[0,y,.20],[.08,y+.03,.26],[.12,y+.055,.23]],.022,7),'bone');
  }
  core.add(torus(.20,.035),'rust',[0,.7,-.015],[1,1,1],[Math.PI/2,0,0]);
  core.add(sphere(),'plate',[-.38,.51,.04],[.20,.15,.24],[0,0,.3]);
  core.add(sphere(),'plate',[.37,.49,.08],[.16,.12,.21],[0,0,-.3]);
  // Pressure hose loops and ragged shell fins.
  core.add(tube([[-.31,.59,.02],[-.49,.3,.21],[-.33,-.09,.3],[.02,-.15,.2]],.043,16),'rust');
  core.add(tube([[.28,.61,.1],[.44,.44,.3],[.32,.02,.33],[.16,-.2,.18]],.028,16),'dark');
  for(let i=0;i<5;i++) core.add(new THREE.ConeGeometry(.055,.22,5),'plate',[.13,.09+i*.12,.31],[1,1,1],[.8,0,-.1]);
  const torso=core.finish();

  const bell = part(torso,'empty diving bell',[.025,.75,-.035]);
  bell.add(sphere(22),'plate',[0,0,.015],[.27,.29,.21]);
  bell.add(sphere(18),'dark',[0,-.025,-.174],[.207,.245,.068]);
  bell.add(torus(.222,.028),'rust',[0,-.015,-.191],[.94,1.08,1]);
  // A recessed upper brow hides the eyes until the head tilts into the torch.
  bell.add(tube([[-.21,.11,-.2],[-.07,.075,-.26],[.03,.095,-.26],[.21,.12,-.2]],.034,12),'plate');
  for (const x of [-.079,.069]) {
    bell.add(sphere(8),'glow',[x,.041,-.239],[.021,.003,.004]);
  }
  // Broken, interlocking lamellae hang inside a deep black cavity. The irregular
  // opposing rows avoid the friendly smiling silhouette of a conventional jaw.
  for(let i=0;i<8;i++) {
    const x=(i-3.5)*.036, length=.09+(i%3)*.022;
    bell.add(new THREE.ConeGeometry(.012,length,5),'bone',[x,-.048,-.252],[1,1,1],[0,0,Math.PI+(i-3.5)*.055]);
  }
  for(const side of [-1,1]) bell.add(tube([[side*.18,.06,-.21],[side*.16,-.10,-.24],[side*.11,-.26,-.21]],.020,9),'skin');
  for(let i=0;i<10;i++) {
    const a=i/10*Math.PI*2;
    bell.add(sphere(6),'bone',[Math.sin(a)*.224,Math.cos(a)*.244-.015,-.215],[.013,.013,.012]);
  }
  bell.add(tube([[.10,.20,.02],[.21,.39,-.03],[.14,.48,-.22],[.08,.40,-.31]],.014,14),'bone');
  bell.add(sphere(10),'glow',[.08,.40,-.31],[.032,.049,.029]);
  const head=bell.finish();
  const lower = part(head,'hinged mandible',[0,-.10,-.2]);
  lower.add(tube([[-.18,.03,0],[-.145,-.17,-.03],[-.035,-.24,-.055],[.13,-.19,-.03],[.18,.03,0]],.025,14),'plate');
  for (let i=0;i<7;i++) lower.add(new THREE.ConeGeometry(.012,.10+(i%2)*.028,5),'bone',[(i-3)*.034,-.175+Math.abs(i-3)*.01,-.045],[1,1,1],[0,0,(i-3)*-.07]);
  const jaw=lower.finish();

  const arms=[];
  for (const side of [-1,1]) {
    const shoulder = part(torso,`shoulder${side}`,[side*.37,.45,0]);
    shoulder.add(sphere(),'skin',[side*.055,-.26,.025],[.10,.35,.11],[0,0,side*.12]);
    for(let i=0;i<5;i++) shoulder.add(torus(.095,.013),'plate',[side*.025,-.1-i*.075,.01],[1,1,1],[Math.PI/2,0,0]);
    const upper=shoulder.finish();
    const forearm=part(upper,`forearm${side}`,[side*.08,-.57,.01]);
    forearm.add(sphere(),'skin',[side*.04,-.24,-.015],[.073,.31,.074],[0,0,side*.12]);
    forearm.add(tube([[side*.07,-.03,.01],[side*.09,-.21,-.06],[side*.06,-.47,-.02]],.026,12),'plate');
    const elbow=forearm.finish();
    const palm=part(elbow,`hand${side}`,[side*.06,-.49,-.01]);
    palm.add(sphere(),'skin',[0,-.07,0],[.09,.135,.055]);
    for(let f=0;f<4;f++) {
      const x=(f-1.5)*.045, length=.22+(f===1?.08:f===2?.06:0);
      palm.add(tube([[x,-.11,0],[x*1.3,-.22,-.025],[x*1.5,-.11-length,-.075],[x*1.45,-.13-length,-.14]],.014,10),'skin');
      palm.add(new THREE.ConeGeometry(.013,.065,5),'bone',[x*1.45,-.14-length,-.15],[1,1,1],[-1.05,0,0]);
    }
    palm.add(tube([[side*.08,-.01,0],[side*.17,-.1,-.025],[side*.18,-.19,-.09]],.018,8),'skin');
    const hand=palm.finish(); arms.push({upper,elbow,hand,side});
  }
  const legs=[];
  for (const side of [-1,1]) {
    const thigh=part(group,`thigh${side}`,[side*.17,1.27,.11]);
    thigh.add(sphere(),'skin',[0,-.25,0],[.14,.32,.14]);
    thigh.add(sphere(),'plate',[0,-.38,-.09],[.105,.19,.064]);
    const hip=thigh.finish();
    const calf=part(hip,`calf${side}`,[0,-.5,0]);
    calf.add(sphere(),'skin',[0,-.28,.04],[.075,.33,.09],[.12,0,0]);
    calf.add(tube([[side*.05,-.02,-.03],[side*.06,-.3,.01],[0,-.53,-.04]],.027,10),'plate');
    for(let i=0;i<4;i++) calf.add(torus(.075,.012),'rust',[0,-.13-i*.075,.02],[1,1,1],[Math.PI/2,0,0]);
    calf.add(sphere(),'plate',[0,-.62,-.07],[.12,.08,.23]);
    const knee=calf.finish(); legs.push({hip,knee,side});
  }
  const tendrils=[];
  for(let i=0;i<4;i++) {
    const tendril=part(torso,`trailing tube ${i}`,[(i-1.5)*.10,.5,.24]);
    tendril.add(tube([[0,0,0],[.08,-.15,.12],[.12,-.45,.17],[.06,-.73,.24],[-.03,-.91,.26]],.012+i*.003,15),i%2?'skin':'rust');
    tendrils.push(tendril.finish());
  }
  // Highest lure is 2.69m. All positions remain local to the game-controlled root.
  let gait=0;
  function update(dt,time,{speed=0,aggression=0,attackProgress=0}={}) {
    const a=THREE.MathUtils.clamp(aggression,0,1), stride=Math.min(Math.abs(speed),4);
    gait+=Math.min(dt,.1)*(stride>0.05?2.4+stride*1.1:.55);
    torso.position.set(0,1.47+Math.sin(gait*2)*.018*Math.min(stride,1)+Math.sin(time*1.3)*.009,.1);
    torso.rotation.set(-.08-a*.18,Math.sin(time*.43)*.025,Math.sin(gait)*.025);
    head.rotation.set(.08+Math.sin(time*.8)*.045+a*.10,Math.sin(time*.31)*.19,Math.sin(time*.62)*.075);
    jaw.rotation.x=.08+Math.sin(time*1.7)*.035+a*.5;
    for(const {hip,knee,side} of legs) {
      const phase=gait+(side===1?Math.PI:0), s=Math.sin(phase);
      hip.rotation.x=s*.32*Math.min(stride,1.5); hip.rotation.z=side*.05;
      knee.rotation.x=Math.max(0,-s)*.4*Math.min(stride,1.5);
    }
    for(const {upper,elbow,hand,side} of arms) {
      upper.rotation.x=-Math.sin(gait+(side===1?Math.PI:0))*.18*Math.min(stride,1.5)-a*.55;
      upper.rotation.z=side*(.06+a*.11); elbow.rotation.x=-.16-a*.18+Math.sin(time*1.9+side)*.04;
      hand.rotation.set(0,0,Math.sin(time*1.35+side)*.07);
    }
    tendrils.forEach((node,i)=>{node.rotation.x=Math.sin(time*1.3+i)*.13;node.rotation.z=Math.sin(time*.9+i)*.1;});
    materials.glow.emissiveIntensity=1.2+Math.sin(time*2.2)*.2+a;
    const p=THREE.MathUtils.clamp(Number.isFinite(attackProgress)?attackProgress:0,0,1);
    if(p>0){
      const smooth=(start,end)=>THREE.MathUtils.smoothstep(p,start,end);
      const windup=smooth(0,.18)*(1-smooth(.18,.38));
      const reach=smooth(.18,.45), bite=smooth(.40,.70), drag=smooth(.70,1);
      // Root movement is still controlled by the game. These local poses carry
      // anticipation, contact and the downward pull without teleporting the actor.
      torso.position.y-=windup*.12+drag*.47;
      torso.position.z+=windup*.12-reach*.30+drag*.14;
      torso.rotation.set(-.10+windup*.14-reach*.40-drag*.22,Math.sin(p*11)*.055,-windup*.08+drag*.09);
      head.rotation.set(.08-windup*.24+bite*.22,Math.sin(p*13)*.08*(1-drag),-.12-reach*.08);
      jaw.rotation.x=.12+smooth(.12,.43)*1.05-smooth(.67,.83)*.72;
      for(const {upper,elbow,hand,side} of arms){
        // Positive shoulder X moves hands towards the creature's -Z forward.
        upper.rotation.set(-windup*.35+reach*1.22-drag*.52,side*reach*.12,side*(.11+windup*.20-reach*.07));
        elbow.rotation.x=windup*.45+reach*.27+drag*.35;
        hand.rotation.set(-reach*.23+drag*.36,-side*reach*.17,side*(.08+drag*.20));
      }
      for(const {hip,knee,side} of legs){
        hip.rotation.x=side*.13*reach-windup*.10-drag*.18;
        knee.rotation.x=.12*windup+drag*.36;
      }
      tendrils.forEach((node,i)=>{node.rotation.x-=reach*.35;node.rotation.z+=Math.sin(p*18+i)*.13;});
      materials.glow.emissiveIntensity=2.1+reach*1.2-drag*.6;
    }
  }
  update(0,0);
  return {group,update,dispose(){geometryPool.forEach(g=>g.dispose());materialPool.forEach(m=>m.dispose());bump.dispose();}};
}

function surfaceTexture() {
  const size=128, data=new Uint8Array(size*size*4); let seed=14953;
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const value=Math.max(0,Math.min(255,132+((seed>>>24)-128)*.32+Math.sin(x*.3+Math.sin(y*.11)*5)*19));
    const i=(y*size+x)*4; data[i]=data[i+1]=data[i+2]=value;data[i+3]=255;
  }
  const texture=new THREE.DataTexture(data,size,size); texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.magFilter=THREE.LinearFilter; texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
