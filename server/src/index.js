import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { CONFIG } from './config.js';
import { GameServer } from './gameServer.js';

import { LOBBY_DATA } from './lobbyData.js';

const app = express();
app.use(cors());
app.use(express.json());

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
