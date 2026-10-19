import { EnemyController } from './EnemyController.js';
import { EnemyCombat } from './EnemyCombat.js';

export class EnemyManager {
  constructor(scene, terrain, buildings, camera, lobbyData = null, lootManager = null, questManager = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.buildings = buildings;
    this.camera = camera;
    this.lobbyData = lobbyData;
    this.lootManager = lootManager;
    this.questManager = questManager;

    // Combat system
    this.combat = new EnemyCombat(this.scene, this.camera);

    // Active enemies collection
    this.enemies = [];

    // Initialize initial Warrior enemy at Old Weathered House
    this.spawnInitialEnemies();
  }

  spawnInitialEnemies() {
    // 1. Warrior Marauder at Old Dilapidated House (-55, -35)
    const warrior = new EnemyController(this.scene, this.terrain, this.buildings, {
      id: 'warrior_marauder_01',
      name: 'Warrior Marauder',
      level: 3,
      maxHp: 100,
      attackDamage: 18,
      detectionRadius: 14.0,
      loseTargetRadius: 28.0,
      attackRange: 2.2,
      attackCooldown: 1.6,
      walkSpeed: 2.0,
      runSpeed: 5.2,
      spawnX: -52,
      spawnZ: -32
    });

    // Wire callbacks
    warrior.onDealDamageToPlayer = (dmg, enemy) => {
      if (this.currentPlayer) {
        this.combat.damagePlayer(dmg, enemy, this.currentPlayer);
      }
    };

    warrior.onAlert = () => {
      this.combat.audio.playAlert();
      if (window.__showWildlandsToast) {
        window.__showWildlandsToast('⚠️ Warrior Marauder mendeteksi kehadiranmu!', 'warning');
      }
    };

    warrior.onDeath = (enemy) => {
      this.combat.audio.playEnemyDefeat();

      // 1. Spawn 3D World Loot Drop
      if (this.lootManager) {
        this.lootManager.spawnLootFromTable('warrior_marauder', enemy.position);
      }

      // 2. Notify Quest System
      if (this.questManager) {
        this.questManager.onEnemyDefeated(enemy.id);
      }

      // 3. Grant Base Defeat EXP
      if (this.lobbyData) {
        this.lobbyData.addGold(25);
        this.lobbyData.addXP(45);
      }

      if (window.__showWildlandsToast) {
        window.__showWildlandsToast('🏆 Warrior Marauder dikalahkan! (+45 EXP, +25 Emas). Ambil rampasannya!', 'success');
      }
    };

    this.enemies.push(warrior);

    // 2. Skeleton Guardian at Ancient Stone Ruins (-40, 38)
    const skeleton = new EnemyController(this.scene, this.terrain, this.buildings, {
      id: 'skeleton_ruins_01',
      name: 'Skeleton Guardian',
      modelUrl: '/assets/characters/enemies/skeleton_warrior.glb',
      level: 2,
      maxHp: 80,
      attackDamage: 14,
      detectionRadius: 12.0,
      loseTargetRadius: 24.0,
      attackRange: 2.0,
      attackCooldown: 1.8,
      walkSpeed: 1.8,
      runSpeed: 4.5,
      spawnX: -40,
      spawnZ: 38
    });

    skeleton.onDealDamageToPlayer = (dmg, enemy) => {
      if (this.currentPlayer) {
        this.combat.damagePlayer(dmg, enemy, this.currentPlayer);
      }
    };

    skeleton.onAlert = () => {
      this.combat.audio.playAlert();
      if (window.__showWildlandsToast) {
        window.__showWildlandsToast('💀 Skeleton Guardian bangkit dari reruntuhan batu!', 'warning');
      }
    };

    skeleton.onDeath = (enemy) => {
      this.combat.audio.playEnemyDefeat();
      if (this.lootManager) {
        this.lootManager.spawnLootFromTable('warrior_marauder', enemy.position);
      }
      if (this.lobbyData) {
        this.lobbyData.addGold(20);
        this.lobbyData.addXP(35);
      }
      if (window.__showWildlandsToast) {
        window.__showWildlandsToast('💀 Skeleton Guardian dihancurkan! (+35 EXP, +20 Emas)', 'success');
      }
    };

    this.enemies.push(skeleton);
  }

  // Called on dodge roll input [Q]
  onPlayerRoll(player) {
    return this.combat.tryPlayerRoll(player);
  }

  // Called from Game.js on player input (Left Click, F key, or Mobile Attack Button)
  onPlayerAttack(player) {
    return this.combat.tryPlayerAttack(player, this.enemies);
  }

  update(dt, player) {
    this.currentPlayer = player;

    // Update combat effects & damage numbers
    this.combat.update(dt);

    // Update each enemy AI
    for (const enemy of this.enemies) {
      enemy.update(dt, player ? player.position : null);
    }
  }

  getEnemies() {
    return this.enemies;
  }
}
