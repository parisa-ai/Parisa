import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { type, key } = await req.json() as { type: string; key: string };
    
    if (type === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return NextResponse.json({ valid: r.ok });
    } else if (type === "groq") {
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return NextResponse.json({ valid: r.ok });
    }
    
    return NextResponse.json({ valid: false });
  } catch {
    return NextResponse.json({ valid: false });
  }
}
