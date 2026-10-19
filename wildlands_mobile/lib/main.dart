import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/services.dart';

import 'models/rpg_item.dart';
import 'models/quest.dart';
import 'services/rpg_config.dart';
import 'services/save_service.dart';
import 'services/audio_service.dart';
import 'game/world_entity.dart';
import 'game/renderer/rpg_3d_canvas.dart';
import 'ui/virtual_joystick.dart';
import 'ui/action_buttons.dart';
import 'ui/hud_overlay.dart';
import 'ui/inventory_dialog.dart';
import 'ui/dialogue_overlay.dart';
import 'ui/onboarding_dialog.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Force landscape orientation for mobile RPG
  await SystemChrome.setPreferredOrientations([
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);
  // Enable immersive fullscreen mode (hide system nav bars)
  await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);

  runApp(const WildlandsApp());
}

class WildlandsApp extends StatelessWidget {
  const WildlandsApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Wildlands RPG',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
        fontFamily: 'sans-serif',
      ),
      home: const GameScreen(),
    );
  }
}

class GameScreen extends StatefulWidget {
  const GameScreen({super.key});

  @override
  State<GameScreen> createState() => _GameScreenState();
}

class _GameScreenState extends State<GameScreen> with SingleTickerProviderStateMixin {
  late Ticker _ticker;
  double _lastTime = 0.0;
  double _gameTime = 0.0;

  // Player State
  int _level = 1;
  int _xp = 0;
  int _gold = 50;
  double _hp = 100.0;
  double _maxHp = 100.0;
  double _stamina = 100.0;
  final double _maxStamina = 100.0;

  final PlayerEntity _player = PlayerEntity();
  RPGItem? _equippedWeapon;
  RPGItem? _equippedArmor;
  late List<RPGItem?> _inventory;

  // Entities
  late EnemyEntity _enemy;
  late NPCEntity _npc;
  final List<LootBeaconEntity> _lootBeacons = [];
  final List<FloatingDamageText> _damageTexts = [];
  final List<SceneryEntity> _scenery = [];

  // Camera
  double _cameraYaw = 0.0;
  final double _cameraPitch = 0.42; // ~24 degrees elevation

  // Controls
  double _joystickAngle = 0.0;
  double _joystickMagnitude = 0.0;
  bool _isMoving = false;

  // Quest
  late Quest _activeQuest;

  // UI States
  bool _isLoading = true;
  bool _showOnboarding = false;
  bool _showDialogue = false;
  String? _bannerMessage;
  Timer? _bannerTimer;

  // Auto-save timer
  Timer? _autoSaveTimer;

  @override
  void initState() {
    super.initState();
    _initScenery();
    _loadGameData();

    _ticker = createTicker(_onTick);
  }

  void _initScenery() {
    // 1. Village perimeter trees and rocks
    for (int i = 0; i < 16; i++) {
      final angle = (i / 16.0) * pi * 2;
      final dist = 16.0 + (i % 3) * 2.0;
      _scenery.add(SceneryEntity(
        type: SceneryType.tree,
        x: cos(angle) * dist,
        z: sin(angle) * dist,
        scale: 1.0 + (i % 3) * 0.2,
      ));
    }

    // 2. Cobblestone path road borders
    for (double z = -8; z <= 12; z += 4) {
      _scenery.add(SceneryEntity(type: SceneryType.rock, x: -3.8, z: z, scale: 0.8));
      _scenery.add(SceneryEntity(type: SceneryType.rock, x: 3.8, z: z, scale: 0.8));
    }

    // 3. Old Ruins ("Rumah Tua") at Z = 24 to 34
    // Stone walls
    _scenery.add(SceneryEntity(type: SceneryType.ruinWall, x: -6.0, z: 22.0, scale: 1.2));
    _scenery.add(SceneryEntity(type: SceneryType.ruinWall, x: 6.0, z: 22.0, scale: 1.2));
    _scenery.add(SceneryEntity(type: SceneryType.ruinWall, x: -6.0, z: 32.0, scale: 1.2));
    _scenery.add(SceneryEntity(type: SceneryType.ruinWall, x: 6.0, z: 32.0, scale: 1.2));
    _scenery.add(SceneryEntity(type: SceneryType.ruinWall, x: 0.0, z: 34.0, scale: 1.4));

    // Pillars & Torches
    _scenery.add(SceneryEntity(type: SceneryType.ruinPillar, x: -3.0, z: 22.0, scale: 1.1));
    _scenery.add(SceneryEntity(type: SceneryType.ruinPillar, x: 3.0, z: 22.0, scale: 1.1));
    _scenery.add(SceneryEntity(type: SceneryType.torch, x: -3.0, z: 22.0, scale: 1.0));
    _scenery.add(SceneryEntity(type: SceneryType.torch, x: 3.0, z: 22.0, scale: 1.0));

    // NPC Penjaga Rian near village entrance
    _npc = NPCEntity(
      id: 'npc_rian',
      name: 'Penjaga Rian',
      title: 'Pengawal Gerbang Desa',
      x: 2.8,
      z: 4.0,
      rotationY: pi,
    );

    // Enemy Warrior Marauder at Old Ruins courtyard
    _enemy = EnemyEntity(
      id: 'enemy_marauder',
      name: 'Warrior Marauder',
      startX: 0.0,
      startZ: 27.0,
    );
  }

  Future<void> _loadGameData() async {
    final save = await SaveService.loadGame();

    setState(() {
      _level = save.level;
      _xp = save.xp;
      _gold = save.gold;
      _maxHp = 100.0 + (_level - 1) * 20.0;
      _hp = save.currentHp.clamp(1.0, _maxHp);
      _stamina = save.currentStamina.clamp(0.0, _maxStamina);
      _player.pos = Vector3D(save.posX, 0, save.posZ);
      _inventory = save.inventory;
      _equippedWeapon = save.equippedWeapon;
      _equippedArmor = save.equippedArmor;
      _activeQuest = save.quest;
      _isLoading = false;
      _showOnboarding = !save.hasSeenTutorial;
    });

    _ticker.start();

    // Auto-save every 15s
    _autoSaveTimer = Timer.periodic(const Duration(seconds: 15), (_) => _saveCurrentState());
  }

  void _saveCurrentState() {
    final data = SaveData(
      level: _level,
      xp: _xp,
      gold: _gold,
      currentHp: _hp,
      currentStamina: _stamina,
      posX: _player.pos.x,
      posZ: _player.pos.z,
      inventory: _inventory,
      equippedWeapon: _equippedWeapon,
      equippedArmor: _equippedArmor,
      quest: _activeQuest,
      hasSeenTutorial: true,
    );
    SaveService.saveGame(data);
  }

  @override
  void dispose() {
    _autoSaveTimer?.cancel();
    _bannerTimer?.cancel();
    _ticker.dispose();
    super.dispose();
  }

  // --- STAT CALCULATIONS ---
  int get _totalAttack => 10 + (_level * 3) + (_equippedWeapon?.attack ?? 0);
  int get _totalDefense => 5 + (_level * 2) + (_equippedArmor?.defense ?? 0);
  double get _critChance => 0.05 + (_equippedWeapon?.critChance ?? 0.0);

  void _showBanner(String message) {
    _bannerTimer?.cancel();
    setState(() {
      _bannerMessage = message;
    });
    _bannerTimer = Timer(const Duration(seconds: 3), () {
      if (mounted) {
        setState(() {
          _bannerMessage = null;
        });
      }
    });
  }

  // --- 60 FPS GAME ENGINE LOOP ---
  void _onTick(Duration elapsed) {
    final now = elapsed.inMicroseconds / 1000000.0;
    if (_lastTime == 0.0) _lastTime = now;
    double dt = now - _lastTime;
    _lastTime = now;

    if (dt > 0.1) dt = 0.1; // Clamp delta time to avoid large physics steps
    _gameTime += dt;

    _updatePlayer(dt);
    _updateEnemy(dt);
    _updateDamageTexts(dt);

    setState(() {});
  }

  void _updatePlayer(double dt) {
    // Stamina Regeneration
    if (_stamina < _maxStamina) {
      _stamina = min(_maxStamina, _stamina + 18.0 * dt);
    }

    // Dodge Roll update
    if (_player.state == PlayerState.roll) {
      _player.rollTimer -= dt;
      // Dash movement during roll
      const rollSpeed = 13.0;
      _player.pos.x += sin(_player.rotationY) * rollSpeed * dt;
      _player.pos.z += cos(_player.rotationY) * rollSpeed * dt;

      if (_player.rollTimer <= 0) {
        _player.state = PlayerState.idle;
        _player.isInvulnerable = false;
      }
      return;
    }

    // Attack Animation update
    if (_player.state == PlayerState.attack) {
      _player.animTimer += dt * 3.2; // ~0.3s attack animation
      if (_player.animTimer >= 1.0) {
        _player.state = PlayerState.idle;
        _player.animTimer = 0.0;
      }
      return;
    }

    // Movement via Virtual Joystick
    if (_isMoving && _joystickMagnitude > 0.05) {
      // Movement angle is camera-relative
      final moveAngle = _joystickAngle + _cameraYaw + pi / 2;
      final speed = _joystickMagnitude > 0.6 ? 6.5 : 3.8;

      _player.pos.x += cos(moveAngle) * speed * dt;
      _player.pos.z += sin(moveAngle) * speed * dt;

      // Face direction of movement
      _player.rotationY = atan2(cos(moveAngle), sin(moveAngle));
      _player.state = _joystickMagnitude > 0.6 ? PlayerState.run : PlayerState.walk;

      // Camera smoothly follows player yaw slightly
      final angleDiff = _player.rotationY - _cameraYaw;
      _cameraYaw += sin(angleDiff) * 0.02;
    } else {
      if (_player.state != PlayerState.attack && _player.state != PlayerState.roll) {
        _player.state = PlayerState.idle;
      }
    }

    // Clamp player boundaries within world
    _player.pos.x = _player.pos.x.clamp(-35.0, 35.0);
    _player.pos.z = _player.pos.z.clamp(-25.0, 45.0);
  }

  void _updateEnemy(double dt) {
    if (_enemy.state == EnemyState.dead) {
      _enemy.deathTimer += dt;
      if (_enemy.deathTimer > 30.0) {
        _enemy.respawn();
      }
      return;
    }

    if (_enemy.hurtTimer > 0) {
      _enemy.hurtTimer -= dt;
    }

    if (_enemy.attackCooldown > 0) {
      _enemy.attackCooldown -= dt;
    }

    final dist = _enemy.pos.horizontalDistanceTo(_player.pos);

    // AI State Machine
    switch (_enemy.state) {
      case EnemyState.idle:
      case EnemyState.patrol:
        if (dist <= _enemy.aggroRadius) {
          _enemy.state = EnemyState.chase;
        } else {
          // Wander around spawn in ruins
          _enemy.stateTimer += dt;
          if (_enemy.stateTimer > 4.0) {
            _enemy.stateTimer = 0.0;
            final randAngle = Random().nextDouble() * pi * 2;
            _enemy.patrolTarget = Vector3D(
              _enemy.spawnPos.x + cos(randAngle) * 4.0,
              0,
              _enemy.spawnPos.z + sin(randAngle) * 4.0,
            );
          }
          final pDist = _enemy.pos.horizontalDistanceTo(_enemy.patrolTarget);
          if (pDist > 0.5) {
            final angle = atan2(
              _enemy.patrolTarget.x - _enemy.pos.x,
              _enemy.patrolTarget.z - _enemy.pos.z,
            );
            _enemy.rotationY = angle;
            _enemy.pos.x += sin(angle) * 1.5 * dt;
            _enemy.pos.z += cos(angle) * 1.5 * dt;
          }
        }
        break;

      case EnemyState.chase:
        if (dist > 22.0) {
          // Player fled
          _enemy.state = EnemyState.patrol;
        } else if (dist <= _enemy.attackRange) {
          if (_enemy.attackCooldown <= 0) {
            _enemy.state = EnemyState.windup;
            _enemy.stateTimer = 0.55; // 0.55s telegraph indicator before strike
          }
        } else {
          // Chase player
          final angle = atan2(_player.pos.x - _enemy.pos.x, _player.pos.z - _enemy.pos.z);
          _enemy.rotationY = angle;
          _enemy.pos.x += sin(angle) * 4.2 * dt;
          _enemy.pos.z += cos(angle) * 4.2 * dt;
        }
        break;

      case EnemyState.windup:
        _enemy.stateTimer -= dt;
        if (_enemy.stateTimer <= 0) {
          _enemy.state = EnemyState.attack;
          _enemy.stateTimer = 0.3;
          _performEnemyAttack();
        }
        break;

      case EnemyState.attack:
        _enemy.stateTimer -= dt;
        if (_enemy.stateTimer <= 0) {
          _enemy.state = EnemyState.chase;
          _enemy.attackCooldown = 1.4;
        }
        break;

      case EnemyState.hurt:
        if (_enemy.hurtTimer <= 0) {
          _enemy.state = EnemyState.chase;
        }
        break;

      case EnemyState.dead:
        break;
    }
  }

  void _performEnemyAttack() {
    final dist = _enemy.pos.horizontalDistanceTo(_player.pos);
    if (dist <= 2.8 && !_player.isInvulnerable) {
      // Calculate damage reduced by armor
      final rawDmg = _enemy.attackPower;
      final mitigated = max(4.0, rawDmg - (_totalDefense * 0.35));
      final finalDmg = mitigated.roundToDouble();

      _hp = max(0.0, _hp - finalDmg);
      _damageTexts.add(FloatingDamageText(
        pos: Vector3D(_player.pos.x, 1.4, _player.pos.z),
        text: '-${finalDmg.toInt()}',
        color: const Color(0xFFEF4444),
      ));

      AudioService.playHit();

      if (_hp <= 0) {
        _onPlayerDeath();
      }
    }
  }

  void _onPlayerDeath() {
    _showBanner('Kamu Gugur dalam Pertempuran!');
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('💀 KAMU GUGUR', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
        content: const Text(
          'Warrior Marauder berhasil mengalahkanmu. Mau bangkit kembali di gerbang desa?',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () {
              Navigator.of(ctx).pop();
              setState(() {
                _hp = _maxHp;
                _stamina = _maxStamina;
                _player.reset(0, 0);
              });
            },
            child: const Text('Bangkit Kembali', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _updateDamageTexts(double dt) {
    for (int i = _damageTexts.length - 1; i >= 0; i--) {
      final dtObj = _damageTexts[i];
      dtObj.pos.y += 1.8 * dt; // Float upwards
      dtObj.life -= dt * 1.4;
      if (dtObj.life <= 0) {
        _damageTexts.removeAt(i);
      }
    }
  }

  // --- ACTIONS ---
  void _onPlayerAttack() {
    if (_player.state == PlayerState.attack || _player.state == PlayerState.roll) return;

    _player.state = PlayerState.attack;
    _player.animTimer = 0.0;
    AudioService.playAttack();

    // Hit detection against Enemy Warrior Marauder
    final dist = _player.pos.horizontalDistanceTo(_enemy.pos);
    if (dist <= 2.8 && _enemy.state != EnemyState.dead) {
      final isCrit = Random().nextDouble() < _critChance;
      final variance = 0.9 + Random().nextDouble() * 0.2;
      double dmg = _totalAttack * variance;
      if (isCrit) dmg *= 1.75;
      final finalDmg = max(5.0, dmg).roundToDouble();

      _enemy.hp = max(0.0, _enemy.hp - finalDmg);
      _enemy.hurtTimer = 0.25;
      _enemy.state = EnemyState.hurt;

      _damageTexts.add(FloatingDamageText(
        pos: Vector3D(_enemy.pos.x, 1.6, _enemy.pos.z),
        text: isCrit ? 'CRIT! -${finalDmg.toInt()}' : '-${finalDmg.toInt()}',
        color: isCrit ? const Color(0xFFFDE047) : Colors.white,
        isCrit: isCrit,
      ));

      if (isCrit) {
        AudioService.playCritHit();
      } else {
        AudioService.playHit();
      }

      if (_enemy.hp <= 0) {
        _onEnemyDefeated();
      }
    }
  }

  void _onEnemyDefeated() {
    _enemy.state = EnemyState.dead;
    _enemy.deathTimer = 0.0;
    AudioService.playLevelUp();

    // Reward XP & Gold
    const rewardExp = 50;
    const rewardGold = 15;
    _addExp(rewardExp);
    _gold += rewardGold;

    // Quest objective progression
    if (_activeQuest.isAccepted && !_activeQuest.isCompleted) {
      _activeQuest.currentCount++;
      if (_activeQuest.currentCount >= _activeQuest.targetCount) {
        _activeQuest.isCompleted = true;
        _showBanner('🎯 Quest Selesai! Bicara dengan Penjaga Rian.');
      }
    }

    // Drop 3D Golden Loot Beacon!
    final dropItem = Random().nextBool()
        ? RPGConfig.getItem('wpn_iron_sword')!
        : RPGConfig.getItem('potion_hp')!.copyWith(count: 2);

    _lootBeacons.add(LootBeaconEntity(
      id: 'loot_${DateTime.now().millisecondsSinceEpoch}',
      x: _enemy.pos.x,
      z: _enemy.pos.z,
      item: dropItem,
    ));

    _showBanner('Kalahkan Marauder! +$rewardExp EXP, +$rewardGold G');
    _saveCurrentState();
  }

  void _onPlayerDodge() {
    if (_player.state == PlayerState.roll) return;
    if (_stamina < 25.0) return;

    _stamina -= 25.0;
    _player.state = PlayerState.roll;
    _player.rollTimer = 0.38;
    _player.isInvulnerable = true;
    AudioService.playDodge();
  }

  void _addExp(int amount) {
    _xp += amount;
    final needed = RPGConfig.xpForLevel(_level);
    if (_xp >= needed) {
      _xp -= needed;
      _level++;
      _maxHp += 20.0;
      _hp = _maxHp;
      _showBanner('🌟 LEVEL UP! Selamat, kamu mencapai Level $_level!');
    }
  }

  // --- CONTEXTUAL INTERACTION ---
  String? get _currentInteractLabel {
    // Check Loot Beacons
    for (final loot in _lootBeacons) {
      if (!loot.collected && _player.pos.horizontalDistanceTo(loot.pos) <= 2.6) {
        return 'Ambil ${loot.item.name}';
      }
    }

    // Check NPC Penjaga Rian
    if (_player.pos.horizontalDistanceTo(_npc.pos) <= 3.4) {
      return 'Bicara (Penjaga Rian)';
    }

    return null;
  }

  void _handleInteract() {
    // 1. Check Loot
    for (final loot in _lootBeacons) {
      if (!loot.collected && _player.pos.horizontalDistanceTo(loot.pos) <= 2.6) {
        _collectLoot(loot);
        return;
      }
    }

    // 2. Check NPC
    if (_player.pos.horizontalDistanceTo(_npc.pos) <= 3.4) {
      setState(() {
        _showDialogue = true;
      });
    }
  }

  void _collectLoot(LootBeaconEntity loot) {
    loot.collected = true;
    _addItemToInventory(loot.item);
    AudioService.playLoot();
    _showBanner('Mendapatkan: ${loot.item.icon} ${loot.item.name}!');
    _saveCurrentState();
  }

  void _addItemToInventory(RPGItem item) {
    // If stackable, find existing slot
    if (item.stackable) {
      for (int i = 0; i < _inventory.length; i++) {
        if (_inventory[i] != null && _inventory[i]!.id == item.id) {
          _inventory[i]!.count += item.count;
          return;
        }
      }
    }

    // Find first empty slot
    for (int i = 0; i < _inventory.length; i++) {
      if (_inventory[i] == null) {
        _inventory[i] = item.copyWith();
        return;
      }
    }
    _showBanner('Tas Penuh! Tidak ada slot kosong.');
  }

  // --- INVENTORY ACTIONS ---
  void _useItem(int slotIndex, RPGItem item) {
    if (item.type == 'consumable') {
      if (item.healHp > 0) {
        _hp = min(_maxHp, _hp + item.healHp);
        _showBanner('Memulihkan +${item.healHp} HP!');
      }
      if (item.restoreSta > 0) {
        _stamina = min(_maxStamina, _stamina + item.restoreSta);
        _showBanner('Memulihkan +${item.restoreSta} Stamina!');
      }
      AudioService.playPotion();

      item.count--;
      if (item.count <= 0) {
        _inventory[slotIndex] = null;
      }
      _saveCurrentState();
    }
  }

  void _equipItem(RPGItem item) {
    if (item.type == 'weapon') {
      _equippedWeapon = item;
      _showBanner('Memasang Senjata: ${item.name} (+${item.attack} ATK)');
    } else if (item.type == 'armor') {
      _equippedArmor = item;
      _showBanner('Memasang Zirah: ${item.name} (+${item.defense} DEF)');
    }
    _saveCurrentState();
  }

  void _unequipItem(RPGItem item) {
    if (_equippedWeapon?.id == item.id) {
      _equippedWeapon = null;
      _showBanner('Melepas Senjata.');
    } else if (_equippedArmor?.id == item.id) {
      _equippedArmor = null;
      _showBanner('Melepas Zirah.');
    }
    _saveCurrentState();
  }

  void _openInventory() {
    showDialog(
      context: context,
      builder: (_) => InventoryDialog(
        inventory: _inventory,
        equippedWeapon: _equippedWeapon,
        equippedArmor: _equippedArmor,
        totalAttack: _totalAttack,
        totalDefense: _totalDefense,
        critChance: _critChance,
        gold: _gold,
        onUseItem: _useItem,
        onEquipItem: _equipItem,
        onUnequipItem: _unequipItem,
      ),
    );
  }

  void _openStats() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF6366F1), width: 2),
        ),
        title: const Row(
          children: [
            Icon(Icons.shield, color: Color(0xFF6366F1)),
            SizedBox(width: 8),
            Text('STATUS PETUALANG', style: TextStyle(color: Colors.white, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Level: $_level', style: const TextStyle(color: Color(0xFFFDE047), fontWeight: FontWeight.bold)),
            Text('EXP: $_xp / ${RPGConfig.xpForLevel(_level)}', style: const TextStyle(color: Colors.white70)),
            Text('Emas: $_gold G', style: const TextStyle(color: Colors.amberAccent)),
            const Divider(color: Colors.white24),
            Text('Total Serangan (ATK): $_totalAttack', style: const TextStyle(color: Colors.redAccent)),
            Text('Total Pertahanan (DEF): $_totalDefense', style: const TextStyle(color: Colors.blueAccent)),
            Text('Peluang Kritis: ${(_critChance * 100).toInt()}%', style: const TextStyle(color: Colors.orangeAccent)),
            const Divider(color: Colors.white24),
            Text('Senjata Terpasang: ${_equippedWeapon?.name ?? "Tidak Ada"}', style: const TextStyle(color: Colors.white)),
            Text('Zirah Terpasang: ${_equippedArmor?.name ?? "Tidak Ada"}', style: const TextStyle(color: Colors.white)),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Tutup', style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
    );
  }

  // --- QUEST ACTIONS ---
  void _acceptQuest() {
    setState(() {
      _activeQuest.isAccepted = true;
      _showDialogue = false;
    });
    _showBanner('Quest Diterima: ${_activeQuest.title}!');
    _saveCurrentState();
  }

  void _claimQuestReward() {
    setState(() {
      _activeQuest.isClaimed = true;
      _showDialogue = false;
    });

    _addExp(_activeQuest.rewardXp);
    _gold += _activeQuest.rewardGold;

    if (_activeQuest.rewardItemId != null) {
      final rewardItem = RPGConfig.getItem(_activeQuest.rewardItemId!);
      if (rewardItem != null) {
        _addItemToInventory(rewardItem);
      }
    }

    AudioService.playLevelUp();
    _showBanner('🎉 Hadiah Quest Diklaim: +${_activeQuest.rewardXp} EXP, +${_activeQuest.rewardGold} G, Pedang Kesatria Kerajaan!');
    _saveCurrentState();
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(color: Color(0xFFF59E0B)),
              SizedBox(height: 16),
              Text('MEMUAT WILDLANDS RPG (OFFLINE)...', style: TextStyle(color: Colors.white, letterSpacing: 1.5)),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      body: Stack(
        children: [
          // 1. Native 3D GPU Skia Canvas
          Positioned.fill(
            child: CustomPaint(
              painter: RPG3DCanvas(
                player: _player,
                enemy: _enemy,
                npc: _npc,
                lootBeacons: _lootBeacons,
                damageTexts: _damageTexts,
                scenery: _scenery,
                cameraYaw: _cameraYaw,
                cameraPitch: _cameraPitch,
                gameTime: _gameTime,
              ),
            ),
          ),

          // 2. Touch Drag Area to Rotate Camera (Upper Right Half of Screen)
          Positioned.fill(
            child: GestureDetector(
              behavior: HitTestBehavior.translucent,
              onHorizontalDragUpdate: (details) {
                // Drag horizontally to orbit camera around player
                setState(() {
                  _cameraYaw += details.delta.dx * 0.008;
                });
              },
            ),
          ),

          // 3. HUD Overlay (Player Bars, Quest Tracker, Alerts)
          HUDOverlay(
            level: _level,
            xp: _xp,
            xpNeeded: RPGConfig.xpForLevel(_level),
            gold: _gold,
            hp: _hp,
            maxHp: _maxHp,
            stamina: _stamina,
            maxStamina: _maxStamina,
            activeQuest: _activeQuest,
            bannerMessage: _bannerMessage,
          ),

          // 4. Virtual Joystick (Bottom Left)
          Positioned(
            bottom: 24,
            left: 24,
            child: VirtualJoystick(
              radius: 65,
              onDirectionChanged: (angle, mag) {
                _joystickAngle = angle;
                _joystickMagnitude = mag;
                _isMoving = true;
              },
              onReleased: () {
                _isMoving = false;
                _joystickMagnitude = 0.0;
              },
            ),
          ),

          // 5. Action Buttons (Bottom Right Cluster: Attack, Dodge, Interact, Bag, Stats)
          ActionButtons(
            onAttack: _onPlayerAttack,
            onDodge: _onPlayerDodge,
            onInteract: _handleInteract,
            onOpenBag: _openInventory,
            onOpenStats: _openStats,
            interactLabel: _currentInteractLabel,
            staminaRatio: _stamina / _maxStamina,
          ),

          // 6. NPC Dialogue Overlay
          if (_showDialogue)
            DialogueOverlay(
              quest: _activeQuest,
              onAcceptQuest: _acceptQuest,
              onClaimReward: _claimQuestReward,
              onClose: () => setState(() => _showDialogue = false),
            ),

          // 7. First-Time Launch Onboarding Tutorial
          if (_showOnboarding)
            OnboardingDialog(
              onStartGame: () {
                setState(() {
                  _showOnboarding = false;
                });
                _saveCurrentState();
              },
            ),
        ],
      ),
    );
  }
}
