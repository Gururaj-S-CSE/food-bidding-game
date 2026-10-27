
import crypto from 'node:crypto';

export const STARTING_COINS = 1000;
export const TOTAL_ROUNDS = 10;
export const MIN_RAISE = 30;
export const OPENING_BID = 30;

export const FOODS = [
  // Biryani & Rice
  { name: "Hyderabadi Dum Biryani", emoji: "🍗", category: "Biryani & Rice", description: "Slow-cooked fragrant basmati rice with spiced tender chicken & saffron" },
  { name: "Malabar Mutton Biryani", emoji: "🍲", category: "Biryani & Rice", description: "Aromatic kaima rice cooked on dum with succulent braised mutton and ghee" },
  { name: "Donne Chicken Biryani", emoji: "🍲", category: "Biryani & Rice", description: "Bengaluru military-hotel specialty with mint, coriander and tender chicken" },
  { name: "Fried Rice", emoji: "🍚", category: "Biryani & Rice", description: "Classic wok-tossed long-grain rice with crispy vegetables and soy seasonings" },
  { name: "Schezwan Fried Rice", emoji: "🍚", category: "Biryani & Rice", description: "Fiery wok-tossed rice tossed in spicy red schezwan sauce and spring onions" },
  { name: "Rajma Chawal", emoji: "🍛", category: "Biryani & Rice", description: "Comforting slow-simmered Kashmiri red kidney bean gravy over steamed basmati rice" },

  // South Indian
  { name: "Masala Dosa", emoji: "🥞", category: "South Indian", description: "Golden crispy fermented crepe loaded with savory spiced potato masala" },
  { name: "Kerala Parotta", emoji: "🫓", category: "South Indian", description: "Flaky, multi-layered spiral flatbread served hot with rich salna curry" },
  { name: "Poori Masala", emoji: "🍛", category: "South Indian", description: "Puffy golden deep-fried whole wheat pooris served with spiced potato bhaji" },
  { name: "Kothu Parotta", emoji: "🍳", category: "South Indian", description: "Street-style shredded flaky parotta scrambled with eggs, meat, and fiery curry" },
  { name: "Idli Vada Sambar", emoji: "🍲", category: "South Indian", description: "Pillowy steamed rice cakes and crispy medu vada submerged in hot tangy sambar" },
  { name: "Appam with Stew", emoji: "🥞", category: "South Indian", description: "Lacy bowl-shaped fermented rice hoppers paired with creamy coconut milk stew" },
  { name: "Chettinad Pepper Chicken", emoji: "🍗", category: "South Indian", description: "Spicy Tamil Nadu country chicken cooked with freshly roasted black peppercorns" },

  // North Indian
  { name: "Butter Chicken", emoji: "🍛", category: "North Indian", description: "Tender tandoori chicken chunks simmered in a velvety tomato, cream & butter gravy" },
  { name: "Paneer Butter Masala", emoji: "🧀", category: "North Indian", description: "Cubes of soft cottage cheese bathed in rich cashew and tomato cream sauce" },
  { name: "Dal Makhani", emoji: "🥣", category: "North Indian", description: "Black lentils and kidney beans slow-simmered overnight with butter and fresh cream" },
  { name: "Chole Bhature", emoji: "🫓", category: "North Indian", description: "Giant golden puffed bhature served with robustly spiced Punjabi chickpea masala" },
  { name: "Butter Naan", emoji: "🫓", category: "North Indian", description: "Soft, pillowy clay-oven baked flatbread brushed generously with salted butter" },
  { name: "Garlic Naan", emoji: "🫓", category: "North Indian", description: "Charred tandoor flatbread topped with minced garlic, coriander, and melted butter" },
  { name: "Aloo Paratha", emoji: "🫓", category: "North Indian", description: "Crisp griddled wheat bread stuffed with seasoned mashed potatoes and dollop of butter" },
  { name: "Mutton Rogan Josh", emoji: "🥘", category: "North Indian", description: "Classic Kashmiri braised lamb infused with dried ginger, fennel seeds, and ratan jot" },

  // Street Food & Chaat
  { name: "Paani Puri", emoji: "🥙", category: "Street Food & Chaat", description: "Crisp hollow puris stuffed with spiced potatoes and flooded with chilled mint water" },
  { name: "Masala Puri", emoji: "🥣", category: "Street Food & Chaat", description: "Crushed crunchy puris drowned in piping hot spiced dried-peas curry with fresh onion" },
  { name: "Pav Bhaji", emoji: "🍞", category: "Street Food & Chaat", description: "Thick mashed spiced vegetable gravy topped with butter, served with soft toasted pav" },
  { name: "Vada Pav", emoji: "🍔", category: "Street Food & Chaat", description: "Spiced golden potato fritter tucked into a soft bun with fiery garlic chutney" },
  { name: "Samosa Chaat", emoji: "🥟", category: "Street Food & Chaat", description: "Crispy potato samosas smashed and smothered in spiced chole, sweet curd, and chutneys" },
  { name: "Bhel Puri", emoji: "🥗", category: "Street Food & Chaat", description: "Puffed rice tossed with crunchy sev, potatoes, onions, and sweet-tangy tamarind chutney" },
  { name: "Dahi Vada", emoji: "🥣", category: "Street Food & Chaat", description: "Fluffy urad dal dumplings soaked in chilled sweet yogurt with cumin and chili sprinkle" },
  { name: "Shawarma", emoji: "🌯", category: "Street Food & Chaat", description: "Thin-sliced rotisserie spiced chicken rolled with pickles and garlic toum in pita" },
  { name: "Chicken Tikka Roll", emoji: "🌯", category: "Street Food & Chaat", description: "Smoky tandoori chicken chunks wrapped in a hot buttery parotta with mint chutney" },

  // Tandoor & Starters
  { name: "Chicken 65", emoji: "🍗", category: "Tandoor & Starters", description: "Iconic South Indian crispy spiced fried chicken tossed with curry leaves & green chilies" },
  { name: "Paneer Tikka", emoji: "🍢", category: "Tandoor & Starters", description: "Marinated cottage cheese and bell peppers roasted in a tandoor with smoky char" },
  { name: "Tandoori Chicken", emoji: "🍗", category: "Tandoor & Starters", description: "Juicy bone-in chicken marinated in yogurt and red spices, roasted in clay oven" },
  { name: "Mutton Seekh Kebab", emoji: "🍢", category: "Tandoor & Starters", description: "Minced lamb blended with herbs and aromatic spices, grilled on skewers over coals" },
  { name: "Prawns Ghee Roast", emoji: "🍤", category: "Tandoor & Starters", description: "Succulent sea prawns pan-roasted in clarified butter with a punchy Byadgi chili paste" },
  { name: "Mangalore Fish Fry", emoji: "🐟", category: "Tandoor & Starters", description: "Fresh fish fillets coated with fiery coastal masala and crispy semolina crust" },
  { name: "Crispy Corn Pepper Fry", emoji: "🌽", category: "Tandoor & Starters", description: "Batter-fried golden sweet corn tossed with freshly cracked black pepper and scallions" },

  // Indo-Chinese
  { name: "Veg Noodles", emoji: "🥡", category: "Indo-Chinese", description: "Street-style wok-fried noodles tossed with crunchy julienne vegetables and spices" },
  { name: "Hakka Noodles", emoji: "🍜", category: "Indo-Chinese", description: "Thin Chinese noodles flash-fried with cabbage, carrots, bell peppers, and chili oil" },
  { name: "Gobi Manchurian", emoji: "🥦", category: "Indo-Chinese", description: "Batter-fried cauliflower florets glazed in a sweet, savory, and spicy garlic sauce" },
  { name: "Momos", emoji: "🥟", category: "Indo-Chinese", description: "Delicate steamed dumplings filled with seasoned filling, served with fiery red chutney" },
  { name: "Fried Momos", emoji: "🥟", category: "Indo-Chinese", description: "Crispy deep-fried dumplings with a crunchy shell and juicy, spiced vegetable filling" },
  { name: "Dragon Chicken", emoji: "🌶️", category: "Indo-Chinese", description: "Crispy chicken strips tossed in a fiery red chili sauce garnished with roasted cashews" },
  { name: "Spring Rolls", emoji: "🥢", category: "Indo-Chinese", description: "Golden fried crispy pastry rolls filled with shredded vegetables and glass noodles" },

  // Pizza & Continental
  { name: "Pizza", emoji: "🍕", category: "Pizza & Continental", description: "Fresh-baked artisan dough topped with rich tomato marinara and gooey mozzarella" },
  { name: "White Sauce Pasta", emoji: "🍝", category: "Pizza & Continental", description: "Penne pasta enveloped in a rich, creamy garlic parmesan alfredo sauce" },
  { name: "Red Sauce Arbiata Pasta", emoji: "🍝", category: "Pizza & Continental", description: "Al dente pasta tossed in a robust crushed tomato sauce spiked with red chili flakes" },
  { name: "Cheese Garlic Bread", emoji: "🥖", category: "Pizza & Continental", description: "Crisp toasted baguette slices slathered with garlic butter and melted mozzarella" },
  { name: "Loaded Nachos", emoji: "🧀", category: "Pizza & Continental", description: "Crunchy corn tortilla chips piled high with warm queso, salsa, and jalapenos" },

  // Burgers & Fast Food
  { name: "Burger", emoji: "🍔", category: "Burgers & Fast Food", description: "Juicy grilled patty topped with melted cheese, crisp lettuce, tomato, and secret sauce" },
  { name: "French Fries", emoji: "🍟", category: "Burgers & Fast Food", description: "Thin-cut potato fries fried to golden perfection and seasoned with sea salt" },
  { name: "Sandwich", emoji: "🥪", category: "Burgers & Fast Food", description: "Toasted multi-layer sandwich packed with spiced potato masala, veggies, and cheese" },
  { name: "Maggi", emoji: "🍜", category: "Burgers & Fast Food", description: "Beloved 2-minute instant noodles cooked street-style with butter and spicy tastemaker" },
  { name: "Samosa", emoji: "🥟", category: "Burgers & Fast Food", description: "Flaky crisp pastry stuffed with spiced potatoes, green peas, and whole coriander seeds" },

  // Desserts & Sweets
  { name: "Gulab Jamun", emoji: "🍡", category: "Desserts & Sweets", description: "Soft khoya dumplings deep-fried golden and steeped in rose-cardamom sugar syrup" },
  { name: "Rasmalai", emoji: "🥛", category: "Desserts & Sweets", description: "Delicate cottage cheese patties soaked in chilled saffron and pistachio-infused milk" },
  { name: "Mysore Pak", emoji: "🧈", category: "Desserts & Sweets", description: "Iconic royal sweet made with gram flour, pure desi ghee, and sugar that melts on your tongue" },
  { name: "Sizzling Brownie", emoji: "🍨", category: "Desserts & Sweets", description: "Warm fudgy dark chocolate brownie on a sizzler plate topped with cold vanilla ice cream" },
  { name: "Belgian Waffle", emoji: "🧇", category: "Desserts & Sweets", description: "Freshly ironed crispy waffle smothered in warm melted dark chocolate and maple syrup" },
  { name: "Pistachio Kunafa", emoji: "🥧", category: "Desserts & Sweets", description: "Middle-Eastern spun pastry layered with gooey cheese, orange blossom syrup & nuts" },
  { name: "Kulfi Falooda", emoji: "🍧", category: "Desserts & Sweets", description: "Rich traditional malai kulfi served with silky falooda vermicelli, sabja seeds & rose syrup" },

  // Beverages
  { name: "Chocolate Milkshake", emoji: "🥤", category: "Beverages", description: "Thick, creamy blend of cold milk, rich cocoa, and vanilla ice cream with chocolate drizzle" },
  { name: "Filter Coffee", emoji: "☕", category: "Beverages", description: "Authentic South Indian chicory-brewed decoction frothed high with steaming hot milk" },
  { name: "Masala Chai", emoji: "☕", category: "Beverages", description: "Aromatic Assam tea simmered with fresh crushed ginger, cardamom, cloves, and milk" },
  { name: "Mango Lassi", emoji: "🥭", category: "Beverages", description: "Refreshing yogurt smoothie blended with ripe Alphonso mangoes and a pinch of cardamom" },
  { name: "Cold Coffee", emoji: "🧋", category: "Beverages", description: "Chilled espresso shaken with creamy milk, sugar, and topped with a scoop of ice cream" },
];

export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateRoomMenu(count = TOTAL_ROUNDS) {
  return shuffleArray(FOODS).slice(0, count);
}

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
      menu: this.menu,
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
      menu: generateRoomMenu(),
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

  static async deleteOne({ code }) {
    return rooms.delete(String(code));
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
    menu: r.menu || [],
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

  if (!room.menu || !room.menu.length || room.menu.length < TOTAL_ROUNDS) {
    room.menu = generateRoomMenu();
  }

  room.status = 'playing';
  room.currentFood = room.menu[room.roundIndex];
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
      category: food.category,
      description: food.description,
      price: amount,
      round: room.roundIndex + 1
    });
  }

  room.roundResults.push({
    round: room.roundIndex + 1,
    food: food.name,
    emoji: food.emoji,
    category: food.category,
    description: food.description,
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
