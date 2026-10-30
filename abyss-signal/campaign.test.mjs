import test from 'node:test';
import assert from 'node:assert/strict';
import {createCampaign} from './campaign.js';

test('the capsule cannot bypass the station recovery sequence', () => {
  const game = createCampaign();
  assert.equal(game.interact('escape').ok, false);
  assert.equal(game.interact('sample').ok, false);
  assert.equal(game.interact('relay').ok, false);
  assert.equal(game.state.chapter, 0);
  assert.equal(game.interact('pump').event, 'pumps-online');
  assert.equal(game.state.remaining, 540);
  assert.equal(game.interact('pump').ok, false);
  assert.equal(game.state.remaining, 540, 'repeating a pump cannot farm oxygen');
  assert.equal(game.interact('sample').event, 'black-box');
  assert.deepEqual(game.state.inventory, ['black-box']);
  assert.equal(game.interact('relay').event, 'chase');
  assert.equal(game.state.objective.id, 'escape');
  assert.equal(game.interact('escape').event, 'ending');
  assert.equal(game.state.phase, 'won');
});

test('pressure timeout ends a run once and terminal states cannot keep changing', () => {
  const game = createCampaign();
  for (let second = 0; second < 480; second++) game.update(1);
  assert.equal(game.state.phase, 'dead');
  assert.equal(game.state.remaining, 0);
  const ended = game.snapshot();
  assert.equal(game.update(1), null);
  assert.equal(game.interact('pump').ok, false);
  assert.equal(game.die('another death').ok, false);
  assert.deepEqual(game.snapshot(), ended);
});

test('winning freezes pressure, inventory and ending', () => {
  const game = createCampaign(3);
  game.interact('escape');
  const ended = game.snapshot();
  game.update(1, {running:true});
  game.die('too late');
  game.interact('escape');
  assert.deepEqual(game.snapshot(), ended);
});

test('retry restores the last completed objective with a healthy timer', () => {
  const game = createCampaign();
  const stateReference = game.state;
  game.interact('pump');
  game.interact('sample');
  game.update(1);
  game.die('caught');
  game.restart();
  assert.equal(game.state, stateReference, 'UI references remain valid after restart');
  assert.equal(game.state.phase, 'playing');
  assert.equal(game.state.objective.id, 'relay');
  assert.equal(game.state.remaining, 480);
  assert.deepEqual(game.state.inventory, ['black-box']);
  assert.equal(game.state.elapsed, 0);
  assert.equal(createCampaign(3).state.remaining, 210);
});

test('bad save data and invalid frame times cannot corrupt a run', () => {
  for (const value of [-1, 4, Infinity, 'garbage', {}, 1.5]) {
    assert.equal(createCampaign(value).state.chapter, 0);
  }
  const game = createCampaign();
  for (const dt of [NaN, Infinity, -1, undefined, '4']) game.update(dt);
  assert.equal(game.state.remaining, 480);
  game.update(1200);
  assert.equal(game.state.remaining, 479, 'resuming a tab cannot spend the whole countdown');
});

test('running attracts danger, hiding reduces it, radio lines do not repeat each frame', () => {
  const running = createCampaign();
  const hiding = createCampaign();
  const events = [];
  for (let second = 0; second < 60; second++) {
    const event = running.update(1, {running:true, moving:true});
    if (event) events.push(event);
    hiding.update(1, {hidden:true});
  }
  assert.ok(running.state.threat > hiding.state.threat + 0.2);
  assert.equal(events.length, 2);
  assert.equal(new Set(events.map(event => event.message)).size, 2);
  const snapshot = running.snapshot();
  snapshot.inventory.push('fake');
  snapshot.objective.id = 'escape';
  assert.deepEqual(running.state.inventory, []);
  assert.equal(running.state.objective.id, 'pump');
});
