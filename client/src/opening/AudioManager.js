/**
 * AudioManager.js
 * Centralized, High-Fidelity Audio Architecture for Wildlands 3D RPG.
 * - Handles BGM transitions, smooth crossfading, SFX channels.
 * - Manages Master, BGM, and SFX volumes with localStorage persistence.
 * - Complies with Android / Mobile Web autoplay policies (unlock on first user gesture).
 * - Procedural Web Audio API synthesizer fallback for rich fantasy chord pads.
 * - Responds to window visibilitychange and tab switching gracefully.
 */

import { GAME_OPENING_CONFIG } from './GameOpeningConfig.js';

export class AudioManager {
  static instance = null;

  static getInstance() {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  constructor() {
    if (AudioManager.instance) {
      return AudioManager.instance;
    }
    AudioManager.instance = this;

    // Load persisted settings
    this.config = this.loadConfig();

    // Audio Context & Nodes
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.sfxGain = null;

    // State
    this.isUnlocked = false;
    this.currentTrackKey = null;
    this.currentAudioEl = null;
    this.proceduralOscs = [];
    this.proceduralGain = null;

    // Sound effects cache
    this.sfxCache = new Map();

    // Listeners for mobile/browser autoplay unlock
    this.setupUnlockListeners();

    // Visibility change listener
    this.setupVisibilityListener();
  }

  loadConfig() {
    const defaults = GAME_OPENING_CONFIG.audio.defaults;
    if (typeof localStorage === 'undefined') return { ...defaults };
    try {
      const saved = localStorage.getItem(GAME_OPENING_CONFIG.audio.storageKey);
      if (saved) {
        return { ...defaults, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return { ...defaults };
  }

  saveConfig() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(GAME_OPENING_CONFIG.audio.storageKey, JSON.stringify({
        masterVolume: this.config.masterVolume,
        bgmVolume: this.config.bgmVolume,
        sfxVolume: this.config.sfxVolume,
        isMuted: this.config.isMuted
      }));
    } catch (_) {}
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);

        // BGM Gain
        this.bgmGain = this.ctx.createGain();
        this.bgmGain.connect(this.masterGain);

        // SFX Gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.connect(this.masterGain);

        this.applyVolumes();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended' && this.isUnlocked) {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  setupUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      this.unlockAudio();
      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('touchstart', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { passive: true });
    window.addEventListener('keydown', unlockHandler, { passive: true });
    window.addEventListener('touchstart', unlockHandler, { passive: true });
  }

  setupVisibilityListener() {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Lower or pause audio when tab is backgrounded
        if (this.masterGain && this.ctx) {
          try {
            this.masterGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
          } catch (_) {}
        }
        if (this.currentAudioEl) {
          this.currentAudioEl.pause();
        }
      } else {
        // Restore volume when returning to tab
        if (this.ctx && this.masterGain) {
          try {
            const targetVol = this.config.isMuted ? 0 : this.config.masterVolume;
            this.masterGain.gain.setValueAtTime(targetVol, this.ctx.currentTime);
          } catch (_) {}
        }
        if (this.currentAudioEl && !this.config.isMuted) {
          this.currentAudioEl.play().catch(() => {});
        }
      }
    });
  }

  unlockAudio() {
    if (this.isUnlocked) return;
    this.isUnlocked = true;

    this.ensureContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    // If a track was queued before unlock, trigger playback now
    if (this.currentTrackKey) {
      const key = this.currentTrackKey;
      this.currentTrackKey = null;
      this.playBGM(key, 0.8);
    }
  }

  applyVolumes() {
    const isMuted = this.config.isMuted;
    const master = isMuted ? 0 : this.config.masterVolume;
    const bgm = isMuted ? 0 : this.config.bgmVolume;
    const sfx = isMuted ? 0 : this.config.sfxVolume;

    if (this.ctx) {
      const now = this.ctx.currentTime;
      if (this.masterGain) this.masterGain.gain.setValueAtTime(master, now);
      if (this.bgmGain) this.bgmGain.gain.setValueAtTime(bgm, now);
      if (this.sfxGain) this.sfxGain.gain.setValueAtTime(sfx, now);
    }

    if (this.currentAudioEl) {
      this.currentAudioEl.volume = master * bgm;
    }
  }

  // --- VOLUME CONTROLS ---
  setMasterVolume(val) {
    this.config.masterVolume = Math.max(0, Math.min(1, val));
    this.applyVolumes();
    this.saveConfig();
  }

  setBGMVolume(val) {
    this.config.bgmVolume = Math.max(0, Math.min(1, val));
    this.applyVolumes();
    this.saveConfig();
  }

  setSFXVolume(val) {
    this.config.sfxVolume = Math.max(0, Math.min(1, val));
    this.applyVolumes();
    this.saveConfig();
  }

  toggleMute() {
    this.config.isMuted = !this.config.isMuted;
    this.applyVolumes();
    this.saveConfig();
    return this.config.isMuted;
  }

  isMuted() {
    return this.config.isMuted;
  }

  // --- BACKGROUND MUSIC MANAGEMENT ---
  playBGM(trackKey, fadeDurationSec = 0.8) {
    if (this.currentTrackKey === trackKey && (this.currentAudioEl || this.proceduralOscs.length > 0)) {
      return; // Already playing this track, prevent restarting
    }

    const prevAudio = this.currentAudioEl;
    this.currentTrackKey = trackKey;

    const trackPath = GAME_OPENING_CONFIG.audio.bgmTracks[trackKey];

    // 1. Fade out previous audio element if playing
    if (prevAudio) {
      this.fadeOutElement(prevAudio, fadeDurationSec * 1000);
      this.currentAudioEl = null;
    }

    // Stop procedural synth if active
    this.stopProceduralBGM(fadeDurationSec);

    // If audio is locked, queue track until user interaction
    if (!this.isUnlocked) {
      return;
    }

    // 2. Attempt HTML5 Audio element playback from local track
    if (trackPath && typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(trackPath);
        audio.loop = true;
        const targetVol = this.config.isMuted ? 0 : (this.config.masterVolume * this.config.bgmVolume);
        audio.volume = 0;

        audio.play().then(() => {
          this.currentAudioEl = audio;
          this.fadeInElement(audio, targetVol, fadeDurationSec * 1000);
        }).catch(() => {
          // Fallback to procedural synth if file cannot be loaded or played
          this.playProceduralBGM(trackKey, fadeDurationSec);
        });
        return;
      } catch (_) {
        this.playProceduralBGM(trackKey, fadeDurationSec);
      }
    } else {
      this.playProceduralBGM(trackKey, fadeDurationSec);
    }
  }

  stopBGM(fadeDurationSec = 0.6) {
    this.currentTrackKey = null;
    if (this.currentAudioEl) {
      this.fadeOutElement(this.currentAudioEl, fadeDurationSec * 1000);
      this.currentAudioEl = null;
    }
    this.stopProceduralBGM(fadeDurationSec);
  }

  fadeInElement(audio, targetVol, durationMs) {
    const steps = 16;
    const interval = durationMs / steps;
    const volStep = targetVol / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      if (!audio || audio.paused || step >= steps) {
        clearInterval(timer);
        if (audio) audio.volume = targetVol;
        return;
      }
      audio.volume = Math.min(targetVol, volStep * step);
    }, interval);
  }

  fadeOutElement(audio, durationMs) {
    const steps = 12;
    const interval = durationMs / steps;
    const initialVol = audio.volume;
    const volStep = initialVol / steps;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      if (!audio || step >= steps) {
        clearInterval(timer);
        if (audio) {
          audio.pause();
          audio.currentTime = 0;
        }
        return;
      }
      audio.volume = Math.max(0, initialVol - volStep * step);
    }, interval);
  }

  // --- PROCEDURAL FANTASY AMBIENCE SYNTHESIZER ---
  playProceduralBGM(trackKey, fadeDurationSec = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopProceduralBGM(0.3);

    try {
      const now = ctx.currentTime;
      this.proceduralGain = ctx.createGain();
      const targetVol = this.config.isMuted ? 0 : (this.config.masterVolume * this.config.bgmVolume * 0.45);

      this.proceduralGain.gain.setValueAtTime(0.001, now);
      this.proceduralGain.gain.linearRampToValueAtTime(targetVol, now + fadeDurationSec);
      this.proceduralGain.connect(this.bgmGain || ctx.destination);

      // Chords based on track mood
      let frequencies = [73.42, 110.00, 146.83, 220.00]; // Default D minor ambient
      if (trackKey === 'splash') {
        frequencies = [73.42, 110.00, 146.83, 174.61, 220.00, 261.63]; // Swelling majestic D minor 7
      } else if (trackKey === 'loading') {
        frequencies = [98.00, 146.83, 196.00, 233.08]; // Mysterious G minor
      } else if (trackKey === 'lobby') {
        frequencies = [146.83, 174.61, 220.00, 261.63, 329.63]; // Peaceful campfire Dm9
      }

      this.proceduralOscs = frequencies.map((freq, idx) => {
        const osc = ctx.createOscillator();
        const pGain = ctx.createGain();

        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);

        // Subtle detune for rich choral warmth
        osc.detune.setValueAtTime((idx - 2) * 4.5, now);

        pGain.gain.setValueAtTime(0.22 / (idx + 1), now);
        osc.connect(pGain);
        pGain.connect(this.proceduralGain);

        osc.start(now);
        return osc;
      });
    } catch (_) {}
  }

  stopProceduralBGM(fadeDurationSec = 0.5) {
    if (this.proceduralGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.proceduralGain.gain.linearRampToValueAtTime(0.001, now + fadeDurationSec);
        const oscs = this.proceduralOscs;
        this.proceduralOscs = [];
        setTimeout(() => {
          oscs.forEach(o => {
            try { o.stop(); o.disconnect(); } catch (_) {}
          });
        }, fadeDurationSec * 1000 + 50);
      } catch (_) {}
    }
  }

  // --- SOUND EFFECTS (SFX) ---
  playSFX(sfxKey, volumeScale = 1.0) {
    if (this.config.isMuted) return;

    const sfxPath = GAME_OPENING_CONFIG.audio.sfxClips[sfxKey];
    if (sfxPath && typeof Audio !== 'undefined') {
      try {
        if (!this.sfxCache.has(sfxKey)) {
          this.sfxCache.set(sfxKey, new Audio(sfxPath));
        }
        const audio = this.sfxCache.get(sfxKey).cloneNode();
        audio.volume = Math.max(0, Math.min(1, this.config.masterVolume * this.config.sfxVolume * volumeScale));
        audio.play().catch(() => {});
        return;
      } catch (_) {}
    }

    // Web Audio fallback for UI click
    if (sfxKey === 'btn_click') {
      this.synthesizeClick();
    }
  }

  synthesizeClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.05);

      gain.gain.setValueAtTime(this.config.masterVolume * this.config.sfxVolume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.sfxGain || ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (_) {}
  }
}
