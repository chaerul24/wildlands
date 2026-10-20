/**
 * LoadingScreen.js
 * Mobile RPG-Quality Loading Screen for Wildlands.
 * - Displays verifiable progress bar, real percentages, and active loading activities.
 * - Auto-rotating helpful gameplay tips carousel.
 * - Quick mute toggle and error retry dialog.
 * - Seamless fade-out into the 3D Safehouse Lobby.
 */

import { GAME_OPENING_CONFIG } from './GameOpeningConfig.js';
import { AudioManager } from './AudioManager.js';

export class LoadingScreen {
  constructor(container, onCompleteCallback) {
    this.container = container || document.body;
    this.onComplete = onCompleteCallback;
    this.audioMgr = AudioManager.getInstance();

    this.element = null;
    this.progressBar = null;
    this.pctLabel = null;
    this.statusLabel = null;
    this.tipLabel = null;
    this.retryModal = null;

    this.currentTipIdx = 0;
    this.tipTimer = null;
    this.isDismissed = false;

    this.createDOM();
    this.startTipsRotation();
  }

  createDOM() {
    let existing = document.getElementById('game-loading-screen');
    if (existing) {
      existing.remove();
    }

    this.element = document.createElement('div');
    this.element.id = 'game-loading-screen';
    this.element.className = 'cinematic-loading-overlay';
    this.element.style.display = 'flex';

    const tips = GAME_OPENING_CONFIG.loading.tips;
    const initialTip = tips[0] || 'Jelajahi lembah luas dan temukan rahasia kuno Wildlands.';

    this.element.innerHTML = `
      <!-- Backdrop with fantasy atmosphere -->
      <div class="loading-bg-layer"></div>
      <div class="loading-vignette-layer"></div>

      <!-- Header bar with Mute Button -->
      <header class="loading-top-bar">
        <div class="loading-realm-tag">
          <span class="realm-dot"></span>
          <span>Asia-SE Official Realm</span>
        </div>
        <button id="btn-loading-mute" class="loading-pill-btn" type="button" title="Mute Suara">
          <span class="mute-icon">${this.audioMgr.isMuted() ? '🔇' : '🔊'}</span>
          <span class="mute-text">${this.audioMgr.isMuted() ? 'Bisu' : 'Suara'}</span>
        </button>
      </header>

      <!-- Center Cinematic Card -->
      <main class="loading-center-card">
        <div class="loading-emblem-box">
          <span class="loading-emblem-icon">🌲</span>
          <h2 class="loading-card-title">MEMUAT DUNIA WILDLANDS</h2>
          <span class="loading-card-sub">Menyiapkan Alam Lembah & Safehouse</span>
        </div>

        <!-- Real Progress Bar -->
        <div class="loading-progress-wrap">
          <div class="loading-track">
            <div id="loading-bar-fill" class="loading-bar">
              <span class="loading-bar-glow"></span>
            </div>
          </div>
          <div class="loading-meta-row">
            <span id="loading-status-text" class="loading-status-msg">Menginisialisasi sistem...</span>
            <span id="loading-pct-text" class="loading-pct-num">0%</span>
          </div>
        </div>

        <!-- Rotating RPG Tips Carousel -->
        <div class="loading-tips-card">
          <div class="tips-header-row">
            <span class="tips-badge">💡 TIPS PETUALANGAN</span>
            <span class="tips-dot-anim"></span>
          </div>
          <p id="loading-tip-text" class="tips-content-text">${initialTip}</p>
        </div>
      </main>

      <!-- Error / Retry Dialog (Hidden by default) -->
      <div id="loading-retry-dialog" class="loading-error-modal" style="display: none;">
        <div class="error-modal-box">
          <span class="error-modal-icon">⚠️</span>
          <h3 class="error-modal-title">Gagal Memuat Aset</h3>
          <p id="loading-error-desc" class="error-modal-desc">Koneksi jaringan terputus saat mengambil berkas game.</p>
          <div class="error-actions-row">
            <button id="btn-loading-retry" class="btn-primary" type="button">🔄 Coba Lagi</button>
            <button id="btn-loading-skip-error" class="btn-secondary" type="button">Lanjut dengan Fallback</button>
          </div>
        </div>
      </div>
    `;

    this.container.appendChild(this.element);

    this.progressBar = this.element.querySelector('#loading-bar-fill');
    this.pctLabel = this.element.querySelector('#loading-pct-text');
    this.statusLabel = this.element.querySelector('#loading-status-text');
    this.tipLabel = this.element.querySelector('#loading-tip-text');
    this.retryModal = this.element.querySelector('#loading-retry-dialog');

    // Mute button listener
    const btnMute = this.element.querySelector('#btn-loading-mute');
    if (btnMute) {
      btnMute.addEventListener('click', () => {
        const isMuted = this.audioMgr.toggleMute();
        const icon = btnMute.querySelector('.mute-icon');
        const text = btnMute.querySelector('.mute-text');
        if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
        if (text) text.textContent = isMuted ? 'Bisu' : 'Suara';
        this.audioMgr.playSFX('btn_click');
      });
    }
  }

  updateProgress(pct, currentItem, statusMsg) {
    if (this.isDismissed) return;

    const clampedPct = Math.min(100, Math.max(0, Math.round(pct)));

    if (this.progressBar) {
      this.progressBar.style.width = `${clampedPct}%`;
    }
    if (this.pctLabel) {
      this.pctLabel.textContent = `${clampedPct}%`;
    }
    if (this.statusLabel && statusMsg) {
      this.statusLabel.textContent = statusMsg;
    }
  }

  showError(errMsg, item, retryFn, skipFn) {
    if (!this.retryModal) return;

    const desc = this.retryModal.querySelector('#loading-error-desc');
    if (desc) desc.textContent = errMsg;

    const btnRetry = this.retryModal.querySelector('#btn-loading-retry');
    const btnSkip = this.retryModal.querySelector('#btn-loading-skip-error');

    if (btnRetry) {
      btnRetry.onclick = () => {
        this.retryModal.style.display = 'none';
        if (retryFn) retryFn();
      };
    }

    if (btnSkip) {
      btnSkip.onclick = () => {
        this.retryModal.style.display = 'none';
        if (skipFn) skipFn();
      };
    }

    this.retryModal.style.display = 'flex';
  }

  startTipsRotation() {
    const tips = GAME_OPENING_CONFIG.loading.tips;
    if (!tips || tips.length <= 1) return;

    this.tipTimer = setInterval(() => {
      if (this.isDismissed || !this.tipLabel) return;

      this.currentTipIdx = (this.currentTipIdx + 1) % tips.length;
      this.tipLabel.style.opacity = '0';

      setTimeout(() => {
        if (!this.tipLabel) return;
        this.tipLabel.textContent = tips[this.currentTipIdx];
        this.tipLabel.style.opacity = '1';
      }, 250);
    }, GAME_OPENING_CONFIG.loading.tipRotationIntervalMs);
  }

  dismiss() {
    if (this.isDismissed) return;
    this.isDismissed = true;

    if (this.tipTimer) {
      clearInterval(this.tipTimer);
      this.tipTimer = null;
    }

    // Ensure 100% is displayed cleanly
    this.updateProgress(100, null, 'Dunia siap dijelajahi!');

    // Smooth fade out
    this.element.style.opacity = '0';
    this.element.style.pointerEvents = 'none';

    setTimeout(() => {
      this.element.style.display = 'none';
      if (this.onComplete) {
        this.onComplete();
      }
    }, GAME_OPENING_CONFIG.loading.fadeDurationMs);
  }

  destroy() {
    this.isDismissed = true;
    if (this.tipTimer) clearInterval(this.tipTimer);
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
  }
}
