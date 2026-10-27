import test from 'node:test';import assert from 'node:assert/strict';
import {integrateMovement} from '../src/movement.js';
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
