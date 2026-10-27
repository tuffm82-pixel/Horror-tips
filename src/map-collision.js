// School shells also used by the renderer's movement collision. Keep these
// extents aligned with world.js when location photos change the map layout.
export const SCHOOL_OBSTACLES=Object.freeze([
  {minX:-21,maxX:21,minZ:-26,maxZ:-16},
  {minX:-32.5,maxX:-23.5,minZ:-10.5,maxZ:16.5},
  {minX:25,maxX:35,minZ:-18.5,maxZ:-1.5},
  {minX:-33,maxX:-25,minZ:24,maxZ:36},
  {minX:-2.5,maxX:14.5,minZ:11.775,maxZ:12.225},
]);

/** True when a segment touches a solid rectangle (including its edges). */
export function segmentIntersectsBox(from,to,box){
  let enter=0,exit=1;
  for(const [axis,min,max]of [['x',box.minX,box.maxX],['z',box.minZ,box.maxZ]]){
    const delta=to[axis]-from[axis];
    if(Math.abs(delta)<1e-10){if(from[axis]<min||from[axis]>max)return false;continue;}
    const a=(min-from[axis])/delta,b=(max-from[axis])/delta;
    enter=Math.max(enter,Math.min(a,b));exit=Math.min(exit,Math.max(a,b));
    if(enter>exit)return false;
  }
  return true;
}

export function hasTagLineOfSight(from,to){
  if(![from.x,from.z,to.x,to.z].every(Number.isFinite))return false;
  return !SCHOOL_OBSTACLES.some(box=>segmentIntersectsBox(from,to,box));
}
