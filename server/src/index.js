import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import http from 'node:http';
import crypto from 'node:crypto';
import { Server } from 'socket.io';
import { Room, STARTING_COINS, MIN_RAISE, FOODS, shuffleArray, generateRoomMenu, makeCode, safeRoom, beginRound, finishRound } from './game.js';

const PORT = Number(process.env.PORT || 4000);
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'food-bidding-server' }));
app.get('/api/menu', (_req, res) => res.json({ total: FOODS.length, foods: shuffleArray(FOODS) }));
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

const socketPlayer = new Map(); // socket.id -> { roomCode, playerId }
const playerSockets = new Map(); // playerId -> Set<socket.id>
const disconnectTimeouts = new Map(); // playerId -> timer
const roomLocks = new Map();

async function withRoomLock(code, task) {
  const sanitized = String(code || '').trim().toUpperCase();
  const prior = roomLocks.get(sanitized) || Promise.resolve();
  let release;
  const current = new Promise(resolve => { release = resolve; });
  const queued = prior.then(() => current);
  roomLocks.set(sanitized, queued);
  await prior;
  try { return await task(); }
  finally { release(); if (roomLocks.get(sanitized) === queued) roomLocks.delete(sanitized); }
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
      const playerId = crypto.randomUUID();
      const room = await Room.create({ code, players: [{ id: playerId, name: playerName, coins: STARTING_COINS, connected: true, foodsWon: [] }] });

      if (!playerSockets.has(playerId)) playerSockets.set(playerId, new Set());
      playerSockets.get(playerId).add(socket.id);
      socketPlayer.set(socket.id, { roomCode: code, playerId });

      socket.join(`room:${code}`);
      socket.join(`player:${playerId}`);
      socket.emit('room:created', { code, playerId });
      await publish(room);
    } catch (e) {
      console.error(e);
      fail(socket, 'Could not create room. Check the server and database.');
    }
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
        const playerId = crypto.randomUUID();
        room.players.push({ id: playerId, name: playerName, coins: STARTING_COINS, connected: true, foodsWon: [] });
        beginRound(room, room.players[0].id);
        room.updatedAt = new Date();
        await room.save();

        if (!playerSockets.has(playerId)) playerSockets.set(playerId, new Set());
        playerSockets.get(playerId).add(socket.id);
        socketPlayer.set(socket.id, { roomCode, playerId });

        socket.join(`room:${roomCode}`);
        socket.join(`player:${playerId}`);
        socket.emit('room:joined', { code: roomCode, playerId });
        await publish(room);
      });
    } catch (e) {
      console.error(e);
      fail(socket, 'Could not join room.');
    }
  });

  socket.on('room:shuffle-menu', async () => {
    const session = socketPlayer.get(socket.id);
    if (!session) return fail(socket, 'Join a room before shuffling the menu.');
    await withRoomLock(session.roomCode, async () => {
      const room = await loadRoom(session.roomCode);
      if (!room) return fail(socket, 'Room not found.');
      if (room.status !== 'waiting') return fail(socket, 'Menu can only be shuffled in the lobby before the match begins.');
      room.menu = generateRoomMenu();
      room.updatedAt = new Date();
      await room.save();
      await publish(room);
    }).catch(e => { console.error(e); fail(socket, 'Could not shuffle room menu.'); });
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
      const id = String(playerId || '').trim();
      if (!roomCode || !id) {
        return socket.emit('room:reconnect-failed', { message: 'Invalid reconnect details.' });
      }

      await withRoomLock(roomCode, async () => {
        const room = await loadRoom(roomCode);
        if (!room || !room.players.some(p => p.id === id)) {
          return socket.emit('room:reconnect-failed', { message: 'Previous room session expired or room not found.' });
        }

        // Cancel any pending disconnect timeout for this player
        if (disconnectTimeouts.has(id)) {
          clearTimeout(disconnectTimeouts.get(id));
          disconnectTimeouts.delete(id);
        }

        // Add to active sockets for this player
        if (!playerSockets.has(id)) playerSockets.set(id, new Set());
        playerSockets.get(id).add(socket.id);
        socketPlayer.set(socket.id, { roomCode, playerId: id });

        const player = room.players.find(p => p.id === id);
        if (player) {
          player.connected = true;
        }
        room.updatedAt = new Date();
        await room.save();

        socket.join(`room:${roomCode}`);
        socket.join(`player:${id}`);

        socket.emit('room:reconnected', { code: roomCode, playerId: id });
        await publish(room);
      });
    } catch (e) {
      console.error('Reconnect error:', e);
      fail(socket, 'Could not reconnect.');
    }
  });

  socket.on('room:leave', async () => {
    const session = socketPlayer.get(socket.id);
    if (!session) return;
    const { roomCode, playerId } = session;
    socketPlayer.delete(socket.id);
    const sockets = playerSockets.get(playerId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) playerSockets.delete(playerId);
    }
    if (disconnectTimeouts.has(playerId)) {
      clearTimeout(disconnectTimeouts.get(playerId));
      disconnectTimeouts.delete(playerId);
    }
    socket.leave(`room:${roomCode}`);
    socket.leave(`player:${playerId}`);

    try {
      await withRoomLock(roomCode, async () => {
        const room = await loadRoom(roomCode);
        if (!room) return;
        if (room.status === 'waiting') {
          room.players = room.players.filter(p => p.id !== playerId);
          if (room.players.length === 0) {
            await Room.deleteOne({ code: roomCode });
          } else {
            await room.save();
            await publish(room);
          }
        } else {
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.connected = false;
            await room.save();
            await publish(room);
          }
        }
      });
    } catch (e) {
      console.error('Error on room:leave:', e);
    }
  });

  socket.on('disconnect', async () => {
    const session = socketPlayer.get(socket.id);
    socketPlayer.delete(socket.id);
    if (!session) return;

    const { roomCode, playerId } = session;
    const sockets = playerSockets.get(playerId);
    if (sockets) {
      sockets.delete(socket.id);
      if (sockets.size === 0) {
        playerSockets.delete(playerId);
      }
    }

    // If player still has another connected socket, do not mark disconnected
    if (playerSockets.has(playerId) && playerSockets.get(playerId).size > 0) {
      return;
    }

    // Clear any existing disconnect timeout for this player
    if (disconnectTimeouts.has(playerId)) {
      clearTimeout(disconnectTimeouts.get(playerId));
    }

    // Grace period before marking disconnected (allows quick reconnect or page refresh)
    const timer = setTimeout(async () => {
      disconnectTimeouts.delete(playerId);
      if (playerSockets.has(playerId) && playerSockets.get(playerId).size > 0) {
        return;
      }
      try {
        await withRoomLock(roomCode, async () => {
          const room = await loadRoom(roomCode);
          if (!room) return;
          const player = room.players.find(p => p.id === playerId);
          if (player) {
            player.connected = false;
            await room.save();
            await publish(room);
          }
        });
      } catch (e) {
        console.error('Error marking player disconnected:', e);
      }
    }, 4000);

    disconnectTimeouts.set(playerId, timer);
  });
});

const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/food_bidding_game';
server.listen(PORT, () => {
  console.log(`Food Bidding server listening on http://localhost:${PORT}`);
});
