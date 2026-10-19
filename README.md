# 🌲 Wildlands — 3D Multiplayer Browser Game

**Wildlands** adalah game open-world adventure 3D berbasis WebGL yang berjalan langsung di browser desktop (Chrome, Edge, dll.) dengan fitur online multiplayer real-time.

---

## 🚀 Fitur Utama

- **World & Environment**:
  - Medan bukit bergelombang (*rolling hills*) dengan variasi ketinggian dan tebing batu menggunakan procedural multi-octave noise.
  - Jalan setapak (*winding dirt path*) yang menghubungkan landmark perkemahan dan menara pantau.
  - Formasi pegunungan di kejauhan sebagai batas dunia alami.
  - Vegetasi lebat (*InstancedMesh* untuk ratusan pohon pinus, pohon ek/deciduous, semak belukar) dengan performa tinggi (draw calls minimal).
  - Landmark 3D: Menara Pantau Kayu (*Outpost Watchtower*), Pondok Pelopor (*Pioneer Cabin*), Lingkaran Batu Kuno (*Ancient Stone Ruins*), Jembatan Kayu, dan Api Unggun hangat (*Campfire*).
  - Sistem atmosfer: pencahayaan matahari dengan bayangan lembut dinamis, pencahayaan *hemisphere ambient*, kabut atmosferik, dan *sky dome* gradien.

- **Karakter & Animasi**:
  - Model petualang 3D prosedural lengkap (jaket penjelajah, tas ransel perlengkapan, topi, anggota badan terartikulasi).
  - Sistem animasi prosedural berbasis waktu: *idle* (nafas lembut), *walk* (langkah teratur), *run* (sprint condong ke depan), dan *jump* (kaki terangkat seimbang).
  - Papan nama 3D mengambang di atas kepala pemain (*overhead floating badge*).

- **Fisika & Kontrol**:
  - Pergerakan sinkron dengan sudut pandang kamera (WASD).
  - Sprint berkecepatan tinggi dengan Shift.
  - Gravitasi dan lompatan stabil (Space) dengan deteksi ketinggian tanah (*ground height sampling*).
  - Kamera third-person halus (*orbital spring-arm*) yang dilengkapi pencegah tembus pandang (*anti-clipping*) terhadap tanah dan bangunan.

- **Multiplayer Real-time**:
  - Arsitektur client-server berbasis Socket.IO.
  - Tick rate server 20 Hz dengan validasi kecepatan gerak (*anti-speedhack*) dan batas dunia (*world bounds*).
  - Interpolasi pergerakan halus (*exponential lerp/slerp*) untuk pemain lain tanpa lag atau teleportasi.
  - Pengukuran latensi real-time (*ping-pong*).
  - Daftar pemain aktif (*Tab scoreboard*) dan notifikasi toast saat pemain masuk/keluar.

- **Antarmuka & Pengaturan**:
  - Desain modern minimalis bernuansa alam dengan efek *frosted glass* (`backdrop-filter: blur`).
  - Menu awal untuk memilih nama dan preset grafis (*Low*, *Medium*, *High*).
  - HUD informatif: status koneksi, ping, jumlah pemain, koordinat X/Y/Z, serta crosshair tengah.
  - Menu Pause (Esc) untuk pengaturan sensitivitas mouse dan kualitas grafis.

---

## 📂 Struktur Proyek

```
wildlands/
├── package.json              # Script monorepo untuk menjalankan server & client
├── server/
│   ├── package.json          # Server dependencies (Express, Socket.IO, CORS)
│   └── src/
│       ├── config.js         # Konfigurasi tick rate, batas dunia, kecepatan
│       ├── gameServer.js     # Logika server otoritatif, room state & validasi
│       └── index.js          # Entry point server HTTP & Socket.IO
├── client/
│   ├── package.json          # Client dependencies (Three.js, Socket.IO Client, Vite)
│   ├── vite.config.js        # Konfigurasi Vite
│   ├── index.html            # Template HTML UI & Canvas Three.js
│   └── src/
│       ├── main.js           # Entry point inisialisasi game
│       ├── core/
│       │   ├── Game.js       # Koordinator engine, loop render & world
│       │   ├── InputManager.js # Keyboard, mouse look & pointer lock
│       │   └── CameraController.js # Kamera third-person anti-clipping
│       ├── world/
│       │   ├── Terrain.js    # Medan bukit, jalan, pewarnaan PBR
│       │   ├── Vegetation.js # Ratusan pohon instanced (Pine, Oak, Bush)
│       │   ├── Buildings.js  # Menara pantau, kabin, reruntuhan batu, jembatan
│       │   └── Atmosphere.js # Matahari, bayangan dinamis, fog, sky dome
│       ├── entities/
│       │   ├── CharacterModel.js # Model petualang 3D & animasi prosedural
│       │   ├── Player.js     # Kontroler pemain lokal (fisika & gravitasi)
│       │   └── RemotePlayer.js # Entitas pemain jaringan dengan interpolasi
│       ├── network/
│       │   └── NetworkManager.js # Socket.IO client, rate-limit sync & ping
│       ├── ui/
│       │   ├── UIManager.js  # Menu awal, HUD, tab scoreboard, pause modal
│       │   └── styles.css    # Style nature-inspired modern
│       └── utils/
│           ├── MathUtils.js  # Lerp, damp, clamp, normalisasi sudut
│           └── Noise.js      # Simplex / Perlin noise generator
└── test/
    └── multiPlayerSimulation.js # Skrip otomatis QA simulasi 2 pemain
```

---

## 🛠️ Instalasi & Cara Menjalankan

### 1. Instal Dependensi
Jalankan di root folder:
```powershell
cd C:\Users\kusyn\wildlands
npm install
cd server; npm install
cd ../client; npm install
cd ..
```

### 2. Jalankan Mode Pengembangan (Server + Client Sekaligus)
Di root folder:
```powershell
npm run dev
```
- **Frontend** akan berjalan di: `http://localhost:5173`
- **Backend Multiplayer** akan berjalan di: `http://localhost:3001`

*(Atau jalankan terpisah)*:
- Backend saja: `npm run server`
- Frontend saja: `npm run client`

### 3. Build Production
```powershell
npm run build
```

### 4. Uji Integrasi Multiplayer Otomatis
Pastikan server sedang aktif, lalu jalankan:
```powershell
npm run test:multiplayer
```

---

## 🎮 Panduan Kontrol

| Tombol | Fungsi |
|---|---|
| **W, A, S, D** | Bergerak maju, kiri, mundur, kanan |
| **Shift** | Sprint (lari cepat) |
| **Space** | Melompat (*Jump*) |
| **Mouse Bergerak** | Mengarahkan kamera pandangan |
| **Mouse Click** | Mengunci kursor mouse (*Pointer Lock*) |
| **Mouse Wheel** | Zoom in / Zoom out jarak kamera |
| **Tab** (Tahan) | Menampilkan daftar pemain yang sedang online |
| **Escape (Esc)** | Pause / Buka menu pengaturan |

---

## 🔒 Roadmap Pengembangan Lanjutan

1. **Database & Akun**: Integrasi MySQL dengan password hashing (bcrypt) dan penyimpanan koordinat terakhir pemain.
2. **Chunk Streaming**: Pembagian dunia ke dalam chunk berjarak untuk memperluas peta tanpa membebani memori.
3. **Interaksi & Inventaris**: Memungut ranting kayu, batu, obor malam hari, dan sistem crafting sederhana.
4. **NPC & Satwa Liar**: Hewan liar penjelajah di hutan serta quest penjelajah di pos penjagaan.
