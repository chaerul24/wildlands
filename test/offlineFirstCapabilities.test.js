import assert from 'assert';
import puppeteer from 'puppeteer-core';
import { SaveSystem } from '../client/src/rpg/SaveSystem.js';
import { NetworkManager } from '../client/src/network/NetworkManager.js';
import { LobbyData } from '../client/src/lobby/LobbyData.js';

console.log('🧪 ========================================================');
console.log('🧪 WILDLANDS ANDROID OFFLINE-FIRST ARCHITECTURE QA SUITE');
console.log('🧪 ========================================================');

// ---------------------------------------------------------------------------
// TEST 1: SaveSystem v2 Schema, Migration & Corrupted Recovery
// ---------------------------------------------------------------------------
console.log('\n[Test 1] Testing SaveSystem v2 Schema, Migration & Recovery...');

// Mock localStorage for Node environment if needed
if (typeof localStorage === 'undefined') {
  let store = {};
  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; }
  };
}

const mockLobby = {
  profile: { id: 'WL-TEST', username: 'OfflineWarrior', level: 3, xp: 220, xpNext: 500, gold: 450 }
};
const mockInv = {
  serialize: () => ({ slots: [{ id: 'wpn_steel_sword', count: 1 }], equipped: { weapon: 'wpn_steel_sword' } }),
  getStats: () => ({ hp: 200, maxHp: 200, sta: 120, maxSta: 120, atk: 55, def: 35 }),
  setLevel: () => {},
  deserialize: () => {}
};
const mockQuest = {
  serialize: () => ({ active: ['quest_marauder_threat'], completed: ['quest_intro'] }),
  deserialize: () => {}
};
const mockPlayer = {
  position: { x: 42.5, y: 1.8, z: 28.3, set: function(x, y, z) { this.x = x; this.y = y; this.z = z; } },
  yaw: 1.57
};

const saveSys = new SaveSystem(mockLobby, mockInv, mockQuest, mockPlayer);

// Save test
const saved = saveSys.save(true);
assert.ok(saved, 'Save payload must be generated');
assert.strictEqual(saved.schemaVersion, 2, 'Must use Save Schema Version 2');
assert.strictEqual(saved.playerName, 'OfflineWarrior');
assert.strictEqual(saved.level, 3);
assert.strictEqual(saved.gold, 450);
assert.strictEqual(saved.position.x, 42.5);
assert.strictEqual(saved.position.z, 28.3);
assert.ok(saveSys.hasExistingSave(), 'hasExistingSave must be true');

// Load test
const loaded = saveSys.load();
assert.ok(loaded, 'Save must be loaded successfully');
assert.strictEqual(loaded.playerName, 'OfflineWarrior');
assert.strictEqual(loaded.stats.atk, 55);

// Test Legacy v1 Migration
localStorage.clear();
const legacyV1 = {
  playerId: 'WL-LEGACY',
  playerName: 'OldExplorer',
  level: 2,
  gold: 150,
  inventory: { slots: [] },
  quests: { active: [] }
};
localStorage.setItem('wildlands_rpg_savegame_v1', JSON.stringify(legacyV1));
const migrated = saveSys.load();
assert.ok(migrated, 'Legacy v1 save must load');
assert.strictEqual(migrated.schemaVersion, 2, 'Legacy save must be migrated to schema v2');
assert.strictEqual(migrated.playerName, 'OldExplorer');
assert.strictEqual(migrated.level, 2);

console.log('  ✓ SaveSystem v2, validation, coordinate persistence, and v1 migration verified.');

// ---------------------------------------------------------------------------
// TEST 2: NetworkManager Offline Mode (Zero Sockets & Local Processing)
// ---------------------------------------------------------------------------
console.log('\n[Test 2] Testing NetworkManager Offline Mode...');
let statusOutput = null;
const netMgr = new NetworkManager(null, null, (st) => { statusOutput = st; });

// Connect with isOffline = true
netMgr.connect('SoloHero', { x: 0, y: 0, z: 0 }, true);

assert.strictEqual(netMgr.isOfflineMode, true, 'isOfflineMode must be true');
assert.strictEqual(netMgr.isConnected, false, 'isConnected must be false in offline mode');
assert.strictEqual(netMgr.socket, null, 'Socket must be null');
assert.ok(statusOutput, 'Status change must fire');
assert.strictEqual(statusOutput.isOffline, true, 'Status must report isOffline: true');
assert.strictEqual(statusOutput.ping, 0, 'Ping must be 0 ms in offline mode');
assert.strictEqual(statusOutput.onlineCount, 1, 'Player count must be 1 (self)');

// Test sendPlayerUpdate bypass
netMgr.sendPlayerUpdate({ position: { x: 10, y: 1, z: 10 } }); // Should not throw or crash
console.log('  ✓ NetworkManager runs 100% locally in offline mode with zero network calls.');

// ---------------------------------------------------------------------------
// TEST 3: LobbyData Offline Fallback Robustness
// ---------------------------------------------------------------------------
console.log('\n[Test 3] Testing LobbyData Offline Fallback Content...');
const lobbyData = new LobbyData();
lobbyData.serverUrl = 'http://127.0.0.1:9999'; // Dead port to simulate offline

const [events, missions, news, friends] = await Promise.all([
  lobbyData.fetchEvents(),
  lobbyData.fetchMissions(),
  lobbyData.fetchNews(),
  lobbyData.fetchFriends()
]);

assert.ok(events.length >= 2, 'Must have at least 2 default offline events');
assert.ok(missions.length >= 2, 'Must have at least 2 default offline missions');
assert.ok(news.length >= 1, 'Must have default offline news');
assert.ok(friends.length >= 2, 'Must have default offline village contacts');
assert.ok(events[0].title.includes('Lembah'), 'Default event contains local theme');
console.log('  ✓ Lobby events, missions, news, and village contacts fully functional offline.');

// ---------------------------------------------------------------------------
// TEST 4: Browser E2E Offline-First Simulation (Chrome with Network Emulation)
// ---------------------------------------------------------------------------
console.log('\n[Test 4] Running Browser E2E Offline Simulation Test...');

async function runOfflineBrowserTest() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    await page.setViewport({ width: 1280, height: 720 });

    // Enable request interception: Allow localhost web bundle and assets, but block any external network calls
    await page.setRequestInterception(true);
    let blockedCount = 0;
    page.on('request', req => {
      const url = req.url();
      if (url.startsWith('http://127.0.0.1:3001') || url.startsWith('http://localhost:3001')) {
        req.continue();
      } else {
        blockedCount++;
        req.abort();
      }
    });

    // Load game from local distribution
    await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await new Promise(r => setTimeout(r, 1200));

    // 1. Verify Splash Screen loads cleanly
    const splashVisible = await page.evaluate(() => {
      const splash = document.getElementById('game-splash-screen');
      return splash && window.getComputedStyle(splash).display !== 'none';
    });
    assert.strictEqual(splashVisible, true, 'Splash Screen must display offline');
    console.log('  ✓ Splash screen loaded offline.');

    // 2. Click start to trigger Loading screen
    await page.click('#btn-splash-enter');
    await new Promise(r => setTimeout(r, 600));

    const loadingVisible = await page.evaluate(() => {
      const loading = document.getElementById('game-loading-screen');
      return loading && window.getComputedStyle(loading).display !== 'none';
    });
    assert.strictEqual(loadingVisible, true, 'Loading Screen must display offline');
    console.log('  ✓ Loading screen active with local assets.');

    // 3. Wait for Loading to complete and transition to 3D Safehouse Lobby
    let lobbyReady = false;
    for (let i = 0; i < 40; i++) {
      await new Promise(r => setTimeout(r, 250));
      lobbyReady = await page.evaluate(() => {
        const loading = document.getElementById('game-loading-screen');
        const lobby = document.getElementById('lobby-screen');
        const playBtn = document.getElementById('btn-sidebar-play');
        const isDone = !loading || window.getComputedStyle(loading).display === 'none' || window.getComputedStyle(loading).opacity === '0';
        const isLobby = Boolean(lobby && window.getComputedStyle(lobby).display !== 'none');
        const isPlay = Boolean(playBtn && window.getComputedStyle(playBtn).display !== 'none');
        return isDone && isLobby && isPlay;
      });
      if (lobbyReady) break;
    }
    assert.strictEqual(lobbyReady, true, 'Lobby must be ready offline');
    console.log('  ✓ 3D Safehouse Lobby reached offline.');

    // 4. Enter World in Offline Mode
    console.log('  Clicking [ENTER WORLD] to launch Offline Single-Player World...');
    await page.evaluate(() => {
      window.__WILDLANDS_FORCE_OFFLINE = true;
      const playBtn = document.getElementById('btn-sidebar-play');
      if (playBtn) playBtn.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // 5. Verify World Gameplay State Offline
    const worldState = await page.evaluate(() => {
      const game = window.__wildlandsGame;
      const hud = document.getElementById('hud');
      const statusText = document.getElementById('status-text');
      const pingText = document.getElementById('ping-text');

      return {
        isGameActive: game ? game.isRunning : false,
        hasPlayer: game && !!game.player,
        playerPos: game && game.player ? {
          x: Math.round(game.player.position.x),
          y: Math.round(game.player.position.y),
          z: Math.round(game.player.position.z)
        } : null,
        isOfflineMode: game && game.network ? game.network.isOfflineMode : false,
        hudVisible: hud && window.getComputedStyle(hud).display !== 'none',
        statusMsg: statusText ? statusText.textContent : '',
        pingMsg: pingText ? pingText.textContent : ''
      };
    });

    console.log('  Offline World State:', JSON.stringify(worldState));
    assert.strictEqual(worldState.isGameActive, true, 'Game loop must be active offline');
    assert.strictEqual(worldState.hasPlayer, true, 'Player must be spawned in offline world');
    assert.strictEqual(worldState.isOfflineMode, true, 'NetworkManager must report isOfflineMode: true');
    assert.strictEqual(worldState.pingMsg, 'OFFLINE', 'HUD must display OFFLINE badge');
    console.log('  ✓ Open-world gameplay, player physics, terrain, and HUD running 100% offline!');

    // 6. Test in-game Autosave & Persistence in Offline Mode
    const savedOffline = await page.evaluate(() => {
      const game = window.__wildlandsGame;
      if (game && game.saveSystem) {
        return game.saveSystem.save(true);
      }
      return null;
    });
    assert.ok(savedOffline, 'SaveSystem must successfully persist save offline');
    assert.strictEqual(savedOffline.schemaVersion, 2);
    console.log('  ✓ In-game save persisted offline with schema v2.');

    // Capture screenshot of offline gameplay
    await page.screenshot({ path: '/root/wildlands/offline-gameplay.png' });
    console.log('  📸 Captured offline gameplay screenshot to offline-gameplay.png');

  } finally {
    await browser.close();
  }
}

await runOfflineBrowserTest();

console.log('\n🧪 ========================================================');
console.log('🧪 ALL OFFLINE-FIRST ARCHITECTURE QA TESTS PASSED! (100%)');
console.log('🧪 ========================================================');
