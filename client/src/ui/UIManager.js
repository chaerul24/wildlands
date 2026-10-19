export class UIManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks; // { onStart, onResume, onQualityChange, onSensitivityChange, onLeave }

    // DOM Elements
    this.startScreen = document.getElementById('start-screen');
    this.nameInput = document.getElementById('player-name-input');
    this.btnPlay = document.getElementById('btn-play');
    this.presetSelect = document.getElementById('preset-select');

    // Fullscreen buttons
    this.btnFullscreenStart = document.getElementById('btn-fullscreen-start');
    this.btnFullscreenHud = document.getElementById('btn-fullscreen-hud');
    this.btnFullscreenPause = document.getElementById('btn-fullscreen-pause');

    this.hud = document.getElementById('hud');
    this.statusDot = document.getElementById('status-dot');
    this.statusText = document.getElementById('status-text');
    this.pingText = document.getElementById('ping-text');
    this.coordsText = document.getElementById('coords-text');

    this.mobileControls = document.getElementById('mobile-controls');
    this.orientationOverlay = document.getElementById('orientation-overlay');

    this.tabList = document.getElementById('tab-player-list');
    this.tabPlayersContainer = document.getElementById('tab-players-container');
    this.tabCountText = document.getElementById('tab-count-text');

    this.pauseModal = document.getElementById('pause-modal');
    this.btnResume = document.getElementById('btn-resume');
    this.btnLeave = document.getElementById('btn-leave');
    this.sliderSensitivity = document.getElementById('slider-sensitivity');
    this.selectPauseQuality = document.getElementById('pause-quality-select');

    this.toastContainer = document.getElementById('toast-container');

    this.isGameActive = false;
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    this.initEvents();
    this.initFullscreen();
    this.initOrientationListener();
  }

  initEvents() {
    // Generate default random explorer name
    if (this.nameInput && !this.nameInput.value) {
      this.nameInput.value = `Explorer_${Math.floor(100 + Math.random() * 900)}`;
    }

    if (this.nameInput) {
      this.nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.btnPlay.click();
        }
      });
    }

    if (this.btnPlay) {
      this.btnPlay.addEventListener('click', () => {
        if (document.activeElement && document.activeElement.blur) {
          document.activeElement.blur();
        }
        const name = this.nameInput.value.trim() || 'Explorer';
        const quality = this.presetSelect.value;
        this.hideStartScreen();
        this.isGameActive = true;
        this.updateMobileControlsVisibility();

        if (this.callbacks.onStart) {
          this.callbacks.onStart({ name, quality });
        }
      });
    }

    if (this.btnResume) {
      this.btnResume.addEventListener('click', () => {
        this.hidePauseMenu();
        if (this.callbacks.onResume) {
          this.callbacks.onResume();
        }
      });
    }

    if (this.btnLeave) {
      this.btnLeave.addEventListener('click', () => {
        this.isGameActive = false;
        this.updateMobileControlsVisibility();
        if (this.callbacks.onLeave) {
          this.callbacks.onLeave();
        }
      });
    }

    if (this.sliderSensitivity) {
      this.sliderSensitivity.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (this.callbacks.onSensitivityChange) {
          this.callbacks.onSensitivityChange(val);
        }
      });
    }

    if (this.selectPauseQuality) {
      this.selectPauseQuality.addEventListener('change', (e) => {
        const quality = e.target.value;
        if (this.callbacks.onQualityChange) {
          this.callbacks.onQualityChange(quality);
        }
      });
    }
  }

  // --- FULLSCREEN LOGIC ---
  initFullscreen() {
    const handleFsToggle = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.toggleFullscreen();
    };

    if (this.btnFullscreenStart) this.btnFullscreenStart.addEventListener('click', handleFsToggle);
    if (this.btnFullscreenHud) this.btnFullscreenHud.addEventListener('click', handleFsToggle);
    if (this.btnFullscreenPause) this.btnFullscreenPause.addEventListener('click', handleFsToggle);

    // Listen to fullscreen changes across browsers
    const onFsChange = () => {
      this.updateFullscreenUI();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    document.addEventListener('mozfullscreenchange', onFsChange);
    document.addEventListener('MSFullscreenChange', onFsChange);

    this.updateFullscreenUI();
  }

  isFullscreen() {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  toggleFullscreen() {
    if (!this.isFullscreen()) {
      const docEl = document.documentElement;
      const requestFs = docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (requestFs) {
        requestFs.call(docEl).then(() => {
          // If supported and permissible, request landscape lock
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {
              // Silently catch unsupported devices/browsers
            });
          }
        }).catch((err) => {
          console.warn('Fullscreen request failed:', err);
        });
      }
    } else {
      const exitFs = document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;

      if (exitFs) {
        exitFs.call(document).catch((err) => {
          console.warn('Exit fullscreen failed:', err);
        });
      }
    }
  }

  updateFullscreenUI() {
    const isFs = this.isFullscreen();
    const buttons = [this.btnFullscreenStart, this.btnFullscreenHud, this.btnFullscreenPause];

    for (const btn of buttons) {
      if (!btn) continue;
      const enterIcon = btn.querySelector('.fs-icon-enter');
      const exitIcon = btn.querySelector('.fs-icon-exit');
      const textSpan = btn.querySelector('.fs-text');

      if (enterIcon) enterIcon.style.display = isFs ? 'none' : 'block';
      if (exitIcon) exitIcon.style.display = isFs ? 'block' : 'none';
      if (textSpan) textSpan.textContent = isFs ? 'Keluar Layar Penuh' : 'Layar Penuh (Fullscreen)';
    }
  }

  // --- ORIENTATION LISTENER ---
  initOrientationListener() {
    this.orientationDismissed = false;
    const btnDismiss = document.getElementById('btn-dismiss-orientation');
    if (btnDismiss) {
      btnDismiss.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.orientationDismissed = true;
        if (this.orientationOverlay) this.orientationOverlay.classList.remove('active');
        this.updateMobileControlsVisibility();
      });
    }

    const checkOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;

      // Reset dismissed state once rotated to landscape
      if (!isPortrait) {
        this.orientationDismissed = false;
      }

      if (this.orientationDismissed) {
        if (this.orientationOverlay) this.orientationOverlay.classList.remove('active');
        this.updateMobileControlsVisibility();
        return;
      }

      // Only display prompt on actual mobile phone/tablet devices in portrait orientation
      const isMobileDevice = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
        (this.isTouchDevice && width <= 600 && isPortrait);

      const shouldPrompt = isPortrait && isMobileDevice;

      if (this.orientationOverlay) {
        if (shouldPrompt) {
          this.orientationOverlay.classList.add('active');
          if (this.mobileControls) this.mobileControls.style.display = 'none';
        } else {
          this.orientationOverlay.classList.remove('active');
          this.updateMobileControlsVisibility();
        }
      }
    };

    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    if (screen.orientation && screen.orientation.addEventListener) {
      screen.orientation.addEventListener('change', checkOrientation);
    }

    checkOrientation();
  }

  updateMobileControlsVisibility() {
    if (!this.mobileControls) return;
    const isPortrait = window.innerHeight > window.innerWidth;
    const shouldShow = this.isTouchDevice && this.isGameActive && !isPortrait;

    if (shouldShow) {
      this.mobileControls.classList.add('visible');
      this.mobileControls.style.display = 'block';
    } else {
      this.mobileControls.classList.remove('visible');
      this.mobileControls.style.display = 'none';
    }
  }

  hideStartScreen() {
    if (this.startScreen) {
      this.startScreen.classList.add('hidden');
    }
  }

  showStartScreen() {
    if (this.startScreen) {
      this.startScreen.classList.remove('hidden');
    }
    this.hidePauseMenu();
    this.isGameActive = false;
    this.updateMobileControlsVisibility();
  }

  togglePauseMenu(show) {
    if (show) {
      this.pauseModal.classList.add('visible');
      if (this.mobileControls) this.mobileControls.style.display = 'none';
    } else {
      this.pauseModal.classList.remove('visible');
      this.updateMobileControlsVisibility();
    }
  }

  hidePauseMenu() {
    this.pauseModal.classList.remove('visible');
    this.updateMobileControlsVisibility();
  }

  toggleTabPlayerList(show, networkStatus) {
    if (show) {
      this.tabList.classList.add('visible');
      this.renderPlayerList(networkStatus);
    } else {
      this.tabList.classList.remove('visible');
    }
  }

  renderPlayerList(status) {
    if (!status || !this.tabPlayersContainer) return;
    this.tabCountText.textContent = `${status.onlineCount || 1} Online`;
    this.tabPlayersContainer.innerHTML = '';

    // Self item
    const selfItem = document.createElement('div');
    selfItem.className = 'player-item';
    selfItem.innerHTML = `
      <div class="player-name-wrap">
        <div class="player-color-dot" style="background-color: #34d399"></div>
        <span>You (Local)</span>
      </div>
      <span style="color: #94a3b8; font-size: 12px">${status.ping || 0} ms</span>
    `;
    this.tabPlayersContainer.appendChild(selfItem);

    if (status.players) {
      for (const p of status.players) {
        const item = document.createElement('div');
        item.className = 'player-item';
        item.innerHTML = `
          <div class="player-name-wrap">
            <div class="player-color-dot" style="background-color: ${p.color || '#60a5fa'}"></div>
            <span>${p.name}</span>
          </div>
          <span style="color: #94a3b8; font-size: 12px">Active</span>
        `;
        this.tabPlayersContainer.appendChild(item);
      }
    }
  }

  updateHUD(netStatus, coords) {
    if (netStatus) {
      if (netStatus.connected) {
        this.statusDot.classList.add('online');
        this.statusText.textContent = `${netStatus.onlineCount} Online`;
        this.pingText.textContent = `${netStatus.ping} ms`;
      } else {
        this.statusDot.classList.remove('online');
        this.statusText.textContent = 'Connecting...';
        this.pingText.textContent = '-- ms';
      }
    }

    if (coords && this.coordsText) {
      this.coordsText.textContent = `X: ${coords.x.toFixed(0)}  Y: ${coords.y.toFixed(0)}  Z: ${coords.z.toFixed(0)}`;
    }
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'warning') toast.style.borderLeftColor = '#f59e0b';
    if (type === 'error') toast.style.borderLeftColor = '#ef4444';
    toast.textContent = message;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }
}
