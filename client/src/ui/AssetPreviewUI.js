/**
 * AssetPreviewUI.js
 * In-Game Asset Previewer & Official Manifest Inspector
 * Displays all installed CC0 / permissive 3D models, textures, animations, and sound effects.
 */

export class AssetPreviewUI {
  constructor() {
    this.modalEl = null;
    this.gridEl = null;
    this.manifest = null;
    this.currentCat = 'all';
    this.isOpen = false;

    this.initDOM();
  }

  initDOM() {
    if (typeof document === 'undefined') return;

    this.modalEl = document.getElementById('rpg-asset-preview-modal');
    this.gridEl = document.getElementById('asset-grid');

    const closeBtn = document.getElementById('btn-close-asset-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) this.close();
      });
    }

    // Top nav button
    const navBtn = document.getElementById('btn-nav-assets');
    if (navBtn) {
      navBtn.addEventListener('click', () => this.open());
    }

    // Category tabs
    const tabs = document.querySelectorAll('#asset-filter-tabs button');
    tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        tabs.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentCat = btn.getAttribute('data-cat') || 'all';
        this.render();
      });
    });

    // Auto-fetch manifest on first open
    this.loadManifest();
  }

  async loadManifest() {
    try {
      const res = await fetch('/assets/asset-manifest.json');
      if (res.ok) {
        this.manifest = await res.json();
      }
    } catch (_) {}
  }

  open() {
    this.isOpen = true;
    if (this.modalEl) this.modalEl.style.display = 'flex';
    if (!this.manifest) {
      this.loadManifest().then(() => this.render());
    } else {
      this.render();
    }
  }

  close() {
    this.isOpen = false;
    if (this.modalEl) this.modalEl.style.display = 'none';
  }

  render() {
    if (!this.gridEl || !this.manifest || !this.manifest.assets) return;

    this.gridEl.innerHTML = '';

    const list = this.manifest.assets.filter((a) => {
      if (this.currentCat === 'all') return true;
      if (this.currentCat === 'weapons') return a.category === 'weapons' || a.category === 'armor';
      if (this.currentCat === 'shops') return a.category === 'shops' || a.category === 'village';
      if (this.currentCat === 'props') return a.category === 'props' || a.category === 'loot' || a.category === 'interior';
      return a.category === this.currentCat;
    });

    for (const asset of list) {
      const card = document.createElement('div');
      card.className = 'sword-shop-card';
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.justifyContent = 'space-between';
      card.style.padding = '14px';

      const sizeKb = (asset.size / 1024).toFixed(1);
      const formatBadge = (asset.format || 'glb').toUpperCase();
      const licenseBadge = asset.license.includes('CC0') ? '🟢 CC0 Public Domain' : '🔵 ' + asset.license;

      let extraMeta = '';
      if (asset.meta && asset.meta.animations && asset.meta.animations.length > 0) {
        extraMeta = `<div style="font-size: 11px; color: #38bdf8; margin-top: 4px;">🎬 ${asset.meta.animations.length} Animasi: ${asset.meta.animations.slice(0, 3).join(', ')}...</div>`;
      }

      let playAudioBtn = '';
      if (asset.format === 'ogg') {
        playAudioBtn = `<button class="btn-sword-action buy can-afford" type="button" style="margin-top: 8px; padding: 6px 12px; font-size: 12px;" onclick="new Audio('${asset.path}').play()">▶️ Putar Suara</button>`;
      }

      card.innerHTML = `
        <div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span class="sword-rarity-pill common" style="font-size: 10px;">${formatBadge}</span>
            <span style="font-size: 11px; color: #94a3b8;">${sizeKb} KB</span>
          </div>
          <h4 style="font-size: 14px; font-weight: bold; color: #f8fafc; margin: 0 0 4px 0;">${asset.name}</h4>
          <span style="font-size: 11px; color: #38bdf8; display: block; margin-bottom: 6px;">ID: ${asset.id}</span>
          <div style="font-size: 11px; color: #cbd5e1; margin-bottom: 4px;">Sumber: <strong>${asset.source}</strong></div>
          <div style="font-size: 11px; color: #10b981;">${licenseBadge}</div>
          ${extraMeta}
        </div>
        <div>
          ${playAudioBtn}
          <div style="font-size: 10px; color: #64748b; margin-top: 8px; font-family: monospace; word-break: break-all;">${asset.path}</div>
        </div>
      `;

      this.gridEl.appendChild(card);
    }
  }
}
