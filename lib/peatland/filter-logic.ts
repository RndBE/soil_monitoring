// Logika murni untuk filter dashboard (estate / division / date range).
// Tidak memakai React — bisa diimpor server maupun client. Provider & hook ada
// di [[filters]] (filters.tsx). Lihat juga [[mock-data]].

export const ESTATE_OPTIONS = [
  "Sei Galuh Estate",
  "Sungai Rokan Estate",
  "Kampar Estate",
  "Indragiri Estate",
]

export const ALL_BLOCKS = "All Blocks"
export const DIVISION_OPTIONS = [ALL_BLOCKS, "Block A", "Block B", "Block C", "Block D", "Block E"]

export const DATE_RANGE_OPTIONS = [
  "Hari ini",
  "9 - 10 Sep 2024",
  "7 hari terakhir",
  "Bulan ini",
  "Kuartal ini",
]

export type DashboardFilterState = {
  estate: string
  division: string
  dateRange: string
}

// Faktor deterministik per estate (estate utama = 1.0) supaya angka ikut berubah
// saat estate diganti, tanpa data acak. Rentang tetap wajar (0.86–1.12).
const ESTATE_FACTORS = [1, 0.92, 1.08, 0.86, 0.97, 1.12]

export function estateFactor(estate: string): number {
  const i = ESTATE_OPTIONS.indexOf(estate)
  return ESTATE_FACTORS[(i < 0 ? 0 : i) % ESTATE_FACTORS.length]
}

export function scaleNumber(value: number, estate: string, decimals = 0): number {
  const p = 10 ** decimals
  return Math.round(value * estateFactor(estate) * p) / p
}

// Skala string angka sambil mempertahankan format aslinya (mis. "-35", "18.6",
// "128", "92%"). Non-angka dikembalikan apa adanya.
export function scaleNumericString(value: string, estate: string): string {
  const m = value.match(/^(-?\d+(?:\.\d+)?)(\D*)$/)
  if (!m) return value
  const num = m[1]
  const suffix = m[2] ?? ""
  const decimals = num.includes(".") ? num.split(".")[1].length : 0
  return scaleNumber(parseFloat(num), estate, decimals).toFixed(decimals) + suffix
}

// True bila baris (dengan field block opsional) cocok dengan division terpilih.
export function matchesBlock(block: string | undefined | null, division: string): boolean {
  if (!division || division === ALL_BLOCKS) return true
  return block === division
}

// Jumlah titik terakhir dari deret tren yang ditampilkan untuk sebuah rentang.
export function pointsForRange(dateRange: string, total: number): number {
  switch (dateRange) {
    case "Hari ini":
    case "9 - 10 Sep 2024":
      return Math.min(2, total)
    case "7 hari terakhir":
      return Math.min(7, total)
    default:
      return total
  }
}

// Potong deret waktu (data terbaru di akhir) sesuai rentang tanggal terpilih.
export function sliceSeries<T>(series: T[], dateRange: string): T[] {
  return series.slice(series.length - pointsForRange(dateRange, series.length))
}
