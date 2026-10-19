import * as THREE from 'three';
import { CombatAudio } from './CombatAudio.js';

export class EnemyCombat {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.audio = new CombatAudio();

    // Damage numbers active pool
    this.damageNumbers = [];

    // Player Combat State
    this.playerHp = 100;
    this.maxPlayerHp = 100;
    this.playerAttackCooldown = 0.55;
    this.playerAttackTimer = 0;
    this.playerAttackRange = 2.8;
    this.playerDamage = 25;

    // Visual Slash Arc
    this.slashArcs = [];

    // HUD DOM Elements
    this.hudHpFill = document.getElementById('hud-player-hp-fill');
    this.hudHpText = document.getElementById('hud-player-hp-text');
    this.hurtOverlay = document.getElementById('hud-hurt-vignette');
  }

  // --- FLOATING DAMAGE NUMBERS ---
  spawnDamageNumber(position, amount, isCritical = false, isPlayerDamage = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.font = isCritical ? 'bold 36px sans-serif' : 'bold 28px sans-serif';
    ctx.textAlign = 'center';

    // Text color
    ctx.fillStyle = isPlayerDamage ? '#ef4444' : (isCritical ? '#fbbf24' : '#f8fafc');
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;

    const text = isPlayerDamage ? `-${amount}` : (isCritical ? `CRIT -${amount}!` : `-${amount}`);
    ctx.strokeText(text, 64, 44);
    ctx.fillText(text, 64, 44);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    const sprite = new THREE.Sprite(spriteMat);
    // Slight random offset
    sprite.position.copy(position);
    sprite.position.x += (Math.random() - 0.5) * 0.4;
    sprite.position.y += 1.8 + Math.random() * 0.3;
    sprite.position.z += (Math.random() - 0.5) * 0.4;

    const scale = isCritical ? 1.4 : 1.0;
    sprite.scale.set(1.2 * scale, 0.6 * scale, 1);
    this.scene.add(sprite);

    this.damageNumbers.push({
      sprite,
      mat: spriteMat,
      tex: texture,
      age: 0,
      lifetime: 0.85,
      vy: 1.6
    });
  }

  // --- VISUAL MELEE SLASH ARC ---
  spawnSlashArc(origin, forwardDir) {
    const arcGeo = new THREE.RingGeometry(0.8, 1.3, 16, 1, 0, Math.PI * 0.7);
    const arcMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);

    arcMesh.position.copy(origin);
    arcMesh.position.y += 1.1;

    // Orient towards forwardDir
    const angle = Math.atan2(forwardDir.x, forwardDir.z);
    arcMesh.rotation.x = Math.PI / 2.3;
    arcMesh.rotation.z = -angle;

    this.scene.add(arcMesh);
    this.slashArcs.push({ mesh: arcMesh, mat: arcMat, geo: arcGeo, age: 0, lifetime: 0.18 });
  }

  // --- PLAYER ATTACK EXECUTION ---
  tryPlayerAttack(player, enemies) {
    if (this.playerAttackTimer > 0) return false;
    this.playerAttackTimer = this.playerAttackCooldown;

    // 1. Play sword swing sound & whoosh
    this.audio.playSwordSwing();

    // 2. Spawn visual slash arc in front of player
    const forward = new THREE.Vector3(
      -Math.sin(player.yaw || 0),
      0,
      -Math.cos(player.yaw || 0)
    ).normalize();
    this.spawnSlashArc(player.position, forward);

    // 3. Find valid target in range and within front cone
    let hitCount = 0;
    for (const enemy of enemies) {
      if (!enemy || enemy.isDead || enemy.state === 'DEATH') continue;

      const toEnemy = new THREE.Vector3().subVectors(enemy.position, player.position);
      const dist = toEnemy.length();

      if (dist <= this.playerAttackRange) {
        toEnemy.y = 0;
        toEnemy.normalize();

        // Check if enemy is in front cone of player (dot product > 0.15 = within ~80 degrees)
        const dot = forward.dot(toEnemy);
        if (dot > 0.15) {
          // Valid hit!
          hitCount++;
          const isCrit = Math.random() < 0.25;
          const damage = isCrit ? Math.round(this.playerDamage * 1.5) : this.playerDamage;

          // Apply damage to enemy
          enemy.takeDamage(damage, player.position);

          // Spawn visual damage numbers
          this.spawnDamageNumber(enemy.position, damage, isCrit, false);

          // Audio impact
          this.audio.playHitImpact();
        }
      }
    }

    return hitCount > 0;
  }

  // --- DAMAGE TO PLAYER FROM ENEMY ---
  damagePlayer(amount, enemy, player) {
    this.playerHp = Math.max(0, this.playerHp - amount);
    this.audio.playPlayerHurt();

    // Spawn damage number over player
    this.spawnDamageNumber(player.position, amount, false, true);

    // Flash screen hurt vignette
    if (this.hurtOverlay) {
      this.hurtOverlay.classList.remove('active');
      void this.hurtOverlay.offsetWidth; // Force DOM reflow
      this.hurtOverlay.classList.add('active');
    }

    // Update HUD HP bar
    this.updatePlayerHUD(player.name);

    if (this.playerHp <= 0) {
      // Player defeated: respawn at (0, 0)
      this.handlePlayerDefeated(player);
    }
  }

  handlePlayerDefeated(player) {
    if (window.__showWildlandsToast) {
      window.__showWildlandsToast('⚔️ Kamu ditumbangkan oleh musuh! Respawn di pangkalan awal...', 'error');
    }
    // Respawn player
    player.respawn(0, 0);
    this.playerHp = this.maxPlayerHp;
    this.updatePlayerHUD(player.name);
  }

  updatePlayerHUD(name = 'Explorer') {
    if (this.hudHpFill) {
      const pct = Math.max(0, Math.min(100, (this.playerHp / this.maxPlayerHp) * 100));
      this.hudHpFill.style.width = `${pct}%`;
      if (pct > 50) {
        this.hudHpFill.style.background = 'linear-gradient(90deg, #10b981, #34d399)';
      } else if (pct > 25) {
        this.hudHpFill.style.background = 'linear-gradient(90deg, #f59e0b, #fbbf24)';
      } else {
        this.hudHpFill.style.background = 'linear-gradient(90deg, #ef4444, #dc2626)';
      }
    }
    if (this.hudHpText) {
      this.hudHpText.textContent = `${this.playerHp} / ${this.maxPlayerHp} HP`;
    }
  }

  update(dt) {
    if (this.playerAttackTimer > 0) {
      this.playerAttackTimer -= dt;
    }

    // Update floating damage numbers
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const dn = this.damageNumbers[i];
      dn.age += dt;
      dn.sprite.position.y += dn.vy * dt;
      const lifeRatio = dn.age / dn.lifetime;
      dn.mat.opacity = Math.max(0, 1 - lifeRatio * lifeRatio);

      if (dn.age >= dn.lifetime) {
        this.scene.remove(dn.sprite);
        dn.mat.dispose();
        dn.tex.dispose();
        this.damageNumbers.splice(i, 1);
      }
    }

    // Update slash arcs
    for (let i = this.slashArcs.length - 1; i >= 0; i--) {
      const arc = this.slashArcs[i];
      arc.age += dt;
      arc.mat.opacity = (1 - arc.age / arc.lifetime) * 0.85;
      arc.mesh.scale.multiplyScalar(1.0 + dt * 1.5);

      if (arc.age >= arc.lifetime) {
        this.scene.remove(arc.mesh);
        arc.mat.dispose();
        arc.geo.dispose();
        this.slashArcs.splice(i, 1);
      }
    }
  }
}
