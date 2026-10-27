import './style.css';
import './book.css';
import './horror.css';
import {createWorld} from './world.js';
import {AudioDirector} from './audio.js';
import {Multiplayer} from './network.js';
import {places,story,ringSuccess,balanceStep,nextPlaces} from './game.js';

const $=s=>document.querySelector(s),app=$('#app'),canvas=$('#world'),subtitle=$('#subtitle');
const read=(k,f)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
const settings=read('horror-tips-settings',{volume:.55,voice:true,quality:'high',reducedMotion:false,brightness:1.15});
const audio=new AudioDirector();audio.setVolume(settings.volume);audio.setVoice(settings.voice);
let world;
try{world=createWorld(canvas,settings)}catch(e){app.innerHTML='<section class="error"><h1>A light went out.</h1><p>This game needs WebGL. Enable hardware acceleration or open it in a current desktop browser.</p></section>';throw e;}
let mode='menu',scene='menu',paused=false,elapsed=0,sceneClock=0,lineIndex=0,lineClock=0,visited=[],countdown=0,currentLocation='courtyard',chapter=0,storyKey='',challenge=null,held=false,flashlight=true;
let network=null,networkState=null,netTick=0,lastStep=0,notice='',noticeUntil=0;
let transitionTimer=null;
const touchLook={x:0,y:0};let lookPointer=null;
const input={forward:false,back:false,left:false,right:false,sprint:false};
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const button=(label,action,cls='')=>`<button class="${cls}" data-action="${action}">${label}</button>`;
function unlock(){audio.unlock();}
function speak(text,speaker){subtitle.innerHTML=`<span>${escape(speaker)}</span><p>${escape(text)}</p>`;audio.say(text,speaker);}
function clearSpeech(){subtitle.innerHTML='';if('speechSynthesis'in window){speechSynthesis.cancel();speechSynthesis.resume();}}
function location(name){currentLocation=name;world.setLocation(name);}
function setScene(name){scene=name;sceneClock=0;world.setScene(name);audio.setScene?.(name);document.body.dataset.scene=name;}
function release(){if(document.pointerLockElement)document.exitPointerLock();Object.keys(input).forEach(k=>input[k]=false);held=false;}
function checkpoint(){save('horror-tips-save',{visited,currentLocation,chapter,countdown});}
function menu(){if(mode==='campaign'&&scene==='choose')checkpoint();release();clearSpeech();mode='menu';paused=false;challenge=null;storyKey='';countdown=0;setScene('menu');render();}
function startCampaign(resume=false){unlock();release();network?.disconnect();network=null;networkState=null;mode='campaign';paused=false;challenge=null;visited=[];chapter=0;location('courtyard');if(resume){const c=read('horror-tips-save',null);if(c){visited=c.visited||[];chapter=c.chapter||0;countdown=Math.max(0,Math.min(20,Number(c.countdown)||0));location(c.currentLocation||'courtyard');choose(false,false);return;}}runStory('intro');}
function runStory(key){clearSpeech();storyKey=key;lineIndex=0;lineClock=0;setScene(key==='bathroom'?'bathroom':key==='bottom'?'chase':key==='top'?'indie':key==='blue'?'finn':key);showLine();render();}
function showLine(){const line=story[storyKey][lineIndex];speak(line[1],line[0]);
 const beat=`${storyKey}:${lineIndex}`;
 if(line[0].startsWith('RULE '))audio.cue?.('book');
 if(['transform:0','top:3','sonny:3','blue:3'].includes(beat)){audio.sting();document.body.classList.remove('dread-cut');void document.body.offsetWidth;document.body.classList.add('dread-cut');}
 if(beat==='spin:1')audio.cue?.('freeze');
 if(beat==='ending:0')audio.cue?.('bell');
}
function advance(){if(paused||mode!=='campaign'||!storyKey)return;lineIndex++;lineClock=0;if(lineIndex<story[storyKey].length){showLine();render();return;}const key=storyKey;storyKey='';clearSpeech();if(key==='intro'){setScene('intro');render();}else if(key==='spin')runStory('transform');else if(key==='transform'){countdown=20;choose(true);}else if(key==='bathroom')runStory('sonny');else if(key==='sonny'){countdown=20;choose();}else if(key==='bottom')startChallenge('ring');else if(key==='top')startChallenge('balance');else if(key==='blue')runStory('ending');else if(key==='ending'){save('horror-tips-complete',true);save('horror-tips-save',null);menu();}}
function choose(first=false,advanceChapter=true){release();setScene('choose');if(advanceChapter)chapter++;checkpoint();mode='campaign';storyKey='';challenge=null;render(first);}
function travel(name){if(!places[name])return;release();visited.push(name);countdown=0;document.body.classList.remove('arriving');void document.body.offsetWidth;document.body.classList.add('arriving');clearTimeout(transitionTimer);transitionTimer=setTimeout(()=>document.body.classList.remove('arriving'),900);audio.cue?.('transition');location(name);runStory(name);}
function startChallenge(type){release();setScene('chase');challenge={type,time:0,hits:0,fails:0,radius:150,position:.5,progress:0,outside:0,cooldown:0};render();}
function fail(){release();clearSpeech();challenge=null;countdown=0;storyKey='';setScene('caught');audio.sting();render();}
function winChallenge(){challenge=null;audio.setThreat(0);speak('Your footsteps fade into the wind. For now, you are alone.','YOU');choose();}
function hitRing(){if(!challenge||challenge.type!=='ring'||challenge.cooldown>0||paused)return;const good=ringSuccess(challenge.radius);if(good)challenge.hits++;else{challenge.fails++;audio.sting();}challenge.time=0;challenge.radius=150;challenge.cooldown=.22;if(challenge.fails>=3){fail();return;}if(challenge.hits>=5){winChallenge();return;}updateChallenge();}
function hud(){return `<header class="game-head"><div class="wordmark">H<span>Τ</span></div><div class="location"><span class="live-dot"></span> WOLLONGONG WEST <b>${escape(places[currentLocation]?.name||'The courtyard')}</b></div>${button('Ⅱ <span>Pause</span>','pause','small-button')}</header><div id="timer" class="timer ${countdown>0?'':'hidden'}"><span>TIME TO HIDE</span><strong>${Math.ceil(countdown)}</strong></div><div class="crosshair" aria-hidden="true">+</div><footer class="game-foot"><span>W A S D <i>move</i> &nbsp; SHIFT <i>run</i> &nbsp; F <i>torch</i></span><span>CLICK SCENE TO LOOK AROUND</span></footer><nav class="touch-controls" aria-label="Touch movement"><button data-move="forward" aria-label="Forward">↑</button><button data-move="left" aria-label="Left">←</button><button data-move="back" aria-label="Back">↓</button><button data-move="right" aria-label="Right">→</button></nav>`;}
function render(first=false){
 document.body.classList.toggle('playing',mode==='campaign'||mode==='online');
 document.body.classList.toggle('reduce-motion',settings.reducedMotion);document.documentElement.style.setProperty('--brightness',settings.brightness);
 if(mode==='menu'){
 const completed=read('horror-tips-complete',false),saved=read('horror-tips-save',null);
 app.innerHTML=`<header class="menu-head"><a class="brand" href="#" data-action="menu">HT<span>AN AFTER-HOURS GAME</span></a><span class="edition">WOLLONGONG WEST / 19:34</span><button class="sound-toggle" data-action="mute" aria-label="Toggle sound">${settings.volume>0?'◖))':'◖×'} <span>SOUND ${settings.volume>0?'ON':'OFF'}</span></button></header><section class="menu-content"><div class="eyebrow"><span class="tiny-line"></span> THE BELL RANG. NOBODY LEFT.</div><h1 class="title">HORROR<br><span>TIPS<span class="title-dot">.</span></span></h1><p class="tagline">You know the school.<br>You don’t know the rules.</p><nav class="main-nav" aria-label="Main menu"><button class="menu-play" data-action="campaign"><span class="nav-number">01</span><span>Campaign<small>LEARN THE RULES</small></span><span class="arrow">↗</span></button>${saved?button('<span class="nav-number">↳</span> Continue campaign','continue','menu-secondary'):''}<button class="menu-secondary" data-action="multiplayer"><span class="nav-number">02</span> Multiplayer <span class="nav-tag">2–6 PLAYERS</span></button><button class="menu-secondary" data-action="settings"><span class="nav-number">03</span> Settings <span class="gear">⚙</span></button></nav></section><aside class="menu-note"><span class="note-cross">+</span><p>ONE SCHOOL.<br>TWENTY SECONDS.<br><b>DON’T GET CAUGHT.</b></p><div class="coordinate">34°25′S &nbsp; 150°52′E</div></aside><footer class="menu-foot"><span><i class="live-dot"></i> ${completed?'YOU SURVIVED. THE RULES REMEMBER.':'THE HOLLOW IS WAITING'}</span><button data-action="about">ABOUT THIS GAME ↗</button><span>HEADPHONES RECOMMENDED <span class="headphones">♧</span></span></footer>`;return;
 }
 if(mode==='settings'){app.innerHTML=`<section class="panel settings"><span class="eyebrow">MAKE YOURSELF COMFORTABLE</span><h1>Settings<span>.</span></h1><label>Master volume <output id="volume-value">${Math.round(settings.volume*100)}%</output><input id="volume" type="range" min="0" max="1" step=".05" value="${settings.volume}"></label><label>Brightness <input id="brightness" type="range" min=".75" max="1.8" step=".05" value="${settings.brightness}"></label><label class="row">Spoken dialogue <input id="voice" type="checkbox" ${settings.voice?'checked':''}></label><label class="row">Reduced motion <input id="motion" type="checkbox" ${settings.reducedMotion?'checked':''}></label><label class="row">Graphics <select id="quality"><option value="high" ${settings.quality==='high'?'selected':''}>High · shadows</option><option value="low" ${settings.quality==='low'?'selected':''}>Low · performance</option></select></label><p class="fine">Dialogue always has subtitles. Horror uses implied attacks and sudden sounds. Voice availability depends on your browser.</p>${button('← Back','back-settings','primary')}</section>`;return;}
 if(mode==='multiplayer'){renderMultiplayer();return;}
 if(scene==='caught'){app.innerHTML=`<section class="death centered"><span class="eyebrow">THE RULES ALWAYS WIN</span><h1>You’re in.</h1><p>It only needed one mistake.</p>${button('Try this chase again','retry','primary')}${button('Return to menu','menu','text-button')}</section>`;return;}
 app.innerHTML=hud();
 if(storyKey){const line=story[storyKey][lineIndex];app.insertAdjacentHTML('beforeend',`<div class="chapter-tag">${String(chapter+1).padStart(2,'0')} / ${escape(storyKey.toUpperCase())}</div>${line[0].startsWith('RULE ')?`<aside class="rulebook"><span>THE RULES OF TIPS</span><div class="book-pages"><div><small>AFTER THE BELL</small><strong>${escape(line[0])}</strong><i>Every game has rules.<br>These ones remember.</i></div><div><span>§</span><p>${escape(line[1])}</p><small>OBEY. SURVIVE. REPEAT.</small></div></div></aside>`:''}${button('Continue <span>SPACE →</span>','advance','continue-button')}${storyKey==='bathroom'&&lineIndex===1?'<div class="blackout"></div>':''}`);return;}
 if(scene==='intro'){app.insertAdjacentHTML('beforeend',`<section class="invitation centered"><span class="eyebrow">SOME GAMES NEVER END</span><h1>Do you wanna<br>play tips?</h1>${button('Yes.','yes','primary')}</section>`);return;}
 if(challenge){renderChallenge();return;}
 if(scene==='choose'){
 const available=first||visited.length===0?['bathroom','bottom','top','blue']:nextPlaces(visited);
 app.insertAdjacentHTML('beforeend',`<section class="choices"><span class="eyebrow">${countdown?'TWENTY SECONDS. MAKE THEM COUNT.':'YOU GOT AWAY. KEEP MOVING.'}</span><h1>Where do you go?</h1><div class="choice-grid">${available.map(p=>`<button class="choice" data-action="go-${p}"><span>${places[p].number} <b>↗</b></span><strong>${places[p].name}</strong><small>${places[p].detail}</small></button>`).join('')}</div></section>`);
 }
}
function renderChallenge(){app.insertAdjacentHTML('beforeend',`<section class="challenge"><span class="eyebrow">${challenge.type==='ring'?'IT IS RIGHT BEHIND YOU':'STEADY YOUR BREATH'}</span><h1>${challenge.type==='ring'?'Don’t miss a step.':'Keep it together.'}</h1><p>${challenge.type==='ring'?'Click or press SPACE when the circles line up. Five perfect steps. Three misses and it catches you.':'Hold SPACE or hold the button to push right. Release to drift left. Stay inside the pale zone for 10 seconds.'}</p>${challenge.type==='ring'?'<button class="ring-game" data-action="ring" aria-label="Time your step"><span class="ring-target"></span><span id="closing-ring"></span><span class="ring-center">STEP</span></button>':'<div class="balance-track"><span class="safe-zone"></span><span id="balance-line"></span></div><button class="hold-button" id="hold-button">HOLD TO STEADY</button>'}<div class="challenge-meta" id="challenge-meta"></div></section>`);updateChallenge();}
function updateChallenge(){if(!challenge)return;const c=challenge;if(c.type==='ring'){const r=$('#closing-ring');if(r){r.style.width=r.style.height=`${c.radius*2}px`;r.classList.toggle('perfect',ringSuccess(c.radius));}const m=$('#challenge-meta');if(m)m.innerHTML=`<span>${'● '.repeat(c.hits)}${'○ '.repeat(5-c.hits)} <b>${c.hits} / 5</b></span><span>${c.fails} / 3 MISSES</span>`;}else{const l=$('#balance-line');if(l)l.style.left=`${c.position*100}%`;const m=$('#challenge-meta');if(m)m.innerHTML=`<span>BREATH <b>${Math.floor(c.progress)} / 10 s</b></span><span>EXPOSURE <b>${Math.round(c.outside/2.8*100)}%</b></span>`;}}
function pause(){if(paused||(mode!=='campaign'&&mode!=='online'))return;if(mode==='campaign'&&scene==='choose')checkpoint();release();paused=true;audio.setThreat(0);if('speechSynthesis'in window)speechSynthesis.pause();app.insertAdjacentHTML('beforeend',`<section class="pause-overlay"><div class="panel"><span class="eyebrow">TAKE A BREATH</span><h1>Paused<span>.</span></h1><p>${mode==='online'?'The online round keeps running.':'The school can wait.'}</p>${button('Resume','resume','primary')}${button('Settings','pause-settings','text-button')}${button('Main menu','menu','text-button')}</div></section>`);}
let settingsFrom='menu';
function renderMultiplayer(){const s=networkState;
 const finished=s?.phase==='finished';
 app.innerHTML=`<section class="panel multiplayer"><span class="eyebrow">BRING SOMEONE TO RUN WITH</span><h1>After hours<span>.</span></h1>${s?`${finished?`<h2>${s.winner==='survivors'?'The runners survived.':'The Hollow wins.'}</h2><p>${s.players.filter(p=>!p.isCreature&&p.alive).length} runners survived · ${s.players.filter(p=>!p.isCreature&&!p.alive).length} caught</p>`:''}<p>ROOM <strong class="room-code">${escape(s.code)}</strong> <button data-action="copy" class="small-button">COPY</button></p><div class="player-list">${s.players.map(p=>`<div><span class="live-dot"></span>${escape(p.name)} ${p.id===s.hostId?'<small>HOST</small>':''} ${p.id===network?.id?'<small>YOU</small>':''} ${finished?`<small>${p.isCreature?'HOLLOW':p.alive?'SURVIVED':'CAUGHT'}</small>`:''}</div>`).join('')}</div><p class="fine">One player becomes the Hollow. Everyone else has twenty seconds to hide, then ninety seconds to survive.</p>${s.hostId===network?.id?button(s.players.length<2?'Waiting for another player…':finished?'Play another round':'Start round','start-round','primary'): '<p>Waiting for the host to start…</p>'}${button('Leave room','leave','text-button')}`:`<p>One becomes the Hollow. The others run.</p><label>Your name<input id="player-name" maxlength="18" placeholder="Player" value="${escape(read('horror-tips-name',''))}"></label><label>Server address <span class="optional">optional on a hosted Node server</span><input id="server-url" placeholder="wss://your-server.example/ws" value="${escape(read('horror-tips-server',''))}"></label><div class="lobby-actions">${button('Create room','create-room','primary')}<span>OR</span><input id="room-code" maxlength="6" placeholder="ROOM CODE" aria-label="Room code">${button('Join room','join-room','secondary')}</div><p class="fine">Invite friends with your room code. Online play needs the included Node server; a static GitHub Pages site needs a separate multiplayer server address.</p>`}<p id="network-status" role="status">${escape(notice)}</p>${button('← Main menu','menu','text-button')}</section>`;
}
async function connectRoom(join){
 unlock();const name=$('#player-name').value.trim()||'Player',url=$('#server-url').value.trim(),code=$('#room-code').value.trim();
 if(join&&!code){$('#network-status').textContent='Enter a room code first.';return;}
 save('horror-tips-name',name);save('horror-tips-server',url);$('#network-status').textContent='Connecting…';network?.disconnect();networkState=null;
 const client=new Multiplayer({onState:s=>{if(network===client)onNetworkState(s);},onError:message=>{if(network!==client)return;notice=message;const el=$('#network-status');if(el)el.textContent=message;},onStatus:status=>{if(network!==client)return;if(status==='disconnected'){notice='Connection lost. Rejoin the room to play again.';networkState=null;world.setRemotePlayers([]);release();if(mode==='online'||mode==='multiplayer'){mode='multiplayer';paused=false;render();}}}});
 network=client;
 try{await client.connect(url||undefined);if(network!==client)return;join?client.join(code.toUpperCase(),name):client.create(name);}
 catch(e){if(network!==client)return;notice=e.message||'Could not connect. Start the Node server or check the server address.';const el=$('#network-status');if(el)el.textContent=notice;}
}
function onNetworkState(s){
 const old=networkState;networkState=s;
 if(!s){world.setRemotePlayers([]);return;}
 const me=s.players.find(p=>p.id===network?.id);
 if(s.phase==='lobby'){if(mode!=='settings'){mode='multiplayer';paused=false;render();}return;}
 if(s.phase==='hiding'||s.phase==='hunting'){
   const newRound=!old||!['hiding','hunting'].includes(old.phase);
   if(newRound){release();location('courtyard');setScene('online');if(me)world.setPose(me);netTick=0;clearSpeech();}
   else if(me){const pose=world.getPose();if(Math.hypot(pose.x-me.x,pose.z-me.z)>2)world.setPose({...me,yaw:pose.yaw??pose.rotation});}
   if(mode!=='settings'&&mode!=='online'){mode='online';paused=false;renderOnline();}
   if(!paused){const el=$('#online-clock');if(el)el.textContent=`${s.phase==='hiding'?'HIDE':'SURVIVE'} · ${Math.ceil(s.remaining)}s`;const role=$('#online-role');if(role)role.textContent=me?.isCreature?'YOU ARE THE HOLLOW · FIND THEM':me?.alive?'KEEP MOVING · DON’T GET CAUGHT':'YOU WERE CAUGHT · SPECTATING';}
   world.setRemotePlayers(s.players.filter(p=>p.id!==network?.id));
 }
 if(s.phase==='finished'){
   release();clearSpeech();world.setRemotePlayers([]);
   if(mode!=='settings'){mode='multiplayer';paused=false;render();}
 }
}
function renderOnline(){app.innerHTML=hud()+`<div class="online-hud"><strong id="online-clock"></strong><p id="online-role"></p></div>`;}
app.addEventListener('click',async e=>{const b=e.target.closest('[data-action]');if(!b)return;e.preventDefault();const a=b.dataset.action;unlock();if(a==='campaign')startCampaign();else if(a==='continue')startCampaign(true);else if(a==='menu'){network?.disconnect();network=null;networkState=null;world.setRemotePlayers([]);menu();}else if(a==='yes')runStory('spin');else if(a==='advance')advance();else if(a.startsWith('go-'))travel(a.slice(3));else if(a==='ring')hitRing();else if(a==='retry'){mode='campaign';location(currentLocation);runStory(currentLocation);}else if(a==='pause')pause();else if(a==='resume'){paused=false;$('.pause-overlay')?.remove();if('speechSynthesis'in window)speechSynthesis.resume();}else if(a==='settings'||a==='pause-settings'){settingsFrom=a==='pause-settings'?mode:'menu';mode='settings';render();}else if(a==='back-settings'){save('horror-tips-settings',settings);world.setQuality(settings.quality);if(settingsFrom==='campaign'||settingsFrom==='online'){mode=networkState?(['hiding','hunting'].includes(networkState.phase)?'online':'multiplayer'):(settingsFrom==='online'?'multiplayer':'campaign');paused=false;mode==='online'?renderOnline():render();if('speechSynthesis'in window)speechSynthesis.resume();}else menu();}else if(a==='mute'){settings.volume=settings.volume?0:.55;audio.setVolume(settings.volume);save('horror-tips-settings',settings);render();}else if(a==='multiplayer'){clearSpeech();notice='';mode='multiplayer';render();}else if(a==='create-room')connectRoom(false);else if(a==='join-room')connectRoom(true);else if(a==='start-round')network?.start();else if(a==='leave'){network?.disconnect();network=null;networkState=null;mode='multiplayer';render();}else if(a==='copy'){try{await navigator.clipboard.writeText(networkState.code);b.textContent='COPIED';}catch{b.textContent=networkState.code;}}else if(a==='about'){app.insertAdjacentHTML('beforeend',`<section class="pause-overlay"><div class="panel"><span class="eyebrow">A FICTIONAL AFTER-HOURS STORY</span><h1>Horror Tips<span>.</span></h1><p>A first-person horror game inspired by Wollongong West. This early 3D version uses an approximate school layout, ready for your location photos.</p><p>Characters are fictional. No affiliation with or endorsement by the school. Contains suspense, implied attacks, and sudden sounds.</p><p>WASD to move · Shift to run · Mouse to look · F for torch · Space to continue or time a step · Escape to pause.</p>${button('Back to the school','close-about','primary')}</div></section>`);}else if(a==='close-about')$('.pause-overlay')?.remove();});
app.addEventListener('input',e=>{const t=e.target;if(t.id==='volume'){settings.volume=+t.value;audio.setVolume(settings.volume);$('#volume-value').textContent=`${Math.round(settings.volume*100)}%`;}if(t.id==='brightness'){settings.brightness=+t.value;document.documentElement.style.setProperty('--brightness',settings.brightness);}if(t.id==='voice'){settings.voice=t.checked;audio.setVoice(settings.voice);}if(t.id==='motion'){settings.reducedMotion=t.checked;document.body.classList.toggle('reduce-motion',t.checked);}if(t.id==='quality')settings.quality=t.value;save('horror-tips-settings',settings);});
const keyMap={KeyW:'forward',ArrowUp:'forward',KeyS:'back',ArrowDown:'back',KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'sprint',ShiftRight:'sprint'};
window.addEventListener('keydown',e=>{if(/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName))return;if(keyMap[e.code])input[keyMap[e.code]]=true;if(e.code==='Space'){e.preventDefault();if(e.repeat)return;held=true;if(challenge?.type==='ring')hitRing();else if(storyKey)advance();}if(e.code==='KeyF')flashlight=!flashlight;if(e.code==='Escape'){if(paused){paused=false;$('.pause-overlay')?.remove();speechSynthesis?.resume();}else pause();}});
window.addEventListener('keyup',e=>{if(keyMap[e.code])input[keyMap[e.code]]=false;if(e.code==='Space')held=false;});
window.addEventListener('blur',()=>{Object.keys(input).forEach(k=>input[k]=false);held=false;if(mode==='campaign'&&!paused)pause();});
app.addEventListener('pointerdown',e=>{if(e.target.closest('#hold-button')){held=true;e.target.setPointerCapture?.(e.pointerId);}const m=e.target.closest('[data-move]');if(m){input[m.dataset.move]=true;m.setPointerCapture?.(e.pointerId);}});
for(const ev of ['pointerup','pointercancel'])app.addEventListener(ev,e=>{held=false;const m=e.target.closest('[data-move]');if(m)input[m.dataset.move]=false;});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse')return;lookPointer={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{if(!lookPointer||lookPointer.id!==e.pointerId||paused)return;touchLook.x-=(e.clientX-lookPointer.x)*.003;touchLook.y-=(e.clientY-lookPointer.y)*.003;lookPointer.x=e.clientX;lookPointer.y=e.clientY;});
for(const ev of ['pointerup','pointercancel'])canvas.addEventListener(ev,()=>lookPointer=null);
let last=performance.now();function frame(now){const rawDt=Math.min(1,Math.max(0,(now-last)/1000)),dt=Math.min(.05,rawDt);last=now;elapsed+=rawDt;
 if(!paused&&mode!=='settings'){
 sceneClock+=dt;
 if(mode==='campaign'&&storyKey){lineClock+=rawDt;const duration=story[storyKey][lineIndex][2],talking=settings.voice&&settings.volume>0&&window.speechSynthesis?.speaking;if(lineClock>=duration&&(!talking||lineClock>=duration+8))advance();}
 if(countdown>0&&scene==='choose'){countdown=Math.max(0,countdown-rawDt);const el=$('#timer strong');if(el)el.textContent=Math.ceil(countdown);if(countdown===0)travel('blue');}
 if(challenge){const c=challenge;c.time+=rawDt;c.cooldown=Math.max(0,c.cooldown-rawDt);if(c.type==='ring'){c.radius=150-c.time*57;if(c.radius<22){c.fails++;c.time=0;c.radius=150;audio.sting();if(c.fails>=3)fail();}}else{c.position=balanceStep(c.position,held,rawDt);if(c.position>=.3&&c.position<=.7){c.progress+=rawDt;c.outside=Math.max(0,c.outside-rawDt*.3);}else c.outside+=rawDt;if(c.outside>=2.8)fail();else if(c.progress>=10)winChallenge();}updateChallenge();}
 }
 const canMove=!paused&&(mode==='online'||(mode==='campaign'&&!!challenge));
 const me=networkState?.players.find(p=>p.id===network?.id),onlineLocked=mode==='online'&&(!me?.alive||(me?.isCreature&&networkState?.phase==='hiding'));
 const threat=challenge?Math.min(1,.36+(challenge.type==='ring'?challenge.fails*.16+challenge.time*.12:challenge.outside*.17)):(scene==='caught'?1:0);
 audio.setThreat(threat);
 audio.setPaused?.(paused||mode==='settings');
 document.documentElement.style.setProperty('--fear',paused?0:threat);
 world.update(paused||mode==='settings'?0:dt,{scene,time:sceneClock,storyKey,storyLine:lineIndex,lineTime:lineClock,lineProgress:storyKey?Math.min(1,lineClock/story[storyKey][lineIndex][2]):0,challengeProgress:challenge?.type==='ring'?challenge.hits/5:(challenge?.progress||0)/10,challengeFails:challenge?.fails||0,challengeType:challenge?.type,threat,frozen:scene==='spin'&&lineIndex>=1,moving:canMove&&!onlineLocked,playerInput:canMove&&!onlineLocked?input:{},look:lookPointer&&dt>0?{x:touchLook.x/dt,y:touchLook.y/dt}:undefined,isCreature:mode==='online'&&Boolean(me?.isCreature),flashlight,reducedMotion:settings.reducedMotion});
 touchLook.x=touchLook.y=0;
 if(canMove&&(input.forward||input.back||input.left||input.right)&&elapsed-lastStep>(input.sprint?.3:.46)){audio.step(['top','bottom'].includes(currentLocation)?'grass':'concrete',input.sprint);lastStep=elapsed;}
 if(mode==='online'&&network){netTick+=dt;if(netTick>.08){netTick=0;const p=world.getPose();network.move({x:p.x,z:p.z,yaw:p.rotation});}}
 requestAnimationFrame(frame);
}
window.addEventListener('resize',()=>world.resize());
menu();requestAnimationFrame(frame);
