// Uses the device's built-in speech voices. Subtitles remain owned by the game
// and are always shown, including on browsers without speech synthesis.
export function createVoice() {
  const synth=globalThis.speechSynthesis;
  const Utterance=globalThis.SpeechSynthesisUtterance;
  let enabled=true, unlocked=false, paused=false, disposed=false;
  let voices=[], active=null, generation=0, timer=null, deadline=0, remaining=0;
  const queue=[];
  function refreshVoices(){try{voices=synth?.getVoices?.()||[];}catch{voices=[];}}
  function clearTimer(){clearTimeout(timer);timer=null;}
  function armTimer(milliseconds){
    clearTimer();remaining=milliseconds;deadline=Date.now()+milliseconds;
    const token=generation;
    timer=setTimeout(()=>{
      if(!active||generation!==token||paused)return;
      // Some mobile engines omit onend after a voice service failure. Cancel the
      // abandoned line so subsequent transmissions can still be spoken.
      const previous=active;generation++;active=null;
      previous.utterance.onend=previous.utterance.onerror=null;
      try{synth.cancel();}catch{}
      pump();
    },milliseconds);
  }
  function chooseVoice(speaker){
    const english=voices.filter(voice=>/^en(?:[-_]|$)/i.test(voice.lang));
    const preferred=speaker==='mimic'
      ? /Daniel|Arthur|Gordon|George|James|David|Guy/i
      : /Samantha|Karen|Serena|Moira|Sonia|Jenny|Aria|Libby/i;
    return english.find(voice=>voice.localService&&preferred.test(voice.name))
      ||english.find(voice=>preferred.test(voice.name))
      ||english.find(voice=>voice.localService&&/en[-_](AU|GB)/i.test(voice.lang))
      ||english.find(voice=>voice.localService)||english[0]||null;
  }
  function pump(){
    if(disposed||!enabled||!unlocked||paused||active||!queue.length||!synth||!Utterance)return;
    refreshVoices();
    const item=queue.shift(), utterance=new Utterance(item.text), token=++generation;
    const chosen=chooseVoice(item.speaker);
    if(chosen)utterance.voice=chosen;
    utterance.lang=chosen?.lang||'en-AU';
    utterance.rate=item.speaker==='mimic'?.76:.94;
    utterance.pitch=item.speaker==='mimic'?.58:1.02;
    utterance.volume=item.speaker==='mimic'?.78:.83;
    active={...item,utterance};
    const finish=()=>{
      if(disposed||token!==generation||active?.utterance!==utterance)return;
      clearTimer();active=null;
      utterance.onend=utterance.onerror=null;
      pump();
    };
    utterance.onend=finish;utterance.onerror=finish;
    // Retain the utterance in active: Safari may otherwise garbage-collect it
    // before completion. The next line is queued only after end/error.
    armTimer(Math.min(55000,Math.max(15000,item.text.length*95+10000)));
    try{synth.speak(utterance);}catch{finish();}
  }
  function stop(){
    queue.length=0;clearTimer();generation++;
    if(active){active.utterance.onend=active.utterance.onerror=null;active=null;try{synth?.cancel();}catch{}}
  }
  function unlock(){
    if(disposed||!synth||!Utterance)return false;
    // Call this, then speak the first real line, in the same tap handler. An empty
    // utterance is deliberately avoided because it does not unlock iPad Safari.
    unlocked=true;
    if(!paused){try{synth.resume();}catch{}pump();}
    return true;
  }
  function speak(text,{speaker='radio',interrupt=false}={}){
    if(disposed||!enabled||!synth||!Utterance)return false;
    const clean=String(text??'').replace(/^[A-Z][A-Z\d /'’–-]{2,44}\s*[·•|:]\s*/,'').replace(/\s+/g,' ').trim().slice(0,550);
    if(!clean)return false;
    if(interrupt)stop();
    if(active?.text===clean||queue.some(item=>item.text===clean))return true;
    if(queue.length>=3)queue.shift();
    queue.push({text:clean,speaker:speaker==='mimic'?'mimic':'radio'});pump();return true;
  }
  function pause(){
    if(disposed||paused)return;
    paused=true;
    if(timer){remaining=Math.max(1000,deadline-Date.now());clearTimer();}
    try{synth?.pause();}catch{}
  }
  function resume(){
    if(disposed)return;
    paused=false;
    try{synth?.resume();}catch{}
    if(active)armTimer(remaining||15000);else pump();
  }
  refreshVoices();synth?.addEventListener?.('voiceschanged',refreshVoices);
  return {
    unlock,speak,pause,resume,stop,
    setEnabled(value){enabled=Boolean(value);if(!enabled)stop();else pump();},
    dispose(){if(disposed)return;stop();disposed=true;synth?.removeEventListener?.('voiceschanged',refreshVoices);}
  };
}
