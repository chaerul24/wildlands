import * as THREE from 'three';
import { CombatAudio } from './CombatAudio.js';

export class EnemyCombat {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.audio = new CombatAudio();

    // Damage numbers active pool
    this.damageNumbers = [];

    // Player Combat State & Attributes
    this.playerHp = 100;
    this.maxPlayerHp = 100;
    this.playerStamina = 100;
    this.maxPlayerStamina = 100;
    this.playerAttackCooldown = 0.52;
    this.playerAttackTimer = 0;
    this.playerAttackRange = 2.8;
    this.playerDamage = 25;
    this.playerDefense = 6;
    this.playerCritChance = 0.08;

    // Stamina Regeneration
    this.staminaRegenRate = 22; // 22 points per second
    this.staminaRegenDelay = 0.75;
    this.staminaRegenTimer = 0;

    // Dodge / Roll State
    this.isRolling = false;
    this.rollDuration = 0.45;
    this.rollTimer = 0;
    this.rollInvulnerableTimer = 0;

    // Visual Slash Arc & Combo Tracking
    this.slashArcs = [];
    this.comboStep = 0;
    this.lastAttackTime = 0;

    // HUD DOM Elements
    this.hudHpFill = typeof document !== 'undefined' ? document.getElementById('hud-player-hp-fill') : null;
    this.hudHpText = typeof document !== 'undefined' ? document.getElementById('hud-player-hp-text') : null;
    this.hudStaFill = typeof document !== 'undefined' ? document.getElementById('hud-player-sta-fill') : null;
    this.hudStaText = typeof document !== 'undefined' ? document.getElementById('hud-player-sta-text') : null;
    this.hurtOverlay = typeof document !== 'undefined' ? document.getElementById('hud-hurt-vignette') : null;
  }

  // --- FLOATING DAMAGE NUMBERS ---
  spawnDamageNumber(position, amount, isCritical = false, isPlayerDamage = false) {
    if (typeof document === 'undefined') return;
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

  // --- VISUAL MELEE SLASH ARCS (ATTACK 1 & ATTACK 2) ---
  spawnSlashArc(origin, forwardDir, yaw = 0, attackType = 'attack1') {
    const isHeavy = attackType === 'attack2';
    const arcGeo = new THREE.RingGeometry(0.85, isHeavy ? 1.6 : 1.45, 24, 1, -Math.PI * 0.45, Math.PI * 0.9);
    const arcMat = new THREE.MeshBasicMaterial({
      color: isHeavy ? 0xf59e0b : 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
      depthWrite: false
    });
    const arcMesh = new THREE.Mesh(arcGeo, arcMat);

    if (isHeavy) {
      // Attack 2: Vertical overhead heavy cleave chop
      arcMesh.position.copy(origin).addScaledVector(forwardDir, 1.2);
      arcMesh.position.y += 1.25;
      arcMesh.rotation.set(0, yaw - Math.PI / 2, Math.PI / 2);
    } else {
      // Attack 1: Horizontal crescent slash
      arcMesh.position.copy(origin).addScaledVector(forwardDir, 1.15);
      arcMesh.position.y += 1.05;
      arcMesh.rotation.set(-Math.PI / 2, 0, yaw - Math.PI / 2);
    }

    this.scene.add(arcMesh);
    this.slashArcs.push({ mesh: arcMesh, mat: arcMat, geo: arcGeo, age: 0, lifetime: isHeavy ? 0.28 : 0.22 });
  }

  // --- SET STATS FROM INVENTORY / ATTRIBUTES ---
  setStats(stats) {
    if (!stats) return;
    this.maxPlayerHp = stats.maxHp || 100;
    this.maxPlayerStamina = stats.maxStamina || 100;
    this.playerDamage = stats.attack || 20;
    this.playerDefense = stats.defense || 5;
    this.playerCritChance = stats.critChance || 0.05;
    this.playerBlockRate = stats.blockRate || 0.05;

    // Clamp current values
    this.playerHp = Math.min(this.playerHp, this.maxPlayerHp);
    this.playerStamina = Math.min(this.playerStamina, this.maxPlayerStamina);
    this.updatePlayerHUD();
  }

  // --- STAMINA & CONSUMABLES ---
  healPlayer(amount) {
    if (this.playerHp >= this.maxPlayerHp) return false;
    this.playerHp = Math.min(this.maxPlayerHp, this.playerHp + amount);
    this.spawnDamageNumber(new THREE.Vector3(0, 0, 0), amount, true, false);
    this.updatePlayerHUD();
    return true;
  }

  restoreStamina(amount) {
    if (this.playerStamina >= this.maxPlayerStamina) return false;
    this.playerStamina = Math.min(this.maxPlayerStamina, this.playerStamina + amount);
    this.updatePlayerHUD();
    return true;
  }

  consumeStamina(amount) {
    if (this.playerStamina < amount) return false;
    this.playerStamina -= amount;
    this.staminaRegenTimer = this.staminaRegenDelay;
    this.updatePlayerHUD();
    return true;
  }

  // --- DODGE / ROLL SYSTEM ---
  tryPlayerRoll(player) {
    if (this.isRolling || this.playerStamina < 20) return false;

    // Consume stamina
    this.consumeStamina(20);
    this.isRolling = true;
    this.rollTimer = this.rollDuration;
    this.rollInvulnerableTimer = 0.35; // 350ms of full invulnerability

    // Trigger player roll animation and movement boost
    if (player) {
      player.animState = 'roll';
      if (player.character && player.character.updateAnimation) {
        player.character.updateAnimation('roll', 1.25, 0.016);
      }
      // Forward velocity boost
      const forward = new THREE.Vector3(
        -Math.sin(player.yaw || 0),
        0,
        -Math.cos(player.yaw || 0)
      ).normalize();
      player.velocity.x = forward.x * 12.0;
      player.velocity.z = forward.z * 12.0;
    }

    if (this.audio && this.audio.playDodgeRoll) {
      this.audio.playDodgeRoll();
    }
    return true;
  }

  // --- PLAYER ATTACK EXECUTION (DUAL ATTACK COMBO) ---
  tryPlayerAttack(player, enemies) {
    if (this.playerAttackTimer > 0) return false;
    this.playerAttackTimer = this.playerAttackCooldown;

    // Check stamina fatigue
    const hasStamina = this.consumeStamina(14);
    const staminaMultiplier = hasStamina ? 1.0 : 0.55;

    // Alternating attack combo: Attack 1 (Horizontal Slash) <-> Attack 2 (Heavy Vertical Cleave)
    const now = performance.now();
    if (this.lastAttackTime > 0 && (now - this.lastAttackTime < 1300)) {
      this.comboStep = (this.comboStep + 1) % 2;
    } else {
      this.comboStep = 0;
    }
    this.lastAttackTime = now;

    const attackType = this.comboStep === 0 ? 'attack1' : 'attack2';
    const isHeavy = this.comboStep === 1;

    // 1. Trigger player character attack animation & sword swing audio
    if (player && typeof player.attack === 'function') {
      player.attack(attackType);
    }

    if (isHeavy && this.audio && this.audio.playHeavySwordSwing) {
      this.audio.playHeavySwordSwing();
    } else if (this.audio && this.audio.playSwordSwing) {
      this.audio.playSwordSwing();
    }

    // 2. Spawn visual slash arc directly in front of player
    const yaw = player ? (player.yaw || 0) : 0;
    const forward = new THREE.Vector3(
      Math.sin(yaw),
      0,
      Math.cos(yaw)
    ).normalize();
    this.spawnSlashArc(player.position, forward, yaw, attackType);

    // 3. Find valid target in range and within front cone
    let hitCount = 0;
    const comboDmgMultiplier = isHeavy ? 1.25 : 1.0; // +25% heavy cleave damage

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
          const isCrit = Math.random() < this.playerCritChance;
          const baseDmg = Math.round(this.playerDamage * staminaMultiplier * comboDmgMultiplier);
          const damage = isCrit ? Math.round(baseDmg * 1.65) : baseDmg;

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
    // 1. Check if rolling in invulnerability window
    if (this.rollInvulnerableTimer > 0) {
      this.spawnDamageNumber(player.position, 0, false, false); // Shows dodge text
      return;
    }

    // 2. Check block
    if (Math.random() < (this.playerBlockRate || 0.05)) {
      if (window.__showWildlandsToast) {
        window.__showWildlandsToast('🛡️ Serangan berhasil ditangkis (Block)!', 'info');
      }
      this.audio.playHitImpact();
      return;
    }

    // 3. Apply armor defense damage mitigation
    const mitigated = Math.max(2, Math.round(amount - this.playerDefense * 0.7));
    this.playerHp = Math.max(0, this.playerHp - mitigated);
    this.audio.playPlayerHurt();

    // Spawn damage number over player
    this.spawnDamageNumber(player.position, mitigated, false, true);

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
    this.playerStamina = this.maxPlayerStamina;
    this.updatePlayerHUD(player.name);
  }

  updatePlayerHUD(name = 'Explorer') {
    // HP Bar
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

    // Stamina Bar
    if (this.hudStaFill) {
      const staPct = Math.max(0, Math.min(100, (this.playerStamina / this.maxPlayerStamina) * 100));
      this.hudStaFill.style.width = `${staPct}%`;
    }
    if (this.hudStaText) {
      this.hudStaText.textContent = `${Math.round(this.playerStamina)} / ${this.maxPlayerStamina} STA`;
    }
  }

  update(dt, isSprinting = false) {
    if (this.playerAttackTimer > 0) {
      this.playerAttackTimer -= dt;
    }

    // Roll timer
    if (this.isRolling) {
      this.rollTimer -= dt;
      this.rollInvulnerableTimer -= dt;
      if (this.rollTimer <= 0) {
        this.isRolling = false;
        this.rollInvulnerableTimer = 0;
      }
    }

    // Stamina consumption while sprinting
    if (isSprinting && !this.isRolling) {
      this.consumeStamina(14 * dt);
    } else {
      // Stamina regeneration
      if (this.staminaRegenTimer > 0) {
        this.staminaRegenTimer -= dt;
      } else {
        if (this.playerStamina < this.maxPlayerStamina) {
          this.playerStamina = Math.min(this.maxPlayerStamina, this.playerStamina + this.staminaRegenRate * dt);
          this.updatePlayerHUD();
        }
      }
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
