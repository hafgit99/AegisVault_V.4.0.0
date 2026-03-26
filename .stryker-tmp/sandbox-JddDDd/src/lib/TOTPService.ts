/**
 * TOTPService — RFC 6238 uyumlu TOTP (Time-based One-Time Password) oluşturucu.
 * Harici bağımlılık gerektirmez — tamamen Web Crypto API ile çalışır.
 *
 * Desteklenen algoritmalar: SHA-1 (varsayılan), SHA-256, SHA-512
 * Desteklenen formatlar: Base32 secret key, otpauth:// URI
 */
// @ts-nocheck


// ─── Base32 Decode ───
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32Decode(input: string): Uint8Array {
  const cleaned = input.replace(/[\s=-]/g, "").toUpperCase();
  const bits: number[] = [];

  for (const char of cleaned) {
    const val = BASE32_CHARS.indexOf(char);
    if (val === -1) continue; // skip invalid
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1);
    }
  }

  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i * 8 + j];
    }
    bytes[i] = byte;
  }

  return bytes;
}

// ─── HMAC-based OTP (HOTP — RFC 4226) ───
import { toBufferSource } from './crypto-types';

async function hmacSha(
  algorithm: "SHA-1" | "SHA-256" | "SHA-512",
  key: Uint8Array,
  message: Uint8Array
): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toBufferSource(key),
    { name: "HMAC", hash: { name: algorithm } },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, toBufferSource(message));
  return new Uint8Array(sig);
}

function intToBytes(num: number): Uint8Array {
  const bytes = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    bytes[i] = num & 0xff;
    num = Math.floor(num / 256);
  }
  return bytes;
}

function dynamicTruncation(hmacResult: Uint8Array, digits: number): string {
  const offset = hmacResult[hmacResult.length - 1] & 0x0f;
  const code =
    ((hmacResult[offset] & 0x7f) << 24) |
    ((hmacResult[offset + 1] & 0xff) << 16) |
    ((hmacResult[offset + 2] & 0xff) << 8) |
    (hmacResult[offset + 3] & 0xff);

  const otp = code % Math.pow(10, digits);
  return otp.toString().padStart(digits, "0");
}

// ─── Parsed TOTP URI ───
export interface TOTPParams {
  secret: string;      // Base32 encoded secret
  issuer: string;      // Service name (e.g. "Google")
  account: string;     // Account identifier (e.g. "user@gmail.com")
  algorithm: "SHA-1" | "SHA-256" | "SHA-512";
  digits: number;      // Usually 6
  period: number;      // Usually 30 seconds
}

/**
 * otpauth:// URI'sini ayrıştırır.
 * Format: otpauth://totp/[issuer:]account?secret=...&issuer=...&algorithm=...&digits=...&period=...
 */
export function parseOtpauthUri(uri: string): TOTPParams {
  const url = new URL(uri);
  if (url.protocol !== "otpauth:") throw new Error("Invalid OTP URI protocol");
  if (url.hostname !== "totp") throw new Error("Only TOTP is supported");

  const pathParts = decodeURIComponent(url.pathname.replace(/^\//, ""));
  let issuer = "";
  let account = pathParts;

  if (pathParts.includes(":")) {
    const [iss, acc] = pathParts.split(":", 2);
    issuer = iss;
    account = acc;
  }

  const params = url.searchParams;
  const secret = params.get("secret") || "";
  if (!secret) throw new Error("Missing secret parameter");

  // Normalize algorithm: SHA1→SHA-1, SHA256→SHA-256, SHA512→SHA-512
  const rawAlgo = (params.get("algorithm") || "SHA-1").toUpperCase();
  const normalizedAlgo = rawAlgo.replace(/^SHA(\d)/, "SHA-$1") as TOTPParams["algorithm"];

  return {
    secret: secret.toUpperCase(),
    issuer: params.get("issuer") || issuer || "Unknown",
    account: account || "Unknown",
    algorithm: normalizedAlgo || "SHA-1",
    digits: parseInt(params.get("digits") || "6", 10),
    period: parseInt(params.get("period") || "30", 10),
  };
}

/**
 * Manuel girişten TOTPParams oluşturur.
 */
export function createTOTPParams(
  secret: string,
  issuer: string = "",
  account: string = "",
  algorithm: TOTPParams["algorithm"] = "SHA-1",
  digits: number = 6,
  period: number = 30
): TOTPParams {
  return {
    secret: secret.replace(/\s/g, "").toUpperCase(),
    issuer,
    account,
    algorithm,
    digits,
    period,
  };
}

/**
 * TOTPParams'ı otpauth:// URI'sine dönüştürür.
 */
export function toOtpauthUri(params: TOTPParams): string {
  const label = params.issuer
    ? `${encodeURIComponent(params.issuer)}:${encodeURIComponent(params.account)}`
    : encodeURIComponent(params.account);

  const searchParams = new URLSearchParams({
    secret: params.secret,
    issuer: params.issuer,
    algorithm: params.algorithm,
    digits: params.digits.toString(),
    period: params.period.toString(),
  });

  return `otpauth://totp/${label}?${searchParams.toString()}`;
}

// ─── TOTP Generation (RFC 6238) ───

/**
 * Verilen parametrelerle TOTP kodu üretir.
 * @returns 6 veya 8 haneli TOTP kodu
 */
export async function generateTOTP(params: TOTPParams, timestamp?: number): Promise<string> {
  const time = timestamp ?? Date.now();
  const counter = Math.floor(time / 1000 / params.period);
  const keyBytes = base32Decode(params.secret);
  const counterBytes = intToBytes(counter);
  const hmacResult = await hmacSha(params.algorithm, keyBytes, counterBytes);
  return dynamicTruncation(hmacResult, params.digits);
}

/**
 * Kalan süreyi saniye olarak döndürür.
 */
export function getRemainingSeconds(period: number = 30): number {
  return period - (Math.floor(Date.now() / 1000) % period);
}

/**
 * TOTP doğrulama — window ile geriye/ileriye tolerans sağlar.
 */
export async function verifyTOTP(
  params: TOTPParams,
  token: string,
  window: number = 1
): Promise<boolean> {
  const now = Date.now();
  for (let i = -window; i <= window; i++) {
    const adjustedTime = now + i * params.period * 1000;
    const code = await generateTOTP(params, adjustedTime);
    if (code === token) return true;
  }
  return false;
}
