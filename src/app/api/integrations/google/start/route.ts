import { NextResponse } from "next/server";

import { integrationFlags } from "@/lib/config";
import { currentUserId } from "@/lib/crm/session";

export async function GET(request: Request) {
  const userId = await currentUserId();
  if (!userId) return NextResponse.redirect(new URL("/login", request.url));
  if (!integrationFlags().google) {
    return NextResponse.json(
      { status: "not_configured", message: "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI." },
      { status: 503 },
    );
  }
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", process.env.GOOGLE_REDIRECT_URI ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", userId);
  return NextResponse.redirect(url);
}
