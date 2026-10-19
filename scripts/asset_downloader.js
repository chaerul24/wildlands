/**
 * asset_downloader.js
 * Automated Game Asset Manager for Wildlands 3D RPG
 * Downloads, extracts, validates, and installs CC0 / permissive 3D models, textures, and audio.
 */

import fs from 'fs';
import path from 'path';
import https from 'https';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_DIR = path.resolve(ROOT_DIR, 'client');
const PUBLIC_DIR = path.resolve(CLIENT_DIR, 'public');
const ASSETS_DIR = path.resolve(PUBLIC_DIR, 'assets');
const CACHE_DIR = path.resolve(ROOT_DIR, '.asset_cache');

if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });
if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

// Helper: Download a URL to a local destination file
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(destPath) && fs.statSync(destPath).size > 0) {
      console.log(`[Cache Hit] ${path.basename(destPath)}`);
      return resolve(destPath);
    }

    console.log(`[Downloading] ${url} -> ${path.basename(destPath)}...`);
    const file = fs.createWriteStream(destPath);

    const request = (targetUrl) => {
      https.get(targetUrl, { headers: { 'User-Agent': 'Wildlands-Asset-Manager/1.0' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return request(res.headers.location);
        }
        if (res.statusCode !== 200) {
          file.close();
          fs.unlinkSync(destPath);
          return reject(new Error(`HTTP ${res.statusCode} from ${targetUrl}`));
        }
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            console.log(`[Downloaded] ${path.basename(destPath)} (${fs.statSync(destPath).size} bytes)`);
            resolve(destPath);
          });
        });
      }).on('error', (err) => {
        file.close();
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
        reject(err);
      });
    };

    request(url);
  });
}

// Helper: Inspect GLB contents (header, animations, meshes)
function inspectGlb(filepath) {
  try {
    const buf = fs.readFileSync(filepath);
    if (buf.toString('ascii', 0, 4) !== 'glTF') return { valid: false, error: 'Not GLB magic' };
    const jsonLen = buf.readUInt32LE(12);
    const jsonStr = buf.toString('utf8', 20, 20 + jsonLen);
    const data = JSON.parse(jsonStr);
    return {
      valid: true,
      animations: (data.animations || []).map(a => a.name),
      meshes: (data.meshes || []).map(m => m.name).filter(Boolean),
      nodes: (data.nodes || []).map(n => n.name).filter(Boolean)
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Helper: Inspect GLTF JSON
function inspectGltf(filepath) {
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    return {
      valid: true,
      animations: (data.animations || []).map(a => a.name),
      meshes: (data.meshes || []).map(m => m.name).filter(Boolean)
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Helper: Extract specific files from ZIP using unzip with security checks
function extractFromZip(zipPath, fileMap) {
  // fileMap is an object: { 'Models/GLB format/apple.glb': 'items/food/apple.glb' }
  const tempExtractDir = path.join(CACHE_DIR, 'unzip_' + path.basename(zipPath, '.zip'));
  if (!fs.existsSync(tempExtractDir)) fs.mkdirSync(tempExtractDir, { recursive: true });

  const zipFiles = Object.keys(fileMap);
  for (const zipFile of zipFiles) {
    // Path traversal check
    if (zipFile.includes('..') || zipFile.startsWith('/')) {
      throw new Error(`Security Violation: Path traversal in zip file pattern "${zipFile}"`);
    }

    const targetRel = fileMap[zipFile];
    const targetFull = path.join(ASSETS_DIR, targetRel);
    const targetDir = path.dirname(targetFull);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // Use unzip to extract specific file to stdout or temp
    try {
      execSync(`unzip -p "${zipPath}" "${zipFile}" > "${targetFull}"`);
      if (fs.existsSync(targetFull) && fs.statSync(targetFull).size > 0) {
        // Valid extraction
      } else {
        console.warn(`[Warning] Extracted 0 bytes for ${zipFile}`);
      }
    } catch (err) {
      console.error(`[Error] Failed to extract ${zipFile} from ${path.basename(zipPath)}: ${err.message}`);
    }
  }
}

async function main() {
  console.log('🚀 ========================================================');
  console.log('🚀 WILDLANDS GAME ASSET DOWNLOADER & INSTALLER');
  console.log('🚀 ========================================================');

  const manifest = {
    generatedAt: new Date().toISOString(),
    game: 'Wildlands 3D RPG',
    assetRoot: '/assets',
    totalAssets: 0,
    totalSizeBytes: 0,
    categories: {},
    assets: []
  };

  function registerAsset(asset) {
    const fullPath = path.join(ASSETS_DIR, asset.path.replace(/^\/assets\//, ''));
    if (!fs.existsSync(fullPath)) {
      console.warn(`[Manifest Warning] File not found on disk: ${fullPath}`);
      return;
    }
    const size = fs.statSync(fullPath).size;
    asset.size = size;

    // Validation
    let meta = {};
    if (asset.format === 'glb') {
      meta = inspectGlb(fullPath);
      asset.validationStatus = meta.valid ? 'VALIDATED' : 'FAILED_VALIDATION';
    } else if (asset.format === 'gltf') {
      meta = inspectGltf(fullPath);
      asset.validationStatus = meta.valid ? 'VALIDATED' : 'FAILED_VALIDATION';
    } else {
      asset.validationStatus = size > 0 ? 'VALIDATED' : 'FAILED_VALIDATION';
    }
    asset.meta = meta;
    asset.integrationStatus = 'INTEGRATED';

    manifest.assets.push(asset);
    manifest.totalAssets++;
    manifest.totalSizeBytes += size;
    manifest.categories[asset.category] = (manifest.categories[asset.category] || 0) + 1;
    console.log(`  ✓ [Registered] [${asset.category}] ${asset.name} (${(size / 1024).toFixed(1)} KB)`);
  }

  // ----------------------------------------------------
  // 1. DOWNLOAD KENNEY PACKS
  // ----------------------------------------------------
  console.log('\n📦 Step 1: Downloading & Extracting Kenney Asset Packs...');

  // 1a. Food Kit
  const foodZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/food-kit/83086fa91c-1719418518/kenney_food-kit.zip',
    path.join(CACHE_DIR, 'kenney_food-kit.zip')
  );
  extractFromZip(foodZip, {
    'Models/GLB format/bread.glb': 'items/food/bread.glb',
    'Models/GLB format/apple.glb': 'items/food/apple.glb',
    'Models/GLB format/bowl-soup.glb': 'items/food/bowl-soup.glb',
    'Models/GLB format/bacon.glb': 'items/food/roasted-meat.glb',
    'Models/GLB format/bottle-oil.glb': 'items/food/herbal-tea.glb',
    'Models/GLB format/barrel.glb': 'items/food/food-barrel.glb'
  });

  // 1b. Fantasy Town Kit
  const townZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/fantasy-town-kit/efe948d309-1754222374/kenney_fantasy-town-kit_2.0.zip',
    path.join(CACHE_DIR, 'kenney_fantasy-town-kit.zip')
  );
  extractFromZip(townZip, {
    'Models/GLB format/stall-green.glb': 'buildings/shops/stall_food.glb',
    'Models/GLB format/stall-red.glb': 'buildings/shops/stall_weapon.glb',
    'Models/GLB format/stall-bench.glb': 'buildings/shops/stall_bench.glb',
    'Models/GLB format/stall-stool.glb': 'buildings/shops/stall_stool.glb',
    'Models/GLB format/cart.glb': 'buildings/village/wooden_cart.glb',
    'Models/GLB format/cart-high.glb': 'buildings/village/wooden_wagon.glb',
    'Models/GLB format/fountain-round.glb': 'buildings/village/village_fountain.glb',
    'Models/GLB format/lantern.glb': 'buildings/village/iron_lantern.glb',
    'Models/GLB format/fence.glb': 'buildings/village/timber_fence.glb',
    'Models/GLB format/fence-gate.glb': 'buildings/village/timber_fence_gate.glb',
    'Models/GLB format/wall-door.glb': 'buildings/village/cottage_wall_door.glb',
    'Models/GLB format/wall-broken.glb': 'buildings/village/cottage_wall_ruin.glb',
    'Models/GLB format/roof-gable.glb': 'buildings/village/cottage_roof_gable.glb',
    'Models/GLB format/chimney.glb': 'buildings/village/brick_chimney.glb'
  });

  // 1c. Graveyard Kit (Skeletons & Crypts)
  const graveyardZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/graveyard-kit/ba8d4b4517-1760691807/kenney_graveyard-kit_5.0.zip',
    path.join(CACHE_DIR, 'kenney_graveyard-kit.zip')
  );
  extractFromZip(graveyardZip, {
    'Models/GLB format/character-skeleton.glb': 'characters/enemies/skeleton_warrior.glb',
    'Models/GLB format/character-zombie.glb': 'characters/enemies/zombie_marauder.glb',
    'Models/GLB format/gravestone-cross.glb': 'environment/props/cemetery_tombstone.glb',
    'Models/GLB format/crypt.glb': 'environment/props/ancient_crypt.glb'
  });

  // 1d. Furniture Kit
  const furnitureZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip',
    path.join(CACHE_DIR, 'kenney_furniture-kit.zip')
  );
  extractFromZip(furnitureZip, {
    'Models/GLTF format/table.glb': 'buildings/interior/wood_table.glb',
    'Models/GLTF format/chair.glb': 'buildings/interior/wood_chair.glb',
    'Models/GLTF format/bench.glb': 'buildings/interior/tavern_bench.glb',
    'Models/GLTF format/bookcaseOpen.glb': 'buildings/interior/bookcase.glb',
    'Models/GLTF format/books.glb': 'buildings/interior/tome_stack.glb'
  });

  // 1e. Survival Kit & Pirate Kit (Loot, Campfires & Chests)
  const survivalZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/survival-kit/4065a8185b-1712149243/kenney_survival-kit.zip',
    path.join(CACHE_DIR, 'kenney_survival-kit.zip')
  );
  extractFromZip(survivalZip, {
    'Models/GLB format/chest.glb': 'items/loot/treasure_chest.glb',
    'Models/GLB format/campfire-pit.glb': 'environment/props/wilderness_campfire.glb',
    'Models/GLB format/campfire-stand.glb': 'environment/props/campfire_cooking_stand.glb',
    'Models/GLB format/bucket.glb': 'environment/props/wooden_bucket.glb',
    'Models/GLB format/fish.glb': 'items/food/river_trout.glb',
    'Models/GLB format/resource-planks.glb': 'items/loot/crafting_planks.glb'
  });

  const pirateZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/pirate-kit/e6d4bb1525-1771333093/kenney_pirate-kit.zip',
    path.join(CACHE_DIR, 'kenney_pirate-kit.zip')
  );
  extractFromZip(pirateZip, {
    'Models/GLB format/crate.glb': 'environment/props/cargo_crate.glb',
    'Models/GLB format/crate-bottles.glb': 'items/loot/potion_crate.glb',
    'Models/GLB format/bottle.glb': 'items/loot/glass_potion_vial.glb'
  });

  // 1f. Audio Packs (RPG Audio, Impacts, Interface)
  const rpgAudioZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip',
    path.join(CACHE_DIR, 'kenney_rpg-audio.zip')
  );
  extractFromZip(rpgAudioZip, {
    'Audio/chop.ogg': 'audio/rpg/sword_swing.ogg',
    'Audio/doorOpen_1.ogg': 'audio/rpg/door_open.ogg',
    'Audio/doorClose_1.ogg': 'audio/rpg/door_close.ogg',
    'Audio/bookOpen.ogg': 'audio/rpg/dialogue_open.ogg',
    'Audio/cloth1.ogg': 'audio/rpg/dodge_roll.ogg'
  });

  const impactAudioZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip',
    path.join(CACHE_DIR, 'kenney_impact-sounds.zip')
  );
  extractFromZip(impactAudioZip, {
    'Audio/impactMetal_heavy_000.ogg': 'audio/impacts/metal_sword_hit.ogg',
    'Audio/impactWood_medium_000.ogg': 'audio/impacts/wood_shield_block.ogg'
  });

  const uiAudioZip = await downloadFile(
    'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip',
    path.join(CACHE_DIR, 'kenney_interface-sounds.zip')
  );
  extractFromZip(uiAudioZip, {
    'Audio/click_001.ogg': 'audio/ui/btn_click.ogg',
    'Audio/confirmation_001.ogg': 'audio/ui/shop_purchase.ogg',
    'Audio/error_001.ogg': 'audio/ui/insufficient_gold.ogg'
  });

  // ----------------------------------------------------
  // 2. DOWNLOAD WEAPONS & MONSTERS (CC0 & CC-BY 4.0)
  // ----------------------------------------------------
  console.log('\n⚔️ Step 2: Downloading PSX Medieval Weapons & Quaternius Monsters...');

  const weaponsToDownload = [
    {
      url: 'https://raw.githubusercontent.com/Spyridon-Pikoulas/godot-psx-medieval-weapons-free/main/addons/psx_medieval_weapons/models/arming_sword_model.glb',
      dest: path.join(ASSETS_DIR, 'items/weapons/arming_sword.glb'),
      name: 'Arming Sword',
      category: 'weapons',
      source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
      license: 'CC-BY 4.0'
    },
    {
      url: 'https://raw.githubusercontent.com/Spyridon-Pikoulas/godot-psx-medieval-weapons-free/main/addons/psx_medieval_weapons/models/hand_axe_model.glb',
      dest: path.join(ASSETS_DIR, 'items/weapons/hand_axe.glb'),
      name: 'Hand Axe',
      category: 'weapons',
      source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
      license: 'CC-BY 4.0'
    },
    {
      url: 'https://raw.githubusercontent.com/Spyridon-Pikoulas/godot-psx-medieval-weapons-free/main/addons/psx_medieval_weapons/models/round_shield_model.glb',
      dest: path.join(ASSETS_DIR, 'items/armor/round_shield.glb'),
      name: 'Round Shield',
      category: 'armor',
      source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
      license: 'CC-BY 4.0'
    },
    {
      url: 'https://raw.githubusercontent.com/Spyridon-Pikoulas/godot-psx-medieval-weapons-free/main/addons/psx_medieval_weapons/models/torch_model.glb',
      dest: path.join(ASSETS_DIR, 'items/weapons/fire_torch.glb'),
      name: 'Fire Torch',
      category: 'weapons',
      source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
      license: 'CC-BY 4.0'
    },
    {
      url: 'https://raw.githubusercontent.com/Spyridon-Pikoulas/godot-psx-medieval-weapons-free/main/addons/psx_medieval_weapons/models/potion_health_model.glb',
      dest: path.join(ASSETS_DIR, 'items/loot/potion_health_flask.glb'),
      name: 'Health Potion Flask',
      category: 'loot',
      source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
      license: 'CC-BY 4.0'
    }
  ];

  for (const w of weaponsToDownload) {
    const parent = path.dirname(w.dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    await downloadFile(w.url, w.dest);
  }

  // Quaternius Monsters (CC0 self-contained GLTFs)
  const monstersToDownload = [
    {
      url: 'https://raw.githubusercontent.com/511action/descent-3d-assets/main/models/BlueDemon.gltf',
      dest: path.join(ASSETS_DIR, 'characters/enemies/blue_demon.gltf'),
      name: 'Frost Demon',
      category: 'enemies'
    },
    {
      url: 'https://raw.githubusercontent.com/511action/descent-3d-assets/main/models/Demon.gltf',
      dest: path.join(ASSETS_DIR, 'characters/enemies/flame_demon.gltf'),
      name: 'Flame Demon',
      category: 'enemies'
    },
    {
      url: 'https://raw.githubusercontent.com/511action/descent-3d-assets/main/models/Orc.gltf',
      dest: path.join(ASSETS_DIR, 'characters/enemies/orc_berserker.gltf'),
      name: 'Orc Berserker',
      category: 'enemies'
    }
  ];

  for (const m of monstersToDownload) {
    const parent = path.dirname(m.dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    await downloadFile(m.url, m.dest);
  }

  // ----------------------------------------------------
  // 3. DOWNLOAD POLY HAVEN TEXTURES (CC0 1K)
  // ----------------------------------------------------
  console.log('\n🎨 Step 3: Downloading Poly Haven CC0 Textures...');
  const texturesToDownload = [
    {
      url: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/cobblestone_05/cobblestone_05_diff_1k.jpg',
      dest: path.join(ASSETS_DIR, 'textures/ground/cobblestone_diffuse.jpg')
    },
    {
      url: 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/brown_mud_rocks_01/brown_mud_rocks_01_diff_1k.jpg',
      dest: path.join(ASSETS_DIR, 'textures/ground/dirt_path_diffuse.jpg')
    }
  ];

  for (const t of texturesToDownload) {
    const parent = path.dirname(t.dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    await downloadFile(t.url, t.dest);
  }

  // ----------------------------------------------------
  // 4. COPY EXISTING CANONICAL CHARACTERS & WEAPONS INTO ASSETS/
  // ----------------------------------------------------
  console.log('\n📂 Step 4: Cataloging Existing Canonical Assets...');

  // Copy Quaternius characters to /assets/characters/
  const charCopies = [
    { src: 'models/characters/Barbarian.glb', dest: 'characters/npcs/barbarian.glb' },
    { src: 'models/characters/Knight.glb', dest: 'characters/npcs/knight.glb' },
    { src: 'models/characters/Mage.glb', dest: 'characters/npcs/mage.glb' },
    { src: 'models/characters/Rogue.glb', dest: 'characters/npcs/rogue.glb' },
    { src: 'models/characters/Rogue_Hooded.glb', dest: 'characters/npcs/rogue_hooded.glb' },
    { src: 'models/rpg/Warrior.gltf', dest: 'characters/player/warrior.gltf' },
    { src: 'models/rpg/Cleric.gltf', dest: 'characters/npcs/cleric.gltf' },
    { src: 'models/rpg/Monk.gltf', dest: 'characters/npcs/monk.gltf' },
    { src: 'models/rpg/Ranger.gltf', dest: 'characters/npcs/ranger.gltf' },
    { src: 'models/rpg/Wizard.gltf', dest: 'characters/npcs/wizard.gltf' },
    { src: 'models/enemies/Warrior.gltf', dest: 'characters/enemies/warrior_marauder.gltf' }
  ];

  for (const c of charCopies) {
    const srcFull = path.join(PUBLIC_DIR, c.src);
    const destFull = path.join(ASSETS_DIR, c.dest);
    if (fs.existsSync(srcFull)) {
      const parent = path.dirname(destFull);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      fs.copyFileSync(srcFull, destFull);
    }
  }

  // Copy Existing Weapons to /assets/items/weapons/
  const weaponCopies = [
    { src: 'models/weapons/knight_sword.glb', dest: 'items/weapons/knight_sword.glb' },
    { src: 'models/weapons/magic_sword.glb', dest: 'items/weapons/magic_sword.glb' },
    { src: 'models/weapons/sword_1handed.gltf', dest: 'items/weapons/sword_1handed.gltf' },
    { src: 'models/weapons/sword_1handed.bin', dest: 'items/weapons/sword_1handed.bin' },
    { src: 'models/weapons/sword_2handed.gltf', dest: 'items/weapons/sword_2handed.gltf' },
    { src: 'models/weapons/sword_2handed.bin', dest: 'items/weapons/sword_2handed.bin' },
    { src: 'models/weapons/axe_1handed.gltf', dest: 'items/weapons/axe_1handed.gltf' },
    { src: 'models/weapons/axe_1handed.bin', dest: 'items/weapons/axe_1handed.bin' },
    { src: 'models/weapons/dagger.gltf', dest: 'items/weapons/dagger.gltf' },
    { src: 'models/weapons/dagger.bin', dest: 'items/weapons/dagger.bin' }
  ];

  for (const w of weaponCopies) {
    const srcFull = path.join(PUBLIC_DIR, w.src);
    const destFull = path.join(ASSETS_DIR, w.dest);
    if (fs.existsSync(srcFull)) {
      const parent = path.dirname(destFull);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      fs.copyFileSync(srcFull, destFull);
    }
  }

  // Copy Nature Trees, Grass, Rocks to /assets/environment/
  const envCopies = [
    { src: 'tree_default.glb', dest: 'environment/vegetation/tree_default.glb' },
    { src: 'tree_detailed.glb', dest: 'environment/vegetation/tree_detailed.glb' },
    { src: 'tree_oak.glb', dest: 'environment/vegetation/tree_oak.glb' },
    { src: 'tree_pineDefaultA.glb', dest: 'environment/vegetation/tree_pineDefaultA.glb' },
    { src: 'tree_pineTallA.glb', dest: 'environment/vegetation/tree_pineTallA.glb' },
    { src: 'tree_pineTallB.glb', dest: 'environment/vegetation/tree_pineTallB.glb' },
    { src: 'grass_large.glb', dest: 'environment/vegetation/grass_large.glb' },
    { src: 'grass_leafsLarge.glb', dest: 'environment/vegetation/grass_leafsLarge.glb' },
    { src: 'plant_bushDetailed.glb', dest: 'environment/vegetation/plant_bushDetailed.glb' },
    { src: 'rock_largeA.glb', dest: 'environment/rocks/rock_largeA.glb' },
    { src: 'rock_smallA.glb', dest: 'environment/rocks/rock_smallA.glb' },
    { src: 'grass_diffuse.jpg', dest: 'textures/ground/grass_diffuse.jpg' }
  ];

  for (const e of envCopies) {
    const srcFull = path.join(PUBLIC_DIR, e.src);
    const destFull = path.join(ASSETS_DIR, e.dest);
    if (fs.existsSync(srcFull)) {
      const parent = path.dirname(destFull);
      if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
      fs.copyFileSync(srcFull, destFull);
    }
  }

  // ----------------------------------------------------
  // 5. REGISTER ALL ASSETS IN MANIFEST
  // ----------------------------------------------------
  console.log('\n📝 Step 5: Generating Authoritative asset-manifest.json...');

  // A. Characters
  registerAsset({
    id: 'char_player_warrior',
    name: 'Player Warrior (Human Standard 1.82m)',
    category: 'characters',
    path: '/assets/characters/player/warrior.gltf',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'gltf'
  });

  registerAsset({
    id: 'char_npc_barbarian',
    name: 'Village Barbarian Blacksmith Guard',
    category: 'characters',
    path: '/assets/characters/npcs/barbarian.glb',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'char_npc_knight',
    name: 'Village Honor Guard (Penjaga Rian)',
    category: 'characters',
    path: '/assets/characters/npcs/knight.glb',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'char_npc_mage',
    name: 'Valley Mystic & Herbalist (Dewi)',
    category: 'characters',
    path: '/assets/characters/npcs/mage.glb',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'char_npc_rogue',
    name: 'Village Merchant (Mang Asep)',
    category: 'characters',
    path: '/assets/characters/npcs/rogue.glb',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'char_npc_rogue_hooded',
    name: 'Village Scout & Ranger (Maya)',
    category: 'characters',
    path: '/assets/characters/npcs/rogue_hooded.glb',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'char_npc_cleric',
    name: 'Valley Priestess (Ibu Siti)',
    category: 'characters',
    path: '/assets/characters/npcs/cleric.gltf',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'gltf'
  });

  registerAsset({
    id: 'char_npc_monk',
    name: 'Valley Elder Monk (Kakek Danu)',
    category: 'characters',
    path: '/assets/characters/npcs/monk.gltf',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'gltf'
  });

  // B. Enemies
  registerAsset({
    id: 'enemy_skeleton_warrior',
    name: 'Skeleton Warrior (Undead Minion)',
    category: 'enemies',
    path: '/assets/characters/enemies/skeleton_warrior.glb',
    source: 'Kenney Graveyard Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'enemy_zombie_marauder',
    name: 'Zombie Marauder (Infected Brute)',
    category: 'enemies',
    path: '/assets/characters/enemies/zombie_marauder.glb',
    source: 'Kenney Graveyard Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'enemy_blue_demon',
    name: 'Frost Demon (Boss Monster)',
    category: 'enemies',
    path: '/assets/characters/enemies/blue_demon.gltf',
    source: 'Quaternius Ultimate Monsters',
    license: 'CC0 1.0 Universal',
    format: 'gltf'
  });

  registerAsset({
    id: 'enemy_flame_demon',
    name: 'Flame Demon (Infernal Beast)',
    category: 'enemies',
    path: '/assets/characters/enemies/flame_demon.gltf',
    source: 'Quaternius Ultimate Monsters',
    license: 'CC0 1.0 Universal',
    format: 'gltf'
  });

  registerAsset({
    id: 'enemy_orc_berserker',
    name: 'Orc Berserker (Outland Raider)',
    category: 'enemies',
    path: '/assets/characters/enemies/orc_berserker.gltf',
    source: 'Quaternius Ultimate Monsters',
    license: 'CC0 1.0 Universal',
    format: 'gltf'
  });

  registerAsset({
    id: 'enemy_warrior_marauder',
    name: 'Warrior Marauder (Human Bandit)',
    category: 'enemies',
    path: '/assets/characters/enemies/warrior_marauder.gltf',
    source: 'Quaternius Animated RPG Characters',
    license: 'CC0 1.0 Universal',
    format: 'gltf'
  });

  // C. Buildings & Shops
  registerAsset({
    id: 'bld_stall_food',
    name: 'Village Bakery & Produce Stand (Ibu Mina)',
    category: 'shops',
    path: '/assets/buildings/shops/stall_food.glb',
    source: 'Kenney Fantasy Town Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'bld_stall_weapon',
    name: 'Weapon Smith Display Stall (Mang Asep)',
    category: 'shops',
    path: '/assets/buildings/shops/stall_weapon.glb',
    source: 'Kenney Fantasy Town Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'bld_stall_bench',
    name: 'Merchant Counter Bench',
    category: 'shops',
    path: '/assets/buildings/shops/stall_bench.glb',
    source: 'Kenney Fantasy Town Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'bld_village_fountain',
    name: 'Village Plaza Central Stone Fountain',
    category: 'village',
    path: '/assets/buildings/village/village_fountain.glb',
    source: 'Kenney Fantasy Town Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'bld_wooden_cart',
    name: 'Rustic Freight Handcart',
    category: 'village',
    path: '/assets/buildings/village/wooden_cart.glb',
    source: 'Kenney Fantasy Town Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'bld_iron_lantern',
    name: 'Wrought Iron Village Lamp Post',
    category: 'village',
    path: '/assets/buildings/village/iron_lantern.glb',
    source: 'Kenney Fantasy Town Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'bld_timber_fence',
    name: 'Village Border Wooden Fence',
    category: 'village',
    path: '/assets/buildings/village/timber_fence.glb',
    source: 'Kenney Fantasy Town Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  // D. Furniture & Interior
  registerAsset({
    id: 'furn_wood_table',
    name: 'Carved Oak Tavern Dining Table',
    category: 'interior',
    path: '/assets/buildings/interior/wood_table.glb',
    source: 'Kenney Furniture Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'furn_wood_chair',
    name: 'Rustic Cottage Chair',
    category: 'interior',
    path: '/assets/buildings/interior/wood_chair.glb',
    source: 'Kenney Furniture Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'furn_bookcase',
    name: 'Scholar Library Bookcase',
    category: 'interior',
    path: '/assets/buildings/interior/bookcase.glb',
    source: 'Kenney Furniture Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  // E. Weapons & Armor
  registerAsset({
    id: 'wpn_knight_sword',
    name: 'Pedang Kesatria Lembah (Knight Sword)',
    category: 'weapons',
    path: '/assets/items/weapons/knight_sword.glb',
    source: 'Quaternius RPG Weapons',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'wpn_magic_sword',
    name: 'Bilah Sihir Rune (Rune Magic Blade)',
    category: 'weapons',
    path: '/assets/items/weapons/magic_sword.glb',
    source: 'Quaternius RPG Weapons',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'wpn_arming_sword',
    name: 'Pedang Tempa Besi Baja (Arming Sword)',
    category: 'weapons',
    path: '/assets/items/weapons/arming_sword.glb',
    source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
    license: 'CC-BY 4.0',
    format: 'glb'
  });

  registerAsset({
    id: 'wpn_hand_axe',
    name: 'Kapak Tempur Pembelah (Hand Battle Axe)',
    category: 'weapons',
    path: '/assets/items/weapons/hand_axe.glb',
    source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
    license: 'CC-BY 4.0',
    format: 'glb'
  });

  registerAsset({
    id: 'wpn_fire_torch',
    name: 'Obor Api Petualang (Fire Torch)',
    category: 'weapons',
    path: '/assets/items/weapons/fire_torch.glb',
    source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
    license: 'CC-BY 4.0',
    format: 'glb'
  });

  registerAsset({
    id: 'arm_round_shield',
    name: 'Perisai Kayu Berpaku Besi (Round Shield)',
    category: 'armor',
    path: '/assets/items/armor/round_shield.glb',
    source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
    license: 'CC-BY 4.0',
    format: 'glb'
  });

  // F. Food & Consumables
  registerAsset({
    id: 'food_fresh_bread',
    name: 'Roti Gandum Hangat (Fresh Bread)',
    category: 'food',
    path: '/assets/items/food/bread.glb',
    source: 'Kenney Food Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'food_orchard_apple',
    name: 'Apel Kebun Manis (Sweet Orchard Apple)',
    category: 'food',
    path: '/assets/items/food/apple.glb',
    source: 'Kenney Food Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'food_roasted_meat',
    name: 'Daging Panggang Rimba (Roasted Meat)',
    category: 'food',
    path: '/assets/items/food/roasted-meat.glb',
    source: 'Kenney Food Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'food_hot_stew',
    name: 'Sup Jamur Lembah Hangat (Valley Stew)',
    category: 'food',
    path: '/assets/items/food/bowl-soup.glb',
    source: 'Kenney Food Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'food_herbal_tea',
    name: 'Minyak & Ramuan Herbal (Herbal Tonic)',
    category: 'food',
    path: '/assets/items/food/herbal-tea.glb',
    source: 'Kenney Food Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  // G. Loot & Props
  registerAsset({
    id: 'loot_treasure_chest',
    name: 'Peti Harta Karun Kayu Besi (Treasure Chest)',
    category: 'loot',
    path: '/assets/items/loot/treasure_chest.glb',
    source: 'Kenney Survival Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'loot_health_flask',
    name: 'Botol Potion Pemulih Darah (Health Flask)',
    category: 'loot',
    path: '/assets/items/loot/potion_health_flask.glb',
    source: 'HeyHeyThere / Godot PSX Medieval Weapons Free',
    license: 'CC-BY 4.0',
    format: 'glb'
  });

  registerAsset({
    id: 'prop_wilderness_campfire',
    name: 'Api Unggun Rimba (Campfire Pit)',
    category: 'props',
    path: '/assets/environment/props/wilderness_campfire.glb',
    source: 'Kenney Survival Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'prop_cemetery_tombstone',
    name: 'Batu Nisan Kuno Berukir (Ancient Tombstone)',
    category: 'props',
    path: '/assets/environment/props/cemetery_tombstone.glb',
    source: 'Kenney Graveyard Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'prop_ancient_crypt',
    name: 'Bangunan Mausoleum Kubur Kuno (Ancient Crypt)',
    category: 'props',
    path: '/assets/environment/props/ancient_crypt.glb',
    source: 'Kenney Graveyard Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'prop_wooden_bucket',
    name: 'Ember Air Kayu Sumur (Wooden Bucket)',
    category: 'props',
    path: '/assets/environment/props/wooden_bucket.glb',
    source: 'Kenney Survival Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'prop_cargo_crate',
    name: 'Peti Muatan Kayu Ekspor (Cargo Crate)',
    category: 'props',
    path: '/assets/environment/props/cargo_crate.glb',
    source: 'Kenney Pirate Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'loot_crafting_planks',
    name: 'Papan Kayu Bahan Bangunan (Crafting Planks)',
    category: 'loot',
    path: '/assets/items/loot/crafting_planks.glb',
    source: 'Kenney Survival Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  // H. Environment Nature (Trees, Rocks, Bushes)
  registerAsset({
    id: 'env_tree_pine_a',
    name: 'Pohon Pinus Lembah A (Pine Tall A)',
    category: 'vegetation',
    path: '/assets/environment/vegetation/tree_pineTallA.glb',
    source: 'Kenney Nature Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'env_tree_oak',
    name: 'Pohon Ek Rimbun (Oak Tree)',
    category: 'vegetation',
    path: '/assets/environment/vegetation/tree_oak.glb',
    source: 'Kenney Nature Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  registerAsset({
    id: 'env_rock_large_a',
    name: 'Bongkahan Batu Granit Besar (Large Granite Rock)',
    category: 'rocks',
    path: '/assets/environment/rocks/rock_largeA.glb',
    source: 'Kenney Nature Kit',
    license: 'CC0 1.0 Universal',
    format: 'glb'
  });

  // I. Textures
  registerAsset({
    id: 'tex_cobblestone_path',
    name: 'Tekstur Jalan Batu Desa 1K (Cobblestone 05)',
    category: 'textures',
    path: '/assets/textures/ground/cobblestone_diffuse.jpg',
    source: 'Poly Haven',
    license: 'CC0 1.0 Universal',
    format: 'jpg'
  });

  registerAsset({
    id: 'tex_dirt_trail',
    name: 'Tekstur Jalur Tanah Hutan 1K (Brown Mud Rocks 01)',
    category: 'textures',
    path: '/assets/textures/ground/dirt_path_diffuse.jpg',
    source: 'Poly Haven',
    license: 'CC0 1.0 Universal',
    format: 'jpg'
  });

  registerAsset({
    id: 'tex_grass_field',
    name: 'Tekstur Padang Rumput Lembah (Grass Diffuse)',
    category: 'textures',
    path: '/assets/textures/ground/grass_diffuse.jpg',
    source: 'Poly Haven / Wildlands Standard',
    license: 'CC0 1.0 Universal',
    format: 'jpg'
  });

  // J. Audio Effects
  registerAsset({
    id: 'sfx_sword_swing',
    name: 'Suara Tebasan Pedang (Sword Swing Whoosh)',
    category: 'audio',
    path: '/assets/audio/rpg/sword_swing.ogg',
    source: 'Kenney RPG Audio',
    license: 'CC0 1.0 Universal',
    format: 'ogg'
  });

  registerAsset({
    id: 'sfx_metal_hit',
    name: 'Dentang Benturan Logam Pedang (Metal Hit Clang)',
    category: 'audio',
    path: '/assets/audio/impacts/metal_sword_hit.ogg',
    source: 'Kenney Impact Sounds',
    license: 'CC0 1.0 Universal',
    format: 'ogg'
  });

  registerAsset({
    id: 'sfx_shield_block',
    name: 'Benturan Perisai Kayu (Wood Shield Block)',
    category: 'audio',
    path: '/assets/audio/impacts/wood_shield_block.ogg',
    source: 'Kenney Impact Sounds',
    license: 'CC0 1.0 Universal',
    format: 'ogg'
  });

  registerAsset({
    id: 'sfx_shop_purchase',
    name: 'Efek Transaksi Toko (Shop Purchase Chime)',
    category: 'audio',
    path: '/assets/audio/ui/shop_purchase.ogg',
    source: 'Kenney Interface Sounds',
    license: 'CC0 1.0 Universal',
    format: 'ogg'
  });

  registerAsset({
    id: 'sfx_insufficient_gold',
    name: 'Efek Emas Tidak Cukup (Error Buzz)',
    category: 'audio',
    path: '/assets/audio/ui/insufficient_gold.ogg',
    source: 'Kenney Interface Sounds',
    license: 'CC0 1.0 Universal',
    format: 'ogg'
  });

  // Write manifest JSON
  const manifestPath = path.join(ASSETS_DIR, 'asset-manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('\n🎉 ========================================================');
  console.log(`🎉 ASSET DOWNLOAD & INSTALLATION COMPLETE!`);
  console.log(`🎉 Total Assets Registered: ${manifest.totalAssets}`);
  console.log(`🎉 Total Assets Size: ${(manifest.totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`🎉 Manifest Location: ${manifestPath}`);
  console.log('🎉 ========================================================');
}

main().catch((err) => {
  console.error('❌ Asset Downloader Fatal Error:', err);
  process.exit(1);
});
