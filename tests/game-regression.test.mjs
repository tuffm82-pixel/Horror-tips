import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import * as gameLogic from '../src/game.js';
import * as routing from '../src/routing.js';
import {integrateMovement} from '../src/movement.js';
import {SCHOOL_OBSTACLES} from '../src/map-collision.js';

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
  const starts={courtyard:[0,5],bathroom:[-20,29],bottom:[41,58],top:[-24,-36],blue:[5,8],gate:[18,60],outside:[18,74],street:[18,85],office:[-18,-10],canteen:[-9,-13]};
  const blocked=(x,z)=>SCHOOL_OBSTACLES.some(b=>{const nx=Math.max(b.minX,Math.min(b.maxX,x)),nz=Math.max(b.minZ,Math.min(b.maxZ,z));return(x-nx)**2+(z-nz)**2<.28**2;});
  const world={pose:{x:0,z:0,yaw:0},lastState:null,locations:[],
    setLocation(name){this.locations.push(name);const [x,z]=starts[name]||starts.courtyard;this.pose={x,z,yaw:0};},setScene(){},setQuality(){},resize(){},setRemotePlayers(){},
    setPose(pose){this.pose={...this.pose,...pose};},getPose(){return{...this.pose};},
    update(dt,state){
      this.lastState=structuredClone(state);if(state.look)this.pose.yaw+=(state.look.x||0)*dt;
      const input=state.playerInput||{},x=(input.right?1:0)-(input.left?1:0),z=(input.back?1:0)-(input.forward?1:0),length=Math.hypot(x,z);
      if(state.moving&&length){const yaw=this.pose.yaw,direction={x:(x*Math.cos(yaw)+z*Math.sin(yaw))/length,z:(z*Math.cos(yaw)-x*Math.sin(yaw))/length};
        const moved=integrateMovement(this.pose,direction,input.sprint?7:3.8,state.realDelta??dt,{minX:-58,maxX:58,minZ:-58,maxZ:state.exploring?95:61},blocked);Object.assign(this.pose,moved);}
      this.lastIntegratedPose={...this.pose};
    }};
  const document={body,documentElement:{style:{setProperty(){}}},activeElement:{tagName:'BODY'},pointerLockElement:null,
    querySelector(selector){return selector==='#app'?app:selector==='#world'?canvas:selector==='#subtitle'?subtitle:null;}};
  const context=vm.createContext({...gameLogic,...routing,window,document,speechSynthesis:speech,
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

function walkObjective(game){
  const id=game.run('objective?.id');game.key('KeyW');game.key('ShiftLeft');
  for(let frame=0;frame<1000&&game.run('objective?.id')===id;frame++){
    const point=game.run('objective.waypoints[objective.waypointIndex]||objective.target'),pose=game.world.getPose();
    game.setPose({yaw:Math.atan2(-(point.x-pose.x),-(point.z-pose.z))});game.frame(.05);
  }
  game.keyUp('KeyW');game.keyUp('ShiftLeft');
  assert.notEqual(game.run('scene'),'caught',`${id} must be physically reachable within its allotted time`);
  assert.notEqual(game.run('objective?.id'),id,`${id} must finish by walking to its destination`);
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
  await game.click('go-blue');walkObjective(game);await finishStory(game,'blue');
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

test('the office blackout requires the canteen breaker and a return before the chalk can be taken',async()=>{
  const game=loadGame();game.run("mode='campaign';location('office');runStory('office');");
  await finishStory(game,'office');assert.equal(game.run('storyKey'),'blackout');assert.equal(game.run('officeReady'),false);
  await finishStory(game,'blackout');assert.equal(game.run('objective.id'),'power');assert.equal(game.run('countdown'),22);
  assert.doesNotMatch(game.app.innerHTML,/data-action="take-chalk"/);
  walkObjective(game);assert.equal(game.run('storyKey'),'canteen');
  await finishStory(game,'canteen');assert.equal(game.run('breakerReady'),true);
  assert.match(game.app.innerHTML,/data-action="reset-breaker"/);
  await game.click('reset-breaker');assert.equal(game.run('powerRestored'),true);assert.equal(game.run('breakerReady'),false);
  assert.equal(game.run('objective.id'),'chalk');assert.equal(game.run('countdown'),18);
  walkObjective(game);assert.equal(game.run('storyKey'),'restored');
  await finishStory(game,'restored');assert.equal(game.run('officeReady'),true);
  assert.match(game.app.innerHTML,/data-action="take-chalk"/);
  await game.click('take-chalk');assert.equal(game.run('objective.id'),'escape');assert.equal(game.run('countdown'),24);
  assert.equal(game.run('officeReady'),false);assert.equal(game.run('chalkTaken'),true);
  walkObjective(game);
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

test('each hiding choice preserves the camera and starts narration only after walking to the chosen place',async()=>{
  for(const route of ['bathroom','bottom','top','blue']){
    const game=loadGame();game.run("mode='campaign';countdown=20;choose(true);");
    const pose=game.world.getPose(),locations=game.world.locations.length;
    await game.click(`go-${route}`);
    assert.deepEqual(game.world.getPose(),pose,`${route} must not teleport the player when chosen`);
    assert.equal(game.world.locations.length,locations);
    assert.equal(game.run('currentLocation'),'courtyard');assert.equal(game.run('storyKey'),'');
    assert.equal(game.run('objective.route'),route);assert.equal(game.run('visited.length'),0);
    assert.ok(game.run('countdown')>=gameLogic.routeWalks[route].seconds);
    game.frame(.5);
    assert.deepEqual(game.world.getPose(),pose,'waiting without movement cannot arrive');
    assert.equal(game.run('storyKey'),'');assert.equal(game.run('visited.length'),0);
    walkObjective(game);
    assert.equal(game.run('storyKey'),route);assert.equal(game.run('visited.length'),1);
    assert.equal(game.run('visited[0]'),route);assert.equal(game.run('currentLocation'),route);
  }
});

test('travel timeout retries the chosen route from its original camera pose with its full budget',async()=>{
  const game=loadGame();game.run("mode='campaign';choose(true);");
  const original={x:-1,z:3,yaw:.4};game.setPose(original);await game.click('go-top');
  const budget=game.run('countdown');game.setPose({x:-12,z:-9,yaw:1.1});game.run('countdown=.05;');
  game.frame(.1);assert.equal(game.run('scene'),'caught');assert.equal(game.run('visited.length'),0);
  await game.click('retry');
  assert.deepEqual(game.world.getPose(),original);assert.equal(game.run('objective.route'),'top');
  assert.equal(game.run('countdown'),budget);assert.equal(game.run('storyKey'),'');
  assert.equal(game.run('visited.length'),0);
});

test('resuming a selected walking route restores the current pose and timer while keeping its original retry origin',async()=>{
  const game=loadGame();game.run("mode='campaign';location('bottom');visited=['bottom'];chapter=6;choose(false,false);");
  const original=game.world.getPose();await game.click('go-top');const budget=game.run('countdown');
  const midway={x:20,z:15,yaw:.7};game.setPose(midway);game.run(`countdown=${budget-4};`);
  await game.click('pause');game.frame(1);assert.equal(game.run('countdown'),budget-4);
  await game.click('menu');await game.click('continue');
  assert.deepEqual(game.world.getPose(),midway);assert.equal(game.run('objective.route'),'top');
  assert.equal(game.run('countdown'),budget-4);assert.equal(game.run('objective.seconds'),budget);
  assert.equal(game.run('chapter'),6);assert.equal(game.run('visited.join(",")'),'bottom');
  assert.deepEqual(JSON.parse(game.run('JSON.stringify(objective.startPose)')),original);
});

test('letting the choice timer expire does not automatically choose the blue wall and can retry choices',async()=>{
  const game=loadGame();game.run("mode='campaign';countdown=.05;choose(true);");const chapter=game.run('chapter');
  game.frame(.1);assert.equal(game.run('scene'),'caught');assert.equal(game.run('objective'),null);
  assert.equal(game.run('visited.length'),0);assert.equal(game.run('storyKey'),'');
  await game.click('retry');assert.equal(game.run('scene'),'choose');assert.equal(game.run('countdown'),20);
  assert.equal(game.run('chapter'),chapter);assert.match(game.app.innerHTML,/data-action="go-blue"/);
});

test('breaker interaction and restored power survive campaign checkpoints',async()=>{
  const game=loadGame();game.run("mode='campaign';location('canteen');runStory('canteen');");
  await finishStory(game,'canteen');await game.click('menu');await game.click('continue');
  assert.equal(game.run('breakerReady'),true);assert.match(game.app.innerHTML,/data-action="reset-breaker"/);
  await game.click('reset-breaker');assert.equal(game.run('powerRestored'),true);assert.equal(game.run('chalkTaken'),false);
  const pose={x:-11,z:-12,yaw:.8};game.setPose(pose);game.run('countdown=12.5;');
  await game.click('menu');await game.click('continue');
  assert.equal(game.run('objective.id'),'chalk');assert.equal(game.run('powerRestored'),true);
  assert.equal(game.run('countdown'),12.5);assert.deepEqual(game.world.getPose(),pose);
  walkObjective(game);await finishStory(game,'restored');await game.click('take-chalk');
  assert.equal(game.run('chalkTaken'),true);
  await game.click('menu');await game.click('continue');
  assert.equal(game.run('objective.id'),'escape');assert.equal(game.run('powerRestored'),true);assert.equal(game.run('chalkTaken'),true);
});

test('a slow sprint frame crossing the chosen hiding zone arrives even when both frame endpoints are outside it',async()=>{
  const game=loadGame();game.run("mode='campaign';choose(true);");
  const target=gameLogic.routeWalks.bathroom.target,radius=gameLogic.routeWalks.bathroom.radius;
  const before={x:target.x,z:target.z-3.5,yaw:Math.PI};game.setPose(before);
  await game.click('go-bathroom');assert.equal(game.run('storyKey'),'');
  assert.ok(Math.hypot(before.x-target.x,before.z-target.z)>radius);
  game.key('KeyW');game.key('ShiftLeft');game.frame(1);
  const after=game.world.lastIntegratedPose;
  assert.ok(Math.hypot(after.x-target.x,after.z-target.z)>radius,'the frame must actually finish beyond the hiding zone');
  assert.ok(after.z>target.z&&before.z<target.z,'movement crosses the whole zone');
  assert.equal(game.run('objective'),null);assert.equal(game.run('storyKey'),'bathroom');
  assert.equal(game.run('visited.join(",")'),'bathroom');
  assert.equal(game.run('currentLocation'),'bathroom');assert.notEqual(game.run('scene'),'caught');
});
