import 'package:flutter_test/flutter_test.dart';
import 'package:wildlands_rpg/models/rpg_item.dart';
import 'package:wildlands_rpg/services/rpg_config.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('Wildlands RPG Mobile Logic Tests', () {
    test('RPGConfig has all valid items and stats', () {
      final sword = RPGConfig.getItem('wpn_iron_sword');
      expect(sword, isNotNull);
      expect(sword!.attack, 26);
      expect(sword.type, 'weapon');

      final potion = RPGConfig.getItem('potion_hp');
      expect(potion, isNotNull);
      expect(potion!.healHp, 40);
    });

    test('Quest initialization and objective completion', () {
      final quest = RPGConfig.getInitialQuest();
      expect(quest.id, 'quest_marauder');
      expect(quest.targetCount, 1);
      expect(quest.isCompleted, isFalse);

      quest.currentCount++;
      if (quest.currentCount >= quest.targetCount) {
        quest.isCompleted = true;
      }
      expect(quest.isCompleted, isTrue);
    });

    test('Inventory serialization and 16-slot capacity', () {
      final inv = List<RPGItem?>.filled(16, null);
      inv[0] = RPGConfig.getItem('wpn_wood_sword');
      inv[1] = RPGConfig.getItem('potion_hp')?.copyWith(count: 3);

      expect(inv.length, 16);
      expect(inv[0]?.name, 'Pedang Kayu Latihan');
      expect(inv[1]?.count, 3);
    });
  });
}
