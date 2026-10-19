/**
 * assetValidation.test.js
 * Automated QA Suite for Wildlands Game Asset Management
 * Verifies manifest integrity, file existence, binary headers, GLTF/GLB structures,
 * audio/texture integrity, and license compliance.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const CLIENT_DIR = path.resolve(ROOT_DIR, 'client');
const PUBLIC_DIR = path.resolve(CLIENT_DIR, 'public');
const ASSETS_DIR = path.resolve(PUBLIC_DIR, 'assets');
const MANIFEST_PATH = path.join(ASSETS_DIR, 'asset-manifest.json');

console.log('🧪 ========================================================');
console.log('🧪 WILDLANDS ASSET MANAGEMENT & INTEGRATION QA TEST SUITE');
console.log('🧪 ========================================================');

// Test 1: Manifest Existence & Basic Structure
console.log('\n[Test 1] Testing asset-manifest.json Structure & Integrity...');
if (!fs.existsSync(MANIFEST_PATH)) {
  console.error('❌ Manifest not found at:', MANIFEST_PATH);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
console.log(`  ✓ Manifest loaded successfully.`);
console.log(`  ✓ Total Assets Registered: ${manifest.totalAssets}`);
console.log(`  ✓ Categories: ${Object.keys(manifest.categories).join(', ')}`);
console.log(`  ✓ Total Size: ${(manifest.totalSizeBytes / 1024 / 1024).toFixed(2)} MB`);

if (!manifest.assets || manifest.assets.length === 0) {
  throw new Error('Manifest has 0 assets!');
}

// Test 2: Physical File Existence & Non-Zero Size
console.log('\n[Test 2] Verifying Physical File Existence & File Sizes...');
let missingFiles = 0;
let emptyFiles = 0;

for (const asset of manifest.assets) {
  const fullPath = path.join(ASSETS_DIR, asset.path.replace(/^\/assets\//, ''));
  if (!fs.existsSync(fullPath)) {
    console.error(`  ❌ Missing file: ${asset.path} (${fullPath})`);
    missingFiles++;
    continue;
  }
  const stat = fs.statSync(fullPath);
  if (stat.size === 0) {
    console.error(`  ❌ Empty file: ${asset.path}`);
    emptyFiles++;
  }
}

if (missingFiles > 0 || emptyFiles > 0) {
  throw new Error(`Integrity Failure: ${missingFiles} missing files, ${emptyFiles} empty files.`);
}
console.log(`  ✓ All ${manifest.assets.length} assets physically exist with valid file sizes on disk.`);

// Test 3: Binary Header Verification (.glb, .ogg, .jpg, .gltf)
console.log('\n[Test 3] Verifying Binary Headers & Container Formats...');
let validGlbCount = 0;
let validGltfCount = 0;
let validAudioCount = 0;
let validTextureCount = 0;

for (const asset of manifest.assets) {
  const fullPath = path.join(ASSETS_DIR, asset.path.replace(/^\/assets\//, ''));
  const buf = fs.readFileSync(fullPath);

  if (asset.format === 'glb') {
    // GLB magic is 0x46546C67 ("glTF")
    const magic = buf.toString('ascii', 0, 4);
    if (magic !== 'glTF') {
      throw new Error(`Corrupted GLB file: ${asset.path} (Magic: ${magic})`);
    }
    const version = buf.readUInt32LE(4);
    if (version !== 2) {
      throw new Error(`Unsupported GLB version ${version} in ${asset.path}`);
    }
    validGlbCount++;
  } else if (asset.format === 'gltf') {
    // GLTF is valid JSON
    const parsed = JSON.parse(buf.toString('utf8'));
    if (!parsed.asset || parsed.asset.version !== '2.0') {
      throw new Error(`Invalid GLTF container: ${asset.path}`);
    }
    validGltfCount++;
  } else if (asset.format === 'ogg') {
    // Ogg magic is "OggS"
    const magic = buf.toString('ascii', 0, 4);
    if (magic !== 'OggS') {
      throw new Error(`Corrupted OGG audio file: ${asset.path}`);
    }
    validAudioCount++;
  } else if (asset.format === 'jpg') {
    // JPEG start of image marker is 0xFF 0xD8
    if (buf[0] !== 0xff || buf[1] !== 0xd8) {
      throw new Error(`Corrupted JPEG texture file: ${asset.path}`);
    }
    validTextureCount++;
  }
}

console.log(`  ✓ Validated ${validGlbCount} GLB binary models.`);
console.log(`  ✓ Validated ${validGltfCount} GLTF JSON models.`);
console.log(`  ✓ Validated ${validAudioCount} OGG Vorbis sound effects.`);
console.log(`  ✓ Validated ${validTextureCount} JPG PBR ground textures.`);

// Test 4: Skeletal Animation Clips in Key Models
console.log('\n[Test 4] Verifying Animation Clips in Humanoids & Monsters...');
const skeletonAsset = manifest.assets.find(a => a.id === 'enemy_skeleton_warrior');
if (!skeletonAsset) throw new Error('Skeleton warrior not in manifest!');
const skeletonMeta = skeletonAsset.meta;
if (!skeletonMeta || !skeletonMeta.animations || skeletonMeta.animations.length === 0) {
  throw new Error('Skeleton warrior missing animations!');
}
console.log(`  ✓ Skeleton Warrior has ${skeletonMeta.animations.length} animations: ${skeletonMeta.animations.slice(0, 8).join(', ')}...`);

const demonAsset = manifest.assets.find(a => a.id === 'enemy_blue_demon');
if (!demonAsset) throw new Error('Frost demon not in manifest!');
const demonMeta = demonAsset.meta;
if (!demonMeta || !demonMeta.animations || demonMeta.animations.length === 0) {
  throw new Error('Frost demon missing animations!');
}
console.log(`  ✓ Frost Demon has ${demonMeta.animations.length} animations: ${demonMeta.animations.join(', ')}`);

// Test 5: Legal & Licensing Audit
console.log('\n[Test 5] Verifying Licensing & Attribution Compliance...');
const allowedLicenses = ['CC0 1.0 Universal', 'CC-BY 4.0'];
for (const asset of manifest.assets) {
  if (!allowedLicenses.includes(asset.license)) {
    throw new Error(`Unapproved license "${asset.license}" for asset ${asset.id}`);
  }
  if (!asset.source) {
    throw new Error(`Missing source attribution for asset ${asset.id}`);
  }
}
console.log(`  ✓ 100% of assets strictly adhere to CC0 or CC-BY 4.0 permissive open licenses.`);

console.log('\n🧪 ========================================================');
console.log('🧪 ALL ASSET MANAGEMENT & VALIDATION QA TESTS PASSED! (100%)');
console.log('🧪 ========================================================');
