/**
 * Authoritative Lobby Data Service for Wildlands Multiplayer
 */

export const LOBBY_DATA = {
  events: [
    {
      id: 'evt_harvest_2026',
      title: 'Festival Panen Lembah',
      category: 'Festival',
      badge: 'Musiman',
      bannerColor: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
      startDate: '2026-10-15T00:00:00Z',
      endDate: '2026-10-31T23:59:59Z',
      description: 'Rayakan hasil panen melimpah bersama Pak Joko di ladang Valley Village. Kunjungi plot tanaman, bantu tumpukan karung gandum, dan klaim hadiah eksklusif musiman.',
      objectives: [
        'Kunjungi Ladang Tani di koordinat (34, -6)',
        'Bicara dengan Petani Pak Joko',
        'Kumpulkan 3 berkas gandum panen'
      ],
      rewards: {
        xp: 500,
        gold: 350,
        title: 'Pemanen Lembah'
      },
      minLevel: 1,
      participantsCount: 42
    },
    {
      id: 'evt_ancient_woods',
      title: 'Misteri Hutan Kuno & Pondok Tua',
      category: 'Eksplorasi',
      badge: 'Spesial',
      bannerColor: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
      startDate: '2026-10-18T00:00:00Z',
      endDate: '2026-11-05T23:59:59Z',
      description: 'Sebuah rumah tua lapuk ditemukan di perbatasan rimba barat daya. Temui Pertapa Mbah Roso yang bermeditasi di teras gubuk tua untuk mempelajari rahasia tanah Wildlands kuno.',
      objectives: [
        'Temukan Rumah Tua Lapuk di (-55, -35)',
        'Sapa Pertapa Mbah Roso',
        'Periksa roda gerobak tua di halaman'
      ],
      rewards: {
        xp: 800,
        gold: 500,
        title: 'Penjelajah Rimba'
      },
      minLevel: 1,
      participantsCount: 28
    },
    {
      id: 'evt_guard_tournament',
      title: 'Ujian Ketangkasan Penjaga Desa',
      category: 'Kompetisi',
      badge: 'Mendatang',
      bannerColor: 'linear-gradient(135deg, #f59e0b 0%, #78350f 100%)',
      startDate: '2026-11-08T00:00:00Z',
      endDate: '2026-11-22T23:59:59Z',
      description: 'Ksatria Rian menggelar patroli ketangkasan bagi para petualang muda untuk memperkuat pertahanan desa dari ancaman alam liar.',
      objectives: [
        'Ikuti rute patroli 4 pos keliling desa',
        'Pertahankan kecepatan lari sprint 100 meter',
        'Lapor kembali ke Penjaga Rian'
      ],
      rewards: {
        xp: 1200,
        gold: 750,
        title: 'Pengawal Kehormatan'
      },
      minLevel: 2,
      participantsCount: 15
    },
    {
      id: 'evt_pioneer_fair',
      title: 'Pekan Raya Pembuka Wildlands',
      category: 'Sejarah',
      badge: 'Selesai',
      bannerColor: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
      startDate: '2026-09-20T00:00:00Z',
      endDate: '2026-10-05T23:59:59Z',
      description: 'Pekan pembukaan awal eksplorasi perintis di lembah Wildlands telah selesai dengan sukses.',
      objectives: [
        'Kunjungi tenda perintis',
        'Nyalakan api unggun'
      ],
      rewards: {
        xp: 300,
        gold: 200,
        title: 'Perintis Awal'
      },
      minLevel: 1,
      participantsCount: 86
    }
  ],

  missions: [
    // Harian (Daily)
    {
      id: 'msn_daily_walk',
      type: 'daily',
      name: 'Langkah Awal Penjelajah',
      category: 'Eksplorasi',
      description: 'Jelajahi keindahan alam liar Wildlands dan tempuh jarak 200 meter.',
      target: 200,
      unit: 'meter',
      progress: 0,
      reward: { xp: 120, gold: 60 },
      isClaimed: false
    },
    {
      id: 'msn_daily_village',
      type: 'daily',
      name: 'Kunjungan ke Desa Lembah',
      category: 'Lokasi',
      description: 'Kunjungi kawasan pemukiman Herbalist Cottage di Valley Village (42, 28).',
      target: 1,
      unit: 'kali',
      progress: 0,
      reward: { xp: 150, gold: 80 },
      isClaimed: false
    },
    {
      id: 'msn_daily_merchant',
      type: 'daily',
      name: 'Sapaan Ramah Pedagang',
      category: 'Sosial',
      description: 'Kunjungi kios pasar Mang Asep di (14, 2) dan dapatkan lambaian tangan salamnya.',
      target: 1,
      unit: 'kali',
      progress: 0,
      reward: { xp: 100, gold: 50 },
      isClaimed: false
    },

    // Mingguan (Weekly)
    {
      id: 'msn_weekly_distance',
      type: 'weekly',
      name: 'Maraton Sabana & Perbukitan',
      category: 'Eksplorasi',
      description: 'Jelajahi lembah, bukit timur, dan padang rumput hingga total 1.000 meter.',
      target: 1000,
      unit: 'meter',
      progress: 0,
      reward: { xp: 450, gold: 250 },
      isClaimed: false
    },
    {
      id: 'msn_weekly_ruins',
      type: 'weekly',
      name: 'Pencari Jejak Reruntuhan',
      category: 'Misteri',
      description: 'Kunjungi Reruntuhan Batu Kuno di (-40, 38) dan Rumah Tua Lapuk di (-55, -35).',
      target: 2,
      unit: 'lokasi',
      progress: 0,
      reward: { xp: 500, gold: 300 },
      isClaimed: false
    },

    // Eksplorasi (Exploration)
    {
      id: 'msn_exp_bridge',
      type: 'exploration',
      name: 'Menyeberangi Jembatan Kayu',
      category: 'Landmark',
      description: 'Berjalan melewati Jembatan Kayu di atas aliran lembah utara (-5, 60).',
      target: 1,
      unit: 'kali',
      progress: 0,
      reward: { xp: 200, gold: 120 },
      isClaimed: false
    },
    {
      id: 'msn_exp_well',
      type: 'exploration',
      name: 'Sumber Air Kehidupan Desa',
      category: 'Landmark',
      description: 'Kunjungi Sumur Desa dan temui Kakek Danu yang bersantai di bangku (6, 22).',
      target: 1,
      unit: 'kali',
      progress: 0,
      reward: { xp: 220, gold: 140 },
      isClaimed: false
    },
    {
      id: 'msn_exp_hermit',
      type: 'exploration',
      name: 'Pertapa di Tepi Rimba',
      category: 'Misteri',
      description: 'Temukan pondok tersembunyi Mbah Roso di barat daya dan amati meditasinya.',
      target: 1,
      unit: 'kali',
      progress: 0,
      reward: { xp: 350, gold: 200 },
      isClaimed: false
    },

    // Sosial (Social)
    {
      id: 'msn_soc_friend',
      type: 'social',
      name: 'Menjalin Kawan Baru',
      category: 'Komunitas',
      description: 'Kirim atau terima permintaan pertemanan dengan penjelajah lain di Wildlands.',
      target: 1,
      unit: 'teman',
      progress: 0,
      reward: { xp: 150, gold: 100 },
      isClaimed: false
    }
  ],

  news: [
    {
      id: 'news_update_living_world',
      featured: true,
      category: 'Update Game',
      categoryBadge: 'V2.0 UPDATE',
      title: 'Wildlands 2.0: Living World Update & Sistem Lobby Multiplayer Profesional',
      date: '19 Oktober 2026',
      readTime: '3 min baca',
      author: 'Tim Developer Wildlands',
      summary: 'Pembaruan akbar menghadirkan pemukiman pedesaan yang hidup, rumah tua lapuk berlumut, 10 NPC manusia 3D profesional dengan ragam aktivitas nyata, kontrol landscape mobile responsif, serta sistem lobby online lengkap.',
      content: `### Selamat Datang di Wildlands 2.0!

Kami dengan bangga mempersembahkan pembaruan terbesar Wildlands:

1. **Permukiman & Ragam Arsitektur Alam**:
   - Tiga rumah pondok pedesaan (*Rural Cottages*) di lembah dan lereng bukit timur.
   - Dua rumah tua lapuk (*Old Weathered Houses*) di tepi rimba belantara dengan kayu aus, kaso atap patah, jendela berpalang, cerobong miring retak, dan gerobak tua roboh.
   - Fasilitas desa lengkap: Kios Pasar buah-sayuran Mang Asep, Ladang Tani bajakan Pak Joko, serta Sumur Batu dan Bangku Kayu santai.

2. **10 Penduduk NPC Manusia 3D Hidup**:
   - Seluruh NPC kini menggunakan model manusia 3D rigged bertekstur asli sesuai profesinya (Petani ber-cangkul, Penyiram Bunga, Pedagang ramah yang melambai saat didekati, Tetua bersantai di bangku, Pengangkut peti kargo kayu, Penyapu halaman, Ksatria penjaga patroli lengkap dengan pedang & perisai, warga yang saling bercakap-cakap, serta Pertapa hutan yang bermeditasi).

3. **Lobby Game Online Profesional**:
   - Navigasi lengkap mencakup Beranda Lobby, Event, Misi, Berita & Pengumuman, Sistem Teman Sosial, Profil Penjelajah, serta Pengaturan Grafis/Audio.
   - Transisi mulus sekali klik untuk **MASUK DUNIA** 3D tanpa perlu memuat ulang halaman!`
    },
    {
      id: 'news_event_harvest',
      featured: false,
      category: 'Event',
      categoryBadge: 'EVENT MUSIMAN',
      title: 'Festival Panen Lembah Telah Dimulai — Dapatkan Hadiah Eksklusif!',
      date: '18 Oktober 2026',
      readTime: '2 min baca',
      author: 'Dewan Warga Lembah',
      summary: 'Bantu Pak Joko memanen sayuran di ladang desa dan selesaikan tantangan panen untuk mengklaim 500 XP dan gelar Pemanen Lembah.',
      content: `Musim panen telah tiba di lembah Wildlands! Kunjungi ladang subur di koordinat (34, -6) untuk membantu Pak Joko merawat petak tanaman dan mengumpulkan hasil panen. Event ini terbuka untuk seluruh penjelajah dari level 1.`
    },
    {
      id: 'news_responsive_fullscreen',
      featured: false,
      category: 'Pengumuman',
      categoryBadge: 'FITUR BARU',
      title: 'Optimalisasi Mode Fullscreen Landscape & Virtual Touch Joystick',
      date: '17 Oktober 2026',
      readTime: '2 min baca',
      author: 'Engine Team',
      summary: 'Pengalaman bermain kini dioptimalkan penuh untuk orientasi horizontal landscape, kontrol sentuh multi-touch 360 derajat di HP, serta integrasi tombol Fullscreen API.',
      content: `Kini Anda dapat menjelajahi dunia Wildlands dalam orientasi landscape penuh baik di PC desktop maupun smartphone dengan performa 60 FPS stabil dan tombol aksi yang nyaman digenggam.`
    },
    {
      id: 'news_patch_notes_v14',
      featured: false,
      category: 'Perbaikan Bug',
      categoryBadge: 'PATCH NOTES',
      title: 'Catatan Perbaikan Patch v1.4.2: Kestabilan AI NPC & Sinkronisasi 20Hz',
      date: '16 Oktober 2026',
      readTime: '1 min baca',
      author: 'Core Systems',
      summary: 'Perbaikan transisi state machine pada obrolan warga desa, penyesuaian collision kotak bangunan, dan pengoptimalan memori rendering Three.js.',
      content: `Patch ini memfokuskan pada pembersihan bug script animasi NPC, grounding raycast yang presisi di tanjakan bukit, serta stabilitas transmisi paket gerak pemain di server multiplayer.`
    }
  ],

  suggestedFriends: [
    {
      id: 'WL-1082',
      username: 'Ranger_Bima',
      avatar: 'avatar_ranger',
      level: 5,
      status: 'online',
      statusText: 'Berkelana di Rimba Barat',
      isFriend: false,
      requestSent: false
    },
    {
      id: 'WL-2491',
      username: 'Citra_Explorer',
      avatar: 'avatar_mage',
      level: 4,
      status: 'online',
      statusText: 'Di Pasar Desa',
      isFriend: true,
      requestSent: false
    },
    {
      id: 'WL-3392',
      username: 'Arya_Hunter',
      avatar: 'avatar_knight',
      level: 7,
      status: 'in_game',
      statusText: 'Patroli Menara Pengawas',
      isFriend: true,
      requestSent: false
    },
    {
      id: 'WL-4819',
      username: 'Nadia_Wanderer',
      avatar: 'avatar_rogue',
      level: 3,
      status: 'offline',
      statusText: 'Terakhir online 2 jam lalu',
      isFriend: false,
      requestSent: false
    },
    {
      id: 'WL-5920',
      username: 'Gilang_Rider',
      avatar: 'avatar_barbarian',
      level: 6,
      status: 'online',
      statusText: 'Di Tepi Jembatan Kayu',
      isFriend: false,
      requestSent: false
    }
  ]
};
