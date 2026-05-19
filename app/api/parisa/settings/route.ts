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

function saveSettingsData(data: typeof DEFAULT_SETTINGS) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

export async function GET() {
  const s = loadSettings();
  const safe = { ...s, geminiKey: s.geminiKey ? "***" : "", groqKey: s.groqKey ? "***" : "" };
  return NextResponse.json(safe);
}

export async function POST(req: NextRequest) {
  const current = loadSettings();
  const body = await req.json() as Partial<typeof DEFAULT_SETTINGS>;
  if (body.geminiKey === "***") delete body.geminiKey;
  if (body.groqKey === "***") delete body.groqKey;
  const updated = { ...current, ...body };
  saveSettingsData(updated);
  return NextResponse.json({ success: true });
}
