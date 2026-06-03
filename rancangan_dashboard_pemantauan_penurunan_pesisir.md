# Rancangan Dashboard Pemantauan Penurunan Pesisir Pantai

## 1. Gambaran Umum

Dashboard ini dirancang untuk memantau kondisi penurunan tanah di wilayah pesisir secara real-time dan historis. Sistem menggabungkan data dari titik GNSS, AWLR/tide station, CCTV visual monitoring, serta perangkat telemetry logger untuk membantu analisis risiko penurunan tanah, banjir rob, dan kondisi operasional perangkat di lapangan.

Dashboard ini tidak menggunakan layer InSAR. Fokus utama sistem adalah data sensor lapangan yang dikirim secara berkala ke platform monitoring.

## 2. Tujuan Sistem

Tujuan utama dashboard:

1. Memantau laju penurunan tanah di area pesisir.
2. Menampilkan kondisi muka air laut atau pasang surut secara real-time.
3. Mengidentifikasi area yang berpotensi terdampak rob.
4. Menyediakan peta titik monitoring dan status risiko.
5. Menampilkan status perangkat lapangan seperti GNSS, AWLR, logger, baterai, dan koneksi.
6. Memberikan alarm otomatis jika terjadi kondisi berbahaya.
7. Menyediakan laporan teknis untuk kebutuhan instansi, pemda, kementerian, atau stakeholder proyek.
8. Mendukung analisis tren, prediksi sederhana, dan ringkasan kondisi harian.

## 3. Sumber Data Utama

| Sumber Data | Fungsi |
|---|---|
| GNSS Realtime Monitoring | Memantau perubahan posisi vertikal tanah |
| AWLR / Tide Station | Memantau muka air laut, pasang surut, dan potensi rob |
| CCTV Pesisir | Memantau kondisi visual area pantai, tanggul, jalan, dan genangan |
| Telemetry Logger | Mengirim data sensor, status baterai, sinyal, dan kesehatan perangkat |
| Sensor Cuaca Opsional | Curah hujan, suhu, kelembapan, tekanan udara, dan angin |
| Data Manual Lapangan | Catatan inspeksi, foto dokumentasi, dan laporan kejadian |

## 4. Stack Web

### Frontend

| Komponen | Teknologi |
|---|---|
| Framework | Next.js App Router |
| Bahasa | TypeScript |
| UI Library | shadcn/ui |
| Styling | Tailwind CSS |
| Icon | Lucide React |
| Chart | Recharts |
| Peta | MapLibre GL JS atau Leaflet |
| State Management | Zustand atau React Context |
| Data Fetching | TanStack Query / Server Actions |
| Form | React Hook Form + Zod |
| Table | TanStack Table |
| Auth UI | shadcn/ui + NextAuth/Auth.js |

### Backend dan Data

| Komponen | Teknologi |
|---|---|
| API Layer | Next.js Route Handler atau Backend terpisah |
| Database | MySQL |
| ORM | Prisma |
| Realtime Data | MQTT WebSocket / Socket.IO |
| File Storage | Local storage, S3-compatible storage, atau MinIO |
| Report Export | PDFKit / Playwright PDF / jsPDF |
| Background Job | Node Cron, BullMQ, atau worker service |
| Notification | Email, WhatsApp Gateway, Telegram, atau SMS Gateway |

### Deployment

| Komponen | Rekomendasi |
|---|---|
| Hosting | VPS / Plesk / Docker |
| Web Server | Nginx |
| SSL | Let's Encrypt |
| Process Manager | PM2 atau Docker Compose |
| Monitoring | Uptime Kuma / Grafana / Prometheus opsional |

## 5. Struktur Menu Utama

| Menu | Fungsi |
|---|---|
| Dashboard | Ringkasan kondisi terkini |
| Peta Risiko | Peta titik monitoring, zona risiko, dan status area |
| Data GNSS | Detail penurunan tanah per titik |
| Data AWLR / Tide | Data muka air laut dan pasang surut |
| CCTV Monitoring | Tampilan kamera dan snapshot lapangan |
| Analisis Risiko | Korelasi subsidence, muka air, hujan, dan potensi rob |
| Alarm & Event | Riwayat alarm, kejadian, dan status tindak lanjut |
| Laporan | Export laporan harian, bulanan, dan per lokasi |
| Perangkat | Status logger, baterai, sinyal, dan koneksi |
| Pengaturan | Threshold, lokasi, user, role, dan notifikasi |

## 6. Dashboard Utama

Dashboard utama berfungsi sebagai halaman ringkasan untuk melihat kondisi keseluruhan area pesisir.

### Komponen Utama

| Komponen | Isi |
|---|---|
| Header | Nama sistem, pilihan lokasi, status update terakhir |
| KPI Cards | Penurunan maksimum, muka air terkini, risiko rob, titik aktif, alarm aktif |
| Peta Ringkas | Lokasi GNSS, AWLR, CCTV, dan status risiko |
| Panel Risiko | Daftar area dengan status tertinggi |
| Grafik Tren | Tren penurunan tanah dan muka air |
| Alarm Terbaru | Alarm perangkat, rob, atau penurunan ekstrem |
| CCTV Snapshot | Snapshot visual dari titik kritis |

### Contoh KPI

| KPI | Contoh Nilai |
|---|---|
| Penurunan Maksimum | -8.2 cm/tahun |
| Rata-rata Penurunan | -3.4 cm/tahun |
| Muka Air Laut Terkini | 1.42 m |
| Risiko Rob | Siaga |
| Titik Monitoring Aktif | 18/20 Online |
| Alarm Aktif | 3 Alarm |

## 7. Peta Risiko Pesisir

Peta menjadi pusat navigasi utama untuk memahami kondisi spasial area pesisir.

### Layer Peta

| Layer | Fungsi |
|---|---|
| Titik GNSS | Menampilkan lokasi pemantauan penurunan tanah |
| Titik AWLR/Tide | Menampilkan lokasi pemantauan muka air |
| Titik CCTV | Menampilkan kamera aktif di lokasi pesisir |
| Zona Risiko Rob | Area dengan potensi genangan |
| Zona Penurunan Tanah | Klasifikasi area berdasarkan laju penurunan |
| Infrastruktur Penting | Jalan, tanggul, pelabuhan, permukiman, pintu air |
| Batas Administrasi | Desa, kecamatan, kabupaten/kota |

### Interaksi Peta

1. Klik marker untuk melihat detail titik.
2. Filter berdasarkan jenis sensor.
3. Filter berdasarkan status Normal, Waspada, Siaga, dan Awas.
4. Toggle layer zona risiko.
5. Lihat tooltip cepat berisi data terbaru.
6. Buka halaman detail lokasi dari marker.
7. Export tampilan peta sebagai gambar atau PDF.

## 8. Detail Titik GNSS

Halaman ini menampilkan informasi detail dari setiap titik GNSS.

### Informasi Titik

| Data | Keterangan |
|---|---|
| Nama Titik | Nama pos monitoring |
| Koordinat | Latitude dan longitude |
| Elevasi Awal | Elevasi saat baseline |
| Elevasi Terkini | Elevasi hasil pengamatan terbaru |
| Total Penurunan | Selisih dari baseline |
| Laju Penurunan | mm/bulan atau cm/tahun |
| Status Risiko | Normal, Waspada, Siaga, Awas |
| Kualitas Data | Valid, perlu verifikasi, atau anomali |
| Last Update | Waktu data terakhir diterima |

### Grafik

| Grafik | Fungsi |
|---|---|
| Time Series Elevasi | Menampilkan perubahan elevasi dari waktu ke waktu |
| Laju Penurunan | Menampilkan velocity subsidence |
| Perbandingan Antar Titik | Membandingkan beberapa titik GNSS |
| Deviation Chart | Menampilkan deviasi dari baseline |
| Data Quality Chart | Menampilkan gap data, noise, dan validitas data |

## 9. Data AWLR / Tide Station

Halaman ini menampilkan kondisi muka air laut atau pasang surut.

### Fitur

| Fitur | Fungsi |
|---|---|
| Water Level Realtime | Muka air terkini |
| Grafik Pasang Surut | Data historis dan tren |
| Ambang Rob | Batas waspada, siaga, dan awas |
| Event Pasang Tinggi | Riwayat kejadian pasang ekstrem |
| Perbandingan Dengan Elevasi Tanah | Melihat hubungan muka air dan penurunan tanah |
| Prediksi Sederhana | Estimasi potensi jam rawan berdasarkan pola historis |

### Indikator

| Parameter | Contoh |
|---|---|
| Muka Air Saat Ini | 1.42 m |
| Ambang Waspada | 1.60 m |
| Ambang Siaga | 1.80 m |
| Ambang Awas | 2.00 m |
| Status | Siaga |
| Jam Rawan | 21.00–23.00 |

## 10. CCTV Monitoring

CCTV digunakan sebagai validasi visual kondisi lapangan.

### Fitur

| Fitur | Fungsi |
|---|---|
| Live View | Menampilkan kamera secara langsung |
| Snapshot Berkala | Menyimpan gambar tiap interval tertentu |
| Before-After View | Membandingkan kondisi normal dan kondisi genangan |
| Event Snapshot | Snapshot otomatis saat alarm terjadi |
| Camera Health | Status online, offline, dan kualitas gambar |
| Catatan Visual | Operator dapat menambahkan catatan inspeksi |

### Potensi Fitur AI Visual

| Fitur | Fungsi |
|---|---|
| Deteksi Genangan | Mengenali area yang tergenang |
| Deteksi Jalan Tertutup | Mengenali potensi gangguan akses |
| Deteksi Kerusakan Visual | Membantu indikasi kerusakan tanggul atau fasilitas |
| Kualitas Kamera | Mendeteksi gambar buram, gelap, overexposed, atau noise tinggi |

## 11. Analisis Risiko

Halaman analisis risiko menggabungkan beberapa parameter untuk membantu pengambilan keputusan.

### Parameter Analisis

| Parameter | Sumber |
|---|---|
| Laju Penurunan Tanah | GNSS |
| Total Penurunan | GNSS |
| Muka Air Laut | AWLR/Tide |
| Curah Hujan | Sensor cuaca opsional |
| Elevasi Area | Data topografi/manual |
| Riwayat Rob | Event historis |
| Status Perangkat | Logger dan sensor |

### Risk Scoring

Risk scoring dapat dibuat dengan pendekatan rule-based di tahap awal.

Contoh komponen skor:

| Komponen | Bobot Awal |
|---|---|
| Laju penurunan tanah | 35% |
| Muka air laut terhadap ambang | 30% |
| Riwayat kejadian rob | 15% |
| Curah hujan | 10% |
| Status perangkat dan kualitas data | 10% |

### Klasifikasi Risiko

| Status | Kriteria Umum |
|---|---|
| Normal | Kondisi stabil, tidak melewati ambang |
| Waspada | Ada tren peningkatan risiko |
| Siaga | Parameter utama mendekati atau melewati ambang |
| Awas | Risiko tinggi dan membutuhkan respons cepat |

## 12. Alarm & Event

Modul ini menampilkan semua peringatan dan kejadian penting.

### Jenis Alarm

| Alarm | Kondisi |
|---|---|
| Subsidence Alert | Laju penurunan melebihi threshold |
| Water Level Alert | Muka air melewati ambang |
| Rob Risk Alert | Kombinasi tanah turun dan muka air tinggi |
| Device Offline | Perangkat tidak mengirim data |
| Battery Low | Tegangan baterai rendah |
| Signal Weak | Kualitas jaringan buruk |
| Data Gap | Data tidak masuk dalam periode tertentu |
| Camera Offline | CCTV tidak dapat diakses |

### Fitur Event Management

1. Daftar alarm aktif.
2. Riwayat alarm.
3. Filter berdasarkan lokasi, status, dan waktu.
4. Detail penyebab alarm.
5. Catatan tindak lanjut operator.
6. Status penyelesaian: Open, In Progress, Resolved.
7. Export riwayat alarm.

## 13. Laporan

Modul laporan digunakan untuk kebutuhan teknis dan manajerial.

### Jenis Laporan

| Laporan | Isi |
|---|---|
| Laporan Harian | Kondisi terkini, alarm, dan status perangkat |
| Laporan Mingguan | Tren penurunan dan muka air |
| Laporan Bulanan | Analisis risiko, grafik, dan rekomendasi |
| Laporan Per Titik | Detail data GNSS/AWLR per lokasi |
| Laporan Event | Dokumentasi kejadian rob atau alarm |
| Executive Summary | Ringkasan singkat untuk pimpinan |

### Format Export

1. PDF.
2. Excel.
3. CSV.
4. PNG untuk grafik dan peta.
5. JSON untuk integrasi API.

## 14. Perangkat dan Telemetry Logger

Halaman ini digunakan untuk monitoring kesehatan perangkat lapangan.

### Data Perangkat

| Data | Fungsi |
|---|---|
| Status Online/Offline | Memastikan perangkat aktif |
| Battery Voltage | Memantau kondisi daya |
| Solar Charging | Memantau pengisian daya panel surya |
| Signal Strength | Memantau kualitas komunikasi |
| Last Data Received | Mengetahui waktu data terakhir |
| Firmware Version | Dokumentasi versi perangkat |
| Sensor Status | Status GNSS, AWLR, CCTV, dan sensor tambahan |
| Maintenance Note | Catatan perawatan lapangan |

### Fitur Operasional

1. Filter perangkat berdasarkan status.
2. Deteksi perangkat tidak aktif.
3. Riwayat koneksi.
4. Riwayat baterai.
5. Jadwal maintenance.
6. Catatan teknisi.
7. Export daftar perangkat.

## 15. Pengaturan

### Pengaturan Sistem

| Pengaturan | Fungsi |
|---|---|
| Lokasi Monitoring | Tambah/edit area dan titik |
| Threshold Subsidence | Batas Normal, Waspada, Siaga, Awas |
| Threshold Water Level | Batas muka air untuk rob |
| Notifikasi | Email, WhatsApp, Telegram, atau SMS |
| User & Role | Admin, operator, viewer, stakeholder |
| Interval Data | Interval pengiriman dan pembacaan data |
| Template Laporan | Format laporan otomatis |
| Integrasi API | Token dan endpoint integrasi |

## 16. Role Pengguna

| Role | Akses |
|---|---|
| Super Admin | Semua fitur dan pengaturan |
| Admin Instansi | Monitoring, laporan, pengaturan area |
| Operator | Monitoring, alarm, catatan event |
| Teknisi | Status perangkat dan maintenance |
| Viewer | Melihat dashboard dan laporan terbatas |
| Stakeholder | Melihat executive summary dan peta risiko |

## 17. Rancangan Layout Dashboard Utama

Layout desktop yang direkomendasikan untuk 1920×1080:

```text
┌────────────────────────────────────────────────────────────────────┐
│ Header: Coastal Subsidence Monitoring | Lokasi | Last Update       │
├────────────────────────────────────────────────────────────────────┤
│ KPI Penurunan | KPI Water Level | KPI Risiko Rob | Online | Alarm  │
├──────────────────────────────────────┬─────────────────────────────┤
│                                      │ Panel Detail Area            │
│ Peta Risiko Pesisir                  │ - Status risiko              │
│ Marker GNSS + AWLR + CCTV            │ - Titik kritis               │
│ Zona rob + zona penurunan            │ - Alarm terbaru              │
│                                      │ - Snapshot CCTV              │
├──────────────────────────────────────┴─────────────────────────────┤
│ Grafik Trend Penurunan | Grafik Water Level | Riwayat Alarm        │
└────────────────────────────────────────────────────────────────────┘
```

## 18. Komponen UI shadcn/ui yang Direkomendasikan

| Kebutuhan UI | Komponen |
|---|---|
| KPI Card | Card |
| Filter Lokasi | Select / Combobox |
| Filter Tanggal | Calendar / Date Picker |
| Grafik | Card + Recharts |
| Data Table | Table + TanStack Table |
| Detail Marker | Sheet / Dialog |
| Alarm | Badge / Alert |
| Riwayat Event | Timeline custom + Card |
| Form Pengaturan | Form + Input + Select |
| Konfirmasi Aksi | Alert Dialog |
| Navigasi | Sidebar + Breadcrumb |
| Status Device | Badge + Tooltip |
| Export | Dropdown Menu |
| Ringkasan AI | Card + Scroll Area |

## 19. Rekomendasi Gaya Visual

Dashboard sebaiknya menggunakan gaya visual industrial, bersih, dan teknis.

### Arahan Visual

| Elemen | Rekomendasi |
|---|---|
| Background | Putih atau light gray |
| Warna Utama | Deep blue / navy |
| Warna Bahaya | Merah |
| Warna Siaga | Oranye |
| Warna Waspada | Kuning |
| Warna Aman | Hijau |
| Border | Tipis dan halus |
| Shadow | Minimal |
| Radius | Medium rounded |
| Font | Inter, Geist, atau SF Pro |
| Layout | Grid 12 kolom |

### Prinsip Tampilan

1. Jangan terlalu dekoratif.
2. Prioritaskan keterbacaan data.
3. Gunakan warna hanya untuk status dan prioritas.
4. Peta harus menjadi pusat navigasi.
5. Grafik harus sederhana dan mudah dibaca.
6. Panel kanan digunakan untuk detail cepat.
7. Laporan dan data teknis tetap mudah diakses.

## 20. Struktur Database Awal

### Tabel Utama

| Tabel | Fungsi |
|---|---|
| users | Data pengguna |
| roles | Hak akses |
| monitoring_areas | Area pesisir yang dipantau |
| monitoring_points | Titik GNSS, AWLR, CCTV, atau sensor |
| devices | Data perangkat/logger |
| gnss_readings | Data pengamatan GNSS |
| water_level_readings | Data muka air laut |
| weather_readings | Data cuaca opsional |
| camera_snapshots | Snapshot CCTV |
| alarms | Data alarm |
| events | Data kejadian lapangan |
| maintenance_logs | Riwayat perawatan |
| reports | Arsip laporan |
| thresholds | Konfigurasi ambang batas |

## 21. Contoh Endpoint API

| Endpoint | Fungsi |
|---|---|
| GET /api/dashboard/summary | Ringkasan KPI |
| GET /api/map/points | Data marker peta |
| GET /api/gnss/readings | Data GNSS historis |
| GET /api/water-level/readings | Data muka air historis |
| GET /api/cctv/snapshots | Data snapshot CCTV |
| GET /api/alarms | Daftar alarm |
| POST /api/alarms/resolve | Menyelesaikan alarm |
| GET /api/devices/status | Status perangkat |
| POST /api/reports/generate | Generate laporan |
| GET /api/settings/thresholds | Ambil threshold |
| PUT /api/settings/thresholds | Update threshold |

## 22. Fitur AI Opsional

| Fitur | Fungsi |
|---|---|
| Forecast Subsidence | Prediksi tren penurunan tanah |
| Forecast Rob Risk | Prediksi potensi rob berdasarkan water level historis |
| Anomaly Detection | Deteksi data GNSS/AWLR yang tidak normal |
| AI Summary | Ringkasan otomatis kondisi harian |
| Visual Flood Detection | Deteksi genangan dari CCTV |
| Recommendation Engine | Rekomendasi tindakan awal berdasarkan status risiko |

## 23. Tahapan Pengembangan

### Tahap 1 — MVP Monitoring

Fitur minimum yang perlu dibuat terlebih dahulu:

1. Login dan role user.
2. Dashboard ringkasan.
3. Peta titik monitoring.
4. Detail titik GNSS.
5. Detail AWLR/tide station.
6. Grafik time series.
7. Status perangkat.
8. Alarm dasar.
9. Export data CSV/Excel.

### Tahap 2 — Risk Dashboard

Fitur lanjutan:

1. Zona risiko rob.
2. Risk scoring.
3. Korelasi subsidence dan muka air.
4. CCTV snapshot.
5. Event management.
6. Laporan PDF otomatis.
7. Pengaturan threshold.

### Tahap 3 — AI dan Prediksi

Fitur pengembangan lanjut:

1. Forecast subsidence.
2. Forecast water level.
3. Anomaly detection.
4. AI daily summary.
5. Visual flood detection dari CCTV.
6. Rekomendasi tindakan otomatis.

## 24. Prioritas Fitur untuk Demo Proposal

Untuk kebutuhan presentasi atau demo ke instansi, fitur yang paling penting ditampilkan:

1. Dashboard ringkasan kondisi pesisir.
2. Peta risiko dengan marker GNSS, AWLR, dan CCTV.
3. Grafik penurunan tanah per titik.
4. Grafik muka air laut.
5. Panel risiko rob.
6. Alarm Normal, Waspada, Siaga, Awas.
7. CCTV snapshot sebagai validasi visual.
8. Export laporan PDF.
9. Status perangkat/logger.
10. Ringkasan otomatis kondisi terbaru.

## 25. Positioning Produk

Dashboard ini dapat diposisikan sebagai sistem terpadu untuk pemantauan risiko pesisir yang menggabungkan pemantauan penurunan tanah, muka air laut, visual CCTV, dan telemetry logger dalam satu platform.

Kalimat positioning:

**Sistem pemantauan penurunan pesisir pantai berbasis GNSS, AWLR, CCTV, dan smart telemetry dashboard untuk mendukung mitigasi risiko rob, penurunan tanah, serta pengambilan keputusan teknis secara real-time.**

## 26. Ringkasan Akhir

Rancangan dashboard ini fokus pada pemantauan lapangan berbasis sensor real-time tanpa menggunakan InSAR. Sistem dirancang dengan pendekatan modular agar dapat dimulai dari MVP sederhana, lalu dikembangkan menjadi platform analisis risiko pesisir yang lebih lengkap.

Fitur inti yang wajib ada:

1. Dashboard ringkasan.
2. Peta risiko pesisir.
3. Monitoring GNSS.
4. Monitoring AWLR/tide station.
5. CCTV monitoring.
6. Alarm dan event.
7. Status perangkat.
8. Laporan.
9. Pengaturan threshold.
10. Analisis risiko.
