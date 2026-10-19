import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class CharacterModel {
  constructor(name = 'Player', color = '#4ade80', customModelUrl = null) {
    this.name = name;
    this.colorHex = color;
    this.group = new THREE.Group();
    this.group.name = `Character_${name}`;

    // Animation state
    this.currentAnim = 'idle';
    this.animTime = 0;

    // GLTF / SkinnedMesh data
    this.isGLTFLoaded = false;
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.gltfModel = null;
    this.currentModelUrl = '';

    // Procedural hierarchy nodes
    this.proceduralRoot = new THREE.Group();
    this.group.add(this.proceduralRoot);
    this.nodes = {};

    // 1. Build high-fidelity procedural human model as immediate primary/fallback
    this.buildProceduralHuman();

    // 2. Create stylized 3D floating nameplate
    this.createNameplate();

    // 3. Asynchronously load authentic Quaternius 3D RPG model
    const savedUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('wildlands_player_model') : null;
    const initialUrl = customModelUrl || savedUrl || '/models/rpg/Warrior.gltf';
    this.loadGLTFModel(initialUrl);
  }

  setModel(url) {
    if (this.currentModelUrl === url && this.isGLTFLoaded) return;
    this.loadGLTFModel(url);
  }

  loadGLTFModel(url) {
    this.currentModelUrl = url;
    try {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          try {
            if (this.gltfModel) {
              this.group.remove(this.gltfModel);
              this.gltfModel = null;
            }

          const model = gltf.scene;
          this.gltfModel = model;

          // Compute model dimensions and ground alignment
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          box.getSize(size);

          // Scale to 1.82m standard adult human height
          const targetHeight = 1.82;
          const scale = targetHeight / Math.max(0.1, size.y);
          model.scale.set(scale, scale, scale);

          // Recompute grounded box
          box.setFromObject(model);
          model.position.y = -box.min.y;

          // Enable shadows
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });

          // Set up AnimationMixer
          this.actions = {};
          if (gltf.animations && gltf.animations.length > 0) {
            this.mixer = new THREE.AnimationMixer(model);

            for (const clip of gltf.animations) {
              const clipName = clip.name.toLowerCase();
              const action = this.mixer.clipAction(clip);
              this.actions[clip.name] = action;
              this.actions[clipName] = action;

              if (clipName === 'idle') {
                this.actions.idle = action;
              } else if (clipName.includes('idle') && !this.actions.idle) {
                this.actions.idle = action;
              }

              if (clipName === 'walk') {
                this.actions.walk = action;
              } else if (clipName.includes('walk') && !this.actions.walk) {
                this.actions.walk = action;
              }

              if (clipName === 'run') {
                this.actions.run = action;
              } else if (clipName.includes('run') && !this.actions.run) {
                this.actions.run = action;
              }

              if (clipName.includes('jump')) {
                this.actions.jump = action;
              } else if (clipName.includes('attack') || clipName.includes('shoot') || clipName.includes('punch')) {
                if (!this.actions.attack || clipName === 'sword_attack') {
                  this.actions.attack = action;
                }
                action.setLoop(THREE.LoopOnce, 1);
              } else if (clipName.includes('hit') || clipName.includes('hurt')) {
                this.actions.hurt = action;
                action.setLoop(THREE.LoopOnce, 1);
              } else if (clipName.includes('death')) {
                this.actions.death = action;
                action.setLoop(THREE.LoopOnce, 1);
                action.clampWhenFinished = true;
              } else if (clipName.includes('roll')) {
                this.actions.roll = action;
                action.setLoop(THREE.LoopOnce, 1);
                if (!this.actions.jump) {
                  this.actions.jump = action;
                }
              }
            }

            // Fallbacks
            if (!this.actions.idle && gltf.animations[0]) {
              this.actions.idle = this.mixer.clipAction(gltf.animations[0]);
            }
            if (!this.actions.walk && (this.actions['walk'] || gltf.animations[1])) {
              this.actions.walk = this.actions['walk'] || this.mixer.clipAction(gltf.animations[1]);
            }
            if (!this.actions.run && (this.actions['run'] || this.actions.walk)) {
              this.actions.run = this.actions['run'] || this.actions.walk;
            }
            if (!this.actions.jump && (this.actions.roll || this.actions.run)) {
              this.actions.jump = this.actions.roll || this.actions.run;
            }

            // Start idle
            if (this.actions.idle) {
              this.activeAction = this.actions.idle;
              this.activeAction.play();
            }
          }

          // Hide procedural fallback, show GLTF human model
          this.proceduralRoot.visible = false;
          this.group.add(model);
          this.isGLTFLoaded = true;
        } catch (err) {
          console.error('[CharacterModel] Error setting up GLTF model:', err);
          this.proceduralRoot.visible = true;
        }
      },
      undefined,
      (err) => {
        console.error('[CharacterModel] Failed to load GLTF model:', err);
        this.proceduralRoot.visible = true;
      }
    );
    } catch (e) {
      console.error('[CharacterModel] Sync error in loadGLTFModel:', e);
    }
  }

  /**
   * 1. Symmetrical Standing Vertical Jump (Lompat Diam)
   */
  createStandingJumpClip(animations) {
    const idle = animations.find(a => a.name.toLowerCase().includes('idle')) || animations[0];
    if (!idle) return null;

    function getBaseQuat(boneName) {
      const tr = idle.tracks.find(t => t.name === boneName + '.quaternion');
      return tr ? new THREE.Quaternion(tr.values[0], tr.values[1], tr.values[2], tr.values[3]) : new THREE.Quaternion();
    }

    const times = [0.0, 0.08, 0.24, 0.40, 0.52];

    function makeQuatTrack(boneName, qPrep, qApex, qFall, qLand) {
      const q0 = getBaseQuat(boneName);
      const q1 = q0.clone().multiply(qPrep);
      const q2 = q0.clone().multiply(qApex);
      const q3 = q0.clone().multiply(qFall);
      const q4 = q0.clone().multiply(qLand);

      const values = [
        q0.x, q0.y, q0.z, q0.w,
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q3.x, q3.y, q3.z, q3.w,
        q4.x, q4.y, q4.z, q4.w
      ];
      return new THREE.QuaternionKeyframeTrack(boneName + '.quaternion', times, values);
    }

    const qZero = new THREE.Quaternion();

    // Symmetrical vertical jump pose: knees tucked under, arms balanced at sides, upright torso
    const standTracks = [
      makeQuatTrack('mixamorigLeftArm', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0.15)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.4, 0.1, 0.65)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, 0.05, 0.35)), qZero),
      makeQuatTrack('mixamorigRightArm', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, -0.15)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.4, -0.1, -0.65)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, -0.05, -0.35)), qZero),
      makeQuatTrack('mixamorigLeftUpLeg', new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.50, 0.05, 0.05)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0)), qZero),
      makeQuatTrack('mixamorigRightUpLeg', new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.50, -0.05, -0.05)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.15, 0, 0)), qZero),
      makeQuatTrack('mixamorigLeftLeg', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.90, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.30, 0, 0)), qZero),
      makeQuatTrack('mixamorigRightLeg', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.35, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.90, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.30, 0, 0)), qZero),
      makeQuatTrack('mixamorigSpine', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0)), qZero, qZero)
    ];

    return new THREE.AnimationClip('JumpIdle', 0.52, standTracks);
  }

  /**
   * 2. Dynamic Athletic Hurdle Leap (Lompat Lari / Bergerak)
   */
  createRunningLeapClip(animations) {
    const idle = animations.find(a => a.name.toLowerCase().includes('idle')) || animations[0];
    if (!idle) return null;

    function getBaseQuat(boneName) {
      const tr = idle.tracks.find(t => t.name === boneName + '.quaternion');
      return tr ? new THREE.Quaternion(tr.values[0], tr.values[1], tr.values[2], tr.values[3]) : new THREE.Quaternion();
    }

    const times = [0.0, 0.08, 0.24, 0.40, 0.52];

    function makeQuatTrack(boneName, qPrep, qApex, qFall, qLand) {
      const q0 = getBaseQuat(boneName);
      const q1 = q0.clone().multiply(qPrep);
      const q2 = q0.clone().multiply(qApex);
      const q3 = q0.clone().multiply(qFall);
      const q4 = q0.clone().multiply(qLand);

      const values = [
        q0.x, q0.y, q0.z, q0.w,
        q1.x, q1.y, q1.z, q1.w,
        q2.x, q2.y, q2.z, q2.w,
        q3.x, q3.y, q3.z, q3.w,
        q4.x, q4.y, q4.z, q4.w
      ];
      return new THREE.QuaternionKeyframeTrack(boneName + '.quaternion', times, values);
    }

    const qZero = new THREE.Quaternion();

    // Athletic hurdle leap: lead leg forward, trailing leg back, forward torso lean, counter arm pump
    const runTracks = [
      makeQuatTrack('mixamorigLeftArm', new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0.2)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.75, 0, 0.45)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0.2)), qZero),
      makeQuatTrack('mixamorigRightArm', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, -0.2)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.70, 0, -0.35)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, -0.2)), qZero),
      makeQuatTrack('mixamorigLeftUpLeg', new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.3, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.85, 0.10, 0.15)), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.4, 0, 0)), qZero),
      makeQuatTrack('mixamorigRightUpLeg', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, -0.05, -0.10)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0)), qZero),
      makeQuatTrack('mixamorigLeftLeg', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0)), qZero),
      makeQuatTrack('mixamorigRightLeg', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.75, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0)), qZero),
      makeQuatTrack('mixamorigSpine', new THREE.Quaternion().setFromEuler(new THREE.Euler(0.15, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.22, 0, 0)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.10, 0, 0)), qZero)
    ];

    return new THREE.AnimationClip('JumpRun', 0.52, runTracks);
  }

  /**
   * Anatomically proportioned 3D Human Adventurer:
   * Origin (0,0,0) is at the SOLE OF THE FEET (Y = 0.00).
   * Total Height: ~1.82m
   */
  buildProceduralHuman() {
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf5cda7,
      roughness: 0.65,
      metalness: 0.05
    });

    const jacketColor = new THREE.Color(this.colorHex);
    const jacketMat = new THREE.MeshStandardMaterial({
      color: jacketColor,
      roughness: 0.75,
      metalness: 0.08
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x273549,
      roughness: 0.85,
      metalness: 0.05
    });

    const bootsMat = new THREE.MeshStandardMaterial({
      color: 0x1c1713,
      roughness: 0.9,
      metalness: 0.1
    });

    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x422a18,
      roughness: 0.8
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x2d1f14,
      roughness: 0.9
    });

    // Orient procedural root to standard forward (-Z) matching GLTF model
    this.proceduralRoot.rotation.y = Math.PI;

    // 1. Pelvis / Hips (Root anchor at Y = 0.96m above ground)
    const pelvis = new THREE.Group();
    pelvis.position.set(0, 0.96, 0);
    this.proceduralRoot.add(pelvis);
    this.nodes.pelvis = pelvis;

    // Pelvis geometry
    const pelvisGeo = new THREE.BoxGeometry(0.38, 0.20, 0.26);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, pantsMat);
    pelvisMesh.castShadow = true;
    pelvisMesh.receiveShadow = true;
    pelvis.add(pelvisMesh);

    // Leather belt with brass buckle
    const beltGeo = new THREE.BoxGeometry(0.40, 0.08, 0.28);
    beltGeo.translate(0, 0.08, 0);
    const belt = new THREE.Mesh(beltGeo, leatherMat);
    belt.castShadow = true;
    pelvis.add(belt);

    const buckleGeo = new THREE.BoxGeometry(0.10, 0.07, 0.04);
    buckleGeo.translate(0, 0.08, 0.15);
    const buckle = new THREE.Mesh(buckleGeo, new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.8, roughness: 0.3 }));
    pelvis.add(buckle);

    // 2. Torso & Chest (Above pelvis: Y = 0.10 to 0.58)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.10, 0);
    pelvis.add(torsoGroup);
    this.nodes.torso = torsoGroup;

    // Athletic tapered torso (lower abdomen narrower, upper chest broader)
    const lowerTorsoGeo = new THREE.BoxGeometry(0.40, 0.22, 0.26);
    lowerTorsoGeo.translate(0, 0.11, 0);
    const lowerTorso = new THREE.Mesh(lowerTorsoGeo, jacketMat);
    lowerTorso.castShadow = true;
    lowerTorso.receiveShadow = true;
    torsoGroup.add(lowerTorso);

    const chestGeo = new THREE.BoxGeometry(0.48, 0.28, 0.30);
    chestGeo.translate(0, 0.34, 0);
    const chest = new THREE.Mesh(chestGeo, jacketMat);
    chest.castShadow = true;
    chest.receiveShadow = true;
    torsoGroup.add(chest);

    // Jacket collar
    const collarGeo = new THREE.BoxGeometry(0.30, 0.08, 0.24);
    collarGeo.translate(0, 0.50, 0.02);
    const collar = new THREE.Mesh(collarGeo, leatherMat);
    torsoGroup.add(collar);

    // 3. Neck & Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.50, 0);
    torsoGroup.add(headGroup);
    this.nodes.head = headGroup;

    // Neck
    const neckGeo = new THREE.CylinderGeometry(0.09, 0.10, 0.12, 8);
    neckGeo.translate(0, 0.06, 0);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.castShadow = true;
    headGroup.add(neck);

    // Head / Face
    const faceGeo = new THREE.BoxGeometry(0.24, 0.26, 0.24);
    faceGeo.translate(0, 0.24, 0.02);
    const face = new THREE.Mesh(faceGeo, skinMat);
    face.castShadow = true;
    headGroup.add(face);

    // Hair / Explorer Cap
    const capGeo = new THREE.BoxGeometry(0.28, 0.12, 0.30);
    capGeo.translate(0, 0.34, 0.02);
    const cap = new THREE.Mesh(capGeo, hairMat);
    cap.castShadow = true;
    headGroup.add(cap);

    // Cap brim
    const brimGeo = new THREE.BoxGeometry(0.26, 0.03, 0.14);
    brimGeo.translate(0, 0.30, 0.18);
    const brim = new THREE.Mesh(brimGeo, hairMat);
    headGroup.add(brim);

    // Eyes / Expression
    const eyeGeo = new THREE.BoxGeometry(0.18, 0.04, 0.04);
    eyeGeo.translate(0, 0.24, 0.14);
    const eyes = new THREE.Mesh(eyeGeo, new THREE.MeshBasicMaterial({ color: 0x1e293b }));
    headGroup.add(eyes);

    // 4. Backpack with Gear (Mounted to torso)
    const backpackGeo = new THREE.BoxGeometry(0.36, 0.42, 0.20);
    backpackGeo.translate(0, 0.28, -0.22);
    const backpack = new THREE.Mesh(backpackGeo, leatherMat);
    backpack.castShadow = true;
    torsoGroup.add(backpack);

    const bedrollGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.44, 8);
    bedrollGeo.rotateZ(Math.PI / 2);
    bedrollGeo.translate(0, 0.52, -0.22);
    const bedroll = new THREE.Mesh(bedrollGeo, new THREE.MeshStandardMaterial({ color: 0x475569 }));
    bedroll.castShadow = true;
    torsoGroup.add(bedroll);

    // 5. Left & Right Arm Assemblies (Pivoting at shoulders)
    // Left Shoulder Pivot
    const leftArmPivot = new THREE.Group();
    leftArmPivot.position.set(0.31, 0.44, 0);
    torsoGroup.add(leftArmPivot);
    this.nodes.leftArm = leftArmPivot;

    const shoulderGeo = new THREE.SphereGeometry(0.09, 8, 8);
    const leftShoulder = new THREE.Mesh(shoulderGeo, jacketMat);
    leftArmPivot.add(leftShoulder);

    // Upper Arm
    const upperArmGeo = new THREE.CylinderGeometry(0.08, 0.07, 0.28, 8);
    upperArmGeo.translate(0, -0.14, 0);
    const leftUpperArm = new THREE.Mesh(upperArmGeo, jacketMat);
    leftUpperArm.castShadow = true;
    leftArmPivot.add(leftUpperArm);

    // Forearm & Hand
    const forearmGeo = new THREE.CylinderGeometry(0.07, 0.06, 0.26, 8);
    forearmGeo.translate(0, -0.38, 0);
    const leftForearm = new THREE.Mesh(forearmGeo, skinMat);
    leftForearm.castShadow = true;
    leftArmPivot.add(leftForearm);

    const handGeo = new THREE.BoxGeometry(0.08, 0.10, 0.08);
    handGeo.translate(0, -0.52, 0);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftArmPivot.add(leftHand);

    // Right Shoulder Pivot
    const rightArmPivot = new THREE.Group();
    rightArmPivot.position.set(-0.31, 0.44, 0);
    torsoGroup.add(rightArmPivot);
    this.nodes.rightArm = rightArmPivot;

    const rightShoulder = new THREE.Mesh(shoulderGeo, jacketMat);
    rightArmPivot.add(rightShoulder);

    const rightUpperArm = new THREE.Mesh(upperArmGeo, jacketMat);
    rightUpperArm.castShadow = true;
    rightArmPivot.add(rightUpperArm);

    const rightForearm = new THREE.Mesh(forearmGeo, skinMat);
    rightForearm.castShadow = true;
    rightArmPivot.add(rightForearm);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightArmPivot.add(rightHand);

    // 6. Left & Right Leg Assemblies (Pivoting at hips: Y = 0 on pelvis, total drop = 0.96m to Y = 0.00)
    // Left Leg
    const leftLegPivot = new THREE.Group();
    leftLegPivot.position.set(0.14, -0.06, 0);
    pelvis.add(leftLegPivot);
    this.nodes.leftLeg = leftLegPivot;

    // Thigh (length: 0.45m)
    const thighGeo = new THREE.CylinderGeometry(0.10, 0.09, 0.44, 8);
    thighGeo.translate(0, -0.22, 0);
    const leftThigh = new THREE.Mesh(thighGeo, pantsMat);
    leftThigh.castShadow = true;
    leftThigh.receiveShadow = true;
    leftLegPivot.add(leftThigh);

    // Shin & Calf (length: 0.32m)
    const calfGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.32, 8);
    calfGeo.translate(0, -0.56, 0);
    const leftCalf = new THREE.Mesh(calfGeo, pantsMat);
    leftCalf.castShadow = true;
    leftLegPivot.add(leftCalf);

    // Boot (bottom reaches EXACTLY Y = -0.90 from hip pivot, which is Y = 0.00 on root!)
    const bootGeo = new THREE.BoxGeometry(0.14, 0.18, 0.24);
    bootGeo.translate(0, -0.81, 0.03);
    const leftBoot = new THREE.Mesh(bootGeo, bootsMat);
    leftBoot.castShadow = true;
    leftBoot.receiveShadow = true;
    leftLegPivot.add(leftBoot);

    // Right Leg
    const rightLegPivot = new THREE.Group();
    rightLegPivot.position.set(-0.14, -0.06, 0);
    pelvis.add(rightLegPivot);
    this.nodes.rightLeg = rightLegPivot;

    const rightThigh = new THREE.Mesh(thighGeo, pantsMat);
    rightThigh.castShadow = true;
    rightThigh.receiveShadow = true;
    rightLegPivot.add(rightThigh);

    const rightCalf = new THREE.Mesh(calfGeo, pantsMat);
    rightCalf.castShadow = true;
    rightLegPivot.add(rightCalf);

    const rightBoot = new THREE.Mesh(bootGeo, bootsMat);
    rightBoot.castShadow = true;
    rightBoot.receiveShadow = true;
    rightLegPivot.add(rightBoot);
  }

  createNameplate() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Draw stylish nature tag
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    this.roundRect(ctx, 4, 8, 248, 48, 12);
    ctx.fill();

    ctx.strokeStyle = this.colorHex;
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.name, 128, 32);

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(0, 2.15, 0);
    sprite.scale.set(1.8, 0.45, 1);
    this.group.add(sprite);
    this.nodes.nameplate = sprite;
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

  updateAnimation(state, speedFactor = 1.0, dt = 0.016) {
    if (this.currentAnim !== state) {
      const prevAnim = this.currentAnim;
      this.currentAnim = state;

      // Handle GLTF Animation Cross-Fading
      const nextAction = this.actions[state] || (state === 'jump' ? (this.actions.jump_idle || this.actions.jump) : null);
      if (this.mixer && nextAction) {
        const prevAction = this.actions[prevAnim] || this.activeAction;

        if (prevAction && prevAction !== nextAction) {
          prevAction.fadeOut(0.12);
        }
        nextAction.reset().fadeIn(0.12).play();
        this.activeAction = nextAction;
      }
    }

    // Dynamic speed scaling on active action for natural grounded movement
    if (this.activeAction) {
      if (this.currentAnim === 'walk') {
        this.activeAction.timeScale = Math.max(0.7, Math.min(1.15, speedFactor * 0.95));
      } else if (this.currentAnim === 'run') {
        this.activeAction.timeScale = 1.05;
      } else if (this.currentAnim.startsWith('jump')) {
        this.activeAction.timeScale = 1.0;
      } else if (this.currentAnim === 'idle') {
        this.activeAction.timeScale = 1.0;
      } else if (this.currentAnim === 'attack') {
        this.activeAction.timeScale = 1.25;
      } else if (this.currentAnim === 'hurt') {
        this.activeAction.timeScale = 1.0;
      } else if (this.currentAnim === 'death') {
        this.activeAction.timeScale = 1.0;
      } else if (this.currentAnim === 'roll') {
        this.activeAction.timeScale = 1.15;
      }
    }

    // Advance GLTF animation mixer if active
    if (this.mixer) {
      this.mixer.update(dt);
    }

    // Always keep procedural animations updated (as fallback or primary)
    const rate = state === 'run' ? 9.5 : (state === 'walk' ? 4.8 : 2.4);
    this.animTime += dt * rate;

    const t = this.animTime;
    const { pelvis, torso, head, leftArm, rightArm, leftLeg, rightLeg } = this.nodes;
    if (!pelvis) return;

    if (state === 'idle') {
      const breath = Math.sin(t) * 0.02;
      torso.scale.set(1.0 + breath * 0.3, 1.0 + breath, 1.0 + breath * 0.3);
      head.rotation.x = Math.sin(t * 0.5) * 0.02;

      leftArm.rotation.x = Math.sin(t) * 0.05;
      leftArm.rotation.z = 0.08;
      rightArm.rotation.x = -Math.sin(t) * 0.05;
      rightArm.rotation.z = -0.08;

      leftLeg.rotation.x = 0;
      rightLeg.rotation.x = 0;
      pelvis.rotation.x = 0;
    } else if (state === 'walk' || state === 'run') {
      const isRun = state === 'run';
      const stride = isRun ? 0.95 : 0.60;
      const armSwing = isRun ? 1.05 : 0.65;

      // Subtle forward body lean into movement
      pelvis.rotation.x = isRun ? 0.16 : 0.06;

      // Natural counter-oscillation
      leftLeg.rotation.x = Math.sin(t) * stride;
      rightLeg.rotation.x = -Math.sin(t) * stride;

      leftArm.rotation.x = -Math.sin(t) * armSwing;
      rightArm.rotation.x = Math.sin(t) * armSwing;
      leftArm.rotation.z = isRun ? 0.16 : 0.08;
      rightArm.rotation.z = isRun ? -0.16 : -0.08;

      torso.rotation.y = Math.sin(t) * 0.06;
      head.rotation.y = -Math.sin(t) * 0.04;
    } else if (state === 'jump_idle') {
      // Symmetrical standing vertical jump
      pelvis.rotation.x = 0.06;
      leftLeg.rotation.x = -0.45;
      rightLeg.rotation.x = -0.45;

      leftArm.rotation.x = -0.40;
      rightArm.rotation.x = -0.40;
      leftArm.rotation.z = 0.55;
      rightArm.rotation.z = -0.55;
    } else if (state === 'jump_run' || state === 'jump') {
      // Dynamic forward hurdle leap
      pelvis.rotation.x = 0.22;
      leftLeg.rotation.x = -0.75;
      rightLeg.rotation.x = 0.55;

      leftArm.rotation.x = -0.90;
      rightArm.rotation.x = 0.70;
      leftArm.rotation.z = 0.35;
      rightArm.rotation.z = -0.35;
    }
  }
}
