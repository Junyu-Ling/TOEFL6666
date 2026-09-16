import {
  resolveLoginProfile,
  sessionPayloadFromProfile,
} from "./access-store.js";
import {
  clearOauthStateCookie,
  createOauthState,
  createSessionToken,
  getCookie,
  getGoogleConfig,
  OAUTH_STATE_COOKIE,
  requestOrigin,
  setOauthStateCookie,
  setSessionCookie,
  verifyOauthState,
} from "./auth-session.js";

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.end();
}

function callbackUrl(req) {
  return `${requestOrigin(req)}/api/auth/google/callback`;
}

function firstQuery(value) {
  if (Array.isArray(value)) return String(value[0] || "");
  return value == null ? "" : String(value);
}

function queryParam(req, url, key) {
  return url.searchParams.get(key) || firstQuery(req.query?.[key]);
}

function redirectHome(req, res, params = {}) {
  const dest = new URL("/", `${requestOrigin(req)}/`);
  for (const [key, value] of Object.entries(params)) {
    if (value) dest.searchParams.set(key, value);
  }
  redirect(res, dest.toString());
}

export function handleGoogleStart(req, res) {
  const { clientId, clientSecret } = getGoogleConfig();
  if (!clientId || !clientSecret) {
    redirectHome(req, res, { login_error: "google_config" });
    return;
  }
  const state = createOauthState();
  setOauthStateCookie(req, res, state);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", callbackUrl(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("prompt", "select_account");
  redirect(res, url.toString());
}

export async function handleGoogleCallback(req, res) {
  const { clientId, clientSecret } = getGoogleConfig();
  if (!clientId || !clientSecret) {
    redirectHome(req, res, { login_error: "google_config" });
    return;
  }

  const url = new URL(req.url || "/", requestOrigin(req));
  const denied = queryParam(req, url, "error");
  const code = queryParam(req, url, "code");
  const state = queryParam(req, url, "state");
  const expected = getCookie(req, OAUTH_STATE_COOKIE);
  clearOauthStateCookie(req, res);

  if (denied) {
    redirectHome(req, res, { login_error: denied === "access_denied" ? "denied" : "server" });
    return;
  }
  if (!code) {
    redirectHome(req, res, { login_error: "missing_code" });
    return;
  }
  if (!verifyOauthState(state, expected)) {
    redirectHome(req, res, { login_error: "bad_state" });
    return;
  }

  try {
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: callbackUrl(req),
        grant_type: "authorization_code",
      }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenData.access_token) {
      redirectHome(req, res, { login_error: "token" });
      return;
    }

    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profile = await profileRes.json().catch(() => ({}));
    const email = String(profile.email || "").trim();
    if (!profile.sub || !email) {
      redirectHome(req, res, { login_error: "profile" });
      return;
    }
    if (profile.email_verified === false) {
      redirectHome(req, res, { login_error: "unverified" });
      return;
    }

    const { profile: stored, error: storeError } = await resolveLoginProfile({
      id: `google_${profile.sub}`,
      email,
      emails: [email],
      name: profile.name || profile.given_name || email.split("@")[0],
      login: email,
      avatar: profile.picture || "",
      provider: "google",
    });
    if (storeError) console.error("[auth/google] 用户库不可用：", storeError.message);
    setSessionCookie(req, res, createSessionToken(sessionPayloadFromProfile(stored)));
    redirectHome(req, res);
  } catch (err) {
    console.error("[auth/google] 登录失败：", err);
    redirectHome(req, res, { login_error: err?.status === 503 ? "secret" : "server" });
  }
}
