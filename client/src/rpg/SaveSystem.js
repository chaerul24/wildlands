const LOCAL_SAVE_KEY = 'wildlands_rpg_savegame_v1';

export class SaveSystem {
  constructor(lobbyData, inventoryManager, questManager) {
    this.lobbyData = lobbyData;
    this.inventory = inventoryManager;
    this.questManager = questManager;

    this.serverUrl = import.meta.env.VITE_SERVER_URL || (window.location.port === '5173' ? `http://${window.location.hostname || 'localhost'}:3001` : window.location.origin);
  }

  save() {
    const profile = this.lobbyData ? this.lobbyData.profile : {};
    const inventoryData = this.inventory ? this.inventory.serialize() : {};
    const questData = this.questManager ? this.questManager.serialize() : {};

    const payload = {
      playerId: profile.id || 'WL-DEFAULT',
      playerName: profile.username || 'Explorer',
      level: profile.level || 1,
      xp: profile.xp || 0,
      xpNext: profile.xpNext || 300,
      gold: profile.gold || 0,
      inventory: inventoryData,
      quests: questData,
      savedAt: new Date().toISOString()
    };

    // 1. LocalStorage
    try {
      localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[SaveSystem] Error saving to localStorage:', e);
    }

    // 2. Cloud Server Sync (Fire & Forget / Background)
    fetch(`${this.serverUrl}/api/player/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(() => {
      // Offline fallback ok
    });

    return payload;
  }

  load() {
    let localData = null;
    try {
      const raw = localStorage.getItem(LOCAL_SAVE_KEY);
      if (raw) localData = JSON.parse(raw);
    } catch (e) {
      console.warn('[SaveSystem] Error loading local save:', e);
    }

    if (localData) {
      this.applySaveData(localData);
      return localData;
    }
    return null;
  }

  async loadFromServer(playerId) {
    try {
      const res = await fetch(`${this.serverUrl}/api/player/load/${playerId}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.save) {
          this.applySaveData(data.save);
          return data.save;
        }
      }
    } catch (_) {}
    return this.load();
  }

  applySaveData(saveData) {
    if (!saveData) return;

    // Apply Profile & Levels
    if (this.lobbyData && this.lobbyData.profile) {
      if (saveData.level) this.lobbyData.profile.level = saveData.level;
      if (saveData.xp) this.lobbyData.profile.xp = saveData.xp;
      if (saveData.xpNext) this.lobbyData.profile.xpNext = saveData.xpNext;
      if (typeof saveData.gold === 'number') this.lobbyData.profile.gold = saveData.gold;
      this.lobbyData.saveProfile();
    }

    // Apply Inventory & Equipment
    if (this.inventory && saveData.inventory) {
      this.inventory.setLevel(saveData.level || 1);
      this.inventory.deserialize(saveData.inventory);
    }

    // Apply Quests
    if (this.questManager && saveData.quests) {
      this.questManager.deserialize(saveData.quests);
    }
  }
}
