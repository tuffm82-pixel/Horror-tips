import test from 'node:test';
import assert from 'node:assert/strict';
import {Vector3} from 'three';
import {createHuman,createCreature,cloneCharacter,characterStats} from '../src/characters.js';
import {applyClip} from '../src/animation.js';

function update(actor){actor.updateMatrixWorld(true);actor.traverse(o=>{if(o.isSkinnedMesh)o.skeleton.update();});}
function vertexFor(mesh,boneName,minWeight=.99){const index=mesh.skeleton.bones.findIndex(b=>b.name===`rig:${boneName}`),ids=mesh.geometry.attributes.skinIndex,w=mesh.geometry.attributes.skinWeight;for(let i=0;i<ids.count;i++)for(let k=0;k<4;k++)if(ids.getComponent(i,k)===index&&w.getComponent(i,k)>minWeight)return i;throw Error(`No weighted vertex for ${boneName}`);}
function point(mesh,index){return mesh.applyBoneTransform(index,new Vector3().fromBufferAttribute(mesh.geometry.attributes.position,index));}

test('continuous character surfaces have normalized valid bone weights and bounded triangle budgets',()=>{
  for(const actor of [createHuman(),createHuman({longHair:true}),createCreature()]){
    const stats=characterStats(actor);assert.equal(stats.bones,12);assert.ok(stats.skinnedMeshes<=10);
    assert.ok(stats.triangles>6000&&stats.triangles<=20000);
    if(actor.userData.kind==='human')assert.ok(stats.triangles>=8000);
    actor.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;const p=mesh.geometry.attributes.position,w=mesh.geometry.attributes.skinWeight,ids=mesh.geometry.attributes.skinIndex;
      assert.equal(w.count,p.count);assert.equal(ids.count,p.count);
      for(let i=0;i<p.count;i++){
        assert.ok([p.getX(i),p.getY(i),p.getZ(i)].every(Number.isFinite));let total=0;
        for(let k=0;k<4;k++){const weight=w.getComponent(i,k),index=ids.getComponent(i,k);assert.ok(weight>=0&&weight<=1);assert.ok(index>=0&&index<mesh.skeleton.bones.length);total+=weight;}
        assert.ok(Math.abs(total-1)<1e-5,`${mesh.name} vertex${i} is normalized`);
      }
    });
  }
});

test('actual skinned elbow and knee deformation moves surface vertices and blends through the joint',()=>{
  const actor=createHuman(),skin=actor.userData.meshes.skin,pants=actor.userData.meshes.pants;
  update(actor);const elbowVertex=vertexFor(skin,'elbowL'),kneeVertex=vertexFor(pants,'kneeL');const beforeArm=point(skin,elbowVertex),beforeLeg=point(pants,kneeVertex);
  actor.userData.rig.joints.elbowL.rotation.x=-1.1;actor.userData.rig.joints.kneeL.rotation.x=.9;update(actor);
  assert.ok(point(skin,elbowVertex).distanceTo(beforeArm)>.08,'bending the elbow deforms the continuous forearm skin');
  assert.ok(point(pants,kneeVertex).distanceTo(beforeLeg)>.08,'bending the knee deforms the trouser surface');
  for(const mesh of [skin,pants]){const w=mesh.geometry.attributes.skinWeight;let mixed=0;for(let i=0;i<w.count;i++)if(w.getX(i)>.05&&w.getX(i)<.95&&w.getY(i)>.05)mixed++;assert.ok(mixed>=12,`${mesh.name} interpolates bones across joint rings`);}
});

test('posed humans and the creature stay finite across the actual run, fall and attack clips',()=>{
  for(const actor of [createHuman({longHair:true}),createCreature()])for(const clip of ['run','fall','grabbed','lunge'])for(const time of [0,.25,.5,.9]){
    applyClip(actor.userData.rig,clip,time);update(actor);
    actor.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;for(let i=0;i<mesh.geometry.attributes.position.count;i+=11){const v=point(mesh,i);assert.ok(v.toArray().every(Number.isFinite));assert.ok(v.length()<9,`${actor.userData.kind} ${clip} deformation remains bounded`);}});
  }
});

test('avatars share geometry but isolate skin materials and cloned skeletons',()=>{
  const original=createHuman(),other=createHuman();assert.equal(original.userData.meshes.skin.geometry,other.userData.meshes.skin.geometry);assert.notEqual(original.userData.meshes.skin.material,other.userData.meshes.skin.material);
  original.userData.meshes.skin.material.opacity=.2;assert.equal(other.userData.meshes.skin.material.opacity,1);
  const copy=cloneCharacter(original),a=original.userData.meshes.skin,b=copy.userData.meshes.skin;
  assert.notEqual(a.skeleton,b.skeleton);assert.notEqual(a.skeleton.bones[5],b.skeleton.bones[5]);assert.notEqual(a.material,b.material);
  update(original);update(copy);const index=vertexFor(b,'elbowL'),sourcePoint=point(a,index);copy.userData.rig.joints.elbowL.rotation.x=-1;update(copy);
  assert.ok(point(b,index).distanceTo(sourcePoint)>.08);assert.ok(point(a,index).distanceTo(sourcePoint)<1e-6,'remote bone posing must not change the source avatar');
});
