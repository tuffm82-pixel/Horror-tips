import test from 'node:test';
import assert from 'node:assert/strict';
import {perceive} from './perception.js';
import {canSeeBetween} from './world.js';
test('a wall blocks visual pursuit even during a chase or final stage',()=>{
 const e={x:0,z:0,alert:9,seenHiding:false},p={x:0,z:-7,running:true,hidden:false};
 assert.equal(perceive(e,p,{yaw:0,clear:false,noiseFresh:true}).visible,false);
 assert.equal(perceive(e,p,{yaw:0,clear:false,noiseFresh:true}).target,null);
 assert.equal(perceive(e,p,{yaw:0,clear:true}).visible,true);
});
test('the creature has a forward view cone and hidden players are concealed',()=>{
 const e={x:0,z:0},p={x:0,z:6};assert.equal(perceive(e,p,{clear:true}).visible,false);
 assert.equal(perceive(e,{...p,z:-6,hidden:true},{clear:true}).visible,false);
 assert.equal(perceive({...e,seenHiding:true},{...p,z:-6,hidden:true},{clear:true}).visible,true);
});
test('noise is an event and only provides a coarse investigation point',()=>{
 const e={x:0,z:0},p={x:1.3,z:1.1,running:true};
 assert.equal(perceive(e,p,{clear:false,noiseFresh:false}).heard,false);
 const heard=perceive(e,p,{clear:false,noiseFresh:true});assert.equal(heard.heard,true);assert.deepEqual(heard.target,{x:2,z:2});
});
test('actual station walls block room-to-room views but open doorways permit sight',()=>{
 assert.equal(canSeeBetween({x:0,z:-8},{x:-10,z:-8}),true);
 assert.equal(canSeeBetween({x:0,z:-15},{x:-10,z:-8}),false);
 assert.equal(canSeeBetween({x:-18,z:-61},{x:-18,z:-85}),false);
 assert.equal(canSeeBetween({x:0,z:-49},{x:15,z:-49}),true);
 assert.equal(canSeeBetween({x:15,z:-49},{x:15,z:-73}),false);
});
