import test from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { createGameServer } from '../server.mjs';
import { Multiplayer } from '../src/network.js';
import {SCHOOL_OBSTACLES,segmentIntersectsBox,hasTagLineOfSight} from '../src/map-collision.js';

async function client(url) {
  const ws = new WebSocket(url);
  const queue = [], waiters = [];
  ws.on('message', raw => { const data = JSON.parse(raw); queue.push(data); for (const wake of waiters.splice(0)) wake(); });
  await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
  return { ws, send: data => ws.send(JSON.stringify(data)), async next(predicate) {
    const deadline = Date.now() + 2500;
    while (Date.now() < deadline) {
      const index = queue.findIndex(predicate);
      if (index >= 0) return queue.splice(index, 1)[0];
      await new Promise(resolve => { const timer = setTimeout(resolve, 30); waiters.push(() => { clearTimeout(timer); resolve(); }); });
    }
    throw new Error('Expected websocket message did not arrive');
  }};
}

test('rooms synchronize, restrict start to host, reject teleporting, and clean up disconnects', async t => {
  const game = createGameServer({hideMs: 100, roundMs: 500, tickMs: 20});
  await game.listen(0, '127.0.0.1');
  t.after(() => game.close());
  const url = `ws://127.0.0.1:${game.server.address().port}/ws`;
  const a = await client(url), b = await client(url);
  t.after(() => { a.ws.close(); b.ws.close(); });
  a.send({type:'create', name:'Host'});
  const first = await a.next(x => x.type === 'state');
  assert.match(first.state.code, /^[A-Z0-9]{5}$/);
  b.send({type:'join',code:first.state.code,name:'Friend'});
  const joined = await b.next(x => x.type === 'state' && x.state.players.length === 2);
  assert.equal(joined.state.hostId, first.state.hostId);
  b.send({type:'start'});
  assert.match((await b.next(x => x.type === 'error')).message, /host/i);
  a.send({type:'start'});
  const hiding = await a.next(x => x.type === 'state' && x.state.phase === 'hiding');
  assert.equal(hiding.state.players.filter(p => p.isCreature).length, 1);
  b.send({type:'move',x:999,z:999,yaw:0});
  const valid = await b.next(x => x.type === 'state' && x.state.phase === 'hunting');
  assert.ok(valid.state.players.every(p => Math.abs(p.x) < 100 && Math.abs(p.z) < 100));
  assert.equal((await a.next(x => x.type === 'state' && x.state.phase === 'finished')).state.winner,'survivors');
  b.ws.close();
  assert.equal((await a.next(x => x.type === 'state' && x.state.players.length === 1)).state.players.length,1);
});

test('server refuses invalid rooms and rejects malformed packets without crashing', async t => {
  const game = createGameServer();
  await game.listen(0, '127.0.0.1');
  t.after(() => game.close());
  const a = await client(`ws://127.0.0.1:${game.server.address().port}/ws`);
  t.after(() => a.ws.close());
  a.ws.send('{');
  assert.match((await a.next(x => x.type === 'error')).message,/packet/i);
  a.send({type:'join',code:'XXXXX',name:'Friend'});
  assert.match((await a.next(x => x.type === 'error')).message,/room/i);
});

test('a creature can catch a survivor through server-validated proximity', async t => {
  // Keep the gameplay deadline independent of CI machine scheduling delays.
  const game = createGameServer({hideMs:10,roundMs:30000,tickMs:20});
  await game.listen(0,'127.0.0.1');
  t.after(()=>game.close());
  const url=`ws://127.0.0.1:${game.server.address().port}/ws`;
  const a=await client(url),b=await client(url);
  t.after(()=>{a.ws.close();b.ws.close();});
  a.send({type:'create',name:'Hunter'});
  const initial=await a.next(x=>x.type==='state');
  b.send({type:'join',code:initial.state.code,name:'Runner'});
  await a.next(x=>x.type==='state'&&x.state.players.length===2);
  a.send({type:'start'});
  const start=await a.next(x=>x.type==='state'&&x.state.phase==='hunting');
  const prey=start.state.players.find(p=>!p.isCreature);
  a.send({type:'move',x:prey.x,z:prey.z,yaw:0});
  const afterJump=await a.next(x=>x.type==='state'&&x.state.phase==='hunting');
  assert.equal(afterJump.state.players.find(p=>p.isCreature).x,0,'teleports are rejected');
  for(let progress=0.06;progress<=1;progress+=0.06){
    await new Promise(resolve=>setTimeout(resolve,90));
    a.send({type:'move',x:prey.x*progress,z:prey.z*progress,yaw:0});
  }
  const end=await a.next(x=>x.type==='state'&&x.state.phase==='finished');
  assert.equal(end.state.winner,'creature');
  assert.equal(end.state.players.find(p=>!p.isCreature).alive,false);
});

test('browser client recovers from invalid URLs and ignores callbacks after intentional disconnect', async t => {
  const previous=globalThis.WebSocket;globalThis.WebSocket=WebSocket;
  t.after(()=>{globalThis.WebSocket=previous;});
  const game=createGameServer();await game.listen(0,'127.0.0.1');t.after(()=>game.close());
  const states=[],statuses=[];
  const network=new Multiplayer({onState:s=>states.push(s),onStatus:s=>statuses.push(s)});
  t.after(()=>network.disconnect());
  await assert.rejects(network.connect('https://invalid.example/ws'),/ws:\/\//);
  await network.connect(`ws://127.0.0.1:${game.server.address().port}/ws`);
  network.create('Client');
  const deadline=Date.now()+2000;
  while(!states.length&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(states[0].players[0].id,network.id);
  const count=states.length;
  network.disconnect();
  await new Promise(resolve=>setTimeout(resolve,30));
  assert.equal(states.length,count,'old socket close cannot reset the new UI');
  assert.equal(statuses.includes('disconnected'),false,'intentional close is handled by the caller');
});

test('nearby runners cannot be tagged through the blue wall but can be tagged on the same side',async t=>{
  const game=createGameServer({hideMs:10,roundMs:4000,tickMs:20});
  await game.listen(0,'127.0.0.1');t.after(()=>game.close());
  const url=`ws://127.0.0.1:${game.server.address().port}/ws`,a=await client(url),b=await client(url);
  t.after(()=>{a.ws.close();b.ws.close();});
  a.send({type:'create',name:'Hunter'});
  const lobby=await a.next(x=>x.type==='state');
  b.send({type:'join',code:lobby.state.code,name:'Runner'});
  await a.next(x=>x.type==='state'&&x.state.players.length===2);
  a.send({type:'start'});await a.next(x=>x.type==='state'&&x.state.phase==='hunting');
  const room=game.rooms.get(lobby.state.code),hunter=[...room.players.values()].find(p=>p.isCreature),runner=[...room.players.values()].find(p=>!p.isCreature);
  // Seed the authoritative fixture on opposite accessible sides of the wall.
  Object.assign(hunter,{x:6,z:11.4});Object.assign(runner,{x:6,z:12.6});
  await new Promise(resolve=>setTimeout(resolve,80));
  assert.equal(runner.alive,true,'solid school geometry blocks a proximity tag');
  assert.equal(room.phase,'hunting');
  Object.assign(hunter,{x:6,z:10.5});Object.assign(runner,{x:6,z:11.4});
  const caught=await a.next(x=>x.type==='state'&&x.state.phase==='finished');
  assert.equal(caught.state.winner,'creature');
  assert.equal(caught.state.players.find(p=>!p.isCreature).alive,false);
});

test('tag visibility handles every school shell, parallel paths, and diagonal intersections',()=>{
  for(const box of SCHOOL_OBSTACLES){
    const z=(box.minZ+box.maxZ)/2;
    assert.equal(segmentIntersectsBox({x:box.minX-.5,z},{x:box.maxX+.5,z},box),true);
    assert.equal(segmentIntersectsBox({x:box.minX-.5,z:box.maxZ+.5},{x:box.maxX+.5,z:box.maxZ+.5},box),false);
    assert.equal(segmentIntersectsBox({x:box.minX-.5,z:box.minZ-.5},{x:box.maxX+.5,z:box.maxZ+.5},box),true);
  }
  assert.equal(hasTagLineOfSight({x:6,z:11.4},{x:6,z:12.6}),false);
  assert.equal(hasTagLineOfSight({x:6,z:10.5},{x:6,z:11.4}),true);
  assert.equal(hasTagLineOfSight({x:NaN,z:1},{x:0,z:0}),false);
});
