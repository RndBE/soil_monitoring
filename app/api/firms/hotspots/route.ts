import { NextResponse } from "next/server";

import { FIRMS_BBOX, parseFirmsCsv, sortHotspots, type FirmsFeed } from "@/lib/peatland/firms";

export const dynamic = "force-dynamic";

// Hotspot VIIRS untuk KHG + zona penyangga. Dengan FIRMS_MAP_KEY memakai Area API
// (72 jam, hanya kotak KHG). Tanpa key memakai file CSV publik Asia Tenggara 48 jam
// (~3 MB per satelit) lalu disaring di server. Suomi NPP tidak dipakai: FIRMS
// menghentikan datanya per 2 Nov 2026.

const FIRMS = "https://firms.modaps.eosdis.nasa.gov";
const CACHE_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 25_000;

const SOURCES = [
  { label: "NOAA-20", api: "VIIRS_NOAA20_NRT", file: "noaa-20-viirs-c2/csv/J1_VIIRS_C2_SouthEast_Asia_48h.csv" },
  { label: "NOAA-21", api: "VIIRS_NOAA21_NRT", file: "noaa-21-viirs-c2/csv/J2_VIIRS_C2_SouthEast_Asia_48h.csv" },
];

let cache: { at: number; feed: FirmsFeed } | null = null;
let inflight: Promise<FirmsFeed> | null = null;

async function loadFeed(): Promise<FirmsFeed> {
  const key = process.env.FIRMS_MAP_KEY?.trim();
  const source = key ? "api" : "public";
  const windowHours = key ? 72 : 48;
  const now = Date.now();

  const results = await Promise.allSettled(
    SOURCES.map(async (s) => {
      const url = key
        ? `${FIRMS}/api/area/csv/${encodeURIComponent(key)}/${s.api}/${FIRMS_BBOX.join(",")}/3`
        : `${FIRMS}/data/active_fire/${s.file}`;
      const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(TIMEOUT_MS) });
      // URL tidak pernah dicatat: pada mode API isinya memuat MAP_KEY.
      if (!res.ok) throw new Error(`${s.label}: HTTP ${res.status}`);
      return parseFirmsCsv(await res.text(), windowHours, now);
    }),
  );

  const failed = SOURCES.filter((_, i) => results[i].status === "rejected").map((s) => s.label);
  if (failed.length === SOURCES.length) {
    const reason = (results[0] as PromiseRejectedResult).reason;
    throw new Error(reason instanceof Error ? reason.message : String(reason));
  }
  for (const [i, r] of results.entries()) {
    if (r.status === "rejected") console.error(`[firms] ${SOURCES[i].label} gagal:`, r.reason instanceof Error ? r.reason.message : r.reason);
  }

  const hotspots = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  return { source, windowHours, fetchedAt: new Date(now).toISOString(), hotspots: sortHotspots(hotspots), failed };
}

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json(cache.feed, { headers: { "Cache-Control": "private, no-store" } });
  }

  // Satu pengambilan untuk semua request yang datang bersamaan.
  inflight ??= loadFeed().finally(() => {
    inflight = null;
  });

  try {
    const feed = await inflight;
    cache = { at: Date.now(), feed };
    return NextResponse.json(feed, { headers: { "Cache-Control": "private, no-store" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[firms] gagal memuat hotspot:", message);
    if (cache) {
      return NextResponse.json({ ...cache.feed, stale: true }, { headers: { "Cache-Control": "private, no-store" } });
    }
    return NextResponse.json({ error: `Data FIRMS tidak tersedia: ${message}` }, { status: 502 });
  }
}
