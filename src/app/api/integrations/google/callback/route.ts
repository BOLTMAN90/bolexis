import { NextResponse } from "next/server";

import { integrationFlags } from "@/lib/config";

export async function GET(request: Request) {
  if (!integrationFlags().google) {
    return NextResponse.json({ status: "not_configured" }, { status: 503 });
  }
  const url = new URL(request.url);
  if (url.searchParams.get("error") || !url.searchParams.get("code")) {
    return NextResponse.redirect(new URL("/settings?notice=Google+authorization+was+not+completed", request.url));
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: url.searchParams.get("code") ?? "",
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: process.env.GOOGLE_REDIRECT_URI ?? "",
      grant_type: "authorization_code",
    }),
  });
  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/settings?notice=Google+token+exchange+failed.+Calendar+is+not+connected.", request.url));
  }
  return NextResponse.redirect(
    new URL(
      "/settings?notice=Google+returned+a+token,+but+BOLEXIS+did+not+store+it.+The+workspace+stays+disconnected+until+token+storage+is+enabled.",
      request.url,
    ),
  );
}
