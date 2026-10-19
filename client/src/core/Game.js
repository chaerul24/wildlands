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

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.qualityPreset = 'medium';
    this.isRunning = false;
    this.isPaused = false;

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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

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
      onStart: ({ name, quality }) => this.startGame(name, quality),
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
      onStartWorld: ({ name, quality }) => this.startGame(name, quality),
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

    // 8d. 3D Enemy Combat & AI Subsystem
    this.enemyManager = new EnemyManager(
      this.scene,
      this.terrain,
      this.buildings,
      this.camera,
      this.lobby ? this.lobby.data : null
    );

    // 9. Resize & orientation listeners
    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this.onWindowResize(), 100);
    });

    // 10. Start Animation Loop
    this.animate();
  }

  startGame(playerName, quality) {
    this.qualityPreset = quality || 'medium';
    this.setQuality(this.qualityPreset);

    if (this.hideout) {
      this.hideout.updateUsername(playerName);
    }

    // Spawn local player
    if (!this.player) {
      this.player = new Player(this.scene, this.terrain, this.buildings, playerName);
    }

    // Connect to multiplayer server with initial spawn elevation
    this.network.connect(playerName, this.player.getState().position);

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
      this.lobby.data.profile.stats.gamesPlayed = (this.lobby.data.profile.stats.gamesPlayed || 0) + 1;
      this.lobby.data.saveLocal();
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
  }

  setQuality(preset) {
    this.qualityPreset = preset;
    if (this.atmosphere) {
      this.atmosphere.setQuality(preset);
    }

    if (preset === 'low') {
      this.renderer.setPixelRatio(1.0);
      this.renderer.shadowMap.enabled = false;
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, preset === 'high' ? 2 : 1.5));
      this.renderer.shadowMap.enabled = true;
    }
  }

  onWindowResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.hideout) {
      this.hideout.onResize(width, height);
    }
    if (this.qualityPreset === 'low') {
      this.renderer.setPixelRatio(1.0);
    } else {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.qualityPreset === 'high' ? 2 : 1.5));
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();

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

      // 2. Camera tracking
      this.cameraController.update(this.player.position, mouseDelta, dt);

      // 3. Atmosphere shadows centered on player
      this.atmosphere.update(this.player.position);

      // 4. Send position update to multiplayer server (throttled to 20Hz)
      this.network.sendPlayerUpdate(this.player.getState());

      // 5. Update HUD coordinates
      this.ui.updateHUD(this.latestNetworkStatus, this.player.position);

      // 6. Update animated landmarks & vegetation wind sway
      if (this.buildings) {
        this.buildings.update(dt, this.clock.getElapsedTime());
      }
      if (this.vegetation) {
        this.vegetation.update(this.clock.getElapsedTime());
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
    } else {
      // LOBBY MODE: Render 3D Hideout Safehouse Scene & Full-Body Character Showcase!
      if (this.hideout) {
        this.hideout.update(dt, this.clock.getElapsedTime());
        this.renderer.render(this.hideout.scene, this.hideout.camera);
      }
    }
  }
}
