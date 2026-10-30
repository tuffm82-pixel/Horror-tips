// All sound is synthesized locally. Audio starts only from the player's gesture;
// no downloads, media autoplay, or speech services are required on iPad.
export function createAudio() {
  let context, master, compressor, ambience, breath, heartbeatTimer, noiseBuffer;
  let muted=false, threat=0, lastBeat=0, lastKnock=0, started=false, disposed=false;
  const continuous=[];
  function smooth(param,value,seconds=.18) { if(context) param.setTargetAtTime(value,context.currentTime,seconds); }
  function noise(duration, volume, frequency, resonance=1, delay=0) {
    if(!context || context.state!=='running')return;
    const source=context.createBufferSource(), filter=context.createBiquadFilter(), gain=context.createGain();
    source.buffer=noiseBuffer;source.loop=true; filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=resonance;
    const now=context.currentTime+delay;gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.025);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    source.connect(filter).connect(gain).connect(master);source.start(now);source.stop(now+duration+.02);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  function tone(frequency,endFrequency,duration,volume,type='sine',delay=0) {
    if(!context || context.state!=='running')return;
    const oscillator=context.createOscillator(),gain=context.createGain(),now=context.currentTime+delay;
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,now);oscillator.frequency.exponentialRampToValueAtTime(Math.max(10,endFrequency),now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    oscillator.connect(gain).connect(master);oscillator.start(now);oscillator.stop(now+duration+.02);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  async function start() {
    if(disposed)return;
    if(context){await context.resume();return;}
    const Constructor=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Constructor)return;
    try {
      context=new Constructor();master=context.createGain();master.gain.value=muted?0:.45;
      compressor=context.createDynamicsCompressor();compressor.threshold.value=-14;compressor.knee.value=18;compressor.ratio.value=6;compressor.attack.value=.004;compressor.release.value=.24;
      master.connect(compressor).connect(context.destination);
      noiseBuffer=context.createBuffer(1,context.sampleRate*3,context.sampleRate);
      const channel=noiseBuffer.getChannelData(0);let brown=0;
      for(let i=0;i<channel.length;i++){brown=(brown+(Math.random()*2-1)*.04)/1.02;channel[i]=brown*3.5;}
      const sea=context.createBufferSource();sea.buffer=noiseBuffer;sea.loop=true;
      const seaFilter=context.createBiquadFilter();seaFilter.type='lowpass';seaFilter.frequency.value=260;
      ambience=context.createGain();ambience.gain.value=.13;sea.connect(seaFilter).connect(ambience).connect(master);sea.start();continuous.push(sea,seaFilter,ambience);
      for(const frequency of [38,57.06,76.13]) {
        const oscillator=context.createOscillator(),gain=context.createGain();oscillator.frequency.value=frequency;gain.gain.value=.022;
        oscillator.connect(gain).connect(master);oscillator.start();continuous.push(oscillator,gain);
      }
      breath=context.createGain();breath.gain.value=.005;
      const air=context.createBufferSource();air.buffer=noiseBuffer;air.loop=true;
      const airFilter=context.createBiquadFilter();airFilter.type='bandpass';airFilter.frequency.value=710;airFilter.Q.value=.8;
      air.connect(airFilter).connect(breath).connect(master);air.start();continuous.push(air,airFilter,breath);
      started=true;lastKnock=context.currentTime;lastBeat=context.currentTime;
      heartbeatTimer=setInterval(()=>{
        if(context.state!=='running')return;
        const now=context.currentTime;
        smooth(breath.gain,(.012+threat*.095)*(.35+.65*Math.pow(Math.sin(now*(1.2+threat)),2)),.12);
        if(threat>.12 && now-lastBeat>1.15-threat*.65){lastBeat=now;tone(65,38,.15,.08+threat*.13);tone(54,31,.12,.06+threat*.08,'sine',.17);}
        if(now-lastKnock>10+Math.random()*9){lastKnock=now;noise(1.7,.1,110,4);tone(133,47,2.8,.09);}
      },120);
      await context.resume();
    }catch{
      // A partial audio initialization must not leave a background scheduler or
      // an unusable context that prevents a later gesture from retrying.
      clearInterval(heartbeatTimer);started=false;
      continuous.splice(0).forEach(node=>{try{node.stop?.();node.disconnect();}catch{}});
      try{await context?.close();}catch{}
      context=null;master=null;ambience=null;breath=null;
    }
  }
  function cue(name) {
    if(!started || disposed)return;
    switch(name) {
      case 'interact': tone(720,390,.13,.11,'triangle');noise(.12,.06,1200);break;
      case 'step': noise(.17,.065,160,1);tone(90,45,.09,.045);break;
      case 'alarm': [0,.4,.8].forEach(delay=>tone(330,310,.29,.12,'triangle',delay));break;
      case 'scare': noise(1.3,.34,750,.8);tone(92,27,2.2,.3,'sawtooth');tone(441,129,1.4,.13,'triangle',.08);break;
      case 'death': noise(1.8,.34,480,.6);tone(70,19,2.8,.34,'sawtooth');tone(630,41,1.2,.1,'triangle');break;
      case 'whisper': [0,.16,.37,.64].forEach((delay,i)=>noise(.20,.08+i*.015,900+i*220,.8,delay));tone(87,73,1.8,.065);break;
      case 'win': [196,246.94,293.66,392].forEach((f,i)=>tone(f,f,2.3,.08,'sine',i*.35));break;
      default: noise(.5,.08,220);
    }
  }
  return {
    start,cue,
    setThreat(value){threat=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));if(ambience)smooth(ambience.gain,.13+threat*.07);},
    setMuted(value){muted=Boolean(value);if(master)smooth(master.gain,muted?0:.45,.045);},
    suspend(){return context?.suspend();},
    resume(){return context?.resume();},
    dispose(){disposed=true;started=false;clearInterval(heartbeatTimer);continuous.splice(0).forEach(node=>{try{node.stop?.();node.disconnect();}catch{}});context?.close().catch(()=>{});context=null;}
  };
}
