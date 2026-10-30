import test from 'node:test';
import assert from 'node:assert/strict';
import {nextWaypoint} from './navigation.js';
import {isWalkable} from './world.js';
import {STATIONS,checkpointSpawn} from './layout.js';
test('pursuit enters and leaves each doorway without oscillating at the wall',()=>{
 const points=[{x:0,z:3},{x:-10,z:-8},{x:10,z:-20},{x:-10,z:-32},{x:0,z:-40},{x:-9,z:-10}];
 for(const start of points)for(const target of points){
  const from={...start};let frames=0;
  while(Math.hypot(from.x-target.x,from.z-target.z)>1.1&&frames++<6000){const p=nextWaypoint(from,target),dx=p.x-from.x,dz=p.z-from.z,d=Math.hypot(dx,dz);if(d>.06){const step=Math.min(d,2.25/60),x=from.x+dx/d*step,z=from.z+dz/d*step;if(isWalkable(x,from.z))from.x=x;if(isWalkable(from.x,z))from.z=z;}}
  assert(frames<6000,`pursuit stalled ${JSON.stringify(start)} -> ${JSON.stringify(target)} at ${JSON.stringify(from)}`);
 }
});
test('every new objective and checkpoint is reachable along the longer campaign route',()=>{
 let from={x:0,z:4};
 for(let stage=0;stage<STATIONS.length;stage++){
  const target=checkpointSpawn(stage+1);assert(isWalkable(target.x,target.z),`checkpoint ${stage+1} is blocked`);let frames=0;
  while(Math.hypot(from.x-target.x,from.z-target.z)>1.1&&frames++<7000){const p=nextWaypoint(from,target),dx=p.x-from.x,dz=p.z-from.z,d=Math.hypot(dx,dz);if(d>.06){const step=Math.min(d,2.3/60),x=from.x+dx/d*step,z=from.z+dz/d*step;if(isWalkable(x,from.z))from.x=x;if(isWalkable(from.x,z))from.z=z;}}
  assert(frames<7000,`expanded route stalled at ${STATIONS[stage].id}`);
 }
});

