import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/overview";
  const description = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (description) {
    return NextResponse.redirect(new URL(`/login?notice=${encodeURIComponent(description)}`, url.origin));
  }
  if (code) {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.redirect(new URL("/login?notice=Supabase+Auth+is+not+configured", url.origin));
    }
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?notice=${encodeURIComponent(error.message)}`, url.origin));
    }
  }
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/overview";
  return NextResponse.redirect(new URL(destination, url.origin));
}
