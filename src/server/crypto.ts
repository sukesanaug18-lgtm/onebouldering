// PIN hashing and signed tokens. Node's built-in crypto only; no framework imports so it can be
// unit-tested. Server-side use only (imported by session.ts / auth actions).
import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;

function scryptAsync(pin: string, salt: Buffer, n: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(pin, salt, KEY_LEN, { N: n, r: SCRYPT_R, p: SCRYPT_P }, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );
}

/** Hash format: scrypt$N$saltBase64$hashBase64 */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(pin, salt, SCRYPT_N);
  return `scrypt$${SCRYPT_N}$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [algo, n, saltB64, hashB64] = stored.split("$");
  if (algo !== "scrypt" || !n || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64");
  const key = await scryptAsync(pin, Buffer.from(saltB64, "base64"), Number(n));
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Constant-time string comparison (for legacy plain-text PINs). */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** token = base64url(JSON payload) + "." + base64url(HMAC-SHA256) */
export function signToken(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken<T extends Record<string, unknown>>(
  token: string | undefined,
  secret: string,
): T | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
