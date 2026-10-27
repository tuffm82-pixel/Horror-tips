import test from 'node:test';import assert from 'node:assert/strict';
import {ringSuccess,balanceStep,nextPlaces,story} from '../src/game.js';
test('ring allows a bounded timing window',()=>{assert.equal(ringSuccess(54),true);assert.equal(ringSuccess(67),true);assert.equal(ringSuccess(68),false);assert.equal(ringSuccess(20),false);});
test('balance responds to hold and clamps',()=>{assert.ok(balanceStep(.5,true,1)>.5);assert.ok(balanceStep(.5,false,1)<.5);assert.equal(balanceStep(.9,true,5),1);assert.equal(balanceStep(.1,false,5),0);});
test('routes never offer visited locations or second bathroom',()=>assert.deepEqual(nextPlaces(['bathroom','bottom']),['top','blue']));
test('story preserves invitation, rule and final line',()=>{assert.match(story.intro[0][1],/play tips/);assert.match(story.sonny[2][1],/bathroom while being chased/);assert.equal(story.ending[0][1],'Good game.');});
