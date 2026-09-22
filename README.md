# Peatland & Plantation Monitoring Dashboard

Dashboard pemantauan lahan gambut dan perkebunan: muka air gambut (borehole), subsidence, indeks risiko kebakaran, curah hujan, dan kesehatan tanaman (NDVI). Mendukung peta estate interaktif, pusat alarm, dan laporan.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 + shadcn/ui
- Recharts (grafik), Leaflet (peta estate)
- Prisma + MySQL (akun login)

## Konteks data

Data pemantauan saat ini dilayani dari `lib/peatland/mock-data.ts`. Database hanya menyimpan akun dan peran untuk autentikasi.

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

## Akun seed

| Username | Password | Peran |
|---|---|---|
| `admin` | `admin123` | Admin |
| `operator` | `operator123` | Operator |
| `viewer` | `viewer123` | Viewer |

## Autentikasi

Sesi disimpan sebagai cookie `soil_session` — httpOnly, `SameSite=Lax`, berlaku 7 hari, isinya ditandatangani HMAC-SHA256 memakai `AUTH_SECRET`. `middleware.ts` memverifikasi setiap request; tanpa sesi yang sah semua rute dialihkan ke `/login?next=…`, kecuali `/login` sendiri dan endpoint auth.

## Halaman

| Rute | Isi |
|---|---|
| `/` | Overview: KPI, peta estate, alert center, grafik, tabel |
| `/map-view` | Peta estate layar penuh |
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

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan |
| `npm run build` | Build produksi |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Sinkronkan schema ke MySQL |
| `npm run db:seed` | Isi role dan akun |
