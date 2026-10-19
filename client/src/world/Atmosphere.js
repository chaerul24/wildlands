import * as THREE from 'three';

export class Atmosphere {
  constructor(scene, qualityPreset = 'medium') {
    this.scene = scene;
    this.qualityPreset = qualityPreset;

    this.sunLight = null;
    this.ambientLight = null;
    this.skyDome = null;

    this.init();
  }

  init() {
    // 1. Atmospheric Fog (matches horizon color for seamless mountain fade)
    const fogColor = new THREE.Color(0xb9d5e9);
    this.scene.background = fogColor;
    this.scene.fog = new THREE.FogExp2(fogColor, 0.0035);

    // 2. Ambient Hemisphere Light (Sky cool blue + Ground warm meadow bounce)
    this.ambientLight = new THREE.HemisphereLight(0xdbeafe, 0x47553b, 0.75);
    this.scene.add(this.ambientLight);

    // 3. Directional Sun
    this.sunLight = new THREE.DirectionalLight(0xfff8e7, 1.45);
    this.sunLight.position.set(120, 160, 80);
    this.sunLight.castShadow = true;

    // Configure Shadow Quality based on preset
    let shadowMapSize = 2048;
    if (this.qualityPreset === 'low') {
      shadowMapSize = 1024;
      this.sunLight.castShadow = false; // Disable shadows on low for max performance
    } else if (this.qualityPreset === 'high') {
      shadowMapSize = 4096;
    }

    this.sunLight.shadow.mapSize.width = shadowMapSize;
    this.sunLight.shadow.mapSize.height = shadowMapSize;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 380;

    const shadowFrustum = 90;
    this.sunLight.shadow.camera.left = -shadowFrustum;
    this.sunLight.shadow.camera.right = shadowFrustum;
    this.sunLight.shadow.camera.top = shadowFrustum;
    this.sunLight.shadow.camera.bottom = -shadowFrustum;
    this.sunLight.shadow.bias = -0.0001;
    this.sunLight.shadow.normalBias = 0.05;

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // 4. Sky Dome with atmospheric gradient
    this.createSkyDome();
  }

  createSkyDome() {
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      uniform float offset;
      uniform float exponent;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition + offset).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
      }
    `;

    const uniforms = {
      topColor: { value: new THREE.Color(0x3b82f6) }, // Vibrant blue zenith
      bottomColor: { value: new THREE.Color(0xb9d5e9) }, // Horizon haze
      offset: { value: 33 },
      exponent: { value: 0.6 }
    };

    const skyGeo = new THREE.SphereGeometry(650, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms,
      side: THREE.BackSide,
      depthWrite: false
    });

    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);
  }

  /**
   * Keep directional shadow coverage focused around player position
   */
  update(playerPosition) {
    if (!playerPosition) return;

    if (this.sunLight) {
      this.sunLight.position.set(
        playerPosition.x + 90,
        playerPosition.y + 130,
        playerPosition.z + 70
      );
      this.sunLight.target.position.copy(playerPosition);
      this.sunLight.target.updateMatrixWorld();
    }

    if (this.skyDome) {
      this.skyDome.position.copy(playerPosition);
    }
  }

  setQuality(preset) {
    this.qualityPreset = preset;
    if (preset === 'low') {
      this.sunLight.castShadow = false;
    } else {
      this.sunLight.castShadow = true;
      const size = preset === 'high' ? 4096 : 2048;
      this.sunLight.shadow.mapSize.set(size, size);
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null;
      }
    }
  }
}
