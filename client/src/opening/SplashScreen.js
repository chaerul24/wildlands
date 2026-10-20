/**
 * SplashScreen.js
 * Cinematic, High-Fidelity Medieval Fantasy Opening Splash Screen for Wildlands.
 * - Central stylized WILDLANDS branding with glowing emerald runes and gold crest.
 * - Ambient lightweight ember/particle canvas.
 * - Mobile-friendly "Tap to Start / Mulai Petualangan" button for Web Audio API unlock.
 * - Responsive landscape/portrait layouts with smooth CSS opacity transitions.
 */

import { GAME_OPENING_CONFIG } from './GameOpeningConfig.js';
import { AudioManager } from './AudioManager.js';

export class SplashScreen {
  constructor(container, onEnterCallback) {
    this.container = container || document.body;
    this.onEnter = onEnterCallback;
    this.audioMgr = AudioManager.getInstance();

    this.element = null;
    this.particleCanvas = null;
    this.particleCtx = null;
    this.particles = [];
    this.animFrameId = null;
    this.isDismissed = false;

    this.createDOM();
    this.initParticles();
    this.bindEvents();
  }

  createDOM() {
    let existing = document.getElementById('game-splash-screen');
    if (existing) {
      existing.remove();
    }

    this.element = document.createElement('div');
    this.element.id = 'game-splash-screen';
    this.element.className = 'cinematic-splash-overlay';

    const cfg = GAME_OPENING_CONFIG.splash;

    this.element.innerHTML = `
      <!-- Ambient Particle Canvas -->
      <canvas id="splash-particle-canvas" class="splash-particles-canvas"></canvas>

      <!-- Background Fantasy Silhouette Layer -->
      <div class="splash-backdrop-gradient"></div>
      <div class="splash-fantasy-silhouette"></div>

      <!-- Top Right Controls: Skip & Audio -->
      <header class="splash-top-bar">
        <button id="btn-splash-audio" class="splash-pill-btn" type="button" title="Toggle Suara">
          <span class="audio-icon">${this.audioMgr.isMuted() ? '🔇' : '🔊'}</span>
          <span class="audio-label">${this.audioMgr.isMuted() ? 'MUTE' : 'AUDIO ON'}</span>
        </button>
        ${cfg.canSkip ? `
          <button id="btn-splash-skip" class="splash-pill-btn skip" type="button" title="Lewati Animasi">
            <span>Lewati ⏩</span>
          </button>
        ` : ''}
      </header>

      <!-- Central Cinematic Hero Content -->
      <main class="splash-hero-container">
        <!-- Medieval Crest & Rune Emblem -->
        <div class="splash-crest-wrap">
          <div class="splash-emblem-ring"></div>
          <span class="splash-crest-icon">🌲</span>
        </div>

        <!-- Main Title & Logo -->
        <h1 class="splash-game-title">${cfg.title}</h1>
        
        <!-- Tagline & Subtitle -->
        <div class="splash-divider-row">
          <span class="divider-line"></span>
          <span class="divider-gem">⚔️</span>
          <span class="divider-line"></span>
        </div>
        <p class="splash-tagline">${cfg.tagline}</p>
        <span class="splash-subtitle-badge">${cfg.subtitle}</span>

        <!-- Tap to Start / Enter Button -->
        <div class="splash-action-row">
          <button id="btn-splash-enter" class="btn-splash-cta" type="button" autofocus>
            <span class="cta-glow"></span>
            <span class="cta-icon">⚔️</span>
            <span class="cta-text">MULAI PETUALANGAN</span>
            <span class="cta-shortcut">[ENTER]</span>
          </button>
        </div>

        <!-- Version & Realm info -->
        <footer class="splash-footer-info">
          <span class="realm-pill">🟢 Online</span>
          <span>${cfg.versionBadge}</span>
        </footer>
      </main>
    `;

    this.container.appendChild(this.element);
    this.particleCanvas = this.element.querySelector('#splash-particle-canvas');
  }

  initParticles() {
    if (!this.particleCanvas) return;
    this.particleCtx = this.particleCanvas.getContext('2d');
    this.resizeCanvas();

    window.addEventListener('resize', () => this.resizeCanvas());

    // Generate ~35 floating magical forest embers
    this.particles = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * (this.particleCanvas.width || 800),
        y: Math.random() * (this.particleCanvas.height || 600),
        radius: Math.random() * 2.2 + 0.8,
        speedY: Math.random() * 0.45 + 0.25,
        speedX: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        alphaSpeed: (Math.random() - 0.5) * 0.015,
        color: Math.random() > 0.4 ? '52, 211, 153' : '245, 158, 11' // Emerald & Amber embers
      });
    }

    this.renderParticles();
  }

  resizeCanvas() {
    if (!this.particleCanvas) return;
    this.particleCanvas.width = window.innerWidth;
    this.particleCanvas.height = window.innerHeight;
  }

  renderParticles() {
    if (this.isDismissed || !this.particleCtx || !this.particleCanvas) return;

    const ctx = this.particleCtx;
    const w = this.particleCanvas.width;
    const h = this.particleCanvas.height;

    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.y -= p.speedY;
      p.x += p.speedX;
      p.alpha += p.alphaSpeed;

      if (p.alpha <= 0.1 || p.alpha >= 0.85) {
        p.alphaSpeed = -p.alphaSpeed;
      }

      // Wrap around top
      if (p.y < -10) {
        p.y = h + 10;
        p.x = Math.random() * w;
      }
      if (p.x < -10) p.x = w + 10;
      if (p.x > w + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.color}, ${Math.max(0, Math.min(1, p.alpha))})`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `rgba(${p.color}, 0.8)`;
      ctx.fill();
    }

    this.animFrameId = requestAnimationFrame(() => this.renderParticles());
  }

  bindEvents() {
    const btnEnter = this.element.querySelector('#btn-splash-enter');
    const btnSkip = this.element.querySelector('#btn-splash-skip');
    const btnAudio = this.element.querySelector('#btn-splash-audio');

    if (btnEnter) {
      btnEnter.addEventListener('click', () => this.dismiss());
    }

    if (btnSkip) {
      btnSkip.addEventListener('click', () => this.dismiss());
    }

    if (btnAudio) {
      btnAudio.addEventListener('click', () => {
        const isMuted = this.audioMgr.toggleMute();
        const icon = btnAudio.querySelector('.audio-icon');
        const label = btnAudio.querySelector('.audio-label');
        if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
        if (label) label.textContent = isMuted ? 'MUTE' : 'AUDIO ON';
        this.audioMgr.playSFX('btn_click');
      });
    }

    // Keyboard support: Enter / Space triggers start
    this.keyListener = (e) => {
      if (this.isDismissed) return;
      if (e.key === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.dismiss();
      }
    };
    window.addEventListener('keydown', this.keyListener);
  }

  dismiss() {
    if (this.isDismissed) return;
    this.isDismissed = true;

    // 1. Unlock audio on first explicit interaction
    this.audioMgr.unlockAudio();
    this.audioMgr.playSFX('btn_click');

    // Remove key listener
    if (this.keyListener) {
      window.removeEventListener('keydown', this.keyListener);
    }

    // Stop particle animation
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // 2. Smooth fade out
    this.element.style.opacity = '0';
    this.element.style.pointerEvents = 'none';

    setTimeout(() => {
      this.element.style.display = 'none';
      if (this.onEnter) {
        this.onEnter();
      }
    }, GAME_OPENING_CONFIG.splash.fadeDurationMs);
  }

  destroy() {
    this.isDismissed = true;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.keyListener) window.removeEventListener('keydown', this.keyListener);
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}
