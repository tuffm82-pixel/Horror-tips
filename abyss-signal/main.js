import './style.css';
import * as THREE from 'three';
import {createWorld,isWalkable} from './world.js';
import {createCreature} from './creature.js';
import {createAudio} from './audio.js';
import {createCampaign} from './campaign.js';
import {nextWaypoint} from './navigation.js';

const $=id=>document.getElementById(id);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const storage={get(k,f){try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}};
const prefs={sound:true,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,sensitivity:1,brightness:1.1,quality:'high',...storage.get('abyss-settings',{})};
const audio=createAudio();
let world,monster,campaign=createCampaign(),mode='home',settingsReturn='home',gameTime=0,subtitleUntil=0,grace=0,stepTime=0,scareCooldown=0,endingTime=0;
let lastFrame=performance.now(),lastUi=0,runToggle=false,stamina=1,nearest=null;
const player={x:0,z:4,yaw:0,pitch:0,moving:false,running:false,hidden:false};
const enemy={x:0,z:-39,alert:0,lastKnown:{x:0,z:0},patrol:0,seenHiding:false,speed:0};
const lockers=[{x:-2.2,z:-1},{x:2.2,z:-14},{x:-2.2,z:-26},{x:2.2,z:-36}];
const patrol=[{x:0,z:-37},{x:0,z:-18},{x:0,z:-3},{x:0,z:-28}];
const keys=new Set(),stick={x:0,y:0,id:null},look={id:null,x:0,y:0};
document.body.classList.toggle('touch',navigator.maxTouchPoints>0);
function showScreen(name){for(const id of ['home','hud','pause-screen','settings','ending'])$(id).hidden=id!==name;}
function say(message,duration=8){$('subtitle').querySelector('p').textContent=message;subtitleUntil=gameTime+duration;$('subtitle').style.opacity=1;}
function resetInput(){keys.clear();stick.x=stick.y=0;stick.id=null;look.id=null;runToggle=false;$('joystick-knob').style.transform='';$('sprint').setAttribute('aria-pressed','false');}
function save(){storage.set('abyss-checkpoint',{chapter:campaign.state.checkpoint});$('continue-game').hidden=false;}
function applyPreferences(){audio.setMuted(!prefs.sound);if(world){world.setQuality?.(prefs.quality);}storage.set('abyss-settings',prefs);}
function home(){mode='home';resetInput();player.hidden=false;document.body.classList.remove('hidden-player','hit');showScreen('home');audio.setThreat(0);$('continue-game').hidden=!storage.get('abyss-checkpoint',null);}
function begin(checkpoint=0){
 campaign=createCampaign(checkpoint);gameTime=0;grace=checkpoint===3?7:15;scareCooldown=15;stamina=1;endingTime=0;
 const starts=[{x:0,z:4},{x:-10,z:-8},{x:10,z:-20},{x:-10,z:-32}];
 Object.assign(player,starts[campaign.state.chapter],{yaw:campaign.state.chapter===1||campaign.state.chapter===3?-Math.PI/2:campaign.state.chapter===2?Math.PI/2:0,pitch:0,hidden:false,moving:false,running:false});
 Object.assign(enemy,{x:0,z:campaign.state.chapter===3?-16:-39,alert:0,patrol:0,speed:0,seenHiding:false});
 resetInput();document.body.classList.remove('hidden-player','hit');mode='playing';showScreen('hud');audio.start();audio.setMuted(!prefs.sound);audio.resume();say(campaign.state.message,10);save();updateHUD();
}
function pause(){if(mode!=='playing')return;mode='paused';resetInput();showScreen('pause-screen');audio.suspend();}
function resume(){if(mode!=='paused')return;mode='playing';showScreen('hud');audio.resume();lastFrame=performance.now();}
function settings(){settingsReturn=mode;mode='settings';resetInput();showScreen('settings');audio.suspend();}
function finish(){if(mode==='ending')return;mode='ending';resetInput();const won=campaign.state.phase==='won';$('end-label').textContent=won?'TRANSMISSION RECEIVED / 04':'TRANSMISSION TERMINATED';$('end-title').textContent=won?'You reached the surface.':'It heard you.';$('end-copy').textContent=campaign.state.message;$('retry').hidden=won;showScreen('ending');audio.setThreat(0);if(won)audio.cue('win');}
function caught(reason){if(campaign.state.phase!=='playing')return;campaign.die(reason);endingTime=.85;document.body.classList.add('hit');audio.cue('death');resetInput();}
function use(){
 if(mode!=='playing'||campaign.state.phase!=='playing')return;
 if(player.hidden){hide();return;}
 if(!nearest){say('Move closer to a marked station, then tap USE.',4);return;}
 const result=campaign.interact(nearest.id);say(result.message,10);if(result.cue)audio.cue(result.cue);
 if(!result.ok)return;
 save();
 if(result.event==='pumps-online'){grace=13;enemy.z=-38;enemy.x=0;}
 if(result.event==='black-box'){enemy.x=0;enemy.z=-7;enemy.alert=0;grace=7;scareCooldown=0;}
 if(result.event==='chase'){enemy.x=0;enemy.z=-18;grace=3;enemy.alert=30;}
 if(campaign.state.phase==='won')finish();updateHUD();
}
function hide(){
 if(mode!=='playing'||campaign.state.phase!=='playing')return;
 if(player.hidden){player.hidden=false;enemy.seenHiding=false;document.body.classList.remove('hidden-player');say('You step out. Walk quietly.',3);}
 else if(lockers.some(p=>dist(p,player)<2.3)){player.hidden=true;enemy.seenHiding=enemy.alert>0&&dist(enemy,player)<8&&lineOfSight(enemy,player);runToggle=false;document.body.classList.add('hidden-player');say(enemy.seenHiding?'It saw you get in. This locker will not save you.':'Stay still. Let the footsteps pass.',5);}
 else say('Find a tall locker beside the main passage to hide.',4);
 $('hide').setAttribute('aria-pressed',String(player.hidden));
}
function walkable(x,z){return isWalkable(x,z,.28);}
function lineOfSight(a,b){const n=Math.ceil(dist(a,b)*3);for(let i=1;i<n;i++){const t=i/n;if(!isWalkable(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,0))return false;}return true;}
function updateEnemy(dt){
 monster.group.visible=campaign.state.chapter>0;
 if(!monster.group.visible||grace>0){enemy.speed=0;monster.group.position.set(enemy.x,0,enemy.z);monster.update(dt,gameTime);return 0;}
 const distance=dist(enemy,player),visible=distance<15&&lineOfSight(enemy,player)&&(!player.hidden||enemy.seenHiding);
 if(visible||(!player.hidden&&player.running&&distance<23)||campaign.state.chapter===3&&!player.hidden){enemy.alert=9;enemy.lastKnown={x:player.x,z:player.z};}else enemy.alert=Math.max(0,enemy.alert-dt);
 let target=enemy.alert>0?enemy.lastKnown:patrol[enemy.patrol];
 if(dist(enemy,target)<.65&&enemy.alert===0){enemy.patrol=(enemy.patrol+1)%patrol.length;target=patrol[enemy.patrol];}
 const next=nextWaypoint(enemy,target),dx=next.x-enemy.x,dz=next.z-enemy.z,d=Math.hypot(dx,dz);
 enemy.speed=d>.06?(enemy.alert>0?(campaign.state.chapter===3?2.85:2.25):1.05):0;
 if(d>.06){const step=Math.min(d,enemy.speed*dt),nx=enemy.x+dx/d*step,nz=enemy.z+dz/d*step;if(walkable(nx,enemy.z))enemy.x=nx;if(walkable(enemy.x,nz))enemy.z=nz;const angle=Math.atan2(-dx,-dz);let diff=Math.atan2(Math.sin(angle-monster.group.rotation.y),Math.cos(angle-monster.group.rotation.y));monster.group.rotation.y+=diff*Math.min(1,dt*7);}
 monster.group.position.set(enemy.x,0,enemy.z);monster.update(dt,gameTime,{speed:enemy.speed,aggression:enemy.alert>0?1:0});
 if(distance<1.15&&(!player.hidden||enemy.seenHiding)&&lineOfSight(enemy,player))caught('The footsteps stop behind you. The radio says your name one last time.');
 if(visible&&distance<9&&scareCooldown<=0){audio.cue('scare');scareCooldown=24;say('Do not let it see where you hide.',5);}
 return visible?clamp(1-distance/18,.15,1):enemy.alert>0?.35:.08;
}
function move(dt){
 let x=stick.x+(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0),y=stick.y+(keys.has('KeyS')?1:0)-(keys.has('KeyW')?1:0);
 const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}player.moving=Math.hypot(x,y)>.1&&!player.hidden;
 player.running=player.moving&&(runToggle||keys.has('ShiftLeft')||keys.has('ShiftRight'))&&stamina>.02;
 stamina=clamp(stamina+(player.running?-.14:.12)*dt,0,1);if(stamina===0)runToggle=false;
 const speed=player.running?4.1:2.45;
 if(player.moving){const dx=(Math.cos(player.yaw)*x+Math.sin(player.yaw)*y)*speed*dt,dz=(-Math.sin(player.yaw)*x+Math.cos(player.yaw)*y)*speed*dt;if(walkable(player.x+dx,player.z))player.x+=dx;if(walkable(player.x,player.z+dz))player.z+=dz;stepTime-=dt;if(stepTime<=0){audio.cue('step');stepTime=player.running?.33:.54;}}
 if(keys.has('ArrowLeft'))player.yaw+=dt*1.65;if(keys.has('ArrowRight'))player.yaw-=dt*1.65;
 if(keys.has('ArrowUp'))player.pitch=clamp(player.pitch+dt,-1.2,1.2);if(keys.has('ArrowDown'))player.pitch=clamp(player.pitch-dt,-1.2,1.2);
 const bob=prefs.reducedMotion?0:player.moving?Math.sin(gameTime*(player.running?13:9))*.025:Math.sin(gameTime*1.5)*.004;
 world.camera.position.set(player.x,(player.hidden?1.18:1.68)+bob,player.z);world.camera.rotation.set(player.pitch,player.yaw,prefs.reducedMotion?0:player.running?Math.sin(gameTime*6)*.009:0,'YXZ');
}
function updateHUD(){
 const state=campaign.state,objective=world.interactables.find(p=>p.id===state.objective.id);
 $('chapter').textContent=`0${state.chapter+1} / THE LAST SHIFT`;$('objective').textContent=state.objective.title.replace(/^\d+ \/ /,'');$('objective-detail').textContent=state.objective.description;
 const sec=Math.ceil(state.remaining);$('timer').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
 if(objective){const target=nextWaypoint(player,objective.position),angle=Math.atan2(target.x-player.x,-(target.z-player.z))+player.yaw;$('direction').style.transform=`rotate(${angle}rad)`;$('distance').textContent=`${objective.label} · ${Math.ceil(dist(player,objective.position))} M`;}
 nearest=world.interactables.find(p=>dist(p.position,player)<2.5)||null;
 $('interact').classList.toggle('near',!!nearest);$('context-hint').textContent=player.hidden?'HIDDEN · TAP HIDE TO LEAVE':nearest?`USE · ${nearest.label}`:'';
 $('sprint').setAttribute('aria-pressed',String(player.running));$('sprint').textContent=stamina<.15?'TIRED':'RUN';$('hide').setAttribute('aria-pressed',String(player.hidden));
 $('danger-text').textContent=enemy.alert>0?'IT HEARS YOU':'HULL INTEGRITY';$('threat-fill').style.width=`${Math.round(state.threat*100)}%`;
}
function frame(now){
 requestAnimationFrame(frame);const dt=Math.min(.05,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
 if(!world)return;
 if(mode==='home'){world.camera.position.set(1.3,1.68,3);world.camera.rotation.set(-.025,Math.sin(now*.00008)*.13,0,'YXZ');monster.group.visible=false;world.update(dt,now/1000,player,{brightness:prefs.brightness,flashlight:true});}
 if(mode==='playing'){
  gameTime+=dt;grace=Math.max(0,grace-dt);scareCooldown-=dt;
  if(campaign.state.phase==='playing'){move(dt);const event=campaign.update(dt,player);if(event){say(event.message);if(event.cue)audio.cue(event.cue);}const proximity=updateEnemy(dt);audio.setThreat(Math.max(proximity,campaign.state.threat*.5));document.documentElement.style.setProperty('--danger',proximity.toFixed(2));if(campaign.state.phase==='dead'&&!endingTime){audio.cue('death');endingTime=.8;}}
  else if(campaign.state.phase==='dead'){endingTime-=dt;if(endingTime<=0)finish();}
  $('subtitle').style.opacity=gameTime<subtitleUntil?1:0;
  world.update(dt,gameTime,player,{...campaign.state,brightness:prefs.brightness,flashlight:!player.hidden});
  if(now-lastUi>100){updateHUD();lastUi=now;}
 }
 world.render();
}
function bind(){
 $('new-game').onclick=()=>begin(0);$('continue-game').onclick=()=>begin(storage.get('abyss-checkpoint',{chapter:0}).chapter);$('pause').onclick=pause;$('resume').onclick=resume;$('quit').onclick=home;$('end-home').onclick=home;$('retry').onclick=()=>begin(campaign.state.checkpoint);$('home-settings').onclick=settings;$('pause-settings').onclick=settings;
 $('close-settings').onclick=()=>{mode=settingsReturn;showScreen(mode==='home'?'home':'pause-screen');applyPreferences();};$('interact').onclick=use;$('hide').onclick=hide;$('sprint').onclick=()=>{runToggle=!runToggle;};
 for(const [id,key] of [['sound','sound'],['reduced-motion','reducedMotion'],['sensitivity','sensitivity'],['brightness','brightness'],['quality','quality']]){const el=$(id);if(el.type==='checkbox')el.checked=prefs[key];else el.value=prefs[key];el.oninput=()=>{prefs[key]=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;applyPreferences();};}
 const joystick=$('joystick');function stickMove(e){const rect=joystick.getBoundingClientRect(),radius=rect.width*.36;let x=(e.clientX-rect.left-rect.width/2)/radius,y=(e.clientY-rect.top-rect.height/2)/radius;const len=Math.hypot(x,y);if(len>1){x/=len;y/=len;}stick.x=x;stick.y=y;$('joystick-knob').style.transform=`translate(${x*radius}px,${y*radius}px)`;}
 joystick.onpointerdown=e=>{if(mode!=='playing'||stick.id!==null)return;stick.id=e.pointerId;joystick.setPointerCapture(e.pointerId);stickMove(e);e.preventDefault();};joystick.onpointermove=e=>{if(e.pointerId===stick.id)stickMove(e);};function releaseStick(e){if(e.pointerId!==stick.id)return;stick.id=null;stick.x=stick.y=0;$('joystick-knob').style.transform='';}joystick.onpointerup=releaseStick;joystick.onpointercancel=releaseStick;joystick.onlostpointercapture=releaseStick;
 const zone=$('look-zone');zone.onpointerdown=e=>{if(mode!=='playing'||look.id!==null)return;look.id=e.pointerId;look.x=e.clientX;look.y=e.clientY;zone.setPointerCapture(e.pointerId);e.preventDefault();};zone.onpointermove=e=>{if(e.pointerId!==look.id||mode!=='playing')return;player.yaw-=(e.clientX-look.x)*.004*prefs.sensitivity;player.pitch=clamp(player.pitch-(e.clientY-look.y)*.0035*prefs.sensitivity,-1.2,1.2);look.x=e.clientX;look.y=e.clientY;};function releaseLook(e){if(e.pointerId===look.id)look.id=null;}zone.onpointerup=releaseLook;zone.onpointercancel=releaseLook;zone.onlostpointercapture=releaseLook;
 addEventListener('keydown',e=>{if(e.code==='Escape'){if(mode==='playing')pause();else if(mode==='paused')resume();return;}if(mode!=='playing')return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys.add(e.code);if(!e.repeat){if(e.code==='KeyE'||e.code==='Space')use();if(e.code==='KeyH')hide();}});addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',()=>{resetInput();pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){resetInput();pause();audio.suspend();}});addEventListener('resize',()=>world?.resize());$('scene').addEventListener('webglcontextlost',e=>{e.preventDefault();pause();$('fatal').hidden=false;});
}
try{world=createWorld($('scene'),{quality:prefs.quality});monster=createCreature();world.scene.add(monster.group);monster.group.visible=false;bind();applyPreferences();home();world.resize();requestAnimationFrame(frame);document.body.dataset.ready='true';if(import.meta.env.DEV)window.__abyssInspect=()=>({mode,player:{...player},enemy:{...enemy},campaign:campaign.snapshot(),drawCalls:world.renderer.info.render.calls,triangles:world.renderer.info.render.triangles});}catch(error){console.error(error);$('fatal').hidden=false;}


