/**
 * GameOpeningConfig.js
 * Centralized Configuration for Wildlands Cinematic Opening Flow,
 * Audio System, Asset Pipeline, and Loading Screens.
 */

export const OPENING_STATES = {
  BOOT: 'BOOT',
  SPLASH: 'SPLASH',
  LOADING: 'LOADING',
  LOBBY: 'LOBBY'
};

export const GAME_OPENING_CONFIG = {
  // Splash Screen configuration
  splash: {
    title: 'WILDLANDS',
    subtitle: '3D OPEN-WORLD ACTION RPG MULTIPLAYER',
    tagline: 'A WORLD WAITING TO BE DISCOVERED',
    versionBadge: 'Versi 2.5 • Asia-SE Official Realm',
    minDisplayTimeMs: 1400,
    autoAdvanceTimeMs: 5000,
    fadeDurationMs: 450,
    canSkip: true
  },

  // Loading Screen configuration
  loading: {
    minDisplayTimeMs: 1000,
    fadeDurationMs: 400,
    tipRotationIntervalMs: 3500,
    tips: [
      'Tekan [Q] saat bertarung untuk Roll / Dodge menghindar dengan kekebalan sesaat.',
      'Kunjungi Mang Asep di Valley Village untuk membeli senjata dan pusaka bermata baja.',
      'Buka Peta Dunia [M] untuk melihat titik landmark pemukiman desa dan lokasi misi.',
      'Bicara dengan Penjaga Desa Rian untuk menerima misi penyelidikan Rumah Lapuk Tua.',
      'Tekan [I] untuk membuka Tas Inventaris dan melengkapi armor penambah DEF.',
      'Gunakan ramuan Potion HP [1] dan Potion Stamina [2] melalui hotbar cepat.',
      'Setiap pedang memiliki ritme serangan berbeda: tebasan sabit [Klik 1] dan cleave vertikal [Klik 2].',
      'Wildlands berjalan optimal di browser desktop dan perangkat mobile Android WebView.'
    ]
  },

  // Centralized Audio configuration
  audio: {
    storageKey: 'wildlands_audio_config',
    defaults: {
      masterVolume: 0.85,
      bgmVolume: 0.65,
      sfxVolume: 0.75,
      isMuted: false
    },
    bgmTracks: {
      splash: '/assets/audio/bgm/splash.wav',
      loading: '/assets/audio/bgm/loading.wav',
      lobby: '/assets/audio/bgm/lobby.wav'
    },
    sfxClips: {
      btn_click: '/assets/audio/ui/btn_click.ogg',
      dialogue_open: '/assets/audio/rpg/dialogue_open.ogg',
      door_open: '/assets/audio/rpg/door_open.ogg',
      door_close: '/assets/audio/rpg/door_close.ogg',
      sword_swing: '/assets/audio/rpg/sword_swing.ogg',
      dodge_roll: '/assets/audio/rpg/dodge_roll.ogg',
      shop_purchase: '/assets/audio/ui/shop_purchase.ogg',
      insufficient_gold: '/assets/audio/ui/insufficient_gold.ogg',
      metal_hit: '/assets/audio/impacts/metal_sword_hit.ogg',
      shield_block: '/assets/audio/impacts/wood_shield_block.ogg'
    }
  },

  // Critical Assets Required Before Lobby
  criticalAssets: [
    { id: 'character_glb', type: 'model', path: '/character.glb', mandatory: true },
    { id: 'grass_diffuse', type: 'texture', path: '/grass_diffuse.jpg', mandatory: true },
    { id: 'dirt_path', type: 'texture', path: '/assets/textures/ground/dirt_path_diffuse.jpg', mandatory: false },
    { id: 'btn_click', type: 'audio', path: '/assets/audio/ui/btn_click.ogg', mandatory: false },
    { id: 'bgm_lobby', type: 'audio', path: '/assets/audio/bgm/lobby.wav', mandatory: false }
  ]
};
