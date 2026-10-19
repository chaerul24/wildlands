import * as THREE from 'three';
import { RPG_LOOT_TABLES, RPG_ITEMS } from './RPGConfig.js';

export class LootDrop {
  constructor(scene, position, lootData, onLooted) {
    this.scene = scene;
    this.position = position.clone();
    this.lootData = lootData; // { gold: number, items: [{ itemId, count }] }
    this.onLooted = onLooted;
    this.isLooted = false;
    this.age = 0;

    // 3D Visual Group
    this.group = new THREE.Group();
    this.group.position.copy(this.position);

    this.createVisuals();
    this.scene.add(this.group);
  }

  createVisuals() {
    // 1. Treasure Satchel / Chest Core
    const coreGeo = new THREE.DodecahedronGeometry(0.32, 1);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      metalness: 0.8
    });
    this.coreMesh = new THREE.Mesh(coreGeo, coreMat);
    this.coreMesh.position.y = 0.45;
    this.coreMesh.castShadow = true;
    this.group.add(this.coreMesh);

    // 2. Rotating Radiant Halo Ring
    const ringGeo = new THREE.TorusGeometry(0.55, 0.04, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.8
    });
    this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
    this.ringMesh.position.y = 0.45;
    this.ringMesh.rotation.x = Math.PI / 2;
    this.group.add(this.ringMesh);

    // 3. Golden Point Light
    this.light = new THREE.PointLight(0xfbbf24, 1.2, 5.0);
    this.light.position.set(0, 0.6, 0);
    this.group.add(this.light);

    // 4. Floating 3D Text Billboard
    this.createSprite();
  }

  createSprite() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Rounded background pill
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(10, 8, 236, 48, 12);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef08a';
    ctx.fillText('✨ [E] Rampasan', 128, 40);

    this.spriteTex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: this.spriteTex,
      transparent: true,
      depthTest: false
    });
    this.sprite = new THREE.Sprite(spriteMat);
    this.sprite.position.set(0, 1.15, 0);
    this.sprite.scale.set(1.4, 0.35, 1);
    this.group.add(this.sprite);
  }

  update(dt, playerPos) {
    if (this.isLooted) return;
    this.age += dt;

    // Bobbing & rotation
    const bob = Math.sin(this.age * 2.8) * 0.08;
    this.coreMesh.position.y = 0.45 + bob;
    this.coreMesh.rotation.y += dt * 1.5;
    this.ringMesh.position.y = 0.45 + bob;
    this.ringMesh.rotation.z += dt * 2.0;

    // Light pulsing
    this.light.intensity = 1.0 + Math.sin(this.age * 3.5) * 0.3;
  }

  collect() {
    if (this.isLooted) return null;
    this.isLooted = true;

    // Remove from scene
    this.scene.remove(this.group);
    if (this.spriteTex) this.spriteTex.dispose();

    if (this.onLooted) {
      this.onLooted(this.lootData);
    }
    return this.lootData;
  }

  destroy() {
    this.isLooted = true;
    this.scene.remove(this.group);
    if (this.spriteTex) this.spriteTex.dispose();
  }
}

export class LootManager {
  constructor(scene, inventoryManager, lobbyData = null, combatAudio = null) {
    this.scene = scene;
    this.inventory = inventoryManager;
    this.lobbyData = lobbyData;
    this.audio = combatAudio;
    this.lootDrops = [];
    this.activePromptDrop = null;
    this.onLootCollected = null; // Callback for quest progress
  }

  spawnLootFromTable(tableId, position) {
    const table = RPG_LOOT_TABLES[tableId];
    if (!table) return null;

    // 1. Calculate gold
    const gold = Math.floor(table.goldMin + Math.random() * (table.goldMax - table.goldMin + 1));

    // 2. Guaranteed items
    const items = [];
    for (const g of table.guaranteed || []) {
      items.push({ itemId: g.itemId, count: g.count });
    }

    // 3. Roll drops
    for (const drop of table.drops || []) {
      if (Math.random() <= drop.chance) {
        items.push({ itemId: drop.itemId, count: drop.count });
      }
    }

    const drop = new LootDrop(this.scene, position, { gold, items }, (lootData) => {
      this.handleLootCollected(lootData);
    });

    this.lootDrops.push(drop);
    return drop;
  }

  handleLootCollected(lootData) {
    // 1. Add gold
    if (lootData.gold > 0 && this.lobbyData) {
      this.lobbyData.addGold(lootData.gold);
    }

    // 2. Add items to inventory
    const itemNames = [];
    for (const item of lootData.items) {
      this.inventory.addItem(item.itemId, item.count);
      const def = RPG_ITEMS[item.itemId];
      if (def) itemNames.push(`${def.name} x${item.count}`);
    }

    // 3. Play audio
    if (this.audio && this.audio.playLootPickup) {
      this.audio.playLootPickup();
    }

    // 4. Toast
    if (typeof window !== 'undefined' && window.__showWildlandsToast) {
      const summary = `💰 +${lootData.gold} Emas` + (itemNames.length > 0 ? ` & Rampasan: ${itemNames.join(', ')}` : '');
      window.__showWildlandsToast(`✨ Rampasan diambil! ${summary}`, 'success');
    }

    // 5. Notify quest system
    if (this.onLootCollected) {
      this.onLootCollected(lootData);
    }
  }

  update(dt, playerPos) {
    this.activePromptDrop = null;
    let closestDistSq = 6.25; // 2.5 meters radius squared

    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      if (drop.isLooted) {
        this.lootDrops.splice(i, 1);
        continue;
      }

      drop.update(dt, playerPos);

      if (playerPos) {
        const dx = drop.position.x - playerPos.x;
        const dz = drop.position.z - playerPos.z;
        const distSq = dx * dx + dz * dz;

        if (distSq <= closestDistSq) {
          closestDistSq = distSq;
          this.activePromptDrop = drop;
        }
      }
    }
  }

  tryInteract() {
    if (this.activePromptDrop && !this.activePromptDrop.isLooted) {
      this.activePromptDrop.collect();
      this.activePromptDrop = null;
      return true;
    }
    return false;
  }

  hasNearbyLoot() {
    return this.activePromptDrop !== null;
  }
}
