import { RPG_ITEMS, RPG_SHOPS } from './RPGConfig.js';

export class ShopUI {
  constructor(inventory, combat, inputManager, lobbyData = null, onWeaponEquipped = null) {
    this.inventory = inventory;
    this.combat = combat;
    this.input = inputManager;
    this.lobbyData = lobbyData;
    this.onWeaponEquipped = onWeaponEquipped;

    this.isOpen = false;
    this.currentShopType = 'all'; // 'all', 'weapon', 'armor', 'food'
    this.isProcessingTransaction = false;

    this.modalEl = null;
    this.gridEl = null;
    this.goldEl = null;
    this.headerIconEl = null;
    this.headerTitleEl = null;
    this.headerSubtitleEl = null;
    this.tabButtons = [];

    // Fallback catalog of available weapons for backward compatibility
    this.shopCatalog = RPG_SHOPS.weapon.items;

    this.initDOM();
  }

  getGold() {
    if (this.lobbyData && this.lobbyData.profile && typeof this.lobbyData.profile.gold === 'number') {
      return this.lobbyData.profile.gold;
    }
    return this.inventory?.gold || 0;
  }

  deductGold(amount) {
    if (this.lobbyData && this.lobbyData.profile && typeof this.lobbyData.profile.gold === 'number') {
      this.lobbyData.profile.gold = Math.max(0, this.lobbyData.profile.gold - amount);
      if (typeof this.lobbyData.saveLocal === 'function') {
        this.lobbyData.saveLocal();
      }
      return true;
    }
    if (this.inventory) {
      this.inventory.gold = Math.max(0, (this.inventory.gold || 0) - amount);
      return true;
    }
    return false;
  }

  refundGold(amount) {
    if (this.lobbyData && this.lobbyData.profile && typeof this.lobbyData.profile.gold === 'number') {
      this.lobbyData.profile.gold += amount;
      if (typeof this.lobbyData.saveLocal === 'function') {
        this.lobbyData.saveLocal();
      }
    } else if (this.inventory) {
      this.inventory.gold = (this.inventory.gold || 0) + amount;
    }
  }

  initDOM() {
    if (typeof document === 'undefined') return;
    this.modalEl = document.getElementById('rpg-shop-modal');
    this.gridEl = document.getElementById('shop-swords-grid');
    this.goldEl = document.getElementById('shop-player-gold');
    this.headerIconEl = document.getElementById('shop-header-icon');
    this.headerTitleEl = document.getElementById('shop-header-title');
    this.headerSubtitleEl = document.getElementById('shop-header-subtitle');

    const closeBtn = document.getElementById('btn-close-shop');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    if (this.modalEl) {
      this.modalEl.addEventListener('click', (e) => {
        if (e.target === this.modalEl) {
          this.close();
        }
      });
    }

    // Category navigation tabs
    this.tabButtons = Array.from(document.querySelectorAll('.shop-tab-btn'));
    this.tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        this.switchShopType(tab);
      });
    });

    // HUD Shop button
    const btnHudShop = document.getElementById('btn-hud-shop');
    if (btnHudShop) {
      btnHudShop.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggle();
      });
    }
  }

  switchShopType(shopType) {
    this.currentShopType = shopType || 'all';
    this.tabButtons.forEach((btn) => {
      if (btn.getAttribute('data-tab') === this.currentShopType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    this.updateHeaderInfo();
    this.render();
  }

  updateHeaderInfo() {
    if (this.currentShopType === 'weapon') {
      if (this.headerIconEl) this.headerIconEl.textContent = '⚔️';
      if (this.headerTitleEl) this.headerTitleEl.textContent = 'TOKO PEDANG & PUSAKA LEMBAH';
      if (this.headerSubtitleEl) this.headerSubtitleEl.textContent = 'Mang Asep • Ahli Pedang & Pandai Bilah Desa';
    } else if (this.currentShopType === 'armor') {
      if (this.headerIconEl) this.headerIconEl.textContent = '🛡️';
      if (this.headerTitleEl) this.headerTitleEl.textContent = 'TOKO ZIRAH & PERLENGKAPAN TEMPUR';
      if (this.headerSubtitleEl) this.headerSubtitleEl.textContent = 'Pandai Besi Barin • Ahli Zirah & Tempa Besi';
    } else if (this.currentShopType === 'food') {
      if (this.headerIconEl) this.headerIconEl.textContent = '🍞';
      if (this.headerTitleEl) this.headerTitleEl.textContent = 'TOKO MAKANAN & PERBEKALAN LEMBAH';
      if (this.headerSubtitleEl) this.headerSubtitleEl.textContent = 'Ibu Mina • Pedagang Roti & Bahan Herbal';
    } else {
      if (this.headerIconEl) this.headerIconEl.textContent = '🏪';
      if (this.headerTitleEl) this.headerTitleEl.textContent = 'PASAR NIAGA & TOKO DESA';
      if (this.headerSubtitleEl) this.headerSubtitleEl.textContent = 'Katalog Lengkap Perlengkapan Petualang';
    }
  }

  toggle(shopType = 'all') {
    if (this.isOpen) {
      this.close();
    } else {
      this.open(shopType);
    }
  }

  open(shopType = 'all') {
    this.isOpen = true;
    if (this.input) {
      this.input.exitPointerLock();
    }
    this.switchShopType(shopType);
    if (this.modalEl) {
      this.modalEl.style.display = 'flex';
    }
  }

  close() {
    this.isOpen = false;
    if (this.modalEl) {
      this.modalEl.style.display = 'none';
    }
    if (this.input) {
      this.input.requestPointerLock();
    }
  }

  getItemsForCurrentShop() {
    if (this.currentShopType === 'weapon' && RPG_SHOPS.weapon) {
      return RPG_SHOPS.weapon.items;
    }
    if (this.currentShopType === 'armor' && RPG_SHOPS.armor) {
      return RPG_SHOPS.armor.items;
    }
    if (this.currentShopType === 'food' && RPG_SHOPS.food) {
      return RPG_SHOPS.food.items;
    }

    // 'all': Unique union of all items
    const set = new Set();
    Object.values(RPG_SHOPS).forEach((sh) => {
      sh.items.forEach((id) => set.add(id));
    });
    return Array.from(set);
  }

  render() {
    if (!this.gridEl || !this.inventory) return;

    // Update player gold badge
    const currentGold = this.getGold();
    if (this.goldEl) {
      this.goldEl.textContent = `${currentGold.toLocaleString()} Emas`;
    }

    this.gridEl.innerHTML = '';
    const itemsToShow = this.getItemsForCurrentShop();

    for (const itemId of itemsToShow) {
      const item = RPG_ITEMS[itemId];
      if (!item) continue;

      const card = document.createElement('div');
      card.className = `sword-shop-card rarity-${item.rarity || 'common'}`;

      // Check equipped status across slots
      let isEquipped = false;
      const targetSlot = item.equipSlot || (item.type === 'armor' ? 'armor_chest' : item.type);
      if (this.inventory.equipped && this.inventory.equipped[targetSlot]) {
        const curEquippedId = typeof this.inventory.equipped[targetSlot] === 'string'
          ? this.inventory.equipped[targetSlot]
          : this.inventory.equipped[targetSlot]?.id;
        isEquipped = curEquippedId === item.id;
      }

      const hasInBag = this.inventory.hasItem ? this.inventory.hasItem(item.id) : false;
      const bagCount = this.inventory.getItemCount ? this.inventory.getItemCount(item.id) : 0;
      const isOwnedGear = (item.type === 'weapon' || item.type === 'shield' || item.type === 'armor') && (isEquipped || hasInBag);
      const canAfford = currentGold >= item.value;
      const playerLevel = this.inventory.level || 1;
      const meetsLevel = !item.levelReq || playerLevel >= item.levelReq;

      // Stats list chips HTML
      let statsHtml = '';
      if (item.stats) {
        if (item.stats.attack) statsHtml += `<span class="sword-stat-chip">⚔️ ATK +${item.stats.attack}</span>`;
        if (item.stats.defense) statsHtml += `<span class="sword-stat-chip">🛡️ DEF +${item.stats.defense}</span>`;
        if (item.stats.maxHp) statsHtml += `<span class="sword-stat-chip">❤️ HP +${item.stats.maxHp}</span>`;
        if (item.stats.critChance) statsHtml += `<span class="sword-stat-chip">🎯 Crit +${Math.round(item.stats.critChance * 100)}%</span>`;
        if (item.stats.maxStamina) statsHtml += `<span class="sword-stat-chip">⚡ Stamina +${item.stats.maxStamina}</span>`;
        if (item.stats.blockRate) statsHtml += `<span class="sword-stat-chip">🛡️ Block +${Math.round(item.stats.blockRate * 100)}%</span>`;
      }
      if (item.effect) {
        if (item.effect.type === 'heal_hp') statsHtml += `<span class="sword-stat-chip">❤️ Pulihkan +${item.effect.amount} HP</span>`;
        if (item.effect.type === 'restore_sta') statsHtml += `<span class="sword-stat-chip">⚡ Pulihkan +${item.effect.amount} Stamina</span>`;
        if (item.effect.type === 'heal_hybrid') statsHtml += `<span class="sword-stat-chip">❤️ +${item.effect.hp} HP &nbsp;⚡ +${item.effect.sta} STA</span>`;
      }

      // Level requirement badge
      let levelReqHtml = '';
      if (item.levelReq) {
        levelReqHtml = `<span class="sword-stat-chip" style="${meetsLevel ? 'color: #38bdf8;' : 'color: #ef4444;'}">Syarat: Lv. ${item.levelReq}</span>`;
      }

      // Ownership badge for consumables
      let bagCountHtml = '';
      if (item.type === 'consumable' && bagCount > 0) {
        bagCountHtml = `<span class="sword-stat-chip" style="color: #34d399;">Dimiliki: x${bagCount}</span>`;
      }

      // Action button
      let btnHtml = '';
      if (isEquipped) {
        btnHtml = `<button class="btn-sword-action equipped" disabled type="button">✓ Sedang Dipakai</button>`;
      } else if (isOwnedGear) {
        btnHtml = `<button class="btn-sword-action equip" type="button">🛡️ Pasang Perlengkapan</button>`;
      } else {
        btnHtml = `<button class="btn-sword-action buy ${canAfford && meetsLevel ? 'can-afford' : 'disabled'}" type="button">🪙 Beli (${item.value} Emas)</button>`;
      }

      card.innerHTML = `
        <div class="sword-card-banner">
          <span class="sword-rarity-pill ${item.rarity || 'common'}">${(item.rarity || 'common').toUpperCase()}</span>
          <div class="sword-icon-display">${item.icon || '📦'}</div>
        </div>
        <div class="sword-card-content">
          <h3 class="sword-name">${item.name}</h3>
          <span class="sword-category">${item.category || 'Barang'}</span>
          <p class="sword-desc">${item.description}</p>
          <div class="sword-stats-row">${statsHtml} ${levelReqHtml} ${bagCountHtml}</div>
          <div class="sword-card-footer">
            <div class="sword-price-tag">
              <span class="price-icon">🪙</span>
              <span class="price-val">${item.value} Emas</span>
            </div>
            ${btnHtml}
          </div>
        </div>
      `;

      // Event listener
      const actionBtn = card.querySelector('.btn-sword-action');
      if (actionBtn && !isEquipped) {
        actionBtn.addEventListener('click', () => {
          this.handleItemAction(item, isOwnedGear, canAfford, meetsLevel);
        });
      }

      this.gridEl.appendChild(card);
    }
  }

  showToast(msg, type = 'info') {
    if (typeof window !== 'undefined' && typeof window.__showWildlandsToast === 'function') {
      window.__showWildlandsToast(msg, type);
    }
  }

  handleItemAction(item, isOwnedGear, canAfford, meetsLevel) {
    if (this.isProcessingTransaction) return;
    this.isProcessingTransaction = true;
    setTimeout(() => { this.isProcessingTransaction = false; }, 250);

    // If player already owns gear and clicks equip
    if (isOwnedGear) {
      if (typeof this.inventory.equipItem === 'function') {
        const ok = this.inventory.equipItem(item.id);
        if (ok && item.type === 'weapon' && this.onWeaponEquipped) {
          this.onWeaponEquipped(item);
        }
      }
      this.showToast(`🛡️ Berhasil memasang ${item.name}! Statistik diperbarui.`, 'success');
      this.render();
      return;
    }

    // Level requirement check
    if (!meetsLevel) {
      this.isProcessingTransaction = false;
      this.showToast(`⚠️ Level Anda belum mencukupi untuk ${item.name}! Butuh Lv. ${item.levelReq}.`, 'error');
      return;
    }

    // Gold balance check
    if (!canAfford) {
      this.isProcessingTransaction = false;
      this.showToast(`🪙 Emas tidak cukup! Anda memerlukan ${item.value} Emas. Selesaikan misi atau kalahkan musuh untuk mendapatkan emas.`, 'error');
      return;
    }

    // Deduct gold
    this.deductGold(item.value);
    const added = this.inventory.addItem(item.id, 1);
    if (!added) {
      this.isProcessingTransaction = false;
      this.refundGold(item.value);
      this.showToast('🎒 Tas inventaris penuh! Kosongkan ruang terlebih dahulu.', 'error');
      return;
    }

    // Play coin buy audio
    if (this.combat && this.combat.audio && typeof this.combat.audio.playCoinBuy === 'function') {
      this.combat.audio.playCoinBuy();
    }

    // Auto-equip purchased weapons, shields, and armor
    if (item.type === 'weapon' || item.type === 'shield' || item.type === 'armor') {
      if (typeof this.inventory.equipItem === 'function') {
        this.inventory.equipItem(item.id);
      }
      if (item.type === 'weapon' && this.onWeaponEquipped) {
        this.onWeaponEquipped(item);
      }
      this.showToast(`🎉 Berhasil membeli ${item.name} seharga ${item.value} Emas dan langsung dipasang!`, 'success');
    } else {
      this.showToast(`🎉 Berhasil membeli ${item.name} x1 seharga ${item.value} Emas! Tersimpan di tas.`, 'success');
    }

    this.render();
  }

  handleSwordAction(item, isOwnedGear, canAfford, meetsLevel = true) {
    return this.handleItemAction(item, isOwnedGear, canAfford, meetsLevel);
  }
}
