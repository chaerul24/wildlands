/**
 * SettingsPage - Graphics, Audio, Controls & Display Settings for Wildlands
 */
export class SettingsPage {
  constructor(lobbyManager) {
    this.mgr = lobbyManager;
    this.data = lobbyManager.data;
  }

  render() {
    const s = this.data.settings;
    const isFullscreen = this.mgr.isFullscreen();

    return `
      <div class="page-container">
        <!-- HEADER -->
        <div class="page-header">
          <div>
            <h2 class="page-title">PENGATURAN GAME & GRAFIS</h2>
            <p class="page-subtitle">Sesuaikan kualitas grafis, sensitivitas kendali, audio lingkungan, dan mode tampilan layar penuh.</p>
          </div>

          <button class="btn-secondary btn-sm" id="btn-reset-settings">Reset Default</button>
        </div>

        <div class="settings-grid-layout">
          <!-- 1. GRAPHICS & DISPLAY -->
          <div class="settings-card">
            <div class="settings-card-header">
              <span>🖥️</span>
              <h3>TAMPILAN & GRAFIS 3D</h3>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-name">Kualitas Grafis (Presets)</span>
                <span class="setting-desc">Mengatur resolusi render, bayangan dinamis, dan densitas vegetasi.</span>
              </div>
              <select id="setting-graphics" class="form-input select-auto">
                <option value="low" ${s.quality === 'low' ? 'selected' : ''}>Low (Maksimum Performa 60 FPS)</option>
                <option value="medium" ${s.quality === 'medium' ? 'selected' : ''}>Medium (Keseimbangan Terbaik)</option>
                <option value="high" ${s.quality === 'high' ? 'selected' : ''}>High (Bayangan PCF & Efek Penuh)</option>
              </select>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-name">Mode Layar Penuh (Fullscreen)</span>
                <span class="setting-desc">Memaksimalkan layar landscape untuk pengalaman imersif.</span>
              </div>
              <button class="btn-secondary btn-sm" id="btn-toggle-fs-settings">
                ${isFullscreen ? 'Keluar Layar Penuh' : 'Aktifkan Fullscreen ⛶'}
              </button>
            </div>
          </div>

          <!-- 2. CONTROLS & CAMERA -->
          <div class="settings-card">
            <div class="settings-card-header">
              <span>🎮</span>
              <h3>KENDALI & KAMERA</h3>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-name">Sensitivitas Kamera Look</span>
                <span class="setting-desc">Kecepatan putar sudut pandang mouse & touch swipe.</span>
              </div>
              <div class="slider-row">
                <input type="range" id="setting-sensitivity" min="0.001" max="0.006" step="0.0005" value="${s.sensitivity || 0.0024}" />
                <span class="slider-val" id="val-sensitivity">${s.sensitivity || 0.0024}</span>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-name">Preset Kontrol Mobile</span>
                <span class="setting-desc">Virtual Joystick kiri bawah & Touch look kanan aktif otomatis di HP.</span>
              </div>
              <span class="badge-status-on">TERINTEGRASI</span>
            </div>
          </div>

          <!-- 3. AUDIO & SFX -->
          <div class="settings-card">
            <div class="settings-card-header">
              <span>🔊</span>
              <h3>SUARA & EFEK SUASANA</h3>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-name">Volume Utama (Master)</span>
                <span class="setting-desc">Tingkat kekuatan suara keseluruhan game.</span>
              </div>
              <div class="slider-row">
                <input type="range" id="setting-master-vol" min="0" max="100" value="${s.masterVolume || 80}" />
                <span class="slider-val" id="val-master-vol">${s.masterVolume || 80}%</span>
              </div>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-name">Efek Suasana Alam (SFX)</span>
                <span class="setting-desc">Desau angin, gemercik air sumur, dan derak api unggun.</span>
              </div>
              <div class="slider-row">
                <input type="range" id="setting-sfx-vol" min="0" max="100" value="${s.sfxVolume || 90}" />
                <span class="slider-val" id="val-sfx-vol">${s.sfxVolume || 90}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEvents(container) {
    // Graphics preset
    const selectGfx = container.querySelector('#setting-graphics');
    if (selectGfx) {
      selectGfx.addEventListener('change', (e) => {
        const val = e.target.value;
        this.data.saveSettings({ quality: val });
        this.mgr.applyQuality(val);
        this.mgr.showToast(`Kualitas grafis diubah ke: ${val.toUpperCase()}`, 'info');
      });
    }

    // Sensitivity
    const sliderSens = container.querySelector('#setting-sensitivity');
    const valSens = container.querySelector('#val-sensitivity');
    if (sliderSens) {
      sliderSens.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (valSens) valSens.textContent = val.toFixed(4);
        this.data.saveSettings({ sensitivity: val });
        this.mgr.applySensitivity(val);
      });
    }

    // Audio sliders
    const sliderMaster = container.querySelector('#setting-master-vol');
    const valMaster = container.querySelector('#val-master-vol');
    if (sliderMaster) {
      sliderMaster.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (valMaster) valMaster.textContent = `${val}%`;
        this.data.saveSettings({ masterVolume: val });
      });
    }

    const sliderSfx = container.querySelector('#setting-sfx-vol');
    const valSfx = container.querySelector('#val-sfx-vol');
    if (sliderSfx) {
      sliderSfx.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (valSfx) valSfx.textContent = `${val}%`;
        this.data.saveSettings({ sfxVolume: val });
      });
    }

    // Fullscreen toggle
    const btnFs = container.querySelector('#btn-toggle-fs-settings');
    if (btnFs) {
      btnFs.addEventListener('click', () => {
        this.mgr.toggleFullscreen();
        setTimeout(() => this.mgr.rerenderCurrentTab(), 150);
      });
    }

    // Reset defaults
    const btnReset = container.querySelector('#btn-reset-settings');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        const def = {
          quality: 'medium',
          sensitivity: 0.0024,
          masterVolume: 80,
          sfxVolume: 90,
          musicVolume: 70
        };
        this.data.saveSettings(def);
        this.mgr.applyQuality(def.quality);
        this.mgr.applySensitivity(def.sensitivity);
        this.mgr.showToast('Pengaturan telah dikembalikan ke standar awal.', 'info');
        this.mgr.rerenderCurrentTab();
      });
    }
  }
}
