/**
 * NewsPage - News, Announcements & Patch Notes for Wildlands
 */
export class NewsPage {
  constructor(lobbyManager) {
    this.mgr = lobbyManager;
    this.data = lobbyManager.data;
    this.activeCategory = 'all';
    this.selectedArticle = null;
  }

  render() {
    const news = this.data.news;
    const featured = news.find(n => n.featured) || news[0];

    const filtered = news.filter(n => {
      if (this.activeCategory === 'all') return true;
      return n.category.toLowerCase().includes(this.activeCategory.toLowerCase());
    });

    return `
      <div class="page-container">
        <!-- HEADER -->
        <div class="page-header">
          <div>
            <h2 class="page-title">PENGUMUMAN & WARTA WILDLANDS</h2>
            <p class="page-subtitle">Ikuti warta perkembangan terkini seputar pembaruan dunia, jadwal event, dan catatan patch sistem.</p>
          </div>

          <div class="filter-pills">
            <button class="pill-btn ${this.activeCategory === 'all' ? 'active' : ''}" data-cat="all">Semua</button>
            <button class="pill-btn ${this.activeCategory === 'update' ? 'active' : ''}" data-cat="update">Update</button>
            <button class="pill-btn ${this.activeCategory === 'event' ? 'active' : ''}" data-cat="event">Event</button>
            <button class="pill-btn ${this.activeCategory === 'pengumuman' ? 'active' : ''}" data-cat="pengumuman">Pengumuman</button>
            <button class="pill-btn ${this.activeCategory === 'bug' ? 'active' : ''}" data-cat="bug">Patch</button>
          </div>
        </div>

        <!-- FEATURED HEADLINE (if showing all) -->
        ${this.activeCategory === 'all' && featured ? `
          <div class="featured-news-card" data-news-id="${featured.id}">
            <div class="featured-news-banner">
              <span class="featured-tag">🔥 BERITA UTAMA</span>
              <span class="featured-category">${featured.categoryBadge || featured.category}</span>
            </div>
            <div class="featured-news-body">
              <div class="news-meta">
                <span>📅 ${featured.date}</span>
                <span>•</span>
                <span>⏱️ ${featured.readTime || '3 min'}</span>
                <span>•</span>
                <span>✍️ ${featured.author || 'Tim Wildlands'}</span>
              </div>
              <h3 class="featured-title">${featured.title}</h3>
              <p class="featured-summary">${featured.summary}</p>
              <button class="btn-primary btn-sm btn-read-news" data-id="${featured.id}">Baca Selengkapnya →</button>
            </div>
          </div>
        ` : ''}

        <!-- ARTICLE CARDS GRID -->
        <div class="news-grid">
          ${filtered.map(article => {
            const isRead = this.data.isNewsRead(article.id);
            return `
              <div class="news-card ${isRead ? 'read' : 'unread'}" data-news-id="${article.id}">
                <div class="news-card-top">
                  <span class="news-badge ${article.category.toLowerCase().replace(/\s+/g, '-')}">${article.category}</span>
                  ${!isRead ? '<span class="unread-dot" title="Belum dibaca">BARU</span>' : ''}
                </div>

                <h4 class="news-title">${article.title}</h4>
                <p class="news-summary">${article.summary}</p>

                <div class="news-card-footer">
                  <div class="news-date">📅 ${article.date}</div>
                  <button class="btn-read-link btn-read-news" data-id="${article.id}">Buka Warta →</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- ARTICLE DETAIL MODAL -->
        <div id="news-detail-modal" class="modal-backdrop ${this.selectedArticle ? 'open' : ''}">
          ${this.selectedArticle ? this.renderArticleModal(this.selectedArticle) : ''}
        </div>
      </div>
    `;
  }

  renderArticleModal(article) {
    const formattedContent = article.content
      ? article.content.replace(/\n\n/g, '</p><p>').replace(/### (.*?)\n/g, '<h4>$1</h4>').replace(/\*\* (.*?)\*\*/g, '<strong>$1</strong>')
      : article.summary;

    return `
      <div class="modal-box news-modal">
        <div class="modal-header">
          <div class="modal-title-wrap">
            <span class="news-badge ${article.category.toLowerCase().replace(/\s+/g, '-')}">${article.category}</span>
            <div class="news-modal-meta">
              <span>📅 ${article.date}</span> • <span>✍️ ${article.author || 'Tim Pengembang'}</span>
            </div>
          </div>
          <button class="btn-close-modal" id="btn-close-news-modal">✕</button>
        </div>

        <div class="modal-body article-body">
          <h2 class="article-modal-title">${article.title}</h2>
          <div class="article-content-text">
            <p>${formattedContent}</p>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" id="btn-modal-dismiss-news">Tutup</button>
        </div>
      </div>
    `;
  }

  attachEvents(container) {
    // Category pills
    const pills = container.querySelectorAll('.pill-btn');
    pills.forEach(p => {
      p.addEventListener('click', (e) => {
        this.activeCategory = e.currentTarget.getAttribute('data-cat');
        this.mgr.rerenderCurrentTab();
      });
    });

    // Read article buttons
    const readBtns = container.querySelectorAll('.btn-read-news, .news-card, .featured-news-card');
    readBtns.forEach(el => {
      el.addEventListener('click', (e) => {
        // Prevent duplicate trigger if clicking inside
        const id = el.getAttribute('data-id') || el.getAttribute('data-news-id');
        if (id) {
          this.selectedArticle = this.data.news.find(x => x.id === id);
          this.data.markNewsRead(id);
          this.mgr.rerenderCurrentTab();
        }
      });
    });

    // Close modal
    const closeBtn = container.querySelector('#btn-close-news-modal');
    const dismissBtn = container.querySelector('#btn-modal-dismiss-news');
    const modalBackdrop = container.querySelector('#news-detail-modal');

    const closeModal = () => {
      this.selectedArticle = null;
      this.mgr.rerenderCurrentTab();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (dismissBtn) dismissBtn.addEventListener('click', closeModal);
    if (modalBackdrop) {
      modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) closeModal();
      });
    }
  }
}
