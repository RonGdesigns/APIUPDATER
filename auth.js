import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const TOKEN_FILE = path.join(__dirname, '.token');

// GitHub Device Flow endpoints
const GITHUB_DEVICE_CODE_URL  = 'https://github.com/login/device/code';
const GITHUB_TOKEN_URL        = 'https://github.com/login/oauth/access_token';
const GITHUB_USER_URL         = 'https://api.github.com/user';

// Required OAuth scopes: repo (clone/push) + workflow (create PRs triggering actions)
const SCOPE = 'repo,workflow';

// In-memory store for the active device flow session
let activeSession = null;

/**
 * Read the stored access token from disk (if any).
 */
export function readStoredToken() {
  try {
    const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
    return data.access_token || null;
  } catch {
    return null;
  }
}

/**
 * Write the access token to disk.
 */
function writeToken(tokenData) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(tokenData, null, 2), 'utf8');
}

/**
 * Delete the stored token (logout).
 */
export function clearToken() {
  try { fs.unlinkSync(TOKEN_FILE); } catch { /* already gone */ }
  activeSession = null;
}

/**
 * Step 1 — Request a device code from GitHub.
 * Returns { user_code, verification_uri, expires_in, interval, device_code }
 */
export async function startDeviceFlow(clientId) {
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('scope', SCOPE);

  const res = await fetch(GITHUB_DEVICE_CODE_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'API-Updater-Dashboard',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GitHub returned HTTP ${res.status}: ${errText}`);
  }
  const data = await res.json();

  if (data.error) throw new Error(data.error_description || data.error);

  // Store session state
  activeSession = {
    clientId,
    deviceCode:      data.device_code,
    userCode:        data.user_code,
    verificationUri: data.verification_uri,
    expiresAt:       Date.now() + (data.expires_in * 1000),
    interval:        (data.interval || 5) * 1000,
    status:          'pending', // pending | authorized | expired | error
    accessToken:     null,
  };

  return {
    user_code:        data.user_code,
    verification_uri: data.verification_uri,
    expires_in:       data.expires_in,
    interval:         data.interval,
  };
}

/**
 * Step 2 — Poll GitHub for the access token.
 * Called by the frontend every `interval` seconds.
 * Returns { status: 'pending' | 'authorized' | 'expired' | 'error', user? }
 */
export async function pollDeviceFlow() {
  if (!activeSession) return { status: 'no_session' };
  if (activeSession.status === 'authorized') {
    return { status: 'authorized', user: activeSession.user };
  }
  if (Date.now() > activeSession.expiresAt) {
    activeSession.status = 'expired';
    return { status: 'expired' };
  }

  // Poll GitHub
  const params = new URLSearchParams();
  params.append('client_id', activeSession.clientId);
  params.append('device_code', activeSession.deviceCode);
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:device_code');

  const res = await fetch(GITHUB_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'API-Updater-Dashboard',
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { status: 'error', message: `HTTP ${res.status}: ${errText}` };
  }

  const data = await res.json();

  if (data.access_token) {
    console.log('🔑 Device flow polling success: Access token received.');
    
    // Success — fetch user info (requires User-Agent header)
    const userRes  = await fetch(GITHUB_USER_URL, {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'API-Updater-Dashboard',
      },
    });

    if (!userRes.ok) {
      const errText = await userRes.text();
      console.error(`❌ Failed to retrieve user info from GitHub (HTTP ${userRes.status}): ${errText}`);
      return { status: 'error', message: `User fetch failed (HTTP ${userRes.status}): ${errText}` };
    }

    const user = await userRes.json();
    console.log(`👤 Authenticated successfully as GitHub user: @${user.login}`);

    activeSession.status      = 'authorized';
    activeSession.accessToken = data.access_token;
    activeSession.user        = { login: user.login, avatar_url: user.avatar_url, name: user.name };

    // Persist token to disk so it survives server restarts
    writeToken({ access_token: data.access_token, user: activeSession.user });
    return { status: 'authorized', user: activeSession.user };
  }

  if (data.error === 'authorization_pending') return { status: 'pending' };
  if (data.error === 'slow_down') return { status: 'pending' };
  if (data.error === 'expired_token') { activeSession.status = 'expired'; return { status: 'expired' }; }

  console.warn(`⚠ Polling returned unhandled error: ${data.error_description || data.error}`);
  return { status: 'error', message: data.error_description || data.error };
}

/**
 * Get current session info (used by the frontend on page load).
 */
export function getAuthStatus() {
  const storedToken = readStoredToken();

  if (storedToken) {
    // Read stored user info too if present
    try {
      const data = JSON.parse(fs.readFileSync(TOKEN_FILE, 'utf8'));
      return { authenticated: true, user: data.user || null };
    } catch { /* */ }
    return { authenticated: true, user: null };
  }

  if (activeSession && activeSession.status === 'pending') {
    return {
      authenticated: false,
      pending:       true,
      user_code:     activeSession.userCode,
      verification_uri: activeSession.verificationUri,
    };
  }

  return { authenticated: false };
}
