// Helper formatting umum yang dipakai banyak query.

export function statusEnumToLabel(status: string): "Normal" | "Waspada" | "Siaga" | "Awas" {
  switch (status) {
    case "WASPADA":
      return "Waspada";
    case "SIAGA":
      return "Siaga";
    case "AWAS":
      return "Awas";
    case "NORMAL":
    default:
      return "Normal";
  }
}

export function deviceStatusToLabel(
  status: string,
): "Online" | "Weak" | "Offline" | "Maintenance" {
  switch (status) {
    case "WEAK":
      return "Weak";
    case "OFFLINE":
      return "Offline";
    case "MAINTENANCE":
      return "Maintenance";
    case "ONLINE":
    default:
      return "Online";
  }
}

export function modePintuLabel(mode: string): "Manual" | "Otomatis" | "Terjadwal" {
  switch (mode) {
    case "OTOMATIS":
      return "Otomatis";
    case "TERJADWAL":
      return "Terjadwal";
    case "MANUAL":
    default:
      return "Manual";
  }
}

export function eventStateLabel(state: string): "Open" | "In Progress" | "Resolved" {
  switch (state) {
    case "IN_PROGRESS":
      return "In Progress";
    case "RESOLVED":
      return "Resolved";
    case "OPEN":
    default:
      return "Open";
  }
}

export function sumberAktuasiLabel(
  sumber: string,
): "Manual" | "Jadwal" | "Alarm" | "Override" {
  switch (sumber) {
    case "JADWAL":
      return "Jadwal";
    case "ALARM":
      return "Alarm";
    case "OVERRIDE":
      return "Override";
    case "MANUAL":
    default:
      return "Manual";
  }
}

export function statusLaporanLabel(s: string): "Queued" | "Ready" | "Failed" {
  switch (s) {
    case "READY":
      return "Ready";
    case "FAILED":
      return "Failed";
    case "QUEUED":
    default:
      return "Queued";
  }
}

const DATE_FMT = new Intl.DateTimeFormat("id-ID", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const TIME_FMT = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jakarta",
});

const DAY_FMT = new Intl.DateTimeFormat("id-ID", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Jakarta",
});

export function formatDateTime(d: Date): string {
  return DATE_FMT.format(d).replace(/\./g, ":");
}

export function formatTime(d: Date): string {
  return TIME_FMT.format(d).replace(/\./g, ":");
}

export function formatDay(d: Date): string {
  return DAY_FMT.format(d);
}

export function relativeFrom(d: Date, now = new Date()): string {
  const diffMs = now.getTime() - d.getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export function hariMaskToLabel(mask: number): string {
  const labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
  const aktif: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    if (mask & (1 << i)) aktif.push(labels[i]);
  }
  if (aktif.length === 7) return "Setiap hari";
  if (aktif.length === 5 && mask === 31) return "Sen-Jum";
  return aktif.join(", ") || "Tidak aktif";
}
