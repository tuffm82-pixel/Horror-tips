/** Original, synthesized soundscape. Audio starts only after a player gesture. */
export class AudioDirector {
  constructor() {
    this.volume = 0.65;
    this.voice = true;
    this.threat = 0;
    this.context = null;
    this.nodes = [];
    this.lastBeat = 0;
    this.lastStep = 0;
    this.timer = null;
  }

  async unlock() {
    try {
      if (!this.context) this.init();
      if (this.context?.state === 'suspended') await this.context.resume();
    } catch { /* The campaign remains playable when a browser blocks audio. */ }
  }

  init() {
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return;
    const ctx = this.context = new Context();
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -16;
    limiter.knee.value = 20;
    limiter.ratio.value = 8;
    this.master.connect(limiter).connect(ctx.destination);
    this.nodes.push(this.master, limiter);

    const noise = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      brown = (brown + (Math.random() * 2 - 1) * 0.018) / 1.018;
      data[i] = brown * 5;
    }
    this.noiseBuffer = noise;
    const wind = ctx.createBufferSource();
    wind.buffer = noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 650;
    const windLevel = ctx.createGain();
    windLevel.gain.value = 0.18;
    wind.connect(windFilter).connect(windLevel).connect(this.master);
    wind.start();
    this.nodes.push(wind, windFilter, windLevel);

    this.droneLevel = ctx.createGain();
    this.droneLevel.gain.value = 0.028;
    this.droneLevel.connect(this.master);
    for (const frequency of [43.65, 65.41, 87.7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = frequency;
      osc.connect(this.droneLevel);
      osc.start();
      this.nodes.push(osc);
    }
    this.nodes.push(this.droneLevel);
    this.timer = setInterval(() => this.pulse(), 100);
  }

  setVolume(value) {
    this.volume = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.context) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.08);
    if (this.volume === 0) window.speechSynthesis?.cancel();
  }

  setVoice(enabled) {
    this.voice = Boolean(enabled);
    if (!this.voice) window.speechSynthesis?.cancel();
  }

  setThreat(value) {
    this.threat = Math.max(0, Math.min(1, Number(value) || 0));
    if (this.context) this.droneLevel.gain.setTargetAtTime(0.028 + this.threat * 0.055, this.context.currentTime, 0.3);
  }

  pulse() {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || this.threat < 0.08) return;
    const now = ctx.currentTime;
    if (now - this.lastBeat < 1.05 - this.threat * 0.58) return;
    this.lastBeat = now;
    this.tone(52, 0.13, 0.12 * this.threat, now);
    this.tone(43, 0.1, 0.08 * this.threat, now + 0.16);
  }

  tone(frequency, duration, volume, when = this.context?.currentTime) {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(frequency, when);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, frequency * 0.55), when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain).connect(this.master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }

  step() {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running' || ctx.currentTime - this.lastStep < 0.2) return;
    this.lastStep = ctx.currentTime;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    source.playbackRate.value = 0.7 + Math.random() * 0.2;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 450;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.16);
    source.connect(filter).connect(gain).connect(this.master);
    source.start();
    source.stop(ctx.currentTime + 0.18);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
    this.tone(85 + Math.random() * 15, 0.08, 0.045);
  }

  sting() {
    const ctx = this.context;
    if (!ctx || ctx.state !== 'running') return;
    for (const frequency of [41, 82, 117, 169]) this.tone(frequency, 1.1, 0.065);
  }

  say(text, speaker = '') {
    const synth = window.speechSynthesis;
    if (!this.voice || !this.volume || !synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = 'en-AU';
    utterance.rate = speaker.toLowerCase().includes('rule') ? 0.78 : 0.9;
    utterance.pitch = speaker.toLowerCase().includes('rule') ? 0.65 : 0.9;
    utterance.volume = this.volume;
    const voices = synth.getVoices();
    const voice = voices.find(v => v.lang === 'en-AU') || voices.find(v => v.lang.startsWith('en'));
    if (voice) utterance.voice = voice;
    synth.speak(utterance);
  }

  dispose() {
    clearInterval(this.timer);
    window.speechSynthesis?.cancel();
    for (const node of this.nodes) {
      try { node.stop?.(); node.disconnect(); } catch { /* A stopped source is already released. */ }
    }
    this.context?.close();
    this.context = null;
    this.nodes = [];
  }
}
