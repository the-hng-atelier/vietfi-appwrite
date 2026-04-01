import { NextResponse } from "next/server";

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL!;

export async function GET() {
  try {
    const res = await fetch(`${RAILWAY_URL}/market-data`, {
      next: { revalidate: 300 }, // cache 5 phút
    });
    if (!res.ok) throw new Error(`Railway responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[market-data] Railway fetch failed:", err);
    return NextResponse.json({ error: "Market data unavailable" }, { status: 500 });
  }
}
