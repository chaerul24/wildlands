export class Minimap {
  constructor(player, npcManager, buildings, questManager, inputManager) {
    this.player = player;
    this.npcManager = npcManager;
    this.buildings = buildings;
    this.questManager = questManager;
    this.input = inputManager;

    // HUD Minimap Canvas
    this.hudCanvas = document.getElementById('hud-minimap-canvas');
    this.hudCtx = this.hudCanvas ? this.hudCanvas.getContext('2d') : null;
    this.coordsEl = document.getElementById('minimap-coords');

    // World Map Modal & Canvas
    this.modalEl = document.getElementById('rpg-world-map-modal');
    this.worldCanvas = document.getElementById('world-map-canvas');
    this.worldCtx = this.worldCanvas ? this.worldCanvas.getContext('2d') : null;
    this.modalCoordsEl = document.getElementById('map-player-coord-val');

    this.isWorldMapOpen = false;
    this.lastRenderTime = 0;

    this.initDOM();
  }

  initDOM() {
    // Click on HUD Minimap opens Full World Map
    const container = document.getElementById('hud-minimap-container');
    if (container) {
      container.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleWorldMap();
      });
    }

    const btnHudMap = document.getElementById('btn-hud-map');
    if (btnHudMap) {
      btnHudMap.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleWorldMap();
      });
    }

    const closeBtn = document.getElementById('btn-close-map');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeWorldMap());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) {
          this.closeWorldMap();
        }
      });
    }

    // Keyboard listener for 'M'
    window.addEventListener('keydown', (e) => {
      if (e.key === 'm' || e.key === 'M') {
        // Ignore if user typing in an input
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        this.toggleWorldMap();
      }
    });
  }

  toggleWorldMap() {
    if (this.isWorldMapOpen) {
      this.closeWorldMap();
    } else {
      this.openWorldMap();
    }
  }

  openWorldMap() {
    this.isWorldMapOpen = true;
    if (this.input) {
      this.input.exitPointerLock();
    }
    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
    }
    this.renderWorldMap();
  }

  closeWorldMap() {
    this.isWorldMapOpen = false;
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
  }

  update(player, dt) {
    if (player) this.player = player;
    if (!this.player || !this.hudCtx) return;

    // Render HUD Minimap at ~30 FPS
    const now = performance.now();
    if (now - this.lastRenderTime > 32) {
      this.lastRenderTime = now;
      this.renderHUDMinimap();
      if (this.isWorldMapOpen) {
        this.renderWorldMap();
      }
    }
  }

  // --- HUD RADAR MINIMAP RENDERING ---
  renderHUDMinimap() {
    const ctx = this.hudCtx;
    const w = this.hudCanvas.width;
    const h = this.hudCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const radius = w / 2 - 4;

    const px = this.player.position.x;
    const pz = this.player.position.z;
    const pyaw = this.player.yaw || 0;

    // Update coordinates pill
    if (this.coordsEl) {
      this.coordsEl.textContent = `X: ${Math.round(px)}, Z: ${Math.round(pz)}`;
    }

    ctx.clearRect(0, 0, w, h);

    // 1. Circular Clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // Background terrain fill (valley green / topo gradient)
    const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, radius);
    bgGrad.addColorStop(0, '#13281e');
    bgGrad.addColorStop(0.7, '#0d1c15');
    bgGrad.addColorStop(1, '#08110d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Range rings (30m and 60m radius)
    const zoom = 1.1; // pixels per world meter
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 25 * zoom, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 50 * zoom, 0, Math.PI * 2);
    ctx.stroke();

    // 2. World Features relative to player
    // Village road / center landmark
    const villageRelX = (15 - px) * zoom;
    const villageRelZ = (5 - pz) * zoom;
    ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
    ctx.beginPath();
    ctx.arc(cx + villageRelX, cy + villageRelZ, 35 * zoom, 0, Math.PI * 2);
    ctx.fill();

    // Buildings / Structures
    if (this.buildings && this.buildings.instances) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.7)';
      ctx.lineWidth = 1;

      for (const b of this.buildings.instances) {
        const bx = cx + (b.x - px) * zoom;
        const bz = cy + (b.z - pz) * zoom;
        const bw = (b.width || 8) * zoom;
        const bd = (b.depth || 8) * zoom;

        // Only draw if within radar radius
        const distSq = (bx - cx) * (bx - cx) + (bz - cy) * (bz - cy);
        if (distSq < radius * radius) {
          ctx.fillRect(bx - bw / 2, bz - bd / 2, bw, bd);
          ctx.strokeRect(bx - bw / 2, bz - bd / 2, bw, bd);
        }
      }
    }

    // Friendly NPCs
    if (this.npcManager && this.npcManager.npcs) {
      for (const npc of this.npcManager.npcs) {
        const nx = cx + (npc.position.x - px) * zoom;
        const nz = cy + (npc.position.z - pz) * zoom;
        const distSq = (nx - cx) * (nx - cx) + (nz - cy) * (nz - cy);

        if (distSq < radius * radius) {
          ctx.beginPath();
          ctx.arc(nx, nz, 3.5, 0, Math.PI * 2);
          if (npc.role === 'merchant') {
            ctx.fillStyle = '#f59e0b'; // Gold for Merchant Paman Jono
          } else if (npc.role === 'guard') {
            ctx.fillStyle = '#ef4444'; // Red-orange for Guard Rian
          } else {
            ctx.fillStyle = '#34d399'; // Green for village NPCs
          }
          ctx.fill();
        }
      }
    }

    // Quest Target Marker (Old Weathered House at -54, -34)
    const qx = cx + (-54 - px) * zoom;
    const qz = cy + (-34 - pz) * zoom;
    const qDist = Math.sqrt((qx - cx) * (qx - cx) + (qz - cy) * (qz - cy));

    if (qDist < radius - 8) {
      // Inside radar
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(qx, qz, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Clamped to perimeter with arrow pointing to objective
      const angle = Math.atan2(qz - cy, qx - cx);
      const edgeX = cx + Math.cos(angle) * (radius - 8);
      const edgeY = cy + Math.sin(angle) * (radius - 8);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(edgeX, edgeY, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Center Player Icon & Vision Cone
    ctx.save();
    ctx.translate(cx, cy);

    // Player vision cone
    ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    // Orient cone with player yaw
    ctx.arc(0, 0, 28, pyaw - 0.5, pyaw + 0.5);
    ctx.closePath();
    ctx.fill();

    // Player Direction Arrow
    ctx.rotate(pyaw);
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 7);
    ctx.lineTo(-4.5, -5);
    ctx.lineTo(0, -2);
    ctx.lineTo(4.5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore(); // Restore player translation

    ctx.restore(); // Restore circular clip

    // 4. Radar Outer Bronze/Green Ring Border & Compass Cardinal Indicators
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Cardinal Points
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('N', cx, 10);
    ctx.fillText('S', cx, h - 10);
    ctx.fillText('E', w - 10, cy);
    ctx.fillText('W', 10, cy);
  }

  // --- FULL WORLD MAP MODAL RENDERING ---
  renderWorldMap() {
    const ctx = this.worldCtx;
    if (!ctx) return;
    const w = this.worldCanvas.width;
    const h = this.worldCanvas.height;

    const px = this.player.position.x;
    const pz = this.player.position.z;

    if (this.modalCoordsEl) {
      this.modalCoordsEl.textContent = `X: ${Math.round(px)}, Z: ${Math.round(pz)}`;
    }

    ctx.clearRect(0, 0, w, h);

    // 1. Parchment Topographic Map Background
    const mapGrad = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, w / 2);
    mapGrad.addColorStop(0, '#1c2820');
    mapGrad.addColorStop(0.7, '#141d18');
    mapGrad.addColorStop(1, '#0d1310');
    ctx.fillStyle = mapGrad;
    ctx.fillRect(0, 0, w, h);

    // Map world boundaries: from X = -120 to +120, Z = -120 to +120 (total span 240m)
    const mapSpan = 220; // meters total
    const worldToMap = (wx, wz) => ({
      x: w / 2 + (wx / mapSpan) * (w - 60),
      y: h / 2 + (wz / mapSpan) * (h - 60)
    });

    // Grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = -100; i <= 100; i += 25) {
      const p1 = worldToMap(i, -100);
      const p2 = worldToMap(i, 100);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      const p3 = worldToMap(-100, i);
      const p4 = worldToMap(100, i);
      ctx.beginPath();
      ctx.moveTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.stroke();
    }

    // 2. Village Green District
    const vCenter = worldToMap(18, 5);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(vCenter.x, vCenter.y, 80, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#6ee7b7';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏡 DESA LEMBAH HIJAU', vCenter.x, vCenter.y - 65);

    // 3. Old Weathered House & Marauder Lair
    const ruinsPos = worldToMap(-54, -34);
    ctx.fillStyle = 'rgba(239, 68, 68, 0.16)';
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(ruinsPos.x, ruinsPos.y, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fca5a5';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('🏚️ RUMAH TUA LAPUK', ruinsPos.x, ruinsPos.y - 35);
    ctx.fillStyle = '#ef4444';
    ctx.font = '9.5px sans-serif';
    ctx.fillText('(Sarang Warrior Marauder)', ruinsPos.x, ruinsPos.y - 22);

    // 4. Farmland Plots
    const farmPos = worldToMap(33.5, -5.8);
    ctx.fillStyle = 'rgba(132, 204, 22, 0.15)';
    ctx.fillRect(farmPos.x - 22, farmPos.y - 18, 44, 36);
    ctx.fillStyle = '#a3e635';
    ctx.font = '9px sans-serif';
    ctx.fillText('🌾 Perkebunan Sayur', farmPos.x, farmPos.y + 28);

    // 5. Buildings
    if (this.buildings && this.buildings.instances) {
      for (const b of this.buildings.instances) {
        const mp = worldToMap(b.x, b.z);
        ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
        ctx.fillRect(mp.x - 6, mp.y - 6, 12, 12);
      }
    }

    // 6. NPCs on Big Map
    if (this.npcManager && this.npcManager.npcs) {
      for (const npc of this.npcManager.npcs) {
        const np = worldToMap(npc.position.x, npc.position.z);
        ctx.beginPath();
        ctx.arc(np.x, np.y, 4, 0, Math.PI * 2);

        if (npc.role === 'merchant') {
          ctx.fillStyle = '#f59e0b';
          ctx.fill();
          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('🏪 Paman Jono (Toko)', np.x, np.y - 8);
        } else if (npc.role === 'guard') {
          ctx.fillStyle = '#ef4444';
          ctx.fill();
          ctx.fillStyle = '#fca5a5';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('🛡️ Penjaga Rian', np.x, np.y - 8);
        } else {
          ctx.fillStyle = '#34d399';
          ctx.fill();
        }
      }
    }

    // 7. Player Location on Map
    const playerMapPos = worldToMap(px, pz);

    // Pulsing halo
    const pulse = 10 + Math.sin(performance.now() * 0.006) * 3;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.beginPath();
    ctx.arc(playerMapPos.x, playerMapPos.y, pulse, 0, Math.PI * 2);
    ctx.fill();

    // Center player icon
    ctx.fillStyle = '#38bdf8';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(playerMapPos.x, playerMapPos.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('🤠 Anda', playerMapPos.x, playerMapPos.y + 16);
  }
}
