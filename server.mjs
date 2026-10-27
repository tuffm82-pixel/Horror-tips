import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, WebSocket } from 'ws';
import {hasTagLineOfSight} from './src/map-collision.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.ico':'image/x-icon','.mp3':'audio/mpeg'};

export function createGameServer({hideMs = 20000, roundMs = 90000, tickMs = 50, distDir = path.join(root, 'dist')} = {}) {
  const rooms = new Map();
  const server = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, 'http://local').pathname);
      if (pathname === '/health') { res.writeHead(200, {'Content-Type':'application/json'}); res.end('{"ok":true}'); return; }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const file = path.resolve(distDir, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!file.startsWith(path.resolve(distDir) + path.sep)) { res.writeHead(403); res.end(); return; }
      const body = await readFile(file);
      res.writeHead(200, {'Content-Type':mime[path.extname(file)] || 'application/octet-stream','X-Content-Type-Options':'nosniff'});
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch { res.writeHead(404, {'Content-Type':'text/plain'}); res.end('Not found. Run npm run build before starting the game server.'); }
  });
  const wss = new WebSocketServer({server, path:'/ws', maxPayload:2048});
  const send = (ws, data) => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); };
  const snapshot = room => ({code:room.code, hostId:room.hostId, phase:room.phase, remaining:Math.max(0,Math.ceil((room.deadline-Date.now())/1000)), winner:room.winner,
    players:[...room.players.values()].map(({ws,lastMove,moveCredit,...player}) => player)});
  const broadcast = room => { const data = {type:'state',state:snapshot(room)}; for (const p of room.players.values()) send(p.ws,data); };
  function finish(room, winner) { room.phase='finished'; room.winner=winner; room.deadline=0; }
  function leave(ws) {
    const room = rooms.get(ws.roomCode);
    ws.roomCode = null;
    if (!room) return;
    const departing = room.players.get(ws.playerId);
    room.players.delete(ws.playerId);
    if (!room.players.size) { rooms.delete(room.code); return; }
    if (room.hostId === ws.playerId) room.hostId = room.players.keys().next().value;
    if (['hiding','hunting'].includes(room.phase) && departing?.isCreature) finish(room,'survivors');
    else if (['hiding','hunting'].includes(room.phase) && ![...room.players.values()].some(p => !p.isCreature && p.alive)) finish(room,'creature');
    broadcast(room);
  }
  wss.on('connection', ws => {
    ws.playerId = randomUUID();
    ws.isAlive=true;
    ws.on('pong',()=>{ws.isAlive=true;});
    ws.rateWindow = Date.now(); ws.packetCount = 0;
    send(ws,{type:'hello',id:ws.playerId});
    ws.on('message', raw => {
      if (Date.now()-ws.rateWindow > 1000) {ws.rateWindow=Date.now(); ws.packetCount=0;}
      if (++ws.packetCount > 90) return;
      let msg;
      try { msg=JSON.parse(raw.toString()); if (!msg || typeof msg !== 'object') throw new Error(); }
      catch { send(ws,{type:'error',message:'Invalid packet.'}); return; }
      const error = message => send(ws,{type:'error',message});
      let room = rooms.get(ws.roomCode);
      if (msg.type === 'leave') { leave(ws); send(ws,{type:'left'}); return; }
      if (msg.type === 'create' || msg.type === 'join') {
        if (room) return error('Leave your current room first.');
        if (msg.type === 'create') {
          if (rooms.size >= 200) return error('The server is full. Try again later.');
          let code; do {code=randomBytes(4).toString('hex').slice(0,5).toUpperCase();} while(rooms.has(code));
          room={code,hostId:ws.playerId,phase:'lobby',deadline:0,winner:null,players:new Map()};
          rooms.set(code,room);
        } else {
          room=rooms.get(String(msg.code || '').trim().toUpperCase());
          if (!room) return error('Room not found. Check the code.');
          if (room.players.size >= 6) return error('This room is full (6 players).');
          if (!['lobby','finished'].includes(room.phase)) return error('This round has already started.');
        }
        ws.roomCode=room.code;
        const name=String(msg.name || 'Player').replace(/[\x00-\x1f<>]/g,'').trim().slice(0,20) || 'Player';
        room.players.set(ws.playerId,{id:ws.playerId,name,ws,x:0,z:0,yaw:0,alive:true,isCreature:false,lastMove:Date.now(),moveCredit:0.75});
        broadcast(room); return;
      }
      if (!room) return error('Join a room first.');
      if (msg.type === 'start') {
        if (room.hostId !== ws.playerId) return error('Only the host can start the round.');
        if (!['lobby','finished'].includes(room.phase)) return error('The round is already running.');
        if (room.players.size < 2) return error('At least 2 players are needed.');
        const players=[...room.players.values()];
        const creatureIndex=(room.round || 0)%players.length; room.round=(room.round || 0)+1;
        players.forEach((p,i) => {p.isCreature=i===creatureIndex;p.alive=true;p.x=i===creatureIndex?0:8+i*3;p.z=i===creatureIndex?0:8;p.lastMove=Date.now();p.moveCredit=0.75;});
        room.phase='hiding';room.winner=null;room.deadline=Date.now()+hideMs;
        broadcast(room); return;
      }
      if (msg.type === 'move') {
        if (!['hiding','hunting'].includes(room.phase)) return;
        const p=room.players.get(ws.playerId);
        if (!p.alive || (p.isCreature && room.phase === 'hiding')) return;
        const {x,z,yaw}=msg;
        if (![x,z,yaw].every(Number.isFinite) || Math.abs(x)>95 || Math.abs(z)>95) return;
        const now=Date.now(), elapsed=Math.max(0,(now-p.lastMove)/1000);
        p.moveCredit=Math.min(1.25,p.moveCredit+elapsed*(p.isCreature?12:9));p.lastMove=now;
        const distance=Math.hypot(x-p.x,z-p.z);
        if (distance>p.moveCredit) return;
        p.moveCredit-=distance;
        p.x=x;p.z=z;p.yaw=yaw%(Math.PI*2);
      }
    });
    ws.on('close',()=>leave(ws));
    ws.on('error',()=>{});
  });
  const timer=setInterval(()=>{
    const now=Date.now();
    for (const room of rooms.values()) {
      if (room.phase==='hiding' && now>=room.deadline) {room.phase='hunting';room.deadline=now+roundMs;}
      if (room.phase==='hunting') {
        const creature=[...room.players.values()].find(p=>p.isCreature);
        if (creature) for (const p of room.players.values()) if (p.alive && !p.isCreature && Math.hypot(p.x-creature.x,p.z-creature.z)<2.1 && hasTagLineOfSight(creature,p)) p.alive=false;
        if (![...room.players.values()].some(p=>!p.isCreature&&p.alive)) finish(room,'creature');
        else if (now>=room.deadline) finish(room,'survivors');
      }
      if (['hiding','hunting'].includes(room.phase) || room.lastPhase!==room.phase) broadcast(room);
      room.lastPhase=room.phase;
    }
  },tickMs);
  const heartbeat=setInterval(()=>{
    for(const ws of wss.clients){if(!ws.isAlive){ws.terminate();continue;}ws.isAlive=false;ws.ping();}
  },30000);
  return {server,rooms,listen(port=3000,host='0.0.0.0') {return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);resolve(server.address());});});},async close() {
    clearInterval(timer);clearInterval(heartbeat);for(const ws of wss.clients) ws.terminate();
    await new Promise(resolve=>wss.close(resolve));
    if(server.listening) await new Promise(resolve=>server.close(resolve));
  }};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const game=createGameServer();
  const address=await game.listen(Number(process.env.PORT)||3000);
  console.log(`Horror Tips: http://localhost:${address.port} (multiplayer /ws)`);
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>game.close().then(()=>process.exit(0)));
}
