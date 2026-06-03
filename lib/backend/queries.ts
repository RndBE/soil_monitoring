// Query Prisma untuk domain irigasi. Setiap fungsi mengembalikan
// bentuk yang siap dipakai komponen UI (label sudah di-format).

import { prisma } from "@/lib/prisma";
import {
  deviceStatusToLabel,
  eventStateLabel,
  formatDateTime,
  formatTime,
  hariMaskToLabel,
  modePintuLabel,
  relativeFrom,
  statusEnumToLabel,
  statusLaporanLabel,
  sumberAktuasiLabel,
} from "@/lib/backend/format";
import type {
  AlarmRingkas,
  AktuasiRingkas,
  BobotRisikoSetting,
  DashboardData,
  EventRingkas,
  JadwalRingkas,
  KpiSummary,
  LaporanRingkas,
  LaporanTemplateRingkas,
  PerangkatRingkas,
  PintuAirRingkas,
  SaluranRingkas,
  ThresholdSetting,
  TitikMonitoringRingkas,
  TrendCuacaTanah,
  TrendDebit,
  TrendMukaAir,
} from "@/lib/types";

// ---------- helper ----------

function ensureDaerahIrigasi() {
  return prisma.daerahIrigasi.findFirst();
}

function statusFromAlarm(items: { status: string }[]): "NORMAL" | "WASPADA" | "SIAGA" | "AWAS" {
  let worst: "NORMAL" | "WASPADA" | "SIAGA" | "AWAS" = "NORMAL";
  const order = ["NORMAL", "WASPADA", "SIAGA", "AWAS"] as const;
  for (const i of items) {
    if (order.indexOf(i.status as (typeof order)[number]) > order.indexOf(worst)) {
      worst = i.status as (typeof order)[number];
    }
  }
  return worst;
}

// ---------- titik & pintu ----------

export async function getTitikRingkas(): Promise<TitikMonitoringRingkas[]> {
  const titik = await prisma.titikMonitoring.findMany({
    include: { saluran: true },
    orderBy: { kode: "asc" },
  });

  return titik.map((t) => ({
    id: t.id,
    kode: t.kode,
    nama: t.nama,
    jenis: t.jenis,
    latitude: t.latitude,
    longitude: t.longitude,
    saluran: t.saluran?.nama ?? null,
    status: statusEnumToLabel(t.status),
    nilaiTerakhir: t.nilaiTerakhir ?? "-",
    lastUpdate: formatDateTime(t.lastUpdate),
  }));
}

export async function getPintuAirRingkas(): Promise<PintuAirRingkas[]> {
  const pintu = await prisma.pintuAir.findMany({
    include: { saluran: true },
    orderBy: { kode: "asc" },
  });

  return pintu.map((p) => ({
    id: p.id,
    kode: p.kode,
    nama: p.nama,
    latitude: p.latitude,
    longitude: p.longitude,
    saluran: p.saluran?.nama ?? null,
    posisiPersen: Number(p.posisiPersen),
    mode: modePintuLabel(p.mode),
    status: statusEnumToLabel(p.status),
    kapasitasM3s: Number(p.kapasitasM3s),
    lastUpdate: formatDateTime(p.lastUpdate),
  }));
}

export async function getSaluranRingkas(): Promise<SaluranRingkas[]> {
  const saluran = await prisma.saluran.findMany({ orderBy: { kode: "asc" } });
  return saluran.map((s) => ({
    id: s.id,
    kode: s.kode,
    nama: s.nama,
    jenis: s.jenis,
    panjangM: Number(s.panjangM),
    kapasitasM3s: Number(s.kapasitasM3s),
    parentId: s.parentId,
  }));
}

// ---------- trend ----------

export async function getTrendMukaAir(
  hours = 48,
): Promise<{ titikKode: string; titikNama: string; data: TrendMukaAir[] }[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const titik = await prisma.titikMonitoring.findMany({
    where: { jenis: "AWLR" },
    include: {
      mukaAirReadings: {
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: "asc" },
      },
    },
    orderBy: { kode: "asc" },
  });

  return titik.map((t) => ({
    titikKode: t.kode,
    titikNama: t.nama,
    data: t.mukaAirReadings.map((r) => ({
      recordedAt: r.recordedAt.toISOString(),
      jam: formatTime(r.recordedAt),
      tinggiM: Number(r.tinggiM),
      waspadaM: Number(r.waspadaM),
      siagaM: Number(r.siagaM),
      awasM: Number(r.awasM),
    })),
  }));
}

export async function getTrendDebit(
  hours = 48,
): Promise<{ titikKode: string; titikNama: string; data: TrendDebit[] }[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const titik = await prisma.titikMonitoring.findMany({
    where: { jenis: "DEBIT" },
    include: {
      debitReadings: {
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: "asc" },
      },
    },
    orderBy: { kode: "asc" },
  });

  return titik.map((t) => ({
    titikKode: t.kode,
    titikNama: t.nama,
    data: t.debitReadings.map((r) => ({
      recordedAt: r.recordedAt.toISOString(),
      jam: formatTime(r.recordedAt),
      debitM3s: Number(r.debitM3s),
      kecepatanMs: r.kecepatanMs === null ? null : Number(r.kecepatanMs),
    })),
  }));
}

export async function getTrendCuacaTanah(
  hours = 48,
): Promise<{ titikKode: string; titikNama: string; data: TrendCuacaTanah[] }[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const titik = await prisma.titikMonitoring.findMany({
    where: { jenis: "CUACA_TANAH" },
    include: {
      cuacaReadings: {
        where: { recordedAt: { gte: since } },
        orderBy: { recordedAt: "asc" },
      },
    },
    orderBy: { kode: "asc" },
  });

  return titik.map((t) => ({
    titikKode: t.kode,
    titikNama: t.nama,
    data: t.cuacaReadings.map((r) => ({
      recordedAt: r.recordedAt.toISOString(),
      jam: formatTime(r.recordedAt),
      curahHujanMm: r.curahHujanMm === null ? null : Number(r.curahHujanMm),
      suhuC: r.suhuC === null ? null : Number(r.suhuC),
      kelembabanUdaraPct: r.kelembabanUdaraPct === null ? null : Number(r.kelembabanUdaraPct),
      kelembabanTanahPct: r.kelembabanTanahPct === null ? null : Number(r.kelembabanTanahPct),
      evapotranspirasiMm: r.evapotranspirasiMm === null ? null : Number(r.evapotranspirasiMm),
      kecepatanAnginMs: r.kecepatanAnginMs === null ? null : Number(r.kecepatanAnginMs),
    })),
  }));
}

// ---------- alarm & event ----------

export async function getAlarmAktif(): Promise<AlarmRingkas[]> {
  const items = await prisma.alarm.findMany({
    where: { state: { in: ["OPEN", "IN_PROGRESS"] } },
    include: { titik: true, pintuAir: true },
    orderBy: { occurredAt: "desc" },
  });

  return items.map(mapAlarm);
}

export async function getAlarmSemua(): Promise<AlarmRingkas[]> {
  const items = await prisma.alarm.findMany({
    include: { titik: true, pintuAir: true },
    orderBy: { occurredAt: "desc" },
    take: 100,
  });
  return items.map(mapAlarm);
}

function mapAlarm(a: {
  id: string;
  kode: string;
  jenis: string;
  status: string;
  state: string;
  pesan: string;
  occurredAt: Date;
  resolvedAt: Date | null;
  resolutionNote: string | null;
  titik: { nama: string } | null;
  pintuAir: { nama: string } | null;
}): AlarmRingkas {
  return {
    id: a.id,
    kode: a.kode,
    jenis: a.jenis,
    status: statusEnumToLabel(a.status),
    state: eventStateLabel(a.state),
    pesan: a.pesan,
    occurredAt: formatDateTime(a.occurredAt),
    resolvedAt: a.resolvedAt ? formatDateTime(a.resolvedAt) : null,
    resolutionNote: a.resolutionNote ?? null,
    titik: a.titik?.nama ?? null,
    pintuAir: a.pintuAir?.nama ?? null,
  };
}

export async function getEvents(): Promise<EventRingkas[]> {
  const events = await prisma.event.findMany({
    orderBy: { occurredAt: "desc" },
    take: 50,
  });
  return events.map((e) => ({
    id: e.id,
    judul: e.judul,
    status: statusEnumToLabel(e.status),
    state: eventStateLabel(e.state),
    occurredAt: formatDateTime(e.occurredAt),
    catatan: e.catatan,
  }));
}

// ---------- pintu air ----------

export async function getAktuasiTerbaru(limit = 20): Promise<AktuasiRingkas[]> {
  const items = await prisma.aktuasiPintuAir.findMany({
    include: { pintuAir: true },
    orderBy: { waktu: "desc" },
    take: limit,
  });
  return items.map((a) => ({
    id: a.id,
    pintuAir: a.pintuAir.nama,
    waktu: formatDateTime(a.waktu),
    posisiSebelum: Number(a.posisiSebelumPersen),
    posisiSesudah: Number(a.posisiSesudahPersen),
    sumber: sumberAktuasiLabel(a.sumber),
    operator: a.operator,
    catatan: a.catatan,
  }));
}

export async function getJadwalPintu(): Promise<JadwalRingkas[]> {
  const items = await prisma.jadwalPintuAir.findMany({
    include: { pintuAir: true },
    orderBy: [{ pintuAirId: "asc" }, { jamMulai: "asc" }],
  });
  return items.map((j) => ({
    id: j.id,
    pintuAirId: j.pintuAirId,
    pintuAir: j.pintuAir.nama,
    nama: j.nama,
    hariMingguMask: j.hariMingguMask,
    hariLabel: hariMaskToLabel(j.hariMingguMask),
    jamMulai: j.jamMulai,
    jamSelesai: j.jamSelesai,
    posisiTargetPersen: Number(j.posisiTargetPersen),
    aktif: j.aktif,
  }));
}

// ---------- perangkat ----------

export async function getPerangkat(): Promise<PerangkatRingkas[]> {
  const items = await prisma.perangkat.findMany({
    include: { titik: true, pintuAir: true },
    orderBy: { kode: "asc" },
  });
  return items.map((p) => ({
    id: p.id,
    kode: p.kode,
    nama: p.nama,
    jenis: p.jenis,
    status: deviceStatusToLabel(p.status),
    battery: p.battery,
    signal: p.signal,
    solarCharging: p.solarCharging,
    firmwareVersion: p.firmwareVersion ?? "-",
    sensorStatus: p.sensorStatus ?? "-",
    lastDataReceived: relativeFrom(p.lastDataReceived),
    lokasi: p.titik?.nama ?? p.pintuAir?.nama ?? "-",
  }));
}

// ---------- pengaturan ----------

export async function getThresholdGlobal(): Promise<ThresholdSetting[]> {
  const items = await prisma.threshold.findMany({ orderBy: { id: "asc" } });
  return items.map((t) => ({
    id: t.id,
    metric: t.metric,
    normal: t.normal,
    waspada: t.waspada,
    siaga: t.siaga,
    awas: t.awas,
  }));
}

export async function getBobotRisiko(): Promise<BobotRisikoSetting[]> {
  const items = await prisma.bobotRisiko.findMany({ orderBy: { id: "asc" } });
  return items.map((b) => ({ id: b.id, metric: b.metric, weight: b.weight, source: b.source }));
}

// ---------- laporan ----------

export async function getLaporanTemplates(): Promise<LaporanTemplateRingkas[]> {
  const items = await prisma.laporanTemplate.findMany({ orderBy: { id: "asc" } });
  return items.map((t) => ({
    id: t.id,
    nama: t.nama,
    periode: t.periode,
    audience: t.audience,
    formats: Array.isArray(t.formats) ? (t.formats as string[]) : [],
  }));
}

export async function getLaporanList(): Promise<LaporanRingkas[]> {
  const items = await prisma.laporan.findMany({
    include: { template: true },
    orderBy: { generatedAt: "desc" },
    take: 20,
  });
  return items.map((l) => ({
    id: l.id,
    template: l.template.nama,
    daerahNama: l.daerahNama,
    status: statusLaporanLabel(l.status),
    generatedAt: formatDateTime(l.generatedAt),
    downloadUrl: l.downloadUrl,
  }));
}

// ---------- KPI & Dashboard summary ----------

export async function getDashboardData(): Promise<DashboardData> {
  const di = await ensureDaerahIrigasi();
  if (!di) {
    throw new Error(
      "Daerah Irigasi belum di-seed. Jalankan `npm run db:push && npm run db:seed`.",
    );
  }

  // ringkas latest debit semua titik
  const titikDebit = await prisma.titikMonitoring.findMany({
    where: { jenis: "DEBIT" },
    include: { debitReadings: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });
  let debitTotal = 0;
  for (const t of titikDebit) {
    if (t.debitReadings[0]) debitTotal += Number(t.debitReadings[0].debitM3s);
  }
  const kapasitasTotal = (
    await prisma.saluran.findMany({ where: { jenis: "PRIMER" } })
  ).reduce((sum, s) => sum + Number(s.kapasitasM3s), 0);

  // muka air rata-rata
  const titikAwlr = await prisma.titikMonitoring.findMany({
    where: { jenis: "AWLR" },
    include: { mukaAirReadings: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });
  const mukaAirNilai = titikAwlr
    .map((t) => (t.mukaAirReadings[0] ? Number(t.mukaAirReadings[0].tinggiM) : null))
    .filter((n): n is number => n !== null);
  const mukaAirAvg =
    mukaAirNilai.length > 0
      ? mukaAirNilai.reduce((a, b) => a + b, 0) / mukaAirNilai.length
      : 0;

  // pintu air aktif (posisi > 5%)
  const pintuAll = await prisma.pintuAir.findMany();
  const pintuAktif = pintuAll.filter((p) => Number(p.posisiPersen) > 5).length;

  // kelembaban tanah
  const titikCuaca = await prisma.titikMonitoring.findMany({
    where: { jenis: "CUACA_TANAH" },
    include: { cuacaReadings: { orderBy: { recordedAt: "desc" }, take: 1 } },
  });
  const soilNilai = titikCuaca
    .map((t) =>
      t.cuacaReadings[0]?.kelembabanTanahPct !== undefined &&
      t.cuacaReadings[0]?.kelembabanTanahPct !== null
        ? Number(t.cuacaReadings[0].kelembabanTanahPct)
        : null,
    )
    .filter((n): n is number => n !== null);
  const soilAvg =
    soilNilai.length > 0 ? soilNilai.reduce((a, b) => a + b, 0) / soilNilai.length : 0;

  const hujan24h = titikCuaca.reduce((sum, t) => {
    if (!t.cuacaReadings[0]?.curahHujanMm) return sum;
    return sum + Number(t.cuacaReadings[0].curahHujanMm);
  }, 0);
  const suhuRata =
    titikCuaca.reduce((sum, t) => sum + (Number(t.cuacaReadings[0]?.suhuC) || 0), 0) /
    Math.max(1, titikCuaca.length);

  // alarm aktif
  const alarmAktifCount = await prisma.alarm.count({
    where: { state: { in: ["OPEN", "IN_PROGRESS"] } },
  });

  const kpis: KpiSummary = {
    debitTotal: `${debitTotal.toFixed(2)} m³/s`,
    debitTotalDetail: `${kapasitasTotal > 0 ? Math.round((debitTotal / kapasitasTotal) * 100) : 0}% dari kapasitas primer`,
    mukaAirRataRata: `${mukaAirAvg.toFixed(2)} m`,
    mukaAirDetail: `Rata-rata dari ${titikAwlr.length} AWLR`,
    pintuAktif: `${pintuAktif} / ${pintuAll.length}`,
    pintuAktifDetail: `${pintuAll.length - pintuAktif} pintu tertutup`,
    kelembabanTanah: `${soilAvg.toFixed(0)} %`,
    kelembabanTanahDetail: `Rata-rata ${titikCuaca.length} titik tanah`,
    alarmAktif: alarmAktifCount,
    alarmAktifDetail: alarmAktifCount === 0 ? "Tidak ada alarm" : "Perlu tinjauan operator",
    cuaca: `${suhuRata.toFixed(1)}°C`,
    curahHujan: `${hujan24h.toFixed(1)} mm`,
  };

  const [titik, pintu, saluran, trendMukaAir, trendDebit, alarmAktif] = await Promise.all([
    getTitikRingkas(),
    getPintuAirRingkas(),
    getSaluranRingkas(),
    getTrendMukaAir(24),
    getTrendDebit(24),
    getAlarmAktif(),
  ]);

  return {
    daerahIrigasi: di.nama,
    updatedAt: formatDateTime(new Date()),
    kpis,
    titik,
    pintuAir: pintu,
    saluran,
    trendMukaAir,
    trendDebit,
    alarmAktif,
  };
}

// ---------- detail untuk dashboard utama (layout baru) ----------

export type DashboardDetail = {
  daerahIrigasi: string
  updatedAt: string
  tanggalLabel: string
  jamLabel: string
  kpis: {
    mukaAirAvg: string
    mukaAirDelta: string
    debitTotal: string
    debitDelta: string
    pintuAktif: string
    pintuAktifDetail: string
    efisiensi: string
    efisiensiLabel: string
    luasTeraliri: string
    luasTeraliriDetail: string
  }
  statusPintu: { bukaPenuh: number; bukaSebagian: number; tertutup: number }
  miniTrendsMukaAir: { kode: string; label: string; values: number[] }[]
  kondisi: {
    curahHujan24h: string
    tmaSungaiCisadane: string
    tmaSungaiAktif: string
    kelembabanUdara: string
    kecepatanAngin: string
  }
  dataRealtime: { titik: string; mukaAir: string | null; debit: string | null; waktu: string }[]
  rekapPintu: { label: string; iconColor: string; jumlah: number }[]
  rekapPintuTotal: number
  sistem: {
    iotGatewayStatus: "Online" | "Offline"
    sensorAktifText: string
    aktuatorAktifText: string
    solarPanelStatus: string
    bateraiPct: number
  }
  analitikInsight: {
    label: string
    value: string
    detail: string
    trend: "up" | "stable" | "down"
    series: number[]
  }[]
}

const DATE_LONG = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  timeZone: "Asia/Jakarta",
})

const TIME_WIB = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  timeZone: "Asia/Jakarta",
})

export async function getDashboardDetail(): Promise<DashboardDetail> {
  const di = await ensureDaerahIrigasi()
  if (!di) {
    throw new Error(
      "Daerah Irigasi belum di-seed. Jalankan `npm run db:push && npm run db:seed`.",
    )
  }
  const now = new Date()

  // -- ambil semua titik dengan reading terbaru
  const titikAwlr = await prisma.titikMonitoring.findMany({
    where: { jenis: "AWLR" },
    include: { mukaAirReadings: { orderBy: { recordedAt: "desc" }, take: 24 } },
    orderBy: { kode: "asc" },
  })
  const titikDebit = await prisma.titikMonitoring.findMany({
    where: { jenis: "DEBIT" },
    include: { debitReadings: { orderBy: { recordedAt: "desc" }, take: 24 } },
    orderBy: { kode: "asc" },
  })
  const titikCuaca = await prisma.titikMonitoring.findMany({
    where: { jenis: "CUACA_TANAH" },
    include: { cuacaReadings: { orderBy: { recordedAt: "desc" }, take: 24 } },
    orderBy: { kode: "asc" },
  })

  const lastMukaAir = titikAwlr
    .map((t) => (t.mukaAirReadings[0] ? Number(t.mukaAirReadings[0].tinggiM) : null))
    .filter((v): v is number => v !== null)
  const prevMukaAir = titikAwlr
    .map((t) =>
      t.mukaAirReadings[1] ? Number(t.mukaAirReadings[1].tinggiM) : null,
    )
    .filter((v): v is number => v !== null)
  const avgMukaAir = lastMukaAir.length
    ? lastMukaAir.reduce((a, b) => a + b, 0) / lastMukaAir.length
    : 0
  const avgPrevMukaAir = prevMukaAir.length
    ? prevMukaAir.reduce((a, b) => a + b, 0) / prevMukaAir.length
    : 0
  const deltaMukaAir = avgMukaAir - avgPrevMukaAir

  const lastDebit = titikDebit
    .map((t) => (t.debitReadings[0] ? Number(t.debitReadings[0].debitM3s) : null))
    .filter((v): v is number => v !== null)
  const prevDebit = titikDebit
    .map((t) => (t.debitReadings[1] ? Number(t.debitReadings[1].debitM3s) : null))
    .filter((v): v is number => v !== null)
  const totalDebit = lastDebit.reduce((a, b) => a + b, 0)
  const totalPrevDebit = prevDebit.reduce((a, b) => a + b, 0)
  const deltaDebit = totalDebit - totalPrevDebit

  // -- pintu air
  const pintuAll = await prisma.pintuAir.findMany()
  const bukaPenuh = pintuAll.filter((p) => Number(p.posisiPersen) >= 80).length
  const bukaSebagian = pintuAll.filter(
    (p) => Number(p.posisiPersen) > 5 && Number(p.posisiPersen) < 80,
  ).length
  const tertutup = pintuAll.filter((p) => Number(p.posisiPersen) <= 5).length
  const aktif = bukaPenuh + bukaSebagian

  // -- efisiensi irigasi: pakai rasio "soil moisture ideal" sebagai proxy sederhana
  const soilValues = titikCuaca
    .map((t) =>
      t.cuacaReadings[0]?.kelembabanTanahPct
        ? Number(t.cuacaReadings[0].kelembabanTanahPct)
        : null,
    )
    .filter((v): v is number => v !== null)
  const avgSoil = soilValues.length ? soilValues.reduce((a, b) => a + b, 0) / soilValues.length : 0
  // efisiensi proxy: 50% jika soil < 30 atau > 85, naik linier ke 100% di 55-65%
  function efisiensiScore(s: number): number {
    if (s < 30 || s > 85) return 50
    if (s >= 55 && s <= 65) return 95
    if (s < 55) return 50 + ((s - 30) / 25) * 45
    return 95 - ((s - 65) / 20) * 45
  }
  const efisiensi = Math.round(efisiensiScore(avgSoil))
  const efisiensiLabel = efisiensi >= 85 ? "Sangat Baik" : efisiensi >= 70 ? "Baik" : "Cukup"

  // -- luas teraliri estimasi: kapasitas pintu × bukaan × konversi sederhana (ha)
  const luasTeraliri = pintuAll.reduce(
    (sum, p) => sum + (Number(p.posisiPersen) / 100) * Number(p.kapasitasM3s) * 1500,
    0,
  )
  const totalLayanan = Number(di.luasBakuSawahHa)
  const luasPersen = totalLayanan > 0 ? Math.round((luasTeraliri / totalLayanan) * 100) : 0

  // -- kondisi cuaca terkini (ambil dari WS-01 / pertama jenis CUACA_TANAH)
  const wsPrimary = titikCuaca[0]
  const lastWs = wsPrimary?.cuacaReadings[0]
  const hujan24h = titikCuaca.reduce(
    (sum, t) =>
      sum +
      t.cuacaReadings.reduce(
        (s2, r) => s2 + (r.curahHujanMm ? Number(r.curahHujanMm) : 0),
        0,
      ),
    0,
  )

  // -- TMA sungai aktif: pakai AWLR pertama dan terakhir
  const tmaCisadaneAwlr = titikAwlr[0]
  const tmaCisadaneVal = tmaCisadaneAwlr?.mukaAirReadings[0]
    ? Number(tmaCisadaneAwlr.mukaAirReadings[0].tinggiM)
    : 0
  const tmaAktifAwlr = titikAwlr[titikAwlr.length - 1] ?? titikAwlr[0]
  const tmaAktifVal = tmaAktifAwlr?.mukaAirReadings[0]
    ? Number(tmaAktifAwlr.mukaAirReadings[0].tinggiM)
    : 0

  // -- mini trend muka air today (terakhir 24 jam, kebalikan biar urut ascending)
  const miniTrendsMukaAir = titikAwlr.map((t) => {
    const sorted = [...t.mukaAirReadings].reverse()
    return {
      kode: t.kode,
      label: t.nama,
      values: sorted.map((r) => Number(r.tinggiM)),
    }
  })

  // -- data realtime tabel (gabung muka air + debit, batas 6 baris)
  const realtimeMap = new Map<
    string,
    { titik: string; mukaAir: string | null; debit: string | null; waktu: string }
  >()
  for (const t of titikAwlr) {
    const last = t.mukaAirReadings[0]
    if (!last) continue
    realtimeMap.set(t.kode, {
      titik: t.kode,
      mukaAir: Number(last.tinggiM).toFixed(2),
      debit: null,
      waktu: formatTime(last.recordedAt),
    })
  }
  for (const t of titikDebit) {
    const last = t.debitReadings[0]
    if (!last) continue
    const existing = realtimeMap.get(t.kode) ?? {
      titik: t.kode,
      mukaAir: null,
      debit: null,
      waktu: formatTime(last.recordedAt),
    }
    existing.debit = Number(last.debitM3s).toFixed(2)
    if (!existing.waktu) existing.waktu = formatTime(last.recordedAt)
    realtimeMap.set(t.kode, existing)
  }
  const dataRealtime = Array.from(realtimeMap.values()).slice(0, 6)

  // -- rekap pintu: operasional vs cadangan (heuristik: kapasitas > 1.5 = operasional)
  const operasional = pintuAll.filter((p) => Number(p.kapasitasM3s) >= 1.5).length
  const cadangan = pintuAll.length - operasional - 1 // sisakan 1 untuk "bangunan pengatur" demo
  const bangunan = Math.max(1, pintuAll.length - operasional - cadangan)
  const rekapPintu = [
    { label: "Pintu Air (Operasional)", iconColor: "#ef4444", jumlah: operasional },
    { label: "Pintu Air (Cadangan)", iconColor: "#eab308", jumlah: Math.max(0, cadangan) },
    { label: "Bangunan Pengatur", iconColor: "#0ea5e9", jumlah: bangunan },
  ]
  const rekapPintuTotal = rekapPintu.reduce((sum, r) => sum + r.jumlah, 0)

  // -- sistem & perangkat
  const perangkatList = await prisma.perangkat.findMany()
  const sensor = perangkatList.filter(
    (p) =>
      p.jenis === "AWLR" ||
      p.jenis === "FLOW_METER" ||
      p.jenis === "WEATHER_STATION" ||
      p.jenis === "SOIL_SENSOR",
  )
  const aktuator = perangkatList.filter((p) => p.jenis === "AKTUATOR_PINTU")
  const sensorOnline = sensor.filter((p) => p.status === "ONLINE").length
  const aktuatorOnline = aktuator.filter((p) => p.status === "ONLINE").length
  const avgBattery = perangkatList.length
    ? Math.round(perangkatList.reduce((sum, p) => sum + p.battery, 0) / perangkatList.length)
    : 0
  const allSolar = perangkatList.every((p) => p.solarCharging)

  // -- analitik insight (proyeksi sederhana)
  const lastMa = lastMukaAir.length ? lastMukaAir[lastMukaAir.length - 1] : 0
  const prevMa = prevMukaAir.length ? prevMukaAir[prevMukaAir.length - 1] : 0
  const mukaAirTrend = lastMa > prevMa + 0.005 ? "up" : lastMa < prevMa - 0.005 ? "down" : "stable"
  const debitTrend = totalDebit > totalPrevDebit * 1.02
    ? "up"
    : totalDebit < totalPrevDebit * 0.98
      ? "down"
      : "stable"

  const analitikInsight: DashboardDetail["analitikInsight"] = [
    {
      label: "Kecenderungan Muka Air",
      value: `${(deltaMukaAir >= 0 ? "+" : "") + deltaMukaAir.toFixed(2)} m (24 jam)`,
      detail: "Berdasar rata-rata semua AWLR",
      trend: mukaAirTrend as "up" | "stable" | "down",
      series: titikAwlr[0]?.mukaAirReadings
        .slice()
        .reverse()
        .map((r) => Number(r.tinggiM)) ?? [],
    },
    {
      label: "Kecenderungan Debit",
      value: `${(deltaDebit >= 0 ? "+" : "") + deltaDebit.toFixed(2)} m³/dt (24 jam)`,
      detail: "Total inflow semua flow meter",
      trend: debitTrend as "up" | "stable" | "down",
      series: titikDebit[0]?.debitReadings
        .slice()
        .reverse()
        .map((r) => Number(r.debitM3s)) ?? [],
    },
    {
      label: "Proyeksi 3 Hari",
      value: hujan24h > 8 ? "Potensi limpasan tinggi" : "Tidak ada potensi banjir",
      detail: `Hujan 24j: ${hujan24h.toFixed(1)} mm`,
      trend: hujan24h > 8 ? "up" : "stable",
      series: (titikCuaca[0]?.cuacaReadings ?? [])
        .slice()
        .reverse()
        .map((r) => (r.curahHujanMm ? Number(r.curahHujanMm) : 0)),
    },
  ]

  return {
    daerahIrigasi: di.nama,
    updatedAt: formatDateTime(now),
    tanggalLabel: DATE_LONG.format(now),
    jamLabel: `${TIME_WIB.format(now).replace(/\./g, ":")} WIB`,
    kpis: {
      mukaAirAvg: `${avgMukaAir.toFixed(2)} m`,
      mukaAirDelta: `${deltaMukaAir >= 0 ? "↑" : "↓"} ${Math.abs(deltaMukaAir).toFixed(2)} m`,
      debitTotal: `${totalDebit.toFixed(2)} m³/dt`,
      debitDelta: `${deltaDebit >= 0 ? "↑" : "↓"} ${Math.abs(deltaDebit).toFixed(2)} m³/dt`,
      pintuAktif: `${aktif} / ${pintuAll.length}`,
      pintuAktifDetail: `${Math.round((aktif / Math.max(1, pintuAll.length)) * 100)}% dari total`,
      efisiensi: `${efisiensi}%`,
      efisiensiLabel,
      luasTeraliri: `${luasTeraliri.toLocaleString("id-ID", { maximumFractionDigits: 0 })} ha`,
      luasTeraliriDetail: `${luasPersen}% dari total layanan`,
    },
    statusPintu: { bukaPenuh, bukaSebagian, tertutup },
    miniTrendsMukaAir,
    kondisi: {
      curahHujan24h: `${hujan24h.toFixed(1)} mm`,
      tmaSungaiCisadane: `${tmaCisadaneVal.toFixed(2)} m`,
      tmaSungaiAktif: `${tmaAktifVal.toFixed(2)} m`,
      kelembabanUdara: `${lastWs?.kelembabanUdaraPct ? Number(lastWs.kelembabanUdaraPct).toFixed(0) : "-"}%`,
      kecepatanAngin: `${lastWs?.kecepatanAnginMs ? (Number(lastWs.kecepatanAnginMs) * 3.6).toFixed(0) : "-"} km/jam`,
    },
    dataRealtime,
    rekapPintu,
    rekapPintuTotal,
    sistem: {
      iotGatewayStatus: "Online",
      sensorAktifText: `${sensorOnline} / ${sensor.length}`,
      aktuatorAktifText: `${aktuatorOnline} / ${aktuator.length}`,
      solarPanelStatus: allSolar ? "Normal" : "Sebagian",
      bateraiPct: avgBattery,
    },
    analitikInsight,
  }
}

// silence ts-unused warning for util that may be wired later
export { statusFromAlarm };
