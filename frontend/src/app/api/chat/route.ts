import { NextResponse } from "next/server";

const APPWRITE_FUNCTION_ID = process.env.NEXT_PUBLIC_APPWRITE_FUNCTION_ID!;
const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;

export async function POST(req: Request) {
  const body = await req.json();
  const { message, history } = body;

  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${APPWRITE_ENDPOINT}/functions/${APPWRITE_FUNCTION_ID}/executions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
        },
        body: JSON.stringify({ message, history: history ?? [] }),
      }
    );

    if (!res.ok) throw new Error(`Appwrite responded ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[chat] Appwrite function error:", err);
    return NextResponse.json({ error: "Chat unavailable" }, { status: 500 });
  }
}
