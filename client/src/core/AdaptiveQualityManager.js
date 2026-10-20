/**
 * Adaptive Performance & Quality Controller for Wildlands:
 * - Monitors moving average frame time over rolling 60 frames using performance.now().
 * - Prevents rapid oscillating changes using hysteresis and cooldown timers.
 * - Supports automatic downgrading if sustained frame drops occur on mobile devices.
 * - Provides clean manual override (Low, Medium, High).
 */
export class AdaptiveQualityManager {
  constructor(game, options = {}) {
    this.game = game;
    this.enabled = options.autoAdaptive ?? true;

    // Moving average metrics
    this.frameTimes = new Float32Array(60);
    this.frameIndex = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();

    this.avgFps = 60;
    this.avgFrameTimeMs = 16.6;

    // Stability & Cooldown
    this.cooldownTimer = 6.0; // Wait 6 seconds before first adaptation
    this.lowFpsDuration = 0.0;
    this.highFpsDuration = 0.0;

    // Target boundaries
    this.TARGET_LOW_FPS = 27.0; // Threshold below which quality is lowered
    this.TARGET_HIGH_FPS = 56.0; // Threshold above which quality can be restored
    this.SUSTAINED_TIME = 4.0; // Must be sustained for 4 seconds before stepping

    this.tiers = ['low', 'medium', 'high'];
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    if (!this.enabled) {
      this.lowFpsDuration = 0;
      this.highFpsDuration = 0;
    }
  }

  update(dt) {
    const now = performance.now();
    const frameMs = Math.max(1, Math.min(100, now - this.lastTime));
    this.lastTime = now;

    // Record into ring buffer
    this.frameTimes[this.frameIndex] = frameMs;
    this.frameIndex = (this.frameIndex + 1) % 60;
    if (this.frameCount < 60) this.frameCount++;

    // Calculate moving average
    let sum = 0;
    for (let i = 0; i < this.frameCount; i++) {
      sum += this.frameTimes[i];
    }
    this.avgFrameTimeMs = sum / this.frameCount;
    this.avgFps = 1000 / this.avgFrameTimeMs;

    if (!this.enabled || !this.game || !this.game.isRunning || this.game.isPaused) {
      return;
    }

    // Cooldown check
    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
      return;
    }

    const currentPreset = this.game.qualityPreset || 'medium';
    const currentTierIdx = this.tiers.indexOf(currentPreset);

    // 1. Sustained Low FPS Check -> Step Down
    if (this.avgFps < this.TARGET_LOW_FPS) {
      this.lowFpsDuration += dt;
      this.highFpsDuration = 0;

      if (this.lowFpsDuration >= this.SUSTAINED_TIME) {
        if (currentTierIdx > 0) {
          const newTier = this.tiers[currentTierIdx - 1];
          console.warn(`[AdaptiveQuality] Sustained ${this.avgFps.toFixed(1)} FPS detected. Stepping down to '${newTier}' preset.`);
          this.game.setQuality(newTier);
          if (this.game.ui && this.game.ui.showToast) {
            this.game.ui.showToast(`Grafik dioptimalkan otomatis ke ${newTier.toUpperCase()} untuk kelancaran game.`, 'info');
          }
        }
        this.lowFpsDuration = 0;
        this.cooldownTimer = 8.0; // Cooldown to stabilize
      }
    }
    // 2. Sustained High FPS Check -> Optional Step Up
    else if (this.avgFps > this.TARGET_HIGH_FPS) {
      this.highFpsDuration += dt;
      this.lowFpsDuration = 0;

      if (this.highFpsDuration >= 12.0) { // Require 12s of solid 60 FPS before stepping up
        if (currentTierIdx < this.tiers.length - 1) {
          const newTier = this.tiers[currentTierIdx + 1];
          console.log(`[AdaptiveQuality] Sustained ${this.avgFps.toFixed(1)} FPS detected. Elevating to '${newTier}' preset.`);
          this.game.setQuality(newTier);
        }
        this.highFpsDuration = 0;
        this.cooldownTimer = 10.0;
      }
    } else {
      this.lowFpsDuration = Math.max(0, this.lowFpsDuration - dt * 0.5);
      this.highFpsDuration = Math.max(0, this.highFpsDuration - dt * 0.5);
    }
  }

  getMetrics() {
    return {
      fps: Math.round(this.avgFps),
      frameTimeMs: parseFloat(this.avgFrameTimeMs.toFixed(1)),
      preset: this.game ? this.game.qualityPreset : 'medium',
      isAuto: this.enabled
    };
  }
}
