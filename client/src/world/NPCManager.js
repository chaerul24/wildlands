import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { lerpAngle } from '../utils/MathUtils.js';
import { CharacterFactory } from '../entities/CharacterFactory.js';

// Pre-configured mappings from AI states to GLTF Animation Clips
const STATE_ANIM_MAP = {
  // Idle & Sitting
  idle: 'Idle',
  unarmed_idle: 'Unarmed_Idle',
  sitting_relax: 'Sit_Chair_Idle',
  meditate: 'Sit_Floor_Idle',

  // Walking & Running
  walk: 'Walking_A',
  patrol_walk: 'Walking_A',
  carry_walk: 'Walking_A',
  carry_rest: 'Unarmed_Idle',

  // Farming & Gardening
  farm_hoe: '1H_Melee_Attack_Chop',
  farm_inspect: 'Interact',
  water_plants: 'Spellcast_Raise',
  inspect_flowers: 'Interact',

  // Merchant & Social
  merchant_work: 'Interact',
  merchant_idle: 'Unarmed_Idle',
  wave_greeting: 'Cheer',
  talk_active: 'Cheer',
  talk_listen: 'Unarmed_Idle',
  talking: 'Interact',

  // Sweeping & Guard
  sweeping: '1H_Melee_Attack_Slice_Horizontal',
  sweep_pause: 'Idle',
  patrol_scan: '1H_Ranged_Aiming'
};

/**
 * 3D Human NPC using authentic skinned GLTF models,
 * job-desk tailored equipment and animations, and deterministic AI state machines.
 */
export class NPCCharacter {
  constructor(scene, terrain, config) {
    this.scene = scene;
    this.terrain = terrain;
    this.config = config;

    this.id = config.id;
    this.name = config.name;
    this.title = config.title;
    this.role = config.role;
    this.modelType = config.modelType;
    this.colorHex = config.badgeColor || '#4ade80';

    // World transform
    this.position = new THREE.Vector3(config.initialPos.x, 0, config.initialPos.z);
    this.rotationY = config.initialRotY || 0;
    this.targetRotationY = this.rotationY;

    // AI & State Machine
    this.state = config.initialState || 'idle';
    this.currentState = this.state;
    this.stateTimer = 0;
    this.animTime = Math.random() * 10;
    this.waypoints = config.waypoints || [];
    this.currentWaypointIndex = 0;
    this.walkSpeed = config.walkSpeed || 1.8;
    this.isSitting = config.isSitting || false;
    this.sitSeatHeight = config.sitSeatHeight || 0.48;

    // Talking & Dialogue Interaction State
    this.isTalking = false;
    this.talkingPlayerPos = null;
    this.previousState = null;
    this.previousRotY = this.rotationY;
    this.headBone = null;
    this.chestBone = null;

    // Animation & 3D Model state
    this.isGLTFLoaded = false;
    this.model = null;
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.currentClipName = '';

    // Hierarchical Three.js root
    this.group = new THREE.Group();
    this.group.name = `NPC_${this.id}_${this.name}`;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;
    this.scene.add(this.group);

    // Initial 3D nameplate
    this.createNameplate();

    // Initial ground alignment
    this.alignToGround();
  }

  startTalking(playerPos) {
    if (this.isTalking) return;
    this.isTalking = true;
    this.previousState = this.state;
    this.previousRotY = this.targetRotationY;
    this.state = 'talking';
    this.stateTimer = 0;
    if (playerPos) {
      this.talkingPlayerPos = new THREE.Vector3(playerPos.x, playerPos.y, playerPos.z);
      const dx = playerPos.x - this.position.x;
      const dz = playerPos.z - this.position.z;
      this.targetRotationY = Math.atan2(dx, dz);
    }
    const clipName = this.getClipForState('talking');
    this.playAction(clipName, 0.2);
  }

  stopTalking() {
    if (!this.isTalking) return;
    this.isTalking = false;
    this.state = this.previousState || 'idle';
    this.stateTimer = 0;
    this.talkingPlayerPos = null;
    if (this.previousRotY !== undefined) {
      this.targetRotationY = this.previousRotY;
    } else if (this.config.initialRotY !== undefined) {
      this.targetRotationY = this.config.initialRotY;
    }
    const clipName = this.getClipForState(this.state);
    this.playAction(clipName, 0.25);
  }

  alignToGround() {
    if (!this.terrain) return;
    const groundY = this.terrain.getSurfaceHeight
      ? this.terrain.getSurfaceHeight(this.position.x, this.position.z)
      : this.terrain.getHeightAt(this.position.x, this.position.z);

    if (this.isSitting && !this.isGLTFLoaded) {
      this.position.y = groundY + this.sitSeatHeight - 0.46;
    } else {
      this.position.y = groundY;
    }
    this.group.position.copy(this.position);
  }

  /**
   * Mounts and configures the realistic 3D GLTF character model
   */
  setupGLTFModel(gltf) {
    if (this.isGLTFLoaded) return;

    // 1. Deep clone skinned mesh hierarchy & animations
    const model = SkeletonUtils.clone(gltf.scene);
    this.model = model;

    // 2. Standardize model dimensions, grounding, materials, and sockets using CharacterFactory
    const targetHeight = (this.config.scale || 1.0) * CharacterFactory.STANDARD_HEIGHT;
    const stdInfo = CharacterFactory.standardizeModel(model, targetHeight);
    if (stdInfo && stdInfo.sockets) {
      this.headBone = stdInfo.sockets.head;
      this.chestBone = stdInfo.sockets.chest;
    }

    // 4. Configure built-in weapon accessories (show/hide based on job desk)
    this.configureModelWeapons(model);

    // 5. Attach custom job props (hoe, watering can, broom, crate, cane)
    this.attachJobProps(model);

    // 6. Set up AnimationMixer with all 76 animation clips
    if (gltf.animations && gltf.animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(model);

      for (const clip of gltf.animations) {
        this.actions[clip.name] = this.mixer.clipAction(clip);
      }

      // Play initial animation
      const clipName = this.getClipForState(this.state);
      this.playAction(clipName);
    }

    this.group.add(model);
    this.isGLTFLoaded = true;

    // Re-align ground with GLTF model in place
    this.alignToGround();
  }

  configureModelWeapons(model) {
    const keepWeapons = this.config.keepWeapons || [];

    // Weapon/accessory names present across KayKit character rigs
    const weaponKeywords = [
      '1H_Axe', '2H_Axe', 'Mug', '1H_Sword', '2H_Sword',
      'Badge_Shield', 'Rectangle_Shield', 'Round_Shield', 'Spike_Shield',
      'Spellbook', '1H_Wand', '2H_Staff', 'Knife', '1H_Crossbow', '2H_Crossbow', 'Throwable'
    ];

    model.traverse((node) => {
      for (const kw of weaponKeywords) {
        if (node.name.includes(kw)) {
          const shouldKeep = keepWeapons.some(kwp => node.name.includes(kwp));
          node.visible = shouldKeep;
          break;
        }
      }
    });
  }

  attachJobProps(model) {
    const propType = this.config.prop;
    if (!propType) return;

    // Find right hand bone/slot in skeleton hierarchy
    let rightHandSlot = null;
    let chestSlot = null;

    model.traverse((node) => {
      if (node.name === 'handslot.r' || node.name === 'hand.r') {
        rightHandSlot = node;
      }
      if (node.name === 'chest' || node.name === 'spine') {
        chestSlot = node;
      }
    });

    if (propType === 'farming_hoe' && rightHandSlot) {
      // Realistic wooden-handled farming hoe
      const hoeGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d22, roughness: 0.9 });
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.35 });

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 1.45, 6), woodMat);
      shaft.position.set(0, 0.45, 0);
      shaft.castShadow = true;

      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.03), ironMat);
      blade.position.set(0, 1.15, 0.06);
      blade.rotation.x = Math.PI / 2.3;
      blade.castShadow = true;

      hoeGroup.add(shaft, blade);
      hoeGroup.rotation.x = Math.PI / 2;
      hoeGroup.position.set(0, 0, 0);
      rightHandSlot.add(hoeGroup);
    } else if (propType === 'watering_can' && rightHandSlot) {
      // Galvanized garden watering can
      const canGroup = new THREE.Group();
      const metalMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.65, roughness: 0.4 });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.28, 8), metalMat);
      body.castShadow = true;

      const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.035, 0.26, 6), metalMat);
      spout.position.set(0, 0.06, 0.16);
      spout.rotation.x = 0.75;

      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 8, Math.PI), metalMat);
      handle.position.set(0, 0.14, 0);
      handle.rotation.z = Math.PI / 2;

      canGroup.add(body, spout, handle);
      canGroup.position.set(0, -0.15, 0.05);
      canGroup.rotation.y = Math.PI / 2;
      rightHandSlot.add(canGroup);
    } else if (propType === 'cargo_crate' && (chestSlot || model)) {
      // Wooden cargo crate strapped in front
      const crateMat = new THREE.MeshStandardMaterial({ color: 0x785334, roughness: 0.88 });
      const crateBandMat = new THREE.MeshStandardMaterial({ color: 0x332417, roughness: 0.95 });

      const crateGroup = new THREE.Group();
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.42), crateMat);
      crate.castShadow = true;
      crate.receiveShadow = true;
      crateGroup.add(crate);

      // Iron strapping bands
      const strap1 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.43), crateBandMat);
      strap1.position.y = 0.12;
      const strap2 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.04, 0.43), crateBandMat);
      strap2.position.y = -0.12;
      crateGroup.add(strap1, strap2);

      crateGroup.position.set(0, 0.35, 0.42);
      (chestSlot || model).add(crateGroup);
    } else if (propType === 'yard_broom' && rightHandSlot) {
      // Traditional broom with straw bristles
      const broomGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x63462d, roughness: 0.9 });
      const strawMat = new THREE.MeshStandardMaterial({ color: 0xc49a45, roughness: 0.95 });

      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.5, 6), woodMat);
      handle.position.set(0, 0.4, 0);
      handle.castShadow = true;

      const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 6), strawMat);
      bristles.position.set(0, -0.45, 0);
      bristles.castShadow = true;

      broomGroup.add(handle, bristles);
      broomGroup.rotation.x = Math.PI / 2.2;
      rightHandSlot.add(broomGroup);
    } else if (propType === 'walking_cane' && rightHandSlot) {
      // Elder walking staff
      const caneMat = new THREE.MeshStandardMaterial({ color: 0x4a3424, roughness: 0.9 });
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 1.3, 6), caneMat);
      cane.position.set(0, 0.3, 0);
      cane.rotation.x = Math.PI / 2;
      cane.castShadow = true;
      rightHandSlot.add(cane);
    }
  }

  createNameplate() {
    if (typeof document === 'undefined') return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 76;
    const ctx = canvas.getContext('2d');

    // Rounded tag with role color accent
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    this.roundRect(ctx, 4, 6, 292, 64, 14);
    ctx.fill();

    ctx.strokeStyle = this.colorHex;
    ctx.lineWidth = 3;
    ctx.stroke();

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(this.name, 150, 14);

    // Title / Profession subtitle text
    ctx.fillStyle = this.colorHex;
    ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillText(this.title, 150, 42);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    const scale = this.config.scale || 1.0;
    sprite.position.set(0, 2.25 * scale, 0);
    sprite.scale.set(1.9, 0.48, 1);
    this.group.add(sprite);
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  getClipForState(state) {
    return STATE_ANIM_MAP[state] || 'Idle';
  }

  playAction(clipName, duration = 0.2) {
    if (!this.mixer) return;
    const targetAction = this.actions[clipName] || this.actions['Idle'] || this.actions['Unarmed_Idle'];
    if (!targetAction) return;

    if (this.activeAction && this.activeAction !== targetAction) {
      this.activeAction.fadeOut(duration);
    }

    targetAction.reset().fadeIn(duration).play();
    this.activeAction = targetAction;
    this.currentClipName = clipName;
  }

  /**
   * Main update step called each frame
   */
  update(dt, elapsedTime, playerPos) {
    this.stateTimer += dt;
    this.animTime += dt;

    // 1. Run AI or Talking Handling
    if (this.isTalking) {
      if (this.talkingPlayerPos) {
        const dx = this.talkingPlayerPos.x - this.position.x;
        const dz = this.talkingPlayerPos.z - this.position.z;
        this.targetRotationY = Math.atan2(dx, dz);
        // Distance check: auto stop if player walks too far
        if (Math.hypot(dx, dz) > 5.5) {
          this.stopTalking();
        }
      }
      // Procedural speaking gesture & subtle head nod
      if (this.headBone) {
        this.headBone.rotation.x = Math.sin(this.animTime * 3.2) * 0.08;
        this.headBone.rotation.y = Math.sin(this.animTime * 1.6) * 0.06;
      }
    } else {
      this.updateAI(dt, elapsedTime, playerPos);
    }

    // 2. Play Appropriate Character Animation
    const targetClip = this.getClipForState(this.state);
    if (targetClip !== this.currentClipName) {
      this.playAction(targetClip);
    }

    // 3. Advance SkinnedMesh Animation Mixer
    if (this.mixer) {
      this.mixer.update(dt);
    }

    // 4. Grounding & Orientation
    this.alignToGround();
    this.group.rotation.y = lerpAngle(this.group.rotation.y, this.targetRotationY, Math.min(1.0, dt * 6.0));
  }

  updateAI(dt, elapsedTime, playerPos) {
    const role = this.role;

    // Check player proximity for greetings
    let distToPlayer = 999;
    if (playerPos) {
      const dx = playerPos.x - this.position.x;
      const dz = playerPos.z - this.position.z;
      distToPlayer = Math.sqrt(dx * dx + dz * dz);
    }

    switch (role) {
      case 'farmer':
        // Alternates: Hoeing ground -> Standing up to inspect crops
        if (this.state === 'farm_hoe' && this.stateTimer > 7.0) {
          this.state = 'farm_inspect';
          this.stateTimer = 0;
          if (this.waypoints.length > 0) {
            this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
          }
        } else if (this.state === 'farm_inspect' && this.stateTimer > 4.5) {
          this.state = 'farm_hoe';
          this.stateTimer = 0;
          const wp = this.waypoints[this.currentWaypointIndex];
          if (wp) {
            this.position.x = wp.x;
            this.position.z = wp.z;
            this.targetRotationY = wp.rotY || 0;
          }
        }
        break;

      case 'gardener':
        // Walks between flower boxes -> Waters planter -> Checks leaves
        if (this.state === 'walk') {
          const targetWp = this.waypoints[this.currentWaypointIndex];
          if (targetWp) {
            const arrived = this.stepTowards(targetWp.x, targetWp.z, dt, this.walkSpeed);
            if (arrived) {
              this.state = 'water_plants';
              this.stateTimer = 0;
              this.targetRotationY = targetWp.rotY || this.targetRotationY;
            }
          }
        } else if (this.state === 'water_plants' && this.stateTimer > 6.0) {
          this.state = 'inspect_flowers';
          this.stateTimer = 0;
        } else if (this.state === 'inspect_flowers' && this.stateTimer > 3.5) {
          this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
          this.state = 'walk';
          this.stateTimer = 0;
        }
        break;

      case 'merchant':
      case 'merchant_weapon':
      case 'merchant_armor':
      case 'merchant_food':
        // Behind counter: organizes wares, waves warmly to nearby players
        if (distToPlayer < 7.0) {
          this.state = 'wave_greeting';
          const angleToPlayer = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
          this.targetRotationY = angleToPlayer;
        } else {
          if (this.state === 'wave_greeting') {
            this.state = 'merchant_work';
            this.stateTimer = 0;
            this.targetRotationY = this.config.initialRotY;
          } else if (this.state === 'merchant_work' && this.stateTimer > 8.0) {
            this.state = 'merchant_idle';
            this.stateTimer = 0;
          } else if (this.state === 'merchant_idle' && this.stateTimer > 5.0) {
            this.state = 'merchant_work';
            this.stateTimer = 0;
          }
        }
        break;

      case 'elder':
        // Sits relaxed on the bench, looks left & right at the village well
        this.state = 'sitting_relax';
        if (distToPlayer < 5.0) {
          const angleToPlayer = Math.atan2(playerPos.x - this.position.x, playerPos.z - this.position.z);
          const diff = (angleToPlayer - this.config.initialRotY);
          this.targetRotationY = this.config.initialRotY + Math.max(-0.6, Math.min(0.6, diff));
        } else {
          this.targetRotationY = this.config.initialRotY;
        }
        break;

      case 'porter':
        // Walks carrying crate back and forth between carpenter workshop and market
        if (this.state === 'carry_walk') {
          const targetWp = this.waypoints[this.currentWaypointIndex];
          if (targetWp) {
            const arrived = this.stepTowards(targetWp.x, targetWp.z, dt, this.walkSpeed);
            if (arrived) {
              this.state = 'carry_rest';
              this.stateTimer = 0;
              this.targetRotationY = targetWp.rotY || this.targetRotationY;
            }
          }
        } else if (this.state === 'carry_rest' && this.stateTimer > 4.5) {
          this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
          this.state = 'carry_walk';
          this.stateTimer = 0;
        }
        break;

      case 'sweeper':
        // Sweeps stone walkway rhythmically, pauses, moves along path
        if (this.state === 'sweeping' && this.stateTimer > 9.0) {
          this.state = 'sweep_pause';
          this.stateTimer = 0;
        } else if (this.state === 'sweep_pause' && this.stateTimer > 3.0) {
          this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
          const wp = this.waypoints[this.currentWaypointIndex];
          if (wp) {
            this.position.x = wp.x;
            this.position.z = wp.z;
            this.targetRotationY = wp.rotY || this.targetRotationY;
          }
          this.state = 'sweeping';
          this.stateTimer = 0;
        }
        break;

      case 'guard':
        // Patrols village perimeter waypoints, stops at watchpoints to scan horizon
        if (this.state === 'patrol_walk') {
          const targetWp = this.waypoints[this.currentWaypointIndex];
          if (targetWp) {
            const arrived = this.stepTowards(targetWp.x, targetWp.z, dt, this.walkSpeed);
            if (arrived) {
              this.state = 'patrol_scan';
              this.stateTimer = 0;
              this.targetRotationY = targetWp.rotY || this.targetRotationY;
            }
          }
        } else if (this.state === 'patrol_scan' && this.stateTimer > 5.5) {
          this.currentWaypointIndex = (this.currentWaypointIndex + 1) % this.waypoints.length;
          this.state = 'patrol_walk';
          this.stateTimer = 0;
        }
        break;

      case 'chatter_speaker':
      case 'chatter_listener':
        // Face-to-face pair conversation with alternating speaking and listening gestures
        const timeVal = (typeof elapsedTime === 'number') ? elapsedTime : this.animTime;
        const talkCycle = Math.floor(timeVal / 6.0) % 2;
        if (this.role === 'chatter_speaker') {
          this.state = (talkCycle === 0) ? 'talk_active' : 'talk_listen';
        } else {
          this.state = (talkCycle === 0) ? 'talk_listen' : 'talk_active';
        }
        break;

      case 'hermit':
        // Deep meditation under porch of old weathered house
        this.state = 'meditate';
        break;

      default:
        this.state = 'idle';
        break;
    }
  }

  stepTowards(tx, tz, dt, speed) {
    const dx = tx - this.position.x;
    const dz = tz - this.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 0.35) {
      return true; // Reached waypoint
    }

    const angle = Math.atan2(dx, dz);
    this.targetRotationY = angle;

    const moveStep = Math.min(dist, speed * dt);
    this.position.x += Math.sin(angle) * moveStep;
    this.position.z += Math.cos(angle) * moveStep;

    return false;
  }

  destroy() {
    this.scene.remove(this.group);
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
    this.group.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
          else child.material.dispose();
        }
      }
    });
  }
}

/**
 * NPC Manager - Oversees all 10 world NPCs, preloads authentic 3D GLTF character models,
 * coordinates animations, grounding, performance LOD, and simulation updates.
 */
export class NPCManager {
  constructor(scene, terrain, buildings) {
    this.scene = scene;
    this.terrain = terrain;
    this.buildings = buildings;

    this.loader = new GLTFLoader();
    this.modelCache = {};
    this.npcs = [];

    this.initNPCs();
    this.loadCharacterModels();
  }

  initNPCs() {
    // Roster of 10 Distinct Citizens of Wildlands matched to appropriate 3D human models
    const npcConfigs = [
      // 1. Pak Joko - Petani Sayur & Padi (Valley Village Farm Field)
      {
        id: 'npc_joko',
        name: 'Pak Joko',
        title: '🌾 Petani Lembah',
        role: 'farmer',
        modelType: 'barbarian', // Rustic strong peasant
        badgeColor: '#84cc16',
        scale: 1.02,
        prop: 'farming_hoe',
        initialPos: { x: 33.5, z: -5.8 },
        initialRotY: -0.4,
        initialState: 'farm_hoe',
        waypoints: [
          { x: 33.5, z: -5.8, rotY: -0.4 },
          { x: 35.2, z: -6.5, rotY: 0.8 },
          { x: 32.8, z: -8.2, rotY: -1.2 }
        ]
      },

      // 2. Bu Siti - Pemelihara Bunga Herbalist Cottage
      {
        id: 'npc_siti',
        name: 'Bu Siti',
        title: '🌸 Penyiram Bunga',
        role: 'gardener',
        modelType: 'rogue_hooded', // Herbalist with traveling hood
        badgeColor: '#ec4899',
        scale: 0.96,
        prop: 'watering_can',
        walkSpeed: 1.2,
        initialPos: { x: 40.8, z: 25.8 },
        initialRotY: 0.5,
        initialState: 'water_plants',
        waypoints: [
          { x: 40.8, z: 25.8, rotY: 0.5 },
          { x: 44.2, z: 26.5, rotY: -0.8 },
          { x: 41.5, z: 30.5, rotY: 2.4 }
        ]
      },

      // 3. Mang Asep - Pedagang Pedang & Senjata
      {
        id: 'npc_asep',
        name: 'Mang Asep',
        title: '⚔️ Toko Pedang & Senjata',
        role: 'merchant_weapon',
        modelType: 'rogue', // Weapon smith / merchant with vest
        badgeColor: '#f59e0b',
        scale: 1.0,
        initialPos: { x: 14.1, z: 1.8 },
        initialRotY: 0.4,
        initialState: 'merchant_work'
      },

      // 3b. Pandai Besi Barin - Toko Zirah & Perlengkapan Tempur
      {
        id: 'npc_barin',
        name: 'Barin',
        title: '🛡️ Pandai Besi & Toko Zirah',
        role: 'merchant_armor',
        modelType: 'barbarian', // Muscular smith in rugged leather/apron
        badgeColor: '#ea580c',
        scale: 1.05,
        initialPos: { x: 26.0, z: -16.5 },
        initialRotY: 2.4,
        initialState: 'merchant_work'
      },

      // 3c. Ibu Mina - Toko Makanan & Perbekalan Lembah
      {
        id: 'npc_mina',
        name: 'Ibu Mina',
        title: '🍞 Toko Makanan & Perbekalan',
        role: 'merchant_food',
        modelType: 'rogue_hooded', // Provisioner in herbalist traveling attire
        badgeColor: '#10b981',
        scale: 0.96,
        initialPos: { x: 8.0, z: 13.8 },
        initialRotY: -0.2,
        initialState: 'merchant_work'
      },

      // 4. Kakek Danu - Tetua Desa di Bangku Sumur
      {
        id: 'npc_danu',
        name: 'Kakek Danu',
        title: '👴 Warga Sepuh',
        role: 'elder',
        modelType: 'mage', // Venerable robed elder
        badgeColor: '#a855f7',
        scale: 0.96,
        prop: 'walking_cane',
        isSitting: true,
        sitSeatHeight: 0.48,
        initialPos: { x: 4.2, z: 21.5 },
        initialRotY: Math.PI / 4,
        initialState: 'sitting_relax'
      },

      // 5. Budi - Pengangkut Kotak Kayu
      {
        id: 'npc_budi',
        name: 'Budi',
        title: '📦 Pengangkut Kayu',
        role: 'porter',
        modelType: 'barbarian', // Strong laborer / porter
        badgeColor: '#0ea5e9',
        scale: 1.05,
        prop: 'cargo_crate',
        walkSpeed: 1.6,
        initialPos: { x: 21.0, z: -25.5 },
        initialRotY: 2.2,
        initialState: 'carry_walk',
        waypoints: [
          { x: 21.0, z: -25.5, rotY: 0.8 },
          { x: 18.0, z: -10.0, rotY: 1.5 },
          { x: 15.5, z: 0.5, rotY: 2.2 },
          { x: 18.0, z: -10.0, rotY: -1.5 }
        ]
      },

      // 6. Sari - Penyapu Halaman & Jalan Setapak
      {
        id: 'npc_sari',
        name: 'Sari',
        title: '🧹 Penyapu Halaman',
        role: 'sweeper',
        modelType: 'rogue_hooded', // Cottage maid
        badgeColor: '#14b8a6',
        scale: 0.95,
        prop: 'yard_broom',
        initialPos: { x: 22.8, z: 18.5 },
        initialRotY: -0.6,
        initialState: 'sweeping',
        waypoints: [
          { x: 22.8, z: 18.5, rotY: -0.6 },
          { x: 21.2, z: 16.8, rotY: 0.8 },
          { x: 24.0, z: 20.2, rotY: 2.1 }
        ]
      },

      // 7. Rian - Penjaga Keliling Desa (Knight Armor & Shield)
      {
        id: 'npc_rian',
        name: 'Rian',
        title: '🛡️ Penjaga Desa',
        role: 'guard',
        modelType: 'knight', // Armored knight with sword & shield
        badgeColor: '#e11d48',
        scale: 1.05,
        keepWeapons: ['1H_Sword', 'Round_Shield'],
        walkSpeed: 1.8,
        initialPos: { x: 18.0, z: -15.0 },
        initialRotY: 0.8,
        initialState: 'patrol_walk',
        waypoints: [
          { x: 18.0, z: -15.0, rotY: 0.8 },
          { x: 30.5, z: 8.0, rotY: 1.6 },
          { x: 21.5, z: 35.0, rotY: 2.8 },
          { x: 2.0, z: 20.0, rotY: -1.2 }
        ]
      },

      // 8. Dewi - Warga Desa Mengobrol (Pasangan Bicara A)
      {
        id: 'npc_dewi',
        name: 'Dewi',
        title: '🗣️ Warga Desa',
        role: 'chatter_speaker',
        modelType: 'rogue', // Village citizen
        badgeColor: '#fbbf24',
        scale: 0.98,
        initialPos: { x: 10.6, z: 11.2 },
        initialRotY: -1.8,
        initialState: 'talk_active'
      },

      // 9. Maya - Warga Desa Mengobrol (Pasangan Bicara B)
      {
        id: 'npc_maya',
        name: 'Maya',
        title: '🗣️ Warga Desa',
        role: 'chatter_listener',
        modelType: 'rogue_hooded', // Village citizen
        badgeColor: '#06b6d4',
        scale: 0.97,
        initialPos: { x: 9.4, z: 11.5 },
        initialRotY: 1.3,
        initialState: 'talk_listen'
      },

      // 10. Mbah Roso - Pertapa Hutan di Rumah Tua Lapuk
      {
        id: 'npc_mbah_roso',
        name: 'Mbah Roso',
        title: '🧘 Pertapa Hutan',
        role: 'hermit',
        modelType: 'mage', // Forest Hermit with 2H Staff
        badgeColor: '#6366f1',
        scale: 0.98,
        keepWeapons: ['2H_Staff'],
        isSitting: true,
        sitSeatHeight: 0.35,
        initialPos: { x: -54.0, z: -34.2 },
        initialRotY: Math.PI / 3,
        initialState: 'meditate'
      }
    ];

    for (const config of npcConfigs) {
      const npc = new NPCCharacter(this.scene, this.terrain, config);
      this.npcs.push(npc);
    }
  }

  loadCharacterModels() {
    const modelPaths = {
      barbarian: '/models/characters/Barbarian.glb',
      knight: '/models/characters/Knight.glb',
      mage: '/models/characters/Mage.glb',
      rogue: '/models/characters/Rogue.glb',
      rogue_hooded: '/models/characters/Rogue_Hooded.glb'
    };

    for (const [type, path] of Object.entries(modelPaths)) {
      this.loader.load(
        path,
        (gltf) => {
          this.modelCache[type] = gltf;

          // Mount realistic 3D model to all NPCs expecting this model type
          for (const npc of this.npcs) {
            if (npc.modelType === type) {
              npc.setupGLTFModel(gltf);
            }
          }
        },
        undefined,
        (err) => {
          console.error(`Failed to load character model [${type}] from ${path}:`, err);
        }
      );
    }
  }

  update(dt, elapsedTime, playerPos) {
    if (dt > 0.1) dt = 0.1;

    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];

      // Distance LOD for high performance
      if (playerPos) {
        const dx = playerPos.x - npc.position.x;
        const dz = playerPos.z - npc.position.z;
        const distSq = dx * dx + dz * dz;

        // Skip animation processing if very far (> 180 meters)
        if (distSq > 32400) continue;
      }

      npc.update(dt, elapsedTime, playerPos);
    }
  }

  destroy() {
    for (const npc of this.npcs) {
      npc.destroy();
    }
    this.npcs = [];
  }
}
