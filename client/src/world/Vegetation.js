import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Optimized Open-World Vegetation & Scenery System:
 * - Spatial Grid Chunking (6x6 cells of 80m x 80m) enables Three.js automatic frustum culling.
 * - Forward-focused Distance Culling & Fine-Grained Grass LOD with Hysteresis.
 * - Single GPU vertex shader horizontal wind wave animation.
 * - Android Performance Profiles (Low, Medium, High).
 */
export class Vegetation {
  constructor(scene, terrain, densityPreset = 'medium') {
    this.scene = scene;
    this.terrain = terrain;
    this.densityPreset = densityPreset;
    this.loader = typeof window !== 'undefined' ? new GLTFLoader() : null;

    this.instancedMeshes = [];
    this.grassMeshes = [];
    this.treeFoliageMeshes = [];
    this.chunks = [];
    this.windUniforms = { uTime: { value: 0 } };
    this.cullTick = 0;

    // Density configuration
    this.counts = {
      pine: 450,
      oak: 300,
      bush: 400,
      grass: 2200,
      rock: 160
    };

    if (this.densityPreset === 'low') {
      this.counts = { pine: 200, oak: 130, bush: 180, grass: 900, rock: 80 };
    } else if (this.densityPreset === 'high') {
      this.counts = { pine: 750, oak: 450, bush: 650, grass: 3600, rock: 240 };
    }

    this.setQuality(this.densityPreset);
    this.setupSpatialChunks();
    this.init();
  }

  setQuality(preset) {
    this.densityPreset = preset;
    if (preset === 'low') {
      this.cullingLimits = { maxView: 120, maxGrass: 42 };
    } else if (preset === 'high') {
      this.cullingLimits = { maxView: 280, maxGrass: 105 };
    } else {
      this.cullingLimits = { maxView: 180, maxGrass: 68 };
    }
  }

  setupSpatialChunks() {
    this.chunkSize = 80;
    this.gridMin = -240;
    this.gridMax = 240;
    this.gridCols = 6;
    this.gridRows = 6;
    this.chunks = [];

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const minX = this.gridMin + c * this.chunkSize;
        const maxX = minX + this.chunkSize;
        const minZ = this.gridMin + r * this.chunkSize;
        const maxZ = minZ + this.chunkSize;
        const centerX = minX + this.chunkSize * 0.5;
        const centerZ = minZ + this.chunkSize * 0.5;

        const group = new THREE.Group();
        group.name = `VegChunk_${c}_${r}`;
        this.scene.add(group);

        this.chunks.push({
          col: c,
          row: r,
          minX, maxX, minZ, maxZ,
          centerX, centerZ,
          group,
          instancedMeshes: [],
          grassMeshes: [],
          visible: true,
          grassVisible: true
        });
      }
    }
  }

  getChunkIndexForPosition(x, z) {
    const c = Math.floor((x - this.gridMin) / this.chunkSize);
    const r = Math.floor((z - this.gridMin) / this.chunkSize);
    if (c < 0 || c >= this.gridCols || r < 0 || r >= this.gridRows) return -1;
    return r * this.gridCols + c;
  }

  init() {
    // 1. Generate collision-free placement transforms
    this.transforms = {
      pines: this.generateTransforms(this.counts.pine, {
        minDist: 20,
        maxCoord: 220,
        minAlt: -8,
        maxAlt: 38,
        scaleMin: 4.2,
        scaleMax: 6.8,
        tiltMax: 0.08
      }),
      oaks: this.generateTransforms(this.counts.oak, {
        minDist: 22,
        maxCoord: 190,
        minAlt: -6,
        maxAlt: 22,
        scaleMin: 3.8,
        scaleMax: 6.0,
        tiltMax: 0.06
      }),
      bushes: this.generateTransforms(this.counts.bush, {
        minDist: 18,
        maxCoord: 180,
        minAlt: -6,
        maxAlt: 26,
        scaleMin: 1.8,
        scaleMax: 2.8,
        tiltMax: 0.05
      }),
      grass: this.generateTransforms(this.counts.grass, {
        minDist: 12,
        maxCoord: 190,
        minAlt: -6,
        maxAlt: 24,
        scaleMin: 2.2,
        scaleMax: 3.4,
        tiltMax: 0.12
      }),
      rocks: this.generateTransforms(this.counts.rock, {
        minDist: 16,
        maxCoord: 210,
        minAlt: -8,
        maxAlt: 35,
        scaleMin: 1.6,
        scaleMax: 3.6,
        tiltMax: 0.25
      })
    };

    // 2. Load 3D GLTF models with procedural 3D fallbacks
    this.loadNatureModels();
  }

  generateTransforms(count, options) {
    const list = [];
    const dummy = new THREE.Object3D();
    let attempts = 0;

    const spawnRadiusSq = options.minDist * options.minDist;

    while (list.length < count && attempts < count * 5) {
      attempts++;
      const x = (Math.random() - 0.5) * options.maxCoord * 2;
      const z = (Math.random() - 0.5) * options.maxCoord * 2;

      // Avoid spawn center
      if (x * x + z * z < spawnRadiusSq) continue;

      // Avoid roads
      if (this.terrain.isRoadAt && this.terrain.isRoadAt(x, z)) continue;

      // Avoid settlements, cottages, fields, and structures
      const exclusionZones = [
        { x: 8, z: 8, rSq: 81 },       // Campfire (r=9)
        { x: 24, z: 16, rSq: 64 },     // Pioneer cabin (r=8)
        { x: 42, z: 28, rSq: 144 },    // Herbalist cottage (r=12)
        { x: 22, z: -28, rSq: 144 },   // Carpenter workshop (r=12)
        { x: 14, z: 2, rSq: 81 },      // Market stall (r=9)
        { x: 34, z: -6, rSq: 121 },    // Farm field (r=11)
        { x: 6, z: 22, rSq: 64 },      // Village well & bench (r=8)
        { x: -55, z: -35, rSq: 144 },  // Old forest shack (r=12)
        { x: -22, z: 88, rSq: 144 },   // Dilapidated hunter lodge (r=12)
        { x: 72, z: -40, rSq: 144 },   // Hillside farmhouse (r=12)
        { x: -16, z: -14, rSq: 64 },   // Watchtower (r=8)
        { x: -40, z: 38, rSq: 81 },    // Stone ruins (r=9)
        { x: -5, z: 60, rSq: 81 }      // Wooden bridge (r=9)
      ];

      let insideExclusion = false;
      for (let i = 0; i < exclusionZones.length; i++) {
        const ez = exclusionZones[i];
        const edx = x - ez.x;
        const edz = z - ez.z;
        if (edx * edx + edz * edz < ez.rSq) {
          insideExclusion = true;
          break;
        }
      }
      if (insideExclusion) continue;

      // Altitude check
      const y = this.terrain.getSurfaceHeight ? this.terrain.getSurfaceHeight(x, z) : this.terrain.getHeightAt(x, z);
      if (y < options.minAlt || y > options.maxAlt) continue;

      const scale = options.scaleMin + Math.random() * (options.scaleMax - options.scaleMin);
      const rotY = Math.random() * Math.PI * 2;
      const tiltX = (Math.random() - 0.5) * options.tiltMax;
      const tiltZ = (Math.random() - 0.5) * options.tiltMax;

      dummy.position.set(x, y - 0.05, z);
      dummy.rotation.set(tiltX, rotY, tiltZ);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();

      list.push({
        matrix: dummy.matrix.clone(),
        position: new THREE.Vector3(x, y, z),
        scale: scale,
        rotationY: rotY
      });
    }

    return list;
  }

  async loadNatureModels() {
    // Shared PBR Materials
    const pineFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x224c26, // Deep alpine evergreen needle green
      roughness: 0.82,
      metalness: 0.05
    });

    const pineTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x483424, // Weathered pine bark brown
      roughness: 0.92,
      metalness: 0.02
    });

    const oakFoliageMat = new THREE.MeshStandardMaterial({
      color: 0x3d7a2e, // Lush deciduous summer canopy green
      roughness: 0.80,
      metalness: 0.05
    });

    const oakTrunkMat = new THREE.MeshStandardMaterial({
      color: 0x54402e, // Weathered hardwood bark
      roughness: 0.92,
      metalness: 0.02
    });

    const grassMat = new THREE.MeshStandardMaterial({
      color: 0x4d912c, // Vibrant meadow grass blade green
      roughness: 0.85,
      metalness: 0.02,
      side: THREE.DoubleSide
    });

    // GPU vertex-shader based horizontal wind sway
    grassMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.windUniforms.uTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          '#ifdef USE_INSTANCING',
          '  vec3 instPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);',
          '  float windWave = sin(uTime * 2.2 + (instPos.x * 0.14 + instPos.z * 0.10));',
          '  float windGust = cos(uTime * 1.5 + (instPos.x * 0.08 - instPos.z * 0.12));',
          '  float swayFactor = clamp((transformed.y + 0.05) * 2.4, 0.0, 1.0);',
          '  swayFactor = swayFactor * swayFactor;',
          '  transformed.x += (windWave * 0.15 + windGust * 0.05) * swayFactor;',
          '  transformed.z += (windWave * 0.08 + windGust * 0.12) * swayFactor;',
          '  transformed.y -= abs(windWave) * 0.02 * swayFactor;',
          '#endif'
        ].join('\n')
      );
    };

    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x396c28,
      roughness: 0.85,
      metalness: 0.02
    });

    bushMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.windUniforms.uTime;
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        [
          '#include <begin_vertex>',
          '#ifdef USE_INSTANCING',
          '  vec3 instPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);',
          '  float windWave = sin(uTime * 1.8 + instPos.x * 0.10 + instPos.z * 0.08);',
          '  float swayFactor = clamp(transformed.y * 1.2, 0.0, 1.0);',
          '  swayFactor = swayFactor * swayFactor;',
          '  transformed.x += windWave * 0.04 * swayFactor;',
          '  transformed.z += cos(uTime * 1.4 + instPos.z * 0.08) * 0.03 * swayFactor;',
          '#endif'
        ].join('\n')
      );
    };

    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x666d73,
      roughness: 0.92,
      metalness: 0.02
    });

    // 1. Alpine Pine Trees
    this.loadModelWithInstancing(
      '/tree_pineDefaultA.glb',
      this.transforms.pines,
      (submeshes) => {
        const foliageSub = submeshes.find(s => s.mat.toLowerCase().includes('leaf') || s.name.includes('tree_pineDefaultA'));
        const trunkSub = submeshes.find(s => s.mat.toLowerCase().includes('wood') || s.mat.toLowerCase().includes('bark') || s.name.includes('1'));

        if (trunkSub) {
          this.createChunkedInstancedMeshes(trunkSub.geo, pineTrunkMat, this.transforms.pines, true);
        }
        if (foliageSub) {
          this.createChunkedInstancedMeshes(foliageSub.geo, pineFoliageMat, this.transforms.pines, true, 0x224c26);
        }
      },
      () => this.createProceduralPineTrees(this.transforms.pines, pineTrunkMat, pineFoliageMat)
    );

    // 2. Deciduous Oak Trees
    this.loadModelWithInstancing(
      '/tree_oak.glb',
      this.transforms.oaks,
      (submeshes) => {
        const foliageSub = submeshes.find(s => s.mat.toLowerCase().includes('leaf') || s.name.includes('Mesh_tree_oak'));
        const trunkSub = submeshes.find(s => s.mat.toLowerCase().includes('wood') || s.mat.toLowerCase().includes('bark') || s.name.includes('1'));

        if (trunkSub) {
          this.createChunkedInstancedMeshes(trunkSub.geo, oakTrunkMat, this.transforms.oaks, true);
        }
        if (foliageSub) {
          this.createChunkedInstancedMeshes(foliageSub.geo, oakFoliageMat, this.transforms.oaks, true, 0x3d7a2e);
        }
      },
      () => this.createProceduralOakTrees(this.transforms.oaks, oakTrunkMat, oakFoliageMat)
    );

    // 3. True 3D Grass Tufts
    this.loadModelWithInstancing(
      '/grass_leafsLarge.glb',
      this.transforms.grass,
      (submeshes) => {
        if (submeshes.length > 0) {
          const grassGeo = submeshes[0].geo;
          this.createChunkedInstancedMeshes(grassGeo, grassMat, this.transforms.grass, false, 0x4d912c, true);
        }
      },
      () => this.createProcedural3DGrass(this.transforms.grass, grassMat)
    );

    // 4. Wild Bushes
    this.loadModelWithInstancing(
      '/plant_bushDetailed.glb',
      this.transforms.bushes,
      (submeshes) => {
        if (submeshes.length > 0) {
          const bushGeo = submeshes[0].geo;
          this.createChunkedInstancedMeshes(bushGeo, bushMat, this.transforms.bushes, true, 0x396c28);
        }
      },
      () => this.createProceduralBushes(this.transforms.bushes, bushMat)
    );

    // 5. Granite Boulders
    this.loadModelWithInstancing(
      '/rock_largeA.glb',
      this.transforms.rocks,
      (submeshes) => {
        if (submeshes.length > 0) {
          const geos = submeshes.map(s => s.geo);
          const mergedGeo = BufferGeometryUtils.mergeGeometries(geos, false) || geos[0];
          this.createChunkedInstancedMeshes(mergedGeo, rockMat, this.transforms.rocks, true);
        }
      },
      null
    );
  }

  loadModelWithInstancing(url, transforms, onSuccess, onFallback) {
    if (typeof window === 'undefined' || !this.loader) {
      if (onFallback) onFallback();
      return;
    }
    this.loader.load(
      url,
      (gltf) => {
        gltf.scene.updateMatrixWorld(true);
        const submeshes = [];
        gltf.scene.traverse((c) => {
          if (c.isMesh) {
            const geo = c.geometry.clone();
            geo.applyMatrix4(c.matrixWorld);
            submeshes.push({
              name: c.name,
              mat: c.material ? c.material.name : '',
              geo: geo
            });
          }
        });
        if (submeshes.length > 0) {
          onSuccess(submeshes);
        } else if (onFallback) {
          onFallback();
        }
      },
      undefined,
      (err) => {
        console.warn(`[Vegetation] Failed to load ${url}, using 3D procedural fallback:`, err.message);
        if (onFallback) onFallback();
      }
    );
  }

  createChunkedInstancedMeshes(geometry, material, transforms, castShadow = true, baseColorHex = null, isGrass = false) {
    const chunkBins = Array.from({ length: this.chunks.length }, () => []);

    for (let i = 0; i < transforms.length; i++) {
      const t = transforms[i];
      const idx = this.getChunkIndexForPosition(t.position.x, t.position.z);
      if (idx >= 0 && idx < this.chunks.length) {
        chunkBins[idx].push(t);
      }
    }

    for (let idx = 0; idx < this.chunks.length; idx++) {
      const chunkTransforms = chunkBins[idx];
      if (chunkTransforms.length === 0) continue;

      const chunk = this.chunks[idx];
      const mesh = this.createInstancedMesh(geometry, material, chunkTransforms, castShadow, baseColorHex, isGrass);
      
      mesh.geometry.computeBoundingBox();
      mesh.geometry.computeBoundingSphere();
      
      chunk.group.add(mesh);
      chunk.instancedMeshes.push(mesh);
      this.instancedMeshes.push(mesh);

      if (isGrass) {
        chunk.grassMeshes.push(mesh);
        this.grassMeshes.push(mesh);
      }
    }
  }

  createInstancedMesh(geometry, material, transforms, castShadow = true, baseColorHex = null, receiveOnly = false) {
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    mesh.castShadow = castShadow && !receiveOnly;
    mesh.receiveShadow = true;
    mesh.frustumCulled = true;

    const baseColor = baseColorHex ? new THREE.Color(baseColorHex) : null;
    const tempColor = new THREE.Color();

    for (let i = 0; i < transforms.length; i++) {
      mesh.setMatrixAt(i, transforms[i].matrix);

      if (baseColor) {
        tempColor.copy(baseColor).offsetHSL(
          (Math.random() - 0.5) * 0.08,
          (Math.random() - 0.5) * 0.12,
          (Math.random() - 0.5) * 0.10
        );
        mesh.setColorAt(i, tempColor);
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (baseColor && mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }

    return mesh;
  }

  /* ================= PROCEDURAL 3D FALLBACK GENERATORS ================= */

  createProceduralPineTrees(transforms, trunkMat, foliageMat) {
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 4.2, 8);
    trunkGeo.translate(0, 2.1, 0);

    const c1 = new THREE.ConeGeometry(2.4, 3.2, 8);
    c1.translate(0, 3.8, 0);
    const c2 = new THREE.ConeGeometry(1.9, 2.8, 8);
    c2.translate(0, 5.4, 0);
    const c3 = new THREE.ConeGeometry(1.3, 2.4, 8);
    c3.translate(0, 6.8, 0);

    const foliageGeo = BufferGeometryUtils.mergeGeometries([c1, c2, c3], false);

    this.createChunkedInstancedMeshes(trunkGeo, trunkMat, transforms, true);
    this.createChunkedInstancedMeshes(foliageGeo, foliageMat, transforms, true, 0x224c26);
  }

  createProceduralOakTrees(transforms, trunkMat, foliageMat) {
    const trunkGeo = new THREE.CylinderGeometry(0.45, 0.75, 3.2, 8);
    trunkGeo.translate(0, 1.6, 0);

    const f1 = new THREE.DodecahedronGeometry(2.2, 1);
    f1.translate(0, 4.2, 0);
    const f2 = new THREE.DodecahedronGeometry(1.7, 1);
    f2.translate(1.0, 3.8, 0.6);
    const f3 = new THREE.DodecahedronGeometry(1.5, 1);
    f3.translate(-0.9, 4.0, -0.7);

    const foliageGeo = BufferGeometryUtils.mergeGeometries([f1, f2, f3], false);

    this.createChunkedInstancedMeshes(trunkGeo, trunkMat, transforms, true);
    this.createChunkedInstancedMeshes(foliageGeo, foliageMat, transforms, true, 0x3d7a2e);
  }

  createProcedural3DGrass(transforms, grassMat) {
    const blades = [];
    const bladeCount = 7;

    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const height = 0.42 + Math.random() * 0.22;
      const curve = 0.16 + Math.random() * 0.12;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const perpX = -sin * 0.04;
      const perpZ = cos * 0.04;

      const positions = new Float32Array([
        -perpX, 0, -perpZ,
         perpX, 0,  perpZ,
        cos * curve * 0.5 - perpX * 0.6, height * 0.5, sin * curve * 0.5 - perpZ * 0.6,
        cos * curve * 0.5 + perpX * 0.6, height * 0.5, sin * curve * 0.5 + perpZ * 0.6,
        cos * curve, height * 0.9, sin * curve
      ]);

      const indices = new Uint16Array([
        0, 1, 2,
        1, 3, 2,
        2, 3, 4
      ]);

      const bladeGeo = new THREE.BufferGeometry();
      bladeGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      bladeGeo.setIndex(new THREE.BufferAttribute(indices, 1));
      bladeGeo.computeVertexNormals();
      blades.push(bladeGeo);
    }

    const tuftGeo = BufferGeometryUtils.mergeGeometries(blades, false);
    this.createChunkedInstancedMeshes(tuftGeo, grassMat, transforms, false, 0x4d912c, true);
  }

  createProceduralBushes(transforms, bushMat) {
    const c1 = new THREE.DodecahedronGeometry(0.42, 1);
    c1.translate(0, 0.35, 0);
    const c2 = new THREE.DodecahedronGeometry(0.32, 1);
    c2.translate(0.25, 0.26, 0.18);
    const c3 = new THREE.DodecahedronGeometry(0.30, 1);
    c3.translate(-0.24, 0.25, -0.15);

    const bushGeo = BufferGeometryUtils.mergeGeometries([c1, c2, c3], false);
    this.createChunkedInstancedMeshes(bushGeo, bushMat, transforms, true, 0x396c28);
  }

  /**
   * Main per-frame vegetation update:
   * - Updates wind wave uniform.
   * - Executes throttled distance & forward-focused culling for chunks & grass.
   */
  update(time, playerPos = null, cameraForward = null) {
    if (this.windUniforms && this.windUniforms.uTime) {
      this.windUniforms.uTime.value = time;
    }

    if (!playerPos || !this.chunks || this.chunks.length === 0) return;

    this.cullTick = (this.cullTick || 0) + 1;
    if (this.cullTick % 4 !== 0) return; // Run culling checks at ~15Hz to save CPU

    const maxViewDist = this.cullingLimits.maxView;
    const maxGrassDist = this.cullingLimits.maxGrass;

    for (let i = 0; i < this.chunks.length; i++) {
      const chunk = this.chunks[i];
      const dx = chunk.centerX - playerPos.x;
      const dz = chunk.centerZ - playerPos.z;
      const dist = Math.hypot(dx, dz);

      let forwardBias = 1.0;
      if (cameraForward && dist > 1.0) {
        const dirX = dx / dist;
        const dirZ = dz / dist;
        const dot = dirX * cameraForward.x + dirZ * cameraForward.z;
        // Chunks in front get 1.35x distance allowance; chunks behind get reduced 0.55x
        forwardBias = dot > 0 ? 1.0 + dot * 0.35 : Math.max(0.45, 1.0 + dot * 0.55);
      }

      const effectiveMaxDist = maxViewDist * forwardBias;
      const hysteresis = chunk.visible ? 12 : -12;
      const shouldBeVisible = dist <= (effectiveMaxDist + hysteresis);

      if (chunk.visible !== shouldBeVisible) {
        chunk.visible = shouldBeVisible;
        chunk.group.visible = shouldBeVisible;
      }

      if (shouldBeVisible && chunk.grassMeshes.length > 0) {
        const grassHysteresis = chunk.grassVisible ? 8 : -8;
        const shouldShowGrass = dist <= (maxGrassDist * forwardBias + grassHysteresis);
        if (chunk.grassVisible !== shouldShowGrass) {
          chunk.grassVisible = shouldShowGrass;
          for (let g = 0; g < chunk.grassMeshes.length; g++) {
            chunk.grassMeshes[g].visible = shouldShowGrass;
          }
        }
      }
    }
  }

  dispose() {
    for (const mesh of this.instancedMeshes) {
      if (mesh.parent) mesh.parent.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(m => m.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    }
    for (const chunk of this.chunks) {
      this.scene.remove(chunk.group);
    }
    this.chunks = [];
    this.instancedMeshes = [];
    this.grassMeshes = [];
    this.treeFoliageMeshes = [];
  }
}
