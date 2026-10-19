import { CONFIG } from './config.js';

const PLAYER_COLORS = [
  '#4ade80', // Emerald green
  '#60a5fa', // Blue
  '#f87171', // Red
  '#fbbf24', // Amber
  '#c084fc', // Purple
  '#2dd4bf', // Teal
  '#fb923c', // Orange
  '#f472b6'  // Pink
];

export class GameServer {
  constructor(io) {
    this.io = io;
    this.players = new Map();
    this.rateLimits = new Map();
    this.colorIndex = 0;

    this.initNetwork();
    this.startHeartbeatLoop();
  }

  initNetwork() {
    this.io.on('connection', (socket) => {
      // Initialize rate limiting bucket
      this.rateLimits.set(socket.id, { count: 0, resetTime: Date.now() + 1000 });

      // Join handler
      socket.on('player:join', (data) => {
        if (!this.checkRateLimit(socket.id)) return;
        this.handlePlayerJoin(socket, data);
      });

      // Move / Update handler
      socket.on('player:move', (data) => {
        if (!this.checkRateLimit(socket.id)) return;
        this.handlePlayerMove(socket, data);
      });

      // Ping-pong for latency measurement
      socket.on('player:ping', (timestamp) => {
        socket.emit('player:pong', timestamp);
      });

      // Chat message
      socket.on('player:chat', (message) => {
        if (!this.checkRateLimit(socket.id)) return;
        this.handlePlayerChat(socket, message);
      });

      // Disconnect handler
      socket.on('disconnect', () => {
        this.handlePlayerLeave(socket);
      });
    });
  }

  checkRateLimit(socketId) {
    const bucket = this.rateLimits.get(socketId);
    if (!bucket) return true;

    const now = Date.now();
    if (now > bucket.resetTime) {
      bucket.count = 0;
      bucket.resetTime = now + 1000;
    }

    bucket.count++;
    if (bucket.count > CONFIG.RATE_LIMIT_MAX_PACKETS_PER_SEC) {
      return false; // Silently drop packets exceeding rate limit
    }
    return true;
  }

  handlePlayerJoin(socket, data) {
    if (this.players.has(socket.id)) return;

    // Pick spawn point
    const spawnIndex = this.players.size % CONFIG.SPAWN_LOCATIONS.length;
    const baseSpawn = CONFIG.SPAWN_LOCATIONS[spawnIndex];
    const jitterX = (Math.random() - 0.5) * 4;
    const jitterZ = (Math.random() - 0.5) * 4;

    const rawName = (data && typeof data.name === 'string') ? data.name : '';
    const cleanName = rawName.replace(/<[^>]*>/g, '').trim().substring(0, 18) || `Explorer-${socket.id.substring(0, 4)}`;

    const playerColor = PLAYER_COLORS[this.colorIndex % PLAYER_COLORS.length];
    this.colorIndex++;

    const posX = (data && data.position && !isNaN(data.position.x)) ? Number(data.position.x) : (baseSpawn.x + jitterX);
    const posY = (data && data.position && !isNaN(data.position.y)) ? Number(data.position.y) : baseSpawn.y;
    const posZ = (data && data.position && !isNaN(data.position.z)) ? Number(data.position.z) : (baseSpawn.z + jitterZ);

    const newPlayer = {
      id: socket.id,
      name: cleanName,
      color: playerColor,
      position: {
        x: posX,
        y: posY,
        z: posZ
      },
      rotation: {
        yaw: 0
      },
      animation: 'idle',
      lastUpdate: Date.now(),
      ping: 0
    };

    this.players.set(socket.id, newPlayer);

    // Send world initialization to this player
    const existingPlayers = Array.from(this.players.values()).filter(p => p.id !== socket.id);
    socket.emit('world:init', {
      self: newPlayer,
      players: existingPlayers,
      serverTime: Date.now()
    });

    // Notify other players
    socket.broadcast.emit('player:joined', newPlayer);

    console.log(`[GameServer] Player joined: ${cleanName} (${socket.id}) at (${newPlayer.position.x.toFixed(1)}, ${newPlayer.position.z.toFixed(1)}). Total: ${this.players.size}`);
  }

  handlePlayerMove(socket, data) {
    const player = this.players.get(socket.id);
    if (!player || !data || !data.position) return;

    const now = Date.now();
    const dt = Math.max(0.001, (now - player.lastUpdate) / 1000);

    const targetX = Number(data.position.x);
    const targetY = Number(data.position.y);
    const targetZ = Number(data.position.z);
    const targetYaw = Number(data.rotation?.yaw || 0);

    // Validate numbers
    if (isNaN(targetX) || isNaN(targetY) || isNaN(targetZ) || isNaN(targetYaw)) {
      return;
    }

    // World bounds check
    const clampedX = Math.max(CONFIG.WORLD_BOUNDS.MIN_X, Math.min(CONFIG.WORLD_BOUNDS.MAX_X, targetX));
    const clampedZ = Math.max(CONFIG.WORLD_BOUNDS.MIN_Z, Math.min(CONFIG.WORLD_BOUNDS.MAX_Z, targetZ));

    // Speed check (allow some burst tolerance for latency)
    const dx = clampedX - player.position.x;
    const dz = clampedZ - player.position.z;
    const distance2D = Math.sqrt(dx * dx + dz * dz);
    const allowedDistance = CONFIG.MAX_MOVE_SPEED_PER_SEC * dt + 4.0; // 4m tolerance buffer

    if (distance2D > allowedDistance && dt < 2.0) {
      // Exceeds max speed without long disconnect gap, clamp or ignore
      // Reposition along vector
      const ratio = allowedDistance / distance2D;
      player.position.x += dx * ratio;
      player.position.z += dz * ratio;
    } else {
      player.position.x = clampedX;
      player.position.z = clampedZ;
    }

    // Clamp Y to reasonable world heights
    const clampedY = Math.max(-50, Math.min(180, targetY));
    player.position.y = clampedY;
    player.rotation.yaw = targetYaw;
    player.animation = typeof data.animation === 'string' ? data.animation : 'idle';
    player.lastUpdate = now;
  }

  handlePlayerChat(socket, message) {
    const player = this.players.get(socket.id);
    if (!player || typeof message !== 'string') return;
    const cleanMsg = message.replace(/<[^>]*>/g, '').trim().substring(0, 100);
    if (!cleanMsg) return;

    this.io.emit('chat:broadcast', {
      senderId: player.id,
      senderName: player.name,
      message: cleanMsg,
      timestamp: Date.now()
    });
  }

  handlePlayerLeave(socket) {
    if (this.players.has(socket.id)) {
      const player = this.players.get(socket.id);
      this.players.delete(socket.id);
      this.rateLimits.delete(socket.id);
      socket.broadcast.emit('player:left', { id: socket.id });
      console.log(`[GameServer] Player left: ${player.name} (${socket.id}). Remaining: ${this.players.size}`);
    }
  }

  startHeartbeatLoop() {
    // Authoritative tick broadcast
    setInterval(() => {
      if (this.players.size === 0) return;

      const playerUpdates = [];
      for (const player of this.players.values()) {
        playerUpdates.push({
          id: player.id,
          position: player.position,
          rotation: player.rotation,
          animation: player.animation
        });
      }

      this.io.emit('world:tick', {
        timestamp: Date.now(),
        players: playerUpdates
      });
    }, CONFIG.TICK_INTERVAL_MS);
  }
}
