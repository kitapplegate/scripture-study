// Fast, optimistic check only: "is there a session cookie at all?" It never proves the
// session is valid. Pages and server actions do the real check with requireUser().
import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const url = new URL("/sign-in", request.url);
  url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/feed/:path*", "/posts/:path*", "/share/:path*", "/admin/:path*", "/study/:path*", "/talks/:path*"],
};
