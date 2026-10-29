import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { readDemoSession } from "@/lib/auth/demo-session";
import { resolveDataMode, supabaseAuthConfigured } from "@/lib/config";

const PROTECTED = [
  "/overview",
  "/leads",
  "/contacts",
  "/properties",
  "/pipeline",
  "/tasks",
  "/viewings",
  "/automations",
  "/assistant",
  "/reports",
  "/settings",
  "/search",
  "/onboarding",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const protectedPath = PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!protectedPath) return NextResponse.next();

  const mode = resolveDataMode();
  if (mode.mode === "unconfigured") return NextResponse.redirect(new URL("/setup", request.url));
  if (mode.mode === "demo") {
    const session = readDemoSession(request.cookies.get("bolexis_demo")?.value);
    if (session) return NextResponse.next();
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAuthConfigured() || !url || !anon) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.redirect(new URL("/login", request.url));
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
