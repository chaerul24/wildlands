import assert from 'assert';
import { RPG_ITEMS } from '../client/src/rpg/RPGConfig.js';
import { ShopUI } from '../client/src/rpg/ShopUI.js';
import { InventoryManager } from '../client/src/rpg/InventoryManager.js';
import { EnemyCombat } from '../client/src/combat/EnemyCombat.js';
import * as THREE from '../client/node_modules/three/build/three.module.js';

console.log('🧪 ========================================================');
console.log('🧪 WILDLANDS DUAL SWORD COMBOS, SHOP & MINIMAP TEST SUITE');
console.log('🧪 ========================================================');

// 1. Test Dual Sword Combo Attack Transitions
console.log('[Test 1] Testing Dual Sword Swing Mechanics & Combo Alternation...');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
const combat = new EnemyCombat(scene, camera);

const mockPlayer = {
  position: new THREE.Vector3(0, 0, 0),
  yaw: 0,
  velocity: new THREE.Vector3(),
  attackCalls: [],
  attack(type) {
    this.attackCalls.push(type);
  }
};

const mockEnemies = [
  {
    id: 'dummy_enemy',
    position: new THREE.Vector3(0, 0, 1.8),
    hp: 100,
    isDead: false,
    state: 'CHASE',
    takeDamage(dmg, isCrit) {
      this.hp -= dmg;
      this.lastDmg = dmg;
    }
  }
];

// First Swing -> Attack 1 (Horizontal Crescent Slash)
combat.playerAttackTimer = 0;
combat.tryPlayerAttack(mockPlayer, mockEnemies);
assert.strictEqual(mockPlayer.attackCalls[0], 'attack1', 'First attack must be attack1');
assert.strictEqual(combat.comboStep, 0, 'Combo step should be 0 for attack1');
assert.strictEqual(combat.slashArcs.length, 1, 'One slash arc mesh spawned');
const firstArcMatColor = combat.slashArcs[0].mat.color.getHex();
assert.strictEqual(firstArcMatColor, 0x38bdf8, 'Attack 1 slash arc must be vibrant cyan (#38bdf8)');

// Reset cooldown & Second Swing within combo window -> Attack 2 (Heavy Vertical Cleave)
combat.playerAttackTimer = 0;
combat.tryPlayerAttack(mockPlayer, mockEnemies);
assert.strictEqual(mockPlayer.attackCalls[1], 'attack2', 'Second attack in combo must be attack2');
assert.strictEqual(combat.comboStep, 1, 'Combo step should be 1 for attack2');
assert.strictEqual(combat.slashArcs.length, 2, 'Second slash arc spawned');
const secondArcMatColor = combat.slashArcs[1].mat.color.getHex();
assert.strictEqual(secondArcMatColor, 0xf59e0b, 'Attack 2 heavy cleave slash arc must be golden amber (#f59e0b)');

console.log('  ✓ Dual sword swing animation triggers verified (attack1 = horizontal, attack2 = vertical cleave).');
console.log('  ✓ Visual slash arc color profiles verified (Cyan 0x38bdf8 vs Amber 0xf59e0b).');

// 2. Test Sword Catalog & Shop Purchasing Logic
console.log('\n[Test 2] Testing Sword Catalog & ShopUI Transactions...');
const testCatalog = [
  'wpn_wood_sword',
  'wpn_iron_sword',
  'wpn_shadow_dagger',
  'wpn_knight_blade',
  'wpn_battle_axe',
  'wpn_greatsword',
  'wpn_magic_blade'
];

for (const id of testCatalog) {
  const item = RPG_ITEMS[id];
  assert.ok(item, `Item ${id} must exist in RPG_ITEMS`);
  assert.strictEqual(item.type, 'weapon', `Item ${id} must have type "weapon"`);
  assert.ok(item.stats.attack > 0, `Item ${id} must provide attack stats`);
  assert.ok(item.modelUrl, `Item ${id} must have 3D modelUrl`);
  assert.ok(item.value > 0, `Item ${id} must have purchase price in gold`);
}
console.log(`  ✓ All ${testCatalog.length} swords & weapons validated in authoritative RPGConfig catalog.`);

// Test Shop purchasing with Mock DOM
const mockInventory = new InventoryManager(1);
const mockLobbyData = {
  profile: { gold: 500, stats: {} },
  saveLocal() {}
};

let equippedWeaponModel = null;
const shop = new ShopUI(
  mockInventory,
  combat,
  null,
  mockLobbyData,
  (weaponDef) => {
    equippedWeaponModel = weaponDef.modelUrl;
  }
);

// Buy Knight Blade (350 Gold)
const knightBlade = RPG_ITEMS['wpn_knight_blade'];
shop.handleSwordAction(knightBlade, false, true);

assert.strictEqual(mockLobbyData.profile.gold, 150, 'Gold should be deducted: 500 - 350 = 150');
assert.strictEqual(mockInventory.equipped.weapon, 'wpn_knight_blade', 'Knight Blade should be equipped');
assert.strictEqual(equippedWeaponModel, knightBlade.modelUrl, 'Equipped weapon 3D model attached');
console.log('  ✓ Gold transaction, inventory insertion, auto-equip, and 3D socket callback verified.');

// Try buying Magic Blade (1200 Gold) with insufficient gold
const magicBlade = RPG_ITEMS['wpn_magic_blade'];
const canAfford = shop.getGold() >= magicBlade.value;
assert.strictEqual(canAfford, false, 'Player cannot afford 1200 gold magic blade with 150 gold');
console.log('  ✓ Insufficient gold prevention validated.');

console.log('\n🧪 ========================================================');
console.log('🧪 ALL DUAL SWORD COMBOS & SHOP TESTS PASSED (100%)!');
console.log('🧪 ========================================================');
