export type DataMode = "demo" | "supabase" | "unconfigured";

export function resolveDataMode(): { mode: DataMode; message?: string } {
  const explicit = process.env.BOLEXIS_DATA_MODE;
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  if (explicit === "demo") {
    if (
      process.env.NODE_ENV === "production" &&
      process.env.BOLEXIS_ALLOW_DEMO_IN_PRODUCTION !== "true"
    ) {
      return {
        mode: "unconfigured",
        message: "Demo mode is disabled in production. Configure Supabase to run BOLEXIS.",
      };
    }
    return { mode: "demo" };
  }

  if (explicit === "supabase" || hasSupabase) {
    if (!hasSupabase) {
      return {
        mode: "unconfigured",
        message:
          "Supabase mode is selected, but NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.",
      };
    }
    return { mode: "supabase" };
  }

  if (process.env.NODE_ENV !== "production") return { mode: "demo" };
  return {
    mode: "unconfigured",
    message: "Supabase is not configured for this production environment.",
  };
}

export function supabaseAuthConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function integrationFlags() {
  return {
    email: Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM),
    openai: Boolean(process.env.OPENAI_API_KEY),
    n8n: Boolean(process.env.N8N_WEBHOOK_BASE_URL && process.env.N8N_WEBHOOK_SECRET),
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID &&
        process.env.GOOGLE_CLIENT_SECRET &&
        process.env.GOOGLE_REDIRECT_URI,
    ),
    cron: Boolean(process.env.CRON_SECRET),
  };
}
