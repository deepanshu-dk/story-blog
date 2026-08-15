import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { requireAdminSession } from "@/lib/session";

// This route sits outside the `/admin/:path*` proxy matcher (it's an API route, not an
// admin page), so it is NOT protected by proxy.ts's edge check. The admin-session gate is
// therefore performed inline here, on the Node runtime, before a signature is ever issued.
export async function POST(request: Request) {
  try {
    await requireAdminSession();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) {
    return NextResponse.json({ error: "Cloudinary is not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => null);
  const paramsToSign = body?.paramsToSign;
  if (!paramsToSign || typeof paramsToSign !== "object") {
    return NextResponse.json({ error: "Missing paramsToSign" }, { status: 400 });
  }

  // Signed against the exact upload parameters the widget supplied (timestamp, folder,
  // etc.) - not a blanket signature - so a logged/intercepted response can't be replayed
  // for a different upload. Cloudinary's own short default timestamp validity window
  // bounds how long the signature remains usable.
  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return NextResponse.json({ signature });
}
