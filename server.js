// Escaleras Party - servidor (Node + WebSocket)
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('./mini-ws');

const PORT = process.env.PORT || 3000;
const PUBLIC = path.join(__dirname, 'public');
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml',
};

// ---------- Servidor de archivos estáticos ----------
const server = http.createServer((req, res) => {
  let u = req.url.split('?')[0];
  if (u === '/') u = '/index.html';
  const f = path.join(PUBLIC, path.normalize(u));
  if (!f.startsWith(PUBLIC)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' });
    res.end(d);
  });
});

// ---------- Reglas del juego ----------
const BOARD_END = 40;
const SNAKES = { 17: 6, 27: 12, 34: 21, 38: 23 };
const LADDERS = { 3: 14, 9: 20, 15: 26, 24: 35 };
const COLORS = ['#e63946', '#2a9d8f', '#f4a261', '#8e5bd1', '#1d8fe1', '#ff70a6'];
const MAX_PLAYERS = 6;
// Duración (ms) de cada minijuego; el servidor espera esto + margen
const MINIGAMES = {
  tap: 10000, reflex: 8000, catch: 25000, math: 30000, memory: 60000,
  aim: 20000, dodge: 30000, stroop: 20000, stopbar: 25000, pairs: 45000,
};
// Personajes permitidos (los ids deben coincidir con CHARS en public/index.html)
const CHAR_IDS = ['gato', 'perro', 'zorro', 'rana', 'panda', 'pulpo', 'robot', 'alien', 'fantasma', 'unicornio', 'dragon', 'mago', 'astronauta', 'rey', 'guerrera', 'aqua', 'magma', 'nova', 'cubo', 'calavera', 'robovox'];
const MG_IDS = Object.keys(MINIGAMES);
const BONUS = [3, 2, 1]; // casillas extra para 1º, 2º y 3º lugar

const rooms = new Map();

const rid = () => Math.random().toString(36).slice(2, 8);
function newCode() {
  const L = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join(''); }
  while (rooms.has(c));
  return c;
}
function lanUrls() {
  const out = [];
  try { // en algunos Android (Termux) leer las interfaces de red puede fallar
    for (const list of Object.values(os.networkInterfaces()))
      for (const i of list || [])
        if (i.family === 'IPv4' && !i.internal) out.push(`http://${i.address}:${PORT}`);
  } catch { /* sin direcciones: el README explica cómo encontrar la IP */ }
  return out;
}
const send = (ws, o) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); };
const broadcast = (room, o) => room.players.forEach(p => send(p.ws, o));

function publicState(room) {
  const cur = room.players[room.turnIdx];
  return {
    t: 'state',
    code: room.code,
    phase: room.phase,
    hostId: room.hostId,
    round: room.round,
    turnId: room.phase === 'board' && cur ? cur.id : null,
    winnerId: room.winnerId || null,
    board: { end: BOARD_END, snakes: SNAKES, ladders: LADDERS },
    players: room.players.map(p => ({ id: p.id, name: p.name, color: p.color, char: p.char, pos: p.pos, connected: p.connected })),
  };
}
const pushState = room => broadcast(room, publicState(room));

function nextConnectedIdx(room, from) {
  for (let i = from; i < room.players.length; i++) if (room.players[i].connected) return i;
  return -1;
}

// ---------- Flujo de turnos ----------
function advanceTurn(room) {
  room.busy = false;
  if (room.phase !== 'board') return;
  const n = nextConnectedIdx(room, room.turnIdx + 1);
  if (n === -1) {
    // Todos ya tiraron: toca ronda de minijuegos
    startMinigame(room);
  } else {
    room.turnIdx = n;
    pushState(room);
  }
}

function handleRoll(room, p) {
  if (room.phase !== 'board' || room.busy) return;
  if (room.players[room.turnIdx] !== p) return;
  room.busy = true;
  // FIXED_DICE solo sirve para probar (por ejemplo: FIXED_DICE=5 node server.js)
  const value = process.env.FIXED_DICE ? Number(process.env.FIXED_DICE) : 1 + Math.floor(Math.random() * 6);
  const from = p.pos;
  let landed = Math.min(from + value, BOARD_END);
  let to = landed, kind = null;
  if (landed < BOARD_END) {
    if (SNAKES[landed]) { to = SNAKES[landed]; kind = 'snake'; }
    else if (LADDERS[landed]) { to = LADDERS[landed]; kind = 'ladder'; }
  }
  p.pos = to;
  broadcast(room, { t: 'move', pid: p.id, name: p.name, value, from, landed, to, kind });
  // Tiempo para que el cliente muestre el dado y camine casilla por casilla
  // (≈330 ms por casilla) y, si toca, se deslice por la serpiente o escalera.
  const wait = 900 + value * 330 + (kind ? 1400 : 0);
  if (to >= BOARD_END) {
    room.phase = 'over';
    room.winnerId = p.id;
    setTimeout(() => pushState(room), wait);
    return;
  }
  setTimeout(() => advanceTurn(room), wait);
}

// ---------- Minijuegos ----------
function startMinigame(room) {
  let game;
  do { game = MG_IDS[Math.floor(Math.random() * MG_IDS.length)]; }
  while (game === room.lastGame && MG_IDS.length > 1);
  room.lastGame = game;
  room.phase = 'minigame';
  room.mg = {
    game,
    results: {},
    expected: new Set(room.players.filter(p => p.connected).map(p => p.id)),
    timer: null,
  };
  const seed = Math.floor(Math.random() * 2 ** 31);
  pushState(room);
  broadcast(room, { t: 'minigame', game, seed, duration: MINIGAMES[game], round: room.round });
  // 3 s de cuenta regresiva + duración + margen para red
  room.mg.timer = setTimeout(() => finishMinigame(room), MINIGAMES[game] + 9000);
}

function submitScore(room, p, score) {
  const mg = room.mg;
  if (room.phase !== 'minigame' || !mg || !mg.expected.has(p.id) || p.id in mg.results) return;
  mg.results[p.id] = Math.max(0, Math.min(100000, Number(score) || 0));
  checkMinigameDone(room);
}
function checkMinigameDone(room) {
  const mg = room.mg;
  if (room.phase !== 'minigame' || !mg) return;
  const pending = [...mg.expected].filter(id => {
    const p = room.players.find(x => x.id === id);
    return p && p.connected && !(id in mg.results);
  });
  if (pending.length === 0) finishMinigame(room);
}

function finishMinigame(room) {
  const mg = room.mg;
  if (room.phase !== 'minigame' || !mg) return;
  clearTimeout(mg.timer);
  room.phase = 'results';
  const entries = [...mg.expected]
    .map(id => room.players.find(p => p.id === id))
    .filter(Boolean)
    .map(p => ({ p, score: mg.results[p.id] || 0 }));
  entries.sort((a, b) => b.score - a.score);
  const ranking = entries.map(e => {
    const rank = entries.filter(o => o.score > e.score).length;
    const bonus = BONUS[rank] || 0;
    e.p.pos = Math.min(BOARD_END - 1, e.p.pos + bonus); // el minijuego nunca gana la partida
    return { id: e.p.id, name: e.p.name, score: Math.round(e.score), bonus, rank: rank + 1 };
  });
  broadcast(room, { t: 'mgResults', game: mg.game, ranking });
  pushState(room);
  setTimeout(() => {
    if (!rooms.has(room.code)) return;
    room.round++;
    room.phase = 'board';
    room.busy = false;
    const first = nextConnectedIdx(room, 0);
    if (first === -1) return;
    room.turnIdx = first;
    pushState(room);
  }, 7000);
}

// ---------- WebSocket ----------
const wss = new WebSocketServer({ server });

wss.on('connection', ws => {
  let room = null, me = null;

  const joinRoom = (r, name, char) => {
    me = {
      id: rid(), ws, connected: true, pos: 0,
      char: CHAR_IDS.includes(char) ? char : 'gato',
      name: String(name || 'Jugador').trim().slice(0, 14) || 'Jugador',
      color: COLORS.find(c => !r.players.some(p => p.color === c)) || COLORS[0],
    };
    r.players.push(me);
    room = r;
    if (!r.hostId) r.hostId = me.id;
    send(ws, { t: 'joined', id: me.id, code: r.code, lan: lanUrls() });
    pushState(r);
  };

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.t === 'create' && !room) {
      const r = {
        code: newCode(), players: [], hostId: null, phase: 'lobby',
        turnIdx: 0, round: 1, busy: false, lastGame: null, mg: null, winnerId: null,
      };
      rooms.set(r.code, r);
      joinRoom(r, m.name, m.char);
      return;
    }
    if (m.t === 'join' && !room) {
      const r = rooms.get(String(m.code || '').toUpperCase().trim());
      if (!r) return send(ws, { t: 'error', msg: 'Esa sala no existe.' });
      if (r.phase !== 'lobby') return send(ws, { t: 'error', msg: 'La partida ya empezó.' });
      if (r.players.length >= MAX_PLAYERS) return send(ws, { t: 'error', msg: 'La sala está llena.' });
      joinRoom(r, m.name, m.char);
      return;
    }
    if (!room || !me) return;

    if (m.t === 'start' && me.id === room.hostId && room.phase === 'lobby') {
      room.phase = 'board';
      room.turnIdx = 0;
      room.round = 1;
      pushState(room);
    } else if (m.t === 'roll') {
      handleRoll(room, me);
    } else if (m.t === 'mg') {
      submitScore(room, me, m.score);
    }
  });

  ws.on('close', () => {
    if (!room || !me) return;
    me.connected = false;
    if (room.phase === 'lobby') {
      room.players = room.players.filter(p => p !== me);
      if (room.hostId === me.id) room.hostId = room.players[0] ? room.players[0].id : null;
    } else if (room.hostId === me.id) {
      const h = room.players.find(p => p.connected);
      if (h) room.hostId = h.id;
    }
    if (!room.players.some(p => p.connected)) {
      if (room.mg) clearTimeout(room.mg.timer);
      rooms.delete(room.code);
      return;
    }
    if (room.phase === 'board' && room.players[room.turnIdx] === me && !room.busy) advanceTurn(room);
    else if (room.phase === 'minigame') checkMinigameDone(room);
    else pushState(room);
  });
});

server.listen(PORT, () => {
  console.log('\n  Escaleras Party listo!\n');
  console.log(`  En esta compu:   http://localhost:${PORT}`);
  lanUrls().forEach(u => console.log(`  Para tus amigos: ${u}`));
  console.log('\n  (todos deben estar en la misma red WiFi)\n');
});
