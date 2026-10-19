/**
 * RPGConfig.js - Authoritative Data-Driven RPG Rules, Content, and Formulas
 * Defines items, equipment, loot tables, quests, and stat progression curves.
 */

export const RPG_ITEMS = {
  // --- CONSUMABLES ---
  potion_hp: {
    id: 'potion_hp',
    name: 'Potion Pemulih HP',
    type: 'consumable',
    category: 'Potion',
    rarity: 'common',
    icon: '🧪',
    description: 'Ramuan herbal pegunungan yang memulihkan 40 poin Health.',
    value: 20,
    stackable: true,
    maxStack: 10,
    effect: { type: 'heal_hp', amount: 40 }
  },
  potion_sta: {
    id: 'potion_sta',
    name: 'Elixir Stamina',
    type: 'consumable',
    category: 'Potion',
    rarity: 'common',
    icon: '⚡',
    description: 'Tonik penambah tenaga yang memulihkan 60 poin Stamina seketika.',
    value: 25,
    stackable: true,
    maxStack: 10,
    effect: { type: 'restore_sta', amount: 60 }
  },
  food_valley_bread: {
    id: 'food_valley_bread',
    name: 'Roti Gandum Hangat',
    type: 'consumable',
    category: 'Roti & Bahan Pokok',
    rarity: 'common',
    icon: '🍞',
    description: 'Roti gandum segar hasil panen ladang desa, memulihkan 25 poin HP.',
    value: 15,
    stackable: true,
    maxStack: 20,
    effect: { type: 'heal_hp', amount: 25 }
  },
  food_roasted_meat: {
    id: 'food_roasted_meat',
    name: 'Daging Panggang Rimba',
    type: 'consumable',
    category: 'Daging Matang',
    rarity: 'uncommon',
    icon: '🍖',
    description: 'Daging buruan gurih berbumbu rempah pegunungan, memulihkan 55 poin HP.',
    value: 40,
    stackable: true,
    maxStack: 15,
    effect: { type: 'heal_hp', amount: 55 }
  },
  food_forest_stew: {
    id: 'food_forest_stew',
    name: 'Sup Jamur Lembah',
    type: 'consumable',
    category: 'Sup Hangat',
    rarity: 'uncommon',
    icon: '🍲',
    description: 'Semangkuk sup kental kaya sari jamur hutan, memulihkan 45 HP dan 35 Stamina.',
    value: 55,
    stackable: true,
    maxStack: 10,
    effect: { type: 'heal_hybrid', hp: 45, sta: 35 }
  },
  food_sweet_apple: {
    id: 'food_sweet_apple',
    name: 'Apel Merah Segar',
    type: 'consumable',
    category: 'Buah Segar',
    rarity: 'common',
    icon: '🍎',
    description: 'Apel manis renyah pemuas dahaga penjelajah rimba, memulihkan 15 HP dan 25 Stamina.',
    value: 10,
    stackable: true,
    maxStack: 30,
    effect: { type: 'restore_sta', amount: 25 }
  },
  food_herbal_tea: {
    id: 'food_herbal_tea',
    name: 'Teh Herbal Pegunungan',
    type: 'consumable',
    category: 'Minuman Herbal',
    rarity: 'common',
    icon: '🍵',
    description: 'Seduhan daun herbal alami yang mengembalikan 60 poin Stamina seketika.',
    value: 25,
    stackable: true,
    maxStack: 15,
    effect: { type: 'restore_sta', amount: 60 }
  },

  // --- WEAPONS ---
  wpn_wood_sword: {
    id: 'wpn_wood_sword',
    name: 'Pedang Kayu Latihan',
    type: 'weapon',
    category: 'Pedang 1-Tangan',
    rarity: 'common',
    icon: '🗡️',
    description: 'Pedang kayu sederhana untuk petualang pemula.',
    value: 30,
    stackable: false,
    stats: { attack: 15, critChance: 0.05 },
    modelUrl: '/models/weapons/sword_1handed.gltf'
  },
  wpn_iron_sword: {
    id: 'wpn_iron_sword',
    name: 'Pedang Besi Tempa',
    type: 'weapon',
    category: 'Pedang 1-Tangan',
    rarity: 'uncommon',
    icon: '⚔️',
    description: 'Bilah baja tempaan pandai besi dengan ketajaman seimbang.',
    value: 120,
    stackable: false,
    stats: { attack: 26, critChance: 0.08 },
    modelUrl: '/models/weapons/sword_1handed.gltf'
  },
  wpn_shadow_dagger: {
    id: 'wpn_shadow_dagger',
    name: 'Belati Bayangan Assassin',
    type: 'weapon',
    category: 'Belati Cepat',
    rarity: 'rare',
    icon: '🗡️✨',
    description: 'Bilah belati ramping dengan racun kelam, peluang serangan kritikal luar biasa tinggi.',
    value: 280,
    stackable: false,
    stats: { attack: 30, critChance: 0.28 },
    modelUrl: '/models/weapons/dagger.gltf'
  },
  wpn_knight_blade: {
    id: 'wpn_knight_blade',
    name: 'Pedang Ksatria Lembah',
    type: 'weapon',
    category: 'Pedang 1-Tangan',
    rarity: 'rare',
    icon: '✨⚔️',
    description: 'Pedang kehormatan pengawal Valley Village. Ringan, mematikan, dan presisi tinggi.',
    value: 350,
    stackable: false,
    stats: { attack: 38, critChance: 0.14 },
    modelUrl: '/models/weapons/knight_sword.glb'
  },
  wpn_battle_axe: {
    id: 'wpn_battle_axe',
    name: 'Kapak Perang Beruang',
    type: 'weapon',
    category: 'Kapak Tempur',
    rarity: 'rare',
    icon: '🪓',
    description: 'Kapak baja tebal dengan daya hancur brutal terhadap pertahanan musuh.',
    value: 420,
    stackable: false,
    stats: { attack: 45, critChance: 0.12 },
    modelUrl: '/models/weapons/axe_1handed.gltf'
  },
  wpn_greatsword: {
    id: 'wpn_greatsword',
    name: 'Claymore Dua-Tangan',
    type: 'weapon',
    category: 'Pedang Besar 2-Tangan',
    rarity: 'epic',
    icon: '🗡️🔥',
    description: 'Bilah raksasa penghancur pertahanan dengan daya tebas yang memecah barisan musuh.',
    value: 650,
    stackable: false,
    stats: { attack: 52, critChance: 0.16 },
    modelUrl: '/models/weapons/sword_2handed.gltf'
  },
  wpn_magic_blade: {
    id: 'wpn_magic_blade',
    name: 'Pedang Sihir Arcana',
    type: 'weapon',
    category: 'Pusaka Sihir Legendaris',
    rarity: 'legendary',
    icon: '🌟⚔️',
    description: 'Pusaka sihir kuno dengan ukiran rune bercahaya mistis. Memberikan bonus ATK tinggi dan Vitalitas HP.',
    value: 1200,
    stackable: false,
    stats: { attack: 75, critChance: 0.22, maxHp: 30 },
    modelUrl: '/models/weapons/magic_sword.glb'
  },
  wpn_marauder_cleaver: {
    id: 'wpn_marauder_cleaver',
    name: 'Kapak Berat Marauder',
    type: 'weapon',
    category: 'Senjata Berat',
    rarity: 'uncommon',
    icon: '🪓',
    description: 'Senjata berat bergerigi yang dirampas dari penyamun rimba.',
    value: 180,
    stackable: false,
    stats: { attack: 34, critChance: 0.06, defense: -2 },
    modelUrl: '/models/weapons/axe_1handed.gltf'
  },

  // --- SHIELDS & OFF-HAND ---
  shd_wood_buckler: {
    id: 'shd_wood_buckler',
    name: 'Perisai Kayu Bulat',
    type: 'shield',
    category: 'Perisai',
    rarity: 'common',
    icon: '🛡️',
    description: 'Perisai bundar dari kayu pinus berlapis besi tipis.',
    value: 45,
    stackable: false,
    stats: { defense: 6, blockRate: 0.10 }
  },
  shd_valley_shield: {
    id: 'shd_valley_shield',
    name: 'Perisai Pengawal Lembah',
    type: 'shield',
    category: 'Perisai',
    rarity: 'rare',
    icon: '🛡️✨',
    description: 'Perisai baja lambang pelindung warga Valley Village.',
    value: 280,
    stackable: false,
    stats: { defense: 14, blockRate: 0.22, maxHp: 20 }
  },
  shd_tower_shield: {
    id: 'shd_tower_shield',
    name: 'Perisai Benteng Menara',
    type: 'shield',
    equipSlot: 'shield',
    category: 'Perisai Berat',
    rarity: 'epic',
    levelReq: 2,
    icon: '🛡️🏰',
    description: 'Perisai besar setinggi dada dengan pelat baja berlapis yang memblokir serangan brutal musuh.',
    value: 520,
    stackable: false,
    stats: { defense: 22, blockRate: 0.28, maxHp: 40 }
  },

  // --- ARMOR ---
  arm_iron_helm: {
    id: 'arm_iron_helm',
    name: 'Helm Baja Ksatria',
    type: 'armor',
    equipSlot: 'armor_head',
    category: 'Pelindung Kepala',
    rarity: 'uncommon',
    levelReq: 1,
    icon: '🪖',
    description: 'Helm baja tempa dengan pelindung hidung yang mengurangi benturan kepala.',
    value: 110,
    stackable: false,
    stats: { defense: 6, maxHp: 15 }
  },
  arm_leather_tunic: {
    id: 'arm_leather_tunic',
    name: 'Rompi Kulit Petualang',
    type: 'armor',
    equipSlot: 'armor_chest',
    category: 'Zirah Kulit',
    rarity: 'common',
    levelReq: 1,
    icon: '🥋',
    description: 'Pakaian kulit tebal yang lentur dan melindungi dari sayatan ringan.',
    value: 60,
    stackable: false,
    stats: { defense: 8, maxHp: 20 }
  },
  arm_steel_chestplate: {
    id: 'arm_steel_chestplate',
    name: 'Plat Zirah Baja Tempa',
    type: 'armor',
    equipSlot: 'armor_chest',
    category: 'Zirah Dada',
    rarity: 'rare',
    levelReq: 2,
    icon: '🛡️🦺',
    description: 'Zirah pelat baja berat tempaan Barin yang menahan sabetan senjata tajam.',
    value: 420,
    stackable: false,
    stats: { defense: 24, maxHp: 60, maxStamina: 10 }
  },
  arm_guard_chainmail: {
    id: 'arm_guard_chainmail',
    name: 'Zirah Rantai Penjaga',
    type: 'armor',
    equipSlot: 'armor_chest',
    category: 'Zirah Rantai',
    rarity: 'rare',
    levelReq: 1,
    icon: '🦺',
    description: 'Zirah anyaman besi kokoh standar prajurit kerajaan Wildlands.',
    value: 320,
    stackable: false,
    stats: { defense: 18, maxHp: 45, maxStamina: 10 }
  },
  arm_leather_gloves: {
    id: 'arm_leather_gloves',
    name: 'Sarung Tangan Kulit Pemburu',
    type: 'armor',
    equipSlot: 'armor_gloves',
    category: 'Sarung Tangan',
    rarity: 'common',
    levelReq: 1,
    icon: '🧤',
    description: 'Sarung tangan kulit rusa yang fleksibel dan mempererat genggaman senjata.',
    value: 75,
    stackable: false,
    stats: { defense: 4, critChance: 0.03 }
  },
  arm_plate_greaves: {
    id: 'arm_plate_greaves',
    name: 'Pelindung Kaki Baja',
    type: 'armor',
    equipSlot: 'armor_legs',
    category: 'Pelindung Kaki',
    rarity: 'uncommon',
    levelReq: 1,
    icon: '👖',
    description: 'Pelindung paha dan lutut dari lempeng baja berengsel.',
    value: 240,
    stackable: false,
    stats: { defense: 12, maxHp: 30 }
  },
  arm_knight_boots: {
    id: 'arm_knight_boots',
    name: 'Sepatu Tempur Ksatria',
    type: 'armor',
    equipSlot: 'armor_boots',
    category: 'Sepatu Tempur',
    rarity: 'uncommon',
    levelReq: 1,
    icon: '🥾',
    description: 'Sepatu bot sol tebal berlapis pelat baja untuk melangkah di medan berbatu.',
    value: 150,
    stackable: false,
    stats: { defense: 8, maxStamina: 15 }
  },

  // --- QUEST ITEMS ---
  quest_marauder_insignia: {
    id: 'quest_marauder_insignia',
    name: 'Tanda Pengenal Marauder',
    type: 'quest_item',
    category: 'Bukti Misi',
    rarity: 'quest',
    icon: '🎖️',
    description: 'Lencana besi bernoda lumpur milik pemimpin penyamun Rumah Tua. Bukti tak terbantahkan untuk Penjaga Rian.',
    value: 0,
    stackable: false
  }
};

export const RPG_LOOT_TABLES = {
  warrior_marauder: {
    goldMin: 35,
    goldMax: 60,
    guaranteed: [
      { itemId: 'quest_marauder_insignia', count: 1 }
    ],
    drops: [
      { itemId: 'potion_hp', count: 1, chance: 0.85 },
      { itemId: 'potion_sta', count: 1, chance: 0.60 },
      { itemId: 'wpn_marauder_cleaver', count: 1, chance: 0.45 }
    ]
  }
};

export const RPG_QUESTS = {
  quest_marauder_threat: {
    id: 'quest_marauder_threat',
    title: 'Ancaman di Rumah Tua Lapuk',
    npcId: 'npc_rian',
    npcName: 'Penjaga Desa Rian',
    summary: 'Basmi penyamun Warrior Marauder di Rumah Tua barat daya (-55, -35) dan bawa kembali tanda pengenalnya.',
    dialogue: {
      intro: 'Salam, Petualang! Akhir-akhir ini jalan setapak barat daya sangat berbahaya. Seorang pembelot bersenjata kapak, Warrior Marauder, telah menduduki Rumah Tua Lapuk di tepi hutan.',
      details: 'Dia sering mengancam Pertapa Mbah Roso yang bermeditasi di dekat sana. Tolong kalahkan Marauder itu dan rampas Tanda Pengenalnya sebagai bukti bahwa rimba telah aman!',
      inProgress: 'Bagaimana petualang? Marauder itu berada di koordinat (-55, -35) dekat pondok tua. Kalahkan dia dan bawa lencananya kemari!',
      completeReady: 'Luar biasa! Kamu berhasil membawa Tanda Pengenal Marauder itu! Berkat keberanianmu, warga Valley Village kini dapat bernafas lega.',
      completed: 'Terima kasih atas bantuanmu, Petualang! Pedang Ksatria Lembah yang kuberikan adalah bukti kehormatan jasamu.'
    },
    objectives: [
      {
        id: 'obj_reach_house',
        text: 'Pergi ke kawasan Rumah Tua Lapuk (-55, -35)',
        type: 'reach_location',
        targetLocation: { x: -55, z: -35, radius: 18 },
        completed: false
      },
      {
        id: 'obj_kill_marauder',
        text: 'Kalahkan Warrior Marauder (0/1)',
        type: 'kill_enemy',
        targetEnemyId: 'warrior_marauder_01',
        requiredCount: 1,
        currentCount: 0,
        completed: false
      },
      {
        id: 'obj_loot_insignia',
        text: 'Ambil Tanda Pengenal Marauder dari rampasan (0/1)',
        type: 'collect_item',
        targetItemId: 'quest_marauder_insignia',
        requiredCount: 1,
        currentCount: 0,
        completed: false
      },
      {
        id: 'obj_report_rian',
        text: 'Lapor kembali ke Penjaga Desa Rian di (18, -15)',
        type: 'talk_npc',
        targetNpcId: 'npc_rian',
        completed: false
      }
    ],
    rewards: {
      xp: 350,
      gold: 150,
      items: [
        { itemId: 'wpn_knight_blade', count: 1 },
        { itemId: 'potion_hp', count: 2 }
      ]
    }
  }
};

/**
 * Level & Attributes Formula
 */
export function getXpRequiredForLevel(level) {
  return Math.floor(140 * Math.pow(1.32, level - 1));
}

export const RPG_SHOPS = {
  weapon: {
    id: 'weapon',
    name: 'Toko Pedang & Senjata',
    merchantName: 'Mang Asep',
    merchantTitle: '⚔️ Ahli Pedang & Pandai Bilah',
    merchantAvatar: '⚔️',
    description: 'Bilah baja tempa, kapak tempur penghancur zirah, belati bayangan, hingga pusaka mistis arcana.',
    items: [
      'wpn_wood_sword',
      'wpn_iron_sword',
      'wpn_shadow_dagger',
      'wpn_knight_blade',
      'wpn_battle_axe',
      'wpn_greatsword',
      'wpn_magic_blade'
    ]
  },
  armor: {
    id: 'armor',
    name: 'Toko Zirah & Perlengkapan Tempur',
    merchantName: 'Barin',
    merchantTitle: '🛡️ Pandai Besi & Ahli Zirah',
    merchantAvatar: '🛡️',
    description: 'Zirah pelat baja berat, pelindung kaki, helm ksatria, sarung tangan berburu, dan perisai benteng menara.',
    items: [
      'arm_iron_helm',
      'arm_steel_chestplate',
      'arm_leather_tunic',
      'arm_guard_chainmail',
      'arm_leather_gloves',
      'arm_plate_greaves',
      'arm_knight_boots',
      'shd_wood_buckler',
      'shd_valley_shield',
      'shd_tower_shield'
    ]
  },
  food: {
    id: 'food',
    name: 'Toko Makanan & Perbekalan',
    merchantName: 'Ibu Mina',
    merchantTitle: '🍞 Pedagang Makanan & Bahan Herbal',
    merchantAvatar: '🍞',
    description: 'Roti gandum hangat, daging panggang gurih, sup jamur lembah, apel segar, teh herbal, dan ramuan obat.',
    items: [
      'food_valley_bread',
      'food_roasted_meat',
      'food_forest_stew',
      'food_sweet_apple',
      'food_herbal_tea',
      'potion_hp',
      'potion_sta'
    ]
  }
};

export function calculatePlayerStats(level = 1, equipment = {}) {
  // Base attributes
  let maxHp = 100 + (level - 1) * 15;
  let maxStamina = 100 + (level - 1) * 5;
  let attack = 16 + (level - 1) * 3;
  let defense = 6 + (level - 1) * 2;
  let critChance = 0.05;
  let blockRate = 0.05;

  // Equipment modifiers across all equipment slots (weapon, shield, head, chest, gloves, legs, boots)
  const allSlots = Object.keys(equipment || {});
  for (const slotKey of allSlots) {
    const rawVal = equipment[slotKey];
    const itemId = typeof rawVal === 'string' ? rawVal : (rawVal && rawVal.id ? rawVal.id : null);
    if (itemId && RPG_ITEMS[itemId]) {
      const stats = RPG_ITEMS[itemId].stats || {};
      if (stats.attack) attack += stats.attack;
      if (stats.defense) defense += stats.defense;
      if (stats.maxHp) maxHp += stats.maxHp;
      if (stats.maxStamina) maxStamina += stats.maxStamina;
      if (stats.critChance) critChance += stats.critChance;
      if (stats.blockRate) blockRate += stats.blockRate;
    }
  }

  return {
    level,
    maxHp: Math.max(50, Math.round(maxHp)),
    maxStamina: Math.max(50, Math.round(maxStamina)),
    attack: Math.max(5, Math.round(attack)),
    defense: Math.max(0, Math.round(defense)),
    critChance: parseFloat(critChance.toFixed(2)),
    blockRate: parseFloat(blockRate.toFixed(2))
  };
}
