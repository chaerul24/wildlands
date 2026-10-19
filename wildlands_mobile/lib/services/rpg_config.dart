import '../models/rpg_item.dart';
import '../models/quest.dart';

class RPGConfig {
  static final Map<String, RPGItem> allItems = {
    'potion_hp': RPGItem(
      id: 'potion_hp',
      name: 'Potion Pemulih HP',
      type: 'consumable',
      category: 'Ramuan',
      rarity: 'common',
      icon: '🧪',
      description: 'Ramuan herbal pegunungan yang memulihkan 40 poin Health.',
      value: 20,
      stackable: true,
      maxStack: 10,
      healHp: 40,
    ),
    'potion_sta': RPGItem(
      id: 'potion_sta',
      name: 'Elixir Stamina',
      type: 'consumable',
      category: 'Ramuan',
      rarity: 'common',
      icon: '⚡',
      description: 'Tonik penambah tenaga yang memulihkan 60 poin Stamina seketika.',
      value: 25,
      stackable: true,
      maxStack: 10,
      restoreSta: 60,
    ),
    'wpn_wood_sword': RPGItem(
      id: 'wpn_wood_sword',
      name: 'Pedang Kayu Latihan',
      type: 'weapon',
      category: 'Pedang 1-Tangan',
      rarity: 'common',
      icon: '🗡️',
      description: 'Pedang kayu sederhana untuk petualang pemula.',
      value: 30,
      attack: 15,
      critChance: 0.05,
    ),
    'wpn_iron_sword': RPGItem(
      id: 'wpn_iron_sword',
      name: 'Pedang Besi Tempa',
      type: 'weapon',
      category: 'Pedang 1-Tangan',
      rarity: 'uncommon',
      icon: '⚔️',
      description: 'Bilah baja tempaan pandai besi dengan ketajaman seimbang.',
      value: 120,
      attack: 26,
      critChance: 0.08,
    ),
    'wpn_knight_blade': RPGItem(
      id: 'wpn_knight_blade',
      name: 'Pedang Kesatria Kerajaan',
      type: 'weapon',
      category: 'Pedang 1-Tangan',
      rarity: 'rare',
      icon: '⚜️',
      description: 'Bilah pusaka pengawal kerajaan. Sangat kuat dan mematikan.',
      value: 350,
      attack: 42,
      critChance: 0.14,
    ),
    'arm_leather': RPGItem(
      id: 'arm_leather',
      name: 'Zirah Kulit Pemburu',
      type: 'armor',
      category: 'Zirah Ringan',
      rarity: 'common',
      icon: '🥋',
      description: 'Rompi kulit tebal untuk perlindungan dari serangan binatang buas.',
      value: 40,
      defense: 12,
    ),
    'arm_iron': RPGItem(
      id: 'arm_iron',
      name: 'Baju Zirah Baja',
      type: 'armor',
      category: 'Zirah Berat',
      rarity: 'uncommon',
      icon: '🛡️',
      description: 'Pelindung dada dari lempengan baja yang kokoh.',
      value: 160,
      defense: 28,
    ),
    'arm_knight': RPGItem(
      id: 'arm_knight',
      name: 'Zirah Pengawal Kerajaan',
      type: 'armor',
      category: 'Zirah Berat',
      rarity: 'rare',
      icon: '🛡️',
      description: 'Zirah baja berlapis emas dengan pertahanan superior.',
      value: 400,
      defense: 45,
    ),
    'mat_iron_ore': RPGItem(
      id: 'mat_iron_ore',
      name: 'Bijih Besi Murni',
      type: 'material',
      category: 'Material',
      rarity: 'common',
      icon: '🪨',
      description: 'Bongkahan bijih besi berkualitas tinggi dari lereng gunung.',
      value: 15,
      stackable: true,
      maxStack: 20,
    ),
  };

  static RPGItem? getItem(String id) {
    return allItems[id]?.copyWith();
  }

  static Quest getInitialQuest() {
    return Quest(
      id: 'quest_marauder',
      title: 'Ancaman di Rumah Tua',
      description:
          'Kalahkan 1 Warrior Marauder yang menduduki area reruntuhan Rumah Tua di utara desa.',
      giverName: 'Penjaga Rian',
      targetName: 'Warrior Marauder',
      targetCount: 1,
      currentCount: 0,
      rewardXp: 100,
      rewardGold: 50,
      rewardItemId: 'wpn_knight_blade',
    );
  }

  static int xpForLevel(int level) => level * 100;
}
