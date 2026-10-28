/** Procedural stereo night soundscape. No remote assets or autoplay audio. */
export class AudioDirector {
  constructor() {
    Object.assign(this, { volume: 0.65, voice: true, threat: 0, paused: false, scene: 'menu', context: null, nodes: [], timer: null, lastBeat: -10, lastStep: -10, lastSting: -10, lastThreatUpdate: -10, appliedThreat: -1, nextAmbient: 8, nextBreath: 0, foot: 1, lastSpoken: '', lastSpokenAt: -10, hushUntil:0 });
    this.transients = new Set();
    this.cooldowns = new Map();
  }
  async unlock() {
    try {
      if (!this.context) this.init();
      if (this.context?.state === 'suspended') await this.context.resume();
    } catch { /* Captions and play remain available without audio support. */ }
  }
  init() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const ctx = this.context = new Context();
    this.master = ctx.createGain();
    this.master.gain.value = this.paused ? 0 : this.volume;
    const limiter = ctx.createDynamicsCompressor();
    Object.assign(limiter.threshold, { value: -20 });
    limiter.knee.value = 16;
    limiter.ratio.value = 10;
    limiter.attack.value = 0.006;
    limiter.release.value = 0.25;
    this.master.connect(limiter).connect(ctx.destination);
    this.bed = ctx.createGain();
    this.bed.connect(this.master);
    this.airLevel=ctx.createGain();this.airLevel.connect(this.bed);
    this.nodes.push(this.master, limiter, this.bed,this.airLevel);
    this.noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    this.whiteBuffer = ctx.createBuffer(1, ctx.sampleRate * 5, ctx.sampleRate);
    const brown = this.noiseBuffer.getChannelData(0), white = this.whiteBuffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < brown.length; i++) {
      white[i] = Math.random() * 2 - 1;
      previous = (previous + white[i] * 0.018) / 1.018;
      brown[i] = previous * 5;
    }
    this.windLayer(this.noiseBuffer, 'lowpass', 520, 0.13, -0.6, 0.055);
    this.windLayer(this.whiteBuffer, 'bandpass', 1350, 0.018, 0.65, 0.034);
    this.windLayer(this.whiteBuffer, 'highpass', 3800, 0.003, -0.25, 0.023);
    this.droneLevel = ctx.createGain();
    this.droneLevel.gain.value = 0.012;
    this.droneLevel.connect(this.bed);
    this.nodes.push(this.droneLevel);
    for (const frequency of [43.65, 65.41]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = frequency;
      osc.connect(this.droneLevel); osc.start(); this.nodes.push(osc);
    }
    // Low traffic is synthesized locally. Indoors it gives way to a quiet
    // fluorescent mains hum; the event cues remain separate from these beds.
    this.trafficLevel=ctx.createGain();this.trafficLevel.connect(this.bed);
    const traffic=ctx.createBufferSource(),trafficFilter=ctx.createBiquadFilter();
    traffic.buffer=this.noiseBuffer;traffic.loop=true;traffic.playbackRate.value=.65;
    trafficFilter.type='lowpass';trafficFilter.frequency.value=170;
    traffic.connect(trafficFilter).connect(this.trafficLevel);traffic.start();
    this.roomLevel=ctx.createGain();this.roomLevel.connect(this.bed);
    const roomHum=ctx.createOscillator();roomHum.frequency.value=100;
    roomHum.connect(this.roomLevel);roomHum.start();
    this.nodes.push(this.trafficLevel,traffic,trafficFilter,this.roomLevel,roomHum);
    this.applySceneAmbience();
    this.nextAmbient = ctx.currentTime + 6 + Math.random() * 7;
    this.nextBreath = ctx.currentTime + 2;
    this.timer = setInterval(() => this.pulse(), 100);
  }
  windLayer(buffer, type, frequency, level, pan, speed) {
    const ctx = this.context, source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), panner = ctx.createStereoPanner();
    source.buffer = buffer; source.loop = true; source.playbackRate.value = 0.8 + Math.random() * 0.3;
    filter.type = type; filter.frequency.value = frequency; filter.Q.value = 0.6;
    gain.gain.value = level; panner.pan.value = pan;
    source.connect(filter).connect(gain).connect(panner).connect(this.airLevel);
    const lfo = ctx.createOscillator(), depth = ctx.createGain(), filterDepth = ctx.createGain();
    lfo.frequency.value = speed; depth.gain.value = level * 0.5; filterDepth.gain.value = frequency * 0.25;
    lfo.connect(depth).connect(gain.gain); lfo.connect(filterDepth).connect(filter.frequency);
    source.start(0, Math.random() * 4); lfo.start();
    this.nodes.push(source, filter, gain, panner, lfo, depth, filterDepth);
  }
  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    this.applyMaster();
    if (!this.volume) {this.stopTransients();window.speechSynthesis?.cancel();}
  }
  applyMaster() {
    if (!this.context || !this.master) return;
    const now = this.context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(this.paused ? 0 : this.volume, now, 0.06);
  }
  setVoice(enabled) {
    this.voice = Boolean(enabled);
    if (!this.voice) window.speechSynthesis?.cancel();
  }
  setPaused(enabled) {
    const paused = Boolean(enabled);
    if (paused === this.paused) return;
    this.paused = paused; this.applyMaster();
    const synth = window.speechSynthesis;
    if (paused) {this.stopTransients();synth?.pause();}
    else {
      if (this.voice && this.volume) synth?.resume();
      const now = this.context?.currentTime || 0;
      this.lastBeat = now; this.nextBreath = now + 1.5; this.nextAmbient = now + 4 + Math.random() * 5;
    }
  }
  setScene(name) {
    const scene = String(name || 'menu');
    if (scene === this.scene) return;
    this.scene = scene; this.nextAmbient = (this.context?.currentTime || 0) + 5 + Math.random() * 7;
    this.applySceneAmbience();
    if (['transform', 'chase'].includes(scene)) this.cue('growl');
    else if (scene === 'bathroom') this.cue('creak');
    else if (scene === 'ending') this.cue('bell');
  }
  applySceneAmbience(){
    const ctx=this.context;if(!ctx||!this.airLevel)return;
    const indoor=['bathroom','office','canteen','blackout','restored'].includes(this.scene),street=['street','outside'].includes(this.scene);
    const values=[[this.airLevel,indoor?.18:this.scene==='vanish'?.35:street?.9:1],[this.trafficLevel,this.scene==='street'?.018:this.scene==='outside'?.008:0],[this.roomLevel,indoor&&this.scene!=='blackout'?.0025:0]];
    for(const [node,value]of values){node.gain.cancelScheduledValues(ctx.currentTime);node.gain.setTargetAtTime(value,ctx.currentTime,.7);}
    this.appliedThreat=-1;this.lastThreatUpdate=-10;this.setThreat(this.threat);
  }
  setThreat(value) {
    this.threat = Math.max(0, Math.min(1, Number(value) || 0));
    const ctx = this.context;
    // Render-loop calls are quantized: no unbounded per-frame automation queue.
    if (!ctx || !this.droneLevel || Math.abs(this.threat - this.appliedThreat) < 0.035 || ctx.currentTime - this.lastThreatUpdate < 0.12) return;
    this.lastThreatUpdate = ctx.currentTime; this.appliedThreat = this.threat;
    this.droneLevel.gain.cancelScheduledValues(ctx.currentTime);
    this.droneLevel.gain.setTargetAtTime(0.012 + this.threat * 0.035, ctx.currentTime, 0.45);
  }
  pulse() {
    const ctx = this.context;
    if (!this.canPlay()) return;
    const now = ctx.currentTime, talking = Boolean(window.speechSynthesis?.speaking), bedVolume = (talking ? 0.55 : 1)*(now<this.hushUntil?.035:1);
    if (bedVolume !== this.bedVolume) {
      this.bedVolume = bedVolume; this.bed.gain.setTargetAtTime(bedVolume, now, 0.25);
    }
    if(now<this.hushUntil)return;
    if (this.threat > 0.12 && now - this.lastBeat >= 1.12 - this.threat * 0.58) {
      this.lastBeat = now;
      this.tone(51, 0.15, 0.07 * this.threat, now); this.tone(42, 0.12, 0.04 * this.threat, now + 0.17);
    }
    if (this.threat > 0.24 && now >= this.nextBreath && !talking) {
      this.creatureBreath(); this.nextBreath = now + 3.4 - this.threat * 1.4 + Math.random() * 1.2;
    }
    if (now >= this.nextAmbient) {
      this.nextAmbient = now + 10 + Math.random() * 15;
      if (!talking && this.threat < 0.75) {
        const options = this.scene === 'bathroom' ? ['creak', 'crackle', 'distantSteps'] : ['office','canteen','blackout'].includes(this.scene)?['creak','crackle','lurevoice']:this.scene==='street'?['rustle','siren','footstepsbehind']:this.scene==='outside'?['gate','rustle','distantSteps']:this.scene==='vanish'?['whisper','crackle']:['rustle', 'distantSteps', 'creak', 'rustle', 'bell', 'crackle'];
        this.cue(options[Math.floor(Math.random() * options.length)]);
      }
    }
  }
  canPlay() { return this.context?.state === 'running' && !this.paused && this.volume > 0; }
  stopTransients(){
    for(const group of this.transients){try{group[0].stop();}catch{/* A completed source is already stopped. */}for(const node of group)node.disconnect();}
    this.transients.clear();
  }
  transient(source, nodes, when, duration) {
    const group = [source, ...nodes]; this.transients.add(group);
    source.onended = () => { for (const node of group) node.disconnect(); this.transients.delete(group); };
    source.start(when); source.stop(when + duration + 0.03);
  }
  tone(frequency, duration, volume, when = this.context?.currentTime, options = {}) {
    if (!this.canPlay()) return;
    const ctx = this.context, osc = ctx.createOscillator(), gain = ctx.createGain(), panner = ctx.createStereoPanner();
    when = Math.max(ctx.currentTime, when || 0);
    panner.pan.value = options.pan || 0; osc.type = options.type || 'sine';
    osc.frequency.setValueAtTime(frequency, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.endFrequency || frequency * 0.55), when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + Math.min(0.02, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain).connect(panner).connect(this.master);
    this.transient(osc, [gain, panner], when, duration);
  }
  noise(duration, volume, options = {}) {
    if (!this.canPlay()) return;
    const ctx = this.context, when = ctx.currentTime + (options.delay || 0), source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain(), panner = ctx.createStereoPanner();
    source.buffer = options.brown ? this.noiseBuffer : this.whiteBuffer; source.playbackRate.value = options.rate || 1; source.loop = duration > 4;
    filter.type = options.type || 'bandpass'; filter.Q.value = options.q || 0.7;
    filter.frequency.setValueAtTime(options.frequency || 850, when);
    if (options.endFrequency) filter.frequency.exponentialRampToValueAtTime(options.endFrequency, when + duration);
    const attack = Math.min(duration * 0.45, options.attack || 0.02);
    gain.gain.setValueAtTime(0.0001, when); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + attack); gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    panner.pan.value = options.pan || 0;
    source.connect(filter).connect(gain).connect(panner).connect(this.master);
    this.transient(source, [filter, gain, panner], when, duration);
  }
  creatureBreath() {
    if (!this.canPlay()) return;
    const pan = (Math.random() < 0.5 ? -1 : 1) * (0.75 - this.threat * 0.55);
    this.noise(1.5, 0.014 + this.threat * 0.026, { frequency: 330, endFrequency: 760, attack: 0.45, pan, brown: true });
    this.noise(1.1, 0.008 + this.threat * 0.018, { delay: 1.05, frequency: 600, endFrequency: 180, attack: 0.2, pan });
    if (this.threat > 0.58) {
      this.tone(62, 1.6, 0.012 + this.threat * 0.014, undefined, { endFrequency: 39, pan, type: 'triangle' });
      this.tone(89, 1.3, 0.008, undefined, { endFrequency: 53, pan });
    }
  }
  step(surface = 'concrete', sprint = false) {
    if (!this.canPlay()) return;
    const ctx = this.context;
    if (ctx.currentTime - this.lastStep < (sprint ? 0.25 : 0.38)) return;
    this.lastStep = ctx.currentTime; this.foot *= -1;
    const pan = this.foot * 0.15, outdoor = ['grass', 'dirt', 'oval', 'top', 'bottom'].includes(surface), tiled = ['tile', 'bathroom'].includes(surface), wood = surface === 'wood', weight = sprint ? 1.2 : 0.85;
    this.noise(outdoor ? 0.24 : 0.12, (outdoor ? 0.06 : 0.035) * weight, { frequency: outdoor ? 1900 : tiled ? 1900 : wood ? 650 : 950, type: outdoor ? 'highpass' : 'bandpass', rate: 0.8 + Math.random() * 0.25, pan });
    this.tone((outdoor ? 72 : tiled ? 155 : wood ? 110 : 87) + Math.random() * 10, 0.09, 0.035 * weight, undefined, { pan });
    if (tiled) this.noise(0.18, 0.009, { frequency: 1300, delay: 0.075, pan: -pan });
  }
  cue(name) {
    if (!this.canPlay()) return;
    // The narrative uses "book" for the same quiet paper/PA cue as rule narration.
    // Normalize before the cooldown so a book opening and its line do not double up.
    name=({book:'rule',suddenstop:'vanish',creaturevanish:'vanish',footstepsbehind:'footstepsbehind',powercut:'powercut',powerrestored:'powerrestore',restored:'powerrestore',lurevoiceambient:'lurevoice'})[String(name).toLowerCase()]||name;
    const now = this.context.currentTime, cooldown = ({bell:45,growl:8,rule:2,gate:8,charge:5,vanish:5,grab:4,struggle:3,impact:.65,whisper:10,siren:18,footstepsbehind:4,powercut:6,breaker:2,powerrestore:6,lurevoice:12})[name]??5;
    if (now - (this.cooldowns.get(name) ?? -100) < cooldown) return;
    this.cooldowns.set(name, now);
    const pan = (Math.random() < 0.5 ? -1 : 1) * (0.45 + Math.random() * 0.4);
    if(name==='breaker'){
      this.noise(.065,.022,{frequency:1500,pan:0});
      this.tone(136,.14,.018,now,{endFrequency:66,pan:0});
      this.noise(.1,.013,{frequency:520,delay:.14,pan:.1});
    }else if(name==='powerrestore'){
      this.hushUntil=now;this.bedVolume=undefined;
      this.bed.gain.cancelScheduledValues(now);this.bed.gain.setTargetAtTime(window.speechSynthesis?.speaking?.55:1,now,.45);
      this.noise(.65,.011,{frequency:2700,endFrequency:430,attack:.07,pan:0});
      this.tone(92,1.2,.008,now,{endFrequency:100,pan:0});
      this.tone(410,.8,.003,now+.17,{endFrequency:445,pan:-.2});
      this.applySceneAmbience();
    }else if(name==='lurevoice'){
      // Breath and formant-like tones suggest a voice without intelligible words.
      this.noise(1.25,.009,{frequency:950,endFrequency:420,attack:.3,pan});
      this.tone(167,.9,.003,now+.1,{type:'triangle',endFrequency:138,pan});
      this.tone(335,.8,.002,now+.2,{endFrequency:276,pan:pan*.7});
      this.noise(.42,.006,{frequency:1800,endFrequency:780,delay:.72,attack:.1,pan:-pan*.4});
    }else if(name==='vanish'||name==='powercut'){
      // Stop the charge's not-yet-played steps before creating the withdrawal.
      this.stopTransients();this.hushUntil=now+(name==='powercut'?2.8:1.25);
      this.bedVolume=.035;this.bed.gain.cancelScheduledValues(now);this.bed.gain.setTargetAtTime(.035,now,.035);
      this.noise(name==='powercut'?.07:.45,name==='powercut'?.016:.014,{frequency:name==='powercut'?1900:1200,endFrequency:150,pan:name==='powercut'?0:-pan});
      this.tone(name==='powercut'?105:130,.65,.014,now,{endFrequency:32,pan:0});
    }else if(name==='gate'){
      this.tone(260,1.45,.013,now,{type:'triangle',endFrequency:82,pan});
      this.tone(395,.95,.006,now+.12,{endFrequency:141,pan:-pan*.4});
      this.noise(.55,.018,{frequency:680,q:2.4,attack:.08,pan});
      this.noise(.14,.018,{frequency:310,delay:.75,pan});
    }else if(name==='charge'||name==='footstepsbehind'){
      const charge=name==='charge',count=charge?7:4;
      for(let i=0;i<count;i++){
        const delay=charge?i*.23-i*i*.005:i*.39;
        const side=(i%2?1:-1)*(charge?.32:.58);
        this.noise(.13,(charge?.018:.01)+i*.001,{frequency:charge?460:620,delay,pan:side,brown:true});
        this.tone(charge?58:76,.14,charge?.018:.01,now+delay,{endFrequency:charge?34:53,pan:side});
      }
      if(charge)this.noise(1.5,.022,{frequency:250,endFrequency:650,attack:.5,pan:0,brown:true});
    }else if(name==='grab'||name==='struggle'||name==='impact'){
      const struggle=name==='struggle';
      this.noise(struggle?.8:.2,struggle?.023:.027,{frequency:struggle?1300:440,endFrequency:struggle?350:160,attack:.018,pan:pan*.2,brown:!struggle});
      this.tone(name==='impact'?68:85,.28,.027,now,{endFrequency:31,pan:0});
      if(name==='grab')this.noise(.45,.013,{frequency:1900,delay:.08,pan:-pan*.3});
      if(struggle)for(let i=1;i<4;i++)this.noise(.14,.011,{frequency:850,delay:i*.18,pan:i%2?.35:-.35});
    }else if(name==='whisper'){
      for(let i=0;i<3;i++)this.noise(.5-i*.07,.009,{frequency:1050+i*220,endFrequency:650,delay:i*.28,attack:.12,pan:i===1?-pan:pan});
    }else if(name==='siren'){
      for(let i=0;i<3;i++){
        this.tone(490,.8,.0035,now+i*1.6,{endFrequency:660,pan:pan*.3});
        this.tone(660,.8,.0035,now+i*1.6+.8,{endFrequency:490,pan:pan*.3});
      }
    }else if (['rustle', 'paper', 'rule'].includes(name)) {
      const paper = name !== 'rustle';
      this.noise(paper ? 0.55 : 1.7, paper ? 0.017 : 0.018, { frequency: paper ? 2500 : 1800, endFrequency: 800, attack: paper ? 0.08 : 0.5, pan });
      this.noise(0.3, 0.009, { frequency: 3500, delay: 0.23, pan });
      if (name === 'rule') this.noise(0.3, 0.012, { frequency: 1700, delay: 0.55, pan: 0 });
    } else if (name === 'creak' || name === 'freeze') {
      this.tone(230, 1.25, 0.009, now, { type: 'triangle', endFrequency: 150, pan });
      this.tone(345, 0.8, 0.005, now + 0.3, { endFrequency: 205, pan });
      this.noise(0.8, 0.012, { frequency: 750, q: 3, attack: 0.15, pan });
      if (name === 'freeze') {
        this.tone(1360, 1.7, 0.003, now + 0.12, { endFrequency: 1450, pan: -pan });
        this.noise(0.75, 0.007, { frequency: 3200, endFrequency: 1200, attack: 0.2, pan });
      }
    } else if (name === 'distantSteps') {
      for (let i = 0; i < 3; i++) {
        this.noise(0.13, 0.012 - i * 0.0015, { frequency: 540, delay: i * (0.48 + Math.random() * 0.08), pan });
        this.tone(78 + Math.random() * 12, 0.13, 0.014, now + i * 0.5, { pan });
      }
    } else if (name === 'bell') {
      for (const [frequency, volume] of [[510, 0.012], [817, 0.006], [1128, 0.003]]) this.tone(frequency, 3.2, volume, now, { endFrequency: frequency * 0.995, pan });
    } else if (name === 'crackle') {
      for (let i = 0; i < 5; i++) this.noise(0.025 + Math.random() * 0.08, 0.006, { frequency: 2200, delay: i * 0.13, pan });
      this.tone(100, 0.75, 0.007, now, { endFrequency: 97, pan });
    } else if (name === 'transition') {
      this.cue('rustle');
      this.cue('distantSteps');
    } else if (name === 'growl') this.creatureBreath();
    else if (name === 'reveal') this.sting();
  }
  sting() {
    if (!this.canPlay()) return;
    const now = this.context.currentTime;
    if (now - this.lastSting < 5) return;
    this.lastSting = now;
    for (const frequency of [41, 82, 117]) this.tone(frequency, 1.3, 0.035, now);
    this.noise(0.7, 0.022, { frequency: 950, endFrequency: 200, attack: 0.04 });
  }
  say(text, speaker = '') {
    const synth = window.speechSynthesis;
    if (!this.voice || !this.volume || this.paused || !synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    // cancel() can leave the browser speech engine paused after a menu transition.
    // A new active line must restore that engine without changing our pause state.
    if (synth.paused) synth.resume();
    const line = String(text).trim(), label = String(speaker).toLowerCase(), now = performance.now() / 1000, key = `${label}:${line}`;
    if (!line || (key === this.lastSpoken && (synth.speaking || now - this.lastSpokenAt < 4))) return;
    this.lastSpoken = key; this.lastSpokenAt = now; synth.cancel();
    const utterance = new SpeechSynthesisUtterance(line), rule = label.includes('rule'), finn = label.includes('finn'), spinner = label.includes('spinner'), sonny = label.includes('sonny');
    utterance.lang = 'en-AU'; utterance.rate = rule ? 0.76 : finn ? 0.82 : spinner ? 0.87 : sonny ? 1.05 : 0.92; utterance.pitch = rule ? 0.52 : finn ? 0.88 : spinner ? 0.74 : sonny ? 1.12 : 1; utterance.volume = this.volume * 0.9;
    const english = synth.getVoices().filter(v => v.lang.startsWith('en')), preferred = english.filter(v => v.lang === 'en-AU'), pool = preferred.length ? preferred : english, index = rule ? 0 : finn ? 1 : sonny ? 2 : spinner ? 0 : 1;
    if (pool.length) utterance.voice = pool[index % pool.length];
    if (rule) this.cue('rule');
    synth.speak(utterance);
  }
  dispose() {
    clearInterval(this.timer); window.speechSynthesis?.cancel();
    this.stopTransients();
    for (const node of this.nodes) {
      try { node.stop?.(); node.disconnect(); } catch { /* Already released. */ }
    }
    this.context?.close(); this.context = null; this.nodes = [];
  }
}
