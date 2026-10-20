/**
 * In-Game Real-Time Performance & Diagnostics Overlay:
 * - FPS and Frame Time (ms)
 * - Three.js Draw Calls & Triangles
 * - Active Memory & Texture counts
 * - Current Android Graphic Preset & Device DPR
 */
export class PerformanceMonitor {
  constructor(renderer, adaptiveQuality) {
    this.renderer = renderer;
    this.adaptiveQuality = adaptiveQuality;
    this.isVisible = false;
    this.container = null;
    this.updateCounter = 0;

    this.createDOM();
    this.initHotkey();
  }

  createDOM() {
    if (typeof document === 'undefined') return;

    const el = document.createElement('div');
    el.id = 'perf-debug-overlay';
    el.style.cssText = `
      position: fixed;
      top: 56px;
      left: 12px;
      background: rgba(11, 15, 25, 0.88);
      border: 1px solid rgba(56, 189, 248, 0.4);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(8px);
      border-radius: 8px;
      padding: 8px 12px;
      font-family: monospace;
      font-size: 11px;
      color: #38bdf8;
      z-index: 9999;
      pointer-events: none;
      display: none;
      min-width: 170px;
      line-height: 1.45;
    `;

    el.innerHTML = `
      <div style="font-weight: bold; color: #f8fafc; margin-bottom: 4px; display: flex; justify-content: space-between;">
        <span>⚡ PERF STATS</span>
        <span id="perf-fps-badge" style="color: #4ade80;">60 FPS</span>
      </div>
      <div>Frame Time: <span id="perf-ms" style="color: #f1f5f9;">16.6ms</span></div>
      <div>Draw Calls: <span id="perf-calls" style="color: #f1f5f9;">0</span></div>
      <div>Triangles: <span id="perf-tris" style="color: #f1f5f9;">0</span></div>
      <div>Geometries: <span id="perf-geos" style="color: #94a3b8;">0</span></div>
      <div>Textures: <span id="perf-tex" style="color: #94a3b8;">0</span></div>
      <div>Profile: <span id="perf-profile" style="color: #fbbf24;">MEDIUM</span></div>
      <div>DPR: <span id="perf-dpr" style="color: #94a3b8;">1.0</span></div>
    `;

    document.body.appendChild(el);
    this.container = el;

    // Cache element spans
    this.fpsBadge = el.querySelector('#perf-fps-badge');
    this.msSpan = el.querySelector('#perf-ms');
    this.callsSpan = el.querySelector('#perf-calls');
    this.trisSpan = el.querySelector('#perf-tris');
    this.geosSpan = el.querySelector('#perf-geos');
    this.texSpan = el.querySelector('#perf-tex');
    this.profileSpan = el.querySelector('#perf-profile');
    this.dprSpan = el.querySelector('#perf-dpr');
  }

  initHotkey() {
    if (typeof window === 'undefined') return;

    window.addEventListener('keydown', (e) => {
      // Toggle with [P] key
      if (e.code === 'KeyP' && !e.target.matches('input, textarea')) {
        this.toggle();
      }
    });

    // Also connect to clicking ping badge in HUD
    const pingEl = document.getElementById('ping-text');
    if (pingEl) {
      pingEl.style.cursor = 'pointer';
      pingEl.title = 'Klik untuk menampilkan/menyembunyikan diagnostik performa [P]';
      pingEl.addEventListener('click', () => this.toggle());
    }
  }

  toggle() {
    this.isVisible = !this.isVisible;
    if (this.container) {
      this.container.style.display = this.isVisible ? 'block' : 'none';
    }
  }

  show() {
    this.isVisible = true;
    if (this.container) this.container.style.display = 'block';
  }

  hide() {
    this.isVisible = false;
    if (this.container) this.container.style.display = 'none';
  }

  update(preset) {
    if (!this.isVisible || !this.renderer) return;

    this.updateCounter = (this.updateCounter + 1) % 10;
    if (this.updateCounter !== 0) return; // Refresh UI 6 times a second

    const info = this.renderer.info;
    const metrics = this.adaptiveQuality ? this.adaptiveQuality.getMetrics() : { fps: 60, frameTimeMs: 16.6 };

    if (this.fpsBadge) {
      const fps = metrics.fps;
      this.fpsBadge.textContent = `${fps} FPS`;
      this.fpsBadge.style.color = fps >= 45 ? '#4ade80' : (fps >= 28 ? '#fbbf24' : '#ef4444');
    }

    if (this.msSpan) this.msSpan.textContent = `${metrics.frameTimeMs}ms`;
    if (this.callsSpan && info.render) this.callsSpan.textContent = info.render.calls.toLocaleString();
    if (this.trisSpan && info.render) this.trisSpan.textContent = info.render.triangles.toLocaleString();
    if (this.geosSpan && info.memory) this.geosSpan.textContent = info.memory.geometries;
    if (this.texSpan && info.memory) this.texSpan.textContent = info.memory.textures;
    if (this.profileSpan) this.profileSpan.textContent = (preset || 'MEDIUM').toUpperCase();
    if (this.dprSpan) this.dprSpan.textContent = (this.renderer.getPixelRatio ? this.renderer.getPixelRatio().toFixed(2) : '1.0');
  }
}
