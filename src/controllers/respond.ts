import { NextResponse } from "next/server";
import { cookieName } from "@/lib/auth";
import type { ActionResult } from "./types";

const cookieOptions = {
  httpOnly: true,
  path: "/",
  maxAge: 60 * 60 * 24 * 7,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
};

export function respond<T>(result: ActionResult<T>): NextResponse {
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const res = NextResponse.json(result.data as object, { status: result.status ?? 200 });
  if (result.setAuthToken) {
    res.cookies.set(cookieName(), result.setAuthToken, cookieOptions);
  }
  return res;
}
