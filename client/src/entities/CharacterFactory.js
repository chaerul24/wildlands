import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * CharacterFactory.js
 * Standardizes human character scaling, bone sockets, orientation, materials,
 * and animation sets across both Player characters and Village NPCs.
 */
export class CharacterFactory {
  /**
   * Standard human character dimensions
   */
  static STANDARD_HEIGHT = 1.82; // 1.82 meters standard adult human height
  static STANDARD_ROUGHNESS = 0.85;
  static STANDARD_METALNESS = 0.05;

  /**
   * Animation naming standardizer
   * Maps diverse clip names across KayKit / Quaternius rigs to canonical game anim states
   */
  static CANONICAL_ANIM_MAP = {
    // Idle
    'idle': 'idle',
    'unarmed_idle': 'idle',
    '2h_melee_idle': 'idle',
    
    // Locomotion
    'walking_a': 'walk',
    'walking_b': 'walk',
    'walking_c': 'walk',
    'walk': 'walk',
    'running_a': 'run',
    'running_b': 'run',
    'run': 'run',
    
    // Jump & Acrobatics
    'jump_full_long': 'jump',
    'jump_full_short': 'jump',
    'jump_idle': 'jump_idle',
    'roll': 'roll',
    'dodge_backward': 'roll',
    'dodge_forward': 'roll',
    
    // Combat Attacks (Dual Sword combos)
    '1h_melee_attack_chop': 'attack1',
    '1h_melee_attack_slice_horizontal': 'attack1',
    '1h_melee_attack_slice_diagonal': 'attack2',
    '2h_melee_attack_chop': 'attack2',
    '2h_melee_attack_slice': 'attack1',
    'sword_attack': 'attack1',
    'sword_attack2': 'attack2',
    
    // Damage & Defeat
    'hit_a': 'hurt',
    'hit_b': 'hurt',
    'recievehit': 'hurt',
    'death_a': 'death',
    'death_b': 'death',
    'death': 'death',
    
    // Social & Talking Gestures
    'interact': 'talk',
    'cheer': 'talk_cheer',
    'use_item': 'talk_gesture',
    'spellcast_raise': 'talk_explain'
  };

  /**
   * Normalize and ground a 3D GLTF model hierarchy to standard human proportions
   * @param {THREE.Object3D} model - Cloned or loaded GLTF scene
   * @param {number} customHeight - Target height in meters (default 1.82m)
   * @returns {{ scale: number, height: number, box: THREE.Box3, sockets: Object }}
   */
  static standardizeModel(model, customHeight = CharacterFactory.STANDARD_HEIGHT) {
    if (!model) return null;

    // 1. Compute raw bounding box
    const initialBox = new THREE.Box3().setFromObject(model);
    const initialSize = new THREE.Vector3();
    initialBox.getSize(initialSize);

    // 2. Uniform scale normalization to standard adult human height
    const rawHeight = Math.max(0.1, initialSize.y);
    const uniformScale = customHeight / rawHeight;
    model.scale.set(uniformScale, uniformScale, uniformScale);

    // 3. Ground alignment: Ensure origin is positioned at the soles of the feet (Y = 0)
    const scaledBox = new THREE.Box3().setFromObject(model);
    model.position.y = -scaledBox.min.y;

    // 4. Ensure natural forward orientation (+Z facing)
    model.rotation.set(0, 0, 0);

    // 5. Standardize materials, roughness, metalness, and shadow casting
    const sockets = {
      head: null,
      rightHand: null,
      leftHand: null,
      chest: null,
      pelvis: null
    };

    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          // If array of materials, adjust each
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          for (const mat of mats) {
            if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
              mat.roughness = CharacterFactory.STANDARD_ROUGHNESS;
              mat.metalness = CharacterFactory.STANDARD_METALNESS;
            }
          }
        }
      }

      // Detect standard anatomical attachment sockets
      const nodeName = (child.name || '').toLowerCase();
      if (!sockets.rightHand && (nodeName.includes('handslot.r') || nodeName.includes('weapon.r') || nodeName.includes('hand.r') || nodeName.includes('rightarm'))) {
        sockets.rightHand = child;
      }
      if (!sockets.leftHand && (nodeName.includes('handslot.l') || nodeName.includes('shield.l') || nodeName.includes('hand.l') || nodeName.includes('leftarm'))) {
        sockets.leftHand = child;
      }
      if (!sockets.head && (nodeName.includes('head') || nodeName.includes('skull'))) {
        sockets.head = child;
      }
      if (!sockets.chest && (nodeName.includes('spine') || nodeName.includes('chest') || nodeName.includes('torso'))) {
        sockets.chest = child;
      }
      if (!sockets.pelvis && (nodeName.includes('pelvis') || nodeName.includes('hips') || nodeName.includes('root'))) {
        sockets.pelvis = child;
      }
    });

    return {
      scale: uniformScale,
      height: customHeight,
      box: scaledBox,
      sockets
    };
  }

  /**
   * Maps AnimationClips into a standardized dictionary of AnimationActions
   * @param {THREE.AnimationMixer} mixer
   * @param {Array<THREE.AnimationClip>} animations
   * @returns {Object<string, THREE.AnimationAction>}
   */
  static setupStandardAnimations(mixer, animations = []) {
    const actions = {};
    if (!mixer || !animations || animations.length === 0) return actions;

    for (const clip of animations) {
      const lower = clip.name.toLowerCase();
      const action = mixer.clipAction(clip);
      actions[clip.name] = action;
      actions[lower] = action;

      // Check canonical mapping
      const canonical = CharacterFactory.CANONICAL_ANIM_MAP[lower];
      if (canonical && !actions[canonical]) {
        actions[canonical] = action;
      }

      // Partial fuzzy matches
      if (!actions.idle && lower.includes('idle')) actions.idle = action;
      if (!actions.walk && lower.includes('walk')) actions.walk = action;
      if (!actions.run && lower.includes('run')) actions.run = action;
      if (!actions.jump && (lower.includes('jump') || lower.includes('leap'))) actions.jump = action;
      if (!actions.talk && (lower.includes('interact') || lower.includes('cheer') || lower.includes('talk'))) actions.talk = action;
    }

    // Configure looping rules
    if (actions.attack1) actions.attack1.setLoop(THREE.LoopOnce, 1);
    if (actions.attack2) actions.attack2.setLoop(THREE.LoopOnce, 1);
    if (actions.hurt) actions.hurt.setLoop(THREE.LoopOnce, 1);
    if (actions.death) {
      actions.death.setLoop(THREE.LoopOnce, 1);
      actions.death.clampWhenFinished = true;
    }
    if (actions.roll) actions.roll.setLoop(THREE.LoopOnce, 1);

    return actions;
  }
}
