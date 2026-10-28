import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioDirector} from '../src/audio.js';

function audioHarness(t){
  class Param{constructor(value=0){this.value=value;}setValueAtTime(v){this.value=v;}exponentialRampToValueAtTime(v){this.value=v;}setTargetAtTime(v){this.value=v;}cancelScheduledValues(){}}
  class Context{
    constructor(){this.state='running';this.currentTime=10;this.sampleRate=100;this.sources=[];this.destination={};}
    node(source=false){const context=this,node={gain:new Param(),frequency:new Param(),Q:new Param(),pan:new Param(),playbackRate:new Param(1),threshold:new Param(),knee:new Param(),ratio:new Param(),attack:new Param(),release:new Param(),stopAt:Infinity,
      connect(other){return other;},disconnect(){this.disconnected=true;},start(when=0){this.startAt=when;if(source)context.sources.push(this);},stop(when=context.currentTime){this.stopAt=when;}};return node;}
    createGain(){return this.node();}createDynamicsCompressor(){return this.node();}createStereoPanner(){return this.node();}createBiquadFilter(){return this.node();}createOscillator(){return this.node(true);}createBufferSource(){return this.node(true);}
    createBuffer(_channels,length){const data=new Float32Array(length);return{getChannelData:()=>data};}
    async close(){this.state='closed';}
    async resume(){this.state='running';}
  }
  const previous=globalThis.window;
  globalThis.window={AudioContext:Context,speechSynthesis:{cancel(){},pause(){},resume(){},speaking:false}};
  const audio=new AudioDirector();audio.init();
  t.after(()=>{audio.dispose();globalThis.window=previous;});
  return {audio,ctx:audio.context};
}

test('encounter cues produce audio once and scene ambience does not duplicate the charge',t=>{
  const {audio,ctx}=audioHarness(t),initial=ctx.sources.length;
  audio.setScene('street');assert.equal(ctx.sources.length,initial);
  audio.cue('charge');assert.ok(ctx.sources.length>initial);
  const charged=ctx.sources.length;
  audio.setScene('street');audio.cue('charge');assert.equal(ctx.sources.length,charged);
  ctx.currentTime+=6;audio.cue('charge');assert.ok(ctx.sources.length>charged);
});

test('vanishing cancels queued pursuit and suppresses periodic threat sounds during the sudden silence',t=>{
  const {audio,ctx}=audioHarness(t);
  audio.cue('charge');const pursuit=[...audio.transients].map(group=>group[0]);
  assert.ok(pursuit.some(source=>source.startAt>ctx.currentTime));
  audio.cue('creaturevanish');
  assert.ok(pursuit.every(source=>source.stopAt<=ctx.currentTime));
  const vanished=ctx.sources.length;
  audio.threat=1;audio.nextBreath=0;audio.nextAmbient=0;audio.lastBeat=-100;audio.pulse();
  assert.equal(ctx.sources.length,vanished);
  audio.cue('suddenstop');assert.equal(ctx.sources.length,vanished,'aliases share the vanish cooldown');
});

test('paused and muted audio cancels delayed cues and cannot resume an old attack',t=>{
  const {audio,ctx}=audioHarness(t);audio.cue('footstepsbehind');
  const pursuit=[...audio.transients].map(group=>group[0]);audio.setPaused(true);
  assert.ok(pursuit.every(source=>source.stopAt<=ctx.currentTime));assert.equal(audio.transients.size,0);
  const quiet=ctx.sources.length;
  for(const name of ['gate','charge','grab','struggle','impact','whisper','siren','powercut'])audio.cue(name);
  audio.pulse();assert.equal(ctx.sources.length,quiet);
  audio.setPaused(false);assert.equal(ctx.sources.length,quiet);
  audio.cue('grab');assert.ok(ctx.sources.length>quiet);
  audio.setVolume(0);const muted=ctx.sources.length;assert.equal(audio.transients.size,0);
  audio.cue('impact');audio.cue('charge');audio.pulse();assert.equal(ctx.sources.length,muted);
});

test('gate, struggle, impact, whisper, siren, and power loss have procedural sound without speech or remote assets',t=>{
  const {audio,ctx}=audioHarness(t);
  for(const name of ['gate','struggle','impact','whisper','siren','powercut']){
    const before=ctx.sources.length;audio.cue(name);assert.ok(ctx.sources.length>before,`${name} should be audible`);
  }
  audio.dispose();assert.equal(ctx.state,'closed');assert.equal(audio.context,null);assert.equal(audio.transients.size,0);
});

test('the breaker and restored power are distinct cues and restoration ends the power-cut hush',t=>{
  const {audio,ctx}=audioHarness(t);audio.cue('powercut');
  assert.ok(audio.hushUntil>ctx.currentTime);
  let count=ctx.sources.length;audio.cue('breaker');assert.ok(ctx.sources.length>count);
  count=ctx.sources.length;audio.cue('powerrestore');assert.ok(ctx.sources.length>count);
  assert.ok(audio.hushUntil<=ctx.currentTime);
  const restored=ctx.sources.length;audio.cue('powerrestored');assert.equal(ctx.sources.length,restored,'restoration aliases cannot double up');
  ctx.currentTime+=12;count=ctx.sources.length;audio.cue('lurevoice');assert.ok(ctx.sources.length>count);
  audio.setPaused(true);count=ctx.sources.length;audio.cue('breaker');audio.cue('powerrestore');audio.cue('lurevoice');assert.equal(ctx.sources.length,count);
});
