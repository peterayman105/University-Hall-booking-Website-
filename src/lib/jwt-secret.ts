/**
 * Single place for JWT HMAC key so sign/verify and middleware stay aligned.
 * Production requires JWT_SECRET; development uses a fixed fallback if unset.
 */
const DEV_FALLBACK = "__findyourspot_dev_jwt_only__";

export function getJwtSecretBytes(): Uint8Array {
  const s = process.env.JWT_SECRET?.trim();
  if (s) return new TextEncoder().encode(s);
  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET must be set in production");
  }
  console.warn("[auth] JWT_SECRET is not set — using a development-only JWT key");
  return new TextEncoder().encode(DEV_FALLBACK);
}
