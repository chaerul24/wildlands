import { RPG_QUESTS } from './RPGConfig.js';

export class DialogueManager {
  constructor(npcManager, questManager, inputManager, shopUI = null) {
    this.npcManager = npcManager;
    this.questManager = questManager;
    this.input = inputManager;
    this.shopUI = shopUI;

    this.activeNpc = null;
    this.isDialogueOpen = false;

    // DOM Elements
    this.dialogueModal = null;
    this.promptEl = null;

    this.createDOM();
  }

  createDOM() {
    // 1. In-game interaction prompt
    this.promptEl = document.createElement('div');
    this.promptEl.id = 'hud-interaction-prompt';
    this.promptEl.className = 'interaction-prompt';
    this.promptEl.style.display = 'none';
    this.promptEl.innerHTML = `
      <span class="prompt-key">E</span>
      <span class="prompt-text" id="hud-prompt-text">Bicara</span>
    `;
    document.body.appendChild(this.promptEl);

    // 2. Dialogue Modal Box
    this.dialogueModal = document.createElement('div');
    this.dialogueModal.id = 'rpg-dialogue-modal';
    this.dialogueModal.className = 'rpg-dialogue-overlay';
    this.dialogueModal.style.display = 'none';
    this.dialogueModal.innerHTML = `
      <div class="rpg-dialogue-card">
        <header class="dialogue-header">
          <div class="dialogue-avatar" id="dialogue-avatar">🛡️</div>
          <div class="dialogue-speaker-info">
            <h3 class="dialogue-name" id="dialogue-speaker-name">Penjaga Desa Rian</h3>
            <span class="dialogue-title" id="dialogue-speaker-title">Pengawal Kehormatan Valley Village</span>
          </div>
          <button class="dialogue-close-btn" id="btn-dialogue-close" type="button">✕</button>
        </header>

        <div class="dialogue-body">
          <p class="dialogue-speech" id="dialogue-text">
            "Salam, petualang! Hati-hatilah jika melewati jalan setapak menuju barat daya..."
          </p>
        </div>

        <div class="dialogue-actions" id="dialogue-action-buttons">
          <!-- Dynamically populated buttons -->
        </div>
      </div>
    `;
    document.body.appendChild(this.dialogueModal);

    // Close button
    const closeBtn = this.dialogueModal.querySelector('#btn-dialogue-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeDialogue());
    }

    // Click outside to close
    this.dialogueModal.addEventListener('click', (e) => {
      if (e.target === this.dialogueModal) {
        this.closeDialogue();
      }
    });
  }

  update(playerPos) {
    if (playerPos) {
      this.lastPlayerPos = playerPos;
    }

    if (this.isDialogueOpen) {
      // Auto close dialogue if player walks too far (> 4.5m)
      if (this.activeNpc && playerPos) {
        const dx = this.activeNpc.position.x - playerPos.x;
        const dz = this.activeNpc.position.z - playerPos.z;
        if (Math.hypot(dx, dz) > 4.5) {
          this.closeDialogue();
        }
      }
      return;
    }

    if (!playerPos || !this.npcManager || !this.npcManager.npcs) return;

    let closestNpc = null;
    let closestDistSq = 12.25; // 3.5m radius

    for (const npc of this.npcManager.npcs) {
      const dx = npc.position.x - playerPos.x;
      const dz = npc.position.z - playerPos.z;
      const distSq = dx * dx + dz * dz;

      if (distSq <= closestDistSq) {
        closestDistSq = distSq;
        closestNpc = npc;
      }
    }

    this.activeNpc = closestNpc;

    if (this.activeNpc && this.promptEl) {
      const promptText = document.getElementById('hud-prompt-text');
      if (promptText) {
        promptText.textContent = `Bicara dengan ${this.activeNpc.name}`;
      }
      this.promptEl.style.display = 'flex';
    } else if (this.promptEl && !window.__activeLootPrompt) {
      this.promptEl.style.display = 'none';
    }
  }

  tryInteract() {
    if (this.isDialogueOpen) {
      this.closeDialogue();
      return true;
    }

    if (this.activeNpc) {
      this.openDialogue(this.activeNpc);
      return true;
    }
    return false;
  }

  openDialogue(npc) {
    this.activeNpc = npc;
    this.isDialogueOpen = true;

    // Trigger NPC talking state, smooth facing towards player, and talk animation
    if (typeof npc.startTalking === 'function') {
      npc.startTalking(this.lastPlayerPos);
    }

    // Release pointer lock so player can click dialogue choices
    if (this.input) {
      this.input.exitPointerLock();
    }

    // Populate dialogue info
    const avatarEl = document.getElementById('dialogue-avatar');
    const nameEl = document.getElementById('dialogue-speaker-name');
    const titleEl = document.getElementById('dialogue-speaker-title');
    const textEl = document.getElementById('dialogue-text');
    const actionsEl = document.getElementById('dialogue-action-buttons');

    if (nameEl) nameEl.textContent = npc.name;
    if (titleEl) titleEl.textContent = npc.title || 'Warga Wildlands';

    // Set avatar based on modelType/role
    if (avatarEl) {
      if (npc.role === 'guard') avatarEl.textContent = '🛡️';
      else if (npc.role === 'hermit') avatarEl.textContent = '🧘';
      else if (npc.role === 'farmer') avatarEl.textContent = '🌾';
      else if (npc.role === 'gardener') avatarEl.textContent = '🌸';
      else if (npc.role === 'porter') avatarEl.textContent = '📦';
      else if (npc.role === 'sweeper') avatarEl.textContent = '🧹';
      else if (npc.role === 'merchant_weapon' || npc.id === 'npc_asep') avatarEl.textContent = '⚔️';
      else if (npc.role === 'merchant_armor' || npc.id === 'npc_barin') avatarEl.textContent = '🛡️';
      else if (npc.role === 'merchant_food' || npc.id === 'npc_mina') avatarEl.textContent = '🍞';
      else if (npc.role === 'merchant') avatarEl.textContent = '🏪';
      else if (npc.role === 'elder') avatarEl.textContent = '👴';
      else avatarEl.textContent = '🗣️';
    }

    // Build dialogue & actions based on Quest State & NPC Identity
    actionsEl.innerHTML = '';

    // Check vertical slice quest: quest_marauder_threat
    const questId = 'quest_marauder_threat';
    const questTemplate = RPG_QUESTS[questId];
    const questState = this.questManager ? this.questManager.getQuestState(questId) : 'AVAILABLE';

    if (npc.id === 'npc_rian') {
      this.questManager.onTalkedToNpc('npc_rian');

      if (questState === 'AVAILABLE') {
        textEl.textContent = `"${questTemplate.dialogue.intro} ${questTemplate.dialogue.details}"`;

        const btnAccept = document.createElement('button');
        btnAccept.className = 'btn-dialogue-action primary';
        btnAccept.innerHTML = `<span>📜 Terima Misi: ${questTemplate.title}</span>`;
        btnAccept.onclick = () => {
          this.questManager.acceptQuest(questId);
          this.closeDialogue();
        };
        actionsEl.appendChild(btnAccept);

      } else if (questState === 'ACTIVE') {
        textEl.textContent = `"${questTemplate.dialogue.inProgress}"`;

        const btnHint = document.createElement('button');
        btnHint.className = 'btn-dialogue-action secondary';
        btnHint.innerHTML = `<span>🧭 Tanya Arah Lokasi (-55, -35)</span>`;
        btnHint.onclick = () => {
          if (window.__showWildlandsToast) {
            window.__showWildlandsToast('🗺️ Ikuti jalur lembah ke arah barat daya (-55, -35)', 'info');
          }
          this.closeDialogue();
        };
        actionsEl.appendChild(btnHint);

      } else if (questState === 'READY_TO_TURN_IN') {
        textEl.textContent = `"${questTemplate.dialogue.completeReady}"`;

        const btnTurnIn = document.createElement('button');
        btnTurnIn.className = 'btn-dialogue-action primary-gold';
        btnTurnIn.innerHTML = `<span>🏆 Serahkan Lencana & Ambil Hadiah (+350 XP, +150 Emas, Pedang Ksatria)</span>`;
        btnTurnIn.onclick = () => {
          this.questManager.completeQuest(questId);
          this.closeDialogue();
        };
        actionsEl.appendChild(btnTurnIn);

      } else if (questState === 'COMPLETED') {
        textEl.textContent = `"${questTemplate.dialogue.completed}"`;
      }
    } else if (npc.id === 'npc_mbah_roso') {
      textEl.textContent = `"Hutan ini memiliki detak jantungnya sendiri, anak muda. Angin dari barat daya membawa ketenangan setelah Marauder itu terusir. Jagalah selalu kedamaian alam liar."`;
    } else if (npc.role === 'merchant_weapon' || npc.id === 'npc_asep') {
      textEl.textContent = `"Selamat datang di Toko Pedang & Senjata Lembah! Aku Mang Asep. Di sini tersedia aneka bilah tempa, kapak perang beruang, belati bayangan, hingga pusaka mistis arcana. Pilih senjatamu untuk menjelajahi alam liar!"`;

      if (this.shopUI) {
        const btnShop = document.createElement('button');
        btnShop.className = 'btn-dialogue-action primary-gold';
        btnShop.innerHTML = `<span>⚔️ Buka Toko Pedang & Senjata</span>`;
        btnShop.onclick = () => {
          this.closeDialogue();
          this.shopUI.open('weapon');
        };
        actionsEl.appendChild(btnShop);
      }
    } else if (npc.role === 'merchant_armor' || npc.id === 'npc_barin') {
      textEl.textContent = `"Baja yang tangguh ditempa di tengah panasnya bara api! Aku Barin, pandai besi desa. Butuh zirah pelat baja, pelindung kaki, helm ksatria, atau perisai benteng agar kamu tidak mudah tumbang oleh sabetan senjata penyamun rimba?"`;

      if (this.shopUI) {
        const btnArmor = document.createElement('button');
        btnArmor.className = 'btn-dialogue-action primary-gold';
        btnArmor.innerHTML = `<span>🛡️ Buka Toko Zirah & Perlengkapan</span>`;
        btnArmor.onclick = () => {
          this.closeDialogue();
          this.shopUI.open('armor');
        };
        actionsEl.appendChild(btnArmor);
      }
    } else if (npc.role === 'merchant_food' || npc.id === 'npc_mina') {
      textEl.textContent = `"Aroma sedap apa yang kamu cari, petualang muda? Aku Ibu Mina. Menjelajah lembah yang luas membutuhkan stamina dan kesehatan prima. Aku menyediakan roti gandum hangat, daging panggang gurih, sup jamur berkhasiat, dan teh herbal segar!"`;

      if (this.shopUI) {
        const btnFood = document.createElement('button');
        btnFood.className = 'btn-dialogue-action primary-gold';
        btnFood.innerHTML = `<span>🍞 Buka Toko Makanan & Perbekalan</span>`;
        btnFood.onclick = () => {
          this.closeDialogue();
          this.shopUI.open('food');
        };
        actionsEl.appendChild(btnFood);
      }
    } else if (npc.id === 'npc_danu') {
      textEl.textContent = `"Duduklah sejenak dan dengarkan gemercik air sumur desa, anak muda. Lembah ini menyimpan sejarah panjang kerajaan purba sebelum para penyamun marauder menduduki kawasan barat. Selalu siapkan bekalmu dan hormati alam liar."`;
    } else if (npc.id === 'npc_siti') {
      textEl.textContent = `"Bunga-bunga herbal di pekarangan ini bermekaran segar berkat embun pagi pegunungan. Ekstraknya biasa dipetik untuk meramu tonik stamina dan obat luka."`;
    } else if (npc.id === 'npc_budi') {
      textEl.textContent = `"Huft! Peti kayu ini berisi persediaan perkakas dari bengkel cedar timur. Desa yang damai membutuhkan gotong royong dan kerja keras bersama!"`;
    } else if (npc.id === 'npc_sari') {
      textEl.textContent = `"Setiap pagi aku menyapu jalan setapak desa agar bersih dari ranting dan bebatuan liar. Semoga harimu menyenangkan dalam bertualang!"`;
    } else if (npc.id === 'npc_dewi') {
      textEl.textContent = `"Petualang! Apakah kamu mendengar bisikan angin dari reruntuhan kuno di barat laut? Para pemburu bilang ada rahasia pusaka purba tersembunyi di sana."`;
    } else if (npc.id === 'npc_maya') {
      textEl.textContent = `"Dewi selalu berimajinasi macam-macam tentang tempat angker! Tapi tetap jangan lupa membawa cukup makanan dan ramuan jika hendak masuk ke dalam hutan rimba."`;
    } else {
      textEl.textContent = `"Senang melihat petualang muda yang ramah sepertimu di lembah ini. Semoga perjalananmu selalu diberkahi keselamatan!"`;
    }

    // Always add Close action
    const btnClose = document.createElement('button');
    btnClose.className = 'btn-dialogue-action secondary';
    btnClose.textContent = 'Tutup Pembicaraan';
    btnClose.onclick = () => this.closeDialogue();
    actionsEl.appendChild(btnClose);

    this.dialogueModal.style.display = 'flex';
  }

  closeDialogue() {
    this.isDialogueOpen = false;
    if (this.dialogueModal) {
      this.dialogueModal.style.display = 'none';
    }
    // Return talking NPC to its previous activity and rotation
    if (this.activeNpc && typeof this.activeNpc.stopTalking === 'function') {
      this.activeNpc.stopTalking();
    }
    if (this.input) {
      this.input.requestPointerLock();
    }
  }
}
