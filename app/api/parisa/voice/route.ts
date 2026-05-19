import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

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

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function detectEmotion(text: string): string {
  if (/খুশি|আনন্দ|হাসি|দারুণ|অসাধারণ|ভালোবাসা|ভালো লাগছে|মজা|হাহাহা|প্রেম|ভালোবাসি/.test(text)) return "cheerful";
  if (/কষ্ট|দুঃখ|মন খারাপ|কাঁদছি|মিস|কান্না|একা|বিষণ্ণ|ব্যথা|কাঁদি|ভুলতে পারছি না/.test(text)) return "sad";
  if (/রাগ|বিরক্ত|রাগান্বিত|অসহ্য|ঘৃণা/.test(text)) return "angry";
  return "general";
}

function cleanForTTS(text: string): string {
  return text
    .replace(/[*_`~#>]/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[\u{1F300}-\u{1FFFF}]/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/\p{Emoji_Presentation}/gu, "")
    .replace(/\n+/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .trim();
}

async function synthesizeEdgeTTS(text: string, voice: string): Promise<ArrayBuffer> {
  // Edge TTS via WebSocket - this is a simplified version
  // For production, consider using a proper TTS service
  const connId = generateUUID().replace(/-/g, "");
  const emotion = detectEmotion(text);
  const cleanText = cleanForTTS(text);
  const lang = voice.startsWith("bn-BD") ? "bn-BD" : "bn-IN";

  return new Promise((resolve, reject) => {
    const audioChunks: Uint8Array[] = [];
    
    // Since WebSocket in Node.js requires ws package which may not be available,
    // we'll use a fallback approach with fetch-based TTS
    // For now, return empty audio to indicate the feature needs external TTS service
    
    const timeout = setTimeout(() => {
      if (audioChunks.length > 0) {
        const totalLength = audioChunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of audioChunks) {
          result.set(chunk, offset);
          offset += chunk.length;
        }
        resolve(result.buffer);
      } else {
        reject(new Error("TTS not available - please configure a TTS service"));
      }
    }, 100);

    // Clear timeout immediately since we're using fallback
    clearTimeout(timeout);
    reject(new Error("TTS requires server-side WebSocket support. Please run the api-server for voice features."));
  });
}

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json() as { text: string };
    const settings = loadSettings();
    const voice = settings.voice || "bn-BD-NabanitaNeural";
    
    try {
      const audioBuffer = await synthesizeEdgeTTS(text, voice);
      return new NextResponse(audioBuffer, {
        headers: {
          "Content-Type": "audio/mpeg",
        },
      });
    } catch {
      // TTS not available in Next.js API routes without ws package
      // Return a message indicating voice is not available
      return NextResponse.json({ error: "Voice synthesis requires the api-server to be running" }, { status: 503 });
    }
  } catch {
    return NextResponse.json({ error: "Voice error" }, { status: 500 });
  }
}
