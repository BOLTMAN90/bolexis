import { Logo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="mb-6 flex items-center gap-3">
        <Logo />
        <div>
          <p className="font-semibold">BOLEXIS</p>
          <p className="text-xs text-muted-foreground">Real Estate Intelligence & Automation</p>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-white p-6">{children}</div>
    </main>
  );
}
