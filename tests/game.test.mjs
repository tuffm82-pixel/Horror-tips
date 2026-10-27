import test from 'node:test';import assert from 'node:assert/strict';
import {ringSuccess,balanceStep,nextPlaces,story,navigationHint,explorationGoals} from '../src/game.js';
test('ring allows a bounded timing window',()=>{assert.equal(ringSuccess(54),true);assert.equal(ringSuccess(67),true);assert.equal(ringSuccess(68),false);assert.equal(ringSuccess(20),false);});
test('balance responds to hold and clamps',()=>{assert.ok(balanceStep(.5,true,1)>.5);assert.ok(balanceStep(.5,false,1)<.5);assert.equal(balanceStep(.9,true,5),1);assert.equal(balanceStep(.1,false,5),0);});
test('routes never offer visited locations or second bathroom',()=>assert.deepEqual(nextPlaces(['bathroom','bottom']),['top','blue']));
test('story preserves invitation, rule and final line',()=>{assert.match(story.intro[0][1],/play tips/);assert.match(story.sonny[2][1],/bathroom while being chased/);assert.equal(story.ending.at(-1)[1],'Good game.');});
test('spinner selects a separate player who transforms while the spinner stays human',()=>{
  assert.ok(story.spin.some(([speaker])=>speaker==='THE SELECTED PLAYER'));
  assert.match(story.transform[0][1],/selected player/);
  assert.match(story.transform[0][1],/spinner steps away, still human/);
});
test('navigation compass points forward, behind, and sideways relative to camera yaw',()=>{
  const forward=navigationHint({x:0,z:0,yaw:0},{x:0,z:-10});assert.equal(forward.distance,10);assert.ok(Math.abs(forward.angle)<1e-10);
  assert.ok(Math.abs(Math.abs(navigationHint({x:0,z:0,yaw:0},{x:0,z:10}).angle)-Math.PI)<1e-10);
  assert.ok(navigationHint({x:0,z:0,yaw:0},{x:-10,z:0}).angle>0);
  assert.ok(navigationHint({x:0,z:0,yaw:0},{x:10,z:0}).angle<0);
  assert.ok(Math.abs(navigationHint({x:0,z:0,yaw:Math.PI/2},{x:-10,z:0}).angle)<1e-10);
  assert.equal(navigationHint(explorationGoals.gate.target,explorationGoals.gate.target).distance,0);
});
test('exploration additions do not leak into the original branching route choices',()=>{
  assert.deepEqual(nextPlaces([]),['bottom','top','blue']);
  assert.deepEqual(nextPlaces(['bathroom','bottom','top']),['blue']);
  assert.equal(explorationGoals.escape.next,'ending');assert.equal(explorationGoals.escape.seconds,24);
});
