import test from 'node:test';import assert from 'node:assert/strict';
import {integrateMovement} from '../src/movement.js';
import {planRoute,routeLength,travelBudget,distanceToSegment} from '../src/routing.js';
import {SCHOOL_OBSTACLES,segmentIntersectsBox} from '../src/map-collision.js';
import {routeWalks,explorationGoals} from '../src/game.js';
const bounds={minX:-58,maxX:58,minZ:-58,maxZ:95};
test('free exploration covers the same distance at 60fps and 5fps',()=>{
 const move=n=>{let p={x:18,z:60};for(let i=0;i<n;i++)p=integrateMovement(p,{x:0,z:1},7,1/n,bounds,()=>false);return p;};
 assert.ok(Math.abs(move(60).z-67)<1e-9);assert.ok(Math.abs(move(5).z-move(60).z)<1e-9);
});
test('long frames cannot tunnel through a thin wall and still slide alongside it',()=>{
 const blocked=(x,z)=>x>1&&x<1.45&&z>-5&&z<5;
 const p=integrateMovement({x:0,z:0},{x:Math.SQRT1_2,z:Math.SQRT1_2},7,1,bounds,blocked);
 assert.ok(p.x<=1);assert.ok(p.z>4);
});

test('navigation paths between every campaign destination avoid solid walls with player clearance',()=>{
 const points=[{name:'courtyard',x:0,z:5},...Object.entries(routeWalks).map(([name,route])=>({name,...route.target})),...Object.entries(explorationGoals).map(([name,goal])=>({name,...goal.target}))];
 const playerBoxes=SCHOOL_OBSTACLES.map(b=>({minX:b.minX-.28,maxX:b.maxX+.28,minZ:b.minZ-.28,maxZ:b.maxZ+.28}));
 for(const from of points)for(const to of points){
  const path=planRoute(from,to);assert.ok(path.length>0);
  assert.deepEqual(path.at(-1),{x:to.x,z:to.z});
  let previous=from;
  for(const point of path){
   assert.ok(!playerBoxes.some(box=>segmentIntersectsBox(previous,point,box)),`${from.name}→${to.name} path must not cross a wall`);
   previous=point;
  }
  const length=routeLength(from,path),budget=travelBudget(20,length);
  assert.ok(length>=Math.hypot(to.x-from.x,to.z-from.z)-1e-7);
  assert.ok(budget>=20);assert.ok(budget>=length/7+3,'sprint travel leaves time to turn at the corners');
 }
});

test('real movement can follow safe corners around the blue wall and classroom at low frame rates',()=>{
 const blocked=(x,z)=>SCHOOL_OBSTACLES.some(box=>{
  const nx=Math.max(box.minX,Math.min(box.maxX,x)),nz=Math.max(box.minZ,Math.min(box.maxZ,z));
  return (x-nx)**2+(z-nz)**2<.28**2;
 });
 const points={courtyard:{x:0,z:5},...Object.fromEntries(Object.entries(routeWalks).map(([name,route])=>[name,route.target])),office:explorationGoals.office.target,power:explorationGoals.power.target};
 for(const [start,end]of [['courtyard','top'],['bottom','top'],['bathroom','blue'],['office','power']]){
  let pose={...points[start]};const path=planRoute(pose,points[end]);
  for(const waypoint of path){
   for(let step=0;step<1000&&Math.hypot(waypoint.x-pose.x,waypoint.z-pose.z)>.01;step++){
    const distance=Math.hypot(waypoint.x-pose.x,waypoint.z-pose.z),direction={x:(waypoint.x-pose.x)/distance,z:(waypoint.z-pose.z)/distance};
    pose=integrateMovement(pose,direction,Math.min(7,distance/.2),.2,bounds,blocked);
   }
   assert.ok(Math.hypot(waypoint.x-pose.x,waypoint.z-pose.z)<.02,`${start}→${end} cannot become stuck at a route corner`);
  }
  assert.ok(Math.hypot(points[end].x-pose.x,points[end].z-pose.z)<.02);
 }
});

test('a player next to a classroom still receives a safe route around it',()=>{
 const start={x:-21.3,z:-20},target=routeWalks.bottom.target;
 const playerBoxes=SCHOOL_OBSTACLES.map(b=>({minX:b.minX-.28,maxX:b.maxX+.28,minZ:b.minZ-.28,maxZ:b.maxZ+.28}));
 assert.ok(!playerBoxes.some(b=>start.x>=b.minX&&start.x<=b.maxX&&start.z>=b.minZ&&start.z<=b.maxZ),'the starting pose is physically accessible');
 const path=planRoute(start,target);let previous=start;
 for(const point of path){assert.ok(!playerBoxes.some(box=>segmentIntersectsBox(previous,point,box)),'the compass must not suggest walking through a classroom');previous=point;}
 assert.deepEqual(path.at(-1),target);
});

test('swept arrival detects zones crossed during a slow frame rather than only checking endpoints',()=>{
 const target=routeWalks.bathroom.target,start={x:target.x,z:target.z-3.5};
 const end=integrateMovement(start,{x:0,z:1},7,1,bounds,()=>false);
 assert.ok(Math.hypot(start.x-target.x,start.z-target.z)>routeWalks.bathroom.radius);
 assert.ok(Math.hypot(end.x-target.x,end.z-target.z)>routeWalks.bathroom.radius);
 assert.equal(distanceToSegment(target,start,end),0);
 assert.equal(distanceToSegment({x:0,z:3},{x:-4,z:0},{x:4,z:0}),3);
 assert.ok(Math.abs(distanceToSegment({x:5,z:2},{x:0,z:0},{x:2,z:0})-Math.sqrt(13))<1e-10,'projection clamps to the segment endpoint');
 assert.equal(distanceToSegment({x:3,z:4},{x:0,z:0},{x:0,z:0}),5,'a stationary frame remains finite');
});
