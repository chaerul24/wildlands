import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clamp, lerpAngle } from '../utils/MathUtils.js';

export class EnemyController {
  constructor(scene, terrain, buildings, config = {}) {
    this.scene = scene;
    this.terrain = terrain;
    this.buildings = buildings;

    this.id = config.id || 'warrior_marauder_01';
    this.name = config.name || 'Warrior Marauder';
    this.level = config.level || 3;

    // Attributes & Stats
    this.maxHp = config.maxHp || 100;
    this.hp = this.maxHp;
    this.attackDamage = config.attackDamage || 15;
    this.detectionRadius = config.detectionRadius || 14.0;
    this.loseTargetRadius = config.loseTargetRadius || 26.0;
    this.attackRange = config.attackRange || 2.2;
    this.attackCooldown = config.attackCooldown || 1.6;
    this.walkSpeed = config.walkSpeed || 2.2;
    this.runSpeed = config.runSpeed || 5.2;

    // AI States: 'PATROL' | 'INVESTIGATE' | 'CHASE' | 'ATTACK' | 'HURT' | 'DEATH'
    this.state = 'PATROL';
    this.stateTime = 0;
    this.attackTimer = 0;
    this.hasDealtDamageThisSwing = false;
    this.hurtTimer = 0;
    this.isDead = false;

    // Position & Orientation
    this.position = new THREE.Vector3(config.spawnX || -52, 0, config.spawnZ || -32);
    this.position.y = this.terrain.getSurfaceHeight(this.position.x, this.position.z);
    this.velocity = new THREE.Vector3();
    this.yaw = 0;
    this.targetYaw = 0;

    // Waypoints around the Old Dilapidated House at (-55, -35)
    this.waypoints = [
      new THREE.Vector3(-50, 0, -31),
      new THREE.Vector3(-61, 0, -29),
      new THREE.Vector3(-64, 0, -41),
      new THREE.Vector3(-49, 0, -42)
    ];
    this.currentWaypointIdx = 0;
    this.waypointWaitTimer = 0;

    // 3D Scene Node
    this.group = new THREE.Group();
    this.group.name = `Enemy_${this.id}`;
    this.group.position.copy(this.position);
    this.scene.add(this.group);

    // GLTF / Armature Data
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.currentAnim = '';
    this.isGLTFLoaded = false;

    // Procedural Fallback Mesh while loading
    this.proceduralRoot = new THREE.Group();
    this.buildProceduralWarrior();
    this.group.add(this.proceduralRoot);

    // 3D Overhead Health Bar
    this.hpCanvas = null;
    this.hpTexture = null;
    this.hpSprite = null;
    this.createHealthBar();

    // Callbacks
    this.onDealDamageToPlayer = null;
    this.onDeath = null;
    this.onAlert = null;

    // Load authentic 3D Warrior model
    this.loadWarriorModel();
  }

  loadWarriorModel() {
    const loader = new GLTFLoader();
    const tryUrls = ['/models/enemies/Warrior.gltf', '/warrior.gltf'];

    const tryLoad = (idx) => {
      if (idx >= tryUrls.length) return;
      loader.load(
        tryUrls[idx],
        (gltf) => {
          const model = gltf.scene;

          // Compute dimensions and scale to 1.85m height
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);
          const targetHeight = 1.85;
          const scale = targetHeight / Math.max(0.1, size.y);
          model.scale.set(scale, scale, scale);

          // Recompute grounded offset so sole of feet touches Y = 0.00
          box.setFromObject(model);
          model.position.y = -box.min.y;

          // Cast & receive shadow
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Animation Mixer setup
          if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(model);

            gltf.animations.forEach((clip) => {
              const action = this.mixer.clipAction(clip);
              this.actions[clip.name] = action;

              // Also create lowercase alias
              this.actions[clip.name.toLowerCase()] = action;

              // Configure non-looping clips
              if (clip.name === 'Death') {
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
              }
              if (clip.name.includes('Attack')) {
                action.setLoop(THREE.LoopOnce, 1);
              }
              if (clip.name === 'RecieveHit') {
                action.setLoop(THREE.LoopOnce, 1);
              }
            });
          }

          // Swap placeholder with authentic GLTF model
          this.proceduralRoot.visible = false;
          this.group.add(model);
          this.isGLTFLoaded = true;

          // Start initial animation
          this.playAnimation('Walk', 0.15);
        },
        undefined,
        () => {
          tryLoad(idx + 1);
        }
      );
    };

    tryLoad(0);
  }

  buildProceduralWarrior() {
    // Stylized armored knight placeholder while GLTF is streaming
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.7 });
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.8 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.9 });

    // Torso & plate
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), armorMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    this.proceduralRoot.add(torso);

    // Legs
    const lLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), clothMat);
    lLeg.position.set(-0.16, 0.42, 0);
    const rLeg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.75, 0.22), clothMat);
    rLeg.position.set(0.16, 0.42, 0);
    this.proceduralRoot.add(lLeg, rLeg);

    // Head / Helm
    const helm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), armorMat);
    helm.position.y = 1.65;
    this.proceduralRoot.add(helm);

    // Broadsword in hand
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.03), steelMat);
    blade.position.set(0.42, 1.1, 0.25);
    blade.rotation.x = Math.PI / 4;
    this.proceduralRoot.add(blade);
  }

  createHealthBar() {
    this.hpCanvas = document.createElement('canvas');
    this.hpCanvas.width = 256;
    this.hpCanvas.height = 64;

    this.hpTexture = new THREE.CanvasTexture(this.hpCanvas);
    this.hpTexture.minFilter = THREE.LinearFilter;

    const spriteMat = new THREE.SpriteMaterial({
      map: this.hpTexture,
      transparent: true,
      depthTest: false
    });

    this.hpSprite = new THREE.Sprite(spriteMat);
    this.hpSprite.position.set(0, 2.25, 0);
    this.hpSprite.scale.set(1.9, 0.48, 1);
    this.group.add(this.hpSprite);

    this.updateHealthBarCanvas();
  }

  updateHealthBarCanvas() {
    if (!this.hpCanvas) return;
    const ctx = this.hpCanvas.getContext('2d');
    ctx.clearRect(0, 0, 256, 64);

    // 1. Background Pill Container
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 8);
    ctx.fill();
    ctx.strokeStyle = this.state === 'CHASE' || this.state === 'ATTACK' ? '#ef4444' : 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 2. Title & State Tag
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⚔️ ${this.name} [Lv.${this.level}]`, 14, 24);

    // Alert badge indicator on right
    if (this.state === 'INVESTIGATE') {
      ctx.fillStyle = '#f59e0b';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText('! ALERT', 170, 24);
    } else if (this.state === 'CHASE' || this.state === 'ATTACK') {
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText('AGGRO', 185, 24);
    }

    // 3. Health Bar Track
    const barX = 14;
    const barY = 32;
    const barW = 228;
    const barH = 14;

    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    // Health Bar Fill
    const pct = Math.max(0, Math.min(1, this.hp / this.maxHp));
    if (pct > 0) {
      const grad = ctx.createLinearGradient(barX, 0, barX + barW * pct, 0);
      if (pct > 0.5) {
        grad.addColorStop(0, '#ef4444');
        grad.addColorStop(1, '#f97316');
      } else {
        grad.addColorStop(0, '#b91c1c');
        grad.addColorStop(1, '#dc2626');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW * pct, 4, 4);
      ctx.fill();
    }

    // 4. HP Text Value
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(this.hp)} / ${this.maxHp} HP`, 128, 43);

    this.hpTexture.needsUpdate = true;
  }

  playAnimation(name, fadeTime = 0.15) {
    if (this.currentAnim === name || !this.mixer) return;

    // Resolve clip action with fallback
    let nextAction = this.actions[name] || this.actions[name.toLowerCase()];
    if (!nextAction) {
      if (name.includes('Attack')) nextAction = this.actions['Sword_Attack'] || this.actions['Punch'];
      else if (name === 'Run') nextAction = this.actions['Run'] || this.actions['Run_Weapon'] || this.actions['Walk'];
      else if (name === 'Walk') nextAction = this.actions['Walk'];
      else nextAction = this.actions['Idle'] || this.actions['Idle_Weapon'];
    }

    if (!nextAction) return;

    if (this.activeAction && this.activeAction !== nextAction) {
      this.activeAction.fadeOut(fadeTime);
    }

    nextAction.reset().fadeIn(fadeTime).play();
    this.activeAction = nextAction;
    this.currentAnim = name;
  }

  // --- DAMAGE & COMBAT INTERACTION ---
  takeDamage(amount, attackerPosition) {
    if (this.isDead || this.state === 'DEATH') return;

    this.hp = Math.max(0, this.hp - amount);
    this.updateHealthBarCanvas();

    // Turn to face attacker immediately
    if (attackerPosition) {
      const dx = attackerPosition.x - this.position.x;
      const dz = attackerPosition.z - this.position.z;
      this.targetYaw = Math.atan2(dx, dz);
      this.yaw = this.targetYaw;
      this.group.rotation.y = this.yaw;
    }

    if (this.hp <= 0) {
      this.transitionTo('DEATH');
    } else {
      this.transitionTo('HURT');
    }
  }

  transitionTo(newState) {
    if (this.state === 'DEATH') return; // Cannot transition from death
    if (this.state === newState) return;

    this.state = newState;
    this.stateTime = 0;
    this.updateHealthBarCanvas();

    switch (newState) {
      case 'PATROL':
        this.playAnimation('Walk', 0.2);
        break;
      case 'INVESTIGATE':
        this.playAnimation('Idle_Weapon', 0.15);
        if (this.onAlert) this.onAlert();
        break;
      case 'CHASE':
        this.playAnimation('Run_Weapon', 0.15);
        break;
      case 'ATTACK':
        this.playAnimation('Sword_Attack', 0.08);
        this.hasDealtDamageThisSwing = false;
        break;
      case 'HURT':
        this.playAnimation('RecieveHit', 0.05);
        this.hurtTimer = 0.42;
        break;
      case 'DEATH':
        this.isDead = true;
        this.playAnimation('Death', 0.1);
        if (this.onDeath) this.onDeath(this);
        break;
    }
  }

  // --- UPDATE FRAME ---
  update(dt, playerPosition) {
    if (dt > 0.1) dt = 0.1;
    this.stateTime += dt;

    // Advance Animation Mixer
    if (this.mixer) {
      this.mixer.update(dt);
    }

    // Advance attack cooldown
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
    }

    // If dead, stay grounded and skip AI ticks
    if (this.isDead || this.state === 'DEATH') {
      return;
    }

    // Distance to player
    const distToPlayer = playerPosition ? this.position.distanceTo(playerPosition) : 999;

    // AI State Machine Execution
    switch (this.state) {
      case 'PATROL':
        this.updatePatrol(dt, distToPlayer);
        break;
      case 'INVESTIGATE':
        this.updateInvestigate(dt, playerPosition, distToPlayer);
        break;
      case 'CHASE':
        this.updateChase(dt, playerPosition, distToPlayer);
        break;
      case 'ATTACK':
        this.updateAttack(dt, playerPosition, distToPlayer);
        break;
      case 'HURT':
        this.updateHurt(dt, distToPlayer);
        break;
    }

    // Grounding on terrain & building collision resolution
    let nextX = this.position.x + this.velocity.x * dt;
    let nextZ = this.position.z + this.velocity.z * dt;

    if (this.buildings) {
      const resolved = this.buildings.resolvePosition(nextX, nextZ, 0.55);
      nextX = resolved.x;
      nextZ = resolved.z;
    }

    this.position.x = nextX;
    this.position.z = nextZ;
    this.position.y = this.terrain.getSurfaceHeight(this.position.x, this.position.z);
    this.group.position.copy(this.position);

    // Smooth Yaw Rotation
    this.yaw = lerpAngle(this.yaw, this.targetYaw, 1 - Math.exp(-12.0 * dt));
    this.group.rotation.y = this.yaw;
  }

  updatePatrol(dt, distToPlayer) {
    // Check if player entered detection radius
    if (distToPlayer <= this.detectionRadius) {
      this.transitionTo('INVESTIGATE');
      return;
    }

    // Navigate to current waypoint
    const targetWp = this.waypoints[this.currentWaypointIdx];
    const dx = targetWp.x - this.position.x;
    const dz = targetWp.z - this.position.z;
    const distToWp = Math.hypot(dx, dz);

    if (distToWp < 1.2) {
      // Arrived at waypoint, pause briefly then cycle to next
      this.velocity.set(0, 0, 0);
      this.waypointWaitTimer += dt;
      if (this.waypointWaitTimer > 2.0) {
        this.waypointWaitTimer = 0;
        this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.waypoints.length;
        this.playAnimation('Walk', 0.2);
      } else {
        this.playAnimation('Idle', 0.2);
      }
    } else {
      // Move towards waypoint
      this.targetYaw = Math.atan2(dx, dz);
      const moveDir = new THREE.Vector2(dx, dz).normalize();
      this.velocity.x = moveDir.x * this.walkSpeed;
      this.velocity.z = moveDir.y * this.walkSpeed;
      this.playAnimation('Walk', 0.15);
    }
  }

  updateInvestigate(dt, playerPosition, distToPlayer) {
    this.velocity.set(0, 0, 0);

    // Turn directly to face player
    if (playerPosition) {
      const dx = playerPosition.x - this.position.x;
      const dz = playerPosition.z - this.position.z;
      this.targetYaw = Math.atan2(dx, dz);
    }

    // If player flees past leash radius, return to patrol
    if (distToPlayer > this.detectionRadius + 4.0) {
      this.transitionTo('PATROL');
      return;
    }

    // After 0.8s of investigation / warning stance, initiate chase
    if (this.stateTime > 0.8) {
      this.transitionTo('CHASE');
    }
  }

  updateChase(dt, playerPosition, distToPlayer) {
    if (!playerPosition) return;

    // Check if player fled too far away (lose aggro & leash back)
    if (distToPlayer > this.loseTargetRadius) {
      this.transitionTo('PATROL');
      return;
    }

    // Check if within attack range
    if (distToPlayer <= this.attackRange) {
      this.transitionTo('ATTACK');
      return;
    }

    // Run towards player
    const dx = playerPosition.x - this.position.x;
    const dz = playerPosition.z - this.position.z;
    this.targetYaw = Math.atan2(dx, dz);

    const dir = new THREE.Vector2(dx, dz).normalize();
    this.velocity.x = dir.x * this.runSpeed;
    this.velocity.z = dir.y * this.runSpeed;
  }

  updateAttack(dt, playerPosition, distToPlayer) {
    this.velocity.set(0, 0, 0);

    // Keep facing player during attack
    if (playerPosition) {
      const dx = playerPosition.x - this.position.x;
      const dz = playerPosition.z - this.position.z;
      this.targetYaw = Math.atan2(dx, dz);
    }

    // Deal damage at the sword swing strike frame (~0.35s into animation)
    if (!this.hasDealtDamageThisSwing && this.stateTime >= 0.35 && this.stateTime <= 0.65) {
      if (distToPlayer <= this.attackRange + 0.6) {
        this.hasDealtDamageThisSwing = true;
        if (this.onDealDamageToPlayer) {
          this.onDealDamageToPlayer(this.attackDamage, this);
        }
      }
    }

    // Attack animation finishes after ~0.8s
    if (this.stateTime >= 0.85) {
      this.attackTimer = this.attackCooldown;
      // If player still in range, wait for cooldown or strike again
      if (distToPlayer <= this.attackRange) {
        this.playAnimation('Idle_Weapon', 0.1);
        if (this.attackTimer <= 0) {
          this.transitionTo('ATTACK');
        }
      } else {
        // Player stepped away, resume chase
        this.transitionTo('CHASE');
      }
    }
  }

  updateHurt(dt, distToPlayer) {
    this.velocity.set(0, 0, 0);
    this.hurtTimer -= dt;

    if (this.hurtTimer <= 0) {
      // Stagger over: retaliate immediately
      if (distToPlayer <= this.attackRange) {
        this.transitionTo('ATTACK');
      } else {
        this.transitionTo('CHASE');
      }
    }
  }
}
