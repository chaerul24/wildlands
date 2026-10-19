class RPGItem {
  final String id;
  final String name;
  final String type; // 'weapon', 'armor', 'consumable', 'material'
  final String category;
  final String rarity; // 'common', 'uncommon', 'rare', 'epic', 'legendary'
  final String icon;
  final String description;
  final int value;
  final bool stackable;
  final int maxStack;
  int count;

  // Combat / Stat attributes
  final int attack;
  final int defense;
  final double critChance;
  final int healHp;
  final int restoreSta;

  RPGItem({
    required this.id,
    required this.name,
    required this.type,
    required this.category,
    required this.rarity,
    required this.icon,
    required this.description,
    required this.value,
    this.stackable = false,
    this.maxStack = 1,
    this.count = 1,
    this.attack = 0,
    this.defense = 0,
    this.critChance = 0.0,
    this.healHp = 0,
    this.restoreSta = 0,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'count': count,
      };

  RPGItem copyWith({int? count}) {
    return RPGItem(
      id: id,
      name: name,
      type: type,
      category: category,
      rarity: rarity,
      icon: icon,
      description: description,
      value: value,
      stackable: stackable,
      maxStack: maxStack,
      count: count ?? this.count,
      attack: attack,
      defense: defense,
      critChance: critChance,
      healHp: healHp,
      restoreSta: restoreSta,
    );
  }
}
