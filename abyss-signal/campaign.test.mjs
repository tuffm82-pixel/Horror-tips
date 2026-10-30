import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign} from './campaign.js';
import {STAGES} from './layout.js';
const ORDER=['pump','generator','sample','crew','archive','relay','coolant','uplink','launch','escape'];
function advance(game,count=ORDER.length-1){for(const id of ORDER.slice(game.state.chapter,count))assert.equal(game.interact(id).ok,true,id);}
function tick(game,seconds,movement={}){const events=[];for(let s=0;s<seconds;s++){const event=game.update(1,movement);if(event)events.push(event);}return events;}
test('ten distinct station operations must be completed in order',()=>{
  assert.deepEqual(STAGES.map(stage=>stage.id),ORDER);
  const game=createCampaign();
  assert.equal(game.state.stageCount,10);assert.equal(game.state.remaining,1200);
  for(let index=0;index<ORDER.length-1;index++){
    const id=ORDER[index];assert.equal(game.state.objective.id,id);
    assert.equal(game.interact(ORDER[index+1]).ok,false,'cannot skip ahead');
    const result=game.interact(id);assert.equal(result.ok,true);
    assert.ok(result.message.length>90,'each operation advances the story');
    assert.equal(game.state.checkpoint,index+1);
    assert.equal(game.interact(id).ok,false,'completed operations cannot repeat');
  }
  assert.deepEqual(game.state.inventory,['black-box','crew-keycard','launch-cipher','surface-clearance']);
  assert.equal(game.state.objective.id,'escape');assert.equal(game.state.phase,'playing');
});
test('launch preparation lasts 45 active seconds and cannot be bypassed at the hatch',()=>{
  const game=createCampaign();advance(game);
  assert.equal(game.state.extractionRemaining,45);assert.equal(game.interact('escape').ok,false);
  assert.match(game.interact('escape').message,/45 seconds/);
  const events=tick(game,44);
  assert.equal(game.state.extractionRemaining,1);assert.equal(game.interact('escape').ok,false);
  assert.equal(events.filter(e=>e.event==='extraction-ready').length,0);
  assert.equal(game.update(1).event,'extraction-ready');assert.equal(game.state.extractionRemaining,0);
  assert.equal(game.update(1),null,'boarding announcement fires only once');
  assert.equal(game.interact('escape').event,'ending');assert.equal(game.state.phase,'won');
});
test('pressure timeout ends a run once and cannot produce late launch announcements',()=>{
  const game=createCampaign();tick(game,1200);
  assert.equal(game.state.phase,'dead');assert.equal(game.state.remaining,0);
  const ended=game.snapshot();assert.equal(game.update(1),null);
  assert.equal(game.interact('pump').ok,false);assert.equal(game.die('another death').ok,false);
  assert.deepEqual(game.snapshot(),ended);
  const final=createCampaign(9);final.die('caught during preparation');
  const extraction=final.state.extractionRemaining;tick(final,50);assert.equal(final.state.extractionRemaining,extraction);
});
test('winning freezes every timer, inventory and ending',()=>{
  const game=createCampaign(9);tick(game,45);game.interact('escape');const ended=game.snapshot();
  game.update(1,{running:true});game.die('too late');game.interact('escape');
  assert.deepEqual(game.snapshot(),ended);
});
test('every checkpoint restores completed items and the correct next objective',()=>{
  for(let chapter=0;chapter<ORDER.length;chapter++){
    const played=createCampaign();advance(played,chapter);const restored=createCampaign(chapter);
    assert.equal(restored.state.objective.id,ORDER[chapter]);assert.deepEqual(restored.state.inventory,played.state.inventory);
    assert.equal(restored.state.checkpoint,chapter);assert.equal(restored.state.phase,'playing');assert.ok(restored.state.remaining>=300);
  }
  const game=createCampaign(8),reference=game.state;game.interact('launch');tick(game,30);game.die('caught');game.restart();
  assert.equal(game.state,reference);assert.equal(game.state.objective.id,'escape');assert.equal(game.state.extractionRemaining,45);assert.equal(game.state.elapsed,0);
});
test('archive clue survives checkpoint recovery and remains visible after its spoken line',()=>{
  const game=createCampaign(3);
  const result=game.interact('crew');
  assert.match(result.message,/Seventeen\. Zero nine\./);
  assert.match(game.state.objective.description,/1709/);
  const restored=createCampaign(4);
  assert.match(restored.state.objective.description,/1709/);
  assert.match(restored.state.message,/1709/);
});
test('invalid saves and frame times cannot corrupt either countdown',()=>{
  for(const value of [-1,10,Infinity,'garbage',{},[],null,true,1.5,{valueOf(){throw Error('bad object');}}])assert.equal(createCampaign(value).state.chapter,0);
  const game=createCampaign(9);for(const dt of [NaN,Infinity,-1,undefined,'4'])game.update(dt);
  assert.equal(game.state.extractionRemaining,45);game.update(1200);
  assert.equal(game.state.extractionRemaining,44,'resume cannot skip preparation');assert.equal(game.state.remaining,299);
});
test('atmospheric tension reacts gradually without writing enemy state',()=>{
  const running=createCampaign(4),hiding=createCampaign(4);tick(running,60,{running:true,moving:true});tick(hiding,60,{hidden:true});
  assert.ok(running.state.threat>hiding.state.threat+.2);assert.ok(running.state.threat<1);assert.equal('lastKnown' in running.state,false);
  const snapshot=running.snapshot();snapshot.inventory.push('fake');snapshot.objective.id='escape';
  assert.equal(running.state.inventory.includes('fake'),false);assert.equal(running.state.objective.id,'archive');
});
test('missions and spaced transmissions sustain the narrative without per-frame repetition',()=>{
  const game=createCampaign(),lines=[game.state.message];lines.push(...tick(game,200).map(e=>e.message));
  for(const id of ORDER.slice(0,-1)){lines.push(game.interact(id).message);assert.equal(game.update(.016),null,'no immediate interruption of mission speech');}
  assert.ok(lines.length>=13);assert.equal(new Set(lines).size,lines.length);
  assert.match(lines.join(' '),/MARA VOSS/);assert.match(lines.join(' '),/There is no Doctor Voss/);
});
