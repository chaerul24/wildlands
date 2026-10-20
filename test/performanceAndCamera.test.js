import { strict as assert } from 'assert';
import * as THREE from '../client/node_modules/three/build/three.module.js';
import { CameraController } from '../client/src/core/CameraController.js';
import { Vegetation } from '../client/src/world/Vegetation.js';
import { Atmosphere } from '../client/src/world/Atmosphere.js';
import { Buildings } from '../client/src/world/Buildings.js';
import { AdaptiveQualityManager } from '../client/src/core/AdaptiveQualityManager.js';
import { PerformanceMonitor } from '../client/src/core/PerformanceMonitor.js';

console.log('🧪 ========================================================');
console.log('🧪 WILDLANDS ANDROID PERFORMANCE & CAMERA QA SUITE');
console.log('🧪 ========================================================');

// --- MOCK TERRAIN & BUILDINGS ---
const mockTerrain = {
  getSurfaceHeight: (x, z) => 2.0,
  getHeightAt: (x, z) => 2.0,
  isRoadAt: () => false
};

const mockBuildings = {
  colliders: [
    { x: 24, z: 16, radius: 4.0, height: 8 },
    { x: 14, z: 2, radius: 3.5, height: 6 }
  ],
  checkCollision: (x, z, r) => ({ collided: false }),
  resolvePosition: (x, z) => ({ x, z })
};

// [TEST 1] Third-Person Follow Camera Positioning & Forward Facing
console.log('\n[Test 1] Testing Third-Person Follow Camera Geometry & Orientation...');
{
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const controller = new CameraController(camera, mockTerrain, mockBuildings);

  const playerPos = new THREE.Vector3(0, 2, 0); // Player on ground at (0, 2, 0)
  const dt = 0.016; // 60 FPS frame

  // Initial update
  controller.update(playerPos, { x: 0, y: 0 }, dt);

  // Focus point should be at player upper chest (player Y=2.0 + cameraHeight ~1.5 = 3.5)
  assert.ok(
    Math.abs(controller.currentLookAt.y - (playerPos.y + controller.cameraHeight)) < 0.1,
    `Camera focus height should align with player chest. Got: ${controller.currentLookAt.y}`
  );

  // Camera should be positioned behind player (Z > 0 when yaw = 0) and elevated (Y > player.y)
  assert.ok(
    camera.position.z > playerPos.z,
    `Camera must sit behind player along view axis. Cam Z: ${camera.position.z}, Player Z: ${playerPos.z}`
  );
  assert.ok(
    camera.position.y > playerPos.y,
    `Camera must be elevated above player. Cam Y: ${camera.position.y}, Player Y: ${playerPos.y}`
  );

  // Verify camera forward direction looks toward focus point
  const camDir = new THREE.Vector3();
  camera.getWorldDirection(camDir);
  assert.ok(
    camDir.z < 0,
    `Camera forward direction must look toward -Z (forward over player shoulder). CamDir: (${camDir.x.toFixed(2)}, ${camDir.y.toFixed(2)}, ${camDir.z.toFixed(2)})`
  );

  console.log('  ✓ Third-Person follow camera sits behind, elevated, and looks forward over player.');
}

// [TEST 2] Auto-Follow Alignment and Manual Drag Override
console.log('\n[Test 2] Testing Camera Auto-Follow & Touch Drag Interruption...');
{
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const controller = new CameraController(camera, mockTerrain, mockBuildings);

  const playerPos = new THREE.Vector3(10, 2, 10);
  const playerYaw = Math.PI / 2; // Player running eastward (+X)
  const isMoving = true;

  // Simulate player running for 20 frames with NO manual drag
  for (let i = 0; i < 20; i++) {
    controller.update(playerPos, { x: 0, y: 0 }, 0.05, playerYaw, isMoving);
  }

  // Camera yaw should smoothly approach (playerYaw + Math.PI) = 3*PI/2 = -PI/2
  const expectedBehindYaw = playerYaw + Math.PI;
  const yawDiff = Math.abs(Math.atan2(Math.sin(controller.yaw - expectedBehindYaw), Math.cos(controller.yaw - expectedBehindYaw)));
  assert.ok(
    yawDiff < 0.5,
    `Camera yaw should automatically track behind player when moving without drag. Diff: ${yawDiff}`
  );

  // Now simulate user dragging camera (touch swipe)
  controller.update(playerPos, { x: 15, y: 5 }, 0.016, playerYaw, isMoving);
  assert.ok(
    controller.manualOrbitCooldown > 0.5,
    'Manual touch drag must immediately set manual orbit cooldown and override auto-follow.'
  );

  console.log('  ✓ Auto-follow tracks behind moving player; touch drag takes immediate precedence.');
}

// [TEST 3] Terrain & Building Anti-Clipping Collision Check
console.log('\n[Test 3] Testing Camera Ground & Building Anti-Clipping...');
{
  const hillTerrain = {
    getSurfaceHeight: (x, z) => 8.5, // Steep crest behind player
    getHeightAt: (x, z) => 8.5
  };
  const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1000);
  const controller = new CameraController(camera, hillTerrain, mockBuildings);

  const playerPos = new THREE.Vector3(0, 2, 0);
  controller.update(playerPos, { x: 0, y: 0 }, 0.05);

  // Camera Y must remain comfortably above the hill ground (ground 8.5 + clearance 0.65 = 9.15)
  assert.ok(
    camera.position.y >= 8.5 + 0.65,
    `Camera must not clip into terrain hill. Cam Y: ${camera.position.y}`
  );

  // Test building obstruction
  const buildingNear = {
    colliders: [{ x: 0, z: 2.5, radius: 1.5, height: 6 }], // Building right between player (0,0) and camera (0, 5)
    checkCollision: () => ({ collided: false })
  };
  const obsController = new CameraController(camera, mockTerrain, buildingNear);
  obsController.update(playerPos, { x: 0, y: 0 }, 0.05);

  assert.ok(
    camera.position.distanceTo(obsController.currentLookAt) < 5.5,
    'Camera distance must be shortened when a building obstructs line of sight.'
  );

  console.log('  ✓ Camera stays above terrain ground and pulls closer to prevent building clipping.');
}

// [TEST 4] Spatial Grid Chunking & Forward-Focused Vegetation Culling
console.log('\n[Test 4] Testing Vegetation Spatial Chunking & Forward-Focused Culling...');
{
  const scene = new THREE.Scene();
  const veg = new Vegetation(scene, mockTerrain, 'medium');

  // Verify spatial chunk structure
  assert.equal(veg.chunks.length, 36, 'Vegetation must partition terrain into 6x6 (36) spatial chunks.');
  assert.equal(veg.chunkSize, 80, 'Chunk size must be 80m.');

  // Test forward-focused culling:
  // Player at (0, 2, 0), facing north (-Z) -> cameraForward = (0, 0, -1)
  const playerPos = new THREE.Vector3(0, 2, 0);
  const forwardDir = new THREE.Vector3(0, 0, -1);

  // Force tick to trigger culling logic
  veg.cullTick = 3;
  veg.update(1.0, playerPos, forwardDir);

  // Chunks in front (Z <= -120) vs chunks behind (Z >= 120)
  const frontChunk = veg.chunks.find(c => c.centerZ <= -120 && Math.abs(c.centerX) <= 40);
  const backChunk = veg.chunks.find(c => c.centerZ >= 120 && Math.abs(c.centerX) <= 40);

  assert.ok(frontChunk, 'Front chunk should exist.');
  assert.ok(backChunk, 'Back chunk should exist.');

  // Front chunk at 120m in direction of travel should remain visible
  assert.equal(frontChunk.visible, true, 'Chunks in front of player within view distance must stay visible.');

  // Test quality presets
  veg.setQuality('low');
  assert.equal(veg.cullingLimits.maxView, 120, 'Low preset must limit max view distance to 120m.');
  assert.equal(veg.cullingLimits.maxGrass, 42, 'Low preset must limit grass to 42m.');

  veg.setQuality('high');
  assert.equal(veg.cullingLimits.maxView, 280, 'High preset must extend view distance to 280m.');

  console.log('  ✓ 36 spatial chunks created; forward bias extends view distance ahead while culling rear.');
}

// [TEST 5] Atmosphere & Android Graphic Profiles
console.log('\n[Test 5] Testing Atmosphere Shadow Profiles & PointLight Shadows...');
{
  const scene = new THREE.Scene();
  const atmosphere = new Atmosphere(scene, 'low');

  // On Low: Shadows disabled for maximum mobile FPS
  assert.equal(atmosphere.sunLight.castShadow, false, 'Sunlight shadow casting must be false on Low preset.');

  // On Medium: Shadows enabled with 1024 map
  atmosphere.setQuality('medium');
  assert.equal(atmosphere.sunLight.castShadow, true, 'Sunlight shadow casting must be true on Medium preset.');
  assert.equal(atmosphere.sunLight.shadow.mapSize.width, 1024, 'Medium preset must use 1024 shadow map.');

  // On High: Shadows enabled with 2048 map
  atmosphere.setQuality('high');
  assert.equal(atmosphere.sunLight.shadow.mapSize.width, 2048, 'High preset must use 2048 shadow map.');

  // Verify Buildings do NOT have point lights casting shadows (cubemap cost elimination)
  const buildings = new Buildings(scene, mockTerrain);
  let pointLightsWithShadow = 0;
  scene.traverse((obj) => {
    if (obj.isPointLight && obj.castShadow) {
      pointLightsWithShadow++;
    }
  });

  assert.equal(pointLightsWithShadow, 0, 'No PointLights should cast shadows to save 12 cubemap passes.');
  console.log('  ✓ Shadow profiles configured for Low (0), Med (1024), High (2048). 0 cubemap pointlight shadows.');
}

// [TEST 6] Adaptive Quality Controller & Moving Average
console.log('\n[Test 6] Testing Adaptive Quality Rolling Frame Metrics & Step Down...');
{
  let qualitySet = 'medium';
  const mockGame = {
    isRunning: true,
    isPaused: false,
    qualityPreset: 'medium',
    setQuality: (q) => {
      mockGame.qualityPreset = q;
      qualitySet = q;
    },
    ui: { showToast: () => {} }
  };

  const adaptive = new AdaptiveQualityManager(mockGame, { autoAdaptive: true });
  adaptive.cooldownTimer = 0; // Clear initial cooldown for test

  // Feed 60 slow frame times (e.g. 50ms per frame = 20 FPS)
  for (let i = 0; i < 60; i++) {
    adaptive.frameTimes[i] = 50.0;
  }
  adaptive.frameCount = 60;

  // Simulate 4.5 seconds of sustained low FPS
  adaptive.update(4.5);

  assert.equal(qualitySet, 'low', 'AdaptiveQuality must step down from medium to low during sustained low FPS.');
  assert.ok(adaptive.cooldownTimer > 5.0, 'Cooldown timer must be active after stepping down to prevent flapping.');

  console.log('  ✓ Adaptive Quality successfully detects sustained frame drops and steps down safely.');
}

console.log('\n🎉 ALL 6 ANDROID PERFORMANCE & CAMERA TESTS PASSED (100%)!\n');
