/**
 * SaveSystem.js
 * Robust Offline-First Game Save Architecture for Wildlands 3D RPG.
 * - Supports dual storage: IndexedDB for high-capacity persistence + localStorage for instantaneous sync.
 * - Schema Version 2 with automated migration from Legacy v1.
 * - Stores Player Stats, Level, EXP, Gold, Inventory, Equipment, Quests, World Position, and Game Settings.
 * - Validation & Corrupted Save Recovery protection (never crashes the game).
 * - Throttled Autosave engine to avoid I/O bottlenecks during fast-paced combat.
 */

const SAVE_SCHEMA_VERSION = 2;
const LOCAL_SAVE_KEY_V2 = 'wildlands_rpg_savegame_v2';
const LOCAL_SAVE_KEY_LEGACY = 'wildlands_rpg_savegame_v1';
const DB_NAME = 'WildlandsOfflineDB';
const DB_VERSION = 1;
const DB_STORE = 'game_saves';

export class SaveSystem {
  constructor(lobbyData, inventoryManager, questManager, playerInstance = null) {
    this.lobbyData = lobbyData;
    this.inventory = inventoryManager;
    this.questManager = questManager;
    this.player = playerInstance;

    this.serverUrl = typeof window !== 'undefined'
      ? (import.meta.env?.VITE_SERVER_URL || (window.location.port === '5173' ? `http://${window.location.hostname || 'localhost'}:3001` : window.location.origin))
      : 'http://localhost:3001';

    this.lastSaveTime = 0;
    this.SAVE_THROTTLE_MS = 1000;
    this.db = null;
    this.initIndexedDB();
  }

  // --- INDEXEDDB INITIALIZATION ---
  initIndexedDB() {
    if (typeof window === 'undefined' || !window.indexedDB) return;

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: 'key' });
        }
      };
      request.onsuccess = (e) => {
        this.db = e.target.result;
      };
      request.onerror = (e) => {
        console.warn('[SaveSystem] IndexedDB open error, falling back purely to localStorage:', e);
      };
    } catch (e) {
      console.warn('[SaveSystem] IndexedDB initialization failed:', e);
    }
  }

  // --- CHECK EXISTING SAVE ---
  hasExistingSave() {
    if (typeof localStorage === 'undefined') return false;
    try {
      return Boolean(localStorage.getItem(LOCAL_SAVE_KEY_V2) || localStorage.getItem(LOCAL_SAVE_KEY_LEGACY));
    } catch (_) {
      return false;
    }
  }

  // --- SAVE OPERATION ---
  save(force = false) {
    const now = Date.now();
    if (!force && (now - this.lastSaveTime < this.SAVE_THROTTLE_MS)) {
      return null; // Throttled to protect storage performance
    }
    this.lastSaveTime = now;

    const profile = this.lobbyData ? this.lobbyData.profile : {};
    const inventoryData = this.inventory ? this.inventory.serialize() : {};
    const questData = this.questManager ? this.questManager.serialize() : {};

    // Capture safe world position & yaw
    let positionData = null;
    if (this.player && this.player.position) {
      positionData = {
        x: Number(this.player.position.x.toFixed(2)),
        y: Number(this.player.position.y.toFixed(2)),
        z: Number(this.player.position.z.toFixed(2)),
        yaw: Number((this.player.yaw || 0).toFixed(3))
      };
    }

    // Capture stats
    const statsData = this.inventory ? this.inventory.getStats() : { hp: 150, maxHp: 150, sta: 100, maxSta: 100, atk: 25, def: 15 };

    const payload = {
      schemaVersion: SAVE_SCHEMA_VERSION,
      playerId: profile.id || 'WL-EXPLORER',
      playerName: profile.username || 'Explorer',
      level: profile.level || 1,
      xp: profile.xp || 0,
      xpNext: profile.xpNext || 300,
      gold: typeof profile.gold === 'number' ? profile.gold : 0,
      stats: statsData,
      position: positionData,
      inventory: inventoryData,
      quests: questData,
      savedAt: new Date().toISOString()
    };

    // 1. Instantaneous LocalStorage
    try {
      localStorage.setItem(LOCAL_SAVE_KEY_V2, JSON.stringify(payload));
    } catch (e) {
      console.warn('[SaveSystem] localStorage save error:', e);
    }

    // 2. High-Capacity IndexedDB Mirror
    if (this.db) {
      try {
        const tx = this.db.transaction(DB_STORE, 'readwrite');
        const store = tx.objectStore(DB_STORE);
        store.put({ key: 'active_save', data: payload });
      } catch (e) {
        console.warn('[SaveSystem] IndexedDB save error:', e);
      }
    }

    // 3. Optional Cloud Sync (Silently ignored when offline)
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      fetch(`${this.serverUrl}/api/player/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {
        // Safe offline ignore
      });
    }

    return payload;
  }

  // --- LOAD OPERATION ---
  load() {
    let rawData = null;

    // 1. Try v2 LocalStorage
    try {
      const v2 = localStorage.getItem(LOCAL_SAVE_KEY_V2);
      if (v2) {
        rawData = JSON.parse(v2);
      } else {
        // Fallback: check Legacy v1
        const v1 = localStorage.getItem(LOCAL_SAVE_KEY_LEGACY);
        if (v1) {
          rawData = this.migrateV1ToV2(JSON.parse(v1));
        }
      }
    } catch (e) {
      console.error('[SaveSystem] Corrupted save detected in localStorage:', e);
      this.handleCorruptedSave();
      return null;
    }

    if (rawData && this.validateSaveData(rawData)) {
      this.applySaveData(rawData);
      return rawData;
    }

    return null;
  }

  // --- VALIDATION & RECOVERY ---
  validateSaveData(data) {
    if (!data || typeof data !== 'object') return false;
    if (typeof data.level !== 'number' || data.level < 1) return false;
    if (typeof data.gold !== 'number') return false;
    if (!data.inventory || typeof data.inventory !== 'object') return false;
    return true;
  }

  migrateV1ToV2(v1Data) {
    console.log('[SaveSystem] Migrating Legacy Save v1 to v2...');
    return {
      schemaVersion: SAVE_SCHEMA_VERSION,
      playerId: v1Data.playerId || 'WL-EXPLORER',
      playerName: v1Data.playerName || 'Explorer',
      level: v1Data.level || 1,
      xp: v1Data.xp || 0,
      xpNext: v1Data.xpNext || 300,
      gold: v1Data.gold || 0,
      stats: { hp: 150, maxHp: 150, sta: 100, maxSta: 100, atk: 25, def: 15 },
      position: null,
      inventory: v1Data.inventory || {},
      quests: v1Data.quests || {},
      savedAt: v1Data.savedAt || new Date().toISOString()
    };
  }

  handleCorruptedSave() {
    try {
      const raw = localStorage.getItem(LOCAL_SAVE_KEY_V2);
      if (raw) {
        localStorage.setItem(`${LOCAL_SAVE_KEY_V2}_corrupted_${Date.now()}`, raw);
        localStorage.removeItem(LOCAL_SAVE_KEY_V2);
      }
    } catch (_) {}
  }

  // --- RESET SAVE (NEW GAME) ---
  resetSave() {
    try {
      localStorage.removeItem(LOCAL_SAVE_KEY_V2);
      localStorage.removeItem(LOCAL_SAVE_KEY_LEGACY);
    } catch (_) {}

    if (this.db) {
      try {
        const tx = this.db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete('active_save');
      } catch (_) {}
    }
  }

  // --- APPLY TO RUNTIME GAME SUBSYSTEMS ---
  applySaveData(saveData) {
    if (!saveData) return;

    // 1. Profile, Levels & Gold
    if (this.lobbyData && this.lobbyData.profile) {
      if (typeof saveData.level === 'number') this.lobbyData.profile.level = saveData.level;
      if (typeof saveData.xp === 'number') this.lobbyData.profile.xp = saveData.xp;
      if (typeof saveData.xpNext === 'number') this.lobbyData.profile.xpNext = saveData.xpNext;
      if (typeof saveData.gold === 'number') this.lobbyData.profile.gold = saveData.gold;
      if (saveData.playerName) this.lobbyData.profile.username = saveData.playerName;
      if (typeof this.lobbyData.saveProfile === 'function') {
        this.lobbyData.saveProfile();
      }
    }

    // 2. Inventory & Equipped Gear
    if (this.inventory && saveData.inventory) {
      this.inventory.setLevel(saveData.level || 1);
      this.inventory.deserialize(saveData.inventory);
    }

    // 3. Quests
    if (this.questManager && saveData.quests) {
      this.questManager.deserialize(saveData.quests);
    }

    // 4. Safe World Position
    if (this.player && saveData.position && typeof saveData.position.x === 'number') {
      this.player.position.set(saveData.position.x, saveData.position.y, saveData.position.z);
      if (typeof saveData.position.yaw === 'number') {
        this.player.yaw = saveData.position.yaw;
      }
    }
  }
}
