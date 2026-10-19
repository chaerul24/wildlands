export class OnboardingManager {
  constructor(onComplete = null) {
    this.onComplete = onComplete;
    this.currentStep = 0;

    this.steps = [
      {
        stepNum: 'LANGKAH 1 DARI 5',
        icon: '🌲',
        title: 'Eksplorasi Dunia Lembah Wildlands',
        desc: 'Selamat datang di Wildlands! Jelajahi lembah luas, pemukiman Valley Village, ladang tani, hingga pondok tua di tepi rimba. Gunakan [WASD] untuk bergerak, [Space] untuk melompat, dan geser mouse untuk mengontrol kamera bebas.'
      },
      {
        stepNum: 'LANGKAH 2 DARI 5',
        icon: '⚔️',
        title: 'Pertarungan Aksi, Roll & Stamina',
        desc: 'Hadapi ancaman penyamun liar! Tekan [Klik Kiri] atau [F] untuk mengayunkan pedang. Tekan [Q] untuk berguling (Roll) menghindari tebasan dengan kebal sesaat. Perhatikan bar Stamina birumu agar tidak kehabisan tenaga!'
      },
      {
        stepNum: 'LANGKAH 3 DARI 5',
        icon: '📜',
        title: 'Dialog Warga & Misi Cerita (Quests)',
        desc: 'Valley Village dihuni oleh para perintis hidup. Dekati NPC seperti Penjaga Desa Rian atau Kakek Danu, lalu tekan [E] untuk berbicara, berinteraksi, dan menerima quest dengan hadiah EXP serta emas melimpah.'
      },
      {
        stepNum: 'LANGKAH 4 DARI 5',
        icon: '🎒',
        title: 'Tas Inventaris & Pemasangan Senjata',
        desc: 'Tekan [I] kapan saja untuk membuka Tas Petualang. Pasang pedang, perisai, dan zirah untuk meningkatkan statistik Serangan (ATK) dan Pertahanan (DEF). Gunakan ramuan herbal Potion HP jika terluka.'
      },
      {
        stepNum: 'LANGKAH 5 DARI 5',
        icon: '🌐',
        title: 'Multiplayer Real-Time Asia-SE',
        desc: 'Kamu tidak sendirian di tanah Wildlands! Pemain lain menjelajah secara bersamaan di server resmi Asia-SE. Tekan [Tab] untuk melihat daftar petualang yang sedang online dan jalin persahabatan baru.'
      }
    ];

    this.splashEl = null;
    this.loadingEl = null;
    this.modalEl = null;

    this.createDOM();
  }

  createDOM() {
    // 1. Splash Screen
    this.splashEl = document.createElement('div');
    this.splashEl.id = 'game-splash-screen';
    this.splashEl.innerHTML = `
      <div class="splash-content">
        <div class="splash-icon">🌲</div>
        <h1 class="splash-title">WILDLANDS</h1>
        <p class="splash-subtitle">3D Open-World Action RPG Multiplayer</p>
        <button id="btn-splash-enter" class="btn-splash-start" type="button">
          MULAI PETUALANGAN [ENTER]
        </button>
        <span style="font-size: 11px; color: #64748b; margin-top: 10px;">Versi 2.4 • Asia-SE Official Realm</span>
      </div>
    `;
    document.body.appendChild(this.splashEl);

    // 2. Loading Screen
    this.loadingEl = document.createElement('div');
    this.loadingEl.id = 'game-loading-screen';
    this.loadingEl.style.display = 'none';
    this.loadingEl.innerHTML = `
      <div class="loading-container">
        <div style="font-size: 32px; margin-bottom: 6px;">🌲</div>
        <span class="loading-label" id="loading-status-text">Memuat Dunia Wildlands...</span>
        <div class="loading-track">
          <div class="loading-bar" id="loading-bar-fill"></div>
        </div>
        <span style="font-size: 11px; color: #64748b;" id="loading-pct-text">0%</span>
      </div>
    `;
    document.body.appendChild(this.loadingEl);

    // 3. Onboarding Modal
    this.modalEl = document.createElement('div');
    this.modalEl.id = 'onboarding-modal';
    this.modalEl.className = 'onboarding-overlay';
    this.modalEl.style.display = 'none';
    this.modalEl.innerHTML = `
      <div class="onboarding-card">
        <header class="onboarding-header">
          <span class="onboarding-step-badge" id="ob-step-badge">LANGKAH 1 DARI 5</span>
          <button id="btn-ob-skip" class="dialogue-close-btn" style="border-radius: 8px; width: auto; padding: 4px 10px; font-size: 12px;" type="button">Lewati</button>
        </header>

        <main class="onboarding-slide">
          <div class="onboarding-icon" id="ob-icon">🌲</div>
          <h2 class="onboarding-slide-title" id="ob-title">Judul Tutorial</h2>
          <p class="onboarding-slide-text" id="ob-desc">Deskripsi tutorial penjelasan gameplay.</p>
        </main>

        <footer class="onboarding-footer">
          <div class="onboarding-dots" id="ob-dots">
            <!-- 5 dots -->
          </div>

          <div style="display: flex; gap: 10px;">
            <button id="btn-ob-prev" class="btn-secondary" style="width: auto; padding: 8px 16px; font-size: 13px;" type="button">← Sebelumnya</button>
            <button id="btn-ob-next" class="btn-primary" style="width: auto; padding: 8px 20px; font-size: 13px;" type="button">Lanjut →</button>
          </div>
        </footer>
      </div>
    `;
    document.body.appendChild(this.modalEl);

    // Wire Splash button
    const btnSplash = this.splashEl.querySelector('#btn-splash-enter');
    if (btnSplash) {
      btnSplash.addEventListener('click', () => this.handleSplashEnter());
    }

    // Splash key listener
    const onFirstKey = (e) => {
      if (this.splashEl && this.splashEl.style.display !== 'none') {
        window.removeEventListener('keydown', onFirstKey);
        this.handleSplashEnter();
      }
    };
    window.addEventListener('keydown', onFirstKey);

    // Wire Onboarding buttons
    const btnSkip = this.modalEl.querySelector('#btn-ob-skip');
    const btnNext = this.modalEl.querySelector('#btn-ob-next');
    const btnPrev = this.modalEl.querySelector('#btn-ob-prev');

    if (btnSkip) btnSkip.onclick = () => this.finishOnboarding();
    if (btnNext) btnNext.onclick = () => this.nextStep();
    if (btnPrev) btnPrev.onclick = () => this.prevStep();
  }

  handleSplashEnter() {
    if (!this.splashEl) return;
    this.splashEl.style.opacity = '0';
    setTimeout(() => {
      this.splashEl.style.display = 'none';
      this.startLoadingFlow();
    }, 450);
  }

  startLoadingFlow() {
    this.loadingEl.style.display = 'flex';
    const bar = this.loadingEl.querySelector('#loading-bar-fill');
    const label = this.loadingEl.querySelector('#loading-status-text');
    const pct = this.loadingEl.querySelector('#loading-pct-text');

    const stages = [
      { p: 25, msg: 'Memuat Topografi Lembah & Sungai...' },
      { p: 60, msg: 'Menginisialisasi Model Karakter & Perlengkapan...' },
      { p: 85, msg: 'Menghubungkan ke Asia-SE Game Server...' },
      { p: 100, msg: 'Dunia Siap Dijelajahi!' }
    ];

    let stageIdx = 0;
    const interval = setInterval(() => {
      if (stageIdx >= stages.length) {
        clearInterval(interval);
        setTimeout(() => {
          this.loadingEl.style.opacity = '0';
          setTimeout(() => {
            this.loadingEl.style.display = 'none';
            this.checkFirstVisit();
          }, 350);
        }, 300);
        return;
      }

      const cur = stages[stageIdx];
      if (bar) bar.style.width = `${cur.p}%`;
      if (pct) pct.textContent = `${cur.p}%`;
      if (label) label.textContent = cur.msg;
      stageIdx++;
    }, 250);
  }

  checkFirstVisit() {
    const done = localStorage.getItem('wildlands_onboarding_done');
    if (!done) {
      this.openTutorial();
    } else {
      if (this.onComplete) this.onComplete();
    }
  }

  openTutorial() {
    this.currentStep = 0;
    this.renderStep();
    this.modalEl.style.display = 'flex';
  }

  renderStep() {
    const data = this.steps[this.currentStep];
    const badge = this.modalEl.querySelector('#ob-step-badge');
    const icon = this.modalEl.querySelector('#ob-icon');
    const title = this.modalEl.querySelector('#ob-title');
    const desc = this.modalEl.querySelector('#ob-desc');
    const btnNext = this.modalEl.querySelector('#btn-ob-next');
    const btnPrev = this.modalEl.querySelector('#btn-ob-prev');
    const dotsContainer = this.modalEl.querySelector('#ob-dots');

    if (badge) badge.textContent = data.stepNum;
    if (icon) icon.textContent = data.icon;
    if (title) title.textContent = data.title;
    if (desc) desc.textContent = data.desc;

    if (btnPrev) {
      btnPrev.style.display = this.currentStep === 0 ? 'none' : 'block';
    }

    if (btnNext) {
      btnNext.textContent = this.currentStep === this.steps.length - 1 ? 'Mulai Petualangan ⚔️' : 'Lanjut →';
    }

    // Dots
    if (dotsContainer) {
      dotsContainer.innerHTML = '';
      for (let i = 0; i < this.steps.length; i++) {
        const dot = document.createElement('div');
        dot.className = `onboarding-dot ${i === this.currentStep ? 'active' : ''}`;
        dotsContainer.appendChild(dot);
      }
    }
  }

  nextStep() {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.renderStep();
    } else {
      this.finishOnboarding();
    }
  }

  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep();
    }
  }

  finishOnboarding() {
    localStorage.setItem('wildlands_onboarding_done', 'true');
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
    if (this.onComplete) {
      this.onComplete();
    }
  }
}
