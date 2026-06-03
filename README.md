# Dashboard Pemantauan Irigasi

Dashboard monitoring Daerah Irigasi berbasis sensor muka air (AWLR), flow meter (debit), status pintu air, dan stasiun cuaca + kelembaban tanah. Mendukung monitoring realtime, kontrol/otomasi pintu air, alarm, dan laporan distribusi air.

## Stack

- Next.js 16 App Router + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Prisma ORM + MySQL
- Leaflet (peta jaringan irigasi)
- Recharts (time-series chart)

## Ruang Lingkup Awal

- **Konteks:** 1 Daerah Irigasi tunggal (DI Demo) dengan hierarki saluran primer → sekunder → tersier.
- **Sensor:** AWLR (tinggi muka air), flow meter (debit), aktuator pintu air, weather station, soil moisture.
- **Kontrol:** Monitoring + kontrol otomatis (manual/jadwal/alarm). Transport hardware (MQTT/HTTP) ditambah setelah UI siap.
- **Auth:** Belum diaktifkan — fokus UI dulu.

## Setup

```env
DATABASE_URL="mysql://root:madiun2001@localhost:3306/irigasi_dashboard"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

```sql
CREATE DATABASE IF NOT EXISTS irigasi_dashboard;
```

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Lalu buka `http://localhost:3000`.

### MySQL via Docker (opsional)

```bash
docker compose up -d mysql
```

## Halaman

| Path | Isi |
|---|---|
| `/` | Dashboard utama (KPI debit, muka air, pintu aktif, alarm, cuaca) |
| `/peta-jaringan` | Peta jaringan irigasi (saluran + pintu + sensor) |
| `/muka-air` | Time series tinggi muka air per titik |
| `/debit` | Time series debit per titik |
| `/pintu-air` | Status, kontrol manual, jadwal otomatis, log aktuasi |
| `/cuaca-tanah` | Soil moisture, hujan, ET₀, rekomendasi irigasi |
| `/analisa-data` | Analisa lintas parameter |
| `/alarm` | Alarm & event aktif/historis |
| `/laporan` | Laporan distribusi air |
| `/perangkat` | Status logger/sensor/aktuator |
| `/pengaturan` | Threshold, mode global, ambang alarm |

## Catatan

Schema dan seed mendefinisikan 1 DI Demo + saluran + 5 pintu air + 8 titik sensor + readings 7 hari. Halaman akan error tanpa seed atau `DATABASE_URL` aktif.
