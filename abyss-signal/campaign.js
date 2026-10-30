import {STAGES} from './layout.js';

/** Campaign progression only. Puzzles, creature perception and navigation are separate. */
export const CHAPTERS = STAGES;
const INVENTORY_REWARDS = Object.freeze({sample:'black-box',crew:'crew-keycard',archive:'launch-cipher',uplink:'surface-clearance'});
const COMPLETIONS = Object.freeze({
  pump:{event:'pumps-online',cue:'interact',message:'DR. MARA VOSS · The pumps are holding. Good. The main generator is still disconnected. Follow the maintenance signs into Engineering and bring its circuits online. If something knocks from inside a pipe, keep moving.'},
  generator:{event:'power-online',cue:'alarm',message:'DR. MARA VOSS · We have emergency power. The laboratory black box should be awake. Recover it from Observation. I need to know what the crew brought up from the trench. Do not touch the glass.'},
  sample:{event:'black-box',cue:'scare',message:'BLACK BOX · The final recording is your voice, asking the crew to open the hatch. You have never been here before. MARA · Go to Crew Quarters. Search my cabin. My recorder and access card should still be beside the terminal.'},
  crew:{event:'crew-log',cue:'interact',message:'MARA’S RECORDER · It learned our names first. Then it began finishing our sentences. The archive code is: Seventeen. Zero nine. You recover her access card. Open the Records archive and find the ascent cipher. The capsule will not launch without it.'},
  archive:{event:'archive-unlocked',cue:'whisper',message:'ARCHIVE · The ascent cipher is recovered. A personnel record says Doctor Mara Voss was lost with the first dive team. The radio clicks. MARA · That is an old record. We can talk about it when you reach the surface. Go to the relay. Isolate the external signal.'},
  relay:{event:'relay-offline',cue:'alarm',message:'RELAY ISOLATED · The station speakers go silent. A voice continues through the disconnected headset. MARA · I am still here. The capsule cooling circuit is overheating. Reach the coolant plant and balance the pressure before it ruptures.'},
  coolant:{event:'coolant-stable',cue:'interact',message:'COOLANT STABLE · The capsule is responding. MARA · Now we need surface clearance. The uplink terminal is in Communications. Send the distress sequence exactly as it appears. Ignore any reply asking you to stay.'},
  uplink:{event:'uplink-sent',cue:'scare',message:'SURFACE CONTROL · Clearance received. There is no Doctor Voss on this channel. Do not follow her voice. Proceed to Launch Control and prepare the ascent capsule. You are the only person transmitting from that station.'},
  launch:{event:'extraction-started',cue:'alarm',message:'LAUNCH CONTROL · Capsule preparation started. Forty-five seconds to equalise the lock. Stay alive and reach the boarding hatch. MARA · Please. Do not leave me down here.'},
});
const RADIO = [
  {at:12,message:'DR. MARA VOSS · I can guide you from Communications. Keep your light on the floor. If you hear three knocks, do not answer the third.',cue:'whisper'},
  {at:85,message:'RECOVERED LOG · We opened the specimen chamber at 02:14. At 02:15, every radio in the station spoke with a different crew member’s voice.',cue:'whisper'},
  {at:165,message:'DR. MARA VOSS · You can hide in the tall lockers by the passage. Get out of its sight first. If it watches you get inside, the door will not protect you.',cue:'whisper'},
  {at:255,message:'STATION RADIO · Three knocks travel through the wall. A voice on the other side says it has been waiting for you to remember its name.',cue:'whisper'},
  {at:365,message:'RECOVERED LOG · It stopped copying us when it realised we were afraid. Now it copies whoever we most want to hear.',cue:'whisper'},
  {at:480,message:'DR. MARA VOSS · I cannot see your light any more. Say something. Anything. Let me hear you again.',cue:'whisper'},
  {at:610,message:'RECOVERED LOG · The sea outside the observation window is perfectly still. Something enormous is holding its breath.',cue:'whisper'},
  {at:760,message:'PRESSURE WARNING · Water detected in the lower cable trays. Finish the active operation, then follow the route marker to the next station.',cue:'alarm'},
  {at:930,message:'STATION RADIO · A second set of footsteps matches your pace. When you stop, it takes one more step.',cue:'whisper'},
  {at:1080,message:'PRESSURE WARNING · Two minutes of reserve pressure remain. Reach the capsule. Do not wait for another transmission.',cue:'alarm'},
];
function chapterIndex(value) {
  if(typeof value!=='number'&&typeof value!=='string')return 0;
  const candidate=Number(value);
  return Number.isInteger(candidate)&&candidate>=0&&candidate<STAGES.length?candidate:0;
}
function objectiveAt(chapter) {
  const {id,title,description}=STAGES[chapter];
  return {id,title,description:id==='archive'?description+' Cabin code: 1709.':description};
}
function freshState(checkpoint) {
  const chapter=chapterIndex(checkpoint),finalStage=chapter===STAGES.length-1;
  return {
    phase:'playing',chapter,stageCount:STAGES.length,elapsed:0,
    remaining:finalStage?300:1200,extractionRemaining:finalStage?45:0,
    threat:Math.min(.72,.08+chapter*.055),objective:objectiveAt(chapter),
    inventory:STAGES.slice(0,chapter).map(stage=>INVENTORY_REWARDS[stage.id]).filter(Boolean),checkpoint:chapter,
    message:chapter===0
      ?'NEREID STATION · 1,840 metres below the surface. DR. MARA VOSS · If you can hear this, you are not alone. The lower decks are flooding. Find the pumping station and restore pressure. I will talk you through the way out.'
      :finalStage
        ?'SURFACE CONTROL · Capsule preparation restarted. Forty-five seconds to equalise the lock. Stay out of sight until the boarding light comes on.'
        :'CHECKPOINT RESTORED · '+objectiveAt(chapter).description,
  };
}
export function createCampaign(savedCheckpoint=0) {
  const state=freshState(savedCheckpoint),heard=new Set();
  let nextRadioAllowed=0;
  function die(reason='Something moved in the dark. You did not reach the capsule.') {
    if(state.phase!=='playing')return{ok:false,message:state.message};
    state.phase='dead';state.message=reason;
    return{ok:true,message:reason,cue:'death',event:'death'};
  }
  function update(dt,{moving=false,running=false,hidden=false}={}) {
    if(state.phase!=='playing')return null;
    // Suspended browsers cannot spend minutes of either timer on resume.
    const step=Number.isFinite(dt)?Math.min(1,Math.max(0,dt)):0;
    if(!step)return null;
    state.elapsed+=step;state.remaining=Math.max(0,state.remaining-step);
    const waiting=state.extractionRemaining>0;
    if(waiting)state.extractionRemaining=Math.max(0,state.extractionRemaining-step);
    // Atmospheric tension is not the creature's perception or player knowledge.
    const base=.08+state.chapter*.055+Math.min(.15,state.elapsed/6000);
    const target=Math.min(.92,base+(running?.22:moving?.04:0)-(hidden?.12:0)+(waiting?.12:0));
    state.threat=Math.max(.03,Math.min(1,state.threat+(target-state.threat)*(1-Math.exp(-step*.35))));
    if(state.remaining===0)return die('The last bulkhead gives way. The station disappears beneath the pressure of the sea.');
    if(waiting&&state.extractionRemaining===0){
      state.message='SURFACE CONTROL · Boarding light is green. The capsule is ready. Reach the escape hatch and get inside. Do not answer the voice behind you.';
      nextRadioAllowed=state.elapsed+18;
      return{ok:true,message:state.message,cue:'interact',event:'extraction-ready'};
    }
    if(state.elapsed<nextRadioAllowed||state.chapter===STAGES.length-1)return null;
    const radio=RADIO.find((line,index)=>line.at<=state.elapsed&&!heard.has(index));
    if(radio){heard.add(RADIO.indexOf(radio));nextRadioAllowed=state.elapsed+18;state.message=radio.message;return{ok:true,message:radio.message,cue:radio.cue,event:'transmission'};}
    return null;
  }
  function interact(id) {
    if(state.phase!=='playing')return{ok:false,message:state.message};
    if(id!==state.objective.id){
      const earlier=STAGES.findIndex(item=>item.id===id);
      const message=earlier>=0&&earlier<state.chapter?'This operation is complete. '+state.objective.description:id==='escape'?'The capsule is not cleared for boarding. '+state.objective.description:'Complete the active operation first. '+state.objective.description;
      return{ok:false,message};
    }
    if(id==='escape'){
      if(state.extractionRemaining>0)return{ok:false,message:'Capsule pressure is equalising. '+Math.ceil(state.extractionRemaining)+' seconds until boarding. Stay alive and watch the passage.'};
      state.phase='won';state.message='The capsule breaks the surface. Rescue lights sweep across the water. The headset is silent. Then, from the empty seat beside you: three knocks. MARA · You did not really think I was on the radio, did you?';
      return{ok:true,message:state.message,cue:'win',event:'ending'};
    }
    const completed=COMPLETIONS[id];
    if(!completed)return{ok:false,message:'This station is not ready. '+state.objective.description};
    const item=INVENTORY_REWARDS[id];
    if(item&&!state.inventory.includes(item))state.inventory.push(item);
    state.chapter++;state.checkpoint=state.chapter;state.objective=objectiveAt(state.chapter);state.message=completed.message;
    if(id==='launch')state.extractionRemaining=45;
    nextRadioAllowed=state.elapsed+20;
    return{ok:true,...completed};
  }
  function restart(){
    const restored=freshState(state.checkpoint);
    for(const key of Object.keys(state))delete state[key];
    Object.assign(state,restored);heard.clear();nextRadioAllowed=0;
    return state;
  }
  function snapshot(){return{...state,objective:{...state.objective},inventory:[...state.inventory]};}
  return{state,update,interact,die,restart,snapshot};
}
