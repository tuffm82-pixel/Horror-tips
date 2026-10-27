// Substeps preserve walking speed on slow frames without tunnelling through walls.
export function integrateMovement(position,direction,speed,seconds,bounds,blocked){
 const dt=Math.max(0,Math.min(1,Number(seconds)||0)),steps=Math.max(1,Math.ceil(dt/.025)),step=dt/steps;
 let x=position.x,z=position.z;
 for(let i=0;i<steps;i++){
  const nx=Math.max(bounds.minX,Math.min(bounds.maxX,x+direction.x*speed*step));
  const nz=Math.max(bounds.minZ,Math.min(bounds.maxZ,z+direction.z*speed*step));
  if(!blocked(nx,z))x=nx;
  if(!blocked(x,nz))z=nz;
 }
 return {x,z};
}
