import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSessionContext } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api/auth")) return NextResponse.next();

  const session = await getSessionContext(request.headers);

  if (pathname === "/login") {
    return session
      ? NextResponse.redirect(new URL("/", request.url))
      : NextResponse.next();
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Autenticação necessária." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
