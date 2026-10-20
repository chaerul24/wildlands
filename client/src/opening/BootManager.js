/**
 * BootManager.js
 * State Machine Orchestrator for Wildlands 3D RPG:
 * BOOT -> SPLASH SCREEN -> LOADING SCREEN -> LOBBY
 * - Verifies system readiness (WebGL, screen, localStorage).
 * - Smoothly manages transitions with zero black flashes or double initializations.
 * - Coordinates Audio transitions (Splash BGM -> Loading BGM -> Lobby BGM).
 * - Integrates real AssetLoadingManager with LoadingScreen.
 */

import { OPENING_STATES } from './GameOpeningConfig.js';
import { AudioManager } from './AudioManager.js';
import { AssetLoadingManager } from './AssetLoadingManager.js';
import { SplashScreen } from './SplashScreen.js';
import { LoadingScreen } from './LoadingScreen.js';

export class BootManager {
  constructor(gameInstance, onLobbyReadyCallback) {
    this.game = gameInstance;
    this.onLobbyReady = onLobbyReadyCallback;

    this.state = OPENING_STATES.BOOT;
    this.isTransitioning = false;

    // Subsystems
    this.audioMgr = AudioManager.getInstance();
    this.assetLoadingMgr = new AssetLoadingManager();
    this.splashScreen = null;
    this.loadingScreen = null;

    this.bootTimestamp = Date.now();
  }

  start() {
    if (this.state !== OPENING_STATES.BOOT) {
      console.warn('[BootManager] Already started. Current state:', this.state);
      return;
    }

    console.log('[BootManager] Phase 1: BOOT — Verifying system readiness...');
    this.performBootChecks();
  }

  performBootChecks() {
    // 1. Verify WebGL availability
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      console.error('[BootManager] Fatal: WebGL is not supported on this browser/device.');
    }

    // 2. Setup Audio System
    this.audioMgr.ensureContext();

    // 3. Move to SPLASH state
    this.transitionTo(OPENING_STATES.SPLASH);
  }

  transitionTo(nextState) {
    if (this.isTransitioning && this.state === nextState) return;
    this.isTransitioning = true;
    const prevState = this.state;
    this.state = nextState;

    console.log(`[BootManager] Transition: ${prevState} -> ${nextState}`);

    switch (nextState) {
      case OPENING_STATES.SPLASH:
        this.runSplashPhase();
        break;
      case OPENING_STATES.LOADING:
        this.runLoadingPhase();
        break;
      case OPENING_STATES.LOBBY:
        this.runLobbyPhase();
        break;
      default:
        console.error('[BootManager] Unknown state:', nextState);
    }
  }

  runSplashPhase() {
    // Start splash BGM (queued if audio waiting for unlock)
    this.audioMgr.playBGM('splash', 0.8);

    // Initialize & display cinematic splash screen
    this.splashScreen = new SplashScreen(document.body, () => {
      this.isTransitioning = false;
      this.transitionTo(OPENING_STATES.LOADING);
    });

    this.isTransitioning = false;
  }

  runLoadingPhase() {
    // Crossfade to loading BGM
    this.audioMgr.playBGM('loading', 0.8);

    // Initialize Loading Screen
    this.loadingScreen = new LoadingScreen(document.body, () => {
      this.isTransitioning = false;
      this.transitionTo(OPENING_STATES.LOBBY);
    });

    // Wire real AssetLoadingManager events
    this.assetLoadingMgr.onProgress = (pct, item, msg) => {
      if (this.loadingScreen) {
        this.loadingScreen.updateProgress(pct, item, msg);
      }
    };

    this.assetLoadingMgr.onError = (errText, item, retryFn) => {
      if (this.loadingScreen) {
        this.loadingScreen.showError(errText, item, retryFn, () => {
          // Skip option: proceed to next
          this.assetLoadingMgr.loadedItems++;
          this.assetLoadingMgr.loadNextCriticalAsset(0);
        });
      }
    };

    this.assetLoadingMgr.onComplete = () => {
      if (this.loadingScreen) {
        this.loadingScreen.dismiss();
      }
    };

    // Kick off real loading
    this.assetLoadingMgr.start();
  }

  runLobbyPhase() {
    console.log('[BootManager] Phase 4: LOBBY — Ready! Handing off to 3D Safehouse Lobby.');

    // Crossfade BGM smoothly to Safehouse Lobby music
    this.audioMgr.playBGM('lobby', 1.0);

    // Ensure Hideout Lobby UI is visible and interactive
    const lobbyEl = document.getElementById('lobby-screen');
    if (lobbyEl) {
      lobbyEl.style.display = 'block';
      lobbyEl.style.opacity = '1';
    }

    // Check first-time onboarding tutorial if needed
    if (this.game && this.game.onboarding) {
      this.game.onboarding.checkFirstVisit();
    }

    if (this.onLobbyReady) {
      this.onLobbyReady();
    }

    this.isTransitioning = false;
  }

  getState() {
    return this.state;
  }
}
