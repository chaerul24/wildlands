import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { CONFIG } from './config.js';
import { GameServer } from './gameServer.js';

import { LOBBY_DATA } from './lobbyData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '../../client/dist');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static assets from built client
app.use(express.static(clientDistPath));

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    game: 'Wildlands 3D',
    timestamp: Date.now()
  });
});

// --- LOBBY REST API ENDPOINTS ---
app.get('/api/lobby/summary', (req, res) => {
  res.json({
    serverTime: new Date().toISOString(),
    onlinePlayersCount: gameServer ? gameServer.players.size : 0,
    featuredNews: LOBBY_DATA.news.find(n => n.featured) || LOBBY_DATA.news[0],
    activeEventsCount: LOBBY_DATA.events.filter(e => new Date(e.endDate) > new Date() && new Date(e.startDate) <= new Date()).length,
    dailyResetTime: '24:00 WIB'
  });
});

app.get('/api/events', (req, res) => {
  const now = new Date();
  const processed = LOBBY_DATA.events.map(e => {
    const start = new Date(e.startDate);
    const end = new Date(e.endDate);
    let status = 'active';
    if (now < start) status = 'upcoming';
    else if (now > end) status = 'ended';
    return { ...e, computedStatus: status };
  });
  res.json({ events: processed });
});

app.get('/api/missions', (req, res) => {
  res.json({ missions: LOBBY_DATA.missions });
});

app.post('/api/missions/claim', (req, res) => {
  const { missionId } = req.body;
  const m = LOBBY_DATA.missions.find(x => x.id === missionId);
  if (!m) {
    return res.status(404).json({ error: 'Misi tidak ditemukan' });
  }
  if (m.isClaimed) {
    return res.status(400).json({ error: 'Hadiah misi ini sudah pernah diklaim' });
  }
  m.isClaimed = true;
  res.json({ success: true, reward: m.reward, missionId });
});

app.get('/api/news', (req, res) => {
  res.json({ news: LOBBY_DATA.news });
});

app.get('/api/news/:id', (req, res) => {
  const article = LOBBY_DATA.news.find(n => n.id === req.params.id);
  if (!article) return res.status(404).json({ error: 'Berita tidak ditemukan' });
  res.json({ article });
});

app.get('/api/friends', (req, res) => {
  res.json({ friends: LOBBY_DATA.suggestedFriends });
});

// --- PERSISTENCE SAVE / LOAD ENDPOINTS ---
const DATA_DIR = path.resolve(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const PLAYER_SAVES_FILE = path.join(DATA_DIR, 'players.json');

function loadPlayerSaves() {
  try {
    if (fs.existsSync(PLAYER_SAVES_FILE)) {
      return JSON.parse(fs.readFileSync(PLAYER_SAVES_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function savePlayerSaves(data) {
  try {
    fs.writeFileSync(PLAYER_SAVES_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

const PLAYER_SAVES = loadPlayerSaves();

app.post('/api/player/save', (req, res) => {
  const save = req.body;
  if (!save || !save.playerId) {
    return res.status(400).json({ error: 'Invalid save payload' });
  }
  PLAYER_SAVES[save.playerId] = {
    ...save,
    updatedAt: new Date().toISOString()
  };
  savePlayerSaves(PLAYER_SAVES);
  res.json({ success: true, savedAt: PLAYER_SAVES[save.playerId].updatedAt });
});

app.get('/api/player/load/:playerId', (req, res) => {
  const save = PLAYER_SAVES[req.params.playerId];
  if (!save) {
    return res.status(404).json({ error: 'No save found' });
  }
  res.json({ success: true, save });
});

// Fallback to client index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingInterval: 10000,
  pingTimeout: 5000
});

const gameServer = new GameServer(io);

server.listen(CONFIG.PORT, () => {
  console.log(`=================================================`);
  console.log(`🌲 WILDLANDS AUTHORITATIVE GAME SERVER RUNNING`);
  console.log(`🌲 Port: ${CONFIG.PORT}`);
  console.log(`🌲 Tick Rate: ${CONFIG.TICK_RATE} Hz`);
  console.log(`🌲 Ready for player connections!`);
  console.log(`=================================================`);
});

// Process signal handling
process.on('SIGINT', () => {
  console.log('\nShutting down Wildlands game server...');
  server.close(() => {
    process.exit(0);
  });
});
