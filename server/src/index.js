import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import { Server } from 'socket.io';
import { Room, STARTING_COINS, MIN_RAISE, makeCode, safeRoom, beginRound, finishRound } from './game.js';

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'food-bidding-server' }));
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] } });

const socketPlayer = new Map(); // socket.id -> { roomCode, playerId }
const roomLocks = new Map();
async function withRoomLock(code, task) {
  const prior = roomLocks.get(code) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  const queued = prior.then(() => current);
  roomLocks.set(code, queued);
  await prior;
  try { return await task(); }
  finally { release(); if (roomLocks.get(code) === queued) roomLocks.delete(code); }
}
function fail(socket, message) { socket.emit('game:error', { message }); }
async function publish(room) {
  const plain = room.toObject ? room.toObject() : room;
  for (const player of plain.players) {
    io.to(`player:${player.id}`).emit('game:state', safeRoom(plain, player.id));
  }
  io.to(`room:${plain.code}`).emit('game:room-update', { code: plain.code, status: plain.status, players: plain.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })) });
}
async function loadRoom(code) { return Room.findOne({ code: String(code || '').trim().toUpperCase() }); }

io.on('connection', socket => {
  socket.on('room:create', async ({ name } = {}) => {
    try {
      const playerName = String(name || '').trim().slice(0, 20);
      if (!playerName) return fail(socket, 'Enter a display name first.');
      let code;
      for (let i = 0; i < 8; i++) {
        code = makeCode();
        if (!(await Room.exists({ code }))) break;
      }
      const playerId = socket.id;
      const room = await Room.create({ code, players: [{ id: playerId, name: playerName, coins: STARTING_COINS, connected: true, foodsWon: [] }] });
      socketPlayer.set(socket.id, { roomCode: code, playerId });
      socket.join(`room:${code}`); socket.join(`player:${playerId}`);
      socket.emit('room:created', { code, playerId });
      await publish(room);
    } catch (e) { console.error(e); fail(socket, 'Could not create room. Check the server and database.'); }
  });

  socket.on('room:join', async ({ code, name } = {}) => {
    try {
      const roomCode = String(code || '').trim().toUpperCase();
      const playerName = String(name || '').trim().slice(0, 20);
      if (!roomCode || !playerName) return fail(socket, 'Enter your name and room code.');
      await withRoomLock(roomCode, async () => {
        const room = await loadRoom(roomCode);
        if (!room) return fail(socket, 'Room not found. Check the code and try again.');
        if (room.status !== 'waiting') return fail(socket, 'This game has already started.');
        if (room.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) return fail(socket, 'Choose a different name from the other player.');
        if (room.players.length >= 2) return fail(socket, 'This room is full.');
        const playerId = socket.id;
        room.players.push({ id: playerId, name: playerName, coins: STARTING_COINS, connected: true, foodsWon: [] });
        beginRound(room, room.players[0].id);
        room.updatedAt = new Date();
        await room.save();
        socketPlayer.set(socket.id, { roomCode, playerId });
        socket.join(`room:${roomCode}`); socket.join(`player:${playerId}`);
        socket.emit('room:joined', { code: roomCode, playerId });
        await publish(room);
      });
    } catch (e) { console.error(e); fail(socket, 'Could not join room.'); }
  });

  socket.on('bid:place', async ({ amount } = {}) => {
    const session = socketPlayer.get(socket.id);
    if (!session) return fail(socket, 'Join a room before bidding.');
    await withRoomLock(session.roomCode, async () => {
      const room = await loadRoom(session.roomCode);
      if (!room || room.status !== 'playing') return fail(socket, 'There is no active auction.');
      const player = room.players.find(p => p.id === session.playerId);
      if (!player || room.turnPlayerId !== session.playerId) return fail(socket, 'It is not your turn.');
      const bid = Number(amount);
      const minimum = room.highestBidderId ? room.currentBid + MIN_RAISE : 100;
      if (!Number.isSafeInteger(bid) || bid < minimum) return fail(socket, `Your bid must be at least ${minimum} coins.`);
      if (bid > player.coins) return fail(socket, 'You do not have enough coins for that bid.');
      room.currentBid = bid;
      room.highestBidderId = player.id;
      room.bidHistory.push({ playerId: player.id, playerName: player.name, amount: bid, action: 'bid', at: new Date() });
      room.turnPlayerId = room.players.find(p => p.id !== player.id).id;
      room.passedPlayerIds = [];
      room.updatedAt = new Date();
      await room.save(); await publish(room);
    }).catch(e => { console.error(e); fail(socket, 'Bid could not be processed.'); });
  });

  socket.on('bid:pass', async () => {
    const session = socketPlayer.get(socket.id);
    if (!session) return fail(socket, 'Join a room before passing.');
    await withRoomLock(session.roomCode, async () => {
      const room = await loadRoom(session.roomCode);
      if (!room || room.status !== 'playing') return fail(socket, 'There is no active auction.');
      const player = room.players.find(p => p.id === session.playerId);
      if (!player || room.turnPlayerId !== session.playerId) return fail(socket, 'It is not your turn.');
      room.bidHistory.push({ playerId: player.id, playerName: player.name, amount: room.currentBid, action: 'pass', at: new Date() });
      if (room.highestBidderId) {
        finishRound(room, room.highestBidderId, room.currentBid);
      } else {
        room.passedPlayerIds.push(player.id);
        if (room.passedPlayerIds.length >= 2) finishRound(room, null, 0);
        else room.turnPlayerId = room.players.find(p => p.id !== player.id).id;
      }
      await room.save(); await publish(room);
    }).catch(e => { console.error(e); fail(socket, 'Pass could not be processed.'); });
  });

  socket.on('room:reconnect', async ({ code, playerId } = {}) => {
    try {
      const roomCode = String(code || '').trim().toUpperCase();
      const id = String(playerId || '');
      const room = await loadRoom(roomCode);
      if (!room || !room.players.some(p => p.id === id)) return fail(socket, 'Reconnect details are no longer valid. Create or join a new room.');
      const player = room.players.find(p => p.id === id);
      // Socket IDs are ephemeral. This basic reconnect path is intentionally not treated as identity verification.
      player.connected = true;
      await room.save();
      socketPlayer.set(socket.id, { roomCode, playerId: id });
      socket.join(`room:${roomCode}`); socket.join(`player:${id}`);
      socket.emit('room:joined', { code: roomCode, playerId: id });
      await publish(room);
    } catch (e) { console.error(e); fail(socket, 'Could not reconnect.'); }
  });

  socket.on('disconnect', async () => {
    const session = socketPlayer.get(socket.id);
    socketPlayer.delete(socket.id);
    if (!session) return;
    try {
      await withRoomLock(session.roomCode, async () => {
        const room = await loadRoom(session.roomCode);
        if (!room) return;
        const player = room.players.find(p => p.id === session.playerId);
        if (player) player.connected = false;
        await room.save(); await publish(room);
      });
    } catch (e) { console.error(e); }
  });
});

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_bidding_game';
server.listen(PORT, () => {
  console.log(`Food Bidding server listening on http://localhost:${PORT}`);
});
