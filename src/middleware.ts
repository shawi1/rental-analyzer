import { NextRequest, NextResponse } from "next/server";

// Optional password gate. Disabled unless SITE_PASSWORD is set in the environment.
// When set, the whole site requires HTTP Basic auth — username can be anything,
// password must match SITE_PASSWORD. Perfect for a private two-person tool.

export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const pwd = decoded.slice(decoded.indexOf(":") + 1);
      if (pwd === password) return NextResponse.next();
    } catch {
      // fall through to challenge
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="RentalIQ", charset="UTF-8"' },
  });
}

export const config = {
  // Protect everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
