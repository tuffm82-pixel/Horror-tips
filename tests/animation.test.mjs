import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {clips,sampleClip,bindRig,applyClip} from '../src/animation.js';

test('named animation clips remain finite and physically bounded when sampled at 24fps',()=>{
  for(const [name,clip]of Object.entries(clips)){
    assert.ok(clip.duration>0);
    for(let frame=0;frame<=Math.ceil(clip.duration*24);frame++){
      const pose=sampleClip(name,frame/(clip.duration*24));
      for(const [track,value]of Object.entries(pose)){
        assert.ok(Number.isFinite(value),`${name} ${track} frame${frame} must remain finite`);
        assert.ok(Math.abs(value)<=Math.PI,`${name} ${track} cannot rotate beyond the anatomical range`);
        if(track.includes('knee'))assert.ok(value>=0,`${name} knees cannot bend backwards`);
      }
    }
  }
});

test('walking and struggling loops cross their cycle boundary without a pose snap',()=>{
  for(const [name,clip]of Object.entries(clips).filter(([,clip])=>clip.loop)){
    const before=sampleClip(name,1-1e-5),after=sampleClip(name,1e-5);
    for(const track of new Set([...Object.keys(before),...Object.keys(after)]))assert.ok(Math.abs((before[track]||0)-(after[track]||0))<.001,`${name} ${track} is continuous`);
    assert.deepEqual(sampleClip(name,0),sampleClip(name,1));
    assert.deepEqual(sampleClip(name,.25),sampleClip(name,1.25));
  }
});

test('fall and lunge settle in their final poses and invalid clip time cannot corrupt transforms',()=>{
  for(const name of ['fall','lunge','point','recoil']){
    assert.deepEqual(sampleClip(name,-2),sampleClip(name,0));
    assert.deepEqual(sampleClip(name,20),sampleClip(name,1));
    assert.deepEqual(sampleClip(name,NaN),sampleClip(name,0));
  }
  assert.ok(sampleClip('fall',1)['body.height']<sampleClip('fall',0)['body.height']);
  assert.ok(sampleClip('lunge',1)['jaw.x']>0);
});

test('actual Three.js rigs animate elbows and knees independently and restore rest height',()=>{
  const root=new Group();root.position.set(12,0,-8);
  const body=new Group();body.name='rig:body';body.position.y=1;root.add(body);
  const joints={};
  for(const name of ['shoulderL','elbowL','hipL','kneeL','neck','jaw']){const joint=new Group();joint.name=`rig:${name}`;body.add(joint);joints[name]=joint;}
  const rig=bindRig(root);
  applyClip(rig,'run',0);
  assert.notEqual(joints.shoulderL.rotation.x,joints.elbowL.rotation.x);
  assert.notEqual(joints.hipL.rotation.x,joints.kneeL.rotation.x);
  const previousKnee=joints.kneeL.rotation.x,previousElbow=joints.elbowL.rotation.x;
  applyClip(rig,'run',clips.run.duration*.25);
  assert.notEqual(joints.kneeL.rotation.x,previousKnee);
  assert.notEqual(joints.elbowL.rotation.x,previousElbow);
  applyClip(rig,'fall',clips.fall.duration);
  assert.ok(body.position.y<rig.rest.body.y);
  applyClip(rig,'idle',0,0);
  assert.equal(body.position.y,rig.rest.body.y);
  assert.equal(joints.elbowL.rotation.x,0);
  assert.deepEqual(root.position.toArray(),[12,0,-8],'local posing must preserve actor placement');
});
