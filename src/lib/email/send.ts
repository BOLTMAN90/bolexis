import { Resend } from "resend";

import { integrationFlags } from "@/lib/config";

export async function sendEmail(input: { to: string; subject: string; text: string }) {
  if (!integrationFlags().email) {
    return { status: "not_configured" as const, error: "Email provider is not configured." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.to)) {
    return { status: "failed" as const, error: "Recipient email is invalid." };
  }
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const result = await Promise.race([
      resend.emails.send({
        from: process.env.EMAIL_FROM ?? "",
        to: input.to,
        subject: input.subject,
        text: input.text,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Email provider timed out.")), 10_000);
      }),
    ]);
    if (result.error || !result.data?.id) {
      return { status: "failed" as const, error: result.error?.message ?? "Email was not accepted." };
    }
    return { status: "sent" as const, providerMessageId: result.data.id };
  } catch (error) {
    return {
      status: "failed" as const,
      error: error instanceof Error ? error.message : "Email was not accepted.",
    };
  }
}
