import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getEdgeSession } from "@/lib/session";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();
  const session = await getEdgeSession(request, response);

  if (!session) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // Matches bare /admin (the dashboard) as well as every /admin/* path except /admin/login.
  matcher: ["/admin", "/admin/((?!login).*)"],
};
