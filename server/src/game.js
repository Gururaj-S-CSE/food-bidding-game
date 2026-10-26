
import crypto from 'node:crypto';

export const STARTING_COINS = 1000;
export const TOTAL_ROUNDS = 10;
export const MIN_RAISE = 50;

export const FOODS = [
  { name: "Poori Masala", emoji: "🍛" },
  { name: "Maggi", emoji: "🍜" },
  { name: "Butter Naan", emoji: "🫓" },
  { name: "Kerala Parotta", emoji: "🫓" },
  { name: "Paani Puri", emoji: "🥙" },
  { name: "Masala Puri", emoji: "🥣" },
  { name: "White Sauce Pasta", emoji: "🍝" },
  { name: "Pizza", emoji: "🍕" },
  { name: "Burger", emoji: "🍔" },
  { name: "French Fries", emoji: "🍟" },
  { name: "Chicken 65", emoji: "🍗" },
  { name: "Shawarma", emoji: "🌯" },
  { name: "Fried Rice", emoji: "🍚" },
  { name: "Veg Noodles", emoji: "🥡" },
  { name: "Sandwich", emoji: "🥪" },
  { name: "Momos", emoji: "🥟" },
  { name: "Samosa", emoji: "🥟" },
  { name: "Pav Bhaji", emoji: "🍞" },
  { name: "Kothu Parotta", emoji: "🍳" },
  { name: "Chocolate Milkshake", emoji: "🥤" },
];

// Temporary storage: rooms exist only while the server is running.
const rooms = new Map();

function clone(value) {
  return structuredClone(value);
}

export class Room {
  constructor(data) {
    Object.assign(this, clone(data));
  }

  toObject() {
    return clone({
      code: this.code,
      status: this.status,
      players: this.players,
      roundIndex: this.roundIndex,
      currentFood: this.currentFood,
      currentBid: this.currentBid,
      highestBidderId: this.highestBidderId,
      turnPlayerId: this.turnPlayerId,
      openingPlayerId: this.openingPlayerId,
      passedPlayerIds: this.passedPlayerIds,
      bidHistory: this.bidHistory,
      roundResults: this.roundResults,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    });
  }

  async save() {
    rooms.set(this.code, this);
    return this;
  }

  static async create(data) {
    if (rooms.has(data.code)) {
      throw new Error('Room code already exists.');
    }
    const room = new Room({
      status: 'waiting',
      players: [],
      roundIndex: 0,
      currentFood: null,
      currentBid: 0,
      highestBidderId: null,
      turnPlayerId: null,
      openingPlayerId: null,
      passedPlayerIds: [],
      bidHistory: [],
      roundResults: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data
    });
    rooms.set(room.code, room);
    return room;
  }

  static async findOne({ code }) {
    return rooms.get(String(code)) || null;
  }

  static async exists({ code }) {
    return rooms.has(String(code)) ? { _id: code } : null;
  }
}

export function safeRoom(room, viewerId) {
  if (!room) return null;
  const r = room.toObject ? room.toObject() : room;

  return {
    code: r.code,
    status: r.status,
    players: r.players.map(p => ({
      id: p.id,
      name: p.name,
      coins: p.coins,
      connected: p.connected,
      foodsWon: p.foodsWon || []
    })),
    roundIndex: r.roundIndex,
    totalRounds: TOTAL_ROUNDS,
    currentFood: r.currentFood,
    currentBid: r.currentBid,
    highestBidderId: r.highestBidderId,
    turnPlayerId: r.turnPlayerId,
    openingPlayerId: r.openingPlayerId,
    passedPlayerIds: r.passedPlayerIds,
    bidHistory: r.bidHistory,
    roundResults: r.roundResults,
    viewerId
  };
}

export function makeCode() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

export function beginRound(room, openingPlayerId = room.players[0].id) {
  if (room.roundIndex >= TOTAL_ROUNDS) {
    room.status = 'finished';
    room.turnPlayerId = null;
    room.currentFood = null;
    return;
  }

  room.status = 'playing';
  room.currentFood = FOODS[room.roundIndex];
  room.currentBid = 0;
  room.highestBidderId = null;
  room.openingPlayerId = openingPlayerId;
  room.turnPlayerId = openingPlayerId;
  room.passedPlayerIds = [];
  room.bidHistory = [];
}

export function finishRound(room, winnerId, amount) {
  const food = room.currentFood;

  if (winnerId) {
    const winner = room.players.find(p => p.id === winnerId);
    if (!winner || winner.coins < amount) {
      throw new Error('Winner has insufficient coins.');
    }

    winner.coins -= amount;
    winner.foodsWon.push({
      name: food.name,
      emoji: food.emoji,
      price: amount,
      round: room.roundIndex + 1
    });
  }

  room.roundResults.push({
    round: room.roundIndex + 1,
    food: food.name,
    emoji: food.emoji,
    winnerId: winnerId || null,
    winningBid: winnerId ? amount : 0
  });

  room.roundIndex += 1;

  if (room.roundIndex >= TOTAL_ROUNDS) {
    room.status = 'finished';
    room.currentFood = null;
    room.turnPlayerId = null;
    room.currentBid = 0;
    room.highestBidderId = null;
  } else {
    const nextOpening =
      room.players.find(p => p.id !== room.openingPlayerId)?.id ||
      room.players[0].id;

    beginRound(room, nextOpening);
  }

  room.updatedAt = new Date();
}
