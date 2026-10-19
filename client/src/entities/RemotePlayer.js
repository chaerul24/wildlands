import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { lerp, lerpAngle } from '../utils/MathUtils.js';

export class RemotePlayer {
  constructor(scene, terrain, data) {
    this.scene = scene;
    this.terrain = terrain;
    this.id = data.id;
    this.name = data.name || 'Remote Explorer';
    this.color = data.color || '#60a5fa';

    // 3D Visual Character Model (Root origin is at sole of the feet: Y = 0.00)
    this.character = new CharacterModel(this.name, this.color);
    this.mesh = this.character.group;
    this.scene.add(this.mesh);

    // Initial transform
    const px = data.position?.x || 0;
    const pz = data.position?.z || 0;
    const groundY = this.terrain ? this.terrain.getSurfaceHeight(px, pz) : (data.position?.y || 0);
    const yaw = data.rotation?.yaw || 0;

    this.mesh.position.set(px, groundY, pz);
    this.mesh.rotation.y = yaw;

    // Target state for smooth network interpolation
    this.targetPosition = new THREE.Vector3(px, groundY, pz);
    this.targetYaw = yaw;
    this.animState = data.animation || 'idle';

    // Interpolation responsiveness
    this.LERP_FACTOR = 14.0;
  }

  setTargetState(data) {
    if (data.position) {
      this.targetPosition.set(data.position.x, data.position.y, data.position.z);
    }
    if (data.rotation) {
      this.targetYaw = data.rotation.yaw;
    }
    if (data.animation) {
      this.animState = data.animation;
    }
  }

  update(dt) {
    if (dt > 0.1) dt = 0.1;

    // 1. Interpolate horizontal X and Z coordinates
    const factor = 1 - Math.exp(-this.LERP_FACTOR * dt);
    this.mesh.position.x = lerp(this.mesh.position.x, this.targetPosition.x, factor);
    this.mesh.position.z = lerp(this.mesh.position.z, this.targetPosition.z, factor);

    // 2. Exact Grounding Alignment for Remote Players
    if (this.terrain) {
      const surfaceY = this.terrain.getSurfaceHeight(this.mesh.position.x, this.mesh.position.z, this.mesh.position.y);

      if (this.animState && this.animState.startsWith('jump')) {
        // Allow vertical jump arc above ground
        const jumpElevation = Math.max(0, this.targetPosition.y - surfaceY);
        this.mesh.position.y = lerp(this.mesh.position.y, surfaceY + jumpElevation, factor);
      } else {
        // Firmly track terrain elevation (no hovering, no sinking on hills or valleys)
        this.mesh.position.y = surfaceY;
      }
    } else {
      this.mesh.position.y = lerp(this.mesh.position.y, this.targetPosition.y, factor);
    }

    // 3. Smoothly interpolate yaw rotation
    this.mesh.rotation.y = lerpAngle(this.mesh.rotation.y, this.targetYaw, factor);

    // 4. Update Character Animations
    this.character.updateAnimation(this.animState, 1.0, dt);
  }

  destroy() {
    this.scene.remove(this.mesh);

    this.mesh.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      }
    });
  }
}
