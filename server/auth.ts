import { createHmac, timingSafeEqual } from 'node:crypto';

const SESSION_COOKIE = 'guardian_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;

function isConfigured(password: string | undefined): password is string {
  return Boolean(password && Buffer.byteLength(password) >= 32);
}

function equalSecret(actual: string, expected: string): boolean {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

function signature(password: string, expiresAt: string): string {
  return createHmac('sha256', password).update(expiresAt).digest('base64url');
}

function sessionValue(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const values = cookieHeader.split(';').map((part) => part.trim())
    .filter((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (values.length !== 1) return undefined;
  return values[0].slice(SESSION_COOKIE.length + 1);
}

export function createSessionCookie(
  submittedPassword: string,
  configuredPassword: string | undefined,
  now = Date.now(),
  secure = true,
): string | undefined {
  if (!isConfigured(configuredPassword) || !equalSecret(submittedPassword, configuredPassword)) {
    return undefined;
  }
  const expiresAt = String(Math.floor(now / 1000) + SESSION_TTL_SECONDS);
  const token = `${expiresAt}.${signature(configuredPassword, expiresAt)}`;
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_TTL_SECONDS}${secure ? '; Secure' : ''}`;
}

export function isOperatorPasswordConfigured(password: string | undefined): password is string {
  return isConfigured(password);
}

export function hasValidSession(
  cookieHeader: string | undefined,
  configuredPassword: string | undefined,
  now = Date.now(),
): boolean {
  if (!isConfigured(configuredPassword)) return false;
  const token = sessionValue(cookieHeader);
  const match = token?.match(/^(\d{10})\.([A-Za-z0-9_-]{43})$/);
  if (!match) return false;
  const [, expiresAt, suppliedSignature] = match;
  const expiry = Number(expiresAt);
  const nowSeconds = Math.floor(now / 1000);
  if (expiry <= nowSeconds || expiry > nowSeconds + SESSION_TTL_SECONDS) return false;
  return equalSecret(suppliedSignature, signature(configuredPassword, expiresAt));
}

export function clearSessionCookie(secure = true): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? '; Secure' : ''}`;
}
