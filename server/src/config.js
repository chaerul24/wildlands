export const CONFIG = {
  PORT: process.env.PORT || 3001,
  TICK_RATE: 20, // 20 updates per second
  TICK_INTERVAL_MS: 1000 / 20,
  MAX_PLAYERS: 64,
  WORLD_BOUNDS: {
    MIN_X: -400,
    MAX_X: 400,
    MIN_Z: -400,
    MAX_Z: 400
  },
  MAX_MOVE_SPEED_PER_SEC: 28, // Max sprint speed + latency slack buffer
  RATE_LIMIT_MAX_PACKETS_PER_SEC: 50,
  SPAWN_LOCATIONS: [
    { x: 0, y: 0, z: 0 },
    { x: 12, y: 0, z: 8 },
    { x: -15, y: 0, z: 12 },
    { x: 8, y: 0, z: -18 },
    { x: -10, y: 0, z: -10 }
  ]
};
