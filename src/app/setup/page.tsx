import { resolveDataMode } from "@/lib/config";

export default function SetupPage() {
  const mode = resolveDataMode();
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">BOLEXIS needs configuration</h1>
      <p className="mt-3 text-sm text-muted-foreground">{mode.message ?? "Add the environment variables in .env.example."}</p>
    </main>
  );
}
