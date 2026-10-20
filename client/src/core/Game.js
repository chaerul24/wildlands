import * as THREE from 'three';
import { Terrain } from '../world/Terrain.js';
import { Vegetation } from '../world/Vegetation.js';
import { Buildings } from '../world/Buildings.js';
import { Atmosphere } from '../world/Atmosphere.js';
import { NPCManager } from '../world/NPCManager.js';
import { Player } from '../entities/Player.js';
import { CameraController } from './CameraController.js';
import { InputManager } from './InputManager.js';
import { NetworkManager } from '../network/NetworkManager.js';
import { UIManager } from '../ui/UIManager.js';
import { LobbyManager } from '../lobby/LobbyManager.js';
import { HideoutScene } from '../lobby/HideoutScene.js';
import { EnemyManager } from '../combat/EnemyManager.js';
import { InventoryManager } from '../rpg/InventoryManager.js';
import { InventoryUI } from '../rpg/InventoryUI.js';
import { LootManager } from '../rpg/LootManager.js';
import { QuestManager } from '../rpg/QuestManager.js';
import { DialogueManager } from '../rpg/DialogueManager.js';
import { SaveSystem } from '../rpg/SaveSystem.js';
import { OnboardingManager } from '../rpg/OnboardingManager.js';
import { ShopUI } from '../rpg/ShopUI.js';
import { Minimap } from '../ui/Minimap.js';
import { AssetPreviewUI } from '../ui/AssetPreviewUI.js';
import { RPG_ITEMS } from '../rpg/RPGConfig.js';
import { AdaptiveQualityManager } from './AdaptiveQualityManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { BootManager } from '../opening/BootManager.js';
import { AudioManager } from '../opening/AudioManager.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    // Android / mobile automatic detection
    const isMobileAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
    this.qualityPreset = isMobileAndroid ? 'medium' : 'high';
    this.isRunning = false;
    this.isPaused = false;
    this.isContextLost = false;

    // Core Three.js components
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.clock = new THREE.Clock();

    // Game subsystems
    this.terrain = null;
    this.vegetation = null;
    this.buildings = null;
    this.atmosphere = null;
    this.npcManager = null;
    this.player = null;
    this.cameraController = null;
    this.input = null;
    this.network = null;
    this.ui = null;
    this.lobby = null;
    this.hideout = null;
    this.enemyManager = null;
    this.bootManager = null;
    this.audioMgr = AudioManager.getInstance();

    // Performance & Diagnostics
    this.adaptiveQuality = null;
    this.perfMonitor = null;

    // RPG Subsystems
    this.inventory = null;
    this.inventoryUI = null;
    this.lootManager = null;
    this.questManager = null;
    this.dialogueManager = null;
    this.saveSystem = null;
    this.onboarding = null;

    // Network status cache
    this.latestNetworkStatus = { connected: false, ping: 0, onlineCount: 1, players: [] };

    this.init();
  }

  init() {
    // 1. Scene
    this.scene = new THREE.Scene();

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      800
    );

    // 3. WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // WebGL Context Loss Handlers (Android lifecycle resilience)
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('[Game] WebGL Context Lost! Pausing rendering.');
      this.isContextLost = true;
    }, false);

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.log('[Game] WebGL Context Restored! Reinitializing render state.');
      this.isContextLost = false;
      this.setQuality(this.qualityPreset);
    }, false);

    // Tab Visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.clock.stop();
      } else {
        this.clock.start();
      }
    });

    // Performance & Adaptive Quality
    this.adaptiveQuality = new AdaptiveQualityManager(this, { autoAdaptive: true });
    this.perfMonitor = new PerformanceMonitor(this.renderer, this.adaptiveQuality);

    // Apply initial profile
    this.setQuality(this.qualityPreset);

    // 4. World Subsystems
    this.terrain = new Terrain(this.scene);
    this.vegetation = new Vegetation(this.scene, this.terrain, this.qualityPreset);
    this.buildings = new Buildings(this.scene, this.terrain);
    this.atmosphere = new Atmosphere(this.scene, this.qualityPreset);
    this.npcManager = new NPCManager(this.scene, this.terrain, this.buildings);

    // 5. Input
    this.input = new InputManager(this.canvas);
    this.input.onEscapePressed = () => this.togglePause();
    this.input.onTabToggled = (show) => {
      if (this.ui && this.isRunning) {
        this.ui.toggleTabPlayerList(show, this.latestNetworkStatus);
      }
    };
    this.input.onAttackPressed = () => {
      if (this.isRunning && !this.isPaused && this.player && this.enemyManager) {
        this.enemyManager.onPlayerAttack(this.player);
      }
    };
    this.input.onRollPressed = () => {
      if (this.isRunning && !this.isPaused && this.player && this.enemyManager) {
        this.enemyManager.onPlayerRoll(this.player);
      }
    };
    this.input.onInteractPressed = () => {
      if (this.isRunning && !this.isPaused) {
        if (!this.lootManager.tryInteract()) {
          this.dialogueManager.tryInteract();
        }
      }
    };
    this.input.onInventoryToggled = () => {
      if (this.isRunning && !this.isPaused) {
        this.inventoryUI.toggle();
      }
    };
    this.input.onQuickslotPressed = (slotNum) => {
      if (this.isRunning && !this.isPaused && this.inventory) {
        if (slotNum === 1) this.inventory.useItem('potion_hp', this.enemyManager?.combat);
        else if (slotNum === 2) this.inventory.useItem('potion_sta', this.enemyManager?.combat);
      }
    };

    // 6. Camera Controller
    this.cameraController = new CameraController(this.camera, this.terrain, this.buildings);

    // 7. Network Manager
    this.network = new NetworkManager(
      this.scene,
      this.terrain,
      (status) => {
        this.latestNetworkStatus = status;
        if (this.ui) this.ui.updateHUD(status, this.player ? this.player.position : null);
      },
      (msg, type) => {
        if (this.ui) this.ui.showToast(msg, type);
      }
    );

    // 8. UI Manager (HUD, Pause, Touch controls)
    this.ui = new UIManager({
      onStart: ({ name, quality, isOffline }) => this.startGame(name, quality, isOffline),
      onResume: () => this.resumeGame(),
      onQualityChange: (quality) => this.setQuality(quality),
      onSensitivityChange: (val) => this.cameraController.setSensitivity(val),
      onLeave: () => this.leaveGame()
    });
    window.__showWildlandsToast = (msg, type) => {
      if (this.ui) this.ui.showToast(msg, type);
    };

    // 8b. Professional Multiplayer Lobby Manager
    this.lobby = new LobbyManager({
      onStartWorld: ({ name, quality, isOffline }) => this.startGame(name, quality, isOffline),
      onApplyQuality: (quality) => this.setQuality(quality),
      onApplySensitivity: (val) => {
        if (this.cameraController) {
          this.cameraController.setSensitivity(val);
        }
      },
      onReturnToLobby: () => this.leaveGame()
    });

    // 8c. Realistic 3D Hideout Safehouse Scene for Lobby
    const initialName = this.lobby ? this.lobby.data.profile.username : 'Explorer';
    this.hideout = new HideoutScene(this.canvas, initialName);

    // 8d. Core RPG Subsystems (Inventory, Loot, Quests, Dialogues, Save)
    this.inventory = new InventoryManager(
      this.lobby?.data?.profile?.level || 1,
      (stats) => {
        if (this.enemyManager && this.enemyManager.combat) {
          this.enemyManager.combat.setStats(stats);
        }
      },
      (msg, type) => {
        if (this.ui) this.ui.showToast(msg, type);
      }
    );

    this.questManager = new QuestManager(this.inventory, this.lobby ? this.lobby.data : null, null);
    this.lootManager = new LootManager(this.scene, this.inventory, this.lobby ? this.lobby.data : null, null);
    this.lootManager.onLootCollected = (loot) => {
      this.questManager.onLootCollected(loot);
      if (this.saveSystem) this.saveSystem.save();
    };

    // 8e. 3D Enemy Combat & AI Subsystem
    this.enemyManager = new EnemyManager(
      this.scene,
      this.terrain,
      this.buildings,
      this.camera,
      this.lobby ? this.lobby.data : null,
      this.lootManager,
      this.questManager
    );

    // Audio linkage
    this.lootManager.audio = this.enemyManager.combat.audio;
    this.questManager.audio = this.enemyManager.combat.audio;
    this.enemyManager.combat.setStats(this.inventory.getStats());

    // 8f. 3D Dialogue, Shop, Minimap & Inventory UI Controllers
    this.shopUI = new ShopUI(
      this.inventory,
      this.enemyManager.combat,
      this.input,
      this.lobby ? this.lobby.data : null,
      (weaponDef) => {
        if (this.player && this.player.character && typeof this.player.character.attachWeapon === 'function') {
          this.player.character.attachWeapon(weaponDef.modelUrl);
        }
      }
    );

    this.dialogueManager = new DialogueManager(this.npcManager, this.questManager, this.input, this.shopUI);
    this.inventoryUI = new InventoryUI(this.inventory, this.enemyManager.combat, this.input);
    this.assetPreviewUI = new AssetPreviewUI();

    // Sync weapon equipping from inventory bag to player 3D mesh
    const origEquipItem = this.inventory.equipItem.bind(this.inventory);
    this.inventory.equipItem = (itemId) => {
      const ok = origEquipItem(itemId);
      if (ok) {
        const itemDef = RPG_ITEMS[itemId];
        if (itemDef && itemDef.type === 'weapon' && this.player && this.player.character && typeof this.player.character.attachWeapon === 'function') {
          this.player.character.attachWeapon(itemDef.modelUrl);
        }
      }
      return ok;
    };

    // 8fa. In-game Circular Radar Minimap & Full World Map Modal
    this.minimap = new Minimap(
      this.player,
      this.npcManager,
      this.buildings,
      this.questManager,
      this.input
    );

    // Keydown listener for Shop [P]
    window.addEventListener('keydown', (e) => {
      if (e.key === 'p' || e.key === 'P') {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) return;
        if (this.isRunning && !this.isPaused && this.shopUI) {
          e.preventDefault();
          this.shopUI.toggle();
        }
      }
    });

    // 8g. Persistence Save / Load System
    this.saveSystem = new SaveSystem(this.lobby ? this.lobby.data : null, this.inventory, this.questManager);
    this.saveSystem.load();

    // 8h. Quest Tracker HUD Integration
    this.questManager.onQuestUpdated = (quests) => this.updateQuestTrackerHUD(quests);
    this.updateQuestTrackerHUD(this.questManager.getActiveQuestsList());

    // 8i. Wire HUD & Mobile Interactive Buttons
    const btnHudInv = document.getElementById('btn-hud-inventory');
    if (btnHudInv) {
      btnHudInv.addEventListener('click', () => {
        if (this.isRunning && !this.isPaused) this.inventoryUI.toggle();
      });
    }

    const btnMobInteract = document.getElementById('btn-mobile-interact');
    if (btnMobInteract) {
      btnMobInteract.addEventListener('click', () => {
        if (this.isRunning && !this.isPaused) {
          if (!this.lootManager.tryInteract()) this.dialogueManager.tryInteract();
        }
      });
    }

    const btnMobRoll = document.getElementById('btn-mobile-roll');
    if (btnMobRoll) {
      btnMobRoll.addEventListener('click', () => {
        if (this.isRunning && !this.isPaused && this.player && this.enemyManager) {
          this.enemyManager.onPlayerRoll(this.player);
        }
      });
    }

    // 8j. Onboarding Tutorial Flow (Splash -> Loading -> Onboarding -> Lobby)
    this.onboarding = new OnboardingManager(() => {
      // Ready for gameplay
    });

    // 8k. Cinematic Game Opening Orchestrator (Boot -> Splash -> Loading -> Safehouse Lobby)
    this.bootManager = new BootManager(this, () => {
      console.log('[Game] Safehouse Lobby Ready after Opening Flow.');
    });
    this.bootManager.start();

    // 9. Resize & orientation listeners
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onWindowResize(), 100);
    });

    // 9b. Context Loss Handlers & Autosave
    if (this.canvas) {
      this.canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        this.isContextLost = true;
        console.warn('[Game] WebGL context lost! Pausing rendering.');
        if (this.saveSystem) this.saveSystem.save(true);
      });
      this.canvas.addEventListener('webglcontextrestored', () => {
        this.isContextLost = false;
        console.log('[Game] WebGL context restored.');
        this.setQuality(this.qualityPreset);
      });
    }

    // Capacitor Native App Lifecycle (Pause/Resume/Background)
    if (typeof window !== 'undefined') {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            if (this.isRunning && !this.isPaused) {
              this.togglePause();
            }
            if (this.saveSystem) {
              this.saveSystem.save(true);
            }
          }
        });
      }).catch(() => {
        // Fallback for regular web browsers
      });
    }

    // Periodic Autosave every 45s while playing
    setInterval(() => {
      if (this.isRunning && !this.isPaused && this.saveSystem) {
        this.saveSystem.save();
      }
    }, 45000);

    // 10. Start Animation Loop
    this.animate();
  }

  startGame(playerName, quality, isOffline = false) {
    this.qualityPreset = quality || 'medium';
    this.setQuality(this.qualityPreset);

    if (this.hideout) {
      this.hideout.updateUsername(playerName);
    }

    const shouldRunOffline = isOffline || (typeof navigator !== 'undefined' && !navigator.onLine) || Boolean(window.__WILDLANDS_FORCE_OFFLINE);

    // Spawn local player
    if (!this.player) {
      this.player = new Player(this.scene, this.terrain, this.buildings, playerName);
      if (this.minimap) {
        this.minimap.player = this.player;
      }

      // Link player to SaveSystem and restore position if loaded
      if (this.saveSystem) {
        this.saveSystem.player = this.player;
        if (this.saveSystem.lastLoadedPosition) {
          const p = this.saveSystem.lastLoadedPosition;
          this.player.position.set(p.x, p.y, p.z);
          if (typeof p.yaw === 'number') this.player.yaw = p.yaw;
        }
      }

      // Attach initial equipped weapon
      const currentEquippedWeaponId = this.inventory?.equipped?.weapon;
      if (currentEquippedWeaponId) {
        const weaponDef = RPG_ITEMS[currentEquippedWeaponId];
        if (weaponDef && weaponDef.modelUrl && this.player.character && typeof this.player.character.attachWeapon === 'function') {
          this.player.character.attachWeapon(weaponDef.modelUrl);
        }
      }
    } else {
      if (this.saveSystem) {
        this.saveSystem.player = this.player;
      }
    }

    // Connect to multiplayer server OR run offline single-player
    this.network.connect(playerName, this.player.getState().position, shouldRunOffline);

    this.isRunning = true;
    this.isPaused = false;
    this.input.isPaused = false;
    this.input.requestPointerLock();
    if (this.ui) {
      this.ui.isGameActive = true;
      this.ui.updateMobileControlsVisibility();
    }

    if (this.enemyManager && this.enemyManager.combat) {
      this.enemyManager.combat.updatePlayerHUD(playerName);
    }

    if (this.lobby && this.lobby.data) {
      if (this.lobby.data.profile && this.lobby.data.profile.stats) {
        this.lobby.data.profile.stats.gamesPlayed = (this.lobby.data.profile.stats.gamesPlayed || 0) + 1;
      }
      if (typeof this.lobby.data.saveProfile === 'function') {
        this.lobby.data.saveProfile();
      } else if (typeof this.lobby.data.saveLocal === 'function') {
        this.lobby.data.saveLocal();
      }
    }

    if (this.audioMgr) {
      this.audioMgr.playBGM('loading', 0.5); // Open-world background ambiance
    }
  }

  resumeGame() {
    this.isPaused = false;
    this.input.isPaused = false;
    this.ui.hidePauseMenu();
    this.input.requestPointerLock();
  }

  togglePause() {
    if (!this.isRunning) return;
    this.isPaused = !this.isPaused;
    this.input.isPaused = this.isPaused;
    this.ui.togglePauseMenu(this.isPaused);

    if (this.isPaused) {
      this.input.exitPointerLock();
    } else {
      this.input.requestPointerLock();
    }
  }

  leaveGame() {
    if (this.saveSystem) {
      this.saveSystem.save();
    }
    this.isRunning = false;
    this.isPaused = false;
    this.input.isPaused = true;
    this.input.exitPointerLock();
    this.network.disconnect();
    if (this.ui) {
      this.ui.hidePauseMenu();
      this.ui.isGameActive = false;
      this.ui.updateMobileControlsVisibility();
    }
    if (this.lobby && this.lobby.isInWorld) {
      this.lobby.returnToLobby();
    }
    if (this.audioMgr) {
      this.audioMgr.playBGM('lobby', 1.0);
    }
  }

  updateQuestTrackerHUD(quests) {
    const trackerEl = document.getElementById('hud-quest-tracker');
    const titleEl = document.getElementById('hud-quest-title');
    const container = document.getElementById('hud-quest-objectives');
    if (!trackerEl || !container) return;

    if (!quests || quests.length === 0) {
      trackerEl.style.display = 'none';
      return;
    }

    trackerEl.style.display = 'flex';
    const q = quests[0];
    if (titleEl) titleEl.textContent = q.title;

    container.innerHTML = q.objectives.map(obj => `
      <div class="qt-objective-item ${obj.completed ? 'done' : ''}">
        <span class="qt-check-icon">${obj.completed ? '✅' : '⚪'}</span>
        <span>${obj.text}</span>
      </div>
    `).join('');
  }

  setQuality(preset) {
    this.qualityPreset = preset;
    if (this.atmosphere) {
      this.atmosphere.setQuality(preset);
    }
    if (this.vegetation) {
      this.vegetation.setQuality(preset);
    }

    if (preset === 'low') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
    } else if (preset === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (this.ui && this.ui.selectPauseQuality) {
      this.ui.selectPauseQuality.value = preset;
    }
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    
    // In-game 3rd-person camera vertical FOV adaptation
    if (width < height) {
      this.camera.fov = 68;
    } else if (height <= 450) {
      this.camera.fov = 56;
    } else {
      this.camera.fov = 60;
    }
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    if (this.hideout) {
      this.hideout.onResize(width, height);
    }
    if (this.qualityPreset === 'low') {
      this.renderer.setPixelRatio(1.0);
    } else if (this.qualityPreset === 'medium') {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0));
    }
    if (this.ui) {
      this.ui.updateMobileControlsVisibility();
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    if (this.isContextLost) return;

    let dt = this.clock.getDelta();
    if (dt > 0.1) dt = 0.1; // Delta time clamping

    // Update adaptive quality moving average
    if (this.adaptiveQuality) {
      this.adaptiveQuality.update(dt);
    }

    if (this.isRunning && !this.isPaused && this.player) {
      const prevX = this.player.position.x;
      const prevZ = this.player.position.z;

      // 1. Process player input & physics
      const mouseDelta = this.input.consumeMouseDelta();

      this.player.update(this.input, this.camera, dt);

      // Record player metrics for lobby missions & stats
      const dx = this.player.position.x - prevX;
      const dz = this.player.position.z - prevZ;
      const stepDist = Math.sqrt(dx * dx + dz * dz);
      if (stepDist > 0.001 && stepDist < 30 && this.lobby && this.lobby.data) {
        this.lobby.data.recordDistance(stepDist);

        // Check proximity to key landmarks:
        // Village center around (42, 28)
        if (Math.hypot(this.player.position.x - 42, this.player.position.z - 28) < 35) {
          this.lobby.data.recordLocationVisit('village');
        }
        // Old Weathered House around (-55, -35)
        if (Math.hypot(this.player.position.x - (-55), this.player.position.z - (-35)) < 30) {
          this.lobby.data.recordLocationVisit('old_house');
        }
        // Merchant at (14, 2)
        if (Math.hypot(this.player.position.x - 14, this.player.position.z - 2) < 18) {
          this.lobby.data.recordLocationVisit('merchant');
        }
      }

      // 2. Third-person camera tracking with smooth auto-follow & anti-clipping
      const isPlayerMoving = this.player.velocity ? this.player.velocity.lengthSq() > 0.05 : false;
      this.cameraController.update(this.player.position, mouseDelta, dt, this.player.yaw, isPlayerMoving);

      // 3. Atmosphere shadows centered on player
      this.atmosphere.update(this.player.position);

      // 4. Send position update to multiplayer server (throttled to 20Hz)
      this.network.sendPlayerUpdate(this.player.getState());

      // 5. Update HUD coordinates
      this.ui.updateHUD(this.latestNetworkStatus, this.player.position);

      // 5b. Update RPG Subsystems (Loot proximity, Dialogue proximity, Quest location checks)
      if (this.lootManager) {
        this.lootManager.update(dt, this.player.position);
      }
      if (this.dialogueManager) {
        this.dialogueManager.update(this.player.position);
      }
      if (this.questManager) {
        this.questManager.onPlayerMoved(this.player.position);
      }
      if (this.minimap) {
        this.minimap.update(this.player, dt);
      }

      // 6. Update animated landmarks & forward-culling vegetation
      if (this.buildings) {
        this.buildings.update(dt, this.clock.getElapsedTime());
      }
      if (this.vegetation) {
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        camDir.y = 0;
        camDir.normalize();
        this.vegetation.update(this.clock.getElapsedTime(), this.player.position, camDir);
      }
      if (this.npcManager) {
        this.npcManager.update(dt, this.clock.getElapsedTime(), this.player.position);
      }
      if (this.enemyManager) {
        this.enemyManager.update(dt, this.player);
      }
      if (this.network) {
        this.network.update(dt);
      }

      // 7. Render open-world gameplay frame
      this.renderer.render(this.scene, this.camera);

      // 8. Performance diagnostics overlay
      if (this.perfMonitor) {
        this.perfMonitor.update(this.qualityPreset);
      }
    } else {
      // LOBBY MODE: Render 3D Hideout Safehouse Scene & Full-Body Character Showcase!
      if (this.hideout) {
        this.hideout.update(dt, this.clock.getElapsedTime());
        this.renderer.render(this.hideout.scene, this.hideout.camera);
        if (this.perfMonitor) {
          this.perfMonitor.update(this.qualityPreset);
        }
      }
    }
  }
}
