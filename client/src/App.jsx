import { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import {
  ArrowUpRight, Check, ChefHat, CircleHelp, Copy, Crown, DoorOpen,
  Flame, Gavel, History, LoaderCircle, LogIn, LogOut, Minus, Plus,
  RotateCcw, ShieldCheck, Sparkles, Trophy, Users, Wallet, Wifi,
  WifiOff, UtensilsCrossed, Shuffle, Search, X
} from 'lucide-react';
import { FOODS as ALL_FOODS, CATEGORIES, shuffleArray } from './foods';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:4000';
const MIN_RAISE = 50;

const SESSION_STORAGE_KEY = 'food_wars_active_session';
const NAME_STORAGE_KEY = 'food_wars_player_name';

function getStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && data.roomCode && data.playerId) return data;
  } catch {}
  return null;
}

function saveStoredSession(session) {
  try {
    if (session && session.roomCode && session.playerId) {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  } catch {}
}

function clearStoredSession() {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch {}
}

function getStoredName() {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

function saveStoredName(name) {
  try {
    if (name) localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch {}
}

function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState(() => getStoredName());
  const [joinCode, setJoinCode] = useState('');
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [bidAmount, setBidAmount] = useState(100);
  const [copied, setCopied] = useState(false);

  const initialSession = getStoredSession();
  const sessionRef = useRef(initialSession);
  const nameRef = useRef(name);
  const [isReconnecting, setIsReconnecting] = useState(() => !!initialSession);

  useEffect(() => {
    nameRef.current = name;
  }, [name]);

  // Menu modal and dynamic shuffle state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuTab, setMenuTab] = useState('all'); // 'match' or 'all'
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [shuffledFoods, setShuffledFoods] = useState(() => shuffleArray(ALL_FOODS));
  const [heroScatter, setHeroScatter] = useState(() => shuffleArray(ALL_FOODS).slice(0, 6));
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    const s = io(SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });
    setSocket(s);

    s.on('connect', () => {
      setConnected(true);
      setError('');
      // Auto-reconnect if session exists
      const currentSession = sessionRef.current || getStoredSession();
      if (currentSession?.roomCode && currentSession?.playerId) {
        s.emit('room:reconnect', {
          code: currentSession.roomCode,
          playerId: currentSession.playerId
        });
      }
    });

    s.on('disconnect', () => {
      setConnected(false);
    });

    s.on('room:created', ({ code, playerId: id }) => {
      setPlayerId(id);
      setIsReconnecting(false);
      const session = { roomCode: code, playerId: id, playerName: nameRef.current };
      sessionRef.current = session;
      saveStoredSession(session);
      setNotice(`Room ${code} created. Share the code with a friend.`);
    });

    s.on('room:joined', ({ code, playerId: id }) => {
      setPlayerId(id);
      setIsReconnecting(false);
      const session = { roomCode: code, playerId: id, playerName: nameRef.current };
      sessionRef.current = session;
      saveStoredSession(session);
      setNotice(`Connected to room ${code}.`);
    });

    s.on('room:reconnected', ({ code, playerId: id }) => {
      setPlayerId(id);
      setIsReconnecting(false);
      const session = { roomCode: code, playerId: id, playerName: nameRef.current };
      sessionRef.current = session;
      saveStoredSession(session);
      setNotice(`Reconnected to room ${code}.`);
    });

    s.on('room:reconnect-failed', ({ message }) => {
      clearStoredSession();
      sessionRef.current = null;
      setIsReconnecting(false);
      setRoom(null);
      setPlayerId('');
      setError(message || 'Previous session expired. Create or join a new room.');
    });

    s.on('game:state', next => {
      setRoom(next);
      setPlayerId(next.viewerId);
      setIsReconnecting(false);
      setError('');
      if (next.code && next.viewerId) {
        const activeSession = {
          roomCode: next.code,
          playerId: next.viewerId,
          playerName: next.players?.find(p => p.id === next.viewerId)?.name || nameRef.current
        };
        sessionRef.current = activeSession;
        saveStoredSession(activeSession);
      }
    });

    s.on('game:error', payload => {
      setIsReconnecting(false);
      setError(payload?.message || 'Something went wrong.');
    });

    return () => {
      s.disconnect();
    };
  }, []);

  // Handle tab visibility and focus to recover connections dropped during idle/background
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && socket) {
        if (!socket.connected) {
          socket.connect();
        } else {
          const cur = sessionRef.current || getStoredSession();
          if (cur?.roomCode && cur?.playerId) {
            socket.emit('room:reconnect', { code: cur.roomCode, playerId: cur.playerId });
          }
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [socket]);

  // Timeout guard for reconnecting state
  useEffect(() => {
    if (isReconnecting) {
      const timer = setTimeout(() => {
        setIsReconnecting(false);
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [isReconnecting]);

  const me = room?.players?.find(p => p.id === playerId);
  const opponent = room?.players?.find(p => p.id !== playerId);
  const isMyTurn = room?.status === 'playing' && room.turnPlayerId === playerId;
  const minBid = room?.highestBidderId ? room.currentBid + MIN_RAISE : 100;
  const maxAffordable = me?.coins ?? 1000;
  const highestBidder = room?.players?.find(p => p.id === room?.highestBidderId);
  const canBid = isMyTurn && bidAmount >= minBid && bidAmount <= maxAffordable && Number.isInteger(bidAmount);

  useEffect(() => {
    if (isMyTurn) setBidAmount(Math.min(maxAffordable, Math.max(minBid, minBid)));
  }, [isMyTurn, minBid, maxAffordable]);

  const sortedHistory = useMemo(() => [...(room?.bidHistory || [])].reverse(), [room?.bidHistory]);

  const handleNameChange = (val) => {
    setName(val);
    saveStoredName(val);
  };

  const createRoom = () => {
    setError(''); setNotice('');
    const trimmed = name.trim();
    if (!trimmed) return setError('Enter your name first.');
    saveStoredName(trimmed);
    socket?.emit('room:create', { name: trimmed });
  };

  const joinRoom = () => {
    setError(''); setNotice('');
    const trimmedName = name.trim();
    const trimmedCode = joinCode.trim().toUpperCase();
    if (!trimmedName) return setError('Enter your name first.');
    if (!trimmedCode) return setError('Enter the room code your friend shared.');
    saveStoredName(trimmedName);
    socket?.emit('room:join', { name: trimmedName, code: trimmedCode });
  };

  const leaveLobby = () => {
    socket?.emit('room:leave');
    clearStoredSession();
    sessionRef.current = null;
    setIsReconnecting(false);
    setRoom(null);
    setPlayerId('');
    setNotice('');
    setError('');
  };

  const backToHome = () => {
    socket?.emit('room:leave');
    clearStoredSession();
    sessionRef.current = null;
    setIsReconnecting(false);
    setRoom(null);
    setPlayerId('');
    setJoinCode('');
    setNotice('');
    setError('');
  };

  const handleBrandHome = () => {
    if (room) {
      if (window.confirm('Do you want to leave your room and return to home?')) {
        leaveLobby();
      }
    }
  };

  const placeBid = () => { setError(''); socket?.emit('bid:place', { amount: bidAmount }); };
  const pass = () => { setError(''); socket?.emit('bid:pass'); };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(room.code); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch { setNotice(`Share this room code with your friend: ${room.code}`); }
  };

  // Open menu and shuffle every time opened as requested
  const openMenuModal = (tab = null) => {
    setShuffledFoods(shuffleArray(ALL_FOODS));
    if (tab) {
      setMenuTab(tab);
    } else {
      setMenuTab(room?.menu?.length ? 'match' : 'all');
    }
    setMenuOpen(true);
  };

  const handleManualShuffle = () => {
    setIsSpinning(true);
    setShuffledFoods(shuffleArray(ALL_FOODS));
    setHeroScatter(shuffleArray(ALL_FOODS).slice(0, 6));
    if (room && room.status === 'waiting') {
      socket?.emit('room:shuffle-menu');
    }
    setTimeout(() => setIsSpinning(false), 500);
  };

  const filteredFoods = useMemo(() => {
    let list = shuffledFoods;
    if (selectedCategory !== 'All') {
      list = list.filter(f => f.category === selectedCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q))
      );
    }
    return list;
  }, [shuffledFoods, selectedCategory, searchQuery]);

  // Reconnecting view when user refreshed or is restoring an active room
  if (isReconnecting && !room) {
    return (
      <main className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="panel p-8 text-center max-w-sm w-full">
          <LoaderCircle size={36} className="animate-spin text-lime-300 mx-auto" />
          <h2 className="mt-4 font-black text-xl">Reconnecting to table…</h2>
          <p className="mt-2 text-xs text-stone-400">
            Restoring your active session for room <span className="font-mono font-bold text-lime-300">{sessionRef.current?.roomCode}</span>
          </p>
          <button
            className="btn-secondary mt-6 text-xs w-full py-2.5"
            onClick={leaveLobby}
          >
            Cancel and Return to Lobby
          </button>
        </div>
      </main>
    );
  }

  // Landing view
  if (!room) return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Brand onHomeClick={handleBrandHome} />
          <div className="flex items-center gap-2">
            <button className="btn-menu-pill" onClick={() => openMenuModal('all')} title="Explore the menu">
              <UtensilsCrossed size={15} />
              <span>Menu</span>
              <span className="menu-badge">{ALL_FOODS.length} Dishes</span>
            </button>
            <div className={`connection-pill ${connected ? 'online' : ''}`}>
              {connected ? <Wifi size={15} /> : <WifiOff size={15} />}
              {connected ? 'Server connected' : 'Connecting…'}
            </div>
          </div>
        </header>

        <section className="hero-grid mt-10 grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div className="py-5">
            <div className="eyebrow"><Sparkles size={14} /> LIVE FOOD BIDDING AUCTION</div>
            <h1 className="hero-title mt-5">May the best<br /><span>foodie win.</span></h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-stone-400 md:text-lg">
              Go head-to-head in a live 1v1 food auction. Outbid your friend, manage your coins, and build the ultimate feast from 65+ randomized delicacies over 10 rounds.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm text-stone-300">
              <Feature icon={<Users size={16} />} text="2 players" />
              <Feature icon={<Gavel size={16} />} text="Turn-based bids" />
              <Feature icon={<Wallet size={16} />} text="1,000 coins each" />
              <Feature icon={<UtensilsCrossed size={16} />} text={`${ALL_FOODS.length} Shuffled items`} />
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button className="btn-secondary text-xs font-bold py-2.5 px-4 flex items-center gap-2" onClick={() => openMenuModal('all')}>
                <UtensilsCrossed size={15} /> Browse Full Menu ({ALL_FOODS.length})
              </button>
              <button className="btn-secondary text-xs font-bold py-2.5 px-3 flex items-center gap-1.5" onClick={handleManualShuffle} title="Click to shuffle the menu">
                <Shuffle size={14} className={isSpinning ? 'animate-spin' : ''} /> Shuffle
              </button>
            </div>

            <div className="food-scatter" onClick={handleManualShuffle} title="Click to shuffle dishes!" role="button" tabIndex={0}>
              {heroScatter.map((f, i) => (
                <span key={`${f.name}-${i}`} title={`${f.name} (${f.category})`}>{f.emoji}</span>
              ))}
            </div>
          </div>

          <div className="panel relative mx-auto w-full max-w-lg p-5 md:p-7">
            <div className="absolute -right-3 -top-4 rounded-2xl bg-lime-300 p-3 text-stone-950 shadow-xl">
              <ChefHat size={25} />
            </div>
            <div className="eyebrow">LET'S PLAY</div>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Enter the arena</h2>
            <p className="mt-1 text-sm text-stone-400">Create a room or join a friend's game.</p>

            <label className="field-label mt-6" htmlFor="player-name">YOUR DISPLAY NAME</label>
            <input
              id="player-name"
              className="field mt-2"
              placeholder="e.g. SnackMaster"
              maxLength={20}
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createRoom()}
            />

            <button className="btn-primary mt-4 w-full" onClick={createRoom} disabled={!connected}>
              <Sparkles size={17} /> Create a private room <ArrowUpRight size={17} />
            </button>

            <div className="my-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[.2em] text-stone-600">
              <span className="h-px flex-1 bg-stone-800" />OR JOIN A FRIEND<span className="h-px flex-1 bg-stone-800" />
            </div>

            <label className="field-label" htmlFor="room-code">ROOM CODE</label>
            <div className="mt-2 flex gap-2">
              <input
                id="room-code"
                className="field code-input"
                placeholder="ABC123"
                maxLength={6}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase().replace(/[^A-F0-9]/g, ''))}
                onKeyDown={e => e.key === 'Enter' && joinRoom()}
              />
              <button className="btn-secondary shrink-0" onClick={joinRoom} disabled={!connected}>
                <LogIn size={16} /> Join
              </button>
            </div>

            {error && <Notice type="error" text={error} />}
            {notice && <Notice text={notice} />}

            <div className="mt-6 flex items-start gap-2 rounded-xl border border-stone-800 bg-stone-900/60 p-3 text-xs leading-5 text-stone-400">
              <ShieldCheck size={16} className="mt-0.5 shrink-0 text-lime-300" />
              Virtual coins only. No real money. Each room automatically rolls 10 fresh, randomized dishes for the match.
            </div>
          </div>
        </section>

        <footer className="mt-14 flex flex-wrap justify-between gap-3 border-t border-stone-900 py-5 text-xs text-stone-600">
          <span>FOOD WARS © 2026</span>
          <span>10 ROUNDS · {ALL_FOODS.length} DISH CATALOG · SHUFFLED EVERY MATCH</span>
        </footer>
      </div>

      <MenuModal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        room={room}
        allFoods={ALL_FOODS}
        onShuffle={handleManualShuffle}
        isSpinning={isSpinning}
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredFoods={filteredFoods}
      />
    </main>
  );

  // Waiting in lobby
  if (room.status === 'waiting') return (
    <main className="min-h-screen px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Brand onHomeClick={handleBrandHome} />
          <div className="flex items-center gap-2">
            <button className="btn-menu-pill" onClick={() => openMenuModal('match')} title="View match menu">
              <UtensilsCrossed size={15} />
              <span>Lineup</span>
              <span className="menu-badge">10 Dishes</span>
            </button>
            <div className="connection-pill online"><Wifi size={15} /> Room active</div>
          </div>
        </header>

        <div className="panel mx-auto mt-12 max-w-2xl p-6 text-center md:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-lime-300 text-stone-950">
            <Users size={30} />
          </div>
          <div className="eyebrow mt-6 justify-center">PRIVATE LOBBY</div>
          <h1 className="mt-3 text-4xl font-black">Your table is ready.</h1>
          <p className="mt-3 text-stone-400">Share this room code with one friend. The match starts automatically when they join.</p>

          <div className="room-code-box mx-auto mt-7 max-w-sm">
            <span>{room.code}</span>
            <button onClick={copyCode} aria-label="Copy room code">{copied ? <Check /> : <Copy />}</button>
          </div>
          <p className="mt-2 text-xs text-stone-500">Anyone with this code can join before the game starts.</p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <PlayerLobby player={me} self />
            <PlayerLobby player={opponent} />
          </div>

          {/* 10-Round Lineup Preview with Re-shuffle */}
          <div className="mt-8 rounded-2xl border border-stone-800 bg-stone-900/60 p-4 text-left">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="eyebrow text-[10px]"><Sparkles size={13} /> AUCTION LINEUP · 10 ROUNDS</div>
                <h3 className="mt-1 text-sm font-extrabold text-stone-800">Today's Shuffled Menu</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  onClick={handleManualShuffle}
                  title="Roll a fresh randomized 10-dish menu"
                >
                  <Shuffle size={13} className={isSpinning ? 'animate-spin' : ''} /> Re-shuffle
                </button>
                <button
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  onClick={() => openMenuModal('match')}
                >
                  Full Details <ArrowUpRight size={13} />
                </button>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(room.menu || []).map((f, idx) => (
                <div key={`${f.name}-${idx}`} className="lobby-food-pill" title={`${f.name} — ${f.description || f.category}`}>
                  <span className="text-xl shrink-0">{f.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-stone-800">{f.name}</p>
                    <span className="text-[10px] text-stone-500">Round {idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <Notice type="error" text={error} />}

          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-stone-400">
            <LoaderCircle size={16} className="animate-spin text-lime-300" /> Waiting for the second player…
          </div>

          <button className="btn-ghost mt-7" onClick={leaveLobby}>
            <LogOut size={15} /> Leave lobby
          </button>
        </div>
      </div>

      <MenuModal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        room={room}
        allFoods={ALL_FOODS}
        onShuffle={handleManualShuffle}
        isSpinning={isSpinning}
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredFoods={filteredFoods}
      />
    </main>
  );

  // Match finished
  if (room.status === 'finished') {
    const winner = [...room.players].sort((a, b) => (b.foodsWon.length - a.foodsWon.length) || (b.coins - a.coins))[0];
    const won = winner?.id === playerId;
    return (
      <main className="min-h-screen px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <Brand onHomeClick={handleBrandHome} />
            <div className="flex items-center gap-2">
              <button className="btn-menu-pill" onClick={() => openMenuModal('all')}>
                <UtensilsCrossed size={15} />
                <span>All Foods</span>
                <span className="menu-badge">{ALL_FOODS.length}</span>
              </button>
              <div className="connection-pill">MATCH COMPLETE</div>
            </div>
          </header>

          <div className="panel mt-10 p-6 text-center md:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-lime-300 text-stone-950">
              <Trophy size={38} />
            </div>
            <div className="eyebrow mt-6 justify-center">10 ROUNDS · FINAL RESULTS</div>
            <h1 className="mt-3 text-4xl font-black md:text-5xl">
              {won ? 'You are the Food Champ!' : `${winner?.name || 'Winner'} takes the crown!`}
            </h1>
            <p className="mt-3 text-stone-400">The auction is over. Here's how your collections compare.</p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {room.players.map(p => (
                <div key={p.id} className={`player-card text-left ${p.id === winner?.id ? 'winner-card' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{p.name}{p.id === playerId ? ' (You)' : ''}</span>
                    {p.id === winner?.id && <Crown size={18} className="text-lime-300" />}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="stat-tile"><span>Food won</span><b>{p.foodsWon.length}</b></div>
                    <div className="stat-tile"><span>Coins left</span><b>{p.coins.toLocaleString()}</b></div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1 text-2xl">
                    {p.foodsWon.map((f, i) => (
                      <span title={`${f.name} (${f.category || 'Special'}) — ${f.price} coins`} key={`${f.round}-${i}`}>{f.emoji}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-7 text-sm text-stone-500">Winner is decided by most food items collected, then remaining coins as a tiebreaker.</p>

            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <button className="btn-secondary" onClick={() => openMenuModal('all')}>
                <UtensilsCrossed size={16} /> Explore All 65+ Foods
              </button>
              <button className="btn-primary" onClick={backToHome}>
                <RotateCcw size={17} /> Back to home
              </button>
            </div>
          </div>
        </div>

        <MenuModal
          isOpen={menuOpen}
          onClose={() => setMenuOpen(false)}
          room={room}
          allFoods={ALL_FOODS}
          onShuffle={handleManualShuffle}
          isSpinning={isSpinning}
          menuTab={menuTab}
          setMenuTab={setMenuTab}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredFoods={filteredFoods}
        />
      </main>
    );
  }

  // Active match
  return (
    <main className="min-h-screen px-4 py-5 md:px-8 md:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <Brand onHomeClick={handleBrandHome} />
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-menu-pill" onClick={() => openMenuModal('match')} title="View all rounds & items in this auction">
              <UtensilsCrossed size={15} />
              <span>Menu</span>
              <span className="menu-badge">{room.roundIndex + 1}/10</span>
            </button>
            <div className="connection-pill online"><span className="live-dot" /> LIVE MATCH</div>
            <button className="room-chip" onClick={copyCode}>
              <span>ROOM</span><b>{room.code}</b>{copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </header>

        <div className="mt-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow"><Flame size={14} /> THE AUCTION IS ON</div>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Food <span className="text-lime-300">Wars.</span></h1>
            <p className="mt-1 text-sm text-stone-500">Bid smart. Eat legendary. Repeat.</p>
          </div>
          <div className="round-progress">
            <div className="flex items-center justify-between text-xs text-stone-400">
              <div className="flex items-center gap-2">
                <span>ROUND PROGRESS</span>
                <button className="match-menu-link" onClick={() => openMenuModal('match')}>
                  <UtensilsCrossed size={11} /> 10-Item Lineup
                </button>
              </div>
              <b className="text-lime-300">{room.roundIndex + 1} / {room.totalRounds}</b>
            </div>
            <div className="mt-2 flex gap-1">
              {Array.from({ length: room.totalRounds }, (_, i) => (
                <span key={i} className={`h-1.5 flex-1 rounded-full ${i < room.roundIndex ? 'bg-lime-300' : i === room.roundIndex ? 'bg-lime-300/60' : 'bg-stone-800'}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.25fr_.85fr]">
          {/* Left: Players and Wallet */}
          <section className="space-y-3">
            <PlayerCard player={me} self active={isMyTurn} />
            <PlayerCard player={opponent} active={!isMyTurn && room.turnPlayerId === opponent?.id} />
            <div className="panel p-4">
              <div className="flex items-center gap-2 text-sm font-bold">
                <Wallet size={16} className="text-lime-300" /> Your coin purse
              </div>
              <div className="mt-3 flex items-end justify-between">
                <b className="text-3xl tracking-tight">{(me?.coins ?? 0).toLocaleString()} <span className="text-sm font-semibold text-stone-500">coins</span></b>
                <span className="text-xs text-stone-500">of 1,000 start</span>
              </div>
              <div className="coin-track mt-3">
                <div style={{ width: `${Math.max(0, Math.min(100, (me?.coins || 0) / 10))}%` }} />
              </div>
            </div>
          </section>

          {/* Middle: Up For Grabs Food Stage */}
          <section className="panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-800 px-5 py-4">
              <div>
                <div className="eyebrow">UP FOR GRABS</div>
                <h2 className="mt-1 text-lg font-extrabold">Round {room.roundIndex + 1}</h2>
              </div>
              <span className="round-tag">ITEM {String(room.roundIndex + 1).padStart(2, '0')}</span>
            </div>

            <div className="food-stage">
              <div className="food-orbit orbit-one" />
              <div className="food-orbit orbit-two" />
              <span className="food-emoji" key={room.currentFood?.name}>{room.currentFood?.emoji}</span>
              <span className="food-spark spark-a">✦</span>
              <span className="food-spark spark-b">✧</span>
            </div>

            <div className="px-5 pb-5">
              <div className="flex justify-center mb-1.5">
                <span className="food-cat-pill">{room.currentFood?.category || 'Specialty'}</span>
              </div>
              <h2 className="text-center text-2xl font-black">{room.currentFood?.name}</h2>
              {room.currentFood?.description && (
                <p className="food-desc mt-1 text-center text-xs text-stone-600 max-w-sm mx-auto">{room.currentFood.description}</p>
              )}
              <p className="mt-2 text-center text-xs text-stone-500">Opening bid · 100 coins</p>

              <div className="bid-display mt-5">
                <span className="text-xs font-bold uppercase tracking-[.18em] text-stone-500">CURRENT HIGHEST BID</span>
                <div className="mt-1 flex items-baseline justify-center gap-2">
                  <b className="text-4xl font-black tracking-tight">{room.currentBid.toLocaleString()}</b>
                  <span className="text-sm text-stone-500">coins</span>
                </div>
                <div className="mt-2 text-sm text-stone-400">
                  {highestBidder ? `Leading: ${highestBidder.name}` : 'No bids yet — set the opening price'}
                </div>
              </div>

              <div className={`turn-banner mt-4 ${isMyTurn ? 'your-turn' : ''}`}>
                {isMyTurn ? (
                  <><span className="turn-pulse" /> Your turn to bid</>
                ) : (
                  <><LoaderCircle size={15} className="animate-spin" /> Waiting for {room.players.find(p => p.id === room.turnPlayerId)?.name || 'opponent'}</>
                )}
              </div>

              <div className="mt-4">
                <label className="field-label" htmlFor="bid-amount">
                  YOUR BID <span className="normal-case tracking-normal text-stone-600">(minimum {minBid})</span>
                </label>
                <div className="bid-input-row mt-2">
                  <button className="bid-step" onClick={() => setBidAmount(v => Math.max(minBid, v - MIN_RAISE))} disabled={!isMyTurn || bidAmount <= minBid}>
                    <Minus size={17} />
                  </button>
                  <input
                    id="bid-amount"
                    type="number"
                    step={MIN_RAISE}
                    min={minBid}
                    max={maxAffordable}
                    value={bidAmount}
                    onChange={e => setBidAmount(Number(e.target.value))}
                    disabled={!isMyTurn}
                  />
                  <button className="bid-step" onClick={() => setBidAmount(v => Math.min(maxAffordable, Math.max(minBid, v) + MIN_RAISE))} disabled={!isMyTurn || bidAmount + MIN_RAISE > maxAffordable}>
                    <Plus size={17} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {[50, 100, 200].map(n => (
                    <button key={n} className="quick-bid" disabled={!isMyTurn} onClick={() => setBidAmount(Math.min(maxAffordable, Math.max(minBid, bidAmount + n)))}>
                      +{n}
                    </button>
                  ))}
                  <span className="ml-auto self-center text-xs text-stone-600">Raise by 50 min.</span>
                </div>

                <button className="btn-primary mt-4 w-full" onClick={placeBid} disabled={!canBid}>
                  <Gavel size={17} /> Place bid <ArrowUpRight size={16} />
                </button>
                <button className="btn-secondary mt-2 w-full" onClick={pass} disabled={!isMyTurn}>
                  <LogOut size={16} /> Pass this item
                </button>

                {error && <Notice type="error" text={error} />}
                <p className="mt-3 text-center text-[11px] leading-5 text-stone-600">Passing ends this auction if someone has bid. Your opponent wins at the current price.</p>
              </div>
            </div>
          </section>

          {/* Right: Activity & Past Rounds */}
          <section className="panel flex min-h-[300px] flex-col">
            <div className="flex items-center gap-2 border-b border-stone-800 px-4 py-4">
              <History size={17} className="text-lime-300" />
              <h2 className="font-extrabold">Auction activity</h2>
              <span className="ml-auto rounded-lg bg-stone-800 px-2 py-1 text-[10px] font-bold text-stone-400">LIVE</span>
            </div>

            <div className="flex-1 space-y-3 p-4">
              {sortedHistory.length === 0 ? (
                <div className="flex h-44 flex-col items-center justify-center text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-900 text-stone-500">
                    <Gavel size={22} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-stone-300">No bids yet</p>
                  <p className="mt-1 max-w-[190px] text-xs leading-5 text-stone-600">The first bid sets the pace. Make it count.</p>
                </div>
              ) : (
                sortedHistory.map((item, i) => (
                  <div key={`${item.at}-${i}`} className="activity-row">
                    <div className={`activity-icon ${item.action === 'bid' ? 'bid-icon' : 'pass-icon'}`}>
                      {item.action === 'bid' ? <Gavel size={15} /> : <LogOut size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{item.playerName}{item.playerId === playerId ? ' (You)' : ''}</p>
                      <p className="mt-0.5 text-xs text-stone-500">{item.action === 'bid' ? 'placed a bid' : 'passed'}</p>
                    </div>
                    {item.action === 'bid' && <b className="text-sm text-lime-300">{item.amount}</b>}
                  </div>
                ))
              )}

              {room.roundResults.length > 0 && (
                <>
                  <div className="my-4 h-px bg-stone-800" />
                  <p className="text-[10px] font-bold uppercase tracking-[.2em] text-stone-600">Previous rounds</p>
                  {[...room.roundResults].reverse().slice(0, 4).map(r => (
                    <div key={r.round} className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="text-lg">{r.emoji}</span>
                      <span className="min-w-0 flex-1 truncate">{r.food}</span>
                      <span className="text-stone-600">{r.winnerId ? `${r.winningBid} coins` : 'Unsold'}</span>
                    </div>
                  ))}
                </>
              )}
            </div>

            <div className="border-t border-stone-800 p-4">
              <div className="flex items-start gap-2 text-xs leading-5 text-stone-500">
                <CircleHelp size={15} className="mt-0.5 shrink-0" />
                <span>Each bid must beat the last by at least 50 coins. Coins are only deducted when you win an item.</span>
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-6 flex flex-wrap justify-between gap-3 border-t border-stone-900 py-5 text-xs text-stone-600">
          <span>ROOM {room.code} · PRIVATE MATCH</span>
          <span>VIRTUAL COINS ONLY · HAVE FUN</span>
        </footer>
      </div>

      <MenuModal
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        room={room}
        allFoods={ALL_FOODS}
        onShuffle={handleManualShuffle}
        isSpinning={isSpinning}
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredFoods={filteredFoods}
      />
    </main>
  );
}

function MenuModal({
  isOpen,
  onClose,
  room,
  allFoods,
  onShuffle,
  isSpinning,
  menuTab,
  setMenuTab,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  filteredFoods
}) {
  if (!isOpen) return null;

  const matchMenu = room?.menu || [];

  return (
    <div className="menu-modal-overlay" onClick={onClose}>
      <div className="menu-modal-card" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="menu-modal-header">
          <div className="flex items-center gap-3">
            <div className="brand-mark shrink-0 w-9 h-9">
              <ChefHat size={20} />
            </div>
            <div>
              <div className="eyebrow text-[10px]">FOOD AUCTION CATALOG</div>
              <h2 className="text-xl font-black text-stone-900 leading-tight">Food Wars Menu</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-secondary flex items-center gap-1.5 text-xs font-bold py-2 px-3" onClick={onShuffle} title="Shuffle the food items">
              <Shuffle size={14} className={isSpinning ? 'animate-spin' : ''} />
              <span>Shuffle</span>
            </button>
            <button className="modal-close-btn" onClick={onClose} aria-label="Close menu">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab switcher if in room */}
        {matchMenu.length > 0 && (
          <div className="px-6 pt-3 pb-2 border-b border-stone-200 flex gap-2">
            <button
              className={`menu-tab-btn ${menuTab === 'match' ? 'active' : ''}`}
              onClick={() => setMenuTab('match')}
            >
              This Match ({matchMenu.length} Rounds)
            </button>
            <button
              className={`menu-tab-btn ${menuTab === 'all' ? 'active' : ''}`}
              onClick={() => setMenuTab('all')}
            >
              All Delicacies ({allFoods.length})
            </button>
          </div>
        )}

        {/* Tab 1: Match Menu */}
        {menuTab === 'match' && matchMenu.length > 0 ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            <p className="text-xs text-stone-500 mb-2">
              These 10 dishes were randomly selected and shuffled for Room <b>{room.code}</b>. Plan your bids round by round!
            </p>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {matchMenu.map((item, idx) => {
                const isPast = idx < room.roundIndex;
                const isCurrent = idx === room.roundIndex && room.status === 'playing';
                const result = room.roundResults?.find(r => r.round === idx + 1);
                const winnerPlayer = result?.winnerId ? room.players?.find(p => p.id === result.winnerId) : null;

                return (
                  <div key={`${item.name}-${idx}`} className={`match-round-card ${isCurrent ? 'current-round-card' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl p-1.5 rounded-xl bg-amber-50 shrink-0">{item.emoji}</span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Round {idx + 1}</span>
                            <span className="text-[10px] text-stone-500 font-semibold">{item.category}</span>
                          </div>
                          <h4 className="font-extrabold text-sm text-stone-900 mt-0.5">{item.name}</h4>
                        </div>
                      </div>
                      <div>
                        {isCurrent && <span className="status-badge-active"><span className="live-dot" /> LIVE</span>}
                        {isPast && (
                          <span className="status-badge-done">
                            {winnerPlayer ? `Won by ${winnerPlayer.name} (${result.winningBid} coins)` : 'Unsold'}
                          </span>
                        )}
                        {!isPast && !isCurrent && <span className="status-badge-upcoming">Upcoming</span>}
                      </div>
                    </div>
                    {item.description && (
                      <p className="mt-2 text-xs text-stone-600 leading-relaxed pl-1">{item.description}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Tab 2: All Foods Catalog */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Search and category filters */}
            <div className="p-5 pb-3 border-b border-stone-200 space-y-3">
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Search any dish or category (e.g. Biryani, Momos, Dosa)..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="field search-field"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
                    <X size={15} />
                  </button>
                )}
              </div>
              <div className="category-scroll-bar">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`category-chip ${selectedCategory === cat ? 'active' : ''}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Foods Grid */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex items-center justify-between text-xs text-stone-500 mb-3">
                <span>Showing <b>{filteredFoods.length}</b> dishes (Freshly Shuffled)</span>
                <span className="italic">Every game rolls 10 unique dishes</span>
              </div>
              {filteredFoods.length === 0 ? (
                <div className="py-12 text-center text-stone-500">
                  <p className="text-base font-bold">No dishes found matching "{searchQuery}"</p>
                  <button className="btn-secondary mt-3 text-xs" onClick={() => { setSearchQuery(''); setSelectedCategory('All'); }}>
                    Clear search filter
                  </button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                  {filteredFoods.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="food-menu-card">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-3xl shrink-0 p-1">{f.emoji}</span>
                        <span className="food-cat-pill text-[9px]">{f.category}</span>
                      </div>
                      <h4 className="mt-2 font-black text-sm text-stone-900 leading-snug">{f.name}</h4>
                      <p className="mt-1 text-xs text-stone-600 line-clamp-2 leading-relaxed">{f.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="menu-modal-footer">
          <span className="text-xs text-stone-500">🎲 Dishes automatically shuffle every time you open this menu</span>
          <button className="btn-primary text-xs py-2 px-4" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Brand({ onHomeClick }) {
  const handleClick = (e) => {
    if (onHomeClick) {
      e.preventDefault();
      onHomeClick();
    }
  };
  return (
    <a href="/" onClick={handleClick} className="flex items-center gap-3 text-white no-underline">
      <span className="brand-mark"><ChefHat size={22} /></span>
      <span>
        <b className="block text-sm font-black tracking-[.12em]">FOOD WARS</b>
        <span className="block text-[10px] font-semibold tracking-[.2em] text-stone-500">THE LIVE AUCTION</span>
      </span>
    </a>
  );
}

function Feature({ icon, text }) { return <span className="feature-chip">{icon}{text}</span>; }
function Notice({ text, type = 'info' }) { return <div className={`notice ${type === 'error' ? 'notice-error' : ''}`}>{text}</div>; }

function PlayerLobby({ player, self }) {
  return (
    <div className={`player-card text-left ${self ? 'winner-card' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="avatar">{player?.name?.slice(0, 1)?.toUpperCase() || <Users size={17} />}</div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{player ? `${player.name}${self ? ' (You)' : ''}` : 'Waiting for player'}</p>
          <p className="mt-1 text-xs text-stone-500">{player ? 'Ready to play' : 'Share the room code'}</p>
        </div>
        <span className={`h-2 w-2 rounded-full ${player?.connected ? 'bg-lime-300' : 'bg-stone-700'}`} />
      </div>
    </div>
  );
}

function PlayerCard({ player, self, active }) {
  return (
    <div className={`player-card ${active ? 'active-player' : ''}`}>
      <div className="flex items-center gap-3">
        <div className="avatar">{player?.name?.slice(0, 1)?.toUpperCase() || <Users size={17} />}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <b className="truncate">{player?.name || 'Player'}</b>{self && <span className="you-tag">YOU</span>}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-500">
            {player?.connected ? <><span className="live-dot" /> Online</> : <><WifiOff size={12} /> Disconnected</>}
          </div>
        </div>
        {active && <span className="turn-indicator">TURN</span>}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-stone-600">COINS LEFT</p>
          <p className="mt-1 text-2xl font-black tracking-tight">{(player?.coins ?? 1000).toLocaleString()}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-[.17em] text-stone-600">FOOD WON</p>
          <p className="mt-1 text-2xl font-black">{player?.foodsWon?.length || 0}<span className="ml-1 text-xs font-semibold text-stone-600">/ 10</span></p>
        </div>
      </div>
      <div className="mt-3 flex min-h-7 flex-wrap gap-1">
        {player?.foodsWon?.map((f, i) => (
          <span key={`${f.round}-${i}`} className="food-won" title={`${f.name} — ${f.price} coins`}>{f.emoji}</span>
        ))}
        {!player?.foodsWon?.length && <span className="text-xs text-stone-700">No food collected yet</span>}
      </div>
    </div>
  );
}

export default App;
