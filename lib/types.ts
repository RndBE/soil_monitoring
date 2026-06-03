// Tipe domain irigasi — semua label UI memakai bahasa Indonesia.

export type StatusRisiko = "Normal" | "Waspada" | "Siaga" | "Awas";

export type JenisTitik = "AWLR" | "DEBIT" | "PINTU_AIR" | "CUACA_TANAH";

export type JenisSaluran = "PRIMER" | "SEKUNDER" | "TERSIER";

export type JenisPerangkat =
  | "AWLR"
  | "FLOW_METER"
  | "AKTUATOR_PINTU"
  | "WEATHER_STATION"
  | "SOIL_SENSOR"
  | "LOGGER";

export type StatusPerangkat = "Online" | "Weak" | "Offline" | "Maintenance";

export type ModePintuAir = "Manual" | "Otomatis" | "Terjadwal";

export type StatusEvent = "Open" | "In Progress" | "Resolved";

export type SumberAktuasi = "Manual" | "Jadwal" | "Alarm" | "Override";

export type StatusLaporan = "Queued" | "Ready" | "Failed";

// ----- KPI & Dashboard summary -----

export type KpiSummary = {
  debitTotal: string; // total debit inflow saat ini
  debitTotalDetail: string;
  mukaAirRataRata: string;
  mukaAirDetail: string;
  pintuAktif: string; // contoh "4 / 5"
  pintuAktifDetail: string;
  kelembabanTanah: string;
  kelembabanTanahDetail: string;
  alarmAktif: number;
  alarmAktifDetail: string;
  cuaca: string; // ringkas: "Cerah berawan 28°C"
  curahHujan: string;
};

export type TitikMonitoringRingkas = {
  id: string;
  kode: string;
  nama: string;
  jenis: JenisTitik;
  latitude: number;
  longitude: number;
  saluran: string | null;
  status: StatusRisiko;
  nilaiTerakhir: string;
  lastUpdate: string;
};

export type PintuAirRingkas = {
  id: string;
  kode: string;
  nama: string;
  latitude: number;
  longitude: number;
  saluran: string | null;
  posisiPersen: number;
  mode: ModePintuAir;
  status: StatusRisiko;
  kapasitasM3s: number;
  lastUpdate: string;
};

export type SaluranRingkas = {
  id: string;
  kode: string;
  nama: string;
  jenis: JenisSaluran;
  panjangM: number;
  kapasitasM3s: number;
  parentId: string | null;
};

export type TrendMukaAir = {
  recordedAt: string;
  jam: string;
  tinggiM: number;
  waspadaM: number;
  siagaM: number;
  awasM: number;
};

export type TrendDebit = {
  recordedAt: string;
  jam: string;
  debitM3s: number;
  kecepatanMs: number | null;
};

export type TrendCuacaTanah = {
  recordedAt: string;
  jam: string;
  curahHujanMm: number | null;
  suhuC: number | null;
  kelembabanUdaraPct: number | null;
  kelembabanTanahPct: number | null;
  evapotranspirasiMm: number | null;
  kecepatanAnginMs: number | null;
};

export type AlarmRingkas = {
  id: string;
  kode: string;
  jenis: string;
  status: StatusRisiko;
  state: StatusEvent;
  pesan: string;
  occurredAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  titik: string | null;
  pintuAir: string | null;
};

export type AktuasiRingkas = {
  id: string;
  pintuAir: string;
  waktu: string;
  posisiSebelum: number;
  posisiSesudah: number;
  sumber: SumberAktuasi;
  operator: string | null;
  catatan: string | null;
};

export type JadwalRingkas = {
  id: string;
  pintuAirId: string;
  pintuAir: string;
  nama: string;
  hariMingguMask: number;
  hariLabel: string;
  jamMulai: string;
  jamSelesai: string;
  posisiTargetPersen: number;
  aktif: boolean;
};

export type PerangkatRingkas = {
  id: string;
  kode: string;
  nama: string;
  jenis: JenisPerangkat;
  status: StatusPerangkat;
  battery: number;
  signal: number;
  solarCharging: boolean;
  firmwareVersion: string;
  sensorStatus: string;
  lastDataReceived: string;
  lokasi: string;
};

export type ThresholdSetting = {
  id: string;
  metric: string;
  normal: string;
  waspada: string;
  siaga: string;
  awas: string;
};

export type BobotRisikoSetting = {
  id: string;
  metric: string;
  weight: number;
  source: string;
};

export type LaporanTemplateRingkas = {
  id: string;
  nama: string;
  periode: string;
  audience: string;
  formats: string[];
};

export type LaporanRingkas = {
  id: string;
  template: string;
  daerahNama: string;
  status: StatusLaporan;
  generatedAt: string;
  downloadUrl: string | null;
};

export type EventRingkas = {
  id: string;
  judul: string;
  status: StatusRisiko;
  state: StatusEvent;
  occurredAt: string;
  catatan: string | null;
};

// ----- aggregate yang dipakai banyak page -----

export type DashboardData = {
  daerahIrigasi: string;
  updatedAt: string;
  kpis: KpiSummary;
  titik: TitikMonitoringRingkas[];
  pintuAir: PintuAirRingkas[];
  saluran: SaluranRingkas[];
  trendMukaAir: { titikKode: string; titikNama: string; data: TrendMukaAir[] }[];
  trendDebit: { titikKode: string; titikNama: string; data: TrendDebit[] }[];
  alarmAktif: AlarmRingkas[];
};
