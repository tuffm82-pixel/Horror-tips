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
  const world={setLocation(){},setScene(){},setQuality(){},resize(){},setRemotePlayers(){},setPose(){},getPose(){return{x:0,z:0,yaw:0};},update(){}};
  const document={body,documentElement:{style:{setProperty(){}}},activeElement:{tagName:'BODY'},pointerLockElement:null,
    querySelector(selector){return selector==='#app'?app:selector==='#world'?canvas:selector==='#subtitle'?subtitle:null;}};
  const context=vm.createContext({...gameLogic,window,document,speechSynthesis:speech,
    SpeechSynthesisUtterance:class{constructor(text){this.text=text;}},createWorld:()=>world,
    Multiplayer:class{},performance:{now:()=>0},requestAnimationFrame(){},setTimeout,clearTimeout,
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)},console});
  const audioSource=readFileSync(new URL('../src/audio.js',import.meta.url),'utf8').replace('export class AudioDirector','class AudioDirector');
  const mainSource=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
  vm.runInContext(`${audioSource}\n${mainSource}`,context,{filename:'game-controller.js'});
  return {app,speech,spoken,storage,run:code=>vm.runInContext(code,context),
    async click(action){const button={dataset:{action}};await listeners.get('app:click')({preventDefault(){},target:{closest:()=>button}});},
    key(code){listeners.get('window:keydown')({code,repeat:false,preventDefault(){}});}};
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
