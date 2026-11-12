/**
 * GPT-SoVITS 桥接：跑在有 GPU、已启动官方 api_v2.py 的机器上。
 *
 *   python api_v2.py -a 127.0.0.1 -p 9880
 *   GPT_SOVITS_ORIGIN=http://127.0.0.1:9880 node scripts/gptsovits-bridge.mjs
 *
 * 然后把本机公网地址（或 ngrok）配到 Vercel / .env 的 GPT_SOVITS_API_URL。
 */
import { createServer } from "node:http";
import { mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

const origin = String(process.env.GPT_SOVITS_ORIGIN || "http://127.0.0.1:9880").replace(/\/$/, "");
const port = Number(process.env.GPT_SOVITS_BRIDGE_PORT || 9888);

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks)));
  });
}

function decodeAudio(audioBase64) {
  const raw = String(audioBase64 || "").replace(/^data:audio\/[^;]+;base64,/, "");
  if (!raw) throw new Error("缺少参考音频");
  return Buffer.from(raw, "base64");
}

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", "http://bridge.local");
  if (req.method === "GET" && url.pathname === "/status") {
    sendJson(res, 200, { ok: true, origin });
    return;
  }

  if (req.method !== "POST" || url.pathname !== "/tts") {
    sendJson(res, 404, { error: "Not Found" });
    return;
  }

  let tmp = "";
  try {
    const body = JSON.parse((await readBody(req)).toString("utf8") || "{}");
    const word = String(body.word || body.text || "").trim();
    if (!word) {
      sendJson(res, 400, { error: "缺少要朗读的单词" });
      return;
    }
    const wav = decodeAudio(body.audioBase64);
    const dir = join(tmpdir(), "toefl666-gsv");
    mkdirSync(dir, { recursive: true });
    tmp = join(dir, `${randomBytes(8).toString("hex")}.wav`);
    writeFileSync(tmp, wav);

    const upstream = await fetch(`${origin}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: word,
        text_lang: "en",
        ref_audio_path: tmp,
        prompt_text: String(body.promptText || body.prompt_text || ""),
        prompt_lang: "en",
        text_split_method: "cut0",
        media_type: "wav",
        streaming_mode: false,
        speed_factor: 1,
        batch_size: 1,
      }),
    });

    const type = String(upstream.headers.get("content-type") || "audio/wav");
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (!upstream.ok) {
      let message = "GPT-SoVITS 推理失败";
      try {
        message = JSON.parse(buf.toString("utf8")).message || message;
      } catch {
        // keep default
      }
      sendJson(res, upstream.status || 502, { error: message });
      return;
    }
    res.writeHead(200, {
      "Content-Type": type.includes("json") ? "audio/wav" : type,
      "Access-Control-Allow-Origin": "*",
    });
    res.end(buf);
  } catch (err) {
    sendJson(res, 500, { error: err.message || "桥接失败" });
  } finally {
    if (tmp) {
      try {
        unlinkSync(tmp);
      } catch {
        // ignore
      }
    }
  }
}).listen(port, () => {
  console.log(`GPT-SoVITS bridge http://127.0.0.1:${port} -> ${origin}`);
});
