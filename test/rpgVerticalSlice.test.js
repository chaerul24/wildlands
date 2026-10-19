import assert from 'assert';
import { RPG_ITEMS, RPG_QUESTS, RPG_LOOT_TABLES, calculatePlayerStats } from '../client/src/rpg/RPGConfig.js';
import { InventoryManager } from '../client/src/rpg/InventoryManager.js';
import { QuestManager } from '../client/src/rpg/QuestManager.js';

console.log('🧪 ========================================================');
console.log('🧪 WILDLANDS RPG VERTICAL SLICE INTEGRATION TEST');
console.log('🧪 ========================================================');

async function runTestSuite() {
  let passedCount = 0;

  // 1. TEST STATS FORMULA
  console.log('[Test 1] Testing RPG Stat Progression Formulas...');
  const baseStats = calculatePlayerStats(1, {});
  assert.strictEqual(baseStats.maxHp, 100, 'Base HP should be 100 at Lv 1');
  assert.strictEqual(baseStats.attack, 16, 'Base Attack should be 16 at Lv 1');

  const knightEquip = {
    weapon: 'wpn_knight_blade',
    shield: 'shd_valley_shield',
    armor: 'arm_guard_chainmail'
  };
  const gearedStats = calculatePlayerStats(3, knightEquip);
  assert.ok(gearedStats.attack > 50, `Geared attack should be > 50 (got ${gearedStats.attack})`);
  assert.ok(gearedStats.defense > 30, `Geared defense should be > 30 (got ${gearedStats.defense})`);
  console.log(`  ✓ Lv. 3 Geared Stats: HP=${gearedStats.maxHp}, STA=${gearedStats.maxStamina}, ATK=${gearedStats.attack}, DEF=${gearedStats.defense}`);
  passedCount++;

  // 2. TEST INVENTORY MANAGER
  console.log('[Test 2] Testing Inventory Manager & Equipment Swapping...');
  const inv = new InventoryManager(1);
  assert.ok(inv.hasItem('potion_hp', 2), 'Default inventory should have at least 2 HP potions');

  inv.addItem('wpn_knight_blade', 1);
  assert.strictEqual(inv.hasItem('wpn_knight_blade', 1), true, 'Should have knight blade in bag');

  // Equip knight blade
  const equipOk = inv.equipItem('wpn_knight_blade');
  assert.strictEqual(equipOk, true, 'Equipping knight blade should succeed');
  assert.strictEqual(inv.equipped.weapon, 'wpn_knight_blade', 'Active weapon should be knight blade');
  assert.strictEqual(inv.hasItem('wpn_wood_sword', 1), true, 'Old wood sword should return to bag');

  // Unequip weapon
  inv.unequipItem('weapon');
  assert.strictEqual(inv.equipped.weapon, null, 'Weapon slot should be empty');
  assert.strictEqual(inv.hasItem('wpn_knight_blade', 1), true, 'Knight blade returned to bag');
  console.log('  ✓ Inventory equip/unequip cycle and bag slot transfers validated.');
  passedCount++;

  // 3. TEST LOOT TABLE
  console.log('[Test 3] Testing Warrior Marauder Loot Table Drop Rules...');
  const lootTable = RPG_LOOT_TABLES.warrior_marauder;
  assert.ok(lootTable.goldMin >= 30, 'Loot table must award at least 30 gold');
  const hasInsignia = lootTable.guaranteed.some(g => g.itemId === 'quest_marauder_insignia');
  assert.strictEqual(hasInsignia, true, 'Loot table must guarantee Marauder Insignia quest item drop');
  console.log('  ✓ Guaranteed quest drop and gold boundaries validated.');
  passedCount++;

  // 4. TEST COMPLETE QUEST WORKFLOW
  console.log('[Test 4] Testing End-to-End Quest Flow ("Ancaman di Rumah Tua")...');
  const mockLobby = {
    profile: { xp: 0, level: 1, xpNext: 150, gold: 50 },
    addXP(amt) { this.profile.xp += amt; },
    addGold(amt) { this.profile.gold += amt; }
  };

  const questMgr = new QuestManager(inv, mockLobby);
  assert.strictEqual(questMgr.getQuestState('quest_marauder_threat'), 'AVAILABLE');

  // Step A: Accept quest
  const acceptOk = questMgr.acceptQuest('quest_marauder_threat');
  assert.strictEqual(acceptOk, true, 'Should accept quest');
  assert.strictEqual(questMgr.getQuestState('quest_marauder_threat'), 'ACTIVE');
  console.log('  ✓ Step A: Quest accepted from Penjaga Rian.');

  // Step B: Player moves to Old House (-55, -35)
  questMgr.onPlayerMoved({ x: -55, z: -35 });
  const qInstance = questMgr.activeQuests.get('quest_marauder_threat');
  assert.strictEqual(qInstance.objectives[0].completed, true, 'Objective 1 (Reach House) should be complete');
  console.log('  ✓ Step B: Reached Old Weathered House location.');

  // Step C: Player defeats Warrior Marauder
  questMgr.onEnemyDefeated('warrior_marauder_01');
  assert.strictEqual(qInstance.objectives[1].completed, true, 'Objective 2 (Defeat Marauder) should be complete');
  console.log('  ✓ Step C: Defeated Warrior Marauder enemy.');

  // Step D: Player loots Marauder Insignia from 3D drop
  inv.addItem('quest_marauder_insignia', 1);
  questMgr.onLootCollected({ items: [{ itemId: 'quest_marauder_insignia', count: 1 }] });
  assert.strictEqual(qInstance.objectives[2].completed, true, 'Objective 3 (Collect Insignia) should be complete');
  console.log('  ✓ Step D: Collected Marauder Insignia trophy.');

  // Step E: Player reports back to Penjaga Rian
  questMgr.onTalkedToNpc('npc_rian');
  assert.strictEqual(qInstance.objectives[3].completed, true, 'Objective 4 (Report to Rian) should be complete');
  assert.strictEqual(questMgr.canTurnIn('quest_marauder_threat'), true, 'Quest should be ready to turn in');
  console.log('  ✓ Step E: Reported back to Penjaga Rian. Ready to turn in!');

  // Step F: Complete quest & claim rewards
  const completeOk = questMgr.completeQuest('quest_marauder_threat');
  assert.strictEqual(completeOk, true, 'Turning in quest should succeed');
  assert.strictEqual(questMgr.getQuestState('quest_marauder_threat'), 'COMPLETED');
  assert.strictEqual(mockLobby.profile.xp, 350, 'Player should receive 350 XP');
  assert.strictEqual(mockLobby.profile.gold, 200, 'Player should receive +150 Gold (total 200)');
  assert.strictEqual(inv.hasItem('wpn_knight_blade', 1), true, 'Player should receive Valley Knight Blade reward');
  assert.strictEqual(inv.hasItem('quest_marauder_insignia', 1), false, 'Quest item should be consumed on turn in');
  console.log('  ✓ Step F: Quest completed! Rewards (XP, Gold, Valley Knight Blade) successfully granted.');
  passedCount++;

  // 5. TEST SAVE / LOAD SERIALIZATION
  console.log('[Test 5] Testing Save/Load State Integrity...');
  const serializedInv = inv.serialize();
  const serializedQuests = questMgr.serialize();

  const freshInv = new InventoryManager(1);
  freshInv.deserialize(serializedInv);
  assert.strictEqual(freshInv.hasItem('wpn_knight_blade', 1), true, 'Restored inventory must contain knight blade');

  const freshQuestMgr = new QuestManager(freshInv, mockLobby);
  freshQuestMgr.deserialize(serializedQuests);
  assert.strictEqual(freshQuestMgr.completedQuests.has('quest_marauder_threat'), true, 'Restored quests must retain completion');
  console.log('  ✓ Save serialization and full restoration verified 100%.');
  passedCount++;

  console.log('🧪 ========================================================');
  console.log(`🧪 ALL ${passedCount} RPG VERTICAL SLICE INTEGRATION TESTS PASSED!`);
  console.log('🧪 ========================================================');
}

runTestSuite().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
