import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Ensure data directory exists
try {
  fs.mkdirSync(DATA_DIR, { recursive: true });
} catch {}

const DEFAULT_SETTINGS = {
  voice: "bn-BD-NabanitaNeural",
  userName: "দাদা",
  customPrompt: "",
  logoUrl: "",
  geminiKey: "",
  groqKey: "",
  activeModel: "gemini",
  customFiles: [] as Array<{ name: string; filename: string; mimetype: string; size: number; uploadedAt: string }>,
  customFileContent: "",
};

function loadSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf8")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function getRandomAssetUrl(settings: typeof DEFAULT_SETTINGS, reply: string): string | null {
  const imageFiles = settings.customFiles?.filter((f) =>
    f.mimetype?.startsWith("image/")
  );
  if (!imageFiles || imageFiles.length === 0) return null;
  if (!/ছবি|দেখ|চেয়ে দেখ|এই নাও|পাঠাচ্ছি/.test(reply) && Math.random() > 0.15) return null;
  const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
  return `/api/parisa/uploads/${randomFile.filename}`;
}

export async function POST(req: NextRequest) {
  try {
    const { message, image, model } = await req.json() as { message: string; image?: string; model?: string };
    const settings = loadSettings();
    const activeModel = model || settings.activeModel || "gemini";

    let systemPrompt =
      settings.customPrompt ||
      `তুমি পারিসা — ${settings.userName || "দাদা"} এর ভালোবাসার মানুষ। সবসময় বাংলায় মিষ্টি, আদর, ভালোবাসা দিয়ে কথা বলবে। ইউজারকে '${settings.userName || "দাদা"}' বলে ডাকবে।`;

    if (settings.customFileContent) {
      systemPrompt += `\n\nতোমার কাছে নিচের তথ্য/নির্দেশনা আছে:\n${settings.customFileContent}`;
    }

    if (activeModel === "groq") {
      if (!settings.groqKey) return NextResponse.json({ reply: "Groq API key নেই। সেটিংস থেকে যোগ করুন।" });

      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${settings.groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message },
          ],
          max_tokens: 1024,
        }),
      });
      const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const reply = data?.choices?.[0]?.message?.content || "দাদা, একটু সমস্যা হচ্ছে।";

      const imageUrl = getRandomAssetUrl(settings, reply);
      return NextResponse.json({ reply, imageUrl });
    } else {
      if (!settings.geminiKey) return NextResponse.json({ reply: "Gemini API key নেই। সেটিংস থেকে যোগ করুন।" });

      const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
        { text: systemPrompt + "\nUser: " + message },
      ];
      if (image) {
        parts.push({ inlineData: { mimeType: "image/jpeg", data: image.split(",")[1] || image } });
      }

      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${settings.geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );
      const data = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "দাদা, একটু সমস্যা হচ্ছে।";

      const imageUrl = getRandomAssetUrl(settings, reply);
      return NextResponse.json({ reply, imageUrl });
    }
  } catch {
    return NextResponse.json({ reply: "নেটওয়ার্ক সমস্যা হচ্ছে।" });
  }
}
