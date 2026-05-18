import express from "express";
import cors from "cors";
import fetch from "node-fetch";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// 🔑 তোমার API KEY বসাও
const GEMINI_KEYS = ["AIzaSyCdfMuWBBDPfTKbolFG1GxR4RtPa9T5BkA","AIzaSyDnqsRMviMNTOefVbUzTPVlUpO8idZkd8M"];
const ELEVEN_KEYS = ["sk_ebf307456d9539d09c25867a5448375e2f75471c0800e84b","sk_4b4e048d09708cb0fe40e6da24b604fef518c1680d0a93f5"];

let gi = 0, ei = 0;
const gKey = () => GEMINI_KEYS[(gi++) % GEMINI_KEYS.length];
const eKey = () => ELEVEN_KEYS[(ei++) % ELEVEN_KEYS.length];

// 💬 Chat + Image (একই endpoint)
app.post("/chat", async (req, res) => {
  try {
    const { message, image } = req.body;

    const parts = [
      {
        text:
          "তুমি Parisa 💖, সবসময় নরমভাবে কথা বলবে, ইউজারকে 'দাদা' বলে ডাকবে।\nUser: " +
          message
      }
    ];

    // যদি image আসে (base64)
    if (image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image.split(",")[1]
        }
      });
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${gKey()}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      }
    );

    const data = await r.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "দাদা, একটু সমস্যা হচ্ছে 😔";

    res.json({ reply });
  } catch (e) {
    res.json({ reply: "Error 😔" });
  }
});

// 🔊 Voice
app.post("/voice", async (req, res) => {
  try {
    const { text } = req.body;
    const r = await fetch(
      "https://api.elevenlabs.io/v1/text-to-speech/EXAVITQu4vr4xnSDxMaL",
      {
        method: "POST",
        headers: {
          "xi-api-key": eKey(),
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2"
        })
      }
    );
    const buf = await r.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(buf));
  } catch {
    res.status(500).send("voice error");
  }
});

app.use(express.static("public"));
app.listen(3000, () => console.log("Server running on 3000"));