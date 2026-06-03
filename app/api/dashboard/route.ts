import { getDashboardData } from "@/lib/backend/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getDashboardData();
    return Response.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal mengambil data dashboard.";
    return Response.json({ error: message }, { status: 500 });
  }
}
