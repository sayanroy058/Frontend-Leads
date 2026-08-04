import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Mail, Lock, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in or create your Leadflow account" },
      { name: "description", content: "Log in to Leadflow or register a new workspace to upload leads and run AI email, WhatsApp and calling campaigns." },
      { property: "og:title", content: "Sign in to Leadflow" },
      { property: "og:description", content: "Log in or create a Leadflow account to manage your leads with AI." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      navigate({ to: "/app", replace: true });
    }
  }, [user, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Check your details", { description: "Enter a valid email and a password of at least 6 characters." });
      return;
    }
    setBusy(true);
    try {
      if (mode === "register") {
        await register(name.trim(), email.trim(), password);
        toast.success("Account created!", { description: "Welcome to Leadflow." });
      } else {
        await login(email.trim(), password);
        toast.success("Welcome back!");
      }
      navigate({ to: "/app", replace: true });
    } catch (err) {
      toast.error(mode === "register" ? "Registration failed" : "Login failed", { description: (err as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen gradient-hero lg:grid-cols-2">
      <div className="hidden flex-col justify-between p-12 lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Leadflow</span>
        </Link>
        <div>
          <h2 className="max-w-md text-4xl font-bold tracking-tight">
            Every lead, <span className="text-gradient-brand">answered.</span>
          </h2>
          <p className="mt-4 max-w-md text-muted-foreground">
            Upload CSV or Excel lead lists, chat with your data, and let AI handle email, WhatsApp and calls.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Leadflow</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-soft">
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "login" ? "Sign in to Leadflow" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Welcome back — pick up where you left off." : "Start importing and working your leads in minutes."}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "register" ? (
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Full name</span>
                <div className="relative mt-1">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jordan Lee"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </label>
            ) : null}

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </label>

            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Password</span>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl gradient-brand px-4 py-2.5 text-sm font-semibold text-white shadow-glow disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "login" ? "New to Leadflow?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="font-medium text-foreground underline underline-offset-4"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </div>

          {mode === "login" ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/50 px-4 py-3 text-center">
              <p className="text-xs font-medium text-muted-foreground">Demo account</p>
              <p className="mt-1 text-xs text-foreground/80">
                <span className="font-medium">testuser@gmail.com</span>{" "}
                <span className="text-muted-foreground">/</span>{" "}
                <span className="font-medium">Str0ng!P9a</span>
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
