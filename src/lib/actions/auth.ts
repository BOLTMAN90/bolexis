"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_COOKIE, signDemoSession, WORKSPACE_COOKIE } from "@/lib/auth/demo-session";
import { resolveDataMode } from "@/lib/config";
import { actorIn, withCrm } from "@/lib/crm/session";
import { CrmError } from "@/lib/data/types";
import { DEMO_USER_ID, DEMO_WORKSPACE_ID } from "@/lib/demo/seed";
import { createClient } from "@/lib/supabase/server";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: process.env.NODE_ENV === "production",
  };
}

async function requestOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? (host?.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export async function enterDemo() {
  const mode = resolveDataMode();
  if (mode.mode !== "demo") {
    redirect("/login?notice=Demo+sign-in+is+unavailable+while+Supabase+mode+is+active");
  }
  const jar = await cookies();
  jar.set(DEMO_COOKIE, signDemoSession(DEMO_USER_ID), cookieOptions());
  jar.set(WORKSPACE_COOKIE, DEMO_WORKSPACE_ID, cookieOptions());
  redirect("/overview");
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  if (!supabase) redirect("/login?notice=Supabase+Auth+is+not+configured");
  const origin = await requestOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) {
    redirect(`/login?notice=${encodeURIComponent(error?.message ?? "Google sign-in could not start.")}`);
  }
  redirect(data.url);
}

export async function signInWithPassword(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/login?notice=Supabase+Auth+is+not+configured");
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) redirect(`/login?notice=${encodeURIComponent(error.message)}`);
  redirect("/overview");
}

export async function signUpWithPassword(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/signup?notice=Supabase+Auth+is+not+configured");
  const origin = await requestOrigin();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: { full_name: String(formData.get("fullName") ?? "") },
    },
  });
  if (error) redirect(`/signup?notice=${encodeURIComponent(error.message)}`);
  redirect("/login?notice=Check+your+email+to+confirm+the+account");
}

export async function sendPasswordReset(formData: FormData) {
  const supabase = await createClient();
  if (!supabase) redirect("/forgot-password?notice=Supabase+Auth+is+not+configured");
  const origin = await requestOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(String(formData.get("email") ?? ""), {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  if (error) redirect(`/forgot-password?notice=${encodeURIComponent(error.message)}`);
  redirect("/login?notice=If+the+account+exists,+a+reset+email+was+requested");
}

export async function signOut() {
  const supabase = await createClient();
  if (supabase) await supabase.auth.signOut();
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  jar.delete(WORKSPACE_COOKIE);
  redirect("/login");
}

export async function switchWorkspace(formData: FormData) {
  const workspaceId = String(formData.get("workspaceId") ?? "");
  try {
    await withCrm((db, userId) => {
      actorIn(db, userId, workspaceId);
      return true;
    });
  } catch (error) {
    if (typeof error === "object" && error && "digest" in error) throw error;
    const message = error instanceof CrmError ? error.message : "You do not belong to that workspace.";
    redirect(`/overview?notice=${encodeURIComponent(message)}`);
  }
  const jar = await cookies();
  jar.set(WORKSPACE_COOKIE, workspaceId, cookieOptions());
  redirect("/overview");
}
