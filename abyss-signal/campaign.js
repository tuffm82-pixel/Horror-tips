/** Pure campaign rules. Positions and interactions belong to the playable world. */
export const CHAPTERS = Object.freeze([
  Object.freeze({id:'pump', title:'01 / Wake the station', description:'Find the pumping station. Restore pressure before the lower decks flood.'}),
  Object.freeze({id:'sample', title:'02 / Recover the black box', description:'Enter the observation laboratory. Retrieve the last recording.'}),
  Object.freeze({id:'relay', title:'03 / Break the signal', description:'Carry the black box to the relay room. Disconnect the voice from the station.'}),
  Object.freeze({id:'escape', title:'04 / Reach the ascent capsule', description:'The outer lock is open. Get to the ascent capsule at the end of the main passage.'}),
]);

const RADIO = [
  {at:12, message:'RECOVERED LOG · If you hear three knocks, do not answer the third.', cue:'whisper'},
  {at:48, message:'STATION RADIO · A voice using your name asks you to come down another deck. There is no deck below this one.', cue:'whisper'},
  {at:95, message:'RECOVERED LOG · It learned the crew’s voices before it learned to walk.', cue:'whisper'},
  {at:165, message:'STATION RADIO · “I can hear you breathing.” The radio is using your voice.', cue:'whisper'},
  {at:285, message:'PRESSURE WARNING · The sea is entering the station. Finish the sequence and reach the ascent capsule.', cue:'alarm'},
];

function chapterIndex(value) {
  const candidate = Number(value);
  return Number.isInteger(candidate) && candidate >= 0 && candidate <= 3 ? candidate : 0;
}

function freshState(checkpoint) {
  const chapter = chapterIndex(checkpoint);
  return {
    phase:'playing', chapter, elapsed:0,
    remaining:chapter === 3 ? 210 : 480,
    threat:chapter === 3 ? 0.78 : 0.08 + chapter * 0.13,
    objective:{...CHAPTERS[chapter]},
    inventory:chapter >= 2 ? ['black-box'] : [],
    checkpoint:chapter,
    message:chapter === 0
      ? 'NEREID STATION · 1,840 metres below the surface. The emergency lights are on. Everyone else is gone.'
      : 'CHECKPOINT RESTORED · ' + CHAPTERS[chapter].description,
  };
}

export function createCampaign(savedCheckpoint = 0) {
  const state = freshState(savedCheckpoint);
  const heard = new Set();

  function die(reason = 'Something moved in the dark. You did not reach the capsule.') {
    if (state.phase !== 'playing') return {ok:false, message:state.message};
    state.phase = 'dead';
    state.message = reason;
    return {ok:true, message:reason, cue:'death', event:'death'};
  }

  function update(dt, {moving = false, running = false, hidden = false} = {}) {
    if (state.phase !== 'playing') return null;
    // A suspended browser must not spend minutes of the player's timer on resume.
    const step = Number.isFinite(dt) ? Math.min(1, Math.max(0, dt)) : 0;
    if (!step) return null;
    state.elapsed += step;
    state.remaining = Math.max(0, state.remaining - step);
    const base = 0.08 + state.chapter * 0.17 + Math.min(0.18, state.elapsed / 1500);
    const target = state.chapter === 3 ? 1 : Math.min(0.95, base + (running ? 0.32 : moving ? 0.06 : 0) - (hidden ? 0.15 : 0));
    state.threat = Math.max(0.03, Math.min(1, state.threat + (target - state.threat) * (1 - Math.exp(-step * 0.35))));
    if (state.remaining === 0) return die('The last bulkhead gives way. The station disappears beneath the pressure of the sea.');
    const radio = RADIO.find((line, index) => line.at <= state.elapsed && !heard.has(index));
    if (radio) {
      heard.add(RADIO.indexOf(radio));
      state.message = radio.message;
      return {ok:true, message:radio.message, cue:radio.cue, event:'transmission'};
    }
    return null;
  }

  function interact(id) {
    if (state.phase !== 'playing') return {ok:false, message:state.message};
    if (id !== state.objective.id) {
      const earlier = CHAPTERS.findIndex(item => item.id === id);
      const message = earlier >= 0 && earlier < state.chapter
        ? 'This station is already secured. ' + state.objective.description
        : id === 'escape'
          ? 'The capsule is locked by the station relay. ' + state.objective.description
          : id === 'relay' && state.chapter < 2
            ? 'The relay requires the laboratory black box. ' + state.objective.description
            : id === 'sample' && state.chapter === 0
              ? 'The laboratory recorder has no power. Restore the pumping station first.'
              : 'Follow the current objective. ' + state.objective.description;
      return {ok:false, message};
    }
    if (id === 'escape') {
      state.phase = 'won';
      state.message = 'The capsule breaks the surface. The station falls silent. Then, from inside the empty seat beside you: three knocks.';
      return {ok:true, message:state.message, cue:'win', event:'ending'};
    }
    state.chapter += 1;
    state.checkpoint = state.chapter;
    state.objective = {...CHAPTERS[state.chapter]};
    if (id === 'pump') {
      state.remaining += 60;
      state.message = 'PUMPS ONLINE · You bought one minute. Something on the other side of the glass has stopped swimming.';
      return {ok:true, message:state.message, cue:'interact', event:'pumps-online'};
    }
    if (id === 'sample') {
      state.inventory.push('black-box');
      state.message = 'BLACK BOX RECOVERED · The final recording is your own voice, begging someone not to open the hatch. You have never been here before.';
      return {ok:true, message:state.message, cue:'scare', event:'black-box'};
    }
    state.threat = Math.max(state.threat, 0.82);
    state.message = 'RELAY DISCONNECTED · The voice stops. Footsteps begin. The ascent capsule is open. RUN.';
    return {ok:true, message:state.message, cue:'alarm', event:'chase'};
  }

  function restart() {
    const restored = freshState(state.checkpoint);
    for (const key of Object.keys(state)) delete state[key];
    Object.assign(state, restored);
    heard.clear();
    return state;
  }

  function snapshot() {
    return {...state, objective:{...state.objective}, inventory:[...state.inventory]};
  }

  return {state, update, interact, die, restart, snapshot};
}
