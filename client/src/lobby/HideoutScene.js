import * as THREE from 'three';
import { CharacterModel } from '../entities/CharacterModel.js';

/**
 * HideoutScene - Realistic 3D Adventurer Safehouse / Hideout
 * Implements the full-body 3D character showcase, atmospheric cinematic lighting,
 * weathered walls, leather sofa, coffee table, crates, posters, glowing lantern,
 * exit door with red sign, and floor party slot circles matching reference.
 */
export class HideoutScene {
  constructor(canvas, initialUsername = 'Explorer') {
    this.canvas = canvas;
    this.username = initialUsername;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0c1117);
    this.scene.fog = new THREE.FogExp2(0x0c1117, 0.05);

    // Camera setup framed for full-body character
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(48, aspect, 0.1, 40);
    this.baseCamPos = new THREE.Vector3(0, 1.35, 3.25);
    this.camera.position.copy(this.baseCamPos);
    this.cameraTarget = new THREE.Vector3(0, 1.0, 0);
    this.camera.lookAt(this.cameraTarget);

    // Mouse parallax and character rotation state
    this.mouse = { x: 0, y: 0 };
    this.isDragging = false;
    this.characterRotationY = 0; // Face front towards camera (+Z)!
    this.targetCharacterRotY = 0;

    // Party slot floor circles
    this.partySlots = [];

    // Animated props & lights
    this.animatedProps = [];
    this.lanternLight = null;
    this.exitLight = null;

    this.initTextures();
    this.initLighting();
    this.initHideoutRoom();
    this.initFurnitureAndProps();
    this.initPartyFloorSlots();
    this.initCharacter();
    this.initInteractionListeners();
  }

  // --- PROCEDURAL TEXTURES ---
  initTextures() {
    this.textures = {};

    // 1. Concrete floor tiles with mortar seams
    const floorCanvas = document.createElement('canvas');
    floorCanvas.width = 512;
    floorCanvas.height = 512;
    const fCtx = floorCanvas.getContext('2d');
    fCtx.fillStyle = '#222831';
    fCtx.fillRect(0, 0, 512, 512);

    // Tiles (4x4 tiles in 512x512)
    const tileSize = 128;
    for (let x = 0; x < 512; x += tileSize) {
      for (let y = 0; y < 512; y += tileSize) {
        const shade = Math.floor(28 + Math.random() * 12);
        fCtx.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 5})`;
        fCtx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);

        // Grunge noise
        for (let i = 0; i < 40; i++) {
          const nx = x + Math.random() * tileSize;
          const ny = y + Math.random() * tileSize;
          fCtx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.04)';
          fCtx.fillRect(nx, ny, 3, 3);
        }
      }
    }
    // Mortar lines
    fCtx.strokeStyle = '#12161b';
    fCtx.lineWidth = 4;
    for (let i = 0; i <= 512; i += tileSize) {
      fCtx.beginPath();
      fCtx.moveTo(i, 0); fCtx.lineTo(i, 512);
      fCtx.stroke();
      fCtx.beginPath();
      fCtx.moveTo(0, i); fCtx.lineTo(512, i);
      fCtx.stroke();
    }
    const floorTex = new THREE.CanvasTexture(floorCanvas);
    floorTex.wrapS = THREE.RepeatWrapping;
    floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);
    this.textures.floor = floorTex;

    // 2. Weathered brick & plaster back wall texture
    const wallCanvas = document.createElement('canvas');
    wallCanvas.width = 512;
    wallCanvas.height = 512;
    const wCtx = wallCanvas.getContext('2d');
    wCtx.fillStyle = '#1c222a';
    wCtx.fillRect(0, 0, 512, 512);

    const bW = 64;
    const bH = 26;
    let row = 0;
    for (let y = 0; y < 512; y += bH) {
      const offset = (row % 2) * (bW / 2);
      for (let x = -bW; x < 512 + bW; x += bW) {
        const val = Math.floor(32 + Math.random() * 18);
        wCtx.fillStyle = `rgb(${val + 4}, ${val}, ${val - 2})`;
        wCtx.fillRect(x + offset + 2, y + 2, bW - 4, bH - 4);
      }
      row++;
    }
    // Plaster patches & grunge
    wCtx.fillStyle = 'rgba(15, 19, 24, 0.45)';
    wCtx.beginPath();
    wCtx.arc(140, 180, 120, 0, Math.PI * 2);
    wCtx.fill();
    wCtx.beginPath();
    wCtx.arc(380, 320, 150, 0, Math.PI * 2);
    wCtx.fill();

    const wallTex = new THREE.CanvasTexture(wallCanvas);
    wallTex.wrapS = THREE.RepeatWrapping;
    wallTex.wrapT = THREE.RepeatWrapping;
    wallTex.repeat.set(3, 2);
    this.textures.wall = wallTex;

    // 3. Wooden crate texture with stenciled "WL-EXP"
    const woodCanvas = document.createElement('canvas');
    woodCanvas.width = 256;
    woodCanvas.height = 256;
    const woodCtx = woodCanvas.getContext('2d');
    woodCtx.fillStyle = '#5c4033';
    woodCtx.fillRect(0, 0, 256, 256);
    // Planks
    for (let p = 0; p < 256; p += 64) {
      woodCtx.fillStyle = p % 128 === 0 ? '#4a3328' : '#523a2d';
      woodCtx.fillRect(0, p + 2, 256, 60);
      woodCtx.strokeStyle = '#2d1d16';
      woodCtx.lineWidth = 3;
      woodCtx.strokeRect(0, p + 2, 256, 60);
    }
    // Diagonal brace
    woodCtx.strokeStyle = '#38241c';
    woodCtx.lineWidth = 14;
    woodCtx.beginPath();
    woodCtx.moveTo(0, 0); woodCtx.lineTo(256, 256);
    woodCtx.stroke();
    // Stencil
    woodCtx.fillStyle = 'rgba(255,255,255,0.3)';
    woodCtx.font = 'bold 20px monospace';
    woodCtx.fillText('WL-EXP-01', 50, 140);

    const woodTex = new THREE.CanvasTexture(woodCanvas);
    this.textures.woodCrate = woodTex;

    // 4. Poster Textures
    this.textures.posterMap = this.createPosterTexture('MAP', 'WILDLANDS EXPLORATION', '#059669', '#10b981');
    this.textures.posterArt = this.createPosterTexture('ART', 'DEAD SECTOR / HIDE', '#dc2626', '#f59e0b');
    this.textures.posterInfo = this.createPosterTexture('INFO', 'SURVIVAL PROTOCOL', '#2563eb', '#60a5fa');
  }

  createPosterTexture(badge, title, col1, col2) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 360;
    const ctx = c.getContext('2d');

    const grad = ctx.createLinearGradient(0, 0, 256, 360);
    grad.addColorStop(0, '#111827');
    grad.addColorStop(0.5, '#1f2937');
    grad.addColorStop(1, '#0f172a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 360);

    // Weathered paper border
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 240, 344);

    // Graphic banner
    ctx.fillStyle = col1;
    ctx.fillRect(16, 24, 224, 140);
    ctx.fillStyle = col2;
    ctx.beginPath();
    ctx.arc(128, 94, 45, 0, Math.PI * 2);
    ctx.fill();

    // Badge
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(badge, 30, 52);

    // Title
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(title, 20, 200);

    // Stencil lines
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText('OUTPOST 04 // LIVING WORLD', 20, 230);
    ctx.fillText('COORD: 42.5N, 28.1E', 20, 250);
    ctx.fillText('SECURITY STATUS: HIGH', 20, 270);

    // Corner tape strips
    ctx.fillStyle = 'rgba(234, 179, 8, 0.4)';
    ctx.fillRect(0, 0, 34, 18);
    ctx.fillRect(222, 0, 34, 18);

    return new THREE.CanvasTexture(c);
  }

  // --- LIGHTING ---
  initLighting() {
    // 1. Ambient Light (cozy slate-blue fill)
    const ambient = new THREE.AmbientLight(0x222e3e, 1.2);
    this.scene.add(ambient);

    // 2. Character Key Spotlight (focused on player front)
    this.keySpotlight = new THREE.SpotLight(0xfff5ea, 4.2, 9, Math.PI / 4.2, 0.45, 0.8);
    this.keySpotlight.position.set(0, 3.2, 2.4);
    this.keySpotlight.target.position.set(0, 0.9, 0);
    this.keySpotlight.castShadow = true;
    this.keySpotlight.shadow.mapSize.width = 1024;
    this.keySpotlight.shadow.mapSize.height = 1024;
    this.keySpotlight.shadow.camera.near = 0.5;
    this.keySpotlight.shadow.camera.far = 8;
    this.keySpotlight.shadow.bias = -0.001;
    this.scene.add(this.keySpotlight);
    this.scene.add(this.keySpotlight.target);

    // 3. Front directional fill to light the character face and torso nicely
    const frontFill = new THREE.DirectionalLight(0xffeedb, 1.1);
    frontFill.position.set(0.4, 1.8, 3.2);
    this.scene.add(frontFill);

    // 4. Overhead Ceiling Fluorescent Light Fixture
    this.ceilingLight = new THREE.PointLight(0xdbeafe, 1.8, 8, 1.2);
    this.ceilingLight.position.set(0, 3.4, 0.2);
    this.scene.add(this.ceilingLight);

    // 5. Left Warm Lantern & Sconce Light (rich golden amber on sofa and floor)
    this.lanternLight = new THREE.PointLight(0xff9436, 3.2, 7.5, 1.3);
    this.lanternLight.position.set(-2.5, 1.3, -0.6);
    this.scene.add(this.lanternLight);

    // 6. Right Red Exit Sign Glow
    this.exitLight = new THREE.PointLight(0xef4444, 1.8, 4.5, 1.6);
    this.exitLight.position.set(3.8, 2.5, -1.9);
    this.scene.add(this.exitLight);

    // 7. Background wall soft teal/blue fill
    const backFill = new THREE.PointLight(0x38bdf8, 1.2, 7, 1.5);
    backFill.position.set(0, 2.6, -2.4);
    this.scene.add(backFill);
  }

  // --- HIDEOUT ROOM ARCHITECTURE ---
  initHideoutRoom() {
    const roomGroup = new THREE.Group();

    // Floor
    const floorGeo = new THREE.PlaneGeometry(12, 9);
    const floorMat = new THREE.MeshStandardMaterial({
      map: this.textures.floor,
      roughness: 0.65,
      metalness: 0.15
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, 0);
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // Back Wall (Z = -3.2)
    const backWallGeo = new THREE.PlaneGeometry(12, 4.2);
    const backWallMat = new THREE.MeshStandardMaterial({
      map: this.textures.wall,
      roughness: 0.85,
      color: 0x333b45
    });
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, 2.1, -3.2);
    backWall.receiveShadow = true;
    roomGroup.add(backWall);

    // Left Wall (X = -5.5)
    const leftWallGeo = new THREE.PlaneGeometry(9, 4.2);
    const sideWallMat = new THREE.MeshStandardMaterial({
      color: 0x222a33,
      roughness: 0.9
    });
    const leftWall = new THREE.Mesh(leftWallGeo, sideWallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-5.5, 2.1, 0);
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Right Wall (X = +5.5)
    const rightWall = new THREE.Mesh(leftWallGeo, sideWallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(5.5, 2.1, 0);
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Ceiling with exposed iron girders (Y = 3.8)
    const ceilingGeo = new THREE.PlaneGeometry(12, 9);
    const ceilingMat = new THREE.MeshStandardMaterial({ color: 0x11161d, roughness: 0.95 });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 3.8, 0);
    roomGroup.add(ceiling);

    // Exposed Iron I-Beams running across ceiling
    const beamMat = new THREE.MeshStandardMaterial({ color: 0x1f242c, metalness: 0.7, roughness: 0.4 });
    for (let bz = -2.5; bz <= 2.5; bz += 1.8) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(11.8, 0.18, 0.16), beamMat);
      beam.position.set(0, 3.7, bz);
      roomGroup.add(beam);
    }

    // Suspended industrial fluorescent light fixture
    const fixtureMat = new THREE.MeshStandardMaterial({ color: 0x2e3846, metalness: 0.6 });
    const fixtureBody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.24), fixtureMat);
    fixtureBody.position.set(0, 3.45, 0.2);

    // Glowing fluorescent tube
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe });
    const tubeMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 12), tubeMat);
    tubeMesh.rotation.z = Math.PI / 2;
    tubeMesh.position.set(0, 3.4, 0.2);
    roomGroup.add(fixtureBody, tubeMesh);

    // Hanging cables for lamp
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const cable1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.35), cableMat);
    cable1.position.set(-1.0, 3.62, 0.2);
    const cable2 = cable1.clone();
    cable2.position.set(1.0, 3.62, 0.2);
    roomGroup.add(cable1, cable2);

    this.scene.add(roomGroup);
  }

  // --- FURNITURE & PROPS (MATCHING REFERENCE SCREENSHOT) ---
  initFurnitureAndProps() {
    const propsGroup = new THREE.Group();

    // 1. LEATHER SOFA ON THE LEFT (-2.8, 0, -0.7)
    const sofa = this.createLeatherSofa();
    sofa.position.set(-2.7, 0, -0.65);
    sofa.rotation.y = 0.26; // angled nicely toward center
    propsGroup.add(sofa);

    // 2. COFFEE TABLE IN FRONT OF SOFA (-1.95, 0, 0.3)
    const table = this.createCoffeeTable();
    table.position.set(-1.9, 0, 0.25);
    table.rotation.y = 0.22;
    propsGroup.add(table);

    // 3. STACK OF WOODEN SUPPLY CRATES (-3.6, 0, -1.8)
    const crates = this.createCrateStack();
    crates.position.set(-3.6, 0, -1.7);
    propsGroup.add(crates);

    // 4. WARM LANTERN ON TOP OF CRATE
    const lantern = this.createWarmLantern();
    lantern.position.set(-2.55, 1.05, -0.7);
    propsGroup.add(lantern);

    // 5. POTTED PLANT
    const plant = this.createPottedPlant();
    plant.position.set(-1.6, 0, -1.4);
    propsGroup.add(plant);

    // 6. METAL UTILITY WIRE SHELVING RACK IN BACKGROUND (0, 0, -2.7)
    const shelf = this.createUtilityShelf();
    shelf.position.set(-0.2, 0, -2.8);
    propsGroup.add(shelf);

    // 7. DESK & RETRO RED CHAIR IN BACKGROUND
    const deskChair = this.createDeskAndChair();
    deskChair.position.set(-1.0, 0, -2.4);
    propsGroup.add(deskChair);

    // 8. WALL POSTERS ON BACK WALL & LEFT WALL
    this.createPosters(propsGroup);

    // 9. REINFORCED METAL EXIT DOOR ON RIGHT WALL WITH RED EXIT SIGN
    const exitDoor = this.createExitDoor();
    exitDoor.position.set(3.8, 0, -2.0);
    propsGroup.add(exitDoor);

    // 10. STACK OF CARDBOARD BOXES & STORAGE CRATES ON THE RIGHT
    const rightBoxes = this.createRightStorageStack();
    rightBoxes.position.set(2.8, 0, -1.2);
    propsGroup.add(rightBoxes);

    // 11. ROLLED CAMPING RUG & MATTRESS ON FLOOR RIGHT
    const mattress = this.createMattressAndRug();
    mattress.position.set(2.2, 0, 0.9);
    propsGroup.add(mattress);

    this.scene.add(propsGroup);
  }

  // --- INDIVIDUAL PROP BUILDERS ---
  createLeatherSofa() {
    const group = new THREE.Group();
    const leatherMat = new THREE.MeshStandardMaterial({
      color: 0x221c17,
      roughness: 0.45,
      metalness: 0.1
    });
    const cushionMat = new THREE.MeshStandardMaterial({
      color: 0x2d241d,
      roughness: 0.55
    });

    // Sofa Base
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.32, 0.85), leatherMat);
    base.position.y = 0.22;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // Seat cushions
    for (let c = -0.45; c <= 0.45; c += 0.45) {
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.65), cushionMat);
      cushion.position.set(c, 0.42, 0.05);
      cushion.castShadow = true;
      group.add(cushion);
    }

    // Backrest
    const backrest = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 0.22), leatherMat);
    backrest.position.set(0, 0.62, -0.36);
    backrest.castShadow = true;
    group.add(backrest);

    // Left & Right Armrests
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.85), leatherMat);
    leftArm.position.set(-0.85, 0.45, 0);
    leftArm.castShadow = true;
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.85;
    group.add(leftArm, rightArm);

    // Wooden legs
    const legMat = new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.7 });
    for (const lx of [-0.75, 0.75]) {
      for (const lz of [-0.35, 0.35]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.02, 0.14), legMat);
        leg.position.set(lx, 0.07, lz);
        group.add(leg);
      }
    }

    return group;
  }

  createCoffeeTable() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.6 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.3 });

    // Tabletop
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.04, 0.5), woodMat);
    top.position.y = 0.38;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    // Metal legs
    for (const lx of [-0.4, 0.4]) {
      for (const lz of [-0.2, 0.2]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.38), metalMat);
        leg.position.set(lx, 0.19, lz);
        group.add(leg);
      }
    }

    // Open Laptop on table
    const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.015, 0.17), metalMat);
    laptopBase.position.set(-0.15, 0.41, 0.0);
    laptopBase.castShadow = true;

    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.01), screenMat);
    laptopScreen.position.set(-0.15, 0.49, -0.08);
    laptopScreen.rotation.x = -0.15;
    group.add(laptopBase, laptopScreen);

    // Coffee mug
    const mugMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 });
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.08, 12), mugMat);
    mug.position.set(0.2, 0.44, 0.08);
    mug.castShadow = true;
    group.add(mug);

    // Tactical Folder / Notebook
    const folderMat = new THREE.MeshStandardMaterial({ color: 0xb45309 });
    const folder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.01, 0.24), folderMat);
    folder.position.set(0.15, 0.41, -0.06);
    folder.rotation.y = 0.35;
    group.add(folder);

    return group;
  }

  createCrateStack() {
    const group = new THREE.Group();
    const crateMat = new THREE.MeshStandardMaterial({
      map: this.textures.woodCrate,
      roughness: 0.75
    });

    // Crate 1 (bottom left)
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), crateMat);
    c1.position.set(0, 0.375, 0);
    c1.castShadow = true;
    c1.receiveShadow = true;

    // Crate 2 (bottom right)
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), crateMat);
    c2.position.set(0.65, 0.35, -0.1);
    c2.rotation.y = 0.15;
    c2.castShadow = true;
    c2.receiveShadow = true;

    // Crate 3 (stacked on top)
    const c3 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), crateMat);
    c3.position.set(0.15, 1.05, -0.05);
    c3.rotation.y = -0.1;
    c3.castShadow = true;
    c3.receiveShadow = true;

    group.add(c1, c2, c3);
    return group;
  }

  createWarmLantern() {
    const group = new THREE.Group();
    const brassMat = new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.8, roughness: 0.3 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.05, 12), brassMat);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.16, 12), glassMat);
    glass.position.y = 0.1;
    const topCap = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.08, 12), brassMat);
    topCap.position.y = 0.22;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 16), brassMat);
    handle.position.y = 0.28;

    group.add(base, glass, topCap, handle);
    return group;
  }

  createPottedPlant() {
    const group = new THREE.Group();
    const potMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.5 });

    // Terracotta pot
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.32, 16), potMat);
    pot.position.y = 0.16;
    pot.castShadow = true;
    group.add(pot);

    // Leaves
    for (let i = 0; i < 9; i++) {
      const angle = (i / 9) * Math.PI * 2;
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.015, 0.35), leafMat);
      leaf.position.set(Math.sin(angle) * 0.1, 0.34 + Math.sin(i) * 0.04, Math.cos(angle) * 0.1);
      leaf.rotation.y = angle;
      leaf.rotation.x = 0.45;
      group.add(leaf);
    }

    return group;
  }

  createUtilityShelf() {
    const group = new THREE.Group();
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.3 });

    // 4 vertical struts
    for (const sx of [-0.6, 0.6]) {
      for (const sz of [-0.2, 0.2]) {
        const strut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.2, 0.04), metalMat);
        strut.position.set(sx, 1.1, sz);
        group.add(strut);
      }
    }

    // 4 wire shelves
    for (let y = 0.3; y <= 2.1; y += 0.55) {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.03, 0.44), metalMat);
      shelf.position.set(0, y, 0);
      shelf.castShadow = true;
      group.add(shelf);

      // Add gear on shelf
      if (y < 1.0) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.25), boxMat);
        box.position.set(-0.25, y + 0.11, 0);
        group.add(box);
      } else if (y < 1.6) {
        // Radio comm box with antenna
        const radio = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.18), new THREE.MeshStandardMaterial({ color: 0x1e293b }));
        radio.position.set(0.2, y + 0.09, 0);
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.4), metalMat);
        ant.position.set(0.3, y + 0.3, 0.05);
        group.add(radio, ant);
      }
    }

    return group;
  }

  createDeskAndChair() {
    const group = new THREE.Group();
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.8 });

    // Small table
    const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.04, 0.45), woodMat);
    tableTop.position.set(0, 0.72, 0);
    group.add(tableTop);
    for (const lx of [-0.3, 0.3]) {
      for (const lz of [-0.18, 0.18]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.72), metalMat);
        leg.position.set(lx, 0.36, lz);
        group.add(leg);
      }
    }

    // Vintage monitor with green screen glow
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.18), metalMat);
    monitor.position.set(0, 0.85, 0);
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.16), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
    screen.position.set(0, 0.85, 0.095);
    group.add(monitor, screen);

    // Retro red chair
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), redMat);
    seat.position.set(0, 0.45, 0.4);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.32, 0.04), redMat);
    back.position.set(0, 0.68, 0.58);
    for (const cx of [-0.15, 0.15]) {
      for (const cz of [0.25, 0.55]) {
        const cleg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45), metalMat);
        cleg.position.set(cx, 0.225, cz);
        group.add(cleg);
      }
    }
    group.add(seat, back);

    return group;
  }

  createPosters(group) {
    const posterMatMap = new THREE.MeshBasicMaterial({ map: this.textures.posterMap });
    const posterMatArt = new THREE.MeshBasicMaterial({ map: this.textures.posterArt });
    const posterMatInfo = new THREE.MeshBasicMaterial({ map: this.textures.posterInfo });

    // Poster 1: Back wall left (Art)
    const p1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.25), posterMatArt);
    p1.position.set(-1.8, 2.2, -3.18);
    group.add(p1);

    // Poster 2: Back wall center-right (Map)
    const p2 = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.85), posterMatMap);
    p2.position.set(1.4, 2.3, -3.18);
    group.add(p2);

    // Poster 3: Left wall (Info)
    const p3 = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1.1), posterMatInfo);
    p3.rotation.y = Math.PI / 2;
    p3.position.set(-5.48, 2.1, -1.0);
    group.add(p3);
  }

  createExitDoor() {
    const group = new THREE.Group();
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.6 });
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.8, roughness: 0.4 });

    // Door frame
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.3, 0.08), doorMat);
    door.position.set(0, 1.15, 0);
    door.castShadow = true;

    // Steel push bar
    const barMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.8 });
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9), barMat);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.1, 0.06);
    group.add(door, bar);

    // Glowing Red EXIT Sign above door
    const signBox = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.1), frameMat);
    signBox.position.set(0, 2.45, 0.04);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128; signCanvas.height = 64;
    const sCtx = signCanvas.getContext('2d');
    sCtx.fillStyle = '#dc2626';
    sCtx.fillRect(0, 0, 128, 64);
    sCtx.fillStyle = '#ffffff';
    sCtx.font = 'bold 30px monospace';
    sCtx.textAlign = 'center';
    sCtx.fillText('EXIT', 64, 44);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signFace = new THREE.Mesh(new THREE.PlaneGeometry(0.46, 0.18), new THREE.MeshBasicMaterial({ map: signTex }));
    signFace.position.set(0, 2.45, 0.095);
    group.add(signBox, signFace);

    return group;
  }

  createRightStorageStack() {
    const group = new THREE.Group();
    const cardMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.9 });
    const crateMat = new THREE.MeshStandardMaterial({ map: this.textures.woodCrate, roughness: 0.7 });

    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), crateMat);
    c1.position.set(0, 0.4, 0);
    c1.castShadow = true;
    group.add(c1);

    const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.55), cardMat);
    b1.position.set(0.1, 1.05, 0.05);
    b1.rotation.y = 0.2;
    b1.castShadow = true;
    group.add(b1);

    const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.5), cardMat);
    b2.position.set(-0.65, 0.2, 0.2);
    b2.rotation.y = -0.15;
    group.add(b2);

    return group;
  }

  createMattressAndRug() {
    const group = new THREE.Group();
    const matMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 });

    // Sleeping mat on floor
    const pad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.08, 0.8), matMat);
    pad.position.set(0, 0.04, 0);
    pad.rotation.y = 0.35;
    pad.receiveShadow = true;

    // Pillow
    const pillow = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.5), pillowMat);
    pillow.position.set(0.55, 0.09, -0.2);
    pillow.rotation.y = 0.35;

    group.add(pad, pillow);
    return group;
  }

  // --- FLOOR PARTY SLOT CIRCLES (MATCHING SCREENSHOT) ---
  initPartyFloorSlots() {
    const positions = [
      { x: -1.45, z: 0.25 },
      { x: 1.45, z: 0.25 }
    ];

    for (const pos of positions) {
      const slotGroup = new THREE.Group();
      slotGroup.position.set(pos.x, 0.015, pos.z);

      // 1. Glowing outer ring
      const ringCanvas = document.createElement('canvas');
      ringCanvas.width = 256; ringCanvas.height = 256;
      const rCtx = ringCanvas.getContext('2d');
      rCtx.strokeStyle = '#34d399';
      rCtx.lineWidth = 14;
      rCtx.setLineDash([28, 14]);
      rCtx.beginPath();
      rCtx.arc(128, 128, 110, 0, Math.PI * 2);
      rCtx.stroke();

      const ringTex = new THREE.CanvasTexture(ringCanvas);
      const ringMat = new THREE.MeshBasicMaterial({
        map: ringTex,
        transparent: true,
        opacity: 0.85,
        depthWrite: false
      });
      const ringMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), ringMat);
      ringMesh.rotation.x = -Math.PI / 2;
      slotGroup.add(ringMesh);

      // 2. Floating 3D '+' Icon
      const plusCanvas = document.createElement('canvas');
      plusCanvas.width = 128; plusCanvas.height = 128;
      const pCtx = plusCanvas.getContext('2d');
      pCtx.fillStyle = '#34d399';
      pCtx.fillRect(52, 20, 24, 88);
      pCtx.fillRect(20, 52, 88, 24);

      const plusTex = new THREE.CanvasTexture(plusCanvas);
      const plusMat = new THREE.SpriteMaterial({ map: plusTex, transparent: true, opacity: 0.9 });
      const plusSprite = new THREE.Sprite(plusMat);
      plusSprite.position.set(0, 0.85, 0);
      plusSprite.scale.set(0.35, 0.35, 1);
      slotGroup.add(plusSprite);

      this.scene.add(slotGroup);
      this.partySlots.push({ group: slotGroup, ring: ringMesh, sprite: plusSprite });
    }
  }

  // --- CHARACTER SHOWCASE ---
  initCharacter() {
    this.characterGroup = new THREE.Group();
    this.characterGroup.position.set(0, 0, 0);
    this.characterGroup.rotation.y = this.characterRotationY;

    // Contact shadow plane directly under player shoes
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128; shadowCanvas.height = 128;
    const sCtx = shadowCanvas.getContext('2d');
    const radGrad = sCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    radGrad.addColorStop(0, 'rgba(0,0,0,0.75)');
    radGrad.addColorStop(0.5, 'rgba(0,0,0,0.4)');
    radGrad.addColorStop(1, 'rgba(0,0,0,0)');
    sCtx.fillStyle = radGrad;
    sCtx.fillRect(0, 0, 128, 128);

    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.8,
      depthWrite: false
    });
    const shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.set(0, 0.008, 0);
    this.scene.add(shadowMesh);

    // Instantiate Character Model
    this.character = new CharacterModel(this.username, '#34d399');
    // Hide giant billboard sprite nameplate inside hideout so it doesn't obstruct player head
    if (this.character.nodes && this.character.nodes.nameplate) {
      this.character.nodes.nameplate.visible = false;
    }
    this.characterGroup.add(this.character.group);

    this.scene.add(this.characterGroup);
  }

  updateUsername(name) {
    this.username = name;
  }

  // --- INTERACTION & MOUSE LOOK ---
  initInteractionListeners() {
    window.addEventListener('mousemove', (e) => {
      // Normalized mouse coords [-1 to 1]
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      if (this.isDragging) {
        const deltaX = e.clientX - this.prevMouseX;
        this.targetCharacterRotY += deltaX * 0.012;
        this.prevMouseX = e.clientX;
      }
    });

    window.addEventListener('mousedown', (e) => {
      // Drag in center area to spin character
      if (Math.abs(this.mouse.x) < 0.4 && e.clientY > 80 && e.clientY < window.innerHeight - 80) {
        this.isDragging = true;
        this.prevMouseX = e.clientX;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Touch support for mobile dragging
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1 && this.isDragging) {
        const deltaX = e.touches[0].clientX - this.prevMouseX;
        this.targetCharacterRotY += deltaX * 0.012;
        this.prevMouseX = e.touches[0].clientX;
      }
    }, { passive: true });

    window.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        const touchX = (e.touches[0].clientX / window.innerWidth) * 2 - 1;
        if (Math.abs(touchX) < 0.45) {
          this.isDragging = true;
          this.prevMouseX = e.touches[0].clientX;
        }
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      this.isDragging = false;
    });
  }

  onResize(width, height) {
    const aspect = width / Math.max(1, height);
    this.camera.aspect = aspect;

    if (aspect < 1.0) {
      // Portrait mode (e.g. 390x844): Frame character in upper viewport
      this.camera.fov = 50;
      this.baseCamPos.set(0, 1.45, 3.75);
      this.cameraTarget.set(0, 1.25, 0);
    } else if (height <= 450) {
      // Compact landscape phone (e.g. 844x390, 740x360): Keep full character centered
      this.camera.fov = 46;
      this.baseCamPos.set(0, 1.22, 3.4);
      this.cameraTarget.set(0, 0.95, 0);
    } else {
      // Standard desktop / tablet landscape
      this.camera.fov = 48;
      this.baseCamPos.set(0, 1.35, 3.25);
      this.cameraTarget.set(0, 1.0, 0);
    }

    this.camera.position.copy(this.baseCamPos);
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
  }

  update(dt, elapsedTime) {
    // 1. Advance Character idle animation
    if (this.character) {
      this.character.updateAnimation('idle', 1.0, dt);
    }

    // 2. Smooth character rotation damping
    if (!this.isDragging) {
      // When not dragging, character faces front towards camera (+Z) and looks slightly with cursor
      const lookOffset = -this.mouse.x * 0.28;
      this.characterRotationY += (lookOffset - this.characterRotationY) * (dt * 3.5);
    } else {
      this.characterRotationY += (this.targetCharacterRotY - this.characterRotationY) * (dt * 12.0);
    }
    if (this.characterGroup) {
      this.characterGroup.rotation.y = this.characterRotationY;
    }

    // 3. Subtle camera parallax tracking
    const targetCamX = this.baseCamPos.x + this.mouse.x * 0.12;
    const targetCamY = this.baseCamPos.y + this.mouse.y * 0.08;
    this.camera.position.x += (targetCamX - this.camera.position.x) * (dt * 4.0);
    this.camera.position.y += (targetCamY - this.camera.position.y) * (dt * 4.0);
    this.camera.lookAt(this.cameraTarget);

    // 4. Subtle lantern light flicker
    if (this.lanternLight) {
      this.lanternLight.intensity = 2.5 + Math.sin(elapsedTime * 6.0) * 0.15 + Math.cos(elapsedTime * 14.0) * 0.08;
    }

    // 5. Party slots gentle bobbing & pulse
    for (const slot of this.partySlots) {
      slot.sprite.position.y = 0.85 + Math.sin(elapsedTime * 2.5) * 0.04;
      slot.ring.rotation.z += dt * 0.35;
    }
  }
}
