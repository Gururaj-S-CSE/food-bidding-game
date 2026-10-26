import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { ArrowUpRight, Check, ChefHat, CircleHelp, Copy, Crown, DoorOpen, Flame, Gavel, History, LoaderCircle, LogIn, LogOut, Minus, Plus, RotateCcw, ShieldCheck, Sparkles, Trophy, Users, Wallet, Wifi, WifiOff } from 'lucide-react';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
const MIN_RAISE = 50;

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [bidAmount, setBidAmount] = useState(100);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    setSocket(s);
    s.on('connect', () => { setConnected(true); setError(''); });
    s.on('disconnect', () => setConnected(false));
    s.on('room:created', ({ code, playerId: id }) => { setPlayerId(id); setNotice(`Room ${code} created. Share the code with a friend.`); });
    s.on('room:joined', ({ code, playerId: id }) => { setPlayerId(id); setNotice(`Connected to room ${code}.`); });
    s.on('game:state', next => { setRoom(next); setPlayerId(next.viewerId); setError(''); });
    s.on('game:error', payload => setError(payload?.message || 'Something went wrong.'));
    return () => s.disconnect();
  }, []);

  const me = room?.players?.find(p => p.id === playerId);
  const opponent = room?.players?.find(p => p.id !== playerId);
  const isMyTurn = room?.status === 'playing' && room.turnPlayerId === playerId;
  const minBid = room?.highestBidderId ? room.currentBid + MIN_RAISE : (room?.currentFood?.startingBid || 100);
  const maxAffordable = me?.coins ?? 1000;
  const highestBidder = room?.players?.find(p => p.id === room?.highestBidderId);
  const canBid = isMyTurn && bidAmount >= minBid && bidAmount <= maxAffordable && Number.isInteger(bidAmount);

  useEffect(() => {
    if (isMyTurn) setBidAmount(Math.min(maxAffordable, Math.max(minBid, minBid)));
  }, [isMyTurn, minBid, maxAffordable]);

  const sortedHistory = useMemo(() => [...(room?.bidHistory || [])].reverse(), [room?.bidHistory]);

  const createRoom = () => {
    setError(''); setNotice('');
    if (!name.trim()) return setError('Enter your name first.');
    socket?.emit('room:create', { name: name.trim() });
  };
  const joinRoom = () => {
    setError(''); setNotice('');
    if (!name.trim()) return setError('Enter your name first.');
    if (!joinCode.trim()) return setError('Enter the room code your friend shared.');
    socket?.emit('room:join', { name: name.trim(), code: joinCode.trim().toUpperCase() });
  };
  const placeBid = () => { setError(''); socket?.emit('bid:place', { amount: bidAmount }); };
  const pass = () => { setError(''); socket?.emit('bid:pass'); };
  const copyCode = async () => {
    try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { setNotice(`Share this room code with your friend: ${room.code}`); }
  };

  if (!room) return <main className="min-h-screen px-4 py-8 md:px-8">
    <div className="mx-auto max-w-6xl">
      <header className="flex items-center justify-between"><Brand /><div className={`connection-pill ${connected ? 'online' : ''}`}>{connected ? <Wifi size={15} /> : <WifiOff size={15} />}{connected ? 'Server connected' : 'Connecting…'}</div></header>
      <section className="hero-grid mt-10 grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
        <div className="py-5"><div className="eyebrow"><Sparkles size={14} /> THE FRIENDLY FOOD AUCTION</div><h1 className="hero-title mt-5">May the best<br /><span>foodie win.</span></h1><p className="mt-5 max-w-lg text-base leading-7 text-stone-400 md:text-lg">Go head-to-head in a live food auction. Take turns bidding, manage your coins, and build the tastiest collection over 10 rounds.</p>
          <div className="mt-7 flex flex-wrap gap-3 text-sm text-stone-300"><Feature icon={<Users size={16}/>} text="2 players"/><Feature icon={<Gavel size={16}/>} text="Turn-based bids"/><Feature icon={<Wallet size={16}/>} text="1,000 coins each"/></div>
          <div className="food-scatter" aria-hidden="true"><span>🍔</span><span>🍕</span><span>🍣</span><span>🌮</span><span>🍰</span></div>
        </div>
        <div className="panel relative mx-auto w-full max-w-lg p-5 md:p-7"><div className="absolute -right-3 -top-4 rounded-2xl bg-lime-300 p-3 text-stone-950 shadow-xl"><ChefHat size={25}/></div><div className="eyebrow">LET'S PLAY</div><h2 className="mt-2 text-2xl font-black tracking-tight">Enter the arena</h2><p className="mt-1 text-sm text-stone-400">Create a room or join a friend's game.</p>
          <label className="field-label mt-6" htmlFor="player-name">YOUR DISPLAY NAME</label><input id="player-name" className="field mt-2" placeholder="e.g. SnackMaster" maxLength={20} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createRoom()} />
          <button className="btn-primary mt-4 w-full" onClick={createRoom} disabled={!connected}><Sparkles size={17}/> Create a private room <ArrowUpRight size={17}/></button>
          <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-stone-600"><span className="h-px flex-1 bg-stone-800"/>OR JOIN A FRIEND<span className="h-px flex-1 bg-stone-800"/></div>
          <label className="field-label" htmlFor="room-code">ROOM CODE</label><div className="mt-2 flex gap-2"><input id="room-code" className="field code-input" placeholder="ABC123" maxLength={6} value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, ''))} onKeyDown={e => e.key === 'Enter' && joinRoom()} /><button className="btn-secondary shrink-0" onClick={joinRoom} disabled={!connected}><LogIn size={16}/> Join</button></div>
          {error && <Notice type="error" text={error}/>} {notice && <Notice text={notice}/>}
          <div className="mt-6 flex items-start gap-2 rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-xs leading-5 text-stone-400"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-lime-300"/>Virtual coins only. No real-money payments. Invite someone you know by sharing the room code.</div>
        </div>
      </section>
      <footer className="mt-14 flex flex-wrap justify-between gap-3 border-t border-stone-900 py-5 text-xs text-stone-600"><span>FOOD WARS © 2026</span><span>10 ROUNDS · 2 PLAYERS · ONE WINNER</span></footer>
    </div>
  </main>;

  if (room.status === 'waiting') return <main className="min-h-screen px-4 py-8 md:px-8"><div className="mx-auto max-w-5xl"><header className="flex items-center justify-between"><Brand/><div className="connection-pill online"><Wifi size={15}/> Room active</div></header><div className="panel mx-auto mt-14 max-w-2xl p-6 text-center md:p-10"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-300 text-stone-950"><Users size={30}/></div><div className="eyebrow mt-6 justify-center">PRIVATE LOBBY</div><h1 className="mt-3 text-4xl font-black">Your table is ready.</h1><p className="mt-3 text-stone-400">Share this room code with one friend. The match starts automatically when they join.</p><div className="room-code-box mx-auto mt-7 max-w-sm"><span>{room.code}</span><button onClick={copyCode} aria-label="Copy room code">{copied ? <Check/> : <Copy/>}</button></div><p className="mt-2 text-xs text-stone-500">Anyone with this code can join before the game starts.</p><div className="mt-8 grid gap-3 sm:grid-cols-2"><PlayerLobby player={me} self/><PlayerLobby player={opponent}/></div>{error && <Notice type="error" text={error}/>}<div className="mt-8 flex items-center justify-center gap-2 text-sm text-stone-400"><LoaderCircle size={16} className="animate-spin text-lime-300"/> Waiting for the second player…</div><button className="btn-ghost mt-7" onClick={() => { setRoom(null); setNotice(''); setError(''); }}><LogOut size={15}/> Leave lobby</button></div></div></main>;

  if (room.status === 'finished') {
    const winner = [...room.players].sort((a,b) => (b.foodsWon.length - a.foodsWon.length) || (b.coins - a.coins))[0];
    const won = winner?.id === playerId;
    return <main className="min-h-screen px-4 py-10"><div className="mx-auto max-w-4xl"><header className="flex items-center justify-between"><Brand/><div className="connection-pill">MATCH COMPLETE</div></header><div className="panel mt-10 p-6 text-center md:p-10"><div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-lime-300 text-stone-950"><Trophy size={38}/></div><div className="eyebrow mt-6 justify-center">10 ROUNDS · FINAL RESULTS</div><h1 className="mt-3 text-4xl font-black md:text-5xl">{won ? 'You are the Food Champ!' : `${winner?.name || 'Winner'} takes the crown!`}</h1><p className="mt-3 text-stone-400">The auction is over. Here's how your collections compare.</p><div className="mt-8 grid gap-3 sm:grid-cols-2">{room.players.map(p => <div key={p.id} className={`player-card text-left ${p.id === winner?.id ? 'winner-card' : ''}`}><div className="flex items-center justify-between"><span className="font-bold">{p.name}{p.id === playerId ? ' (You)' : ''}</span>{p.id === winner?.id && <Crown size={18} className="text-lime-300"/>}</div><div className="mt-4 grid grid-cols-2 gap-2"><div className="stat-tile"><span>Food won</span><b>{p.foodsWon.length}</b></div><div className="stat-tile"><span>Coins left</span><b>{p.coins.toLocaleString()}</b></div></div><div className="mt-4 flex flex-wrap gap-1 text-2xl">{p.foodsWon.map((f,i)=><span title={`${f.name} — ${f.price} coins`} key={`${f.round}-${i}`}>{f.emoji}</span>)}</div></div>)}</div><p className="mt-7 text-sm text-stone-500">Winner is decided by most food items collected, then remaining coins as a tiebreaker.</p><button className="btn-primary mx-auto mt-7" onClick={() => { setRoom(null); setPlayerId(''); setJoinCode(''); setNotice(''); setError(''); }}><RotateCcw size={17}/> Back to home</button></div></div></main>;
  }

  return <main className="min-h-screen px-4 py-5 md:px-8 md:py-8"><div className="mx-auto max-w-7xl"><header className="flex flex-wrap items-center justify-between gap-3"><Brand/><div className="flex flex-wrap items-center gap-2"><div className="connection-pill online"><span className="live-dot"/> LIVE MATCH</div><button className="room-chip" onClick={copyCode}><span>ROOM</span><b>{room.code}</b>{copied ? <Check size={14}/> : <Copy size={14}/>}</button></div></header>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4"><div><div className="eyebrow"><Flame size={14}/> THE AUCTION IS ON</div><h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Food <span className="text-lime-300">Wars.</span></h1><p className="mt-1 text-sm text-stone-500">Bid smart. Eat legendary. Repeat.</p></div><div className="round-progress"><div className="flex items-center justify-between text-xs text-stone-400"><span>ROUND PROGRESS</span><b className="text-lime-300">{room.roundIndex + 1} / {room.totalRounds}</b></div><div className="mt-2 flex gap-1">{Array.from({length: room.totalRounds}, (_,i)=><span key={i} className={`h-1.5 flex-1 rounded-full ${i < room.roundIndex ? 'bg-lime-300' : i === room.roundIndex ? 'bg-lime-300/60' : 'bg-stone-800'}`}/>)}</div></div></div>
    <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.25fr_.85fr]">
      <section className="space-y-3"><PlayerCard player={me} self active={isMyTurn}/><PlayerCard player={opponent} active={!isMyTurn && room.turnPlayerId === opponent?.id}/><div className="panel p-4"><div className="flex items-center gap-2 text-sm font-bold"><Wallet size={16} className="text-lime-300"/> Your coin purse</div><div className="mt-3 flex items-end justify-between"><b className="text-3xl tracking-tight">{(me?.coins ?? 0).toLocaleString()} <span className="text-sm font-semibold text-stone-500">coins</span></b><span className="text-xs text-stone-500">of 1,000 start</span></div><div className="coin-track mt-3"><div style={{width: `${Math.max(0,Math.min(100,(me?.coins || 0)/10))}%`}}/></div></div></section>
      <section className="panel overflow-hidden"><div className="flex items-center justify-between border-b border-stone-800 px-5 py-4"><div><div className="eyebrow">UP FOR GRABS</div><h2 className="mt-1 text-lg font-extrabold">Round {room.roundIndex + 1}</h2></div><span className="round-tag">ITEM {String(room.roundIndex + 1).padStart(2,'0')}</span></div><div className="food-stage"><div className="food-orbit orbit-one"/><div className="food-orbit orbit-two"/><span className="food-emoji" key={room.currentFood?.name}>{room.currentFood?.emoji}</span><span className="food-spark spark-a">✦</span><span className="food-spark spark-b">✧</span></div><div className="px-5 pb-5"><h2 className="text-center text-2xl font-black">{room.currentFood?.name}</h2><p className="mt-1 text-center text-sm text-stone-500">Starting bid · {room.currentFood?.startingBid} coins</p><div className="bid-display mt-5"><span className="text-xs font-bold uppercase tracking-[.18em] text-stone-500">CURRENT HIGHEST BID</span><div className="mt-1 flex items-baseline justify-center gap-2"><b className="text-4xl font-black tracking-tight">{room.currentBid.toLocaleString()}</b><span className="text-sm text-stone-500">coins</span></div><div className="mt-2 text-sm text-stone-400">{highestBidder ? `Leading: ${highestBidder.name}` : 'No bids yet — set the opening price'}</div></div>
        <div className={`turn-banner mt-4 ${isMyTurn ? 'your-turn' : ''}`}>{isMyTurn ? <><span className="turn-pulse"/> Your turn to bid</> : <><LoaderCircle size={15} className="animate-spin"/> Waiting for {room.players.find(p=>p.id === room.turnPlayerId)?.name || 'opponent'}</>}</div>
        <div className="mt-4"><label className="field-label" htmlFor="bid-amount">YOUR BID <span className="normal-case tracking-normal text-stone-600">(minimum {minBid})</span></label><div className="bid-input-row mt-2"><button className="bid-step" onClick={() => setBidAmount(v => Math.max(minBid, v - MIN_RAISE))} disabled={!isMyTurn || bidAmount <= minBid}><Minus size={17}/></button><input id="bid-amount" type="number" step={MIN_RAISE} min={minBid} max={maxAffordable} value={bidAmount} onChange={e=>setBidAmount(Number(e.target.value))} disabled={!isMyTurn} /><button className="bid-step" onClick={() => setBidAmount(v => Math.min(maxAffordable, Math.max(minBid, v) + MIN_RAISE))} disabled={!isMyTurn || bidAmount + MIN_RAISE > maxAffordable}><Plus size={17}/></button></div><div className="mt-2 flex flex-wrap gap-2">{[50,100,200].map(n=><button key={n} className="quick-bid" disabled={!isMyTurn} onClick={()=>setBidAmount(Math.min(maxAffordable, Math.max(minBid,bidAmount+n)))}>+{n}</button>)}<span className="ml-auto self-center text-xs text-stone-600">Raise by 50 min.</span></div><button className="btn-primary mt-4 w-full" onClick={placeBid} disabled={!canBid}><Gavel size={17}/> Place bid <ArrowUpRight size={16}/></button><button className="btn-secondary mt-2 w-full" onClick={pass} disabled={!isMyTurn}><LogOut size={16}/> Pass this item</button>{error && <Notice type="error" text={error}/>}<p className="mt-3 text-center text-[11px] leading-5 text-stone-600">Passing ends this auction if someone has bid. Your opponent wins at the current price.</p></div></div></section>
      <section className="panel flex min-h-[300px] flex-col"><div className="flex items-center gap-2 border-b border-stone-800 px-4 py-4"><History size={17} className="text-lime-300"/><h2 className="font-extrabold">Auction activity</h2><span className="ml-auto rounded-lg bg-stone-800 px-2 py-1 text-[10px] font-bold text-stone-400">LIVE</span></div><div className="flex-1 space-y-3 p-4">{sortedHistory.length === 0 ? <div className="flex h-44 flex-col items-center justify-center text-center"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-stone-500"><Gavel size={22}/></div><p className="mt-3 text-sm font-semibold text-stone-300">No bids yet</p><p className="mt-1 max-w-[190px] text-xs leading-5 text-stone-600">The first bid sets the pace. Make it count.</p></div> : sortedHistory.map((item,i)=><div key={`${item.at}-${i}`} className="activity-row"><div className={`activity-icon ${item.action === 'bid' ? 'bid-icon' : 'pass-icon'}`}>{item.action === 'bid' ? <Gavel size={15}/> : <LogOut size={15}/>}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.playerName}{item.playerId === playerId ? ' (You)' : ''}</p><p className="mt-0.5 text-xs text-stone-500">{item.action === 'bid' ? 'placed a bid' : 'passed'}</p></div>{item.action === 'bid' && <b className="text-sm text-lime-300">{item.amount}</b>}</div>)}{room.roundResults.length > 0 && <><div className="my-4 h-px bg-stone-800"/><p className="text-[10px] font-bold uppercase tracking-[.2em] text-stone-600">Previous rounds</p>{[...room.roundResults].reverse().slice(0,4).map(r=><div key={r.round} className="flex items-center gap-2 text-xs text-stone-400"><span className="text-lg">{r.emoji}</span><span className="min-w-0 flex-1 truncate">{r.food}</span><span className="text-stone-600">{r.winnerId ? `${r.winningBid} coins` : 'Unsold'}</span></div>)}</>}</div><div className="border-t border-stone-800 p-4"><div className="flex items-start gap-2 text-xs leading-5 text-stone-500"><CircleHelp size={15} className="mt-0.5 shrink-0"/><span>Each bid must beat the last by at least 50 coins. Your coins are only deducted when you win an item.</span></div></div></section>
    </div><footer className="mt-6 flex flex-wrap justify-between gap-3 border-t border-stone-900 py-5 text-xs text-stone-600"><span>ROOM {room.code} · PRIVATE MATCH</span><span>VIRTUAL COINS ONLY · HAVE FUN</span></footer></div></main>;
}

function Brand() { return <a href="/" className="flex items-center gap-3 text-white no-underline"><span className="brand-mark"><ChefHat size={22}/></span><span><b className="block text-sm font-black tracking-[.12em]">FOOD WARS</b><span className="block text-[10px] font-semibold tracking-[.2em] text-stone-500">THE LIVE AUCTION</span></span></a>; }
function Feature({icon,text}) { return <span className="feature-chip">{icon}{text}</span>; }
function Notice({text,type='info'}) { return <div className={`notice ${type === 'error' ? 'notice-error' : ''}`}>{text}</div>; }
function PlayerLobby({player,self}) { return <div className={`player-card text-left ${self ? 'winner-card' : ''}`}><div className="flex items-center gap-3"><div className="avatar">{player?.name?.slice(0,1)?.toUpperCase() || <Users size={17}/>}</div><div className="min-w-0 flex-1"><p className="truncate font-bold">{player ? `${player.name}${self ? ' (You)' : ''}` : 'Waiting for player'}</p><p className="mt-1 text-xs text-stone-500">{player ? 'Ready to play' : 'Share the room code'}</p></div><span className={`h-2 w-2 rounded-full ${player?.connected ? 'bg-lime-300' : 'bg-stone-700'}`}/></div></div>; }
function PlayerCard({player,self,active}) { return <div className={`player-card ${active ? 'active-player' : ''}`}><div className="flex items-center gap-3"><div className="avatar">{player?.name?.slice(0,1)?.toUpperCase() || <Users size={17}/>}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><b className="truncate">{player?.name || 'Player'}</b>{self && <span className="you-tag">YOU</span>}</div><div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">{player?.connected ? <><span className="live-dot"/> Online</> : <><WifiOff size={12}/> Disconnected</>}</div></div>{active && <span className="turn-indicator">TURN</span>}</div><div className="mt-4 flex items-end justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-stone-600">COINS LEFT</p><p className="mt-1 text-2xl font-black tracking-tight">{(player?.coins ?? 1000).toLocaleString()}</p></div><div className="text-right"><p className="text-[10px] font-bold uppercase tracking-[.17em] text-stone-600">FOOD WON</p><p className="mt-1 text-2xl font-black">{player?.foodsWon?.length || 0}<span className="ml-1 text-xs font-semibold text-stone-600">/ 10</span></p></div></div><div className="mt-3 flex min-h-7 flex-wrap gap-1">{player?.foodsWon?.map((f,i)=><span key={`${f.round}-${i}`} className="food-won" title={`${f.name} — ${f.price} coins`}>{f.emoji}</span>)}{!player?.foodsWon?.length && <span className="text-xs text-stone-700">No food collected yet</span>}</div></div>; }

export default App;
