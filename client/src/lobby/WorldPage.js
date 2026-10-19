/**
 * WorldPage - Information on Wildlands Open World Realm, Settlements & Exploration
 */
export class WorldPage {
  constructor(lobbyManager) {
    this.mgr = lobbyManager;
    this.data = lobbyManager.data;
  }

  render() {
    return `
      <div class="modal-dialog-content">
        <div class="page-header">
          <div class="page-title-wrap">
            <h2>DUNIA WILDLANDS (REALM MAP)</h2>
            <p>Jelajahi lanskap pedesaan terbuka seluas 1.6 kilometer persegi dengan sistem multiplayer real-time.</p>
          </div>
          <button class="btn-close-modal" id="btn-close-world-page">✕</button>
        </div>

        <div class="world-zones-grid">
          <!-- Zone 1 -->
          <div class="world-zone-card">
            <div class="zone-badge">PERMUKIMAN UTAMA</div>
            <h3 class="zone-title">🏡 Lembah Desa (Valley Village)</h3>
            <p class="zone-desc">
              Pusat interaksi sosial para petualang. Dihuni oleh para penduduk ramah dengan aktivitas beragam: Kios Buah & Sayur Mang Asep, Ladang Tani Bajakan Pak Joko, Pengangkut Peti Kayu, serta Sumur Air Sejuk.
            </p>
            <div class="zone-meta">
              <span>📍 Koordinat: [42, 28]</span>
              <span class="badge-safe">ZONA AMAN</span>
            </div>
          </div>

          <!-- Zone 2 -->
          <div class="world-zone-card">
            <div class="zone-badge warning">MISTERI & RERUNTUHAN</div>
            <h3 class="zone-title">🏚️ Rumah Tua Lapuk (Weathered Ruins)</h3>
            <p class="zone-desc">
              Bangunan kayu tua terbengkalai di tepi hutan rimba barat. Dinding kayu kusam aus, atap rapuh berlumut, dan gerobak tua roboh menyimpan peninggalan masa lampau yang menanti untuk diselidiki.
            </p>
            <div class="zone-meta">
              <span>📍 Koordinat: [-55, -35]</span>
              <span class="badge-danger">EKSPLORASI</span>
            </div>
          </div>

          <!-- Zone 3 -->
          <div class="world-zone-card">
            <div class="zone-badge">ALAM BEBAS</div>
            <h3 class="zone-title">🌲 Rimba Belantara & Dataran Tinggi</h3>
            <p class="zone-desc">
              Bentang alam luas dengan vegetasi pinus, pohon ek rindang, dan bukit bebatuan. Rasakan embusan angin pada dedaunan dan temui pertapa hutan yang tengah bermeditasi di ketinggian.
            </p>
            <div class="zone-meta">
              <span>📍 Tersebar di Seluruh Peta</span>
              <span class="badge-safe">OPEN WORLD</span>
            </div>
          </div>
        </div>

        <div class="world-server-box">
          <div class="server-info-col">
            <div class="server-title">REALM SERVER AKTIF: <strong>Asia-SE (Jakarta / Singapore)</strong></div>
            <div class="server-details">Authoritative WebSocket Game Server • 20 Hz Tickrate • Latensi Rendah</div>
          </div>
          <button id="btn-world-enter" class="btn-primary" style="padding: 12px 28px; font-size: 14px; font-weight: 800; letter-spacing: 1px;">
            ⚔️ MASUK DUNIA SEKARANG
          </button>
        </div>
      </div>
    `;
  }

  attachEvents(container) {
    const btnClose = container.querySelector('#btn-close-world-page');
    if (btnClose) {
      btnClose.addEventListener('click', () => {
        this.mgr.switchTab('home');
      });
    }

    const btnEnter = container.querySelector('#btn-world-enter');
    if (btnEnter) {
      btnEnter.addEventListener('click', () => {
        this.mgr.enterWorld();
      });
    }
  }
}
