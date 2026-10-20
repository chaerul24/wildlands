import * as THREE from 'three';
import { clamp, lerp, lerpAngle } from '../utils/MathUtils.js';

/**
 * High-performance Third-Person Follow Camera for Open-World Action RPG.
 * - Sits behind and slightly above the player, looking in the player's forward direction.
 * - Smooth exponential damping eliminates jitter across variable framerates (30 to 120 FPS).
 * - Follows player orientation smoothly while moving; respects manual touch drag / mouse orbit.
 * - Anti-clipping terrain & building collision detection prevents wall/ground penetration.
 * - Configurable distance, height, and subtle shoulder framing for clear character visibility.
 */
export class CameraController {
  constructor(camera, terrain, buildings) {
    this.camera = camera;
    this.terrain = terrain;
    this.buildings = buildings;

    // Angles in radians
    this.yaw = 0;
    this.pitch = 0.22; // Natural third-person elevation angle (~12.6 degrees)

    // Configurable Camera Geometry
    this.distance = 5.6;
    this.targetDistance = 5.6;
    this.minDistance = 1.8;
    this.maxDistance = 12.0;
    this.cameraHeight = 1.50; // Focus point above ground (player upper chest / head)
    this.shoulderOffset = 0.20; // Subtle right-shoulder offset for action RPG framing

    // Dynamics & Sensitivity
    this.sensitivity = 0.0024;
    this.smoothSpeed = 14.0;
    this.autoFollowSpeed = 3.2; // Gentle follow when running without touch dragging
    this.manualOrbitCooldown = 0.0;

    // Internal tracking vectors
    this.currentLookAt = new THREE.Vector3();
    this.smoothedCameraPos = new THREE.Vector3();
    this.isInitialized = false;

    // Wheel listener for desktop zoom
    if (typeof window !== 'undefined') {
      window.addEventListener('wheel', (e) => {
        this.targetDistance += e.deltaY * 0.005;
        this.targetDistance = clamp(this.targetDistance, this.minDistance, this.maxDistance);
      }, { passive: true });
    }
  }

  setSensitivity(val) {
    this.sensitivity = val;
  }

  setDistance(val) {
    this.targetDistance = clamp(val, this.minDistance, this.maxDistance);
  }

  setHeight(val) {
    this.cameraHeight = Math.max(0.5, val);
  }

  setShoulderOffset(val) {
    this.shoulderOffset = clamp(val, -1.0, 1.0);
  }

  getYaw() {
    return this.yaw;
  }

  getPitch() {
    return this.pitch;
  }

  getDistance() {
    return this.distance;
  }

  /**
   * Main camera update tick
   * @param {THREE.Vector3} targetPosition - Player position (feet origin)
   * @param {{x: number, y: number}} mouseDelta - Touch swipe / mouse move delta
   * @param {number} dt - Frame delta time (capped to 0.1)
   * @param {number|null} playerYaw - Current player facing angle (radians)
   * @param {boolean} isMoving - Whether player is actively moving
   */
  update(targetPosition, mouseDelta, dt, playerYaw = null, isMoving = false) {
    if (!targetPosition) return;
    if (dt > 0.1) dt = 0.1;

    // 1. Handle manual camera orbit (mouse or touch drag)
    const hasManualInput = mouseDelta && (Math.abs(mouseDelta.x) > 0.001 || Math.abs(mouseDelta.y) > 0.001);

    if (hasManualInput) {
      this.yaw -= mouseDelta.x * this.sensitivity;
      this.pitch -= mouseDelta.y * this.sensitivity;
      this.manualOrbitCooldown = 1.0; // Wait 1.0s after touch drag before auto-follow kicks in
    } else {
      this.manualOrbitCooldown = Math.max(0, this.manualOrbitCooldown - dt);

      // Auto-follow: When player is moving and user isn't actively rotating camera,
      // camera smoothly orients behind the player's facing direction.
      if (this.manualOrbitCooldown <= 0 && isMoving && typeof playerYaw === 'number') {
        const targetBehindYaw = playerYaw + Math.PI;
        this.yaw = lerpAngle(this.yaw, targetBehindYaw, 1 - Math.exp(-this.autoFollowSpeed * dt));
      }
    }

    // Clamp pitch so camera never flips upside-down or clips under the player's feet
    this.pitch = clamp(this.pitch, -0.15, Math.PI / 2.5);

    // Smooth zoom distance
    this.distance = lerp(this.distance, this.targetDistance, 1 - Math.exp(-10.0 * dt));

    // 2. Compute smooth focus point (player chest/head height)
    const targetFocus = new THREE.Vector3(
      targetPosition.x,
      targetPosition.y + this.cameraHeight,
      targetPosition.z
    );

    if (!this.isInitialized) {
      this.currentLookAt.copy(targetFocus);
    } else {
      const followFactor = 1 - Math.exp(-this.smoothSpeed * dt);
      this.currentLookAt.lerp(targetFocus, followFactor);
    }

    // 3. Compute spherical camera offset behind the player
    const cosPitch = Math.cos(this.pitch);
    const sinPitch = Math.sin(this.pitch);
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    // Lateral right vector perpendicular to view line for shoulder offset
    const rightX = cosYaw;
    const rightZ = -sinYaw;

    let effectiveDistance = this.distance;

    // 4. Collision & Anti-Clipping with Buildings
    // Check if any building collider intersects the ray from focus to desired camera position
    if (this.buildings && this.buildings.colliders) {
      for (let i = 0; i < this.buildings.colliders.length; i++) {
        const col = this.buildings.colliders[i];
        const cx = col.x;
        const cz = col.z;
        const radius = (col.radius || 1.5) + 0.5; // Include safety margin

        // 2D distance from line segment (currentLookAt -> camera) to circle (cx, cz)
        const lineDx = sinYaw * this.distance;
        const lineDz = cosYaw * this.distance;
        const lenSq = lineDx * lineDx + lineDz * lineDz;

        if (lenSq > 0.001) {
          const t = clamp(
            ((cx - this.currentLookAt.x) * lineDx + (cz - this.currentLookAt.z) * lineDz) / lenSq,
            0,
            1
          );
          const projX = this.currentLookAt.x + t * lineDx;
          const projZ = this.currentLookAt.z + t * lineDz;
          const distToCol = Math.hypot(cx - projX, cz - projZ);

          if (distToCol < radius) {
            // Obstructed by building: pull camera closer in front of wall
            const safeT = Math.max(0.25, t - (radius / this.distance));
            effectiveDistance = Math.min(effectiveDistance, Math.max(this.minDistance, this.distance * safeT));
          }
        }
      }
    }

    // 5. Position candidate calculation
    const offsetX = effectiveDistance * cosPitch * sinYaw + rightX * this.shoulderOffset;
    const offsetY = effectiveDistance * sinPitch;
    const offsetZ = effectiveDistance * cosPitch * cosYaw + rightZ * this.shoulderOffset;

    let desiredCameraPos = new THREE.Vector3(
      this.currentLookAt.x + offsetX,
      this.currentLookAt.y + offsetY,
      this.currentLookAt.z + offsetZ
    );

    // 6. Terrain Ground Collision Check
    // Check 3 sample points along camera arm to avoid clipping into hill slopes
    const terrainHeightAtCam = this.terrain.getSurfaceHeight
      ? this.terrain.getSurfaceHeight(desiredCameraPos.x, desiredCameraPos.z, desiredCameraPos.y)
      : (this.terrain.getHeightAt ? this.terrain.getHeightAt(desiredCameraPos.x, desiredCameraPos.z) : 0);

    const minClearance = 0.65; // Safe head-height clearance above terrain ground
    if (desiredCameraPos.y < terrainHeightAtCam + minClearance) {
      desiredCameraPos.y = terrainHeightAtCam + minClearance;
    }

    // Check mid-point between player and camera for steep crests
    const midX = (this.currentLookAt.x + desiredCameraPos.x) * 0.5;
    const midZ = (this.currentLookAt.z + desiredCameraPos.z) * 0.5;
    const terrainHeightAtMid = this.terrain.getSurfaceHeight
      ? this.terrain.getSurfaceHeight(midX, midZ, (this.currentLookAt.y + desiredCameraPos.y) * 0.5)
      : (this.terrain.getHeightAt ? this.terrain.getHeightAt(midX, midZ) : 0);

    const midY = (this.currentLookAt.y + desiredCameraPos.y) * 0.5;
    if (midY < terrainHeightAtMid + 0.4) {
      // Crest is blocking line of sight: elevate camera slightly
      desiredCameraPos.y += (terrainHeightAtMid + 0.4 - midY) * 0.7;
    }

    // 7. Smoothly apply final position to Three.js camera
    if (!this.isInitialized) {
      this.smoothedCameraPos.copy(desiredCameraPos);
      this.isInitialized = true;
    } else {
      const posLerp = 1 - Math.exp(-this.smoothSpeed * dt);
      this.smoothedCameraPos.lerp(desiredCameraPos, posLerp);
    }

    this.camera.position.copy(this.smoothedCameraPos);
    this.camera.lookAt(this.currentLookAt);
  }
}
