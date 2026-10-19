import { io } from 'socket.io-client';
import { RemotePlayer } from '../entities/RemotePlayer.js';

export class NetworkManager {
  constructor(scene, terrain, onStatusChange, onNotification) {
    this.scene = scene;
    this.terrain = terrain;
    this.onStatusChange = onStatusChange;
    this.onNotification = onNotification;

    this.socket = null;
    this.isConnected = false;
    this.selfId = null;
    this.remotePlayers = new Map();

    // Ping calculation
    this.ping = 0;
    this.lastPingSent = 0;
    this.pingInterval = null;

    // Throttle local player packet sending (20 Hz)
    this.lastSendTime = 0;
    this.SEND_INTERVAL_MS = 1000 / 20;
  }

  connect(playerName, initialPosition = null) {
    const serverUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname || 'localhost'}:3001`;

    this.socket = io(serverUrl, {
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000
    });

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.selfId = this.socket.id;
      this.notifyStatus();

      // Emit join request with initial coordinates
      this.socket.emit('player:join', {
        name: playerName,
        position: initialPosition
      });

      // Start ping loop
      this.startPingLoop();
      if (this.onNotification) this.onNotification('Connected to Wildlands server!', 'success');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.notifyStatus();
      if (this.onNotification) this.onNotification('Disconnected from server. Reconnecting...', 'warning');
    });

    this.socket.on('connect_error', (err) => {
      this.isConnected = false;
      this.notifyStatus();
    });

    // World state initialization
    this.socket.on('world:init', (data) => {
      // Clear old remotes
      this.clearAllRemotePlayers();

      // Add existing players in the room
      if (data.players && Array.isArray(data.players)) {
        for (const p of data.players) {
          this.addRemotePlayer(p);
        }
      }
      this.notifyStatus();
    });

    // New remote player joined
    this.socket.on('player:joined', (playerData) => {
      if (playerData.id === this.selfId) return;
      this.addRemotePlayer(playerData);
      this.notifyStatus();
      if (this.onNotification) this.onNotification(`${playerData.name} entered the Wildlands`, 'info');
    });

    // Remote player left
    this.socket.on('player:left', (data) => {
      this.removeRemotePlayer(data.id);
      this.notifyStatus();
    });

    // Server authoritative world tick
    this.socket.on('world:tick', (data) => {
      if (!data.players) return;

      for (const update of data.players) {
        if (update.id === this.selfId) continue; // Skip self

        const remote = this.remotePlayers.get(update.id);
        if (remote) {
          remote.setTargetState(update);
        }
      }
    });

    // Pong latency response
    this.socket.on('player:pong', (sentTime) => {
      this.ping = Math.max(1, Date.now() - sentTime);
      this.notifyStatus();
    });
  }

  addRemotePlayer(playerData) {
    if (this.remotePlayers.has(playerData.id)) return;
    const remote = new RemotePlayer(this.scene, this.terrain, playerData);
    this.remotePlayers.set(playerData.id, remote);
  }

  removeRemotePlayer(id) {
    const remote = this.remotePlayers.get(id);
    if (remote) {
      if (this.onNotification) this.onNotification(`${remote.name} departed`, 'info');
      remote.destroy();
      this.remotePlayers.delete(id);
    }
  }

  clearAllRemotePlayers() {
    for (const remote of this.remotePlayers.values()) {
      remote.destroy();
    }
    this.remotePlayers.clear();
  }

  startPingLoop() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = setInterval(() => {
      if (this.isConnected && this.socket) {
        this.lastPingSent = Date.now();
        this.socket.emit('player:ping', this.lastPingSent);
      }
    }, 3000);
  }

  sendPlayerUpdate(playerState) {
    if (!this.isConnected || !this.socket) return;

    const now = Date.now();
    if (now - this.lastSendTime >= this.SEND_INTERVAL_MS) {
      this.lastSendTime = now;
      this.socket.emit('player:move', playerState);
    }
  }

  update(dt) {
    // Update all remote player interpolations
    for (const remote of this.remotePlayers.values()) {
      remote.update(dt);
    }
  }

  notifyStatus() {
    if (this.onStatusChange) {
      this.onStatusChange({
        connected: this.isConnected,
        ping: this.ping,
        onlineCount: this.remotePlayers.size + (this.isConnected ? 1 : 0),
        players: Array.from(this.remotePlayers.values()).map(r => ({
          id: r.id,
          name: r.name,
          color: r.color
        }))
      });
    }
  }

  disconnect() {
    if (this.pingInterval) clearInterval(this.pingInterval);
    if (this.socket) {
      this.socket.disconnect();
    }
    this.clearAllRemotePlayers();
    this.isConnected = false;
  }
}
