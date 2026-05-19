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

export async function GET() {
  const settings = loadSettings();
  return NextResponse.json({ files: settings.customFiles || [] });
}
