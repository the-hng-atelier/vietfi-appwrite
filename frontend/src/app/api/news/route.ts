import { NextResponse } from "next/server";

const RAILWAY_URL = process.env.NEXT_PUBLIC_RAILWAY_URL!;

export async function GET() {
  try {
    const res = await fetch(`${RAILWAY_URL}/news`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) throw new Error(`Railway responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[news] Railway fetch failed:", err);
    return NextResponse.json({ error: "News unavailable" }, { status: 500 });
  }
}
