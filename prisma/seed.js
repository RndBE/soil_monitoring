/* eslint-disable @typescript-eslint/no-require-imports */
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const now = new Date("2026-05-22T01:30:00.000Z");

function hoursAgo(hours) {
  return new Date(now.getTime() - hours * 60 * 60 * 1000);
}

function minutesAgo(minutes) {
  return new Date(now.getTime() - minutes * 60 * 1000);
}

function daysAgo(days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

function round(value, digits = 2) {
  return Number(value.toFixed(digits));
}

// ---------- generator readings ----------

function buildMukaAirReadings({
  titikId,
  days = 7,
  baseM,
  amplitudeM,
  trendM = 0,
  phase = 0,
  waspadaM,
  siagaM,
  awasM,
}) {
  const totalHours = days * 24;
  const rows = [];

  for (let h = totalHours; h >= 0; h -= 1) {
    const elapsed = totalHours - h;
    const progress = elapsed / totalHours;
    const diurnal = amplitudeM * Math.sin((elapsed / 12 + phase) * Math.PI * 2);
    const slow = amplitudeM * 0.35 * Math.sin((elapsed / 36 + phase * 0.7) * Math.PI * 2);
    const jitter =
      Math.sin(elapsed * 0.71 + phase * 13) * 0.012 +
      Math.cos(elapsed * 0.27 + phase * 9) * 0.008;
    const tinggi = baseM + trendM * progress + diurnal + slow + jitter;

    rows.push({
      titikId,
      recordedAt: hoursAgo(h),
      tinggiM: round(tinggi, 3),
      waspadaM,
      siagaM,
      awasM,
    });
  }

  return rows;
}

function buildDebitReadings({
  titikId,
  days = 7,
  baseDebit,
  amplitudeDebit,
  phase = 0,
}) {
  const totalHours = days * 24;
  const rows = [];

  for (let h = totalHours; h >= 0; h -= 1) {
    const elapsed = totalHours - h;
    // pola harian: pagi-siang lebih tinggi karena bukaan pintu
    const hourOfDay = (elapsed + phase * 24) % 24;
    const dailyPattern = 0.7 + 0.3 * Math.sin(((hourOfDay - 6) / 24) * Math.PI * 2);
    const noise = Math.cos(elapsed * 0.41 + phase * 5) * 0.05;
    const debit = Math.max(0, baseDebit * dailyPattern + amplitudeDebit * noise);
    const kecepatan = Math.max(0, debit * 0.6 + 0.1);

    rows.push({
      titikId,
      recordedAt: hoursAgo(h),
      debitM3s: round(debit, 3),
      kecepatanMs: round(kecepatan, 3),
    });
  }

  return rows;
}

function buildCuacaTanahReadings({
  titikId,
  days = 7,
  baseSoilPct = 55,
  baseSuhuC = 28,
  phase = 0,
}) {
  const totalHours = days * 24;
  const rows = [];

  for (let h = totalHours; h >= 0; h -= 1) {
    const elapsed = totalHours - h;
    const hourOfDay = (elapsed + phase * 24) % 24;
    // suhu: rendah malam, tinggi siang
    const suhu = baseSuhuC + 5 * Math.sin(((hourOfDay - 9) / 24) * Math.PI * 2);
    const kelembabanUdara = 78 - 18 * Math.sin(((hourOfDay - 9) / 24) * Math.PI * 2);
    // hujan: sparse, kadang besar
    const rainSpike = Math.sin(elapsed * 0.13 + phase * 3) > 0.85 ? Math.random() * 8 : 0;
    const curahHujan = rainSpike + (Math.random() < 0.06 ? Math.random() * 12 : 0);
    // soil moisture: tergantung hujan + ET
    const soilTrend = -0.04 * elapsed * 0.05;
    const soilRainBoost = curahHujan * 0.8;
    const soil = Math.max(20, Math.min(95, baseSoilPct + soilTrend + soilRainBoost + Math.sin(elapsed * 0.05) * 3));
    // ET0: tinggi siang panas, rendah malam
    const et0 = Math.max(0, 0.18 * (suhu - 18) * (1 - kelembabanUdara / 120));
    const angin = 1.2 + Math.abs(Math.sin(elapsed * 0.21 + phase * 4)) * 2.3;

    rows.push({
      titikId,
      recordedAt: hoursAgo(h),
      curahHujanMm: round(curahHujan, 2),
      suhuC: round(suhu, 2),
      kelembabanUdaraPct: round(kelembabanUdara, 1),
      kelembabanTanahPct: round(soil, 1),
      evapotranspirasiMm: round(et0, 3),
      kecepatanAnginMs: round(angin, 2),
    });
  }

  return rows;
}

// ---------- main ----------

async function main() {
  console.log("Seeding database irigasi...");

  // -- bersihkan data lama (urutan dependensi) --
  await prisma.aktuasiPintuAir.deleteMany();
  await prisma.jadwalPintuAir.deleteMany();
  await prisma.mukaAirReading.deleteMany();
  await prisma.debitReading.deleteMany();
  await prisma.cuacaTanahReading.deleteMany();
  await prisma.alarm.deleteMany();
  await prisma.event.deleteMany();
  await prisma.perangkatMaintenance.deleteMany();
  await prisma.titikThreshold.deleteMany();
  await prisma.perangkat.deleteMany();
  await prisma.pintuAir.deleteMany();
  await prisma.titikMonitoring.deleteMany();
  await prisma.saluran.deleteMany();
  await prisma.daerahIrigasi.deleteMany();
  await prisma.laporan.deleteMany();
  await prisma.laporanTemplate.deleteMany();
  await prisma.threshold.deleteMany();
  await prisma.bobotRisiko.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  // -- roles & user --
  const roleAdmin = await prisma.role.create({
    data: { name: "Admin", access: "all" },
  });
  const roleOperator = await prisma.role.create({
    data: { name: "Operator", access: "operate" },
  });
  const roleViewer = await prisma.role.create({
    data: { name: "Viewer", access: "read" },
  });

  await prisma.user.createMany({
    data: [
      {
        name: "Administrator",
        email: "admin@irigasi.local",
        passwordHash: bcrypt.hashSync("admin123", 8),
        roleId: roleAdmin.id,
      },
      {
        name: "Operator Lapangan",
        email: "operator@irigasi.local",
        passwordHash: bcrypt.hashSync("operator123", 8),
        roleId: roleOperator.id,
      },
      {
        name: "Pengamat",
        email: "viewer@irigasi.local",
        passwordHash: bcrypt.hashSync("viewer123", 8),
        roleId: roleViewer.id,
      },
    ],
  });

  // -- daerah irigasi --
  const di = await prisma.daerahIrigasi.create({
    data: {
      nama: "Daerah Irigasi Demo",
      kabupaten: "Madiun",
      provinsi: "Jawa Timur",
      luasBakuSawahHa: 850,
      sumberAir: "Bendung Demo (Sungai Madiun)",
      deskripsi:
        "DI demo dengan 1 saluran primer, 2 saluran sekunder, dan jaringan tersier untuk uji coba dashboard pemantauan irigasi.",
    },
  });

  // -- saluran (hierarki) --
  const primer = await prisma.saluran.create({
    data: {
      kode: "SP-01",
      nama: "Saluran Primer Demo",
      jenis: "PRIMER",
      panjangM: 4500,
      kapasitasM3s: 6.5,
      daerahIrigasiId: di.id,
    },
  });

  const sekunder1 = await prisma.saluran.create({
    data: {
      kode: "SS-01",
      nama: "Saluran Sekunder Kanan",
      jenis: "SEKUNDER",
      panjangM: 2300,
      kapasitasM3s: 3.0,
      daerahIrigasiId: di.id,
      parentId: primer.id,
    },
  });

  const sekunder2 = await prisma.saluran.create({
    data: {
      kode: "SS-02",
      nama: "Saluran Sekunder Kiri",
      jenis: "SEKUNDER",
      panjangM: 1900,
      kapasitasM3s: 2.5,
      daerahIrigasiId: di.id,
      parentId: primer.id,
    },
  });

  const tersier1 = await prisma.saluran.create({
    data: {
      kode: "ST-01",
      nama: "Tersier Blok A",
      jenis: "TERSIER",
      panjangM: 850,
      kapasitasM3s: 0.9,
      daerahIrigasiId: di.id,
      parentId: sekunder1.id,
    },
  });

  // -- pintu air (5) --
  const pintuList = [
    {
      kode: "PA-01",
      nama: "Pintu Intake Bendung",
      latitude: -7.6298,
      longitude: 111.5240,
      saluranId: primer.id,
      lebarM: 3.0,
      tinggiM: 2.5,
      kapasitasM3s: 6.5,
      posisiPersen: 75,
      mode: "OTOMATIS",
    },
    {
      kode: "PA-02",
      nama: "Pintu Bagi SS-01",
      latitude: -7.6310,
      longitude: 111.5305,
      saluranId: sekunder1.id,
      lebarM: 1.8,
      tinggiM: 1.6,
      kapasitasM3s: 3.0,
      posisiPersen: 60,
      mode: "TERJADWAL",
    },
    {
      kode: "PA-03",
      nama: "Pintu Bagi SS-02",
      latitude: -7.6285,
      longitude: 111.5288,
      saluranId: sekunder2.id,
      lebarM: 1.6,
      tinggiM: 1.5,
      kapasitasM3s: 2.5,
      posisiPersen: 45,
      mode: "MANUAL",
    },
    {
      kode: "PA-04",
      nama: "Pintu Sadap Tersier A",
      latitude: -7.6332,
      longitude: 111.5360,
      saluranId: tersier1.id,
      lebarM: 0.8,
      tinggiM: 1.0,
      kapasitasM3s: 0.9,
      posisiPersen: 30,
      mode: "MANUAL",
    },
    {
      kode: "PA-05",
      nama: "Pintu Pembuang Akhir",
      latitude: -7.6360,
      longitude: 111.5420,
      saluranId: sekunder1.id,
      lebarM: 1.4,
      tinggiM: 1.4,
      kapasitasM3s: 2.0,
      posisiPersen: 10,
      mode: "OTOMATIS",
    },
  ];

  const pintuRecords = [];
  for (const p of pintuList) {
    const rec = await prisma.pintuAir.create({
      data: {
        ...p,
        daerahIrigasiId: di.id,
        lastUpdate: minutesAgo(Math.floor(Math.random() * 30)),
        status: p.posisiPersen > 80 ? "WASPADA" : "NORMAL",
      },
    });
    pintuRecords.push(rec);
  }

  // -- titik monitoring (8) --
  const titikDefs = [
    // 3 AWLR
    {
      kode: "AWLR-01",
      nama: "AWLR Hulu Bendung",
      jenis: "AWLR",
      latitude: -7.6295,
      longitude: 111.5232,
      saluranId: primer.id,
      mukaAir: { baseM: 1.85, amplitudeM: 0.18, trendM: 0.05, waspadaM: 2.0, siagaM: 2.3, awasM: 2.6 },
    },
    {
      kode: "AWLR-02",
      nama: "AWLR Tengah Primer",
      jenis: "AWLR",
      latitude: -7.6308,
      longitude: 111.5295,
      saluranId: primer.id,
      mukaAir: { baseM: 1.45, amplitudeM: 0.14, trendM: -0.02, waspadaM: 1.6, siagaM: 1.85, awasM: 2.1 },
    },
    {
      kode: "AWLR-03",
      nama: "AWLR Sekunder Kanan",
      jenis: "AWLR",
      latitude: -7.6325,
      longitude: 111.5340,
      saluranId: sekunder1.id,
      mukaAir: { baseM: 0.95, amplitudeM: 0.12, trendM: 0.01, waspadaM: 1.1, siagaM: 1.3, awasM: 1.5 },
    },
    // 2 debit
    {
      kode: "FM-01",
      nama: "Flow Meter Primer",
      jenis: "DEBIT",
      latitude: -7.6302,
      longitude: 111.5260,
      saluranId: primer.id,
      debit: { baseDebit: 4.2, amplitudeDebit: 0.4 },
    },
    {
      kode: "FM-02",
      nama: "Flow Meter Sekunder Kanan",
      jenis: "DEBIT",
      latitude: -7.6318,
      longitude: 111.5318,
      saluranId: sekunder1.id,
      debit: { baseDebit: 1.8, amplitudeDebit: 0.25 },
    },
    // 3 cuaca/tanah
    {
      kode: "WS-01",
      nama: "Weather Station Bendung",
      jenis: "CUACA_TANAH",
      latitude: -7.6290,
      longitude: 111.5245,
      saluranId: primer.id,
      cuaca: { baseSoilPct: 62, baseSuhuC: 28 },
    },
    {
      kode: "WS-02",
      nama: "Sensor Tanah Blok A",
      jenis: "CUACA_TANAH",
      latitude: -7.6340,
      longitude: 111.5375,
      saluranId: tersier1.id,
      cuaca: { baseSoilPct: 48, baseSuhuC: 29 },
    },
    {
      kode: "WS-03",
      nama: "Sensor Tanah Blok B",
      jenis: "CUACA_TANAH",
      latitude: -7.6355,
      longitude: 111.5395,
      saluranId: sekunder2.id,
      cuaca: { baseSoilPct: 71, baseSuhuC: 27.5 },
    },
  ];

  const titikRecords = [];
  for (const t of titikDefs) {
    const status = t.kode === "AWLR-01" ? "WASPADA" : "NORMAL";
    const titik = await prisma.titikMonitoring.create({
      data: {
        kode: t.kode,
        nama: t.nama,
        jenis: t.jenis,
        latitude: t.latitude,
        longitude: t.longitude,
        daerahIrigasiId: di.id,
        saluranId: t.saluranId,
        status,
        lastUpdate: minutesAgo(Math.floor(Math.random() * 20)),
      },
    });
    titikRecords.push({ ...titik, _seed: t });
  }

  // -- readings per titik --
  for (let i = 0; i < titikRecords.length; i += 1) {
    const t = titikRecords[i];
    const phase = i * 0.31;

    if (t.jenis === "AWLR") {
      const rows = buildMukaAirReadings({
        titikId: t.id,
        days: 7,
        phase,
        ...t._seed.mukaAir,
      });
      await prisma.mukaAirReading.createMany({ data: rows });
      const last = rows[rows.length - 1];
      await prisma.titikMonitoring.update({
        where: { id: t.id },
        data: { nilaiTerakhir: `${last.tinggiM.toFixed(2)} m` },
      });
      await prisma.titikThreshold.create({
        data: {
          titikId: t.id,
          parameter: "tinggiMukaAir",
          unit: "m",
          normal: t._seed.mukaAir.waspadaM - 0.3,
          waspada: t._seed.mukaAir.waspadaM,
          siaga: t._seed.mukaAir.siagaM,
          awas: t._seed.mukaAir.awasM,
        },
      });
    } else if (t.jenis === "DEBIT") {
      const rows = buildDebitReadings({
        titikId: t.id,
        days: 7,
        phase,
        ...t._seed.debit,
      });
      await prisma.debitReading.createMany({ data: rows });
      const last = rows[rows.length - 1];
      await prisma.titikMonitoring.update({
        where: { id: t.id },
        data: { nilaiTerakhir: `${last.debitM3s.toFixed(2)} m³/s` },
      });
      await prisma.titikThreshold.create({
        data: {
          titikId: t.id,
          parameter: "debit",
          unit: "m³/s",
          normal: t._seed.debit.baseDebit * 0.6,
          waspada: t._seed.debit.baseDebit * 0.9,
          siaga: t._seed.debit.baseDebit * 1.1,
          awas: t._seed.debit.baseDebit * 1.3,
        },
      });
    } else if (t.jenis === "CUACA_TANAH") {
      const rows = buildCuacaTanahReadings({
        titikId: t.id,
        days: 7,
        phase,
        ...t._seed.cuaca,
      });
      await prisma.cuacaTanahReading.createMany({ data: rows });
      const last = rows[rows.length - 1];
      await prisma.titikMonitoring.update({
        where: { id: t.id },
        data: { nilaiTerakhir: `${last.kelembabanTanahPct.toFixed(0)}% tanah` },
      });
      await prisma.titikThreshold.create({
        data: {
          titikId: t.id,
          parameter: "kelembabanTanah",
          unit: "%",
          normal: 55,
          waspada: 40,
          siaga: 30,
          awas: 20,
        },
      });
    }
  }

  // -- perangkat --
  const perangkatDefs = [];
  for (const t of titikRecords) {
    const jenisMap = {
      AWLR: "AWLR",
      DEBIT: "FLOW_METER",
      CUACA_TANAH: t.kode.startsWith("WS-0") && t.kode !== "WS-01" ? "SOIL_SENSOR" : "WEATHER_STATION",
    };
    perangkatDefs.push({
      kode: `DEV-${t.kode}`,
      nama: `Logger ${t.nama}`,
      jenis: jenisMap[t.jenis],
      status: t.kode === "AWLR-02" ? "WEAK" : "ONLINE",
      battery: 60 + Math.floor(Math.random() * 35),
      signal: 65 + Math.floor(Math.random() * 30),
      solarCharging: true,
      firmwareVersion: "1.4.2",
      sensorStatus: "OK",
      lastDataReceived: minutesAgo(Math.floor(Math.random() * 25)),
      titikId: t.id,
    });
  }
  for (const p of pintuRecords) {
    perangkatDefs.push({
      kode: `DEV-${p.kode}`,
      nama: `Aktuator ${p.nama}`,
      jenis: "AKTUATOR_PINTU",
      status: p.kode === "PA-05" ? "MAINTENANCE" : "ONLINE",
      battery: 70 + Math.floor(Math.random() * 25),
      signal: 70 + Math.floor(Math.random() * 25),
      solarCharging: true,
      firmwareVersion: "2.1.0",
      sensorStatus: "OK",
      lastDataReceived: minutesAgo(Math.floor(Math.random() * 15)),
      pintuAirId: p.id,
    });
  }
  await prisma.perangkat.createMany({ data: perangkatDefs });

  // -- jadwal pintu air --
  await prisma.jadwalPintuAir.createMany({
    data: [
      {
        pintuAirId: pintuRecords[0].id,
        nama: "Pagi - Sawah Petak A",
        hariMingguMask: 127,
        jamMulai: "05:30",
        jamSelesai: "09:00",
        posisiTargetPersen: 80,
        aktif: true,
      },
      {
        pintuAirId: pintuRecords[0].id,
        nama: "Sore - Penyiraman Tambahan",
        hariMingguMask: 85, // Sen, Rab, Jum
        jamMulai: "16:00",
        jamSelesai: "18:00",
        posisiTargetPersen: 65,
        aktif: true,
      },
      {
        pintuAirId: pintuRecords[1].id,
        nama: "Distribusi SS-01",
        hariMingguMask: 127,
        jamMulai: "06:00",
        jamSelesai: "10:00",
        posisiTargetPersen: 60,
        aktif: true,
      },
    ],
  });

  // -- aktuasi historis --
  await prisma.aktuasiPintuAir.createMany({
    data: [
      {
        pintuAirId: pintuRecords[0].id,
        waktu: hoursAgo(2),
        posisiSebelumPersen: 60,
        posisiSesudahPersen: 75,
        sumber: "JADWAL",
        operator: "scheduler",
        catatan: "Jadwal pagi otomatis",
      },
      {
        pintuAirId: pintuRecords[2].id,
        waktu: hoursAgo(5),
        posisiSebelumPersen: 30,
        posisiSesudahPersen: 45,
        sumber: "MANUAL",
        operator: "Operator Lapangan",
        catatan: "Penambahan suplai akibat permintaan kelompok tani",
      },
      {
        pintuAirId: pintuRecords[1].id,
        waktu: hoursAgo(8),
        posisiSebelumPersen: 80,
        posisiSesudahPersen: 60,
        sumber: "ALARM",
        operator: "auto",
        catatan: "Penurunan otomatis karena muka air hilir tinggi",
      },
      {
        pintuAirId: pintuRecords[3].id,
        waktu: hoursAgo(20),
        posisiSebelumPersen: 50,
        posisiSesudahPersen: 30,
        sumber: "MANUAL",
        operator: "Operator Lapangan",
        catatan: "Penjadwalan rotasi gilir air blok A",
      },
    ],
  });

  // -- alarm aktif --
  const titikAwlr1 = titikRecords.find((t) => t.kode === "AWLR-01");
  const titikWs2 = titikRecords.find((t) => t.kode === "WS-02");

  await prisma.alarm.createMany({
    data: [
      {
        kode: "ALR-001",
        jenis: "Muka Air Tinggi",
        daerahIrigasiId: di.id,
        titikId: titikAwlr1.id,
        status: "WASPADA",
        state: "OPEN",
        pesan: "Tinggi muka air di AWLR Hulu Bendung melewati ambang waspada (2.0 m).",
        occurredAt: hoursAgo(1),
      },
      {
        kode: "ALR-002",
        jenis: "Kelembaban Tanah Rendah",
        daerahIrigasiId: di.id,
        titikId: titikWs2.id,
        status: "SIAGA",
        state: "IN_PROGRESS",
        pesan: "Kelembaban tanah Blok A turun di bawah 35% — pertimbangkan penambahan suplai.",
        occurredAt: hoursAgo(3),
      },
      {
        kode: "ALR-003",
        jenis: "Perangkat Sinyal Lemah",
        daerahIrigasiId: di.id,
        titikId: titikRecords.find((t) => t.kode === "AWLR-02").id,
        status: "NORMAL",
        state: "RESOLVED",
        pesan: "Sinyal logger AWLR-02 sempat lemah, sudah pulih.",
        occurredAt: hoursAgo(18),
        resolvedAt: hoursAgo(16),
        resolutionNote: "Antena diarahkan ulang oleh teknisi",
      },
    ],
  });

  // -- event --
  await prisma.event.createMany({
    data: [
      {
        judul: "Inspeksi rutin bendung dan pintu intake",
        daerahIrigasiId: di.id,
        status: "NORMAL",
        state: "OPEN",
        occurredAt: hoursAgo(48),
        catatan: "Pemeriksaan kondisi mekanis pintu air dan kalibrasi flow meter.",
      },
      {
        judul: "Pengurasan endapan saluran sekunder",
        daerahIrigasiId: di.id,
        status: "NORMAL",
        state: "RESOLVED",
        occurredAt: daysAgo(4),
        catatan: "Selesai 100%, dilakukan oleh tim UPT.",
      },
    ],
  });

  // -- threshold global --
  await prisma.threshold.createMany({
    data: [
      {
        id: "th-muka-air",
        metric: "Tinggi Muka Air (m)",
        normal: "< waspada",
        waspada: "≥ ambang waspada lokal",
        siaga: "≥ ambang siaga lokal",
        awas: "≥ ambang awas lokal",
      },
      {
        id: "th-debit",
        metric: "Debit (m³/s)",
        normal: "60-90% kapasitas",
        waspada: "> 90% kapasitas",
        siaga: "> 110% kapasitas",
        awas: "> 130% kapasitas",
      },
      {
        id: "th-soil",
        metric: "Kelembaban Tanah (%)",
        normal: "> 55",
        waspada: "≤ 40",
        siaga: "≤ 30",
        awas: "≤ 20",
      },
    ],
  });

  // -- bobot risiko --
  await prisma.bobotRisiko.createMany({
    data: [
      { id: "bw-muka-air", metric: "Muka Air", weight: 40, source: "AWLR" },
      { id: "bw-debit", metric: "Debit", weight: 30, source: "Flow Meter" },
      { id: "bw-soil", metric: "Kelembaban Tanah", weight: 20, source: "Soil Sensor" },
      { id: "bw-hujan", metric: "Curah Hujan", weight: 10, source: "Weather Station" },
    ],
  });

  // -- laporan template --
  const templateHarian = await prisma.laporanTemplate.create({
    data: {
      id: "tpl-harian",
      nama: "Laporan Harian Distribusi Air",
      periode: "Harian",
      audience: "UPT Pengairan",
      formats: ["CSV", "PDF"],
    },
  });

  await prisma.laporanTemplate.create({
    data: {
      id: "tpl-mingguan",
      nama: "Laporan Mingguan Kondisi DI",
      periode: "Mingguan",
      audience: "Dinas PUPR",
      formats: ["PDF"],
    },
  });

  await prisma.laporan.create({
    data: {
      templateId: templateHarian.id,
      daerahNama: di.nama,
      status: "READY",
      downloadUrl: "/api/reports/daily?date=latest",
      generatedAt: hoursAgo(6),
    },
  });

  console.log("Seed selesai.");
  console.log(`- 1 DI: ${di.nama}`);
  console.log(`- ${pintuRecords.length} pintu air`);
  console.log(`- ${titikRecords.length} titik monitoring`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
