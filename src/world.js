import * as THREE from 'three';

// Every surface and actor is generated locally; no image or model service is needed.
export function createWorld(canvas, options = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, options.quality === 'low' ? 1 : 1.7));
  renderer.shadowMap.enabled = options.quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.32;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#15252b');
  scene.fog = new THREE.FogExp2('#263a3d', .012);
  const camera = new THREE.PerspectiveCamera(67, 1, .08, 230);
  camera.rotation.order = 'YXZ';
  const ambient = new THREE.HemisphereLight('#9ab6c1', '#28372d', 1.65);
  scene.add(ambient);
  const moonLight = new THREE.DirectionalLight('#b0ced5', 2.25);
  moonLight.position.set(-30, 50, 20); moonLight.castShadow = true;
  Object.assign(moonLight.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, far: 150 });
  moonLight.shadow.mapSize.set(2048, 2048); moonLight.shadow.bias = -.0006;
  scene.add(moonLight);
  const material = (color, roughness = .9) => new THREE.MeshStandardMaterial({ color, roughness });
  const mats = { concrete: material('#65736d'), blue: material('#1f6486'), metal: material('#53666a', .45), roof: material('#354d51'), wood: material('#4c4c36'), grass: material('#354a38'), black: material('#152026'), skin: material('#a5a49b'), clothes: material('#456776') };
  function texture(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = kind === 'brick' ? '#6d594c' : '#536052'; ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 4500; i++) {
      const shade = Math.random() * 50;
      ctx.fillStyle = `rgba(${shade + 70},${shade + 75},${shade + 61},.18)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 4 + 1, Math.random() * 3 + 1);
    }
    if (kind === 'brick') {
      ctx.strokeStyle = '#393f37'; ctx.lineWidth = 3;
      for (let row = 0; row < 8; row++) {
        ctx.beginPath(); ctx.moveTo(0, row * 32); ctx.lineTo(256, row * 32); ctx.stroke();
        for (let col = -1; col < 5; col++) { const x = col * 64 + (row % 2) * 32; ctx.beginPath(); ctx.moveTo(x, row * 32); ctx.lineTo(x, row * 32 + 32); ctx.stroke(); }
      }
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(kind === 'brick' ? 7 : 32, kind === 'brick' ? 2 : 32); tex.colorSpace = THREE.SRGBColorSpace; return tex;
  }
  const brick = new THREE.MeshStandardMaterial({ map: texture('brick'), roughness: .98 });
  const grass = new THREE.MeshStandardMaterial({ map: texture('grass'), color: '#78856d', roughness: 1 });
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
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 160 / 1024), new THREE.MeshBasicMaterial({ map: tex })); mesh.position.set(x, y, z); mesh.rotation.y = rotation; scene.add(mesh); return mesh;
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
    const glass = new THREE.MeshStandardMaterial({ color: '#42656a', roughness: .24, metalness: .45, emissive: '#607b68', emissiveIntensity: .14 });
    for (let offset = -w / 2 + 2; offset < w / 2 - 1; offset += 3.4) {
      box(2.2, 1.6, .09, mats.black, offset, 2.4, d / 2 + .025, g);
      box(2, 1.4, .11, glass, offset, 2.4, d / 2 + .07, g);
      box(.06, 1.5, .12, mats.metal, offset, 2.4, d / 2 + .15, g);
      box(2.1, .06, .12, mats.metal, offset, 2.4, d / 2 + .15, g);
      cylinder(.065, .065, 3.65, mats.metal, offset, 1.95, d / 2 + 2.5, g);
    }
    box(1.05, 2.6, .13, mats.blue, -w / 2 + .9, 1.5, d / 2 + .1, g);
    box(.08, .08, .15, mats.skin, -w / 2 + 1.25, 1.5, d / 2 + .21, g);
  }
  building(0, -21, 42, 10); building(-28, 3, 27, 9, Math.PI / 2); building(30, -10, 17, 10, -Math.PI / 2);
  building(-29, 30, 12, 8, Math.PI / 2);
  // A separate interior sits inside the bathroom shell for the blackout scene.
  const tile = material('#a2aaa0');
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
  const leaf = material('#263c31'), trunk = material('#625c4c');
  function tree(x, z, scale = 1) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(scale); scene.add(g);
    const stem = cylinder(.25, .55, 8, trunk, 0, 4, 0, g); stem.rotation.z = .08;
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4, r = 1.6 + (i % 2);
      const branch = cylinder(.06,.18,4,trunk,Math.cos(a),6,Math.sin(a),g); branch.rotation.z = Math.cos(a) * .7; branch.rotation.x = Math.sin(a) * .7;
      const canopy = new THREE.Mesh(new THREE.IcosahedronGeometry(2.8, 1), leaf); canopy.position.set(Math.cos(a) * r, 8 + (i % 3), Math.sin(a) * r); canopy.scale.set(1,.8,1); canopy.castShadow = true; g.add(canopy);
    }
  }
  for (let i = 0; i < 45; i++) { const a = i * 2.399; const r = 61 + (i % 6) * 3; tree(Math.cos(a) * r, Math.sin(a) * r, .8 + (i % 4) * .12); }
  [[-22,-41],[-31,-45],[-35,-33],[-15,-48],[18,58],[50,58]].forEach(([x,z])=>tree(x,z,1.15));
  // Fence establishes the perimeter without claiming an exact school survey.
  const wire = material('#4d6361');
  for (let x = -65; x <= 65; x += 5) {
    cylinder(.045,.045,2,wire,x,1,65); cylinder(.045,.045,2,wire,x,1,-65);
    box(5,.025,.025,wire,x+2.5,1.7,65); box(5,.025,.025,wire,x+2.5,.7,65);
  }
  const lamps = [];
  function lamp(x,z) {
    cylinder(.07,.1,5,mats.metal,x,2.5,z); box(.9,.1,.5,mats.metal,x,5,z);
    const bulb = box(.7,.05,.35,new THREE.MeshBasicMaterial({color:'#f5e2a9'}),x,4.92,z);
    const light = new THREE.PointLight('#f5d59e',14,15,2); light.position.set(x,4.7,z); scene.add(light); lamps.push({light,bulb});
  }
  lamp(-16,3); lamp(17,-10); lamp(21,31); lamp(-20,25);
  const moon = new THREE.Mesh(new THREE.SphereGeometry(3,24,16),new THREE.MeshBasicMaterial({color:'#bed0c9'})); moon.position.set(-52,62,-90); scene.add(moon);
  const dustGeometry = new THREE.BufferGeometry(); const dustArray = new Float32Array(220 * 3);
  for (let i=0;i<220;i++){dustArray[i*3]=(Math.random()-.5)*100;dustArray[i*3+1]=Math.random()*12;dustArray[i*3+2]=(Math.random()-.5)*100;}
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustArray,3));
  const dust = new THREE.Points(dustGeometry,new THREE.PointsMaterial({color:'#b9cab3',size:.055,transparent:true,opacity:.45})); scene.add(dust);
  const torch = new THREE.SpotLight('#d4e4d8',24,34,Math.PI/7,.65,1.5); camera.add(torch); torch.position.set(.24,-.2,0); torch.target.position.set(0,0,-10); camera.add(torch.target); scene.add(camera);
  const actors = new THREE.Group(); scene.add(actors);
  function human(color='#345d74', hairColor='#282b25', longHair=false) {
    const g = new THREE.Group(); const cloth=material(color), hairMat=material(hairColor);
    box(.48,.7,.25,cloth,0,1.14,0,g);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.19,12,10),mats.skin); head.position.y=1.68; g.add(head);
    const hair=new THREE.Mesh(new THREE.SphereGeometry(.205,10,8),hairMat);hair.position.set(0,1.76,.025);hair.scale.y=longHair?1.7:.7;g.add(hair);
    const arms=[],legs=[];
    for(const s of [-1,1]){
      const a=new THREE.Group();a.position.set(s*.32,1.42,0);box(.14,.61,.15,cloth,0,-.25,0,a);g.add(a);arms.push(a);
      const l=new THREE.Group();l.position.set(s*.14,.85,0);box(.18,.78,.2,mats.black,0,-.36,0,l);box(.2,.13,.34,mats.black,0,-.76,-.07,l);g.add(l);legs.push(l);
    }
    g.userData={arms,legs}; actors.add(g);return g;
  }
  const spinner=human('#56788a'); const sonny=human('#8a6b47'); const indie=human('#647664','#c1ae71',true);const finn=human('#45616b','#867344',true);
  const creature = new THREE.Group(); actors.add(creature);
  const hide=material('#26332d'),bone=material('#a3aa93');
  const torso=box(.77,1.45,.42,hide,0,2.8,0,creature);torso.rotation.z=.04;
  const skull=new THREE.Mesh(new THREE.IcosahedronGeometry(.39,1),bone);skull.scale.set(.72,1.4,.8);skull.position.set(0,3.78,0);creature.add(skull);
  const eyeMaterial=new THREE.MeshBasicMaterial({color:'#d9d19a'});
  for(const s of [-1,1]){
    box(.07,.035,.05,eyeMaterial,s*.1,3.85,.3,creature);
    const antler=cylinder(.025,.085,.9,bone,s*.33,4.3,.06,creature);antler.rotation.z=-s*.45;
    const fork=cylinder(.008,.04,.45,bone,s*.64,4.58,.05,creature);fork.rotation.z=-s*.8;
  }
  const monsterLimbs=[];
  for(const s of [-1,1]){
    const arm=new THREE.Group();arm.position.set(s*.54,3.35,0);const upper=cylinder(.08,.14,1.25,hide,0,-.6,0,arm);upper.rotation.z=s*.12;cylinder(.035,.09,1.1,bone,s*.09,-1.7,-.12,arm);
    for(let f=0;f<3;f++){const finger=cylinder(.008,.025,.38,bone,s*.09+(f-1)*.055,-2.39,-.13,arm);finger.rotation.x=.25;}
    creature.add(arm);monsterLimbs.push(arm);
    const leg=new THREE.Group();leg.position.set(s*.22,2.18,0);cylinder(.075,.14,1.15,hide,0,-.55,0,leg);const shin=cylinder(.04,.09,1.15,bone,0,-1.62,.12,leg);shin.rotation.x=.14;box(.16,.16,.48,hide,0,-2.15,-.04,leg);creature.add(leg);monsterLimbs.push(leg);
  }
  const iceMat=new THREE.MeshStandardMaterial({color:'#a0e7ed',transparent:true,opacity:.6,roughness:.15,metalness:.3});
  const ice=new THREE.Group();for(let i=0;i<14;i++){const crystal=cylinder(.01,.11,.3+(i%3)*.1,iceMat,(Math.random()-.5)*1.2,-1.45,(Math.random()-.5)*1.2,ice,5);crystal.rotation.z=(Math.random()-.5)*.5;} camera.add(ice);ice.visible=false;
  const places={courtyard:[0,1.72,5,0],bathroom:[-20,1.72,29,Math.PI/2],bottom:[41,1.72,58,.1],top:[-24,1.72,-36,Math.PI],blue:[5,1.72,8,Math.PI]};
  let currentScene='menu', location='courtyard', elapsed=0, sceneTime=0, yaw=0, pitch=0, lookActive=false, movingAllowed=false;
  const remote=new Map(); const velocity=new THREE.Vector3();
  function setLocation(name){location=places[name]?name:'courtyard';const p=places[location];camera.position.set(p[0],p[1],p[2]);yaw=p[3];pitch=0;camera.rotation.set(0,yaw,0);}
  function setScene(name){currentScene=name==='online'?'multiplayer':name;sceneTime=0;lookActive=false;pitch=0; spinner.visible=sonny.visible=indie.visible=finn.visible=creature.visible=false;
    for(const actor of [spinner,sonny,indie,finn]){actor.rotation.set(0,0,0);actor.scale.setScalar(1);actor.userData.arms.forEach(a=>a.rotation.set(0,0,0));actor.userData.legs.forEach(a=>a.rotation.set(0,0,0));}
    if(name==='bathroom'){camera.position.set(-28.5,1.72,30);yaw=Math.PI/2;camera.rotation.set(0,yaw,0);}
    if(name==='sonny'&&location==='bathroom')setLocation('bathroom');
    if(name==='choose'){yaw=places[location][3];camera.rotation.set(0,yaw,0);}
    if(['intro','spin','transform','ending'].includes(name)){spinner.visible=true;spinner.position.set(0,0,-1);spinner.rotation.y=Math.PI;}
    if(name==='ending'){spinner.position.set(camera.position.x,0,camera.position.z-3.4);spinner.lookAt(camera.position.x,0,camera.position.z);}
    if(name==='transform'){creature.position.set(0,0,-1);creature.visible=true;}
    if(name==='sonny'){sonny.visible=creature.visible=true;sonny.position.set(-13,0,23);creature.position.set(-7,0,21);}
    if(name==='indie'){indie.visible=creature.visible=true;indie.position.set(-25,0,-47);creature.position.set(-18,0,-48);}
    if(name==='finn'){finn.visible=creature.visible=true;finn.position.set(3,0,7);creature.position.set(6,0,-7);}
    if(name==='chase'){creature.visible=true;creature.position.copy(camera.position).add(new THREE.Vector3(0,-1.72,-17));}
  }
  const mouse=(e)=>{if(document.pointerLockElement===canvas){yaw-=e.movementX*.002;pitch=THREE.MathUtils.clamp(pitch-e.movementY*.002,-1.05,1.05);lookActive=true;}};
  const click=()=>{if(movingAllowed||currentScene==='choose'){canvas.requestPointerLock?.()?.catch?.(()=>{});}};
  document.addEventListener('mousemove',mouse);canvas.addEventListener('click',click);
  function animateHuman(h,speed,t){h.userData.arms.forEach((a,i)=>a.rotation.x=Math.sin(t*speed+i*Math.PI)*.65);h.userData.legs.forEach((a,i)=>a.rotation.x=Math.sin(t*speed+i*Math.PI+Math.PI)*.6);}
  function blocked(x,z){const radius=.28;return colliders.some(b=>{const nearX=THREE.MathUtils.clamp(x,b.minX,b.maxX),nearZ=THREE.MathUtils.clamp(z,b.minZ,b.maxZ);return (x-nearX)**2+(z-nearZ)**2<radius*radius;});}
  function update(dt,state={}){
    dt=Math.min(dt,.05);elapsed+=dt;sceneTime+=dt;
    const s=currentScene;ice.visible=state.frozen??s==='spin';movingAllowed=Boolean(state.moving)&&!state.frozen;torch.visible=state.flashlight!==false;
    const reducedMotion=state.reducedMotion??options.reducedMotion;
    if(s==='menu') {camera.position.set(13+(reducedMotion?0:Math.sin(elapsed*.07)*.8),2.7,7);camera.lookAt(-6,2,-20);}
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
      else if(s==='chase'&&!lookActive){camera.lookAt(creature.position.x,2.6,creature.position.z);}
      else camera.rotation.set(pitch,yaw,0);
    }
    if(s==='spin')spinner.rotation.y=sceneTime*8;
    if(s==='transform'){const amount=Math.min(sceneTime/3,1);spinner.scale.setScalar(Math.max(.01,1-amount));spinner.visible=amount<.98;creature.scale.setScalar(.2+amount*.8);creature.position.y=Math.sin(sceneTime*3)*.05;}
    else {spinner.scale.setScalar(1);creature.scale.setScalar(1);}
    if(s==='sonny'){sonny.position.x=-13-Math.min(sceneTime*1.6,7);creature.position.x=-7-Math.min(sceneTime*1.6,10);animateHuman(sonny,12,elapsed);sonny.rotation.y=-Math.PI/2;if(sceneTime>5)sonny.visible=false;}
    if(s==='indie'){indie.position.z=-47+Math.min(sceneTime*1.3,5);creature.position.x=-18-Math.min(sceneTime,6);animateHuman(indie,11,elapsed);if(sceneTime>4){indie.rotation.z=-Math.PI/2;indie.position.y=.25;}if(sceneTime>6)indie.visible=false;}
    if(s==='finn'){animateHuman(finn,11,elapsed);if(sceneTime>2)finn.position.z=7-Math.min((sceneTime-2)*3,13);if(sceneTime>6)finn.visible=false;creature.position.z=-7+Math.min(sceneTime*.7,3);}
    if(s==='chase'){const desired=state.threat??.4;const d=17-desired*13;creature.position.set(camera.position.x+Math.sin(elapsed)*.6,0,camera.position.z-d);}
    monsterLimbs.forEach((limb,i)=>{limb.rotation.x=Math.sin(elapsed*(s==='chase'?11:2.2)+(i%2)*Math.PI+(i>1?Math.PI:0))*(s==='chase'?.65:.14);});
    if(creature.visible){creature.lookAt(camera.position.x,0,camera.position.z);skull.rotation.z=Math.sin(elapsed*.8)*.12;torso.position.y=2.8+Math.sin(elapsed*3)*.035;}
    lamps.forEach(({light},i)=>{light.intensity=(Math.sin(elapsed*1.7+i)*Math.sin(elapsed*.13+i)>.78?2:14);});
    dust.rotation.y=reducedMotion?0:elapsed*.003;
    remote.forEach(h=>{if(!h.userData.remoteCreature)animateHuman(h,7,elapsed);});
    renderer.render(scene,camera);
  }
  function resize(){const width=canvas.clientWidth||innerWidth,height=canvas.clientHeight||innerHeight;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  function setRemotePlayers(players=[]){const active=new Set();for(const p of players){if(!p||p.id==null)continue;active.add(p.id);let h=remote.get(p.id);if(h&&Boolean(h.userData.remoteCreature)!==Boolean(p.isCreature)){actors.remove(h);remote.delete(p.id);h=null;}if(!h){if(p.isCreature){h=creature.clone(true);h.userData={remoteCreature:true};actors.add(h);}else h=human('#537c8b');remote.set(p.id,h);}h.position.set(Number(p.x)||0,(Number(p.y)||1.72)-1.72,Number(p.z)||0);h.rotation.y=(Number(p.rotation??p.yaw)||0)+(p.isCreature?Math.PI:0);h.visible=p.alive!==false;}for(const[id,h]of remote)if(!active.has(id)){actors.remove(h);remote.delete(id);}}
  function setPose(p={}){if(Number.isFinite(p.x))camera.position.x=p.x;if(Number.isFinite(p.z))camera.position.z=p.z;if(Number.isFinite(p.yaw??p.rotation)){yaw=p.yaw??p.rotation;camera.rotation.y=yaw;}camera.position.y=1.72;}
  function setQuality(q){renderer.setPixelRatio(Math.min(devicePixelRatio,q==='low'?1:1.7));renderer.shadowMap.enabled=q!=='low';resize();}
  function dispose(){document.removeEventListener('mousemove',mouse);canvas.removeEventListener('click',click);scene.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:[o.material];ms.filter(Boolean).forEach(m=>{m.map?.dispose();m.dispose();});});renderer.dispose();}
  setLocation('courtyard');resize();
  return {update,setLocation,setScene,resize,dispose,setPose,getPose:()=>({x:camera.position.x,y:camera.position.y,z:camera.position.z,rotation:yaw,yaw}),setRemotePlayers,setQuality};
}
