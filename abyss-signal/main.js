import './style.css';
import './expanded.css';
import * as THREE from 'three';
import {createWorld,isWalkable} from './world.js';
import {createCreature} from './creature.js';
import {createAudio} from './audio.js';
import {createCampaign} from './campaign.js';
import {nextWaypoint} from './navigation.js';
import {STAGES,STATIONS,LOCKERS,checkpointSpawn} from './layout.js';
import {perceive} from './perception.js';
import {createTasks} from './tasks.js';
import {createVoice} from './voice.js';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const storage={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const prefs={sound:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,sensitivity:1,brightness:1.1,quality:'high',...storage.get('abyss-settings',{})};
const audio=createAudio();
const voice=createVoice();
const tasks=createTasks({onComplete:id=>completeStation(id),onNoise:()=>{player.noiseTime=gameTime;player.noisyTask=true;audio.cue('alarm');}});
let world,monster,campaign=createCampaign(),mode='home',settingsReturn='home',gameTime=0,subtitleUntil=0,grace=0,stepTime=0,scareCooldown=0,endingTime=0;
let attack=null,hands=null,lastTransmission='',nextScare=35;
let lastFrame=performance.now(),lastUi=0,runToggle=false,stamina=1,nearest=null;
const player={x:0,z:4,yaw:0,pitch:0,moving:false,running:false,hidden:false,noiseTime:-1,noisyTask:false};
const enemy={x:0,z:-39,alert:0,lastKnown:{x:0,z:0},patrol:0,seenHiding:false,speed:0};
const lockers=LOCKERS;
const patrol=[{x:0,z:-91},{x:0,z:-47},{x:0,z:-12},{x:0,z:-70},{x:0,z:-32}];
const keys=new Set(),stick={x:0,y:0,id:null},look={id:null,x:0,y:0};
document.body.classList.toggle('touch',navigator.maxTouchPoints>0);
function showScreen(name){for(const id of ['home','hud','pause-screen','settings','ending'])$(id).hidden=id!==name;}
function say(message,duration=8,spoken=true){$('subtitle').querySelector('p').textContent=message;subtitleUntil=gameTime+duration;$('subtitle').style.opacity=1;if(spoken){lastTransmission=message;voice.speak(message,{speaker:/MIMIC|STATION RADIO/.test(message)?'mimic':'radio'});}}
function resetInput(){keys.clear();stick.x=stick.y=0;stick.id=null;look.id=null;runToggle=false;$('joystick-knob').style.transform='';$('sprint').setAttribute('aria-pressed','false');}
function save(){storage.set('abyss-checkpoint',{version:2,chapter:campaign.state.checkpoint});$('continue-game').hidden=false;}
function applyPreferences(){audio.setMuted(!prefs.sound);voice.setEnabled(prefs.sound);if(world){world.setQuality?.(prefs.quality);}storage.set('abyss-settings',prefs);}
function home(){mode='home';resetInput();tasks.close();voice.stop();player.hidden=false;attack=null;if(hands)hands.visible=false;$('death-shade').style.opacity=0;document.body.classList.remove('hidden-player','hit');showScreen('home');audio.setThreat(0);$('continue-game').hidden=!storage.get('abyss-checkpoint',null);}
function begin(checkpoint=0){
 campaign=createCampaign(checkpoint);gameTime=0;grace=15;scareCooldown=15;stamina=1;endingTime=0;attack=null;nextScare=35;tasks.close();if(hands)hands.visible=false;$('death-shade').style.opacity=0;
 Object.assign(player,checkpointSpawn(campaign.state.chapter),{pitch:0,hidden:false,moving:false,running:false,noiseTime:-1,noisyTask:false});
 Object.assign(enemy,{x:0,z:player.z< -65?-43:-92,alert:0,patrol:0,speed:0,seenHiding:false,lastNoise:-1,visual:false,lastKnown:{x:0,z:-70}});
 resetInput();document.body.classList.remove('hidden-player','hit');mode='playing';showScreen('hud');audio.start();audio.setMuted(!prefs.sound);voice.setEnabled(prefs.sound);voice.resume();voice.unlock();audio.resume();say(campaign.state.message,12);save();updateHUD();
}
function pause(){if(mode!=='playing')return;mode='paused';resetInput();tasks.key('Space',false);tasks.setVisible(false);showScreen('pause-screen');audio.suspend();voice.pause();}
function resume(){if(mode!=='paused')return;mode='playing';showScreen('hud');tasks.setVisible(true);audio.resume();voice.resume();lastFrame=performance.now();}
function settings(){settingsReturn=mode;mode='settings';resetInput();showScreen('settings');audio.suspend();voice.pause();}
function finish(){if(mode==='ending')return;mode='ending';resetInput();tasks.close();const won=campaign.state.phase==='won';$('end-label').textContent=won?'TRANSMISSION RECEIVED / 10':'TRANSMISSION TERMINATED';$('end-title').textContent=won?'You reached the surface.':'It heard you.';$('end-copy').textContent=campaign.state.message;$('retry').hidden=won;showScreen('ending');audio.setThreat(0);if(won){audio.cue('win');voice.speak(campaign.state.message,{interrupt:true});}}
function caught(reason,creature=true){if(campaign.state.phase!=='playing')return;campaign.die(reason);startDeath(creature);}
function startDeath(creature){endingTime=3.4;attack={time:0,creature,origin:world.camera.position.clone(),yaw:world.camera.rotation.y,enemyOrigin:monster.group.position.clone(),grab:false,drag:false};tasks.close();voice.stop();document.body.classList.add('hit');audio.cue('death');resetInput();}
function updateDeath(dt){
 if(!attack)return;attack.time+=dt;const p=clamp(attack.time/3.4,0,1),fall=clamp((p-.3)/.7,0,1),yaw=attack.yaw;
 if(attack.creature){monster.group.visible=true;const facing=new THREE.Vector3(-Math.sin(yaw),0,-Math.cos(yaw)),target=attack.origin.clone().addScaledVector(facing,.85);target.y=0;monster.group.position.lerpVectors(attack.enemyOrigin,target,clamp(p/.2,0,1));monster.group.rotation.y=yaw+Math.PI;monster.update(dt,gameTime,{attackProgress:p,aggression:1});}
 world.camera.position.copy(attack.origin);world.camera.position.y=attack.origin.y-(attack.origin.y-.32)*fall*fall;
 const shake=prefs.reducedMotion?0:Math.sin(attack.time*37)*(1-p)*.017;
 world.camera.rotation.set((attack.creature?.35:-.3)*Math.sin(p*Math.PI)+fall*.35,yaw+shake,prefs.reducedMotion?0:fall*.8,'YXZ');
 if(hands){hands.visible=attack.creature&&p>.08&&p<.88;hands.position.y=-.1-fall*.45;hands.rotation.x=-Math.sin(p*Math.PI)*.5;}
 if(p>.2&&!attack.grab){audio.cue('grab');attack.grab=true;}if(p>.6&&!attack.drag){audio.cue('drag');attack.drag=true;}$('death-shade').style.opacity=String(clamp((p-.68)/.32,0,1));
 if(p>=1)finish();
}
function use(){
 if(mode!=='playing'||campaign.state.phase!=='playing')return;
 if(tasks.active)return;
 if(player.hidden){hide();return;}
 if(!nearest){say('Move closer to a marked station, then tap USE.',4,false);return;}
 const stage=STAGES[campaign.state.chapter];
 if(nearest.id===stage.id&&stage.puzzle){tasks.open({...stage,index:campaign.state.chapter});resetInput();return;}
 completeStation(nearest.id);
}
function completeStation(id){
 const result=campaign.interact(id);if(result.ok)voice.stop();say(result.message,12,result.ok);if(result.cue)audio.cue(result.cue);
 if(!result.ok)return;
 save();
 if(result.event==='power-online'){grace=10;audio.cue('scare');}
 if(result.event==='black-box'){scareCooldown=0;}
 if(result.event==='extraction-started'){enemy.alert=35;enemy.lastKnown={x:0,z:-104};}
 if(campaign.state.phase==='won')finish();updateHUD();
}
function hide(){
 if(mode!=='playing'||campaign.state.phase!=='playing')return;
 if(player.hidden){player.hidden=false;enemy.seenHiding=false;document.body.classList.remove('hidden-player');say('You step out. Walk quietly.',3,false);}
 else if(lockers.some(p=>dist(p,player)<2.3)){tasks.close();player.hidden=true;enemy.seenHiding=enemy.visual&&dist(enemy,player)<8&&lineOfSight(enemy,player);runToggle=false;document.body.classList.add('hidden-player');say(enemy.seenHiding?'It saw you get in. This locker will not save you.':'Stay still. Let the footsteps pass.',5,false);}
 else say('Find a tall locker beside the main passage to hide.',4,false);
 $('hide').setAttribute('aria-pressed',String(player.hidden));
}
function walkable(x,z){return isWalkable(x,z,.28);}
function lineOfSight(a,b){return world.hasLineOfSight(a,b);}
function updateEnemy(dt){
 monster.group.visible=campaign.state.chapter>=2;
 if(!monster.group.visible||grace>0){enemy.speed=0;monster.group.position.set(enemy.x,0,enemy.z);monster.update(dt,gameTime);return 0;}
 const sense=perceive(enemy,player,{yaw:monster.group.rotation.y,clear:lineOfSight(enemy,player),noiseFresh:player.noiseTime!==enemy.lastNoise});
 const distance=sense.distance,visible=sense.visible;enemy.visual=visible;enemy.lastNoise=player.noiseTime;
 if(visible){enemy.alert=8;enemy.lastKnown=sense.target;}else if(sense.heard){enemy.alert=Math.max(enemy.alert,4);enemy.lastKnown=sense.target;}else enemy.alert=Math.max(0,enemy.alert-dt);
 let target=enemy.alert>0?enemy.lastKnown:patrol[enemy.patrol];
 if(dist(enemy,target)<.65&&enemy.alert===0){enemy.patrol=(enemy.patrol+1)%patrol.length;target=patrol[enemy.patrol];}
 const next=nextWaypoint(enemy,target),dx=next.x-enemy.x,dz=next.z-enemy.z,d=Math.hypot(dx,dz);
 enemy.speed=d>.06?(enemy.alert>0?(campaign.state.chapter>=8?2.75:2.3):1.1):0;
 if(d>.06){const step=Math.min(d,enemy.speed*dt),nx=enemy.x+dx/d*step,nz=enemy.z+dz/d*step;if(walkable(nx,enemy.z))enemy.x=nx;if(walkable(enemy.x,nz))enemy.z=nz;const angle=Math.atan2(-dx,-dz);let diff=Math.atan2(Math.sin(angle-monster.group.rotation.y),Math.cos(angle-monster.group.rotation.y));monster.group.rotation.y+=diff*Math.min(1,dt*7);}
 monster.group.position.set(enemy.x,0,enemy.z);monster.update(dt,gameTime,{speed:enemy.speed,aggression:enemy.alert>0?1:0});
 if(distance<1.15&&(!player.hidden||enemy.seenHiding)&&lineOfSight(enemy,player))caught('The footsteps stop behind you. The radio says your name one last time.');
 if(visible&&distance<9&&scareCooldown<=0){audio.cue('scare');scareCooldown=24;say('Do not let it see where you hide.',5);}
 return visible?clamp(1-distance/18,.15,1):enemy.alert>0?.25:.04;
}
function move(dt){
 let x=stick.x+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),y=stick.y+(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);
 const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}player.moving=Math.hypot(x,y)>.1&&!player.hidden;
 player.running=player.moving&&(runToggle||keys.has('ShiftLeft')||keys.has('ShiftRight'))&&stamina>.02;
 stamina=clamp(stamina+(player.running?-.14:.12)*dt,0,1);if(stamina===0)runToggle=false;
 const speed=player.running?4.1:2.45;
 if(player.moving){const dx=(Math.cos(player.yaw)*x+Math.sin(player.yaw)*y)*speed*dt,dz=(-Math.sin(player.yaw)*x+Math.cos(player.yaw)*y)*speed*dt;if(walkable(player.x+dx,player.z))player.x+=dx;if(walkable(player.x,player.z+dz))player.z+=dz;stepTime-=dt;if(stepTime<=0){audio.cue('step');player.noiseTime=gameTime;player.noisyTask=false;stepTime=player.running?.33:.54;}}
 if(keys.has('ArrowLeft'))player.yaw+=dt*1.65;if(keys.has('ArrowRight'))player.yaw-=dt*1.65;
 if(keys.has('ArrowUp'))player.pitch=clamp(player.pitch+dt,-1.2,1.2);if(keys.has('ArrowDown'))player.pitch=clamp(player.pitch-dt,-1.2,1.2);
 const bob=prefs.reducedMotion?0:player.moving?Math.sin(gameTime*(player.running?13:9))*.025:Math.sin(gameTime*1.5)*.004;
 world.camera.position.set(player.x,(player.hidden?1.18:1.68)+bob,player.z);world.camera.rotation.set(player.pitch,player.yaw,prefs.reducedMotion?0:player.running?Math.sin(gameTime*6)*.009:0,'YXZ');
}
function updateHUD(){
 const state=campaign.state,objective=world.interactables.find(p=>p.id===state.objective.id);
 $('chapter').textContent=`${String(state.chapter+1).padStart(2,'0')} / ${STAGES.length} OPERATIONS`;$('objective').textContent=state.objective.title.replace(/^\d+ \/ /,'');$('objective-detail').textContent=state.objective.description;
 const sec=Math.ceil(state.remaining);$('timer').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
 if(objective){const target=nextWaypoint(player,objective.position),angle=Math.atan2(target.x-player.x,-(target.z-player.z))+player.yaw;$('direction').style.transform=`rotate(${angle}rad)`;$('distance').textContent=`${objective.label} · ${Math.ceil(dist(player,objective.position))} M`;}
 nearest=world.interactables.find(p=>p.id===state.objective.id&&dist(p.position,player)<2.5)||world.interactables.find(p=>dist(p.position,player)<2.5)||null;
 $('interact').classList.toggle('near',!!nearest);$('context-hint').textContent=player.hidden?'HIDDEN · TAP HIDE TO LEAVE':nearest?`USE · ${nearest.label}`:'';
 $('sprint').setAttribute('aria-pressed',String(player.running));$('sprint').textContent=stamina<.15?'TIRED':'RUN';$('hide').setAttribute('aria-pressed',String(player.hidden));
 $('danger-text').textContent=state.extractionRemaining>0?`CAPSULE ${Math.ceil(state.extractionRemaining)} S`:enemy.visual?'IT SEES YOU':enemy.alert>0?'SEARCHING':'HULL INTEGRITY';$('threat-fill').style.width=`${Math.round(state.threat*100)}%`;
}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(!world)return;
 if(mode==='home'){world.camera.position.set(1.3,1.68,3);world.camera.rotation.set(-.025,Math.sin(now*.00008)*.13,0,'YXZ');monster.group.visible=false;world.update(dt,now/1000,player,{brightness:prefs.brightness,flashlight:true});}
 if(mode==='playing'){
  gameTime+=dt;grace=Math.max(0,grace-dt);scareCooldown-=dt;
  if(campaign.state.phase==='playing'){
   move(dt);if(tasks.active){const station=STATIONS.find(p=>p.id===tasks.id);if(!station||dist(station.position,player)>3)tasks.close();else tasks.update(dt);}
   const event=campaign.update(dt,player);if(event){say(event.message,12);if(event.cue)audio.cue(event.cue);}
   if(campaign.state.phase==='playing'){const proximity=updateEnemy(dt);audio.setThreat(Math.max(proximity,campaign.state.threat*.5));document.documentElement.style.setProperty('--danger',proximity.toFixed(2));}
   else if(campaign.state.phase==='dead'&&!attack)startDeath(false);
   if(gameTime>nextScare&&campaign.state.chapter>=2){audio.cue('whisper');nextScare=gameTime+45+campaign.state.chapter*7;}
  }
  else if(campaign.state.phase==='dead')updateDeath(dt);
  $('subtitle').style.opacity=gameTime<subtitleUntil?1:0;
  world.update(dt,gameTime,player,{...campaign.state,brightness:prefs.brightness,flashlight:!player.hidden});
  if(now-lastUi>100){updateHUD();lastUi=now;}
 }
 world.render();
}
function bind(){
 $('new-game').onclick=()=>begin(0);$('continue-game').onclick=()=>{const saved=storage.get('abyss-checkpoint',{});begin(saved.version===2?saved.chapter:0);};$('pause').onclick=pause;$('resume').onclick=resume;$('quit').onclick=home;$('end-home').onclick=home;$('retry').onclick=()=>begin(campaign.state.checkpoint);$('home-settings').onclick=settings;$('pause-settings').onclick=settings;
 $('close-settings').onclick=()=>{mode=settingsReturn;showScreen(mode==='home'?'home':'pause-screen');applyPreferences();};$('interact').onclick=use;$('hide').onclick=hide;$('sprint').onclick=()=>{runToggle=!runToggle;};
 for(const [id,key] of [['sound','sound'],['reduced-motion','reducedMotion'],['sensitivity','sensitivity'],['brightness','brightness'],['quality','quality']]){const el=$(id);if(el.type==='checkbox')el.checked=prefs[key];else el.value=prefs[key];el.oninput=()=>{prefs[key]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;applyPreferences();};}
 const joystick=$('joystick');function stickMove(e){const rect=joystick.getBoundingClientRect(),radius=rect.width*.36;let x=(e.clientX-rect.left-rect.width/2)/radius,y=(e.clientY-rect.top-rect.height/2)/radius;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}stick.x=x;stick.y=y;$('joystick-knob').style.transform=`translate(${x*radius}px,${y*radius}px)`;}
 joystick.onpointerdown=e=>{if(mode!=='playing'||stick.id!==null)return;stick.id=e.pointerId;joystick.setPointerCapture(e.pointerId);stickMove(e);e.preventDefault();};joystick.onpointermove=e=>{if(e.pointerId===stick.id)stickMove(e);};function releaseStick(e){if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;$('joystick-knob').style.transform='';}joystick.onpointerup=releaseStick;joystick.onpointercancel=releaseStick;joystick.onlostpointercapture=releaseStick;
 const zone=$('look-zone');zone.onpointerdown=e=>{if(mode!=='playing'||look.id!==null)return;look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;zone.setPointerCapture(e.pointerId);e.preventDefault();};zone.onpointermove=e=>{if(e.pointerId!==look.id||mode!=='playing')return;player.yaw-=(e.clientX-look.x)*.004*prefs.sensitivity;player.pitch=clamp(player.pitch-(e.clientY-look.y)*.0035*prefs.sensitivity,-1.2,1.2);look.x=e.clientX;look.y=e.clientY;};function releaseLook(e){if(e.pointerId===look.id)look.id=null;}zone.onpointerup=releaseLook;zone.onpointercancel=releaseLook;zone.onlostpointercapture=releaseLook;
 addEventListener('keydown',e=>{if(e.code==='Escape'){if(mode==='playing')pause();else if(mode==='paused')resume();return;}if(mode!=='playing')return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(tasks.key(e.code,true))return;keys.add(e.code);if(!e.repeat){if(e.code==='KeyE'||e.code==='Space')use();if(e.code==='KeyH')hide();}});addEventListener('keyup',e=>{keys.delete(e.code);tasks.key(e.code,false);});addEventListener('blur',()=>{resetInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();pause();audio.suspend();voice.pause();}});addEventListener('resize',()=>world?.resize());$('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('fatal').hidden=false;});
}
const shade=document.createElement('div');shade.id='death-shade';document.body.append(shade);
const replay=document.createElement('button');replay.id='radio-replay';replay.textContent='↻ REPLAY RADIO';replay.onclick=()=>{voice.unlock();voice.speak(lastTransmission||campaign.state.message,{interrupt:true});subtitleUntil=gameTime+12;};$('hud').append(replay);
// This driver is eliminated from production bundles; it exercises real UI flows
// without walking the entire station between independent browser checks.
if(import.meta.env.DEV&&new URLSearchParams(location.search).has('qa'))window.__abyssQA={
 begin,place(x,z,yaw=0){Object.assign(player,{x,z,yaw,pitch:0});resetInput();updateHUD();},
 enemy(x,z,yaw=0){Object.assign(enemy,{x,z,alert:0,lastNoise:player.noiseTime,lastKnown:{x,z},seenHiding:false});monster.group.position.set(x,0,z);monster.group.rotation.y=yaw;grace=0;},
 attack(){monster.group.position.set(player.x-Math.sin(player.yaw),0,player.z-Math.cos(player.yaw));caught('The Bellkeeper takes hold of your suit.');}
};
function makeHands(){const group=new THREE.Group(),mat=new THREE.MeshStandardMaterial({color:'#394c50',roughness:.7});for(const side of [-1,1]){const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.25,4,8),mat);arm.position.set(side*.24,-.22,-.43);arm.rotation.set(-.9,0,side*-.35);const palm=new THREE.Mesh(new THREE.BoxGeometry(.10,.14,.055),mat);palm.position.set(side*.2,-.06,-.56);palm.rotation.x=-.5;group.add(arm,palm);}group.visible=false;world.camera.add(group);return group;}
try{world=createWorld($('scene'),{quality:prefs.quality});monster=createCreature();world.scene.add(monster.group);monster.group.visible=false;hands=makeHands();bind();applyPreferences();home();world.resize();requestAnimationFrame(frame);document.body.dataset.ready='true';if(import.meta.env.DEV)window.__abyssInspect=()=>({mode,player:{...player},enemy:{...enemy},campaign:campaign.snapshot(),task:tasks.state?{...tasks.state}:null,attack:attack?{time:attack.time,creature:attack.creature}:null,camera:{y:world.camera.position.y,roll:world.camera.rotation.z},drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles});}catch(error){console.error(error);$('fatal').hidden=false;}



