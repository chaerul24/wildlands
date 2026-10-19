import * as THREE from 'three';

export class Buildings {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.colliders = []; // Array of { x, z, radius, height } for collision detection

    this.group = new THREE.Group();
    this.group.name = 'BuildingsGroup';
    this.scene.add(this.group);

    this.init();
  }

  init() {
    this.createWatchtower(-16, -14);
    this.createPioneerCabin(24, 16);
    this.createStoneRuins(-40, 38);
    this.createWoodenBridge(-5, 60);
    this.createCampfire(8, 8);

    // --- NEW LIVING WORLD SETTLEMENTS & COTTAGES ---
    // 1. Valley Village (Permukiman Pedesaan Lembah)
    this.createRuralCottage(42, 28, -Math.PI / 6, {
      name: 'Herbalist Cottage',
      wallColor: 0xd6cbb0, // Whitewashed timber plaster
      roofColor: 0x9e4328  // Terracotta tiles
    });
    this.createRuralCottage(22, -28, Math.PI / 4, {
      name: 'Carpenter Workshop',
      wallColor: 0x5a3e26, // Warm dark cedar log
      roofColor: 0x2e241c  // Dark timber shake
    });
    this.createMarketStall(14, 2, Math.PI / 8);
    this.createFarmField(34, -6, 0);
    this.createVillageWell(6, 22);
    this.createVillageBench(4.2, 21.5, Math.PI / 4);

    // 2. Old Weathered / Dilapidated Houses (Rumah Tua Lapuk di Tepi Hutan & Jalur Terpencil)
    this.createOldWeatheredHouse(-55, -35, Math.PI / 3);
    this.createOldWeatheredHouse(-22, 88, -Math.PI / 5);

    // 3. Hillside Homestead (Rumah Kebun Perbukitan Timur)
    this.createRuralCottage(72, -40, -Math.PI / 3, {
      name: 'Hillside Farmhouse',
      wallColor: 0x6e5235,
      roofColor: 0x8a392b
    });
  }

  createWatchtower(x, z) {
    const y = this.terrain.getHeightAt(x, z);
    const tower = new THREE.Group();
    tower.position.set(x, y, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.85 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8b3a2b, roughness: 0.7 });

    // 4 Support timber pillars
    const pillarGeo = new THREE.CylinderGeometry(0.25, 0.35, 10, 6);
    pillarGeo.translate(0, 5, 0);

    const offsets = [
      [-2.2, -2.2],
      [2.2, -2.2],
      [-2.2, 2.2],
      [2.2, 2.2]
    ];

    offsets.forEach(([px, pz]) => {
      const p = new THREE.Mesh(pillarGeo, woodMat);
      p.position.set(px, 0, pz);
      p.castShadow = true;
      tower.add(p);
    });

    // Lower platform deck
    const deckGeo = new THREE.BoxGeometry(5.2, 0.4, 5.2);
    const lowerDeck = new THREE.Mesh(deckGeo, darkWoodMat);
    lowerDeck.position.set(0, 4.8, 0);
    lowerDeck.receiveShadow = true;
    tower.add(lowerDeck);

    // Upper observation deck
    const upperDeck = new THREE.Mesh(deckGeo, darkWoodMat);
    upperDeck.position.set(0, 9.6, 0);
    upperDeck.receiveShadow = true;
    tower.add(upperDeck);

    // Railings on observation deck
    const railGeo = new THREE.BoxGeometry(5.0, 0.9, 0.15);
    const r1 = new THREE.Mesh(railGeo, woodMat);
    r1.position.set(0, 10.1, 2.4);
    const r2 = new THREE.Mesh(railGeo, woodMat);
    r2.position.set(0, 10.1, -2.4);
    const r3 = new THREE.Mesh(railGeo, woodMat);
    r3.position.set(2.4, 10.1, 0);
    r3.rotation.y = Math.PI / 2;
    const r4 = new THREE.Mesh(railGeo, woodMat);
    r4.position.set(-2.4, 10.1, 0);
    r4.rotation.y = Math.PI / 2;
    tower.add(r1, r2, r3, r4);

    // Observation roof (Pyramid)
    const roofGeo = new THREE.ConeGeometry(4.2, 2.2, 4);
    roofGeo.translate(0, 1.1, 0);
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.set(0, 11.5, 0);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    tower.add(roof);

    // Warm lantern light
    const lanternLight = new THREE.PointLight(0xffa726, 1.8, 20);
    lanternLight.position.set(0, 9.2, 0);
    lanternLight.castShadow = true;
    tower.add(lanternLight);

    const lanternMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 0.4, 6),
      new THREE.MeshBasicMaterial({ color: 0xffea00 })
    );
    lanternMesh.position.set(0, 9.2, 0);
    tower.add(lanternMesh);

    this.group.add(tower);
    this.colliders.push({ x, z, radius: 2.8, height: 12 });
  }

  createPioneerCabin(x, z) {
    const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
    const cabin = new THREE.Group();
    cabin.position.set(x, y, z);

    // Realistic rustic timber & stone materials
    const logWallMat = new THREE.MeshStandardMaterial({ color: 0x61432a, roughness: 0.88 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2919, roughness: 0.92 });
    const roofShingleMat = new THREE.MeshStandardMaterial({ color: 0x2e2016, roughness: 0.85 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x595d63, roughness: 0.95 });
    const windowGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe28a });
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x2b1e14, roughness: 0.9 });

    // 1. Stone Foundation
    const foundationGeo = new THREE.BoxGeometry(6.6, 0.5, 5.2);
    foundationGeo.translate(0, 0.25, 0);
    const foundation = new THREE.Mesh(foundationGeo, stoneMat);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    cabin.add(foundation);

    // 2. Main Timber Cabin Body
    const bodyGeo = new THREE.BoxGeometry(6.2, 2.9, 4.8);
    bodyGeo.translate(0, 1.95, 0);
    const body = new THREE.Mesh(bodyGeo, logWallMat);
    body.castShadow = true;
    body.receiveShadow = true;
    cabin.add(body);

    // 3. Corner Timber Logs (rustic notched corners)
    const cornerLogGeo = new THREE.CylinderGeometry(0.2, 0.22, 3.2, 8);
    cornerLogGeo.translate(0, 2.0, 0);
    const cornerOffsets = [
      [-3.0, -2.3],
      [3.0, -2.3],
      [-3.0, 2.3],
      [3.0, 2.3]
    ];
    cornerOffsets.forEach(([cx, cz]) => {
      const log = new THREE.Mesh(cornerLogGeo, darkWoodMat);
      log.position.set(cx, 0, cz);
      log.castShadow = true;
      cabin.add(log);
    });

    // 4. Pitched Gable A-Frame Roof (with eaves extending over walls)
    const roofSlopeL = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 5.6), roofShingleMat);
    roofSlopeL.position.set(-1.4, 4.05, 0);
    roofSlopeL.rotation.z = 0.58;
    roofSlopeL.castShadow = true;

    const roofSlopeR = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.16, 5.6), roofShingleMat);
    roofSlopeR.position.set(1.4, 4.05, 0);
    roofSlopeR.rotation.z = -0.58;
    roofSlopeR.castShadow = true;

    // Ridge beam along top of roof
    const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 5.8), darkWoodMat);
    ridgeBeam.position.set(0, 4.95, 0);
    ridgeBeam.castShadow = true;

    // Gable triangular end wall filler
    const gableGeo = new THREE.ConeGeometry(3.0, 1.6, 4);
    gableGeo.scale(1.0, 1.0, 0.05);
    const gableFront = new THREE.Mesh(gableGeo, logWallMat);
    gableFront.position.set(0, 4.15, 2.35);
    const gableBack = new THREE.Mesh(gableGeo, logWallMat);
    gableBack.position.set(0, 4.15, -2.35);

    cabin.add(roofSlopeL, roofSlopeR, ridgeBeam, gableFront, gableBack);

    // 5. Covered Front Porch with timber deck and round support posts
    const porchDeck = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 2.0), darkWoodMat);
    porchDeck.position.set(0, 0.38, 3.35);
    porchDeck.receiveShadow = true;

    const porchPostGeo = new THREE.CylinderGeometry(0.12, 0.14, 2.6, 8);
    porchPostGeo.translate(0, 1.3, 0);
    const postL = new THREE.Mesh(porchPostGeo, darkWoodMat);
    postL.position.set(-2.8, 0.5, 4.2);
    postL.castShadow = true;
    const postR = new THREE.Mesh(porchPostGeo, darkWoodMat);
    postR.position.set(2.8, 0.5, 4.2);
    postR.castShadow = true;

    // Porch overhang roof
    const porchRoof = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.12, 2.2), roofShingleMat);
    porchRoof.position.set(0, 3.1, 3.35);
    porchRoof.rotation.x = 0.12;
    porchRoof.castShadow = true;

    // Porch steps
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.2, 0.6), darkWoodMat);
    step1.position.set(0, 0.15, 4.55);
    step1.receiveShadow = true;

    cabin.add(porchDeck, postL, postR, porchRoof, step1);

    // 6. Wooden Front Door
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.1), darkWoodMat);
    door.position.set(0, 1.6, 2.42);
    const doorKnob = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0xc8a245, metalness: 0.8, roughness: 0.3 })
    );
    doorKnob.position.set(0.42, 1.55, 2.5);
    cabin.add(door, doorKnob);

    // 7. Warm Glowing Windows with Mullions
    const createWin = (wx, wy, wz, rotY = 0) => {
      const winGroup = new THREE.Group();
      winGroup.position.set(wx, wy, wz);
      winGroup.rotation.y = rotY;

      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.0), windowGlowMat);
      pane.position.z = 0.02;

      const frameH = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.08), windowFrameMat);
      const frameV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.08), windowFrameMat);
      const border = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.15, 0.04), windowFrameMat);

      winGroup.add(pane, frameH, frameV, border);
      cabin.add(winGroup);
    };

    // Front window next to door
    createWin(1.8, 2.0, 2.42);
    // Side windows
    createWin(-3.12, 2.0, 0, Math.PI / 2);
    createWin(3.12, 2.0, 0, -Math.PI / 2);

    // Soft warm interior light spilling through windows
    const cabinLight = new THREE.PointLight(0xffb74d, 1.8, 12);
    cabinLight.position.set(0, 2.2, 0);
    cabin.add(cabinLight);

    // 8. Stone Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5.2, 0.9), stoneMat);
    chimney.position.set(2.4, 2.6, -1.2);
    chimney.castShadow = true;

    const chimneyCap = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.15, 1.1), stoneMat);
    chimneyCap.position.set(2.4, 5.25, -1.2);
    cabin.add(chimney, chimneyCap);

    this.group.add(cabin);
    this.colliders.push({ x, z, radius: 4.4, height: 6 });
  }

  createStoneRuins(x, z) {
    const y = this.terrain.getHeightAt(x, z);
    const ruins = new THREE.Group();
    ruins.position.set(x, y, z);

    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x73797f,
      roughness: 0.95,
      metalness: 0.05
    });

    // Circle of 6 ancient weathered stone monoliths
    const count = 6;
    const radius = 6.5;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const sx = Math.cos(angle) * radius;
      const sz = Math.sin(angle) * radius;

      const height = 3.5 + Math.sin(i * 2.1) * 1.2;
      const monolithGeo = new THREE.BoxGeometry(1.1, height, 0.7);
      monolithGeo.translate(0, height / 2, 0);

      const monolith = new THREE.Mesh(monolithGeo, stoneMat);
      monolith.position.set(sx, 0, sz);
      monolith.rotation.y = angle + (Math.sin(i) * 0.3);
      monolith.rotation.z = (Math.sin(i * 1.5) * 0.1);
      monolith.castShadow = true;
      monolith.receiveShadow = true;
      ruins.add(monolith);

      this.colliders.push({ x: x + sx, z: z + sz, radius: 0.9, height: height });
    }

    // Center altar stone
    const altarGeo = new THREE.CylinderGeometry(1.8, 2.0, 0.8, 8);
    altarGeo.translate(0, 0.4, 0);
    const altar = new THREE.Mesh(altarGeo, stoneMat);
    altar.castShadow = true;
    ruins.add(altar);

    this.group.add(ruins);
  }

  createWoodenBridge(x, z) {
    const y = this.terrain.getHeightAt(x, z);
    const bridge = new THREE.Group();
    bridge.position.set(x, y + 0.3, z);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5a3e2a, roughness: 0.85 });

    // Arching deck planks
    const deckGeo = new THREE.BoxGeometry(4.0, 0.3, 12.0);
    const deck = new THREE.Mesh(deckGeo, woodMat);
    deck.receiveShadow = true;
    deck.castShadow = true;
    bridge.add(deck);

    // Left and right railings
    const railGeo = new THREE.BoxGeometry(0.2, 0.8, 12.0);
    const leftRail = new THREE.Mesh(railGeo, woodMat);
    leftRail.position.set(-1.9, 0.5, 0);
    const rightRail = new THREE.Mesh(railGeo, woodMat);
    rightRail.position.set(1.9, 0.5, 0);

    bridge.add(leftRail, rightRail);
    this.group.add(bridge);
  }

  createCampfire(x, z) {
    const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
    const camp = new THREE.Group();
    camp.position.set(x, y, z);

    // Weathered natural river rocks with soot variations
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x5a5d61,
      roughness: 0.92,
      metalness: 0.05
    });

    const sootStoneMat = new THREE.MeshStandardMaterial({
      color: 0x36383b,
      roughness: 0.96,
      metalness: 0.02
    });

    // 11 naturally arranged river stones embedded into soil
    const numStones = 11;
    for (let i = 0; i < numStones; i++) {
      const angle = (i / numStones) * Math.PI * 2 + (Math.sin(i * 3.1) * 0.15);
      const radius = 0.96 + Math.sin(i * 2.3) * 0.12;
      const sx = Math.cos(angle) * radius;
      const sz = Math.sin(angle) * radius;

      // Organic low-poly rock geometry
      const rockGeo = new THREE.DodecahedronGeometry(0.22, 1);
      const s = new THREE.Mesh(rockGeo, (i % 2 === 0) ? sootStoneMat : stoneMat);
      s.position.set(sx, 0.09, sz);
      s.scale.set(
        0.85 + (Math.sin(i * 1.7) * 0.3),
        0.55 + (Math.cos(i * 2.1) * 0.2),
        0.85 + (Math.sin(i * 2.9) * 0.3)
      );
      s.rotation.set(i * 1.2, i * 0.9, i * 0.6);
      s.castShadow = true;
      s.receiveShadow = true;
      camp.add(s);
    }

    // Charcoal and ash ground bed inside fire pit
    const ashBed = new THREE.Mesh(
      new THREE.CircleGeometry(0.85, 14),
      new THREE.MeshStandardMaterial({ color: 0x1f1f21, roughness: 0.98 })
    );
    ashBed.rotateX(-Math.PI / 2);
    ashBed.position.y = 0.03;
    camp.add(ashBed);

    // Realistic charred logs arranged in teepee / cross
    const logMat = new THREE.MeshStandardMaterial({ color: 0x221711, roughness: 0.92 });
    const logGeo = new THREE.CylinderGeometry(0.08, 0.11, 1.25, 6);

    const log1 = new THREE.Mesh(logGeo, logMat);
    log1.rotation.set(0.3, 0.4, 0.3);
    log1.position.set(0, 0.14, 0);
    log1.castShadow = true;

    const log2 = new THREE.Mesh(logGeo, logMat);
    log2.rotation.set(-0.3, -0.6, -0.3);
    log2.position.set(0, 0.15, 0);
    log2.castShadow = true;

    const log3 = new THREE.Mesh(logGeo, logMat);
    log3.rotation.set(0.4, 1.8, -0.2);
    log3.position.set(0, 0.16, 0);
    log3.castShadow = true;

    camp.add(log1, log2, log3);

    // Dynamic flickering fire light
    const fireLight = new THREE.PointLight(0xff7700, 2.8, 14, 1.6);
    fireLight.position.set(0, 0.65, 0);
    fireLight.castShadow = true;
    camp.add(fireLight);

    // Multi-tier animated flame geometries
    // Inner glowing core
    const coreGeo = new THREE.ConeGeometry(0.24, 0.65, 7);
    coreGeo.translate(0, 0.32, 0);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff0aa });
    const coreFlame = new THREE.Mesh(coreGeo, coreMat);
    camp.add(coreFlame);

    // Outer dancing fire flame
    const outerGeo = new THREE.ConeGeometry(0.36, 0.85, 7);
    outerGeo.translate(0, 0.42, 0);
    const outerMat = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.82
    });
    const outerFlame = new THREE.Mesh(outerGeo, outerMat);
    camp.add(outerFlame);

    // Floating Sparks / Embers Particle System
    const emberCount = 28;
    const emberGeo = new THREE.BufferGeometry();
    const emberPositions = new Float32Array(emberCount * 3);
    const emberVelocities = [];

    for (let i = 0; i < emberCount; i++) {
      emberPositions[i * 3] = (Math.random() - 0.5) * 0.4;
      emberPositions[i * 3 + 1] = 0.2 + Math.random() * 1.1;
      emberPositions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;

      emberVelocities.push({
        speedY: 0.6 + Math.random() * 0.8,
        swaySpeed: 2.0 + Math.random() * 3.0,
        swayAmp: 0.08 + Math.random() * 0.08,
        maxHeight: 1.1 + Math.random() * 0.8
      });
    }

    emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));

    const emberMat = new THREE.PointsMaterial({
      color: 0xffaa22,
      size: 0.06,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });

    const embers = new THREE.Points(emberGeo, emberMat);
    camp.add(embers);

    this.animatedFire = {
      light: fireLight,
      coreFlame,
      outerFlame,
      embers,
      emberPositions,
      emberVelocities,
      baseLightIntensity: 2.8
    };

    this.group.add(camp);
    this.colliders.push({ x, z, radius: 1.2, height: 1.5 });
  }

  update(dt, time) {
    if (!this.animatedFire) return;

    const { light, coreFlame, outerFlame, embers, emberVelocities, baseLightIntensity } = this.animatedFire;

    // 1. Realistic Fire Light Flickering
    const flicker = Math.sin(time * 14.0) * 0.35 + Math.sin(time * 26.5) * 0.25 + (Math.random() - 0.5) * 0.2;
    light.intensity = Math.max(1.2, baseLightIntensity + flicker);
    light.position.x = Math.sin(time * 8.0) * 0.04;
    light.position.z = Math.cos(time * 9.5) * 0.04;

    // 2. Animated Dancing Flames
    const scaleY = 1.0 + Math.sin(time * 18.0) * 0.22 + (Math.random() - 0.5) * 0.12;
    const scaleXZ = 1.0 + Math.sin(time * 12.0) * 0.15;
    coreFlame.scale.set(scaleXZ, scaleY, scaleXZ);
    coreFlame.rotation.y = time * 2.5;

    outerFlame.scale.set(scaleXZ * 1.08, scaleY * 1.1, scaleXZ * 1.08);
    outerFlame.rotation.y = -time * 3.2;
    outerFlame.rotation.z = Math.sin(time * 10.0) * 0.08;

    // 3. Floating rising sparks / embers
    const pos = embers.geometry.attributes.position.array;
    for (let i = 0; i < emberVelocities.length; i++) {
      const v = emberVelocities[i];
      pos[i * 3 + 1] += v.speedY * dt;
      pos[i * 3] += Math.sin(time * v.swaySpeed + i) * v.swayAmp * dt;
      pos[i * 3 + 2] += Math.cos(time * v.swaySpeed + i) * v.swayAmp * dt;

      if (pos[i * 3 + 1] > v.maxHeight) {
        pos[i * 3] = (Math.random() - 0.5) * 0.35;
        pos[i * 3 + 1] = 0.22;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 0.35;
      }
    }
    embers.geometry.attributes.position.needsUpdate = true;
  }

  /**
   * Rural Countryside Cottage (Rumah Kecil Pedesaan)
   */
  createRuralCottage(x, z, rotY = 0, style = {}) {
    const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
    const cottage = new THREE.Group();
    cottage.position.set(x, y, z);
    cottage.rotation.y = rotY;

    const wallColor = style.wallColor || 0xd6cbb0;
    const roofColor = style.roofColor || 0x9e4328;

    const foundationMat = new THREE.MeshStandardMaterial({ color: 0x585c63, roughness: 0.95 });
    const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.85 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2a1b, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.8 });
    const windowGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
    const windowFrameMat = new THREE.MeshStandardMaterial({ color: 0x2e1f14, roughness: 0.9 });
    const flowerRedMat = new THREE.MeshStandardMaterial({ color: 0xd63031, roughness: 0.7 });
    const flowerYellowMat = new THREE.MeshStandardMaterial({ color: 0xfbc531, roughness: 0.7 });

    // 1. Stone Foundation
    const fGeo = new THREE.BoxGeometry(5.8, 0.45, 4.6);
    fGeo.translate(0, 0.22, 0);
    const foundation = new THREE.Mesh(fGeo, foundationMat);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    cottage.add(foundation);

    // 2. Main Cottage Body
    const bodyGeo = new THREE.BoxGeometry(5.4, 2.7, 4.2);
    bodyGeo.translate(0, 1.8, 0);
    const body = new THREE.Mesh(bodyGeo, wallMat);
    body.castShadow = true;
    body.receiveShadow = true;
    cottage.add(body);

    // Corner timber beams
    const cornerGeo = new THREE.BoxGeometry(0.22, 2.7, 0.22);
    cornerGeo.translate(0, 1.8, 0);
    const cOffsets = [[-2.6, -2.0], [2.6, -2.0], [-2.6, 2.0], [2.6, 2.0]];
    cOffsets.forEach(([cx, cz]) => {
      const c = new THREE.Mesh(cornerGeo, darkWoodMat);
      c.position.set(cx, 0, cz);
      c.castShadow = true;
      cottage.add(c);
    });

    // 3. Pitched Gable Roof
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 5.0), roofMat);
    roofL.position.set(-1.25, 3.8, 0);
    roofL.rotation.z = 0.55;
    roofL.castShadow = true;

    const roofR = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.14, 5.0), roofMat);
    roofR.position.set(1.25, 3.8, 0);
    roofR.rotation.z = -0.55;
    roofR.castShadow = true;

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5.1), darkWoodMat);
    ridge.position.set(0, 4.6, 0);
    ridge.castShadow = true;

    // Gable triangular fillers
    const gableGeo = new THREE.ConeGeometry(2.6, 1.5, 4);
    gableGeo.scale(1.0, 1.0, 0.04);
    const gFront = new THREE.Mesh(gableGeo, wallMat);
    gFront.position.set(0, 3.85, 2.05);
    const gBack = new THREE.Mesh(gableGeo, wallMat);
    gBack.position.set(0, 3.85, -2.05);

    cottage.add(roofL, roofR, ridge, gFront, gBack);

    // 4. Front Porch with round posts & roof
    const pDeck = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.2, 1.6), darkWoodMat);
    pDeck.position.set(0, 0.32, 2.8);
    pDeck.receiveShadow = true;

    const pPostGeo = new THREE.CylinderGeometry(0.1, 0.12, 2.4, 8);
    pPostGeo.translate(0, 1.2, 0);
    const p1 = new THREE.Mesh(pPostGeo, darkWoodMat);
    p1.position.set(-2.4, 0.42, 3.4);
    p1.castShadow = true;
    const p2 = new THREE.Mesh(pPostGeo, darkWoodMat);
    p2.position.set(2.4, 0.42, 3.4);
    p2.castShadow = true;

    const pRoof = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.1, 1.8), roofMat);
    pRoof.position.set(0, 2.85, 2.8);
    pRoof.rotation.x = 0.15;
    pRoof.castShadow = true;

    const pStep = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.15, 0.5), darkWoodMat);
    pStep.position.set(0, 0.12, 3.8);
    pStep.receiveShadow = true;

    cottage.add(pDeck, p1, p2, pRoof, pStep);

    // 5. Front Door with brass ring
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.0, 0.08), darkWoodMat);
    door.position.set(0, 1.45, 2.12);
    door.castShadow = true;
    cottage.add(door);

    // 6. Windows with warm glow
    const addWin = (wx, wy, wz, ry = 0) => {
      const g = new THREE.Group();
      g.position.set(wx, wy, wz);
      g.rotation.y = ry;
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), windowGlowMat);
      pane.position.z = 0.02;
      const fH = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.05, 0.06), windowFrameMat);
      const fV = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.95, 0.06), windowFrameMat);
      const bdr = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 0.03), windowFrameMat);
      g.add(pane, fH, fV, bdr);
      cottage.add(g);
    };

    addWin(1.6, 1.8, 2.12); // Front right window
    addWin(-2.72, 1.8, 0, Math.PI / 2); // Left side window
    addWin(2.72, 1.8, 0, -Math.PI / 2); // Right side window

    // Warm interior window light spill
    const inLight = new THREE.PointLight(0xffb74d, 1.2, 10);
    inLight.position.set(0, 2.0, 0);
    cottage.add(inLight);

    // 7. Stone Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.75, 4.6, 0.75), foundationMat);
    chimney.position.set(2.0, 2.4, -1.0);
    chimney.castShadow = true;
    const cCap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), foundationMat);
    cCap.position.set(2.0, 4.75, -1.0);
    cottage.add(chimney, cCap);

    // 8. Yard Dressing: Planter Box with Flowers & Wooden Barrel
    const planterBox = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.35, 0.45), darkWoodMat);
    planterBox.position.set(-1.6, 0.5, 2.4);
    planterBox.castShadow = true;
    cottage.add(planterBox);

    // 4 Flower blossoms in planter
    for (let i = 0; i < 4; i++) {
      const fl = new THREE.Mesh(new THREE.DodecahedronGeometry(0.09, 0), (i % 2 === 0) ? flowerRedMat : flowerYellowMat);
      fl.position.set(-2.1 + i * 0.35, 0.76, 2.4);
      cottage.add(fl);
    }

    // Wooden water barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.85, 8), darkWoodMat);
    barrel.position.set(2.4, 0.42, 2.5);
    barrel.castShadow = true;
    cottage.add(barrel);

    // Small woodpile stack
    const woodpile = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.5), darkWoodMat);
    woodpile.position.set(-2.4, 0.3, -1.8);
    woodpile.castShadow = true;
    cottage.add(woodpile);

    this.group.add(cottage);
    this.colliders.push({ x, z, radius: 4.6, height: 6 });
  }

  /**
   * Old Weathered / Abandoned House (Rumah Tua Lapuk di Tepi Hutan)
   */
  createOldWeatheredHouse(x, z, rotY = 0) {
    const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
    const house = new THREE.Group();
    house.position.set(x, y, z);
    house.rotation.y = rotY;

    // Dilapidated weathered materials
    const mossStoneMat = new THREE.MeshStandardMaterial({ color: 0x485042, roughness: 0.98 });
    const decayedWoodMat = new THREE.MeshStandardMaterial({ color: 0x423a31, roughness: 0.95 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x2b241c, roughness: 0.95 });
    const mossRoofMat = new THREE.MeshStandardMaterial({ color: 0x363930, roughness: 0.9 });
    const darkRecessMat = new THREE.MeshBasicMaterial({ color: 0x141210 });
    const boardMat = new THREE.MeshStandardMaterial({ color: 0x3a3126, roughness: 0.95 });

    // 1. Mossy Cracked Fieldstone Foundation
    const fGeo = new THREE.BoxGeometry(6.2, 0.5, 4.8);
    fGeo.translate(0, 0.25, 0);
    const foundation = new THREE.Mesh(fGeo, mossStoneMat);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    house.add(foundation);

    // 2. Weathered Decaying Timber Body (slightly warped)
    const bodyGeo = new THREE.BoxGeometry(5.8, 2.8, 4.4);
    bodyGeo.translate(0, 1.85, 0);
    const body = new THREE.Mesh(bodyGeo, decayedWoodMat);
    body.castShadow = true;
    body.receiveShadow = true;
    house.add(body);

    // Misaligned corner timber pillars
    const cOffsets = [[-2.8, -2.1], [2.8, -2.1], [-2.8, 2.1], [2.8, 2.1]];
    cOffsets.forEach(([cx, cz], i) => {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.24, 2.9, 0.24), darkWoodMat);
      c.position.set(cx, 1.85, cz);
      c.rotation.z = (i % 2 === 0 ? 0.03 : -0.02);
      c.castShadow = true;
      house.add(c);
    });

    // 3. Sagging, Broken Roof with Missing Shingles & Exposed Rafters
    // Left roof slope (sagging at 0.62 rad)
    const roofL = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.12, 5.2), mossRoofMat);
    roofL.position.set(-1.3, 3.85, 0);
    roofL.rotation.z = 0.62;
    roofL.castShadow = true;

    // Right roof slope (broken rafter gap)
    const roofR = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.12, 4.6), mossRoofMat);
    roofR.position.set(1.3, 3.9, -0.2);
    roofR.rotation.z = -0.56;
    roofR.castShadow = true;

    // Exposed broken timber rafters along roof gap
    for (let r = 0; r < 3; r++) {
      const rafter = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), darkWoodMat);
      rafter.position.set(1.3, 4.1, 1.6 + r * 0.4);
      rafter.rotation.z = -0.56;
      house.add(rafter);
    }

    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 5.3), darkWoodMat);
    ridge.position.set(0, 4.68, 0);
    ridge.rotation.x = 0.02;
    ridge.castShadow = true;

    // Sagging gable ends
    const gableGeo = new THREE.ConeGeometry(2.8, 1.5, 4);
    gableGeo.scale(1.0, 1.0, 0.04);
    const gFront = new THREE.Mesh(gableGeo, decayedWoodMat);
    gFront.position.set(0, 3.9, 2.15);
    const gBack = new THREE.Mesh(gableGeo, decayedWoodMat);
    gBack.position.set(0, 3.9, -2.15);

    house.add(roofL, roofR, ridge, gFront, gBack);

    // 4. Broken Rickety Porch with tilted pillar
    const pDeck = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.22, 1.8), darkWoodMat);
    pDeck.position.set(0, 0.35, 3.0);
    pDeck.rotation.z = -0.02; // Uneven floor
    pDeck.receiveShadow = true;

    // Left post upright, right post tilted crookedly!
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.4, 6), darkWoodMat);
    postL.position.set(-2.6, 1.55, 3.6);
    postL.castShadow = true;

    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 2.4, 6), darkWoodMat);
    postR.position.set(2.6, 1.55, 3.6);
    postR.rotation.z = 0.14; // Crooked tilted post!
    postR.castShadow = true;

    const pRoof = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.1, 2.0), mossRoofMat);
    pRoof.position.set(0, 2.85, 3.0);
    pRoof.rotation.x = 0.18;
    pRoof.rotation.z = -0.03;
    pRoof.castShadow = true;

    house.add(pDeck, postL, postR, pRoof);

    // 5. Boarded-Up Broken Windows (No glow!)
    const addBoardedWin = (wx, wy, wz, ry = 0) => {
      const g = new THREE.Group();
      g.position.set(wx, wy, wz);
      g.rotation.y = ry;

      // Dark empty glass recess
      const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.95), darkRecessMat);
      hole.position.z = 0.02;

      // Nailed wooden cross boards
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.14, 0.04), boardMat);
      b1.position.set(0, 0.18, 0.05);
      b1.rotation.z = 0.15;

      const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.14, 0.04), boardMat);
      b2.position.set(0, -0.18, 0.05);
      b2.rotation.z = -0.12;

      const bDiag = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 0.04), boardMat);
      bDiag.position.set(0, 0, 0.06);
      bDiag.rotation.z = 0.72;

      g.add(hole, b1, b2, bDiag);
      house.add(g);
    };

    addBoardedWin(1.8, 1.8, 2.22);
    addBoardedWin(-2.92, 1.8, 0, Math.PI / 2);
    addBoardedWin(2.92, 1.8, 0, -Math.PI / 2);

    // 6. Tilted Leaning Crumbling Chimney
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.85, 4.8, 0.85), mossStoneMat);
    chimney.position.set(2.2, 2.4, -1.1);
    chimney.rotation.z = -0.07; // Leaning crumbling chimney!
    chimney.castShadow = true;
    house.add(chimney);

    // 7. Abandoned Yard Clutter: Broken Wagon Wheel, Collapsed Fence, Mossy Rocks
    // Broken wooden wagon wheel leaning against wall
    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 6, 12), darkWoodMat);
    wheelRim.position.set(-2.2, 0.55, 2.4);
    wheelRim.rotation.y = 0.25;
    wheelRim.rotation.x = -0.2;
    wheelRim.castShadow = true;
    house.add(wheelRim);

    // Collapsed broken fence section on ground
    const fenceRail = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.08), darkWoodMat);
    fenceRail.position.set(2.8, 0.15, 4.2);
    fenceRail.rotation.z = -0.35; // Lying broken in dirt!
    house.add(fenceRail);

    // Rotting overturned barrel
    const rotBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.8, 7), darkWoodMat);
    rotBarrel.position.set(-2.8, 0.35, 3.4);
    rotBarrel.rotation.z = Math.PI / 2;
    rotBarrel.rotation.y = 0.4;
    rotBarrel.castShadow = true;
    house.add(rotBarrel);

    this.group.add(house);
    this.colliders.push({ x, z, radius: 4.8, height: 6 });
  }

  /**
   * Village Market Stall (Kios Pedagang Pasar)
   */
  createMarketStall(x, z, rotY = 0) {
    const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
    const stall = new THREE.Group();
    stall.position.set(x, y, z);
    stall.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c422c, roughness: 0.9 });
    const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x3d2919, roughness: 0.92 });
    const awningRedMat = new THREE.MeshStandardMaterial({ color: 0x9b2b24, roughness: 0.75, side: THREE.DoubleSide });
    const appleMat = new THREE.MeshStandardMaterial({ color: 0xb52424, roughness: 0.6 });
    const cabbageMat = new THREE.MeshStandardMaterial({ color: 0x489635, roughness: 0.75 });
    const sackMat = new THREE.MeshStandardMaterial({ color: 0x9c825a, roughness: 0.9 });

    // 1. Counter Table
    const counterTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.4), woodMat);
    counterTop.position.set(0, 0.95, 0);
    counterTop.castShadow = true;
    counterTop.receiveShadow = true;

    const counterBase = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.88, 1.2), darkWoodMat);
    counterBase.position.set(0, 0.45, 0);
    counterBase.castShadow = true;
    stall.add(counterTop, counterBase);

    // 2. 4 Timber corner posts supporting canvas awning
    const postGeo = new THREE.CylinderGeometry(0.08, 0.09, 2.7, 6);
    postGeo.translate(0, 1.35, 0);
    const pOffsets = [[-1.5, -0.65], [1.5, -0.65], [-1.5, 0.65], [1.5, 0.65]];
    pOffsets.forEach(([px, pz]) => {
      const p = new THREE.Mesh(postGeo, darkWoodMat);
      p.position.set(px, 0, pz);
      p.castShadow = true;
      stall.add(p);
    });

    // 3. Striped Canvas Awning Canopy
    const awning = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.08, 1.9), awningRedMat);
    awning.position.set(0, 2.7, 0.1);
    awning.rotation.x = 0.14;
    awning.castShadow = true;
    stall.add(awning);

    // 4. Wares on table: Produce Crates with apples & cabbages
    const crateGeo = new THREE.BoxGeometry(0.7, 0.25, 0.5);
    const crate1 = new THREE.Mesh(crateGeo, woodMat);
    crate1.position.set(-0.8, 1.12, 0);
    crate1.castShadow = true;

    // Apple fruits in crate 1
    for (let i = 0; i < 6; i++) {
      const ap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08, 0), appleMat);
      ap.position.set(-0.95 + (i % 3) * 0.16, 1.28, -0.1 + Math.floor(i / 3) * 0.18);
      stall.add(ap);
    }

    const crate2 = new THREE.Mesh(crateGeo, woodMat);
    crate2.position.set(0.6, 1.12, 0);
    crate2.castShadow = true;

    // Cabbage heads in crate 2
    for (let i = 0; i < 4; i++) {
      const cb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 0), cabbageMat);
      cb.position.set(0.48 + (i % 2) * 0.24, 1.28, -0.1 + Math.floor(i / 2) * 0.22);
      stall.add(cb);
    }

    // Grain sacks and barrels behind counter
    const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 1), sackMat);
    sack.position.set(-1.0, 0.35, -1.0);
    sack.scale.set(0.9, 1.2, 0.8);
    sack.castShadow = true;

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.35, 0.85, 8), darkWoodMat);
    barrel.position.set(1.1, 0.42, -1.0);
    barrel.castShadow = true;

    stall.add(crate1, crate2, sack, barrel);

    // Warm lantern hanging from front post
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.22, 6), new THREE.MeshBasicMaterial({ color: 0xffe27a }));
    lantern.position.set(-1.4, 2.3, 0.7);
    const stallLight = new THREE.PointLight(0xffb24a, 1.4, 8);
    stallLight.position.set(-1.4, 2.2, 0.7);
    stall.add(lantern, stallLight);

    this.group.add(stall);
    this.colliders.push({ x, z, radius: 2.2, height: 3.5 });
  }

  /**
   * Village Vegetable Farm Plot (Kebun Sayur & Ladang)
   */
  createFarmField(x, z, rotY = 0) {
    const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
    const farm = new THREE.Group();
    farm.position.set(x, y, z);
    farm.rotation.y = rotY;

    const soilMat = new THREE.MeshStandardMaterial({ color: 0x362314, roughness: 0.98 });
    const cropMat = new THREE.MeshStandardMaterial({ color: 0x48962b, roughness: 0.8 });
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x543e2a, roughness: 0.9 });
    const strawMat = new THREE.MeshStandardMaterial({ color: 0xc4a35a, roughness: 0.85 });

    // 1. Tilled soil mound bed
    const soilBed = new THREE.Mesh(new THREE.BoxGeometry(8.5, 0.15, 6.5), soilMat);
    soilBed.position.set(0, 0.08, 0);
    soilBed.receiveShadow = true;
    farm.add(soilBed);

    // 2. 3 Raised furrows with leafy crops
    for (let furrow = -1; furrow <= 1; furrow++) {
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.14, 1.2), soilMat);
      ridge.position.set(0, 0.2, furrow * 1.8);
      farm.add(ridge);

      // 6 crop clusters per furrow
      for (let c = 0; c < 6; c++) {
        const crop = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 1), cropMat);
        crop.position.set(-3.2 + c * 1.28, 0.38, furrow * 1.8);
        crop.scale.set(1.0, 0.65 + Math.random() * 0.25, 1.0);
        crop.castShadow = true;
        farm.add(crop);
      }
    }

    // 3. Low split-rail perimeter fence around farm
    const postGeo = new THREE.CylinderGeometry(0.08, 0.09, 1.1, 6);
    postGeo.translate(0, 0.55, 0);
    const fencePosts = [
      [-4.4, -3.4], [0, -3.4], [4.4, -3.4],
      [-4.4, 3.4], [0, 3.4], [4.4, 3.4],
      [-4.4, 0], [4.4, 0]
    ];
    fencePosts.forEach(([fx, fz]) => {
      const p = new THREE.Mesh(postGeo, fenceMat);
      p.position.set(fx, 0, fz);
      p.castShadow = true;
      farm.add(p);
    });

    const railN = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.08, 0.08), fenceMat);
    railN.position.set(0, 0.8, -3.4);
    const railS = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.08, 0.08), fenceMat);
    railS.position.set(0, 0.8, 3.4);
    farm.add(railN, railS);

    // 4. Scarecrow in corner
    const scPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), fenceMat);
    scPole.position.set(3.6, 1.1, 2.6);
    const scCross = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.06, 0.06), fenceMat);
    scCross.position.set(3.6, 1.6, 2.6);
    const scHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), strawMat);
    scHead.position.set(3.6, 2.1, 2.6);
    const scHat = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.25, 6), strawMat);
    scHat.position.set(3.6, 2.3, 2.6);
    farm.add(scPole, scCross, scHead, scHat);

    this.group.add(farm);
    this.colliders.push({ x, z, radius: 4.5, height: 2.5 });
  }

  /**
   * Village Town Square Well (Sumur Desa Batu)
   */
  createVillageWell(x, z) {
    const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
    const well = new THREE.Group();
    well.position.set(x, y, z);

    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x62666b, roughness: 0.95 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a321e, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x8a392b, roughness: 0.8 });
    const waterMat = new THREE.MeshStandardMaterial({ color: 0x1d4e78, roughness: 0.1, metalness: 0.2 });

    // 1. Cobblestone Apron Base
    const apron = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.12, 12), stoneMat);
    apron.position.set(0, 0.06, 0);
    apron.receiveShadow = true;

    // 2. Stone Well Basin
    const basin = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.4, 0.9, 12), stoneMat);
    basin.position.set(0, 0.55, 0);
    basin.castShadow = true;
    basin.receiveShadow = true;

    // Deep water disc inside well
    const water = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.05, 12), waterMat);
    water.position.set(0, 0.45, 0);

    well.add(apron, basin, water);

    // 3. Timber Uprights & Roof Canopy
    const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), woodMat);
    postL.position.set(-1.15, 1.2, 0);
    postL.castShadow = true;

    const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.4, 6), woodMat);
    postR.position.set(1.15, 1.2, 0);
    postR.castShadow = true;

    const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.14, 0.14), woodMat);
    crossBeam.position.set(0, 2.3, 0);

    const wellRoof = new THREE.Mesh(new THREE.ConeGeometry(1.8, 1.0, 4), roofMat);
    wellRoof.position.set(0, 2.8, 0);
    wellRoof.rotation.y = Math.PI / 4;
    wellRoof.castShadow = true;

    // Winding drum & bucket
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), woodMat);
    drum.position.set(0, 1.6, 0);
    drum.rotation.z = Math.PI / 2;

    const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.35, 6), woodMat);
    bucket.position.set(0.4, 1.05, 0);
    bucket.castShadow = true;

    well.add(postL, postR, crossBeam, wellRoof, drum, bucket);

    this.group.add(well);
    this.colliders.push({ x, z, radius: 1.8, height: 3.5 });
  }

  /**
   * Rustic Village Bench (Bangku Kayu Desa)
   */
  createVillageBench(x, z, rotY = 0) {
    const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
    const bench = new THREE.Group();
    bench.position.set(x, y, z);
    bench.rotation.y = rotY;

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x543c28, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x2d3033, roughness: 0.8, metalness: 0.3 });

    // Seat plank
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.08, 0.5), woodMat);
    seat.position.set(0, 0.48, 0);
    seat.castShadow = true;
    seat.receiveShadow = true;

    // Backrest plank
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.35, 0.06), woodMat);
    backrest.position.set(0, 0.85, -0.22);
    backrest.rotation.x = -0.15;
    backrest.castShadow = true;

    // 4 Metal / Timber Legs
    const legGeo = new THREE.BoxGeometry(0.08, 0.48, 0.08);
    const legOffsets = [[-0.75, -0.18], [0.75, -0.18], [-0.75, 0.18], [0.75, 0.18]];
    legOffsets.forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(lx, 0.24, lz);
      leg.castShadow = true;
      bench.add(leg);
    });

    bench.add(seat, backrest);
    this.group.add(bench);
    this.colliders.push({ x, z, radius: 1.1, height: 1.2 });
  }

  checkCollision(x, z, playerRadius = 0.45) {
    for (const c of this.colliders) {
      const dx = x - c.x;
      const dz = z - c.z;
      const minDist = c.radius + playerRadius;
      if (dx * dx + dz * dz < minDist * minDist) {
        return { collided: true, collider: c, dx, dz, minDist };
      }
    }
    return { collided: false };
  }

  resolvePosition(x, z, playerRadius = 0.45) {
    let resolvedX = x;
    let resolvedZ = z;
    for (const c of this.colliders) {
      const dx = resolvedX - c.x;
      const dz = resolvedZ - c.z;
      const distSq = dx * dx + dz * dz;
      const minDist = c.radius + playerRadius;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        if (dist > 0.001) {
          resolvedX = c.x + (dx / dist) * minDist;
          resolvedZ = c.z + (dz / dist) * minDist;
        } else {
          resolvedX = c.x + minDist;
        }
      }
    }
    return { x: resolvedX, z: resolvedZ };
  }
}
