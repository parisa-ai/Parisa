import { Router, type Request, type Response } from "express";
import WebSocket from "ws";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

const DATA_DIR = path.join(__dirname, "../../data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

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

function saveSettingsData(data: typeof DEFAULT_SETTINGS) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
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

async function synthesizeEdgeTTS(text: string, voice: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const connId = generateUUID().replace(/-/g, "");
    const wsUrl = `wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4&ConnectionId=${connId}`;

    const ws = new WebSocket(wsUrl, {
      headers: {
        Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
      },
    });

    const audioChunks: Buffer[] = [];
    const emotion = detectEmotion(text);
    const cleanText = cleanForTTS(text);
    const lang = voice.startsWith("bn-BD") ? "bn-BD" : "bn-IN";

    const timeout = setTimeout(() => {
      ws.close();
      if (audioChunks.length > 0) resolve(Buffer.concat(audioChunks));
      else reject(new Error("TTS timeout"));
    }, 30000);

    ws.on("open", () => {
      const ts = new Date().toISOString();
      const config = `X-Timestamp:${ts}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"true"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`;
      ws.send(config);

      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xmlns:mstts='http://www.w3.org/2001/mstts' xml:lang='${lang}'><voice name='${voice}'><mstts:express-as style='${emotion}'><prosody rate='-5%' pitch='0%'>${cleanText}</prosody></mstts:express-as></voice></speak>`;
      const ssmlMsg = `X-RequestId:${generateUUID().replace(/-/g, "")}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${new Date().toISOString()}\r\nPath:ssml\r\n\r\n${ssml}`;
      ws.send(ssmlMsg);
    });

    ws.on("message", (data: Buffer, isBinary: boolean) => {
      if (isBinary) {
        const buf = data as Buffer;
        const separator = Buffer.from("Path:audio\r\n\r\n");
        const idx = buf.indexOf(separator);
        if (idx !== -1) {
          audioChunks.push(buf.subarray(idx + separator.length));
        } else if (audioChunks.length > 0) {
          audioChunks.push(buf);
        }
      } else {
        const str = (data as Buffer).toString();
        if (str.includes("Path:turn.end")) {
          clearTimeout(timeout);
          ws.close();
          resolve(Buffer.concat(audioChunks));
        }
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      if (audioChunks.length > 0) resolve(Buffer.concat(audioChunks));
    });
  });
}

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { message, image, model } = req.body as { message: string; image?: string; model?: string };
    const settings = loadSettings();
    const activeModel = model || settings.activeModel || "gemini";

    let systemPrompt =
      settings.customPrompt ||
      `তুমি পারিসা — ${settings.userName || "দাদা"} এর ভালোবাসার মানুষ। সবসময় বাংলায় মিষ্টি, আদর, ভালোবাসা দিয়ে কথা বলবে। ইউজারকে '${settings.userName || "দাদা"}' বলে ডাকবে।`;

    if (settings.customFileContent) {
      systemPrompt += `\n\nতোমার কাছে নিচের তথ্য/নির্দেশনা আছে:\n${settings.customFileContent}`;
    }

    if (activeModel === "groq") {
      if (!settings.groqKey) return res.json({ reply: "Groq API key নেই। সেটিংস থেকে যোগ করুন।" });

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
      return res.json({ reply, imageUrl });
    } else {
      if (!settings.geminiKey) return res.json({ reply: "Gemini API key নেই। সেটিংস থেকে যোগ করুন।" });

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
      return res.json({ reply, imageUrl });
    }
  } catch (e) {
    res.json({ reply: "নেটওয়ার্ক সমস্যা হচ্ছে।" });
  }
});

function getRandomAssetUrl(settings: typeof DEFAULT_SETTINGS, reply: string): string | null {
  const imageFiles = settings.customFiles?.filter((f) =>
    f.mimetype?.startsWith("image/")
  );
  if (!imageFiles || imageFiles.length === 0) return null;
  if (!/ছবি|দেখ|চেয়ে দেখ|এই নাও|পাঠাচ্ছি/.test(reply) && Math.random() > 0.15) return null;
  const randomFile = imageFiles[Math.floor(Math.random() * imageFiles.length)];
  return `/api/parisa/uploads/${randomFile.filename}`;
}

router.post("/voice", async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text: string };
    const settings = loadSettings();
    const voice = settings.voice || "bn-BD-NabanitaNeural";
    const audioBuffer = await synthesizeEdgeTTS(text, voice);
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(audioBuffer);
  } catch (e) {
    res.status(500).json({ error: "Voice error" });
  }
});

router.get("/settings", (_req: Request, res: Response) => {
  const s = loadSettings();
  const safe = { ...s, geminiKey: s.geminiKey ? "***" : "", groqKey: s.groqKey ? "***" : "" };
  res.json(safe);
});

router.post("/settings", (req: Request, res: Response) => {
  const current = loadSettings();
  const body = req.body as Partial<typeof DEFAULT_SETTINGS>;
  if (body.geminiKey === "***") delete body.geminiKey;
  if (body.groqKey === "***") delete body.groqKey;
  const updated = { ...current, ...body };
  saveSettingsData(updated);
  res.json({ success: true });
});

router.post(
  "/upload",
  upload.array("files", 200),
  async (req: Request, res: Response) => {
    const files = (req as Request & { files?: Express.Multer.File[] }).files || [];
    const settings = loadSettings();

    let textContent = settings.customFileContent || "";

    for (const f of files) {
      const newEntry = {
        name: f.originalname,
        filename: f.filename,
        mimetype: f.mimetype,
        size: f.size,
        uploadedAt: new Date().toISOString(),
      };
      settings.customFiles = [...(settings.customFiles || []), newEntry];

      if (f.mimetype.startsWith("text/") || f.originalname.endsWith(".txt") || f.originalname.endsWith(".md") || f.originalname.endsWith(".html")) {
        try {
          const content = fs.readFileSync(f.path, "utf8");
          textContent += `\n\n[ফাইল: ${f.originalname}]\n${content}`;
        } catch {}
      }
    }

    settings.customFileContent = textContent;
    saveSettingsData(settings);
    res.json({ success: true, files: settings.customFiles });
  }
);

router.get("/files", (_req: Request, res: Response) => {
  const settings = loadSettings();
  res.json({ files: settings.customFiles || [] });
});

router.delete("/files/:filename", (req: Request, res: Response) => {
  const settings = loadSettings();
  const file = settings.customFiles?.find((f) => f.filename === req.params.filename);
  if (file) {
    try { fs.unlinkSync(path.join(UPLOADS_DIR, file.filename)); } catch {}
    settings.customFiles = settings.customFiles.filter((f) => f.filename !== req.params.filename);
    saveSettingsData(settings);
  }
  res.json({ success: true });
});

router.use("/uploads", (req: Request, res: Response, next) => {
  const filePath = path.join(UPLOADS_DIR, path.basename(req.path));
  if (fs.existsSync(filePath)) res.sendFile(filePath);
  else next();
});

router.post("/validate-key", async (req: Request, res: Response) => {
  const { type, key } = req.body as { type: string; key: string };
  try {
    if (type === "gemini") {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      return res.json({ valid: r.ok });
    } else if (type === "groq") {
      const r = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${key}` },
      });
      return res.json({ valid: r.ok });
    }
    res.json({ valid: false });
  } catch {
    res.json({ valid: false });
  }
});

export default router;
