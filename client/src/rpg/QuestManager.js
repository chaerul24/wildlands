import { RPG_QUESTS, RPG_ITEMS } from './RPGConfig.js';

function showToast(msg, type = 'info') {
  if (typeof window !== 'undefined' && window.__showWildlandsToast) {
    window.__showWildlandsToast(msg, type);
  }
}

export class QuestManager {
  constructor(inventoryManager, lobbyData = null, combatAudio = null) {
    this.inventory = inventoryManager;
    this.lobbyData = lobbyData;
    this.audio = combatAudio;

    this.activeQuests = new Map(); // questId -> questState
    this.completedQuests = new Set();

    // Callbacks
    this.onQuestUpdated = null;

    // Start with default available quest for the vertical slice
    this.initDefaultQuests();
  }

  initDefaultQuests() {
    // If player has not yet completed quest_marauder_threat, make it available
  }

  getQuestState(questId) {
    if (this.completedQuests.has(questId)) {
      return 'COMPLETED';
    }
    if (this.activeQuests.has(questId)) {
      const q = this.activeQuests.get(questId);
      const allDone = q.objectives.every(obj => obj.completed);
      return allDone ? 'READY_TO_TURN_IN' : 'ACTIVE';
    }
    return 'AVAILABLE';
  }

  canAcceptQuest(questId) {
    return this.getQuestState(questId) === 'AVAILABLE' && !!RPG_QUESTS[questId];
  }

  acceptQuest(questId) {
    if (!this.canAcceptQuest(questId)) return false;

    const template = RPG_QUESTS[questId];
    // Deep clone objectives
    const questInstance = {
      id: template.id,
      title: template.title,
      npcId: template.npcId,
      npcName: template.npcName,
      summary: template.summary,
      objectives: template.objectives.map(obj => ({
        ...obj,
        completed: false,
        currentCount: 0
      })),
      acceptedTime: Date.now()
    };

    this.activeQuests.set(questId, questInstance);

    if (this.audio && this.audio.playQuestAccept) {
      this.audio.playQuestAccept();
    }

    showToast(`📜 Misi Diterima: ${template.title}`, 'info');

    this.notifyUpdate();
    return true;
  }

  canTurnIn(questId) {
    return this.getQuestState(questId) === 'READY_TO_TURN_IN';
  }

  completeQuest(questId) {
    if (!this.canTurnIn(questId)) return false;

    const template = RPG_QUESTS[questId];
    if (!template) return false;

    // 1. Remove required quest items from inventory
    for (const obj of template.objectives) {
      if (obj.type === 'collect_item' && obj.targetItemId) {
        this.inventory.removeItem(obj.targetItemId, obj.requiredCount || 1);
      }
    }

    // 2. Grant rewards
    if (template.rewards) {
      // XP
      if (template.rewards.xp && this.lobbyData) {
        this.lobbyData.addXP(template.rewards.xp);
      }
      // Gold
      if (template.rewards.gold && this.lobbyData) {
        this.lobbyData.addGold(template.rewards.gold);
      }
      // Items
      if (Array.isArray(template.rewards.items)) {
        for (const it of template.rewards.items) {
          this.inventory.addItem(it.itemId, it.count || 1);
        }
      }
    }

    // 3. Mark completed
    this.activeQuests.delete(questId);
    this.completedQuests.add(questId);

    // 4. Audio fanfare
    if (this.audio && this.audio.playQuestComplete) {
      this.audio.playQuestComplete();
    }

    // 5. Toast
    showToast(`🏆 Misi Selesai: ${template.title}! (+${template.rewards.xp} XP & +${template.rewards.gold} Emas)`, 'success');

    this.notifyUpdate();
    return true;
  }

  // --- OBJECTIVE PROGRESSION HOOKS ---
  onPlayerMoved(pos) {
    if (!pos) return;
    let changed = false;

    for (const quest of this.activeQuests.values()) {
      for (const obj of quest.objectives) {
        if (!obj.completed && obj.type === 'reach_location' && obj.targetLocation) {
          const dx = pos.x - obj.targetLocation.x;
          const dz = pos.z - obj.targetLocation.z;
          const distSq = dx * dx + dz * dz;
          const rad = obj.targetLocation.radius || 15;

          if (distSq <= rad * rad) {
            obj.completed = true;
            changed = true;
            showToast(`✓ Tujuan Terpenuhi: ${obj.text}`, 'info');
          }
        }
      }
    }

    if (changed) this.notifyUpdate();
  }

  onEnemyDefeated(enemyId) {
    let changed = false;

    for (const quest of this.activeQuests.values()) {
      for (const obj of quest.objectives) {
        if (!obj.completed && obj.type === 'kill_enemy') {
          if (!obj.targetEnemyId || obj.targetEnemyId === enemyId || enemyId.includes('warrior_marauder')) {
            obj.currentCount = (obj.currentCount || 0) + 1;
            const req = obj.requiredCount || 1;
            if (obj.currentCount >= req) {
              obj.completed = true;
            }
            obj.text = `Kalahkan Warrior Marauder (${obj.currentCount}/${req})`;
            changed = true;
            showToast(`✓ Sasaran Terpenuhi: ${obj.text}`, 'info');
          }
        }
      }
    }

    if (changed) this.notifyUpdate();
  }

  onLootCollected(lootData) {
    let changed = false;

    for (const quest of this.activeQuests.values()) {
      for (const obj of quest.objectives) {
        if (!obj.completed && obj.type === 'collect_item') {
          const hasInLoot = lootData.items.some(it => it.itemId === obj.targetItemId);
          const hasInBag = this.inventory.getItemCount(obj.targetItemId);
          const totalCount = hasInBag;

          const req = obj.requiredCount || 1;
          obj.currentCount = Math.min(req, totalCount);
          if (obj.currentCount >= req) {
            obj.completed = true;
          }
          const itemDef = RPG_ITEMS[obj.targetItemId];
          const name = itemDef ? itemDef.name : obj.targetItemId;
          obj.text = `Ambil ${name} dari rampasan (${obj.currentCount}/${req})`;
          changed = true;
        }
      }
    }

    if (changed) this.notifyUpdate();
  }

  onTalkedToNpc(npcId) {
    let changed = false;

    for (const quest of this.activeQuests.values()) {
      // Check if all non-talk objectives are done
      const otherObjsDone = quest.objectives.filter(o => o.type !== 'talk_npc').every(o => o.completed);
      if (otherObjsDone) {
        for (const obj of quest.objectives) {
          if (!obj.completed && obj.type === 'talk_npc' && obj.targetNpcId === npcId) {
            obj.completed = true;
            changed = true;
          }
        }
      }
    }

    if (changed) this.notifyUpdate();
  }

  notifyUpdate() {
    if (this.onQuestUpdated) {
      this.onQuestUpdated(this.getActiveQuestsList());
    }
  }

  getActiveQuestsList() {
    return Array.from(this.activeQuests.values());
  }

  // --- SERIALIZATION ---
  serialize() {
    return {
      active: Array.from(this.activeQuests.entries()),
      completed: Array.from(this.completedQuests)
    };
  }

  deserialize(data) {
    if (!data) return;
    if (Array.isArray(data.active)) {
      this.activeQuests = new Map(data.active);
    }
    if (Array.isArray(data.completed)) {
      this.completedQuests = new Set(data.completed);
    }
    this.notifyUpdate();
  }
}
