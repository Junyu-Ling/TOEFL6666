function bufToBase64(buf) {
  const bytes = buf instanceof ArrayBuffer ? new Uint8Array(buf) : new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(String(b64 || ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const dig = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(dig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomNonce(bytes = 16) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

let keyPairPromise = null;

export async function getReadingFillKeyPair() {
  if (!keyPairPromise) {
    keyPairPromise = crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["encrypt", "decrypt"]
    );
  }
  return keyPairPromise;
}

export async function exportReadingFillPublicKey() {
  const { publicKey } = await getReadingFillKeyPair();
  const spki = await crypto.subtle.exportKey("spki", publicKey);
  return bufToBase64(spki);
}

export async function buildReadingFillRequest(userId) {
  const ts = Date.now();
  const nonce = randomNonce(16);
  const id = String(userId || "").trim();
  const sig = await sha256Hex(`${ts}.${nonce}.${id}.reading-fill.v1`);
  const pubKey = await exportReadingFillPublicKey();
  return { ts, nonce, sig, pubKey };
}

export async function decryptReadingFillPacket(packet) {
  if (!packet || packet.v !== 1 || !packet.ct || !packet.wk) {
    throw new Error("题目数据包无效");
  }
  const { privateKey } = await getReadingFillKeyPair();
  const aesKeyRaw = await crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    privateKey,
    base64ToBuf(packet.wk)
  );
  const aesKey = await crypto.subtle.importKey("raw", aesKeyRaw, { name: "AES-GCM" }, false, [
    "decrypt",
  ]);
  const iv = base64ToBuf(packet.iv);
  const tag = new Uint8Array(base64ToBuf(packet.tag));
  const ct = new Uint8Array(base64ToBuf(packet.ct));
  const combined = new Uint8Array(ct.length + tag.length);
  combined.set(ct, 0);
  combined.set(tag, ct.length);
  const plainBuf = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    aesKey,
    combined
  );
  const parsed = JSON.parse(new TextDecoder().decode(plainBuf));
  if (!Array.isArray(parsed?.articles)) throw new Error("题目解密失败");
  return { articles: parsed.articles, watermark: packet.watermark || null };
}
