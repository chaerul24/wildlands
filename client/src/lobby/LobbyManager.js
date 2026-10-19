import { LobbyData } from './LobbyData.js';
import { WorldPage } from './WorldPage.js';
import { EventPage } from './EventPage.js';
import { MissionPage } from './MissionPage.js';
import { NewsPage } from './NewsPage.js';
import { FriendsPage } from './FriendsPage.js';
import { ProfilePage } from './ProfilePage.js';
import { SettingsPage } from './SettingsPage.js';
import { HideoutAudio } from './HideoutAudio.js';

/**
 * LobbyManager - Main UI Controller for the 3D Hideout Game Lobby
 * Manages top navigation, HUD widgets, modal dialog overlay, and seamless gameplay transitions.
 */
export class LobbyManager {
  constructor(callbacks = {}) {
    this.callbacks = callbacks; // { onStartWorld, onApplyQuality, onApplySensitivity, onReturnToLobby }
    this.data = new LobbyData();
    this.audio = new HideoutAudio();

    // Pages for modal overlay
    this.pages = {
      world: new WorldPage(this),
      events: new EventPage(this),
      missions: new MissionPage(this),
      news: new NewsPage(this),
      friends: new FriendsPage(this),
      profile: new ProfilePage(this),
      settings: new SettingsPage(this)
    };

    this.currentTab = 'home';
    this.isInWorld = false;

    // DOM Elements
    this.lobbyScreen = document.getElementById('lobby-screen');
    this.modalOverlay = document.getElementById('hideout-modal-overlay');
    this.tabContainer = document.getElementById('lobby-tab-container');
    this.toastContainer = document.getElementById('toast-container');

    this.initDOM();
    this.initKeyboardShortcuts();
  }

  initDOM() {
    this.updateLobbyPlayerCard();
    this.updateBadges();
    this.updateQuickHUD();

    // Top Bar navigation listeners
    const navItems = document.querySelectorAll('.top-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Delegated links for buttons with data-tab across HUD
    document.addEventListener('click', (e) => {
      const linkEl = e.target.closest('[data-tab]');
      if (linkEl && !linkEl.classList.contains('top-nav-item')) {
        const tab = linkEl.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      }
    });

    // Modal Close Button
    const btnCloseModal = document.getElementById('btn-close-modal');
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        this.switchTab('home');
      });
    }

    // Click outside modal box to close
    if (this.modalOverlay) {
      this.modalOverlay.addEventListener('click', (e) => {
        if (e.target === this.modalOverlay) {
          this.switchTab('home');
        }
      });
    }

    // Enter World Play Buttons (Both in Left Panel and sidebar)
    const btnPlayLeft = document.getElementById('btn-sidebar-play');
    if (btnPlayLeft) {
      btnPlayLeft.addEventListener('click', () => {
        this.enterWorld();
      });
    }

    // Ambience Audio Toggle Button
    const btnAmbience = document.getElementById('btn-toggle-ambience');
    if (btnAmbience) {
      btnAmbience.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        const textSpan = btnAmbience.querySelector('.ambience-text');
        const iconSpan = btnAmbience.querySelector('.ambience-icon');
        if (textSpan) textSpan.textContent = isMuted ? 'Ambience: OFF' : 'Ambience: ON';
        if (iconSpan) iconSpan.textContent = isMuted ? '🔇' : '🔊';
        this.showToast(isMuted ? 'Audio ambience dimatikan' : 'Audio ambience diaktifkan', 'info');
      });
    }

    // Fullscreen buttons
    const btnFsSidebar = document.getElementById('btn-sidebar-fullscreen');
    if (btnFsSidebar) {
      btnFsSidebar.addEventListener('click', () => {
        this.toggleFullscreen();
      });
    }

    // Return to Lobby from HUD or Pause modal
    const btnReturnHUD = document.getElementById('btn-hud-lobby');
    const btnReturnPause = document.getElementById('btn-leave');
    if (btnReturnHUD) {
      btnReturnHUD.addEventListener('click', () => this.returnToLobby());
    }
    if (btnReturnPause) {
      btnReturnPause.addEventListener('click', () => this.returnToLobby());
    }

    // Auto-update UI once backend data finishes loading
    this.data.refreshAllData().then(() => {
      this.updateBadges();
      this.updateQuickHUD();
      if (this.currentTab !== 'home') {
        this.rerenderCurrentTab();
      }
    }).catch(() => {});

    // Start ambience audio on first user interaction with the document
    const startAudioOnce = () => {
      this.audio.startAmbience();
      window.removeEventListener('click', startAudioOnce);
      window.removeEventListener('keydown', startAudioOnce);
    };
    window.addEventListener('click', startAudioOnce);
    window.addEventListener('keydown', startAudioOnce);
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Enter key starts game if in lobby and not typing in an input
      if (e.key === 'Enter' && !this.isInWorld) {
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        this.enterWorld();
      }

      // Escape key closes modal overlay if open
      if (e.key === 'Escape' && !this.isInWorld) {
        if (this.currentTab !== 'home') {
          e.preventDefault();
          this.switchTab('home');
        }
      }
    });
  }

  updateLobbyPlayerCard() {
    const p = this.data.profile;
    const nameEl = document.getElementById('sidebar-player-name');
    const idEl = document.getElementById('sidebar-player-id');
    const lvlEl = document.getElementById('sidebar-player-level');
    const goldEl = document.getElementById('top-bar-gold');
    const xpFillEl = document.getElementById('sidebar-xp-fill');
    const xpTextEl = document.getElementById('right-xp-text');

    if (nameEl) nameEl.textContent = p.username;
    if (idEl) idEl.textContent = p.id;
    if (lvlEl) lvlEl.textContent = `LV. ${p.level}`;
    if (goldEl) goldEl.textContent = p.gold.toLocaleString();
    if (xpTextEl) xpTextEl.textContent = `${p.xp} / ${p.xpNext} XP`;

    if (xpFillEl) {
      const pct = Math.min(100, Math.round((p.xp / p.xpNext) * 100));
      xpFillEl.style.width = `${pct}%`;
    }
  }

  updateQuickHUD() {
    // 1. Update quick missions in right HUD panel
    const qmMissionsEl = document.getElementById('hideout-quick-missions');
    if (qmMissionsEl) {
      const dailyList = this.data.missions.slice(0, 3);
      if (dailyList.length > 0) {
        qmMissionsEl.innerHTML = dailyList.map(m => {
          const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
          const title = m.name || m.title || 'Misi Harian';
          const unit = m.unit ? ` ${m.unit}` : '';
          return `
            <div class="quick-mission-item ${pct >= 100 ? 'ready' : ''}">
              <div class="qm-top">
                <span class="qm-title">${title}</span>
                <span class="qm-val">${m.progress}/${m.target}${unit}</span>
              </div>
              <div class="qm-bar">
                <div class="qm-fill" style="width: ${pct}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }
    }

    // 2. Update online friends count
    const friendsCountEl = document.getElementById('hideout-friends-count');
    if (friendsCountEl) {
      const onlineCount = this.data.friends.filter(f => f.isFriend && (f.status === 'online' || f.status === 'in_game')).length;
      friendsCountEl.textContent = `${onlineCount} Teman Sedang Online`;
    }
  }

  updateBadges() {
    const readyMissions = this.data.missions.filter(m => m.progress >= m.target && !m.isClaimed).length;
    const activeEvents = this.data.events.filter(e => e.computedStatus === 'active' || !e.computedStatus).length;
    const unreadNews = this.data.news.filter(n => !this.data.isNewsRead(n.id)).length;
    const onlineFriends = this.data.friends.filter(f => f.isFriend && (f.status === 'online' || f.status === 'in_game')).length;

    const bMissions = document.getElementById('badge-nav-missions');
    const bEvents = document.getElementById('badge-nav-events');
    const bNews = document.getElementById('badge-nav-news');
    const bFriends = document.getElementById('badge-nav-friends');

    if (bMissions) {
      bMissions.textContent = readyMissions > 0 ? readyMissions : '';
      bMissions.style.display = readyMissions > 0 ? 'inline-block' : 'none';
    }
    if (bEvents) {
      bEvents.textContent = activeEvents > 0 ? activeEvents : '';
      bEvents.style.display = activeEvents > 0 ? 'inline-block' : 'none';
    }
    if (bNews) {
      bNews.textContent = unreadNews > 0 ? 'NEW' : '';
      bNews.style.display = unreadNews > 0 ? 'inline-block' : 'none';
    }
    if (bFriends) {
      bFriends.textContent = onlineFriends > 0 ? onlineFriends : '';
      bFriends.style.display = onlineFriends > 0 ? 'inline-block' : 'none';
    }
  }

  switchTab(tabName, params = {}) {
    this.currentTab = tabName;
    this.audio.playTabSwitch();

    // Update active class on top navigation tabs
    const navItems = document.querySelectorAll('.top-nav-item');
    navItems.forEach(item => {
      if (item.getAttribute('data-tab') === tabName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // If 'home' (LOBBY), close modal overlay so 3D hideout is visible
    if (tabName === 'home') {
      if (this.modalOverlay) {
        this.modalOverlay.style.display = 'none';
      }
      return;
    }

    // For any other tab (world, events, missions, news, friends, profile, settings):
    // Open modal dialog overlay and render content
    if (this.pages[tabName]) {
      if (this.modalOverlay) {
        this.modalOverlay.style.display = 'flex';
      }
      this.rerenderCurrentTab(params);
      this.updateBadges();
    }
  }

  rerenderCurrentTab(params = {}) {
    if (!this.tabContainer) return;
    const page = this.pages[this.currentTab];
    if (page) {
      this.tabContainer.innerHTML = page.render(params);
      if (page.attachEvents) {
        page.attachEvents(this.tabContainer);
      }
    }
  }

  enterWorld() {
    if (this.isInWorld) return;
    this.isInWorld = true;

    this.audio.playEnterWorldSound();
    this.audio.stopAmbience();

    // Hide lobby overlay
    if (this.lobbyScreen) {
      this.lobbyScreen.classList.add('hidden');
    }
    if (this.modalOverlay) {
      this.modalOverlay.style.display = 'none';
    }

    this.showToast('Memasuki dunia petualangan Wildlands...', 'success');

    if (this.callbacks.onStartWorld) {
      this.callbacks.onStartWorld({
        name: this.data.profile.username,
        quality: this.data.settings.quality
      });
    }
  }

  returnToLobby() {
    if (!this.isInWorld) return;
    this.isInWorld = false;

    // Show lobby screen
    if (this.lobbyScreen) {
      this.lobbyScreen.classList.remove('hidden');
    }
    if (this.modalOverlay) {
      this.modalOverlay.style.display = 'none';
    }

    this.switchTab('home');
    this.updateLobbyPlayerCard();
    this.updateBadges();
    this.updateQuickHUD();
    this.audio.startAmbience();

    if (this.callbacks.onReturnToLobby) {
      this.callbacks.onReturnToLobby();
    }
  }

  applyQuality(preset) {
    if (this.callbacks.onApplyQuality) {
      this.callbacks.onApplyQuality(preset);
    }
  }

  applySensitivity(val) {
    if (this.callbacks.onApplySensitivity) {
      this.callbacks.onApplySensitivity(val);
    }
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
    const docEl = document.documentElement;
    if (!this.isFullscreen()) {
      const requestFs = docEl.requestFullscreen ||
        docEl.webkitRequestFullscreen ||
        docEl.mozRequestFullScreen ||
        docEl.msRequestFullscreen;

      if (requestFs) {
        requestFs.call(docEl).then(() => {
          if (screen.orientation && screen.orientation.lock) {
            screen.orientation.lock('landscape').catch(() => {});
          }
        }).catch((err) => console.warn(err));
      }
    } else {
      const exitFs = document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;

      if (exitFs) {
        exitFs.call(document).catch((err) => console.warn(err));
      }
    }
  }

  showToast(message, type = 'info') {
    if (!this.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.4s';
      setTimeout(() => toast.remove(), 400);
    }, 3500);
  }
}
