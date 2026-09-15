import { isClonedVoiceConfigured } from "../../server/tts-minimax.js";

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method Not Allowed" });
    return;
  }
  sendJson(res, 200, { available: isClonedVoiceConfigured() });
}
