/**
 * CombatAudio.js - Procedural Web Audio Sound Effects for Combat
 * Generates tactile sword swooshes, impact clangs, hurt reactions, and defeat sounds.
 */
export class CombatAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  ensureContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Sword Swing / Slash Whoosh
  playSwordSwing() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Pitch sweep downward
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(420, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.16);

      // Bandpass whoosh
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, t);
      filter.Q.setValueAtTime(2.5, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.35, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.17);
    } catch (_) {}
  }

  // Heavy Overhead Sword Cleave / Chop Whoosh (Attack 2)
  playHeavySwordSwing() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Deeper resonant pitch sweep
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, t);
      filter.Q.setValueAtTime(3.2, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.48, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.23);
    } catch (_) {}
  }

  // Shop Coin Purchase Sound
  playCoinBuy() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      [1400, 1850, 2200].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.04);
        gain.gain.setValueAtTime(0.18, t + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.04 + 0.12);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.04);
        osc.stop(t + idx * 0.04 + 0.13);
      });
    } catch (_) {}
  }

  // Melee Hit Impact (Sword striking enemy flesh/armor)
  playHitImpact() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      // 1. Transient noise burst
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.02));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(1400, t);
      noiseFilter.Q.setValueAtTime(3.0, t);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.45, t);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noise.start(t);

      // 2. Low impact body thud
      const thud = ctx.createOscillator();
      const thudGain = ctx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(180, t);
      thud.frequency.exponentialRampToValueAtTime(45, t + 0.12);

      thudGain.gain.setValueAtTime(0.5, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      thud.connect(thudGain);
      thudGain.connect(ctx.destination);
      thud.start(t);
      thud.stop(t + 0.13);
    } catch (_) {}
  }

  // Player takes damage
  playPlayerHurt() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.22);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.23);
    } catch (_) {}
  }

  // Alert Stinger when enemy detects player
  playAlert() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, t); // D5
      osc.frequency.setValueAtTime(880.00, t + 0.08); // A5

      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.29);
    } catch (_) {}
  }

  // Enemy Defeated Fanfare
  playEnemyDefeat() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const notes = [392.00, 523.25, 659.25, 783.99]; // G4, C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        gain.gain.setValueAtTime(0.001, t + idx * 0.08);
        gain.gain.linearRampToValueAtTime(0.25, t + idx * 0.08 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.08);
        osc.stop(t + idx * 0.08 + 0.36);
      });
    } catch (_) {}
  }

  // Loot Pickup (Sparkling chime)
  playLootPickup() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const pitches = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      pitches.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t + i * 0.05);

        gain.gain.setValueAtTime(0.001, t + i * 0.05);
        gain.gain.linearRampToValueAtTime(0.2, t + i * 0.05 + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + i * 0.05);
        osc.stop(t + i * 0.05 + 0.3);
      });
    } catch (_) {}
  }

  // Quest Accept (Inspiring horn chime)
  playQuestAccept() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const notes = [440.0, 554.37, 659.25]; // A4, C#5, E5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.09);

        gain.gain.setValueAtTime(0.001, t + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.22, t + idx * 0.09 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.09 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.09);
        osc.stop(t + idx * 0.09 + 0.42);
      });
    } catch (_) {}
  }

  // Quest Complete (Triumphant fanfare)
  playQuestComplete() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const chords = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      chords.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t + idx * 0.07);

        gain.gain.setValueAtTime(0.001, t + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.28, t + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.07 + 0.55);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + idx * 0.07);
        osc.stop(t + idx * 0.07 + 0.58);
      });
    } catch (_) {}
  }

  // Dodge / Roll (Low swoosh)
  playDodgeRoll() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(t);
      osc.stop(t + 0.23);
    } catch (_) {}
  }

  // Potion Drink (Gulp & sparkle)
  playPotionDrink() {
    if (this.isMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      // Gulp
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, t);
      osc.frequency.exponentialRampToValueAtTime(480, t + 0.12);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);

      // Sparkle
      [659.25, 880.0, 1174.66].forEach((f, i) => {
        const sOsc = ctx.createOscillator();
        const sGain = ctx.createGain();
        sOsc.type = 'sine';
        sOsc.frequency.setValueAtTime(f, t + 0.15 + i * 0.05);

        sGain.gain.setValueAtTime(0.001, t + 0.15 + i * 0.05);
        sGain.gain.linearRampToValueAtTime(0.18, t + 0.15 + i * 0.05 + 0.01);
        sGain.gain.exponentialRampToValueAtTime(0.001, t + 0.15 + i * 0.05 + 0.2);

        sOsc.connect(sGain);
        sGain.connect(ctx.destination);
        sOsc.start(t + 0.15 + i * 0.05);
        sOsc.stop(t + 0.15 + i * 0.05 + 0.21);
      });
    } catch (_) {}
  }
}
