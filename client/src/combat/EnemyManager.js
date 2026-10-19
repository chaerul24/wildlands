import { EnemyController } from './EnemyController.js';
import { EnemyCombat } from './EnemyCombat.js';

export class EnemyManager {
  constructor(scene, terrain, buildings, camera, lobbyData = null) {
    this.scene = scene;
    this.terrain = terrain;
    this.buildings = buildings;
    this.camera = camera;
    this.lobbyData = lobbyData;

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
      attackDamage: 15,
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
      if (window.__showWildlandsToast) {
        window.__showWildlandsToast('🏆 Warrior Marauder berhasil dikalahkan! (+50 EXP & +30 Koin Emas)', 'success');
      }
      if (this.lobbyData) {
        this.lobbyData.addGold(30);
        this.lobbyData.addXP(50);
      }
    };

    this.enemies.push(warrior);
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
