import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecretBytes } from "@/lib/jwt-secret";

const COOKIE = "fys_token";

function jwtKey(): Uint8Array | null {
  try {
    return getJwtSecretBytes();
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const sec = jwtKey();
  if (!sec) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  const path = request.nextUrl.pathname;

  if (!token) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, sec);
    const role = payload.role as string;

    if (path.startsWith("/admin")) {
      if (role !== "SUPERADMIN") {
        return NextResponse.redirect(new URL("/halls", request.url));
      }
    }

    if (path.startsWith("/halls")) {
      if (role !== "CUSTOMER" && role !== "VIEWER") {
        return NextResponse.redirect(new URL("/admin/halls", request.url));
      }
    }

    if (
      path.startsWith("/my-bookings") ||
      path.startsWith("/completed-bookings") ||
      path.startsWith("/profile")
    ) {
      if (role !== "CUSTOMER") {
        return NextResponse.redirect(new URL("/halls", request.url));
      }
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/halls",
    "/halls/:path*",
    "/my-bookings",
    "/my-bookings/:path*",
    "/completed-bookings",
    "/profile",
    "/profile/:path*",
  ],
};
