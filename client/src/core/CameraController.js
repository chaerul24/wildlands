import * as THREE from 'three';
import { clamp, lerp } from '../utils/MathUtils.js';

export class CameraController {
  constructor(camera, terrain, buildings) {
    this.camera = camera;
    this.terrain = terrain;
    this.buildings = buildings;

    // Angles in radians
    this.yaw = 0;
    this.pitch = 0.25; // Slight downward look
    this.distance = 6.0;
    this.targetDistance = 6.0;
    this.minDistance = 2.0;
    this.maxDistance = 14.0;

    // Settings
    this.sensitivity = 0.0024;
    this.smoothSpeed = 16.0;

    // Target tracking
    this.currentLookAt = new THREE.Vector3();

    // Wheel listener for zoom
    window.addEventListener('wheel', (e) => {
      this.targetDistance += e.deltaY * 0.005;
      this.targetDistance = clamp(this.targetDistance, this.minDistance, this.maxDistance);
    }, { passive: true });
  }

  setSensitivity(val) {
    this.sensitivity = val;
  }

  update(targetPosition, mouseDelta, dt) {
    if (!targetPosition) return;
    if (dt > 0.1) dt = 0.1;

    // 1. Apply mouse delta to spherical angles
    this.yaw -= mouseDelta.x * this.sensitivity;
    this.pitch -= mouseDelta.y * this.sensitivity;

    // Clamp pitch so camera doesn't flip upside down or go underground
    this.pitch = clamp(this.pitch, -Math.PI / 4, Math.PI / 2.6);

    // Smooth zoom distance
    this.distance = lerp(this.distance, this.targetDistance, 1 - Math.exp(-10.0 * dt));

    // 2. Smoothly follow target focus point (player chest/head height)
    const targetFocus = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y + 1.45,
      targetPosition.z
    );

    const followFactor = 1 - Math.exp(-this.smoothSpeed * dt);
    this.currentLookAt.lerp(targetFocus, followFactor);

    // 3. Compute spherical camera offset
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    const offsetX = this.distance * cosPitch * sinYaw;
    const offsetY = this.distance * sinPitch;
    const offsetZ = this.distance * cosPitch * cosYaw;

    let desiredCameraPos = new THREE.Vector3(
      this.currentLookAt.x + offsetX,
      this.currentLookAt.y + offsetY,
      this.currentLookAt.z + offsetZ
    );

    // 4. Anti-clipping collision check:
    // Ensure camera stays above terrain ground with safe clearance
    const terrainHeight = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(desiredCameraPos.x, desiredCameraPos.z, desiredCameraPos.y) : this.terrain.getHeightAt(desiredCameraPos.x, desiredCameraPos.z);
    const minCameraHeight = terrainHeight + 0.8;
    if (desiredCameraPos.y < minCameraHeight) {
      desiredCameraPos.y = minCameraHeight;
    }

    // Check collision against buildings
    if (this.buildings) {
      const col = this.buildings.checkCollision(desiredCameraPos.x, desiredCameraPos.z, 0.8);
      if (col.collided) {
        // Pull camera forward towards target
        desiredCameraPos.lerp(this.currentLookAt, 0.4);
      }
    }

    this.camera.position.copy(desiredCameraPos);
    this.camera.lookAt(this.currentLookAt);
  }

  getYaw() {
    return this.yaw;
  }
}
