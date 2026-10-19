import { RPG_ITEMS, calculatePlayerStats } from './RPGConfig.js';

export class InventoryManager {
  constructor(playerLevel = 1, onStatsChanged = null, onToast = null) {
    this.maxSlots = 16;
    this.items = []; // Array of { id, count }
    this.equipped = {
      weapon: 'wpn_wood_sword',
      shield: 'shd_wood_buckler',
      armor_head: null,
      armor_chest: 'arm_leather_tunic',
      armor_gloves: null,
      armor_legs: null,
      armor_boots: null
    };

    // Backward compatibility alias for legacy 'armor' slot
    Object.defineProperty(this.equipped, 'armor', {
      get: () => this.equipped.armor_chest,
      set: (val) => { this.equipped.armor_chest = val; },
      enumerable: true,
      configurable: true
    });

    this.level = playerLevel;
    this.onStatsChanged = onStatsChanged;
    this.onToast = onToast;

    // Initial default items for a fresh explorer
    this.initDefaultInventory();
  }

  initDefaultInventory() {
    this.items = [
      { id: 'potion_hp', count: 3 },
      { id: 'potion_sta', count: 2 },
      { id: 'food_valley_bread', count: 2 }
    ];
  }

  getStats() {
    return calculatePlayerStats(this.level, this.equipped);
  }

  setLevel(level) {
    this.level = level;
    if (this.onStatsChanged) {
      this.onStatsChanged(this.getStats());
    }
  }

  // --- INVENTORY OPERATIONS ---
  addItem(itemId, count = 1) {
    const itemDef = RPG_ITEMS[itemId];
    if (!itemDef) {
      console.warn(`[Inventory] Item ID ${itemId} not found in database.`);
      return false;
    }

    if (itemDef.stackable) {
      const existing = this.items.find(slot => slot.id === itemId);
      if (existing) {
        existing.count += count;
        this.notifyChange(`Diterima: ${itemDef.name} x${count}`, 'success');
        return true;
      }
    }

    // Check empty slot
    if (this.items.length >= this.maxSlots) {
      this.notifyChange('Tas inventaris sudah penuh!', 'warning');
      return false;
    }

    this.items.push({ id: itemId, count });
    this.notifyChange(`Diterima: ${itemDef.name} x${count}`, 'success');
    return true;
  }

  removeItem(itemId, count = 1) {
    const idx = this.items.findIndex(slot => slot.id === itemId);
    if (idx === -1) return false;

    if (this.items[idx].count > count) {
      this.items[idx].count -= count;
    } else {
      this.items.splice(idx, 1);
    }
    return true;
  }

  hasItem(itemId, count = 1) {
    const slot = this.items.find(s => s.id === itemId);
    return Boolean(slot && slot.count >= count);
  }

  getItemCount(itemId) {
    const slot = this.items.find(s => s.id === itemId);
    return slot ? slot.count : 0;
  }

  // --- ITEM USAGE & EQUIPMENT ---
  useItem(itemId, combatRef = null) {
    const itemDef = RPG_ITEMS[itemId];
    if (!itemDef) return false;

    if (itemDef.type === 'consumable') {
      if (!this.hasItem(itemId, 1)) return false;

      let applied = false;
      if (itemDef.effect && itemDef.effect.type === 'heal_hp') {
        if (combatRef) {
          applied = combatRef.healPlayer(itemDef.effect.amount);
        }
      } else if (itemDef.effect && itemDef.effect.type === 'restore_sta') {
        if (combatRef) {
          applied = combatRef.restoreStamina(itemDef.effect.amount);
        }
      } else if (itemDef.effect && itemDef.effect.type === 'heal_hybrid') {
        if (combatRef) {
          const h = combatRef.healPlayer(itemDef.effect.hp);
          const s = combatRef.restoreStamina(itemDef.effect.sta);
          applied = h || s;
        }
      }

      if (applied) {
        this.removeItem(itemId, 1);
        this.notifyChange(`Menggunakan ${itemDef.name}`, 'info');
        if (combatRef && combatRef.audio && combatRef.audio.playPotionDrink) {
          combatRef.audio.playPotionDrink();
        }
        return true;
      } else {
        this.notifyChange('Kondisi sudah penuh!', 'info');
        return false;
      }
    } else if (itemDef.type === 'weapon' || itemDef.type === 'shield' || itemDef.type === 'armor') {
      return this.equipItem(itemId);
    }

    return false;
  }

  equipItem(itemId) {
    const itemDef = RPG_ITEMS[itemId];
    if (!itemDef) return false;

    // Resolve specific target slot
    let slot = itemDef.equipSlot || itemDef.type;
    if (slot === 'armor') slot = 'armor_chest';

    // Level requirement check
    if (itemDef.levelReq && this.level < itemDef.levelReq) {
      this.notifyChange(`Level belum cukup! Butuh Level ${itemDef.levelReq}`, 'warning');
      return false;
    }

    // Check if player has it in inventory
    const inInv = this.items.find(s => s.id === itemId);
    if (!inInv) return false;

    // Unequip currently equipped item in this slot and return to inventory
    const oldEquippedId = this.equipped[slot];
    this.removeItem(itemId, 1);

    if (oldEquippedId) {
      this.items.push({ id: oldEquippedId, count: 1 });
    }

    this.equipped[slot] = itemId;
    this.notifyChange(`Memasang: ${itemDef.name}`, 'info');

    if (this.onStatsChanged) {
      this.onStatsChanged(this.getStats());
    }
    return true;
  }

  unequipItem(slot) {
    const currentId = this.equipped[slot];
    if (!currentId) return false;

    if (this.items.length >= this.maxSlots) {
      this.notifyChange('Tas inventaris penuh untuk melepas gear!', 'warning');
      return false;
    }

    this.equipped[slot] = null;
    this.items.push({ id: currentId, count: 1 });

    const itemDef = RPG_ITEMS[currentId];
    this.notifyChange(`Melepas: ${itemDef ? itemDef.name : slot}`, 'info');

    if (this.onStatsChanged) {
      this.onStatsChanged(this.getStats());
    }
    return true;
  }

  updateHotbarDOM() {
    if (typeof document === 'undefined') return;
    const c1 = document.getElementById('hotbar-count-1');
    const c2 = document.getElementById('hotbar-count-2');
    const c4 = document.getElementById('hotbar-count-4');
    if (c1) {
      const cnt = this.getItemCount('potion_hp');
      c1.textContent = cnt > 0 ? `x${cnt}` : '';
      c1.parentElement?.style.setProperty('opacity', cnt > 0 ? '1' : '0.45');
    }
    if (c2) {
      const cnt = this.getItemCount('potion_sta');
      c2.textContent = cnt > 0 ? `x${cnt}` : '';
      c2.parentElement?.style.setProperty('opacity', cnt > 0 ? '1' : '0.45');
    }
    if (c4) {
      const cnt = this.getItemCount('mat_iron_ore');
      c4.textContent = cnt > 0 ? `x${cnt}` : '';
    }
  }

  notifyChange(msg, type = 'info') {
    this.updateHotbarDOM();
    if (this.onToast) {
      this.onToast(msg, type);
    }
  }

  // --- SERIALIZATION FOR PERSISTENCE ---
  serialize() {
    return {
      items: JSON.parse(JSON.stringify(this.items)),
      equipped: { ...this.equipped }
    };
  }

  deserialize(data) {
    if (!data) return;
    if (Array.isArray(data.items)) {
      this.items = data.items.filter(s => s && s.id && RPG_ITEMS[s.id]);
    }
    if (data.equipped) {
      this.equipped.weapon = data.equipped.weapon || null;
      this.equipped.shield = data.equipped.shield || null;
      this.equipped.armor_head = data.equipped.armor_head || null;
      this.equipped.armor_chest = data.equipped.armor_chest || data.equipped.armor || null;
      this.equipped.armor_gloves = data.equipped.armor_gloves || null;
      this.equipped.armor_legs = data.equipped.armor_legs || null;
      this.equipped.armor_boots = data.equipped.armor_boots || null;
    }
    if (this.onStatsChanged) {
      this.onStatsChanged(this.getStats());
    }
    this.updateHotbarDOM();
  }
}
