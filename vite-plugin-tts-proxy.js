import { loadEnv } from "vite";
import { cloneOwnVoice, isClonedVoiceConfigured, synthesizeVocabWord } from "./server/tts-minimax.js";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function matchApiPath(url, path) {
  return url === path || url?.startsWith(`${path}?`);
}

function applyEnv(env) {
  for (const key of ["MINIMAX_API_KEY", "MINIMAX_API_BASE", "MINIMAX_GROUP_ID", "MINIMAX_TTS_MODEL"]) {
    if (env[key] && !process.env[key]) process.env[key] = env[key];
  }
}

export function ttsProxyPlugin() {
  return {
    name: "tts-proxy",
    configResolved(config) {
      applyEnv(loadEnv(config.mode, config.root, ""));
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const isStatus = matchApiPath(req.url, "/api/tts/status");
        const isClone = matchApiPath(req.url, "/api/tts/clone");
        const isSpeak = matchApiPath(req.url, "/api/tts/speak");
        if (!isStatus && !isClone && !isSpeak) return next();

        try {
          if (isStatus && req.method === "GET") {
            res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
            sendJson(res, 200, { available: isClonedVoiceConfigured() });
            return;
          }

          if (isSpeak && (req.method === "GET" || req.method === "HEAD")) {
            const url = new URL(req.url || "/", "http://n");
            const audio = await synthesizeVocabWord({
              word: url.searchParams.get("word"),
              voiceId: url.searchParams.get("voiceId"),
            });
            res.statusCode = 200;
            res.setHeader("Content-Type", "audio/mpeg");
            res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
            res.setHeader("X-Content-Type-Options", "nosniff");
            res.end(audio);
            return;
          }

          if (req.method !== "POST") {
            sendJson(res, 405, { error: "Method Not Allowed" });
            return;
          }

          const body = JSON.parse((await readBody(req)) || "{}");

          if (isClone) {
            const result = await cloneOwnVoice(body);
            sendJson(res, 200, result);
            return;
          }

          const audio = await synthesizeVocabWord({ word: body.word, voiceId: body.voiceId });
          res.statusCode = 200;
          res.setHeader("Content-Type", "audio/mpeg");
          res.setHeader("Cache-Control", "public, max-age=86400, s-maxage=604800, immutable");
          res.setHeader("X-Content-Type-Options", "nosniff");
          res.end(audio);
        } catch (err) {
          sendJson(res, err.status || 500, { error: err.message || "朗读失败" });
        }
      });
    },
  };
}
