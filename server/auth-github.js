import {
  clearOauthStateCookie,
  clearSessionCookie,
  createSessionToken,
  getGithubConfig,
  getCookie,
  OAUTH_STATE_COOKIE,
  randomState,
  readSessionUser,
  requestOrigin,
  setOauthStateCookie,
  setSessionCookie,
} from "./auth-session.js";

function createError(message, status) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

function callbackUrl(req) {
  return `${requestOrigin(req)}/api/auth/github/callback`;
}

export function handleGithubStart(req, res) {
  const { clientId, clientSecret } = getGithubConfig();
  if (!clientId || !clientSecret) {
    throw createError("GitHub 登录未配置 Client Secret。在 Vercel / .env 中设置 GITHUB_CLIENT_SECRET。", 503);
  }
  const state = randomState();
  setOauthStateCookie(req, res, state);
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl(req));
  url.searchParams.set("scope", "read:user user:email");
  url.searchParams.set("state", state);
  redirect(res, url.toString());
}

export async function handleGithubCallback(req, res) {
  const { clientId, clientSecret } = getGithubConfig();
  if (!clientId || !clientSecret) {
    throw createError("GitHub 登录未配置 Client Secret。", 503);
  }

  const url = new URL(req.url || "/", requestOrigin(req));
  const code = url.searchParams.get("code") || String(req.query?.code || "");
  const state = url.searchParams.get("state") || String(req.query?.state || "");
  const expected = getCookie(req, OAUTH_STATE_COOKIE);
  clearOauthStateCookie(req, res);

  if (!code) throw createError("GitHub 未返回授权码", 400);
  if (!state || !expected || state !== expected) throw createError("登录状态校验失败，请重试", 400);

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "TOEFL6666",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl(req),
    }),
  });
  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenData.access_token) {
    throw createError(tokenData.error_description || "GitHub 换票失败", 401);
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${tokenData.access_token}`,
      "User-Agent": "TOEFL6666",
    },
  });
  const profile = await userRes.json().catch(() => ({}));
  if (!profile.id) throw createError("无法读取 GitHub 账号", 401);

  let email = profile.email || "";
  if (!email) {
    const emailRes = await fetch("https://api.github.com/user/emails", {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${tokenData.access_token}`,
        "User-Agent": "TOEFL6666",
      },
    });
    const emails = await emailRes.json().catch(() => []);
    const primary = Array.isArray(emails)
      ? emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified) || emails[0]
      : null;
    email = primary?.email || "";
  }

  const sessionUser = {
    id: `gh_${profile.id}`,
    email,
    phone: "",
    name: profile.name || profile.login || "",
    login: profile.login || "",
    avatar: profile.avatar_url || "",
    provider: "github",
  };
  setSessionCookie(req, res, createSessionToken(sessionUser));
  redirect(res, `${requestOrigin(req)}/`);
}

export function handleAuthMe(req, res) {
  const user = readSessionUser(req);
  if (!user) {
    sendJson(res, 200, { user: null });
    return;
  }
  sendJson(res, 200, { user });
}

export function handleAuthLogout(req, res) {
  clearSessionCookie(req, res);
  sendJson(res, 200, { ok: true });
}
