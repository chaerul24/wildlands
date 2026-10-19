import * as THREE from 'three';
import { SimplexNoise } from '../utils/Noise.js';

const sharedNoise = new SimplexNoise(42);

export function getTerrainHeight(x, z) {
  const distFromOrigin = Math.sqrt(x * x + z * z);

  // Valley mask: flat & walkable near center (radius 0..60m)
  const valleyFactor = Math.min(1.0, Math.max(0.0, (distFromOrigin - 35) / 70));

  // Road carving: path from outpost (0,0) curving towards (+120, -100) and (-100, 150)
  const roadX1 = Math.sin(z * 0.02) * 25 + Math.cos(z * 0.01) * 15;
  const roadDist = Math.abs(x - roadX1);
  const roadInfluence = Math.exp(-(roadDist * roadDist) / (8 * 8));

  // Base rolling hills
  const hills = sharedNoise.fbm(x * 0.008, z * 0.008, 4, 0.5, 2.0) * 14.0;

  // Distant mountain rim (distance > 130m)
  const mountainFactor = Math.max(0.0, (distFromOrigin - 130) / 100);
  const mountains = sharedNoise.fbm(x * 0.015, z * 0.015, 5, 0.55, 2.1) * 55.0 * Math.min(mountainFactor, 1.6);

  // Micro details
  const micro = sharedNoise.noise2D(x * 0.05, z * 0.05) * 1.2;

  let height = (hills * valleyFactor) + mountains + (micro * valleyFactor);

  // Flatten road
  height = height * (1.0 - roadInfluence * 0.7);

  return height;
}

export class Terrain {
  constructor(scene, size = 600, segments = 160) {
    this.scene = scene;
    this.size = size;
    this.segments = segments;
    this.mesh = null;
    this.geometry = null;

    // Fast reusable raycaster for precision surface triangulation
    this.raycaster = new THREE.Raycaster();
    this.downVector = new THREE.Vector3(0, -1, 0);
    this.rayOrigin = new THREE.Vector3();

    this.init();
  }

  getHeightAt(x, z) {
    return getTerrainHeight(x, z);
  }

  getSurfaceHeight(x, z, hintY = null) {
    if (this.mesh) {
      const startY = (hintY !== null) ? Math.max(hintY + 4.0, 60.0) : 100.0;
      this.rayOrigin.set(x, startY, z);
      this.raycaster.set(this.rayOrigin, this.downVector);
      this.raycaster.far = 180;

      const hits = this.raycaster.intersectObject(this.mesh, false);
      if (hits.length > 0) {
        return hits[0].point.y;
      }
    }
    return getTerrainHeight(x, z);
  }

  isRoadAt(x, z) {
    const roadX1 = Math.sin(z * 0.02) * 25 + Math.cos(z * 0.01) * 15;
    const roadDist = Math.abs(x - roadX1);
    return roadDist < 5.0;
  }

  createGroundNormalMap() {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        const nx = (x / size) * 24.0;
        const ny = (y / size) * 24.0;

        // Multi-frequency organic ground bump
        const h1 = Math.sin(nx * 3.14) * Math.cos(ny * 3.14) * 0.35;
        const h2 = Math.sin(nx * 7.7 + ny * 6.3) * 0.18;
        const h3 = (Math.random() - 0.5) * 0.12;

        const dx = (Math.cos(nx * 3.14) * 0.35 * 3.14 + Math.cos(nx * 7.7) * 0.18 * 7.7) * 0.35;
        const dy = (-Math.sin(ny * 3.14) * 0.35 * 3.14 + Math.cos(ny * 6.3) * 0.18 * 6.3) * 0.35;

        const normX = Math.max(-1, Math.min(1, dx));
        const normY = Math.max(-1, Math.min(1, dy));
        const normZ = Math.sqrt(Math.max(0.05, 1 - normX * normX - normY * normY));

        data[idx] = Math.floor((normX * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.floor((normY * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.floor(normZ * 255);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(60, 60);
    return texture;
  }

  createGroundRoughnessMap() {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let i = 0; i < size * size * 4; i += 4) {
      const val = 180 + Math.floor(Math.random() * 65);
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
      data[i + 3] = 255;
    }

    ctx.putImageData(imgData, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(60, 60);
    return texture;
  }

  init() {
    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    this.geometry.rotateX(-Math.PI / 2);

    const positions = this.geometry.attributes.position;
    const count = positions.count;
    const colors = new Float32Array(count * 3);

    // Natural PBR color palette for blending
    const grassColor = new THREE.Color(0x72a84a);       // Vibrant sunny green
    const grassDarkColor = new THREE.Color(0x4a7330);   // Rich forest meadow green
    const dirtRoadColor = new THREE.Color(0x8a6a4a);    // Warm earth soil
    const rockColor = new THREE.Color(0x6e7276);        // Weathered granite rock
    const highRockColor = new THREE.Color(0x4d5257);    // Dark slate rock
    const snowColor = new THREE.Color(0xf1f5f9);        // Alpine snow peaks

    const vertex = new THREE.Vector3();
    const normal = new THREE.Vector3();

    // 1. Set heights
    for (let i = 0; i < count; i++) {
      vertex.fromBufferAttribute(positions, i);
      const h = this.getHeightAt(vertex.x, vertex.z);
      positions.setY(i, h);
    }

    this.geometry.computeVertexNormals();
    const normals = this.geometry.attributes.normal;

    // 2. Vertex Color generation based on height, slope and road mask
    for (let i = 0; i < count; i++) {
      vertex.fromBufferAttribute(positions, i);
      normal.fromBufferAttribute(normals, i);

      const h = vertex.y;
      const slope = 1.0 - Math.max(0, normal.y); // 0 is flat ground, 1 is vertical cliff
      const isRoad = this.isRoadAt(vertex.x, vertex.z);

      let finalColor = new THREE.Color();

      if (h > 42.0) {
        finalColor.copy(snowColor);
      } else if (h > 26.0 || slope > 0.45) {
        const blend = (h - 26.0) / 16.0;
        finalColor.lerpColors(rockColor, highRockColor, Math.min(1.0, blend));
      } else if (isRoad) {
        // Natural dirt path with edge variation
        finalColor.copy(dirtRoadColor);
        const roadEdge = (Math.abs(vertex.x) % 2.0) * 0.1;
        finalColor.offsetHSL(0, 0, roadEdge - 0.05);
      } else {
        // Lush grass with natural organic patches
        const noiseVar = sharedNoise.noise2D(vertex.x * 0.08, vertex.z * 0.08) * 0.5 + 0.5;
        finalColor.lerpColors(grassDarkColor, grassColor, noiseVar);

        if (slope > 0.22) {
          finalColor.lerp(dirtRoadColor, (slope - 0.22) * 2.8);
        }
      }

      colors[i * 3] = finalColor.r;
      colors[i * 3 + 1] = finalColor.g;
      colors[i * 3 + 2] = finalColor.b;
    }

    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // High quality photographic grass texture with 16x anisotropic filtering
    const textureLoader = new THREE.TextureLoader();
    const diffuseMap = textureLoader.load('/grass_diffuse.jpg', (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(38, 38);
      tex.anisotropy = 16;
      tex.needsUpdate = true;
    });

    // Clean, high quality PBR Terrain Material without artificial grid lines
    const material = new THREE.MeshStandardMaterial({
      map: diffuseMap,
      roughness: 0.88,
      metalness: 0.02,
      vertexColors: true,
      flatShading: false
    });

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'TerrainMesh';
    this.scene.add(this.mesh);
  }
}
