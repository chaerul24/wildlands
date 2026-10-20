/**
 * Centralized Client-Side Lobby Data Store & Service
 * Handles Player Profile, Events, Missions, News, Friends, and Achievements
 * with server API synchronization and localStorage persistence.
 */

const STORAGE_KEYS = {
  PROFILE: 'wildlands_player_profile',
  SETTINGS: 'wildlands_player_settings',
  MISSIONS: 'wildlands_player_missions',
  EVENTS: 'wildlands_player_events',
  FRIENDS: 'wildlands_player_friends',
  NEWS_READ: 'wildlands_news_read_ids'
};

export class LobbyData {
  constructor() {
    this.serverUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVER_URL)
      || (typeof window !== 'undefined' ? (window.location.port === '5173' ? `http://${window.location.hostname || 'localhost'}:3001` : window.location.origin) : 'http://localhost:3001');

    this.profile = this.loadProfile();
    this.settings = this.loadSettings();
    this.missions = [];
    this.events = [];
    this.news = [];
    this.friends = [];
    this.readNewsIds = this.loadReadNewsIds();

    this.achievements = [
      {
        id: 'ach_first_steps',
        title: 'Penjelajah Pemula',
        desc: 'Mulai petualangan pertama di Wildlands',
        icon: '🧭',
        reward: '50 XP',
        unlocked: true,
        progress: '1/1'
      },
      {
        id: 'ach_village_visitor',
        title: 'Sahabat Desa',
        desc: 'Kunjungi pemukiman Valley Village dan sapa warga',
        icon: '🏡',
        reward: '150 XP',
        unlocked: false,
        progress: '0/1'
      },
      {
        id: 'ach_marathon',
        title: 'Pelari Lembah',
        desc: 'Tempuh total jarak eksplorasi sejauh 500 meter',
        icon: '🏃',
        reward: '200 XP',
        unlocked: false,
        progress: '0/500m'
      },
      {
        id: 'ach_ruins_explorer',
        title: 'Penyelidik Misteri',
        desc: 'Kunjungi Rumah Tua Lapuk di tepi hutan lebat',
        icon: '🏚️',
        reward: '250 XP',
        unlocked: false,
        progress: '0/1'
      },
      {
        id: 'ach_social_butterfly',
        title: 'Koneksi Rimba',
        desc: 'Miliki setidaknya 3 teman dalam daftar sosial',
        icon: '🤝',
        reward: '100 XP',
        unlocked: false,
        progress: '2/3'
      }
    ];

    // Initial load
    this.refreshAllData();
  }

  loadProfile() {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {}
    }

    // Default player identity
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const defaultProfile = {
      id: `WL-${randomNum}`,
      username: `Explorer_${Math.floor(100 + Math.random() * 900)}`,
      avatar: 'avatar_explorer',
      bio: 'Petualang alam bebas yang siap mengungkap rahasia tanah Wildlands.',
      level: 1,
      xp: 140,
      xpNext: 300,
      gold: 250,
      joinDate: 'Oktober 2026',
      stats: {
        playtimeMinutes: 45,
        distanceTraveled: 180,
        missionsCompleted: 1,
        eventsJoined: 1,
        friendsCount: 2
      }
    };
    this.saveProfile(defaultProfile);
    return defaultProfile;
  }

  saveProfile(profile) {
    this.profile = profile || this.profile;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(this.profile));
    }
  }

  saveLocal() {
    this.saveProfile();
  }

  loadSettings() {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return {
      quality: 'medium',
      sensitivity: 0.0024,
      masterVolume: 80,
      sfxVolume: 90,
      musicVolume: 70,
      fullscreen: false
    };
  }

  saveSettings(settings) {
    this.settings = { ...this.settings, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
  }

  loadReadNewsIds() {
    const raw = localStorage.getItem(STORAGE_KEYS.NEWS_READ);
    if (raw) {
      try { return JSON.parse(raw); } catch (e) {}
    }
    return [];
  }

  markNewsRead(id) {
    if (!this.readNewsIds.includes(id)) {
      this.readNewsIds.push(id);
      localStorage.setItem(STORAGE_KEYS.NEWS_READ, JSON.stringify(this.readNewsIds));
    }
  }

  isNewsRead(id) {
    return this.readNewsIds.includes(id);
  }

  async refreshAllData() {
    await Promise.allSettled([
      this.fetchEvents(),
      this.fetchMissions(),
      this.fetchNews(),
      this.fetchFriends()
    ]);
  }

  async fetchEvents() {
    try {
      const res = await fetch(`${this.serverUrl}/api/events`);
      if (res.ok) {
        const data = await res.json();
        this.events = data.events || [];
        return this.events;
      }
    } catch (e) {
      // Offline fallback
    }
    if (!this.events || this.events.length === 0) {
      this.events = [
        {
          id: 'evt_valley_festival',
          title: 'Festival Lembah Rimba Wildlands',
          desc: 'Warga desa menyambut panen raya dengan bonus EXP +20% di seluruh lembah.',
          badge: 'OFFLINE',
          banner: '🌾',
          startDate: 'Aktif',
          endDate: 'Sepanjang Waktu'
        },
        {
          id: 'evt_marauder_hunt',
          title: 'Perburuan Penyamun Lembah',
          desc: 'Kalahkan musuh liar di sekitar Rumah Tua untuk mengumpulkan lencana pusaka.',
          badge: 'QUEST',
          banner: '⚔️',
          startDate: 'Aktif',
          endDate: 'Sepanjang Waktu'
        }
      ];
    }
    return this.events;
  }

  async fetchMissions() {
    try {
      const res = await fetch(`${this.serverUrl}/api/missions`);
      if (res.ok) {
        const data = await res.json();
        this.missions = data.missions || [];
        return this.missions;
      }
    } catch (e) {
      // Offline fallback
    }
    if (!this.missions || this.missions.length === 0) {
      this.missions = [
        {
          id: 'msn_daily_walk',
          title: 'Penjelajahan Lembah Harian',
          desc: 'Jelajahi lembah sejauh 250 meter',
          icon: '🧭',
          progress: 0,
          target: 250,
          unit: 'm',
          reward: '100 XP + 50 Gold',
          isClaimed: false
        },
        {
          id: 'msn_daily_combat',
          title: 'Latihan Serangan Pedang',
          desc: 'Lakukan tebasan kombinasi pedang',
          icon: '⚔️',
          progress: 0,
          target: 5,
          unit: 'kali',
          reward: '80 XP',
          isClaimed: false
        }
      ];
    }
    return this.missions;
  }

  async fetchNews() {
    try {
      const res = await fetch(`${this.serverUrl}/api/news`);
      if (res.ok) {
        const data = await res.json();
        this.news = data.news || [];
        return this.news;
      }
    } catch (e) {
      // Offline fallback
    }
    if (!this.news || this.news.length === 0) {
      this.news = [
        {
          id: 'news_v2_launch',
          title: 'Wildlands Android Offline-First Telah Hadir!',
          date: 'Oktober 2026',
          author: 'Tim Wildlands',
          category: 'UPDATE',
          excerpt: 'Kini petualangan open-world 3D Wildlands dapat dimainkan secara offline di Android tanpa koneksi internet.',
          content: 'Pembaruan terkini menghadirkan sistem penyimpanan lokal IndexedDB, kontrol sentuh 60 FPS di mobile, dukungan immersive fullscreen, dan mode pemain tunggal offline.'
        }
      ];
    }
    return this.news;
  }

  async fetchFriends() {
    try {
      const res = await fetch(`${this.serverUrl}/api/friends`);
      if (res.ok) {
        const data = await res.json();
        this.friends = data.friends || [];
        return this.friends;
      }
    } catch (e) {
      // Offline fallback
    }
    if (!this.friends || this.friends.length === 0) {
      this.friends = [
        {
          id: 'friend_danu',
          name: 'Kakek Danu',
          status: 'Tetua Valley Village',
          avatar: '👴',
          isOnline: false
        },
        {
          id: 'friend_rian',
          name: 'Penjaga Rian',
          status: 'Patroli Gerbang Desa',
          avatar: '🛡️',
          isOnline: false
        }
      ];
    }
    return this.friends;
  }

  addXP(amount) {
    this.profile.xp += amount;
    while (this.profile.xp >= this.profile.xpNext) {
      this.profile.xp -= this.profile.xpNext;
      this.profile.level += 1;
      this.profile.xpNext = Math.floor(this.profile.xpNext * 1.5);
    }
    this.saveProfile();
  }

  addGold(amount) {
    this.profile.gold += amount;
    this.saveProfile();
  }

  recordDistance(meters) {
    this.profile.stats.distanceTraveled += Math.round(meters);

    // Update mission progress if applicable
    for (const m of this.missions) {
      if (m.id === 'msn_daily_walk' && !m.isClaimed) {
        m.progress = Math.min(m.target, m.progress + Math.round(meters));
      }
      if (m.id === 'msn_weekly_distance' && !m.isClaimed) {
        m.progress = Math.min(m.target, m.progress + Math.round(meters));
      }
    }

    // Check marathon achievement
    if (this.profile.stats.distanceTraveled >= 500) {
      const ach = this.achievements.find(a => a.id === 'ach_marathon');
      if (ach && !ach.unlocked) {
        ach.unlocked = true;
        ach.progress = '500/500m';
        this.addXP(200);
      }
    }

    this.saveProfile();
  }

  recordLocationVisit(locationType) {
    if (locationType === 'village') {
      const m = this.missions.find(x => x.id === 'msn_daily_village');
      if (m) m.progress = 1;
      const ach = this.achievements.find(a => a.id === 'ach_village_visitor');
      if (ach && !ach.unlocked) {
        ach.unlocked = true;
        ach.progress = '1/1';
        this.addXP(150);
      }
    } else if (locationType === 'old_house') {
      const m = this.missions.find(x => x.id === 'msn_weekly_ruins');
      if (m) m.progress = Math.min(2, m.progress + 1);
      const ach = this.achievements.find(a => a.id === 'ach_ruins_explorer');
      if (ach && !ach.unlocked) {
        ach.unlocked = true;
        ach.progress = '1/1';
        this.addXP(250);
      }
    } else if (locationType === 'merchant') {
      const m = this.missions.find(x => x.id === 'msn_daily_merchant');
      if (m) m.progress = 1;
    }
    this.saveProfile();
  }

  async claimMission(missionId) {
    const m = this.missions.find(x => x.id === missionId);
    if (!m) return { success: false, error: 'Misi tidak ditemukan' };
    if (m.progress < m.target) return { success: false, error: 'Target misi belum terpenuhi' };
    if (m.isClaimed) return { success: false, error: 'Hadiah misi sudah pernah diklaim' };

    m.isClaimed = true;
    this.addXP(m.reward.xp || 100);
    this.addGold(m.reward.gold || 50);
    this.profile.stats.missionsCompleted += 1;
    this.saveProfile();

    try {
      await fetch(`${this.serverUrl}/api/missions/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId })
      });
    } catch (e) {}

    return { success: true, reward: m.reward };
  }

  joinEvent(eventId) {
    const ev = this.events.find(e => e.id === eventId);
    if (!ev) return { success: false, error: 'Event tidak ditemukan' };
    if (ev.isJoined) return { success: false, error: 'Anda sudah terdaftar dalam event ini' };

    ev.isJoined = true;
    ev.participantsCount = (ev.participantsCount || 0) + 1;
    this.profile.stats.eventsJoined += 1;
    this.saveProfile();
    return { success: true, event: ev };
  }

  sendFriendRequest(targetQuery) {
    if (!targetQuery) return { success: false, error: 'Masukkan nama pemain atau Player ID' };

    const query = targetQuery.trim();
    if (query === this.profile.username || query === this.profile.id) {
      return { success: false, error: 'Anda tidak dapat menambahkan diri sendiri sebagai teman' };
    }

    const existing = this.friends.find(f => f.username.toLowerCase() === query.toLowerCase() || f.id.toLowerCase() === query.toLowerCase());
    if (existing) {
      if (existing.isFriend) return { success: false, error: `${existing.username} sudah ada dalam daftar teman Anda` };
      if (existing.requestSent) return { success: false, error: 'Permintaan pertemanan sudah pernah dikirimkan sebelumnya' };
      existing.requestSent = true;
      return { success: true, message: `Permintaan pertemanan berhasil dikirim ke ${existing.username}!` };
    }

    // Add new outgoing pending request
    const newFriend = {
      id: query.startsWith('WL-') ? query.toUpperCase() : `WL-${Math.floor(1000 + Math.random() * 9000)}`,
      username: query,
      avatar: 'avatar_explorer',
      level: 1,
      status: 'offline',
      statusText: 'Menunggu konfirmasi',
      isFriend: false,
      requestSent: true
    };
    this.friends.push(newFriend);
    return { success: true, message: `Permintaan pertemanan berhasil dikirim ke ${query}!` };
  }

  acceptFriend(friendId) {
    const f = this.friends.find(x => x.id === friendId);
    if (f) {
      f.isFriend = true;
      f.requestSent = false;
      this.profile.stats.friendsCount = this.friends.filter(x => x.isFriend).length;
      this.saveProfile();
      return { success: true, friend: f };
    }
    return { success: false, error: 'Pemain tidak ditemukan' };
  }

  removeFriend(friendId) {
    const idx = this.friends.findIndex(x => x.id === friendId);
    if (idx !== -1) {
      const removed = this.friends[idx];
      this.friends.splice(idx, 1);
      this.profile.stats.friendsCount = this.friends.filter(x => x.isFriend).length;
      this.saveProfile();
      return { success: true, friend: removed };
    }
    return { success: false, error: 'Pemain tidak ditemukan' };
  }
}
