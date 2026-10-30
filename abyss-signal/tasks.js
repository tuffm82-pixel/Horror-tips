export function createTaskState(type,index=0){
 const s={type,round:0,value:.5,progress:0,held:false,bits:0,code:'',done:false,mistake:false,outside:0};
 const targets=[5,3,6],frequencies=[.28+(index%3)*.12,.73,.42];
 s.target=()=>type==='circuits'?targets[s.round]:frequencies[s.round];
 s.act=value=>{
  if(s.done)return;s.mistake=false;
  if(type==='circuits'){if(value==='submit'){if(s.bits===s.target()){s.round++;s.bits=0;if(s.round===3)s.done=true;}else s.mistake=true;}else s.bits^=1<<Number(value);}
  if(type==='code'){if(value==='clear')s.code='';else if(value==='submit'){if(s.code==='1709')s.done=true;else{s.mistake=true;s.code='';}}else if(s.code.length<4)s.code+=String(value);}
 };
 s.update=dt=>{if(s.done)return;dt=Math.max(0,Math.min(.1,dt));s.mistake=false;
  if(type==='pressure'){s.value=Math.max(.05,Math.min(.95,s.value+(s.held?.26:-.19)*dt));if(s.value>.37&&s.value<.63){s.progress+=dt;s.outside=0;}else{s.outside+=dt;s.progress=Math.max(0,s.progress-dt*.35);}if(s.outside>1.7){s.value=.5;s.outside=0;s.mistake=true;}if(s.progress>=10)s.done=true;}
  if(type==='frequency'){if(Math.abs(s.value-s.target())<.035)s.progress+=dt;else s.progress=Math.max(0,s.progress-dt*2);if(s.progress>=1.5){s.round++;s.progress=0;if(s.round===3)s.done=true;}}
 };
 return s;
}
export function createTasks({onComplete,onNoise=()=>{}}){
 const el=document.createElement('section');el.id='task-panel';el.hidden=true;el.setAttribute('aria-label','Station repair puzzle');document.body.append(el);let state=null,stage=null;
 function close(){state=null;stage=null;el.hidden=true;}
 function render(){if(!state)return;const s=state;el.innerHTML=`<button class="task-close" aria-label="Leave station">✕</button><div class="eyebrow">MANUAL OVERRIDE / ${stage.id.toUpperCase()}</div><h2>${{pressure:'Steady the pressure',circuits:'Restore the circuits',frequency:'Find the carrier',code:'Archive access'}[s.type]}</h2><div id="task-content"></div><p class="task-warning">The station is still live. You can be found here.</p>`;
  el.querySelector('.task-close').onclick=close;const content=el.querySelector('#task-content');
  if(s.type==='pressure'){content.innerHTML='<p>Hold to raise the needle. Release to lower it. Keep it in the green band for 10 seconds.</p><div class="pressure-track"><i></i><b id="task-needle"></b></div><progress id="task-progress" max="10" value="0"></progress><button id="task-hold" class="primary">HOLD TO PUMP / SPACE</button>';const hold=el.querySelector('#task-hold');hold.onpointerdown=e=>{s.held=true;hold.setPointerCapture(e.pointerId);e.preventDefault();};for(const event of ['pointerup','pointercancel','lostpointercapture'])hold.addEventListener(event,()=>s.held=false);}
  if(s.type==='frequency'){content.innerHTML='<p>Slide to match the displayed carrier. Hold each frequency steady until the receiver locks.</p><div id="task-frequency"></div><input id="task-slider" aria-label="Receiver frequency" type="range" min="0" max="100" value="50"><progress id="task-progress" max="1.5" value="0"></progress>';el.querySelector('#task-slider').oninput=e=>s.value=Number(e.target.value)/100;}
  if(s.type==='circuits'){content.innerHTML='<p>Match the three switches to the target lights, then confirm. Complete three banks.</p><div id="task-targets" class="circuit-row"></div><div id="task-switches" class="circuit-row"></div><button id="task-submit" class="primary">CONFIRM BANK</button>';for(let i=2;i>=0;i--){const button=document.createElement('button');button.textContent=`${3-i}`;button.onclick=()=>{s.act(i);sync();};el.querySelector('#task-switches').append(button);}el.querySelector('#task-submit').onclick=()=>{s.act('submit');if(s.mistake)onNoise();sync();};}
  if(s.type==='code'){content.innerHTML='<p>Mara’s cabin recording: “Seventeen. Zero nine.”</p><div id="task-code">_ _ _ _</div><div class="keypad"></div><button id="task-submit" class="primary">UNSEAL ARCHIVE</button>';for(const digit of ['1','2','3','4','5','6','7','8','9','clear','0']){const button=document.createElement('button');button.textContent=digit==='clear'?'⌫':digit;button.onclick=()=>{s.act(digit);sync();};el.querySelector('.keypad').append(button);}el.querySelector('#task-submit').onclick=()=>{s.act('submit');if(s.mistake)onNoise();sync();};}
  sync();
 }
 function sync(){if(!state)return;const s=state;
  if(s.type==='pressure'){el.querySelector('#task-needle').style.left=`${s.value*100}%`;el.querySelector('#task-progress').value=s.progress;}
  if(s.type==='frequency'){el.querySelector('#task-frequency').textContent=`CARRIER ${Math.round(s.target()*100)||0} MHz · BANK ${Math.min(3,s.round+1)}/3`;el.querySelector('#task-progress').value=s.progress;}
  if(s.type==='circuits'){el.querySelector('#task-targets').innerHTML=[2,1,0].map(i=>`<i class="${s.target()&(1<<i)?'lit':''}"></i>`).join('');[...el.querySelector('#task-switches').children].forEach((b,i)=>b.classList.toggle('lit',!!(s.bits&(1<<(2-i)))));}
  if(s.type==='code')el.querySelector('#task-code').textContent=s.code.padEnd(4,'_').split('').join(' ');
 }
 return{get active(){return !!state;},get id(){return stage?.id;},get state(){return state;},open(next){stage=next;state=createTaskState(next.puzzle,Number(next.index)||0);el.hidden=false;render();},close,
  update(dt){if(!state)return;state.update(dt);if(state.mistake)onNoise();if(state.done){const id=stage.id;close();onComplete(id);return;}sync();},
  key(code,down){if(state&&code==='Space'){state.held=down;return true;}return false;},setVisible(value){el.hidden=!value||!state;}};
}
