import * as THREE from 'three';

/** Fictional school details and street extension; all materials are generated locally. */
export function createEnvironmentDetails(scene, { surfaces = {}, mats = {}, box, cylinder, sign } = {}) {
  const root = new THREE.Group();
  root.name = 'school-environment-details';
  scene.add(root);
  const geometries = new Set(), materials = new Set(), textures = new Set();
  const batches = new Map(), dummy = new THREE.Object3D();
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  const unitShrub = new THREE.IcosahedronGeometry(1, 1);
  geometries.add(unitBox); geometries.add(unitCylinder); geometries.add(unitShrub);
  function material(color, options = {}) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...options });
    materials.add(mat); return mat;
  }
  const palette = {
    concrete: mats.concrete || material('#747d76'), metal: mats.metal || material('#586467'),
    wood: mats.wood || material('#554e3d'), blue: mats.blue || material('#315364'),
    brick: surfaces.brick || material('#6b5244'), roof: surfaces.roof || material('#4b5958'),
    paint: material('#9d9b85'), darkPaint: material('#354b4b'), green: material('#435c4c'),
    soil: material('#332e23'), leaf: material('#4d6550'), rust: material('#705747'),
    line: material('#c2c2aa'), rubber: material('#283a3a'), tile: material('#a4aba2'),
    black: material('#182227'), glass: material('#2d4547', { roughness: 0.16, metalness: 0.25 }),
    warmWindow: material('#545d55', { emissive: '#755d37', emissiveIntensity: 0.33 }),
  };
  function instance(geometry, mat, x, y, z, sx, sy, sz, rx = 0, ry = 0, rz = 0) {
    const key = `${geometry.uuid}:${mat.uuid}`;
    let batch = batches.get(key);
    if (!batch) { batch = { geometry, material: mat, matrices: [] }; batches.set(key, batch); }
    dummy.position.set(x, y, z); dummy.scale.set(sx, sy, sz); dummy.rotation.set(rx, ry, rz);
    dummy.updateMatrix(); batch.matrices.push(dummy.matrix.clone());
  }
  const b = (w, h, d, mat, x, y, z, rotation = 0) => instance(unitBox, mat, x, y, z, w, h, d, 0, rotation, 0);
  const pole = (r, h, mat, x, y, z) => instance(unitCylinder, mat, x, y, z, r, h, r);
  function rod(a, c, radius, mat) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...c), midpoint = start.clone().add(end).multiplyScalar(0.5);
    const key = `${unitCylinder.uuid}:${mat.uuid}`;
    if (!batches.has(key)) batches.set(key, { geometry: unitCylinder, material: mat, matrices: [] });
    dummy.position.copy(midpoint); dummy.scale.set(radius, start.distanceTo(end), radius);
    dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    dummy.updateMatrix(); batches.get(key).matrices.push(dummy.matrix.clone());
  }
  function shrub(x, y, z, sx = 0.6, sy = 0.7, sz = 0.6) {
    instance(unitShrub, palette.leaf, x, y, z, sx, sy, sz, 0, x * 0.6, 0);
  }

  // One atlas and one merged draw hold signs and notices, keeping lettering crisp close up.
  const labels = [];
  function label(text, x, y, z, width = 2, rotation = 0, sub = '', style = 'blue') {
    labels.push({ text, x, y, z, width, rotation, sub, style });
  }
  label('OFFICE', -20.1, 3.08, -15.72, 1.55, 0, 'VISITORS PLEASE REPORT HERE');
  label('A01', -11.8, 3.25, -15.72, 0.65, 0, 'CLASSROOM');
  label('A02', -1.6, 3.25, -15.72, 0.65, 0, 'CLASSROOM');
  label('A03', 8.6, 3.25, -15.72, 0.65, 0, 'CLASSROOM');
  label('HALL', 24.85, 3.3, -8.5, 1.75, -Math.PI / 2, 'KEEP WALKWAYS CLEAR');
  label('CANTEEN', -23.31, 3.2, -3.8, 2.2, Math.PI / 2, 'CLOSED');
  label('LIBRARY', -23.31, 3.2, 10.8, 1.9, Math.PI / 2, 'PLEASE RETURN YOUR BOOKS');
  label('SCHOOL NOTICES', -14.8, 2.52, -15.68, 2.6, 0, 'ASSEMBLY     SPORT     COMMUNITY', 'notice');
  label('LOST PROPERTY', 13.2, 1.35, -14.8, 1.7, 0, 'PLEASE CHECK BEFORE FRIDAY');
  label('SPORTS STORE', 50.9, 2.45, 40.5, 2.45, -Math.PI / 2, 'RETURN ALL EQUIPMENT');
  label('GROW TOGETHER', -9.5, 1.28, 22.3, 2.1, 0, 'OUR SCHOOL GARDEN');
  label('AFTER HOURS', 12.5, 1.65, 64.85, 2.4, Math.PI, 'GATES CLOSE AT DUSK');
  label('SCHOOL ZONE', 8.2, 2.75, 79, 1.3, 0, '40     WHEN LIGHTS FLASH', 'road');
  label('PEDESTRIAN EXIT', 23.2, 2.4, 64.9, 2.8, Math.PI, 'PLEASE CLOSE THE GATE');
  label('NO BALL GAMES', 24.86, 1.75, -3.5, 1.25, -Math.PI / 2, 'AGAINST THE BUILDING');
  label('MIND THE STEP', -23.28, 0.67, 16, 1.3, Math.PI / 2, '', 'road');

  // Noticeboard frame, attached pinboard and uneven paper notices.
  b(2.85, 1.5, 0.13, palette.wood, -14.8, 2.12, -15.62);
  b(2.65, 1.3, 0.08, palette.darkPaint, -14.8, 2.12, -15.51);
  for (let i = 0; i < 6; i++) {
    const x = -15.75 + (i % 3) * 0.9, y = 1.8 + Math.floor(i / 3) * 0.5;
    b(0.56, 0.37, 0.025, i % 2 ? palette.paint : palette.tile, x, y, -15.45, (i % 3 - 1) * 0.025);
    b(0.035, 0.035, 0.035, palette.rust, x, y + 0.14, -15.42);
    for (let line = 0; line < 3; line++) b(0.38 - line * 0.06, 0.012, 0.01, palette.darkPaint, x, y + 0.05 - line * 0.07, -15.43);
  }
  // Classroom hardware, weathered steps, door frames and security grilles.
  for (const x of [-20.1, -10.1, 0.1, 10.3]) {
    b(1.15, 0.12, 0.95, palette.concrete, x, 0.22, -14.97);
    b(0.09, 2.8, 0.16, palette.paint, x - 0.59, 1.55, -15.7);
    b(0.09, 2.8, 0.16, palette.paint, x + 0.59, 1.55, -15.7);
    b(1.27, 0.1, 0.16, palette.paint, x, 2.98, -15.7);
    if (x > -15) {
      b(1.03, 2.52, 0.1, palette.blue, x, 1.55, -15.67);
      b(0.48, 0.6, 0.06, palette.glass, x, 2.18, -15.58);
      b(0.07, 0.07, 0.12, palette.metal, x + 0.37, 1.4, -15.55);
    }
    b(0.25, 0.35, 0.12, palette.metal, x - 0.92, 1.5, -15.72);
  }
  // Canteen hatch on the west block; open metal shutter sits above a closed counter.
  b(0.12, 1.62, 4.6, palette.darkPaint, -23.35, 1.93, -3.8);
  b(0.18, 0.18, 5.1, palette.wood, -23.08, 1.13, -3.8);
  b(0.16, 0.48, 4.9, palette.metal, -23.24, 2.86, -3.8);
  for (let i = 0; i < 16; i++) b(0.04, 1.25, 0.035, palette.metal, -23.23, 1.95, -5.9 + i * 0.28);
  for (const z of [-6.15, -1.45]) b(0.28, 0.42, 0.12, palette.metal, -23, 0.82, z);
  // Lockers and lost-property crate are set against the wall, clear of central movement.
  for (let i = 0; i < 12; i++) {
    const x = 11 + i * 0.48;
    b(0.46, 1.38, 0.48, i % 3 ? palette.darkPaint : palette.blue, x, 0.92, -14.83);
    b(0.025, 0.12, 0.035, palette.metal, x + 0.13, 0.95, -14.57);
    for (let v = 0; v < 3; v++) b(0.22, 0.018, 0.018, palette.black, x, 1.37 - v * 0.065, -14.576);
  }
  b(1.4, 0.52, 0.85, palette.wood, 18.8, 0.45, -14.45);
  b(1.1, 0.13, 0.65, palette.blue, 18.8, 0.79, -14.45);
  b(0.45, 0.09, 0.4, palette.paint, 18.5, 0.9, -14.35, 0.3);

  // Verandah drains, grates and service conduits.
  for (const x of [-17.25, -10.75]) b(0.1, 0.025, 52, palette.darkPaint, x, 0.065, 7);
  for (let i = 0; i < 22; i++) {
    b(0.9, 0.025, 0.032, palette.metal, -14, 0.068, -15 + i * 2.25);
    b(0.032, 0.026, 0.7, palette.darkPaint, -14.3, 0.07, -15 + i * 2.25);
  }
  for (const x of [-20.65, 20.65]) {
    pole(0.065, 3.8, palette.metal, x, 1.95, -15.55);
    rod([x, 0.2, -15.55], [x, 0.2, -14.8], 0.065, palette.metal);
  }
  b(3.8, 0.08, 0.12, palette.metal, -18.7, 3.35, -15.6);

  function bench(x, z, rotation = 0) {
    const offset = (dx, dz) => [x + Math.cos(rotation) * dx + Math.sin(rotation) * dz, z - Math.sin(rotation) * dx + Math.cos(rotation) * dz];
    for (let i = 0; i < 4; i++) { const [px, pz] = offset(0, -0.3 + i * 0.2); b(2.7, 0.09, 0.15, palette.wood, px, 0.62, pz, rotation); }
    const [backX, backZ] = offset(0, -0.4);
    b(2.7, 0.16, 0.09, palette.wood, backX, 0.99, backZ, rotation);
    for (const dx of [-1.03, 1.03]) {
      const [px, pz] = offset(dx, 0); b(0.12, 0.6, 0.7, palette.metal, px, 0.3, pz, rotation);
      const [bx, bz] = offset(dx, -0.4); b(0.08, 0.8, 0.08, palette.metal, bx, 0.7, bz, rotation);
    }
  }
  bench(-21.4, 8, Math.PI / 2); bench(-19.8, 20, Math.PI / 2); bench(17, -9); bench(46, 12, Math.PI);
  for (const [x, z] of [[-21, -9], [21, 15], [-21, 34], [49, 48]]) {
    b(0.72, 1.02, 0.68, palette.green, x, 0.54, z);
    b(0.78, 0.09, 0.76, palette.darkPaint, x, 1.1, z);
    b(0.35, 0.07, 0.1, palette.metal, x, 1.19, z);
    for (const dx of [-0.26, 0.26]) pole(0.1, 0.12, palette.black, x + dx, 0.16, z + 0.3);
  }
  // Hopscotch chalk is flattened and slightly broken by dark flecks.
  const chalk = material('#b2b9a2', { transparent: true, opacity: 0.55 });
  for (let row = 0; row < 7; row++) {
    const pair = row === 2 || row === 5;
    for (let side = 0; side < (pair ? 2 : 1); side++) {
      const x = 8.2 + (pair ? (side - 0.5) * 0.84 : 0), z = -2 + row * 0.85;
      for (const edge of [-0.39, 0.39]) {
        b(0.78, 0.012, 0.027, chalk, x, 0.048, z + edge);
        b(0.027, 0.012, 0.78, chalk, x + edge, 0.048, z);
      }
    }
  }

  // Raised planted beds, a water tank, hose reel and narrow garden trellis.
  for (const [x, z] of [[-8.8, 23.6], [-4.9, 23.6], [-8.8, 27.6]]) {
    b(3.1, 0.45, 2.1, palette.wood, x, 0.225, z);
    b(2.87, 0.055, 1.86, palette.soil, x, 0.47, z);
    for (let i = 0; i < 8; i++) shrub(x - 1.05 + (i % 4) * 0.7, 0.8 + (i % 3) * 0.1, z - 0.45 + Math.floor(i / 4) * 0.9, 0.33, 0.4, 0.3);
  }
  for (const x of [-10.4, -7.1]) pole(0.04, 1.7, palette.wood, x, 1.1, 28.7);
  for (let i = 0; i < 6; i++) b(3.3, 0.025, 0.025, palette.wood, -8.75, 0.6 + i * 0.25, 28.7);
  pole(0.8, 2.1, palette.darkPaint, -22.6, 1.05, 38.3);
  for (let i = 0; i < 9; i++) pole(0.82, 0.025, palette.metal, -22.6, 0.18 + i * 0.23, 38.3);
  pole(0.025, 1.2, palette.metal, -21.65, 0.6, 38.3);
  b(0.25, 0.06, 0.18, palette.metal, -21.65, 1.22, 38.3);

  // Sports shed and stored equipment face the edge of the court.
  b(4.7, 2.8, 7, palette.darkPaint, 53.4, 1.4, 40.5);
  b(5.1, 0.19, 7.5, palette.roof, 53.4, 2.92, 40.5);
  b(0.12, 2.25, 2.35, palette.metal, 50.99, 1.2, 40.5);
  for (let i = 0; i < 12; i++) b(0.04, 2.2, 0.025, palette.darkPaint, 50.9, 1.2, 39.4 + i * 0.2);
  b(0.1, 0.09, 0.34, palette.black, 50.82, 1.25, 39.75);
  for (let i = 0; i < 5; i++) {
    pole(0.21, 0.045, palette.rust, 50.1, 0.03 + i * 0.1, 45.6);
    pole(0.045, 0.55, palette.rust, 50.1, 0.3 + i * 0.1, 45.6);
  }
  for (let i = 0; i < 4; i++) b(2.1, 0.08, 0.06, palette.paint, 52, 0.15 + i * 0.07, 45.8, 0.07);
  // A quiet climbing frame and swings are placed off the main walkways.
  const playX = -41, playZ = 44;
  for (const dx of [-2.4, 2.4]) {
    rod([playX + dx, 0, playZ - 1.8], [playX + dx, 3.8, playZ], 0.06, palette.metal);
    rod([playX + dx, 0, playZ + 1.8], [playX + dx, 3.8, playZ], 0.06, palette.metal);
  }
  rod([playX - 2.5, 3.8, playZ], [playX + 2.5, 3.8, playZ], 0.075, palette.metal);
  const swingSeats = [];
  for (const offset of [-1.2, 1.2]) {
    const group = new THREE.Group(); group.position.set(playX + offset, 3.65, playZ); root.add(group);
    const chainGeo = new THREE.CylinderGeometry(0.012, 0.012, 2.8, 5); geometries.add(chainGeo);
    for (const dx of [-0.32, 0.32]) { const chain = new THREE.Mesh(chainGeo, palette.metal); chain.position.set(dx, -1.4, 0); group.add(chain); }
    const seatGeo = new THREE.BoxGeometry(0.82, 0.09, 0.32); geometries.add(seatGeo);
    const seat = new THREE.Mesh(seatGeo, palette.rubber); seat.position.y = -2.8; group.add(seat); swingSeats.push(group);
  }
  for (const dx of [-1.6, 1.6]) for (const dz of [-1.5, 1.5]) pole(0.06, 2.8, palette.metal, -45 + dx, 1.4, 34 + dz);
  for (let i = 0; i < 7; i++) rod([-46.6, 2.8, 32.5 + i * 0.5], [-43.4, 2.8, 32.5 + i * 0.5], 0.035, palette.metal);

  // The southern gate has a clear pedestrian gap x14..22 and two open chain leaves.
  b(8, 0.11, 24, palette.concrete, 18, 0.015, 73);
  for (const x of [14, 22]) {
    pole(0.095, 2.9, palette.metal, x, 1.45, 65);
    b(0.2, 0.08, 0.2, palette.metal, x, 2.94, 65);
  }
  for (const side of [-1, 1]) {
    const hingeX = side < 0 ? 14 : 22, angle = side < 0 ? -1.1 : 1.1;
    const hinge = new THREE.Vector3(hingeX, 0, 65);
    const end = new THREE.Vector3(side < 0 ? 3.7 : -3.7, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle).add(hinge);
    rod([hinge.x, 0.2, hinge.z], [end.x, 0.2, end.z], 0.035, palette.metal);
    rod([hinge.x, 2.25, hinge.z], [end.x, 2.25, end.z], 0.035, palette.metal);
    rod([end.x, 0.2, end.z], [end.x, 2.25, end.z], 0.035, palette.metal);
    for (let i = 1; i < 10; i++) {
      const t = i / 10, px = THREE.MathUtils.lerp(hinge.x, end.x, t), pz = THREE.MathUtils.lerp(hinge.z, end.z, t);
      rod([px, 0.22, pz], [px, 2.23, pz], 0.009, palette.metal);
    }
  }
  // Boundary hedges keep an inviting-looking street from feeling like an empty plane.
  for (let i = 0; i < 18; i++) {
    const x = -54 + i * 6.3;
    if (x > 10 && x < 27) continue;
    shrub(x, 0.8, 68, 2.7, 1.1, 1.5);
  }
  const roadCanvas = document.createElement('canvas'); roadCanvas.width = roadCanvas.height = 256;
  const roadCtx = roadCanvas.getContext('2d'); roadCtx.fillStyle = '#343a3b'; roadCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 14000; i++) { const light = 32 + Math.floor(Math.random() * 46); roadCtx.fillStyle = `rgb(${light},${light + 4},${light + 4})`; roadCtx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1); }
  const roadMap = new THREE.CanvasTexture(roadCanvas); roadMap.colorSpace = THREE.SRGBColorSpace; roadMap.wrapS = roadMap.wrapT = THREE.RepeatWrapping; roadMap.repeat.set(16, 2); textures.add(roadMap);
  const asphalt = material('#879293', { map: roadMap, roughness: 0.88 });
  b(180, 0.12, 14, asphalt, 0, -0.015, 89);
  b(180, 0.18, 4.4, palette.concrete, 0, 0.09, 79.75);
  b(180, 0.23, 0.3, palette.paint, 0, 0.1, 82.05);
  b(180, 0.23, 0.3, palette.paint, 0, 0.1, 96.05);
  b(180, 0.16, 4.8, palette.concrete, 0, 0.03, 98.5);
  for (let i = -8; i < 9; i++) if (Math.abs(i * 9 - 18) > 5) b(3.2, 0.015, 0.09, palette.line, i * 9, 0.06, 89);
  for (let i = 0; i < 10; i++) b(3.4, 0.018, 0.7, palette.line, 18, 0.065, 83.2 + i * 1.28);
  for (const x of [13.3, 22.7]) {
    pole(0.055, 2.4, palette.metal, x, 1.2, 81.2);
    for (let band = 0; band < 7; band++) pole(0.058, 0.15, band % 2 ? palette.line : palette.black, x, 0.45 + band * 0.26, 81.2);
  }
  pole(0.045, 3.35, palette.metal, 8.2, 1.67, 79);
  // Street lamps do not cast extra shadow maps; their small pools distinguish the exit.
  const lamps = [];
  for (const [x, z] of [[1, 79], [39, 98]]) {
    pole(0.085, 7.1, palette.metal, x, 3.55, z);
    rod([x, 7, z], [x + 1.8, 7, z], 0.055, palette.metal);
    const lampMat = material('#b4b9a6', { emissive: '#c7d5ba', emissiveIntensity: 1.2 });
    b(0.9, 0.16, 0.36, lampMat, x + 1.8, 7, z);
    const light = new THREE.PointLight('#c6d9c5', 37, 20, 2); light.position.set(x + 1.8, 6.8, z); root.add(light); lamps.push(light);
  }
  // Utility poles, sagging cables, suburban rooflines and garden walls beyond the road.
  const cablePositions = [];
  for (const x of [-55, -10, 35, 80]) {
    pole(0.16, 10.5, palette.wood, x, 5.25, 102);
    b(2.1, 0.1, 0.12, palette.wood, x, 9.6, 102);
    for (const offset of [-0.8, 0, 0.8]) pole(0.08, 0.2, palette.tile, x + offset, 9.8, 102);
    if (x === 80) continue;
    for (const offset of [-0.8, 0, 0.8]) for (let i = 0; i < 12; i++) {
      const a = i / 12, c = (i + 1) / 12;
      cablePositions.push(x + offset + a * 45, 9.9 - Math.sin(a * Math.PI) * 1.25, 102, x + offset + c * 45, 9.9 - Math.sin(c * Math.PI) * 1.25, 102);
    }
  }
  const cableGeometry = new THREE.BufferGeometry(); cableGeometry.setAttribute('position', new THREE.Float32BufferAttribute(cablePositions, 3)); geometries.add(cableGeometry);
  const cableMaterial = new THREE.LineBasicMaterial({ color: '#202b2c' }); materials.add(cableMaterial);
  root.add(new THREE.LineSegments(cableGeometry, cableMaterial));
  for (let i = 0; i < 7; i++) {
    const x = -67 + i * 21, z = 111 + (i % 2) * 7, width = 12 + (i % 3) * 2, depth = 9;
    b(width, 3.1, depth, i % 2 ? palette.paint : palette.brick, x, 1.55, z);
    const leftRoof = new THREE.Mesh(unitBox, palette.roof); leftRoof.position.set(x, 3.62, z - 2.5); leftRoof.scale.set(width + 1.3, 0.18, 5.8); leftRoof.rotation.x = 0.3; root.add(leftRoof);
    const rightRoof = leftRoof.clone(); rightRoof.position.z = z + 2.5; rightRoof.rotation.x = -0.3; root.add(rightRoof);
    for (const dx of [-width * 0.3, width * 0.3]) {
      b(1.65, 1.25, 0.08, i % 3 ? palette.glass : palette.warmWindow, x + dx, 1.85, z - depth / 2 - 0.04);
      b(1.8, 0.08, 0.14, palette.paint, x + dx, 1.2, z - depth / 2 - 0.12);
    }
    b(1, 2.2, 0.1, palette.darkPaint, x, 1.1, z - depth / 2 - 0.06);
    b(width + 4, 0.9, 0.25, palette.darkPaint, x, 0.45, 103.7);
    pole(0.035, 1.1, palette.metal, x - 3, 0.55, 101.3);
    b(0.35, 0.28, 0.45, palette.metal, x - 3, 1.15, 101.3);
    shrub(x + width / 2 - 0.3, 1.2, 104.5, 1.6, 1.7, 1.2);
  }

  // A distant, irregular escarpment silhouette and translucent cloud band frame the sky.
  const ridge = [], indices = [];
  for (let i = 0; i <= 30; i++) {
    const x = -180 + i * 12, y = 16 + Math.sin(i * 0.44) * 5 + Math.sin(i * 1.31) * 1.7;
    ridge.push(x, -3, -135, x, y, -135);
    if (i < 30) indices.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const ridgeGeo = new THREE.BufferGeometry(); ridgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(ridge, 3)); ridgeGeo.setIndex(indices); ridgeGeo.computeVertexNormals(); geometries.add(ridgeGeo);
  const ridgeMat = new THREE.MeshBasicMaterial({ color: '#101d21', side: THREE.DoubleSide }); materials.add(ridgeMat); root.add(new THREE.Mesh(ridgeGeo, ridgeMat));
  const clouds = document.createElement('canvas'); clouds.width = 512; clouds.height = 128;
  const cc = clouds.getContext('2d');
  for (let i = 0; i < 75; i++) {
    const x = Math.random() * 512, y = 32 + Math.random() * 65, r = 10 + Math.random() * 45, gradient = cc.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(74,94,105,0.12)'); gradient.addColorStop(1, 'rgba(74,94,105,0)'); cc.fillStyle = gradient; cc.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const cloudTexture = new THREE.CanvasTexture(clouds); cloudTexture.wrapS = THREE.RepeatWrapping; textures.add(cloudTexture);
  const cloudMat = new THREE.MeshBasicMaterial({ map: cloudTexture, transparent: true, opacity: 0.38, depthWrite: false, fog: false }); materials.add(cloudMat);
  const cloudGeo = new THREE.PlaneGeometry(340, 65); geometries.add(cloudGeo);
  const cloud = new THREE.Mesh(cloudGeo, cloudMat); cloud.position.set(0, 45, -145); root.add(cloud);

  // A few wind-tossed leaves move near planted areas; one instanced draw, updated at 10 Hz.
  const leafGeo = new THREE.PlaneGeometry(0.14, 0.055); geometries.add(leafGeo);
  const leafMat = material('#8b8862', { side: THREE.DoubleSide });
  const leaves = new THREE.InstancedMesh(leafGeo, leafMat, 40); root.add(leaves);
  const leafSeeds = Array.from({ length: 40 }, (_, i) => ({ x: -12 + (i * 1.67) % 14, z: 21 + (i * 2.37) % 12, phase: i * 2.399 }));
  function updateLeaves(time, still) {
    leafSeeds.forEach((leaf, i) => {
      dummy.position.set(leaf.x + (still ? 0 : Math.sin(time * 0.27 + leaf.phase) * 0.7), 0.09 + (still ? 0 : Math.max(0, Math.sin(time * 0.8 + leaf.phase)) * 0.3), leaf.z + (still ? 0 : Math.cos(time * 0.24 + leaf.phase) * 0.4));
      dummy.rotation.set(-Math.PI / 2 + (still ? 0 : Math.sin(time + leaf.phase) * 0.25), 0, leaf.phase); dummy.scale.setScalar(0.7 + i % 4 * 0.2); dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
    });
    leaves.instanceMatrix.needsUpdate = true;
  }
  updateLeaves(0, true);

  for (const batch of batches.values()) {
    const mesh = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.castShadow = batch.material !== chalk; mesh.receiveShadow = true; root.add(mesh);
  }
  if (labels.length) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d'); const cols = 2, tw = 512, th = 128;
    const vertices = [], uv = [], faceIndices = [];
    labels.forEach((entry, i) => {
      const tx = (i % cols) * tw, ty = Math.floor(i / cols) * th;
      ctx.fillStyle = entry.style === 'notice' ? '#b5b59e' : entry.style === 'road' ? '#c1c3aa' : '#243e46'; ctx.fillRect(tx + 2, ty + 2, tw - 4, th - 4);
      ctx.strokeStyle = '#7b9290'; ctx.lineWidth = 5; ctx.strokeRect(tx + 7, ty + 7, tw - 14, th - 14);
      ctx.fillStyle = entry.style === 'blue' ? '#d2d7c7' : '#233c43'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = 'bold 37px sans-serif'; ctx.fillText(entry.text, tx + tw / 2, ty + (entry.sub ? 48 : 66), 470);
      if (entry.sub) { ctx.font = 'bold 14px sans-serif'; ctx.fillText(entry.sub, tx + tw / 2, ty + 91, 475); }
      const h = entry.width / 4, normal = new THREE.Vector3(Math.sin(entry.rotation), 0, Math.cos(entry.rotation)), center = new THREE.Vector3(entry.x, entry.y, entry.z).addScaledVector(normal, 0.01), side = new THREE.Vector3(Math.cos(entry.rotation), 0, -Math.sin(entry.rotation));
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]], start = vertices.length / 3;
      for (const [sx, sy] of corners) { const p = center.clone().addScaledVector(side, sx * entry.width / 2); p.y += sy * h / 2; vertices.push(p.x, p.y, p.z); }
      uv.push(tx / 1024, 1 - (ty + th) / 1024, (tx + tw) / 1024, 1 - (ty + th) / 1024, (tx + tw) / 1024, 1 - ty / 1024, tx / 1024, 1 - ty / 1024);
      faceIndices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; textures.add(texture);
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geometry.setIndex(faceIndices); geometry.computeVertexNormals(); geometries.add(geometry);
    const mat = material('#ffffff', { map: texture, side: THREE.DoubleSide }); root.add(new THREE.Mesh(geometry, mat));
  }
  let elapsed = 0, leafTick = -1;
  return {
    update(dt, state = {}) {
      elapsed = Number.isFinite(state.time) ? state.time : elapsed + Math.min(Number(dt) || 0, 0.05);
      const still = Boolean(state.reducedMotion);
      swingSeats.forEach((seat, i) => { seat.rotation.x = still ? 0 : Math.sin(elapsed * 0.72 + i * 1.8) * 0.025; });
      if (Math.floor(elapsed * 10) !== leafTick) { leafTick = Math.floor(elapsed * 10); updateLeaves(elapsed, still); }
      cloudTexture.offset.x = still ? 0 : elapsed * 0.0004;
      // A faint street fixture fluctuation is slow and avoids flashes.
      lamps.forEach((lamp, i) => { lamp.intensity = 37 + (still ? 0 : Math.sin(elapsed * 0.25 + i) * 1.5); });
    },
    dispose() {
      scene.remove(root);
      for (const geometry of geometries) geometry.dispose();
      for (const mat of materials) mat.dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
