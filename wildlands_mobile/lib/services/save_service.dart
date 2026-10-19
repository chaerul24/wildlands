import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/rpg_item.dart';
import '../models/quest.dart';
import 'rpg_config.dart';

class SaveData {
  int level;
  int xp;
  int gold;
  double currentHp;
  double currentStamina;
  double posX;
  double posZ;
  List<RPGItem?> inventory;
  RPGItem? equippedWeapon;
  RPGItem? equippedArmor;
  Quest quest;
  bool hasSeenTutorial;

  SaveData({
    required this.level,
    required this.xp,
    required this.gold,
    required this.currentHp,
    required this.currentStamina,
    required this.posX,
    required this.posZ,
    required this.inventory,
    this.equippedWeapon,
    this.equippedArmor,
    required this.quest,
    this.hasSeenTutorial = false,
  });
}

class SaveService {
  static const String _keySave = 'wildlands_save_v1';

  static Future<SaveData> loadGame() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(_keySave);

    if (raw == null) {
      return _createDefaultSave();
    }

    try {
      final Map<String, dynamic> data = jsonDecode(raw);

      // Inventory deserialization (16 slots)
      final List<RPGItem?> inv = List.filled(16, null);
      if (data['inventory'] is List) {
        final list = data['inventory'] as List;
        for (int i = 0; i < list.length && i < 16; i++) {
          if (list[i] != null && list[i]['id'] != null) {
            final base = RPGConfig.getItem(list[i]['id']);
            if (base != null) {
              base.count = list[i]['count'] ?? 1;
              inv[i] = base;
            }
          }
        }
      }

      RPGItem? weapon;
      if (data['equippedWeaponId'] != null) {
        weapon = RPGConfig.getItem(data['equippedWeaponId']);
      }

      RPGItem? armor;
      if (data['equippedArmorId'] != null) {
        armor = RPGConfig.getItem(data['equippedArmorId']);
      }

      Quest q = RPGConfig.getInitialQuest();
      if (data['quest'] is Map) {
        final qm = data['quest'] as Map<String, dynamic>;
        q = q.copyWith(
          currentCount: qm['currentCount'] ?? 0,
          isAccepted: qm['isAccepted'] ?? false,
          isCompleted: qm['isCompleted'] ?? false,
          isClaimed: qm['isClaimed'] ?? false,
        );
      }

      return SaveData(
        level: data['level'] ?? 1,
        xp: data['xp'] ?? 0,
        gold: data['gold'] ?? 50,
        currentHp: (data['currentHp'] as num?)?.toDouble() ?? 100.0,
        currentStamina: (data['currentStamina'] as num?)?.toDouble() ?? 100.0,
        posX: (data['posX'] as num?)?.toDouble() ?? 0.0,
        posZ: (data['posZ'] as num?)?.toDouble() ?? 0.0,
        inventory: inv,
        equippedWeapon: weapon,
        equippedArmor: armor,
        quest: q,
        hasSeenTutorial: data['hasSeenTutorial'] ?? false,
      );
    } catch (e) {
      return _createDefaultSave();
    }
  }

  static Future<void> saveGame(SaveData data) async {
    final prefs = await SharedPreferences.getInstance();

    final invList = data.inventory.map((item) {
      if (item == null) return null;
      return item.toJson();
    }).toList();

    final payload = {
      'level': data.level,
      'xp': data.xp,
      'gold': data.gold,
      'currentHp': data.currentHp,
      'currentStamina': data.currentStamina,
      'posX': data.posX,
      'posZ': data.posZ,
      'inventory': invList,
      'equippedWeaponId': data.equippedWeapon?.id,
      'equippedArmorId': data.equippedArmor?.id,
      'quest': data.quest.toJson(),
      'hasSeenTutorial': data.hasSeenTutorial,
    };

    await prefs.setString(_keySave, jsonEncode(payload));
  }

  static Future<void> resetGame() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keySave);
  }

  static SaveData _createDefaultSave() {
    final inv = List<RPGItem?>.filled(16, null);
    // Initial starter equipment and potions
    inv[0] = RPGConfig.getItem('potion_hp')?.copyWith(count: 3);
    inv[1] = RPGConfig.getItem('potion_sta')?.copyWith(count: 2);
    inv[2] = RPGConfig.getItem('mat_iron_ore')?.copyWith(count: 5);

    return SaveData(
      level: 1,
      xp: 0,
      gold: 50,
      currentHp: 100.0,
      currentStamina: 100.0,
      posX: 0.0,
      posZ: 0.0,
      inventory: inv,
      equippedWeapon: RPGConfig.getItem('wpn_wood_sword'),
      equippedArmor: RPGConfig.getItem('arm_leather'),
      quest: RPGConfig.getInitialQuest(),
      hasSeenTutorial: false,
    );
  }
}
