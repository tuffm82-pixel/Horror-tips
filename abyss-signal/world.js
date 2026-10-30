import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const ROOMS = Object.freeze([
  { id: 'pump', minX: -15, maxX: -3, minZ: -13, maxZ: -3, door: -8 },
  { id: 'sample', minX: 3, maxX: 15, minZ: -25, maxZ: -15, door: -20 },
  { id: 'relay', minX: -15, maxX: -3, minZ: -37, maxZ: -27, door: -32 },
]);
export const SOLID_PROPS = Object.freeze([
  ...[[-2.2,-1],[2.2,-14],[-2.2,-26],[2.2,-36]].map(([x,z]) => ({ x, z, halfX:.525, halfZ:.525 })),
  ...[[-11.6,-8],[11.6,-20],[-11.6,-32]].map(([x,z]) => ({ x, z, halfX:.8, halfZ:1.5 })),
  ...[-11.5,-4.5].map(z => ({ x:-7.8,z,halfX:.95,halfZ:.725 })),
  ...[7,9,11].map(x => ({x,z:-23.9,halfX:.48,halfZ:.48})),
  ...[0,1,2,3].map(n => ({x:-6.3-n*1.65,z:-35.9,halfX:.65,halfZ:.55})),
]);

// Architecture and navigation use the same three doorway dimensions.
export function isWalkable(x, z, radius = .28) {
  if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
  if (SOLID_PROPS.some(p => Math.abs(x-p.x)<p.halfX+radius && Math.abs(z-p.z)<p.halfZ+radius)) return false;
  if (x >= -3 + radius && x <= 3 - radius && z >= -42 + radius && z <= 8 - radius) return true;
  for (const room of ROOMS) {
    if (x >= room.minX + radius && x <= room.maxX - radius && z >= room.minZ + radius && z <= room.maxZ - radius) return true;
    const edge = room.maxX < 0 ? -3 : 3;
    if (Math.abs(x - edge) <= radius + .08 && Math.abs(z - room.door) <= 1.5 - radius) return true;
  }
  return false;
}

function randomSource(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}

function surfaceTexture(type, renderer) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), rng = randomSource(type === 'deck' ? 135 : 741);
  ctx.fillStyle = type === 'deck' ? '#525e63' : '#7e8c8e'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 20000; i++) {
    const v = Math.floor(rng() * 100 + 60); ctx.fillStyle = `rgba(${v},${v},${v},${rng() * .24})`;
    ctx.fillRect(rng() * 512, rng() * 512, 1 + rng() * 3, 1);
  }
  if (type === 'deck') {
    ctx.strokeStyle = '#293438'; ctx.lineWidth = 4;
    for (let n = 0; n < 512; n += 128) ctx.strokeRect(n + 2, 2, 124, 508);
    ctx.strokeStyle = '#a3ada9'; ctx.lineWidth = 2;
    for (let y = 14; y < 512; y += 24) for (let x = 12; x < 512; x += 24) {
      ctx.beginPath(); ctx.moveTo(x - 4, y + 4); ctx.lineTo(x + 4, y - 4); ctx.stroke();
    }
    for (let i = 0; i < 45; i++) {
      const x = rng() * 512, y = rng() * 512;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, rng() * 55 + 8);
      gradient.addColorStop(0, 'rgba(17,31,33,.42)'); gradient.addColorStop(1, 'rgba(17,31,33,0)');
      ctx.fillStyle = gradient; ctx.fillRect(x - 65, y - 65, 130, 130);
    }
  } else {
    ctx.strokeStyle = '#46565a'; ctx.lineWidth = 3; ctx.strokeRect(4, 4, 504, 504);
    for (const x of [15, 497]) for (const y of [15, 497]) {
      ctx.fillStyle = '#273438'; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a2abad'; ctx.fillRect(x - 2, y - 1, 4, 1);
    }
    for (let i = 0; i < 60; i++) {
      ctx.strokeStyle = `rgba(70,44,20,${rng() * .35})`; ctx.lineWidth = rng() * 7 + 1;
      const x = rng() * 512, y = rng() * 512;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rng() * 10, y + rng() * 100); ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy()); return texture;
}

function signTexture(title, subtitle, color = '#83e1d2') {
  const c = document.createElement('canvas'); c.width = 768; c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = '#07191c'; x.fillRect(0, 0, 768, 256);
  x.strokeStyle = color; x.lineWidth = 3; x.strokeRect(10, 10, 748, 236);
  x.fillStyle = color; x.fillRect(22, 24, 7, 208);
  x.font = '600 57px sans-serif'; x.fillText(title, 50, 124);
  x.font = '25px monospace'; x.globalAlpha = .74; x.fillText(subtitle, 52, 190);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function monitorTexture(index) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const ctx = c.getContext('2d'), tint = index === 1 ? '#77e4d9' : '#edbd7c';
  ctx.fillStyle = '#061b20'; ctx.fillRect(0, 0, 512, 256); ctx.strokeStyle = '#1b3b40'; ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 32) { ctx.beginPath(); ctx.moveTo(x, 55); ctx.lineTo(x, 210); ctx.stroke(); }
  for (let y = 55; y < 210; y += 24) { ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(502, y); ctx.stroke(); }
  ctx.fillStyle = tint; ctx.font = 'bold 22px monospace'; ctx.fillText(['FLOOD ISOLATION', 'QUARANTINE / 09', 'DISTRESS UPLINK'][index], 18, 32);
  ctx.font = '11px monospace'; ctx.fillText('NEREID CONTROL SYSTEMS  //  1,840 m', 18, 49);
  ctx.strokeStyle = tint; ctx.lineWidth = 2; ctx.beginPath();
  for (let x = 12; x < 498; x++) {
    const p = x % 83, y = 130 + Math.sin(x * .065 + index) * 17 + (p > 38 && p < 44 ? -54 : p >= 44 && p < 49 ? 32 : 0);
    if (x === 12) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke(); ctx.fillStyle = '#df8c69'; ctx.font = '14px monospace'; ctx.fillText(['MANUAL RESET REQUIRED', 'BLACK BOX RECOVERABLE', 'DISCONNECT CARRIER'][index], 18, 235);
  ctx.fillStyle = '#00000022'; for (let y = 0; y < 256; y += 4) ctx.fillRect(0, y, 512, 1);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

export function createWorld(canvas, { quality = 'high' } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.AgXToneMapping;
  renderer.toneMappingExposure = 1.15; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#031016'); scene.fog = new THREE.FogExp2('#07171c', .033);
  const camera = new THREE.PerspectiveCamera(68, 1, .06, 110); camera.position.set(0, 1.65, 4); scene.add(camera);
  const materials = new Map(), batches = new Map(), animated = [], statusLamps = [];
  const deckMap = surfaceTexture('deck', renderer), wallMap = surfaceTexture('wall', renderer);
  const makeMat = (id, settings) => materials.set(id, new THREE.MeshStandardMaterial(settings));
  makeMat('wall', { color: '#53767c', map: wallMap, metalness: .58, roughness: .53, bumpMap: wallMap, bumpScale: .035 });
  makeMat('deck', { color: '#52656a', map: deckMap, metalness: .8, roughness: .3, bumpMap: deckMap, bumpScale: .018 });
  makeMat('rib', { color: '#202e35', metalness: .82, roughness: .42 });
  makeMat('pipe', { color: '#8a8780', metalness: .88, roughness: .35 });
  makeMat('rust', { color: '#734e30', metalness: .48, roughness: .77 });
  makeMat('yellow', { color: '#bea45b', metalness: .6, roughness: .53 });
  makeMat('dark', { color: '#071218', metalness: .48, roughness: .7 });
  makeMat('white', { color: '#a9b9b8', metalness: .35, roughness: .55 });
  makeMat('cyan', { color: '#75cbd7', emissive: '#44b8cc', emissiveIntensity: 2.4, roughness: .28 });
  makeMat('amber', { color: '#edb065', emissive: '#ec7723', emissiveIntensity: 2.6, roughness: .3 });
  makeMat('red', { color: '#d54938', emissive: '#ca241b', emissiveIntensity: 2.1, roughness: .25 });
  makeMat('glass', { color: '#062e3a', metalness: .85, roughness: .12, emissive: '#053343', emissiveIntensity: .55 });
  const matrix = new THREE.Matrix4(), quat = new THREE.Quaternion(), euler = new THREE.Euler();
  function addGeometry(material, geometry, x, y, z, rx = 0, ry = 0, rz = 0) {
    quat.setFromEuler(euler.set(rx, ry, rz)); matrix.compose(new THREE.Vector3(x, y, z), quat, new THREE.Vector3(1, 1, 1));
    geometry.applyMatrix4(matrix); if (!batches.has(material)) batches.set(material, []); batches.get(material).push(geometry);
  }
  function box(mat, x, y, z, w, h, d, rx = 0, ry = 0, rz = 0) {
    const geom = new THREE.BoxGeometry(w, h, d);
    if (mat === 'wall' || mat === 'deck') {
      const uv = geom.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, d) / 2, uv.getY(i) * Math.max(h, d) / 2);
    }
    addGeometry(mat, geom, x, y, z, rx, ry, rz);
  }
  function cylinder(mat, x, y, z, radius, length, axis = 'y', segments = 12) {
    addGeometry(mat, new THREE.CylinderGeometry(radius, radius, length, segments), x, y, z, axis === 'z' ? Math.PI / 2 : 0, 0, axis === 'x' ? Math.PI / 2 : 0);
  }
  function torus(mat, x, y, z, radius, tube, ry = 0) { addGeometry(mat, new THREE.TorusGeometry(radius, tube, 6, 28), x, y, z, 0, ry); }
  function sign(title, subtitle, x, y, z, rotation = 0, color = '#82d9d2', w = 2.4, h = .8) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: signTexture(title, subtitle, color), toneMapped: false }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotation; scene.add(mesh); return mesh;
  }
  box('deck', 0, -.12, -17, 6, .24, 50); box('wall', 0, 3.95, -17, 6, .3, 50);
  box('wall', 0, 1.9, 8, 6, 3.8, .25); box('wall', 0, 1.9, -42, 6, 3.8, .25);
  for (const side of [-1, 1]) {
    const openings = side === -1 ? [-32, -8] : [-20]; let from = -42;
    for (const center of [...openings, 100]) {
      const to = Math.min(8, center - 1.5);
      if (to > from) box('wall', side * 3.1, 1.9, (from + to) / 2, .2, 3.8, to - from);
      if (center < 8) {
        box('rib', side * 3.06, 3.36, center, .3, .88, 3);
        for (const end of [-1, 1]) box('yellow', side * 2.99, 1.46, center + end * 1.5, .16, 2.92, .14);
      }
      from = center + 1.5; if (to === 8) break;
    }
  }
  for (let z = 5; z > -42; z -= 6) {
    for (const side of [-1, 1]) {
      box('rib', side * 2.86, 1.9, z, .28, 3.8, .3);
      box('pipe', side * 2.68, 3.33, z, .14, .67, .34, 0, 0, side * .65);
      box('cyan', side * 2.83, .21, z - 2.5, .035, .06, 3.6);
      box('rib', side * 2.82, .14, z - 2.5, .12, .2, 5.7);
    }
    box('rib', 0, 3.6, z, 6, .4, .32); box('dark', 0, 3.67, z - 2.5, 1.65, .16, .45);
    box(z < -28 ? 'amber' : 'cyan', 0, 3.56, z - 2.5, 1.4, .05, .22);
  }
  for (let i = 0; i < 4; i++) {
    const x = -2.26 + i * .29; cylinder(i === 2 ? 'rust' : 'pipe', x, 3.36, -17, .085 + i * .012, 49, 'z');
    for (let z = 7; z > -42; z -= 3) cylinder('rib', x, 3.36, z, .12 + i * .012, .13, 'z');
  }
  for (let z = 6; z > -40; z -= 2.5) {
    box('dark', 2.63, 3.35, z, .37, .16, 2.45);
    for (let i = 0; i < 3; i++) cylinder('rust', 2.54 + i * .075, 3.45, z, .02, 2.48, 'z', 6);
  }
  const roomNames = [['PUMP CONTROL', '01 / FLOOD ISOLATION', '#e6b06b'], ['SPECIMEN LAB', '02 / BLACK BOX RECOVERY', '#80dbd9'], ['SIGNAL RELAY', '03 / DISCONNECT CARRIER', '#e6b06b']];
  ROOMS.forEach((room, index) => {
    const cx = (room.minX + room.maxX) / 2, cz = room.door, side = cx < 0 ? -1 : 1;
    box('deck', cx, -.12, cz, 12, .24, 10); box('wall', cx, 3.95, cz, 12, .3, 10);
    box('wall', cx, 1.9, room.minZ, 12, 3.8, .24); box('wall', cx, 1.9, room.maxZ, 12, 3.8, .24);
    const endX = side * 15;
    box('wall', endX, .37, cz, .25, .74, 10); box('wall', endX, 3.48, cz, .25, .64, 10);
    for (const offset of [-4, 4]) box('wall', endX, 1.94, cz + offset, .25, 2.4, 2);
    box('glass', endX + side * .08, 1.95, cz, .1, 2.25, 6);
    for (const offset of [-3, 0, 3]) box('rib', endX - side * .1, 1.95, cz + offset, .22, 2.5, .14);
    for (const y of [.76, 3.15]) box('pipe', endX - side * .13, y, cz, .17, .15, 6.2);
    for (let z = -2.7; z < 3; z += .6) for (const y of [.78, 3.12]) cylinder('yellow', endX - side * .24, y, cz + z, .035, .04, 'x', 6);
    for (let n = 0; n < 5; n++) {
      box('rib', cx - 4 + n * 2, 3.73, cz, .12, .17, 10);
      box(index === 1 ? 'cyan' : 'amber', cx - 4 + n * 2, 3.61, cz, .65, .045, .16);
    }
    for (const end of [-1, 1]) {
      cylinder('pipe', cx, 2.85, cz + end * 4.75, .13, 11.5, 'x'); cylinder('rust', cx, 2.5, cz + end * 4.75, .065, 11.5, 'x');
    }
    const [title, subtitle, color] = roomNames[index];
    sign(title, subtitle, side * 2.96, 2.9, cz, -side * Math.PI / 2, color, 2.7, .65);
    sign(title, subtitle, cx, 2.75, cz - 4.83, 0, color, 3.6, .9);
    const stationX = side * 11.6;
    box('rib', stationX, .55, cz, 1.6, 1.1, 3); box('wall', stationX, 1.11, cz, 1.8, .18, 3.2, 0, 0, side * -.12);
    box('dark', stationX + side * .37, 1.5, cz, .18, .8, 2.7, 0, 0, side * -.15);
    const monitor = new THREE.Mesh(new THREE.PlaneGeometry(1.42, .54), new THREE.MeshBasicMaterial({ map: monitorTexture(index), toneMapped: false }));
    monitor.position.set(stationX + side * .22, 1.52, cz - .42); monitor.rotation.y = -side * Math.PI / 2; scene.add(monitor);
    for (let j = 0; j < 6; j++) {
      cylinder('dark', stationX - side * .25, 1.23, cz - 1.15 + j * .38, .065, .07, 'y', 10);
      box(j % 3 ? 'cyan' : 'red', stationX - side * .6, 1.21, cz - 1.15 + j * .38, .11, .025, .06);
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.10, 10, 8), new THREE.MeshStandardMaterial({ color: '#ed983c', emissive: '#e85d12', emissiveIntensity: 2 }));
    lamp.position.set(stationX - side * .75, 1.4, cz + 1.2); lamp.userData.id = room.id; lamp.userData.index = index; scene.add(lamp); statusLamps.push(lamp);
    for (let j = 0; j < 3; j++) {
      box('rib', cx + j * 1.1 - 1.1, .38, cz + 3.85, .9, .76, .85);
      box('yellow', cx + j * 1.1 - 1.1, .57, cz + 3.41, .78, .09, .018);
    }
    const point = new THREE.PointLight(index === 1 ? '#69c9de' : '#f1a261', index === 1 ? 28 : 21, 15, 2);
    point.position.set(cx, 3.1, cz); scene.add(point); animated.push({ type: 'roomLight', object: point, base: point.intensity, phase: index * 7 });
    const ocean = new THREE.Mesh(new THREE.PlaneGeometry(6, 2.1), new THREE.MeshBasicMaterial({ color: '#0a303b', transparent: true, opacity: .26 }));
    ocean.position.set(endX - side * .15, 1.95, cz); ocean.rotation.y = -side * Math.PI / 2; scene.add(ocean); animated.push({ type: 'ocean', object: ocean, phase: index });
  });
  for (const z of [-11.5, -4.5]) {
    cylinder('wall', -7.8, .8, z, .65, 1.6, 'x', 20); cylinder('rust', -8.65, .8, z, .32, .5, 'x', 16);
    cylinder('pipe', -9.5, .8, z, .15, 1.4, 'x'); torus('red', -8.1, 1.65, z, .29, .045, Math.PI / 2);
    cylinder('pipe', -8.1, 1.28, z, .055, .7); box('rib', -7.8, .15, z, 1.9, .3, 1.45);
  }
  for (const x of [7, 9, 11]) {
    cylinder('dark', x, .25, -23.9, .48, .5, 'y', 20); cylinder('glass', x, 1.3, -23.9, .42, 1.6, 'y', 20);
    cylinder('rib', x, 2.17, -23.9, .49, .18, 'y', 20); torus('cyan', x, 1.45, -23.46, .18, .025);
  }
  sign('DO NOT LISTEN', 'THE SIGNAL USES FAMILIAR VOICES', 8.7, 2.4, -15.18, Math.PI, '#e39b81', 3.5, .9);
  for (let n = 0; n < 4; n++) {
    box('dark', -6.3 - n * 1.65, 1.35, -35.9, 1.3, 2.7, 1.1);
    for (let j = 0; j < 10; j++) {
      box('rib', -6.3 - n * 1.65, .28 + j * .24, -35.32, 1.12, .16, .025);
      box(j % 4 === 0 ? 'red' : 'cyan', -6.7 - n * 1.65, .28 + j * .24, -35.29, .045, .03, .02);
    }
  }
  for (const [x,z] of [[-2.2,-1],[2.2,-14],[-2.2,-26],[2.2,-36]]) {
    const side = Math.sign(x);
    box('rib', x, 1.25, z, 1.05, 2.5, 1.05); box('wall', x - side * .54, 1.25, z, .035, 2.35, .9);
    box('yellow', x - side * .565, 1.18, z + .29, .05, .28, .04);
    for (let j=0;j<5;j++) box('dark',x-side*.565,1.68+j*.085,z,.025,.035,.55);
    sign('SHELTER', 'HIDE / KEEP SILENT', x - side * .58, .75, z, -side * Math.PI / 2, '#87b9ac', .75, .24);
  }
  for (const z of [-41.8, 7.8]) {
    box('rib', 0, 1.6, z, 2.85, 3.2, .2); box('wall', 0, 1.5, z + (z < 0 ? .13 : -.13), 2.3, 2.9, .13);
    for (const x of [-1.15, 1.15]) box('yellow', x, 1.5, z + (z < 0 ? .21 : -.21), .1, 2.9, .025);
    torus('pipe', 0, 1.48, z + (z < 0 ? .24 : -.24), .37, .055);
    box('rib', 0, 1.48, z + (z < 0 ? .25 : -.25), .7, .05, .035); box('rib', 0, 1.48, z + (z < 0 ? .25 : -.25), .05, .7, .035);
  }
  sign('SURFACE ACCESS', 'ESCAPE POD / PRESSURE LOCKED', 0, 3.38, -41.64, 0, '#dcb27c', 3.5, .55);
  sign('NEREID / 09', 'DEPTH 1,840 m  /  CREW 00', 0, 2.85, 7.63, Math.PI, '#80d8d3', 3.5, .7);
  sign('01', 'PUMP CONTROL  <', -2.96, 1.6, -3.8, Math.PI / 2, '#dcb27c', 1.6, .8);
  sign('02', 'SPECIMEN LAB  >', 2.96, 1.6, -15.7, -Math.PI / 2, '#80d8d3', 1.6, .8);
  sign('03', 'SIGNAL RELAY  <', -2.96, 1.6, -27.7, Math.PI / 2, '#dcb27c', 1.6, .8);
  // Merge the full architecture by material, keeping mobile draw calls low.
  for (const [name, geometries] of batches) {
    const geometry = mergeGeometries(geometries, false); geometries.forEach(g => g.dispose());
    const mesh = new THREE.Mesh(geometry, materials.get(name)); mesh.receiveShadow = true;
    mesh.castShadow = ['rib', 'pipe', 'wall', 'dark'].includes(name); scene.add(mesh);
  }
  batches.clear(); scene.add(new THREE.HemisphereLight('#8fbbca', '#182020', 1)); scene.add(new THREE.AmbientLight('#437483', .4));
  for (const [z, color, power] of [[1, '#96ccd8', 31], [-15, '#4baebf', 22], [-28, '#d99060', 20], [-39, '#d65a37', 18]]) {
    const light = new THREE.PointLight(color, power, 14, 2); light.position.set(0, 3.2, z); scene.add(light);
    animated.push({ type: 'hallLight', object: light, base: power, phase: z });
  }
  const torch = new THREE.SpotLight('#d5e8e9', 26, 22, Math.PI / 5.1, .58, 1.8);
  torch.position.set(.16, -.12, .05); torch.target.position.set(0, -.12, -12);
  torch.shadow.mapSize.set(1024, 1024); torch.shadow.camera.near = .15; torch.shadow.camera.far = 23;
  torch.shadow.bias = -.0002; torch.shadow.normalBias = .035; camera.add(torch, torch.target);
  const fill = new THREE.PointLight('#accfd5', 1.4, 4, 2); camera.add(fill);
  const rng = randomSource(1199), particles = new Float32Array(280 * 3);
  for (let i = 0; i < 280; i++) { particles[i * 3] = (rng() - .5) * 5.5; particles[i * 3 + 1] = rng() * 3.5; particles[i * 3 + 2] = rng() * 49 - 41; }
  const particleGeometry = new THREE.BufferGeometry(); particleGeometry.setAttribute('position', new THREE.BufferAttribute(particles, 3));
  const particlesMesh = new THREE.Points(particleGeometry, new THREE.PointsMaterial({ color: '#a0c5c7', size: .018, transparent: true, opacity: .28, depthWrite: false })); scene.add(particlesMesh);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 48), new THREE.MeshStandardMaterial({ color: '#243d42', metalness: .94, roughness: .1, transparent: true, opacity: .27, depthWrite: false }));
  water.rotation.x = -Math.PI / 2; water.position.set(0, .012, -17); scene.add(water);
  const interactables = [
    { id: 'pump', position: { x: -11, z: -8 }, label: 'Isolate flood pumps' },
    { id: 'sample', position: { x: 11, z: -20 }, label: 'Recover black box' },
    { id: 'relay', position: { x: -11, z: -32 }, label: 'Disconnect signal' },
    { id: 'escape', position: { x: 0, z: -40 }, label: 'Launch escape pod' },
  ];
  function resize() {
    const width = canvas.clientWidth || window.innerWidth, height = canvas.clientHeight || window.innerHeight;
    renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  function setQuality(q) {
    quality = q; renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q === 'low' ? 1 : 1.5));
    renderer.shadowMap.enabled = q !== 'low'; torch.castShadow = q !== 'low'; resize();
  }
  setQuality(quality);
  function update(dt, time, player = {}, state = {}) {
    const threat = Math.max(0, Math.min(1, Number(state.threat) || 0));
    const flashlightOn = player.flashlight !== false && state.flashlight !== false && !player.hidden;
    torch.intensity = flashlightOn ? 26 * (1 - threat * .12) : 0; fill.intensity = flashlightOn ? 1.4 : .2;
    if (Number.isFinite(state.brightness)) renderer.toneMappingExposure = Math.max(.65, Math.min(2, state.brightness));
    for (const item of animated) {
      if (item.type === 'ocean') { item.object.material.opacity = .22 + Math.sin(time * .24 + item.phase) * .07; continue; }
      const flutter = Math.sin(time * 2.1 + item.phase) * Math.sin(time * 11.3 + item.phase);
      const dropout = Math.sin(time * .73 + item.phase) > .985 ? .22 : 1;
      item.object.intensity = item.base * (1 + flutter * .045) * dropout * (1 - threat * .23);
    }
    particlesMesh.rotation.z = Math.sin(time * .04) * .004; particlesMesh.position.y = Math.sin(time * .21) * .045;
    water.position.y = .014 + Math.sin(time * .37) * .004; water.material.opacity = .24 + Math.sin(time * .45) * .035;
    for (const lamp of statusLamps) {
      const completed = lamp.userData.index < state.chapter || state.completed?.includes?.(lamp.userData.id) || state.objectives?.[lamp.userData.id] === true;
      lamp.material.color.set(completed ? '#64e4b5' : '#ed983c'); lamp.material.emissive.set(completed ? '#21b887' : '#e85d12');
      lamp.material.emissiveIntensity = completed ? 2 : 1.6 + Math.sin(time * 3) * .4;
    }
  }
  function dispose() {
    const geoms = new Set(), mats = new Set(), textures = new Set();
    scene.traverse(object => { if (object.geometry) geoms.add(object.geometry); if (object.material) for (const mat of Array.isArray(object.material) ? object.material : [object.material]) mats.add(mat); });
    for (const mat of mats) for (const value of Object.values(mat)) if (value?.isTexture) textures.add(value);
    textures.forEach(t => t.dispose()); geoms.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); renderer.dispose();
  }
  return { scene, camera, renderer, update, render: () => renderer.render(scene, camera), resize, dispose, setQuality, colliders: SOLID_PROPS, interactables, flashlight: torch };
}
