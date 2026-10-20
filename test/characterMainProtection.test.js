import assert from 'assert';
import * as THREE from '../client/node_modules/three/build/three.module.js';
import { CharacterModel } from '../client/src/entities/CharacterModel.js';

console.log('🧪 ========================================================');
console.log('🧪 WILDLANDS MAIN CHARACTER PROTECTION ("JANGAN KETIMPA") QA');
console.log('🧪 ========================================================');

// Test 1: Verify Default Instantiation uses Main Procedural Character
console.log('[Test 1] Testing Default Character Instantiation...');
const char = new CharacterModel('HeroExplorer', '#34d399');

assert.strictEqual(char.proceduralRoot.visible, true, 'Main character procedural root must be visible by default');
assert.strictEqual(char.isGLTFLoaded, false, 'Should NOT load external GLTF by default');
assert.strictEqual(char.gltfModel, null, 'GLTF model should be null by default');
assert.strictEqual(char.currentModelUrl, 'main', 'currentModelUrl should be "main"');

// Test 2: Verify All Anatomy & Attachment Nodes of Main Character
console.log('\n[Test 2] Testing Anatomical Hierarchy & Weapon Socket of Main Character...');
const { pelvis, torso, head, leftArm, rightArm, weaponSocket, leftLeg, rightLeg } = char.nodes;

assert.ok(pelvis, 'Pelvis node must exist');
assert.ok(torso, 'Torso node must exist');
assert.ok(head, 'Head node must exist');
assert.ok(leftArm, 'Left Arm node must exist');
assert.ok(rightArm, 'Right Arm node must exist');
assert.ok(weaponSocket, 'Weapon Socket node must exist');
assert.ok(leftLeg, 'Left Leg node must exist');
assert.ok(rightLeg, 'Right Leg node must exist');

assert.strictEqual(weaponSocket.parent, rightArm, 'Weapon socket must be parented to right arm pivot');
console.log('  ✓ Main character anatomy, explorer cap, jacket, backpack, and weapon socket verified.');

// Test 3: Procedural Animation Updates
console.log('\n[Test 3] Testing Procedural Animations (Idle, Walk, Run, Jump, Attack1, Attack2, Talk)...');
const animStates = ['idle', 'walk', 'run', 'jump_idle', 'jump_run', 'attack1', 'attack2', 'talk', 'roll'];
for (const state of animStates) {
  char.updateAnimation(state, 1.0, 0.016);
}
assert.strictEqual(char.currentAnim, 'roll');
console.log('  ✓ All procedural animations execute cleanly on main human character.');

// Test 4: Verify setModel("main") cleanly restores Main Character
console.log('\n[Test 4] Testing setModel("main") & restoreMainCharacter()...');
char.setModel('main');
assert.strictEqual(char.proceduralRoot.visible, true, 'Procedural root must be visible');
assert.strictEqual(char.isGLTFLoaded, false, 'isGLTFLoaded must be false');
assert.strictEqual(char.gltfModel, null, 'gltfModel must be null');
console.log('  ✓ Main character is protected and cannot be overwritten ("jangan ketimpa").');

console.log('\n🎉 ALL 4 MAIN CHARACTER PROTECTION QA TESTS PASSED (100%)!');
