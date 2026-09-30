# Peatland & Plantation Monitoring Dashboard

Dashboard pemantauan lahan gambut dan perkebunan: muka air gambut (borehole), subsidence, indeks risiko kebakaran, curah hujan, dan kesehatan tanaman (NDVI). Mendukung peta estate interaktif, pusat alarm, dan laporan.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Recharts (grafik), Leaflet (peta estate), three.js (model 3D digital twin)
- Prisma + MySQL (akun login)

## Konteks data

Data pemantauan saat ini dilayani dari `lib/peatland/mock-data.ts`. Database hanya menyimpan akun dan peran untuk autentikasi. Geometri nyata: batas KHG (`lahan-gambut.ts`) dan sungai/parit (`waterways.ts`) berasal dari OpenStreetMap (© OpenStreetMap contributors, ODbL).

## Setup

```bash
npm install
cp .env.example .env   # isi DATABASE_URL dan AUTH_SECRET
npm run db:push
npm run db:seed
npm run dev
```

`AUTH_SECRET` wajib diisi, minimal 32 karakter:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Mengganti nilainya akan membatalkan semua sesi yang sedang aktif.

Karakter khusus pada password MySQL di `DATABASE_URL` harus di-URL-encode,
mis. `*` → `%2A`, `@` → `%40`. `db:push` membuat database-nya bila belum ada.

### Windows (PowerShell)

```powershell
npm install
Copy-Item .env.example .env   # isi DATABASE_URL dan AUTH_SECRET
npm run db:push
$env:ADMIN_PASSWORD = 'password-pilihanmu'; npm run db:seed; Remove-Item Env:ADMIN_PASSWORD
npm run dev
```

## Akun administrator

`npm run db:seed` membuat tiga peran (Admin, Operator, Viewer) dan satu akun `admin`.
Passwordnya diambil dari env `ADMIN_PASSWORD` dan tidak pernah disimpan di repo:

```bash
printf 'ADMIN_PASSWORD=%s\n' 'password-pilihanmu' > .env.seed
chmod 600 .env.seed
set -a; . ./.env.seed; set +a; npm run db:seed
rm -f .env.seed
```

Seed memakai upsert, jadi menjalankannya ulang hanya menyetel ulang password akun `admin`
tanpa menghapus apa pun. Akun tambahan dibuat manual oleh administrator.

## Autentikasi

Sesi disimpan sebagai cookie `soil_session` — httpOnly, `SameSite=Lax`, berlaku 7 hari, isinya ditandatangani HMAC-SHA256 memakai `AUTH_SECRET`. `proxy.ts` memverifikasi setiap request; tanpa sesi yang sah semua rute dialihkan ke `/login?next=…`, kecuali `/login` sendiri dan endpoint auth.

## Halaman

| Rute | Isi |
|---|---|
| `/` | Overview: KPI, peta estate, alert center, grafik, tabel |
| `/map-view` | Peta estate layar penuh |
| `/digital-twin` | Model 3D estate, replay 7 hari, simulasi skenario pengelolaan air |
| `/peat-monitoring` | Ringkasan stasiun gambut |
| `/peat-monitoring/subsidence` | Penurunan permukaan gambut |
| `/borehole-monitoring` | Muka air per borehole |
| `/weather-rainfall` | Cuaca dan curah hujan |
| `/fire-risk` | Indeks risiko kebakaran dan hotspot |
| `/plantation-health` | Kesehatan tanaman (NDVI) |
| `/agriculture` | Agronomi dan produktivitas |
| `/alerts` | Daftar alarm |
| `/reports` | Laporan |
| `/settings` | Pengaturan |
| `/login` | Halaman masuk |

## Digital twin

`/digital-twin` mengikuti twin Beacon Command Center (be-jogja.com/demo; sumbernya di
repo `beacon-compro`, `src/lib/components/demo-dashboard/twin/`), memakai shell, warna
emerald, dan data yang sama dengan halaman lain (`lib/peatland/mock-data.ts`,
`map-points.ts`):

- Tanah = satu bidang citra satelit Esri (zoom 12) ber-shader: kawasan KHG terang,
  sekitarnya diredupkan, grid halus, tepi memudar; mode Malam memetakan citra ke palet
  emerald gelap. Saat kamera mendekat, patch citra zoom 14 dimuat di sekitar titik orbit.
- Batas kawasan berupa "tirai" tembus pandang yang memudar ke atas dengan garis
  bercahaya teal di dasarnya. Kamera awal ~38°, jarak dan titik tengahnya dicari
  otomatis agar KHG pas di layar.
- Sungai, kanal, dan parit drainase asli dari OpenStreetMap (`lib/peatland/waterways.ts`,
  883 garis, diambil sekali lewat Overpass API) digambar sebagai pita beraliran: sungai
  bernama (Sungai Siak Kecil) paling lebar, parit tipis dan alirannya mengikuti bukaan
  pintu air. Zona kritis dihitung dari jarak ke parit/kanal drainase; saat hujan 3 hari
  tinggi (skenario Heavy Rain) genangan menyebar dari sungai dengan riak.
- Efek pendar (bloom, setelan twin referensi: kekuatan 0.6, radius 0.38, ambang 0.62)
  bisa dimatikan lewat Detail layer → Glow; otomatis mati saat kualitas adaptif turun.
  Resolusi render maks. 1,5×; konteks WebGL dilepas saat halaman ditutup. Shader citra meredam bintik awan putih.
- Link data (layer "Link data"): tiap kanal = rantai relay. Data melompat dari satu
  sensor ke sensor berikutnya lewat busur rendah yang mengikuti garis kanal; paket
  berupa titik bercahaya dan sensor penerima berkedip saat paket tiba. Hotspot VIIRS
  bukan perangkat, jadi hanya dilewati. Rantai tetap tersambung penuh; stasiun offline
  (WTS-03, WTG-02) diberi penanda cincin & lampu suar merah muda berkedip dan label
  OFFLINE putus-putus. Belum ada gateway di model.
  Tidak ada visual per block; filter division tetap meredupkan block lain.
- Sensor ber-halo riak; borehole/WTS berupa tabung ukur berisi air sesuai muka air
  dengan cincin SIAGA −40 dan AWAS −60.
  Klik sensor (di model atau chip kartu) → kamera terbang ke sensor.
- Sel cuaca per penakar hujan (cerah / gerimis / deras dengan petir) mengikuti curah hujan.
- Callout mengikuti pin; yang bertabrakan digeser ke atas dengan garis penunjuk.
- Mode tampilan (panel kanan atas) menyalakan layer yang relevan dan menyaring label:
  **Monitoring** (bawaan: zona kritis, label hanya sensor Siaga/Awas/offline),
  **Hidrologi** (tema muka air, kanal, borehole/WTS/pintu air), **Kebakaran** (tema
  risiko api, hotspot, hujan, stasiun gambut), **Jaringan** (link data, label berisi
  baterai & sinyal dari registri stasiun). Toggle per layer ada di "Detail layer".
- Saat timeline di prakiraan, panggung diberi bingkai & rona biru plus badge
  "PRAKIRAAN · +n hari · skenario", dan nilai callout diberi tanda "≈" (hasil model);
  replay diberi bingkai & badge kuning.
- Kualitas adaptif: bila FPS rata-rata < 30 selama 3 detik, resolusi render dan
  kepadatan hujan diturunkan (maks. dua tingkat). Di layar < 640 px panel mode/layer
  dilipat (tombol lapisan di kanan atas) dan judul HUD diringkas.
- Timeline kontinu (langkah 0,25 hari, diputar tiap 175 ms): replay −6 hari → kini →
  prakiraan, nilai diinterpolasi antar hari.
- Kolom kanan: kartu sensor + sparkline, twin penampang tanah, dampak simulasi, skala EWS.
- Di bawahnya: simulator skenario (curah hujan, bukaan pintu air, horizon, sekat kanal)
  dengan rekomendasi bukaan pintu air (pita −40…−10 cm; −40 cm mengacu PP 57/2016),
  grafik proyeksi, dan tabel per block.

Model hidrologinya sederhana dan hanya ilustratif: neraca air harian (hujan − ET −
drainase kanal) dibagi specific yield, dikalibrasi ke tren turun ~1.3 cm/hari pada
data contoh. Logikanya ada di `lib/peatland/digital-twin.ts`, scene 3D di
`components/peatland/digital-twin-scene.tsx`.

Twin bisa dibuka langsung ke konteks tertentu lewat URL (dipakai tombol "Buka di Twin"
di halaman lain, lihat `twinHref()` di `lib/peatland/stations.ts`):

| Parameter | Contoh | Efek |
|---|---|---|
| `asset` | `?asset=m5` | pilih sensor (id twin) dan terbangkan kamera ke sana |
| `block` | `?block=Block C` | set filter division ke block itu, kamera ke block |
| `layer` | `?layer=fireRisk` | aktifkan Tema data dengan layer itu (`waterTable`, `soilMoisture`, `fireRisk`, `ndvi`, `peatDepth`) |
| `scenario` | `?scenario=dry` | pilih preset skenario (`baseline`, `dry`, `rewet`, `wet`) |

Di dashboard dan Map View, kartu peta punya tombol **2D Peta | 3D Twin** yang memuat twin
live ringkas (`components/peatland/twin-preview.tsx`); klik sensor di sana membuka
halaman Digital Twin dengan sensor itu terpilih.

## Fondasi tampilan bersama

Semua halaman memakai komponen dan data yang sama supaya tampilan dan angka konsisten:

- `lib/peatland/stations.ts` — registri stasiun tunggal (kode, jenis, block, koordinat,
  bacaan, status EWS, baterai/sinyal). Stasiun yang dimodelkan di 3D punya `twinId`.
- `components/peatland/status.tsx` — bahasa status EWS 4 level (Normal / Waspada /
  Siaga / Awas) + offline: `EwsPill`, `StatusDot`, `EwsScale`. Ambang: muka air −30 /
  −40 (PP 57/2016) / −60 cm, risiko api 50 / 70 / 85, kelembapan 45 / 35 / 25 %.
- `components/peatland/panel.tsx` — `Panel`, `PanelHeader` (dengan `kicker` mono),
  `ViewAll`, `TableScroll` + kelas sel tabel.
- `components/peatland/stat-tile.tsx` — kartu KPI (nada EWS, sparkline, tautan).
- `components/peatland/chart-theme.ts` — sumbu, grid, tooltip, pita & garis ambang EWS.
- `components/peatland/open-in-twin.tsx` — tombol/tautan "Buka di Twin".
- Token warna command center (`--tw-*`), kelas `.kicker` / `.peat-scroll`, dan font mono
  JetBrains Mono berlaku global (`app/globals.css`, `app/layout.tsx`).
- Di bawah `lg`, sidebar diganti drawer menu (tombol ☰ di header).

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Sinkronkan schema ke MySQL |
| `npm run db:seed` | Isi role dan akun |
