import * as THREE from 'three';
import {makeSurfaces,makeFoliageTexture} from './materials.js';

// Every surface and actor is generated locally; no image or model service is needed.
export function createWorld(canvas, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, options.quality === 'low' ? 1 : 1.7));
  renderer.shadowMap.enabled = options.quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070f17');
  scene.fog = new THREE.FogExp2('#15232b', .018);
  const camera = new THREE.PerspectiveCamera(67, 1, .08, 230);
  camera.rotation.order = 'YXZ';
  const ambient = new THREE.HemisphereLight('#789ab4', '#141a16', .36);
  scene.add(ambient);
  const moonLight = new THREE.DirectionalLight('#91b7d1', .85);
  moonLight.position.set(-30, 50, 20); moonLight.castShadow = true;
  Object.assign(moonLight.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 150 });
  moonLight.shadow.mapSize.set(2048, 2048); moonLight.shadow.bias = -.0006;
  scene.add(moonLight);
  const material = (color, roughness = .9) => new THREE.MeshStandardMaterial({ color, roughness });
  const surfaces=makeSurfaces();
  const mats = { concrete: surfaces.concrete, blue: surfaces.blue, metal: material('#5d6867', .35), roof: surfaces.roof, wood: material('#514d3b'), grass: surfaces.grass, black: material('#10171a'), skin: material('#ad9e8c'), clothes: material('#456776') };
  const brick = surfaces.brick;
  const grass = surfaces.grass;
  const sharedSphere=new THREE.SphereGeometry(1,14,10),sharedCapsule=new THREE.CapsuleGeometry(1,1,4,10);
  function rounded(rx,ry,rz,mat,x,y,z,parent=scene){const m=new THREE.Mesh(sharedSphere,mat);m.scale.set(rx,ry,rz);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  function limb(radius,length,mat,x,y,z,parent=scene){const m=new THREE.Mesh(sharedCapsule,mat);m.scale.set(radius,length/3,radius);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m;}
  function box(w, h, d, mat, x, y, z, parent = scene) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function cylinder(r1, r2, h, mat, x, y, z, parent = scene, sides = 8) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, sides), mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function sign(text, x, y, z, width = 4, rotation = 0, color = '#d6d5b5') {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 160;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#233e47'; ctx.fillRect(0, 0, 1024, 160);
    ctx.strokeStyle = '#829e9e'; ctx.lineWidth = 8; ctx.strokeRect(9, 9, 1006, 142);
    ctx.fillStyle = color; ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 82);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 160 / 1024), new THREE.MeshStandardMaterial({ map: tex,roughness:.88 })); mesh.position.set(x, y, z); mesh.rotation.y = rotation; scene.add(mesh); return mesh;
  }
  box(180, .25, 180, grass, 0, -.2, 0);
  box(46, .1, 31, mats.concrete, 0, -.02, 1);
  box(6, .1, 100, mats.concrete, -14, 0, 7);
  box(75, .12, 4, mats.concrete, 14, .01, 18);
  const colliders=[];
  function building(x, z, w, d, rotation = 0) {
    const halfX=(Math.abs(Math.cos(rotation))*w+Math.abs(Math.sin(rotation))*d)/2;
    const halfZ=(Math.abs(Math.sin(rotation))*w+Math.abs(Math.cos(rotation))*d)/2;
    colliders.push({minX:x-halfX,maxX:x+halfX,minZ:z-halfZ,maxZ:z+halfZ});
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rotation; scene.add(g);
    box(w, 4.4, d, brick, 0, 2.2, 0, g);
    box(w + 1.3, .32, d + 1.6, mats.roof, 0, 4.55, 0, g);
    const ridge = box(w + 1, .15, d * .6, mats.roof, 0, 5.0, -d * .21, g); ridge.rotation.x = .18;
    box(w + .8, .2, 3.1, mats.roof, 0, 3.7, d / 2 + 1.1, g);
    box(w + 1.1, .3, 3.7, mats.concrete, 0, .15, d / 2 + 1.2, g);
    box(w+.9,.18,.2,mats.metal,0,3.65,d/2+2.65,g);
    for(const side of [-1,1])cylinder(.055,.055,3.7,mats.metal,side*(w/2-.3),1.85,d/2+.25,g);
    for (let offset = -w / 2 + 2; offset < w / 2 - 1; offset += 3.4) {
      box(2.2, 1.6, .09, mats.black, offset, 2.4, d / 2 + .025, g);
      const glass=surfaces.windows[Math.abs(Math.round(offset*3))%4];
      box(2, 1.4, .11, glass, offset, 2.4, d / 2 + .07, g);
      box(.06, 1.5, .12, mats.metal, offset, 2.4, d / 2 + .15, g);
      box(2.1, .06, .12, mats.metal, offset, 2.4, d / 2 + .15, g);
      cylinder(.065, .065, 3.65, mats.metal, offset, 1.95, d / 2 + 2.5, g);
      if(glass===surfaces.windows[0]&&Math.abs(Math.round(offset))%3===1){const glow=new THREE.PointLight('#d1a46a',5,7,2);glow.position.set(offset,2.3,d/2+.4);g.add(glow);}
    }
    box(1.05, 2.6, .13, mats.blue, -w / 2 + .9, 1.5, d / 2 + .1, g);
    box(.08, .08, .15, mats.skin, -w / 2 + 1.25, 1.5, d / 2 + .21, g);
  }
  building(0, -21, 42, 10); building(-28, 3, 27, 9, Math.PI / 2); building(30, -10, 17, 10, -Math.PI / 2);
  building(-29, 30, 12, 8, Math.PI / 2);
  // A separate interior sits inside the bathroom shell for the blackout scene.
  const tile = new THREE.MeshStandardMaterial({map:surfaces.concrete.map,color:'#9ca89f',roughness:.32,bumpMap:surfaces.concrete.bumpMap,bumpScale:.015});
  box(7.5,.08,11,tile,-29,.25,30);
  box(.12,3.5,11,tile,-32.7,1.9,30);
  box(.12,3.5,11,tile,-25.3,1.9,30);
  box(7.5,3.5,.12,tile,-29,1.9,35.5);
  for(let j=0;j<3;j++){
    box(2,.12,1.5,mats.skin,-31.4,1,27+j*2.7);
    cylinder(.025,.025,.45,mats.metal,-31.5,1.3,27+j*2.7);
    box(.08,1.15,1.5,mats.metal,-32.5,1.9,27+j*2.7);
    box(2.5,2.4,.1,mats.blue,-26.6,1.55,27+j*2.7);
  }
  sign('WOLLONGONG WEST', 0, 4.0, -15.9, 9);
  sign('BATHROOMS', -24.4, 3.2, 29, 3.7, Math.PI / 2);
  box(17, 3.1, .45, mats.blue, 6, 1.55, 12);
  colliders.push({minX:-2.5,maxX:14.5,minZ:11.775,maxZ:12.225});
  sign('BLUE WALL', 6, 2.2, 11.75, 3, Math.PI);
  for (let x = -10; x < 19; x += 12) {
    box(3, .16, .75, mats.wood, x, .7, 9);
    for (const dx of [-1.1, 1.1]) box(.12, .7, .6, mats.metal, x + dx, .35, 9);
  }
  // Marked court, hoops, net and low sports fence.
  box(26, .13, 37, material('#38534e'), 36, .04, 35);
  const lineMat = new THREE.LineBasicMaterial({ color: '#c2c6ac', transparent: true, opacity: .7 });
  function line(points, parent = scene) { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))), lineMat); parent.add(l); return l; }
  line([[24,.13,18],[48,.13,18],[48,.13,52],[24,.13,52],[24,.13,18]]);
  line([[24,.13,35],[48,.13,35]]);
  const ringPoints = []; for (let i = 0; i <= 64; i++) ringPoints.push([36 + Math.cos(i / 64 * Math.PI * 2) * 3, .13, 35 + Math.sin(i / 64 * Math.PI * 2) * 3]); line(ringPoints);
  for (const z of [19.5, 50.5]) {
    cylinder(.1, .1, 4, mats.metal, 36, 2, z);
    box(3, 1.8, .13, material('#c1cec6'), 36, 3.8, z);
    box(1.1, .8, .15, mats.black, 36, 3.65, z - .09);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.45, .045, 8, 24), material('#b3784c')); rim.position.set(36, 3.25, z + (z < 30 ? .65 : -.65)); rim.rotation.x = Math.PI / 2; scene.add(rim);
  }
  sign('BOTTOM OVAL', 49, 1.7, 52, 4.5);
  sign('TOP OVAL', -26, 1.7, -36, 4.5);
  const leafMat=new THREE.MeshStandardMaterial({map:makeFoliageTexture(),color:'#a9b89b',alphaTest:.35,side:THREE.DoubleSide,roughness:.95});
  const branchTransforms=[],leafTransforms=[],dummy=new THREE.Object3D();
  function tree(x, z, scale = 1) {
    dummy.position.set(x,4*scale,z);dummy.rotation.set(0,0,.06);dummy.scale.set(.48*scale,8*scale,.48*scale);dummy.updateMatrix();branchTransforms.push(dummy.matrix.clone());
    for(let i=0;i<4;i++){const a=i*2.4;dummy.position.set(x+Math.cos(a)*scale,6*scale,z+Math.sin(a)*scale);dummy.rotation.set(Math.sin(a)*.65,a,Math.cos(a)*.65);dummy.scale.set(.16*scale,4.7*scale,.16*scale);dummy.updateMatrix();branchTransforms.push(dummy.matrix.clone());}
    for(let i=0;i<30;i++){const a=i*2.399,r=(1+(i%5)*.68)*scale;dummy.position.set(x+Math.cos(a)*r,(6.8+(i%6)*.6)*scale,z+Math.sin(a)*r);dummy.rotation.set(Math.sin(i)*.6,a,Math.cos(i*3)*.5);dummy.scale.set((4.1+(i%3)*.5)*scale,(3.6+(i%4)*.4)*scale,1);dummy.updateMatrix();leafTransforms.push(dummy.matrix.clone());}
  }
  for (let i = 0; i < 34; i++) { const a = i * 2.399; const r = 61 + (i % 6) * 3; tree(Math.cos(a) * r, Math.sin(a) * r, .8 + (i % 4) * .12); }
  [[-22,-41],[-31,-45],[-35,-33],[-15,-48],[18,58],[50,58]].forEach(([x,z])=>tree(x,z,1.15));
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.55,1,1,7),surfaces.bark,branchTransforms.length);branchTransforms.forEach((m,i)=>trunks.setMatrixAt(i,m));trunks.castShadow=trunks.receiveShadow=true;scene.add(trunks);
  const leaves=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),leafMat,leafTransforms.length);leafTransforms.forEach((m,i)=>leaves.setMatrixAt(i,m));leaves.castShadow=true;scene.add(leaves);
  // Fence establishes the perimeter without claiming an exact school survey.
  const wire = material('#4d6361');
  for (let x = -65; x <= 65; x += 5) {
    cylinder(.045,.045,2,wire,x,1,65); cylinder(.045,.045,2,wire,x,1,-65);
    box(5,.025,.025,wire,x+2.5,1.7,65); box(5,.025,.025,wire,x+2.5,.7,65);
  }
  const fenceCanvas=document.createElement('canvas');fenceCanvas.width=fenceCanvas.height=128;const fc=fenceCanvas.getContext('2d');fc.strokeStyle='#abb4aa';fc.lineWidth=2;for(let i=-128;i<256;i+=32){fc.beginPath();fc.moveTo(i,0);fc.lineTo(i+128,128);fc.moveTo(i,0);fc.lineTo(i-128,128);fc.stroke();}
  const fenceMap=new THREE.CanvasTexture(fenceCanvas);fenceMap.wrapS=fenceMap.wrapT=THREE.RepeatWrapping;fenceMap.repeat.set(45,1);const fenceMat=new THREE.MeshStandardMaterial({map:fenceMap,alphaTest:.4,color:'#5d7373',roughness:.6,metalness:.4,side:THREE.DoubleSide});
  for(const[x,z,rot]of [[0,65,0],[0,-65,0],[-65,0,Math.PI/2],[65,0,Math.PI/2]]){const panel=new THREE.Mesh(new THREE.PlaneGeometry(130,2),fenceMat);panel.position.set(x,1,z);panel.rotation.y=rot;scene.add(panel);}
  // Damp leaf litter and grass tufts use two instanced draws rather than individual meshes.
  const litter=new THREE.InstancedMesh(new THREE.PlaneGeometry(.2,.07),material('#68725a'),700);
  let li=0;for(let i=0;i<1000&&li<700;i++){const x=Math.sin(i*93.7)*57,z=Math.cos(i*31.9)*58;if(Math.abs(x)<20&&z>-13&&z<16)continue;dummy.position.set(x,.075,z);dummy.rotation.set(-Math.PI/2,0,i*2.4);dummy.scale.setScalar(.6+(i%5)*.4);dummy.updateMatrix();litter.setMatrixAt(li,dummy.matrix);litter.setColorAt(li,new THREE.Color(['#776d4e','#65704f','#7b7462'][i%3]));li++;}litter.count=li;scene.add(litter);
  const bladeGeo=new THREE.BufferGeometry();bladeGeo.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,.02,.42,.03],3));bladeGeo.computeVertexNormals();
  const grassBlades=new THREE.InstancedMesh(bladeGeo,new THREE.MeshStandardMaterial({color:'#5a7152',side:THREE.DoubleSide,roughness:1}),3600);
  let bi=0;for(let i=0;i<6000&&bi<3600;i++){const x=Math.sin(i*79.43)*61,z=Math.cos(i*46.81)*62;if((Math.abs(x)<22&&z>-16&&z<21)||(x>21&&x<50&&z>16&&z<55)||Math.abs(x+14)<3.5)continue;dummy.position.set(x,0,z);dummy.rotation.set(0,i*2.4,Math.sin(i)*.15);dummy.scale.setScalar(.5+(i%7)*.15);dummy.updateMatrix();grassBlades.setMatrixAt(bi++,dummy.matrix);}grassBlades.count=bi;scene.add(grassBlades);
  const puddleMat=new THREE.MeshStandardMaterial({color:'#1c2b30',roughness:.08,metalness:.65,transparent:true,opacity:.67,depthWrite:false});
  for(let i=0;i<13;i++){const p=new THREE.Mesh(new THREE.CircleGeometry(1,24),puddleMat);p.rotation.x=-Math.PI/2;p.position.set(-16+(i*7.39)%37,.048,-11+(i*5.13)%22);p.scale.set(1.2+(i%3),.25+(i%4)*.17,1);scene.add(p);}
  const lamps = [];
  function lamp(x,z) {
    cylinder(.07,.1,5,mats.metal,x,2.5,z); box(.9,.1,.5,mats.metal,x,5,z);
    const bulb = box(.7,.05,.35,new THREE.MeshBasicMaterial({color:'#f5e2a9'}),x,4.92,z);
    const light = new THREE.PointLight('#ffd3a0',48,18,2); light.position.set(x,4.7,z); scene.add(light); lamps.push({light,bulb});
  }
  lamp(-16,3); lamp(17,-10); lamp(21,31); lamp(-20,25);
  const bathroomLight=new THREE.PointLight('#b4d3cb',12,9,2);bathroomLight.position.set(-29,3.3,30);scene.add(bathroomLight);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(1.7,24,16),new THREE.MeshBasicMaterial({color:'#b3c3cb'})); moon.position.set(-52,62,-90); scene.add(moon);
  const dustGeometry = new THREE.BufferGeometry(); const dustArray = new Float32Array(220 * 3);
  for (let i=0;i<220;i++){dustArray[i*3]=(Math.random()-.5)*100;dustArray[i*3+1]=Math.random()*12;dustArray[i*3+2]=(Math.random()-.5)*100;}
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustArray,3));
  const dust = new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:'#b9cab3',size:.055,transparent:true,opacity:.45})); scene.add(dust);
  const torch = new THREE.SpotLight('#e5e8d5',76,33,Math.PI/7,.7,1.6);camera.add(torch);torch.position.set(.24,-.2,-.15);torch.target.position.set(0,0,-10);camera.add(torch.target);torch.castShadow=options.quality!=='low';torch.shadow.mapSize.set(1024,1024);torch.shadow.camera.near=.2;torch.shadow.bias=-.0004;scene.add(camera);
  const torchModel=new THREE.Group();torchModel.position.set(.34,-.36,-.56);torchModel.rotation.x=-Math.PI/2;camera.add(torchModel);
  cylinder(.055,.05,.27,mats.black,0,0,0,torchModel,12);cylinder(.085,.055,.1,mats.metal,0,.18,0,torchModel,12);cylinder(.07,.07,.008,new THREE.MeshBasicMaterial({color:'#bfcdb2'}),0,.235,0,torchModel,12);
  rounded(.085,.07,.12,material('#41483b'),-.015,-.035,.025,torchModel);
  const actors = new THREE.Group(); scene.add(actors);
  function human(color='#345d74', hairColor='#282b25', longHair=false) {
    const g = new THREE.Group(); const cloth=material(color), hairMat=material(hairColor);
    rounded(.245,.39,.14,cloth,0,1.15,0,g);rounded(.24,.13,.14,mats.black,0,.87,0,g);
    limb(.065,.13,mats.skin,0,1.52,0,g);const head=rounded(.155,.215,.16,mats.skin,0,1.73,.015,g);
    rounded(.165,.13,.17,hairMat,0,1.86,-.02,g);
    if(longHair)for(let j=0;j<7;j++){const a=j/6*Math.PI;const h=limb(.055,.43,hairMat,Math.cos(a)*.16,1.65,-.08-Math.sin(a)*.1,g);h.rotation.z=Math.cos(a)*.12;}
    rounded(.03,.05,.05,mats.skin,0,1.73,.17,g);rounded(.065,.012,.012,mats.black,0,1.64,.163,g);
    for(const s of [-1,1]){rounded(.035,.014,.012,mats.black,s*.064,1.77,.16,g);rounded(.025,.052,.04,mats.skin,s*.156,1.72,.01,g);}
    const arms=[],legs=[];
    for(const s of [-1,1]){
      const a=new THREE.Group();a.position.set(s*.25,1.42,0);rounded(.1,.12,.11,cloth,0,-.02,0,a);const upper=limb(.075,.33,cloth,s*.035,-.18,0,a);upper.rotation.z=s*.1;limb(.06,.31,cloth,s*.055,-.46,.025,a);rounded(.065,.085,.04,mats.skin,s*.055,-.66,.035,a);g.add(a);arms.push(a);
      const l=new THREE.Group();l.position.set(s*.13,.86,0);limb(.095,.41,mats.black,0,-.19,0,l);limb(.075,.4,mats.black,0,-.54,.015,l);rounded(.095,.075,.18,mats.black,0,-.79,.07,l);g.add(l);legs.push(l);
    }
    g.userData={arms,legs}; actors.add(g);return g;
  }
  const spinner=human('#56788a'); const sonny=human('#8a6b47'); const indie=human('#647664','#c1ae71',true);const finn=human('#45616b','#867344',true);
  const creature = new THREE.Group(); actors.add(creature);
  const hide=surfaces.hide,bone=material('#8d9b85',.68);
  const torso=rounded(.43,.72,.24,hide,0,2.8,0,creature);torso.rotation.z=.04;
  rounded(.24,.5,.18,hide,0,2.18,-.035,creature);limb(.1,.55,hide,0,3.48,-.09,creature);
  for(let i=0;i<6;i++){const rib=new THREE.Mesh(new THREE.TorusGeometry(.36-i*.016,.024,5,18,Math.PI*1.65),bone);rib.rotation.set(Math.PI/2,0,.55);rib.position.set(0,3.13-i*.135,.015);rib.scale.z=.57;creature.add(rib);rounded(.045,.07,.06,bone,.018,3.27-i*.16,-.25,creature);}
  const skull=rounded(.22,.43,.25,bone,0,3.85,.06,creature);skull.rotation.z=.08;
  rounded(.15,.22,.1,mats.black,0,3.76,.276,creature);rounded(.2,.09,.13,hide,0,3.55,.16,creature);
  for(let i=0;i<8;i++){const tooth=cylinder(.003,.019,.12,bone,(i-3.5)*.032,3.84-(i%2)*.13,.354,creature,5);if(i%2)tooth.rotation.z=Math.PI;}
  const eyeMaterial=new THREE.MeshBasicMaterial({color:'#d9d19a'});
  for(const s of [-1,1]){
    rounded(.065,.055,.04,hide,s*.105,3.99,.25,creature);rounded(.035,.018,.025,eyeMaterial,s*.1,3.99,.284,creature);
    const antler=cylinder(.025,.085,s===1?1.05:.8,bone,s*.29,4.32,.02,creature);antler.rotation.z=-s*.4;
    const fork=cylinder(.008,.04,s===1?.5:.32,bone,s*.52,4.63,.05,creature);fork.rotation.z=-s*.9;fork.rotation.x=s*.3;
    rounded(.22,.17,.19,hide,s*.46,3.27,-.035,creature);
  }
  const monsterLimbs=[];
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.54,3.35,0);const upper=limb(.1,1.25,hide,0,-.6,0,arm);upper.rotation.z=s*.12;limb(.055,1.1,bone,s*.09,-1.7,-.12,arm);rounded(.1,.11,.1,hide,s*.08,-1.18,-.1,arm);
    for(let f=0;f<3;f++){const finger=cylinder(.008,.025,.38,bone,s*.09+(f-1)*.055,-2.39,-.13,arm);finger.rotation.x=.25;}
    creature.add(arm);monsterLimbs.push(arm);
    const leg=new THREE.Group();leg.position.set(s*.22,2.18,0);limb(.1,1.15,hide,0,-.55,0,leg);const shin=limb(.055,1.15,bone,0,-1.62,.12,leg);shin.rotation.x=.14;rounded(.1,.11,.26,hide,0,-2.15,.02,leg);creature.add(leg);monsterLimbs.push(leg);
  }
  const iceMat=new THREE.MeshStandardMaterial({color:'#a0e7ed',transparent:true,opacity:.6,roughness:.15,metalness:.3});
  const ice=new THREE.Group();for(let i=0;i<14;i++){const crystal=cylinder(.01,.11,.3+(i%3)*.1,iceMat,(Math.random()-.5)*1.2,-1.45,(Math.random()-.5)*1.2,ice,5);crystal.rotation.z=(Math.random()-.5)*.5;} camera.add(ice);ice.visible=false;
  const places={courtyard:[0,1.72,5,0],bathroom:[-20,1.72,29,Math.PI/2],bottom:[41,1.72,58,.1],top:[-24,1.72,-36,Math.PI],blue:[5,1.72,8,Math.PI]};
  let currentScene='menu', location='courtyard', elapsed=0, sceneTime=0, yaw=0, pitch=0, lookActive=false, movingAllowed=false,lastStoryLine=-1,lineElapsed=0;
  const remote=new Map(); const velocity=new THREE.Vector3();
  function setLocation(name){location=places[name]?name:'courtyard';const p=places[location];camera.position.set(p[0],p[1],p[2]);yaw=p[3];pitch=0;camera.rotation.set(0,yaw,0);}
  function setScene(name){currentScene=name==='online'?'multiplayer':name;sceneTime=0;lastStoryLine=-1;lineElapsed=0;lookActive=false;pitch=0; spinner.visible=sonny.visible=indie.visible=finn.visible=creature.visible=false;
    for(const actor of [spinner,sonny,indie,finn]){actor.rotation.set(0,0,0);actor.scale.setScalar(1);actor.userData.arms.forEach(a=>a.rotation.set(0,0,0));actor.userData.legs.forEach(a=>a.rotation.set(0,0,0));}
    if(name==='bathroom'){camera.position.set(-28.5,1.72,30);yaw=Math.PI/2;camera.rotation.set(0,yaw,0);}
    if(name==='sonny'&&location==='bathroom')setLocation('bathroom');
    if(name==='choose'){yaw=places[location][3];camera.rotation.set(0,yaw,0);}
    if(['intro','spin','transform','ending'].includes(name)){spinner.visible=true;spinner.position.set(0,0,-1);spinner.lookAt(camera.position.x,0,camera.position.z);}
    if(name==='ending'){spinner.position.set(camera.position.x,0,camera.position.z-3.4);spinner.lookAt(camera.position.x,0,camera.position.z);}
    if(name==='transform'){creature.position.set(0,0,-1);creature.visible=true;}
    if(name==='sonny'){sonny.visible=creature.visible=true;sonny.position.set(-13,0,23);creature.position.set(-7,0,21);}
    if(name==='indie'){indie.visible=creature.visible=true;indie.position.set(-25,0,-47);creature.position.set(-18,0,-48);}
    if(name==='finn'){finn.visible=creature.visible=true;finn.position.set(3,0,7);creature.position.set(6,0,-7);}
    if(name==='chase'){creature.visible=true;creature.position.copy(camera.position).add(new THREE.Vector3(0,-1.72,-17));}
    if(name==='caught'){creature.visible=true;}
  }
  const mouse=(e)=>{if(document.pointerLockElement===canvas){yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.05,1.05);lookActive=true;}};
  const click=()=>{if(movingAllowed||currentScene==='choose'){canvas.requestPointerLock?.()?.catch?.(()=>{});}};
  document.addEventListener('mousemove',mouse);canvas.addEventListener('click',click);
  function animateHuman(h,speed,t){h.userData.arms.forEach((a,i)=>a.rotation.x=Math.sin(t*speed+i*Math.PI)*.65);h.userData.legs.forEach((a,i)=>a.rotation.x=Math.sin(t*speed+i*Math.PI+Math.PI)*.6);}
  function blocked(x,z){const radius=.28;return colliders.some(b=>{const nearX=THREE.MathUtils.clamp(x,b.minX,b.maxX),nearZ=THREE.MathUtils.clamp(z,b.minZ,b.maxZ);return (x-nearX)**2+(z-nearZ)**2<radius*radius;});}
  function update(dt,state={}){
    dt=Math.min(dt,.05);elapsed+=dt;sceneTime+=dt;
    const storyLine=Number(state.storyLine)||0;if(storyLine!==lastStoryLine){lineElapsed=0;lastStoryLine=storyLine;}lineElapsed=Number.isFinite(state.lineTime)?state.lineTime:lineElapsed+dt;
    const s=currentScene;ice.visible=state.frozen??s==='spin';movingAllowed=Boolean(state.moving)&&!state.frozen;torch.visible=state.flashlight!==false&&s!=='menu';torchModel.visible=torch.visible;
    const reducedMotion=state.reducedMotion??options.reducedMotion;
    const blackout=s==='transform'&&storyLine===1?Math.max(0,1-lineElapsed/3):0;
    torch.intensity=(s==='caught'?24:76)*(1-blackout*.96);
    const desiredFov=!reducedMotion&&state.playerInput?.sprint&&movingAllowed?72:67;camera.fov=THREE.MathUtils.damp(camera.fov,desiredFov,5,dt);camera.updateProjectionMatrix();
    if(s==='menu') {camera.position.set(13+(reducedMotion?0:Math.sin(elapsed*.07)*.8),2.7,7);camera.lookAt(-6,2,-20);creature.visible=sceneTime%28>8&&sceneTime%28<10;creature.position.set(6,0,-12);}
    else {
      const input=state.playerInput||{};
      if(movingAllowed){
        velocity.set((input.right?1:0)-(input.left?1:0),0,(input.back?1:0)-(input.forward?1:0));
        if(velocity.lengthSq()){
          velocity.normalize().applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
          const speed=state.isCreature?(input.sprint?9:6):(input.sprint?7:3.8);
          const stepX=THREE.MathUtils.clamp(camera.position.x+velocity.x*dt*speed,-58,58),stepZ=THREE.MathUtils.clamp(camera.position.z+velocity.z*dt*speed,-58,61);
          // Resolve the axes separately so walking into a wall slides along it.
          if(!blocked(stepX,camera.position.z))camera.position.x=stepX;
          if(!blocked(camera.position.x,stepZ))camera.position.z=stepZ;
        }
        camera.position.y=1.72+(velocity.lengthSq()&&!reducedMotion?Math.sin(elapsed*11)*.035:0);
      }
      if(state.look){yaw+=Number(state.look.x||0)*dt;pitch=THREE.MathUtils.clamp(pitch+Number(state.look.y||0)*dt,-1.05,1.05);lookActive=true;}
      if(!lookActive && ['intro','spin','transform','ending'].includes(s)){camera.lookAt(spinner.position.x,s==='transform'?2.8:1.5,spinner.position.z);}
      else if(!lookActive&&['sonny','indie','finn'].includes(s)){camera.lookAt(creature.position.x,1.8,creature.position.z);}
      else camera.rotation.set(pitch,yaw,0);
      if(!reducedMotion&&s!=='caught'&&!movingAllowed)camera.position.y=1.72+Math.sin(elapsed*1.35)*.008;
    }
    if(s==='spin'&&storyLine===0)spinner.rotation.y=sceneTime*8;
    if(s==='transform'){const amount=storyLine===0?Math.min(lineElapsed/4,.35):Math.min(.35+lineElapsed/2,1);spinner.scale.set(1-amount*.6,1-amount*.25,1-amount*.6);spinner.visible=storyLine===0;creature.visible=storyLine>0;creature.scale.setScalar(.65+amount*.35);creature.position.y=0;}
    else {spinner.scale.setScalar(1);creature.scale.setScalar(1);}
    if(s==='sonny'){
      const run=storyLine===0?Math.min(lineElapsed/4.5,1):1;sonny.position.set(-13-run*9,0,25);creature.position.set(-7-run*11,0,25);sonny.lookAt(-24,0,25);sonny.visible=storyLine<3;creature.visible=storyLine<4;
      if(storyLine===0)animateHuman(sonny,12,elapsed);else animateHuman(sonny,1,0);
    }
    if(s==='indie'){
      const run=storyLine===0?0:storyLine===1?Math.min(lineElapsed/3,1):1;indie.position.set(-25,0,-47+run*5);indie.lookAt(-25,0,-36);creature.position.set(-18-run*6,0,-48+run*4);indie.visible=storyLine<2||(storyLine===2&&lineElapsed<2);
      if(storyLine===1){animateHuman(indie,11,elapsed);if(lineElapsed>3){indie.rotation.z=-1.35;indie.position.y=.25;}}
      if(storyLine===2){indie.rotation.z=-1.35;indie.position.y=.25;}
      if(storyLine>=3){creature.position.lerp(new THREE.Vector3(camera.position.x,0,camera.position.z-5),Math.min(lineElapsed/3,.9));skull.rotation.y=0;}
    }
    if(s==='finn'){
      const run=storyLine===0?0:storyLine===1?Math.min(lineElapsed/4,1)*3:storyLine===2?3:3+Math.min(lineElapsed/2.8,1)*11;
      finn.position.set(3,0,7-run);finn.lookAt(6,0,-7);finn.visible=storyLine<3||lineElapsed<2.8;creature.position.set(6,0,-7+Math.min(sceneTime*.09,1.5));
      if(storyLine===1||storyLine===3)animateHuman(finn,storyLine===3?12:4,elapsed);else animateHuman(finn,1,0);
    }
    if(s==='chase'){
      if(state.storyKey==='bottom'){
        const approach=storyLine===0?Math.min(lineElapsed/5,.45):storyLine===1?.45+Math.min(lineElapsed/3.5,.55):1;
        sonny.visible=indie.visible=storyLine<2;sonny.position.set(34,0,32+approach*14);indie.position.set(39,0,30+approach*14);sonny.lookAt(34,0,58);indie.lookAt(39,0,58);animateHuman(sonny,11,elapsed);animateHuman(indie,12,elapsed);creature.visible=storyLine===2;creature.position.set(39,0,43+Math.min(lineElapsed*2,8));
        if(!lookActive)camera.lookAt(37,1.9,44);
      }else{
        const desired=state.threat??.4,progress=THREE.MathUtils.clamp(state.challengeProgress??0,0,1),fails=state.challengeFails??0;
        const d=Math.max(2.8,13-desired*7+progress*2-fails*.8),behind=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));
        // The pursuer remains behind the runner's travel heading, so looking back reveals it.
        const heading=places[location]?.[3]??0;behind.set(Math.sin(heading),0,Math.cos(heading));creature.position.copy(camera.position).addScaledVector(behind,d);creature.position.y=0;
      }
    }
    if(s==='caught'){const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y=0;forward.normalize();creature.position.copy(camera.position).addScaledVector(forward,Math.max(.95,2.5-sceneTime*3));creature.position.y=-2.12;}
    monsterLimbs.forEach((limb,i)=>{limb.rotation.x=Math.sin(elapsed*(s==='chase'?11:2.2)+(i%2)*Math.PI+(i>1?Math.PI:0))*(s==='chase'?.65:.14);});
    if(creature.visible){creature.lookAt(camera.position.x,creature.position.y,camera.position.z);skull.rotation.z=Math.sin(elapsed*.8)*.12;torso.position.y=2.8+Math.sin(elapsed*3)*.035;}
    lamps.forEach(({light,bulb},i)=>{const faulty=i===2&&Math.sin(elapsed*.7)>.96;light.intensity=(faulty?9:48)*(1-blackout*.97);bulb.material.color.set(faulty?'#887b5e':'#f5e2a9');});
    ambient.intensity=.36*(1-blackout*.85);moonLight.intensity=.85*(1-blackout*.8);
    torchModel.position.y=-.36+(!reducedMotion?Math.sin(elapsed*(movingAllowed?8:1.8))*(movingAllowed?.014:.004):0);
    dust.rotation.y=reducedMotion?0:elapsed*.003;
    remote.forEach(h=>{if(!h.userData.remoteCreature)animateHuman(h,7,elapsed);});
    renderer.render(scene,camera);
  }
  function resize(){const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  function setRemotePlayers(players=[]){const active=new Set();for(const p of players){if(!p||p.id==null)continue;active.add(p.id);let h=remote.get(p.id);if(h&&Boolean(h.userData.remoteCreature)!==Boolean(p.isCreature)){actors.remove(h);remote.delete(p.id);h=null;}if(!h){if(p.isCreature){h=creature.clone(true);h.userData={remoteCreature:true};actors.add(h);}else h=human('#537c8b');remote.set(p.id,h);}h.position.set(Number(p.x)||0,(Number(p.y)||1.72)-1.72,Number(p.z)||0);h.rotation.y=(Number(p.rotation??p.yaw)||0)+(p.isCreature?Math.PI:0);h.visible=p.alive!==false;}for(const[id,h]of remote)if(!active.has(id)){actors.remove(h);remote.delete(id);}}
  function setPose(p={}){if(Number.isFinite(p.x))camera.position.x=p.x;if(Number.isFinite(p.z))camera.position.z=p.z;if(Number.isFinite(p.yaw??p.rotation)){yaw=p.yaw??p.rotation;camera.rotation.y=yaw;}camera.position.y=1.72;}
  function setQuality(q){renderer.setPixelRatio(Math.min(devicePixelRatio,q==='low'?1:1.7));renderer.shadowMap.enabled=q!=='low';torch.castShadow=q!=='low';leaves.castShadow=q!=='low';grassBlades.count=q==='low'?Math.floor(bi*.4):bi;resize();}
  function dispose(){document.removeEventListener('mousemove',mouse);canvas.removeEventListener('click',click);const resources=new Set();scene.traverse(o=>{if(o.geometry)resources.add(o.geometry);const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{resources.add(m);for(const v of Object.values(m))if(v?.isTexture)resources.add(v);});});resources.forEach(r=>r.dispose());renderer.dispose();}
  setLocation('courtyard');setQuality(options.quality||'high');
  return {update,setLocation,setScene,resize,dispose,setPose,getPose:()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,rotation:yaw,yaw}),setRemotePlayers,setQuality,getStats:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,colliders:colliders.length,foliageCards:leaves.count,grassBlades:grassBlades.count})};
}
