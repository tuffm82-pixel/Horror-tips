import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as gameLogic from '../src/game.js';

// Exercise the real controller and audio code. Only browser DOM, rendering, and
// the speech engine are replaced; campaign transitions are not reimplemented.
function loadGame(){
  const listeners=new Map(),storage=new Map(),spoken=[];
  function element(){return {innerHTML:'',style:{setProperty(){}},dataset:{},classList:{toggle(){},add(){},remove(){}},offsetWidth:0,
    addEventListener(name,fn){listeners.set(`${this===app?'app':this===canvas?'canvas':'other'}:${name}`,fn);},
    insertAdjacentHTML(_position,html){this.innerHTML+=html;},remove(){},setPointerCapture(){}};}
  const app=element(),canvas=element(),subtitle=element(),body=element();
  const speech={paused:false,cancel(){},pause(){this.paused=true;},resume(){this.paused=false;},getVoices(){return[];},speak(line){spoken.push({text:line.text,paused:this.paused});}};
  const window={speechSynthesis:speech,addEventListener(name,fn){listeners.set(`window:${name}`,fn);}};
  const starts={courtyard:[0,5],bathroom:[-20,29],bottom:[41,58],top:[-24,-36],blue:[5,8],gate:[18,58],outside:[18,78],street:[18,84],office:[-18,-10]};
  const world={pose:{x:0,z:0,yaw:0},lastState:null,
    setLocation(name){const [x,z]=starts[name]||starts.courtyard;this.pose={x,z,yaw:0};},setScene(){},setQuality(){},resize(){},setRemotePlayers(){},
    setPose(pose){this.pose={...this.pose,...pose};},getPose(){return{...this.pose};},
    update(_dt,state){this.lastState=structuredClone(state);}};
  const document={body,documentElement:{style:{setProperty(){}}},activeElement:{tagName:'BODY'},pointerLockElement:null,
    querySelector(selector){return selector==='#app'?app:selector==='#world'?canvas:selector==='#subtitle'?subtitle:null;}};
  const context=vm.createContext({...gameLogic,window,document,speechSynthesis:speech,
    SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},createWorld:()=>world,
    Multiplayer:class{},performance:{now:()=>0},requestAnimationFrame(){},setTimeout,clearTimeout,
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},console});
  const audioSource=readFileSync(new URL('../src/audio.js',import.meta.url),'utf8').replace('export class AudioDirector','class AudioDirector');
  const mainSource=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  vm.runInContext(`${audioSource}\n${mainSource}`,context,{filename:'game-controller.js'});
  let clock=0;
  return {app,speech,spoken,storage,world,run:code=>vm.runInContext(code,context),
    frame(seconds=.016){clock+=seconds*1000;vm.runInContext(`frame(${clock})`,context);},
    setPose(pose){world.setPose(pose);},
    async click(action){const button={dataset:{action}};await listeners.get('app:click')({preventDefault(){},target:{closest:()=>button}});},
    key(code){listeners.get('window:keydown')({code,repeat:false,preventDefault(){}});},
    keyUp(code){listeners.get('window:keyup')({code});}};
}

async function finishStory(game,key){
  for(let line=0;line<30&&game.run('storyKey')===key;line++)await game.click('advance');
  assert.notEqual(game.run('storyKey'),key,`${key} must advance to its next campaign state`);
}

test('caught screen retains retry after pause, Settings, and Back',async()=>{
  const game=loadGame();
  game.run("mode='campaign';location('bottom');startChallenge('ring');challenge.fails=2;challenge.radius=100;hitRing();");
  assert.match(game.app.innerHTML,/data-action="retry"/);
  game.key('Escape');await game.click('pause-settings');await game.click('back-settings');
  assert.match(game.app.innerHTML,/data-action="retry"/);
  assert.match(game.app.innerHTML,/Return to menu/);
  await game.click('retry');
  assert.equal(game.run('storyKey'),'bottom');
  assert.equal(game.run('paused'),false);
});

test('continuing a hiding checkpoint preserves remaining time and chapter',async()=>{
  const game=loadGame();
  game.run("mode='campaign';visited=['bathroom'];chapter=2;countdown=13.25;location('bathroom');choose(false,false);pause();");
  await game.click('menu');await game.click('continue');
  assert.equal(game.run('countdown'),13.25);
  assert.equal(game.run('chapter'),2);
  assert.equal(game.run('currentLocation'),'bathroom');
  assert.match(game.app.innerHTML,/Where do you go/);
  assert.doesNotMatch(game.app.innerHTML,/data-action="go-bathroom"/);
});

test('leaving a paused story allows the next campaign narration to speak',async()=>{
  const game=loadGame();
  await game.click('campaign');game.key('Escape');
  assert.equal(game.speech.paused,true);
  await game.click('menu');await game.click('campaign');
  assert.equal(game.speech.paused,false);
  assert.equal(game.spoken.at(-1).paused,false);
  assert.match(game.spoken.at(-1).text,/play tips/);
});

test('Finn leads to a playable gate objective, the street charge, and the return to the office',async()=>{
  const game=loadGame();game.run("mode='campaign';choose(true);");
  await game.click('go-blue');await finishStory(game,'blue');
  assert.equal(game.run('storyKey'),'gate');
  assert.equal(game.storage.get('horror-tips-complete'),undefined,'Finn is no longer an early campaign ending');
  await finishStory(game,'gate');assert.equal(game.run('objective.id'),'gate');
  game.frame();assert.equal(game.world.lastState.exploring,true);assert.equal(game.world.lastState.moving,true);
  game.setPose(gameLogic.explorationGoals.gate.target);game.frame();
  assert.equal(game.run('storyKey'),'street');assert.equal(game.run('objective'),null);
  await finishStory(game,'street');assert.equal(game.run('storyKey'),'vanish');
  await finishStory(game,'vanish');assert.equal(game.run('objective.id'),'office');
  assert.match(game.app.innerHTML,/emergency light at the office/);
  game.setPose(gameLogic.explorationGoals.office.target);game.frame();
  assert.equal(game.run('storyKey'),'office');
});

test('taking the office chalk starts the escape and only reaching the gate completes the campaign',async()=>{
  const game=loadGame();game.run("mode='campaign';location('office');runStory('office');");
  await finishStory(game,'office');assert.equal(game.run('officeReady'),true);
  assert.match(game.app.innerHTML,/data-action="take-chalk"/);
  await game.click('take-chalk');assert.equal(game.run('objective.id'),'escape');assert.equal(game.run('countdown'),24);
  assert.equal(game.run('officeReady'),false);
  game.setPose(gameLogic.explorationGoals.escape.target);game.frame();
  assert.equal(game.run('storyKey'),'ending');assert.equal(game.run('objective'),null);
  assert.equal(game.storage.get('horror-tips-complete'),undefined);
  await finishStory(game,'ending');
  assert.equal(game.run('mode'),'menu');assert.equal(game.storage.get('horror-tips-complete'),'true');
  assert.equal(game.storage.get('horror-tips-save'),'null');
});

test('resuming exploration restores its pose, remaining escape time, and chapter',async()=>{
  const game=loadGame();game.run("mode='campaign';chapter=7;startExplore('escape');countdown=17.25;");
  const pose={x:8,z:43,yaw:.45};game.setPose(pose);
  await game.click('menu');await game.click('continue');
  assert.equal(game.run('objective.id'),'escape');assert.equal(game.run('countdown'),17.25);assert.equal(game.run('chapter'),7);
  assert.deepEqual(game.world.getPose(),pose);
  assert.match(game.app.innerHTML,/Carry the chalk mark/);
});

test('escape timeout enters caught state and retry restores the escape objective and full timer',async()=>{
  const game=loadGame();game.run("mode='campaign';startExplore('escape');countdown=.1;");
  game.frame(.2);assert.equal(game.run('scene'),'caught');assert.equal(game.run('objective'),null);
  assert.match(game.app.innerHTML,/data-action="retry"/);
  await game.click('retry');assert.equal(game.run('objective.id'),'escape');assert.equal(game.run('countdown'),24);
  assert.equal(game.run('scene'),'escape');assert.equal(game.run('paused'),false);
  assert.equal(game.run('storyKey'),'');
});

test('arrow and Q/E turning reaches the renderer during stationary narration and stops on release or pause',async()=>{
  const game=loadGame();await game.click('campaign');
  for(const [key,direction]of [['ArrowLeft',1],['KeyQ',1],['ArrowRight',-1],['KeyE',-1]]){
    game.key(key);game.frame();assert.equal(game.world.lastState.moving,false);
    assert.equal(Math.sign(game.world.lastState.look.x),direction);
    assert.equal(game.world.lastState.lookEnabled,true);
    game.keyUp(key);game.frame();assert.equal(game.world.lastState.look,undefined);
  }
  game.key('Escape');game.key('KeyQ');game.frame();
  assert.equal(game.world.lastState.lookEnabled,false);assert.equal(game.world.lastState.look,undefined);
});
