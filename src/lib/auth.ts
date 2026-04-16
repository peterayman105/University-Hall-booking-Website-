import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { ROLES } from "./constants";
import { getJwtSecretBytes } from "./jwt-secret";

const COOKIE = "fys_token";

export type SessionPayload = {
  sub: string;
  email: string;
  role: string;
  name: string;
};

export async function signToken(payload: SessionPayload, maxAgeSec = 60 * 60 * 24 * 7) {
  return new SignJWT({ email: payload.email, role: payload.role, name: payload.name })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSec}s`)
    .sign(getJwtSecretBytes());
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretBytes());
    const sub = payload.sub;
    if (!sub || typeof sub !== "string") return null;
    const email = payload.email as string;
    const role = payload.role as string;
    const name = (payload.name as string) || "";
    if (!email || !role) return null;
    return { sub, email, role, name };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export function cookieName() {
  return COOKIE;
}

export function isSuperadmin(role: string) {
  return role === ROLES.SUPERADMIN;
}

export function isCustomer(role: string) {
  return role === ROLES.CUSTOMER;
}

export function isViewer(role: string) {
  return role === ROLES.VIEWER;
}
