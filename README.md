# Food Wars — Online 1v1 Food Bidding Game

A full-stack multiplayer MVP with React + Vite + Tailwind CSS, Express, Socket.IO, and MongoDB.

## Game rules implemented

- Two players per private room, joined by a six-character room code.
- Each player starts with 1,000 virtual coins.
- Ten food rounds, with the food list and starting bid defined in `server/src/game.js`.
- Players alternate turns. The opening player changes each round.
- The first bid must meet the food's starting bid. Each subsequent bid must be at least 50 coins higher.
- A player can only bid up to their available coins. Coins are deducted only when they win an item.
- Passing after a bid awards the item to the highest bidder at the current bid. If both players pass without a bid, the item is unsold.
- Match winner: most food items collected; remaining coins break ties.
- Room state is persisted in MongoDB; Socket.IO broadcasts authoritative state updates.

## Requirements

- Node.js 20+ recommended
- MongoDB local instance or MongoDB Atlas connection string

## 1. Configure MongoDB

For local MongoDB, ensure the MongoDB service is running. Or create a MongoDB Atlas cluster and copy its connection string.

Copy `.env.example` to `server/.env` and set `MONGODB_URI`:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/food_bidding_game
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

For Atlas, replace the local URI with your Atlas connection string. Keep credentials in `server/.env`; never commit that file.

## 2. Install dependencies

From the project root:

```bash
npm install
```

## 3. Run the app

```bash
npm run dev
```

- Frontend: http://localhost:5173
- Backend health check: http://localhost:4000/api/health

Open the frontend in two separate browser windows (or use two devices on the same reachable network), enter different display names, create a room in one window, and enter the room code in the other.

## Project structure

```text
food-bidding-game/
├── client/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── server/
│   ├── src/
│   │   ├── game.js
│   │   └── index.js
│   └── package.json
├── .env.example
├── .gitignore
└── package.json
```

## Socket events

| Event | Direction | Purpose |
|---|---|---|
| `room:create` | client → server | Create a private room |
| `room:created` | server → client | Return the room code |
| `room:join` | client → server | Join a waiting room |
| `room:joined` | server → client | Confirm membership |
| `game:state` | server → clients | Send current authoritative game state |
| `bid:place` | client → server | Submit a bid; server validates turn, amount, and balance |
| `bid:pass` | client → server | Pass and resolve the auction |
| `game:error` | server → client | Report a rejected action |

## Important MVP limitations before public deployment

This is a learning MVP, not a hardened production service. Room player IDs currently use Socket.IO connection IDs; reconnect support is therefore best-effort and not suitable for identity verification. Add authenticated accounts or signed reconnect tokens, rate limiting, input validation, room expiry/cleanup, persistent turn recovery, production CORS configuration, HTTPS, and deployment secrets before opening it to the public. The in-process room lock coordinates actions within one server process only; use a distributed coordination strategy if scaling to multiple server instances. Do not use real-money wagers.
# food-bidding-game
