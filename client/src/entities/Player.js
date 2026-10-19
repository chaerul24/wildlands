import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { clamp, lerpAngle, damp } from '../utils/MathUtils.js';

export class Player {
  constructor(scene, terrain, buildings, name = 'Explorer', color = '#4ade80') {
    this.scene = scene;
    this.terrain = terrain;
    this.buildings = buildings;
    this.name = name;
    this.color = color;

    // 3D Visual Character Model (Root origin is at sole of the feet: Y = 0.00)
    this.character = new CharacterModel(name, color);
    this.mesh = this.character.group;
    this.scene.add(this.mesh);

    // Physics state
    this.position = new THREE.Vector3(0, 0, 0);
    this.velocity = new THREE.Vector3(0, 0, 0);
    this.yaw = 0;
    this.targetYaw = 0;
    this.attackTimer = 0;
    this.rollTimer = 0;

    // Movement constants (comfortable realistic human pace)
    this.WALK_SPEED = 3.6;
    this.RUN_SPEED = 7.8;
    this.ACCELERATION = 28.0;
    this.DAMPING = 12.0;
    this.GRAVITY = 22.0;
    this.JUMP_FORCE = 5.5;

    // Vertical state & grounding
    this.isGrounded = true;
    this.verticalVelocity = 0;
    this.animState = 'idle';

    // Spawn at true terrain height
    this.respawn(0, 0);
  }

  respawn(x, z) {
    const groundY = this.terrain.getSurfaceHeight(x, z);
    this.position.set(x, groundY, z);
    this.mesh.position.copy(this.position);
    this.verticalVelocity = 0;
    this.isGrounded = true;
  }

  attack(attackType = 'attack1') {
    this.attackTimer = 0.55;
    this.attackType = attackType;
    this.animState = attackType;
  }

  update(input, cameraOrYaw, dt) {
    if (dt > 0.1) dt = 0.1;

    // 1. Calculate true camera forward and right on the horizontal ground plane
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();

    if (cameraOrYaw && cameraOrYaw.isCamera) {
      cameraOrYaw.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    } else {
      const yaw = typeof cameraOrYaw === 'number' ? cameraOrYaw : 0;
      forward.set(-Math.sin(yaw), 0, -Math.cos(yaw)).normalize();
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    }

    const moveDirection = new THREE.Vector3(0, 0, 0);

    // Support both analog touch joystick and keyboard WASD
    if (input.touchJoystick && (Math.abs(input.touchJoystick.x) > 0.05 || Math.abs(input.touchJoystick.y) > 0.05)) {
      moveDirection.addScaledVector(forward, -input.touchJoystick.y);
      moveDirection.addScaledVector(right, input.touchJoystick.x);
    } else {
      // W = Move forward in screen/camera direction
      if (input.keys.KeyW || input.keys.ArrowUp) {
        moveDirection.add(forward);
      }
      // S = Move backward towards camera
      if (input.keys.KeyS || input.keys.ArrowDown) {
        moveDirection.sub(forward);
      }
      // D = Move right
      if (input.keys.KeyD || input.keys.ArrowRight) {
        moveDirection.add(right);
      }
      // A = Move left
      if (input.keys.KeyA || input.keys.ArrowLeft) {
        moveDirection.sub(right);
      }
    }

    const isMoving = moveDirection.lengthSq() > 0.001;
    const isSprinting = input.keys.ShiftLeft || input.keys.ShiftRight || input.isTouchSprinting;

    if (isMoving) {
      moveDirection.normalize();

      // Target velocity
      const targetSpeed = isSprinting ? this.RUN_SPEED : this.WALK_SPEED;
      const targetVelX = moveDirection.x * targetSpeed;
      const targetVelZ = moveDirection.z * targetSpeed;

      // Smooth acceleration
      this.velocity.x = damp(this.velocity.x, targetVelX, this.ACCELERATION, dt);
      this.velocity.z = damp(this.velocity.z, targetVelZ, this.ACCELERATION, dt);

      // Target face rotation: align model forward orientation with movement direction
      this.targetYaw = Math.atan2(moveDirection.x, moveDirection.z);
    } else {
      // Deceleration / friction
      this.velocity.x = damp(this.velocity.x, 0, this.DAMPING, dt);
      this.velocity.z = damp(this.velocity.z, 0, this.DAMPING, dt);
    }

    // Smoothly turn character mesh to face movement direction
    if (isMoving) {
      this.yaw = lerpAngle(this.yaw, this.targetYaw, 1 - Math.exp(-14.0 * dt));
      this.mesh.rotation.y = this.yaw;
    }

    // 2. Apply Horizontal Movement & Building Collision Detection
    let nextX = this.position.x + this.velocity.x * dt;
    let nextZ = this.position.z + this.velocity.z * dt;

    if (this.buildings) {
      const resolved = this.buildings.resolvePosition(nextX, nextZ, 0.45);
      nextX = resolved.x;
      nextZ = resolved.z;
    }

    // World boundary clamp
    this.position.x = clamp(nextX, -380, 380);
    this.position.z = clamp(nextZ, -380, 380);

    // 3. Grounding, Slopes & Gravity
    const groundY = this.terrain.getSurfaceHeight(this.position.x, this.position.z, this.position.y);

    if (this.isGrounded) {
      // Check for Jump Input
      if (input.keys.Space) {
        this.verticalVelocity = this.JUMP_FORCE;
        this.isGrounded = false;
        const takeoffSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        this.jumpType = (takeoffSpeed > 0.8 || isMoving) ? 'jump_run' : 'jump_idle';
        this.animState = this.jumpType;
      } else {
        this.verticalVelocity = 0;
        // Firmly track terrain elevation (no floating, no sinking on hills/slopes)
        this.position.y = groundY;
      }
    } else {
      // In air: apply gravity
      this.verticalVelocity -= this.GRAVITY * dt;
      this.position.y += this.verticalVelocity * dt;

      // Landing detection
      if (this.position.y <= groundY) {
        this.position.y = groundY;
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this.jumpType = null;
      }
    }

    // Smooth step-down detection when walking downhill
    if (this.isGrounded && this.verticalVelocity <= 0) {
      const drop = this.position.y - groundY;
      if (drop > 0 && drop <= 0.6) {
        // Smoothly stick to ground on slope
        this.position.y = groundY;
      } else if (drop > 0.6) {
        // Stepped off a cliff/ledge
        this.isGrounded = false;
      }
    }

    // Update 3D visual position (feet touch the terrain exactly at groundY)
    this.mesh.position.copy(this.position);

    // 4. Update Animation State
    const horizontalSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);

    if (this.rollTimer > 0) {
      this.rollTimer -= dt;
      this.animState = 'roll';
    } else if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      this.animState = this.attackType || 'attack1';
    } else if (!this.isGrounded) {
      this.animState = this.jumpType || ((horizontalSpeed > 0.8 || isMoving) ? 'jump_run' : 'jump_idle');
    } else {
      this.jumpType = null;
      if (horizontalSpeed > 0.25) {
        this.animState = (isSprinting && horizontalSpeed > 0.8) || horizontalSpeed > 4.5 ? 'run' : 'walk';
      } else {
        this.animState = 'idle';
      }
    }

    this.character.updateAnimation(this.animState, horizontalSpeed / this.WALK_SPEED, dt);
  }

  getState() {
    return {
      position: {
        x: parseFloat(this.position.x.toFixed(2)),
        y: parseFloat(this.position.y.toFixed(2)),
        z: parseFloat(this.position.z.toFixed(2))
      },
      rotation: {
        yaw: parseFloat(this.yaw.toFixed(3))
      },
      animation: this.animState
    };
  }
}
