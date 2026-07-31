import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Bot, Upload, Mail, MessageCircle, PhoneCall, Image as ImageIcon, Sparkles, ShieldCheck, Zap } from "lucide-react";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Leadflow — AI-native lead management for modern teams" },
      { name: "description", content: "Upload leads in any format. Talk to them through AI email, WhatsApp, and calling. Generate creatives in one click." },
      { property: "og:title", content: "Leadflow" },
      { property: "og:description", content: "AI-native lead management." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen gradient-hero">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg gradient-brand shadow-glow">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Leadflow</span>
        </div>
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#workflow" className="hover:text-foreground">Workflow</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
        </nav>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-accent">
            {theme === "dark" ? "Light" : "Dark"}
          </button>
          <Link to="/app" className="inline-flex items-center gap-1.5 rounded-md gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow">
            Open app <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-7xl px-6 pb-20 pt-16 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          <span className="text-muted-foreground">New: AI voice agent calls your leads in 32 languages</span>
        </div>
        <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          Every lead, <span className="text-gradient-brand">answered.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
          Upload your leads in any format. Leadflow scores them, writes personalized emails and WhatsApp follow-ups,
          generates creatives, and even calls them on your behalf — all from one dashboard.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app" className="inline-flex items-center gap-2 rounded-lg gradient-brand px-5 py-3 text-sm font-semibold text-white shadow-glow">
            Try the live dashboard <ArrowRight className="h-4 w-4" />
          </Link>
          <a href="#features" className="rounded-lg border border-border bg-card/60 px-5 py-3 text-sm font-medium backdrop-blur hover:bg-accent">
            See how it works
          </a>
        </div>

        <div className="mt-16 overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
          <div className="flex items-center gap-1.5 border-b border-border px-4 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="ml-3 text-xs text-muted-foreground">leadflow.app / dashboard</span>
          </div>
          <div className="grid grid-cols-12 ring-grid">
            <aside className="col-span-3 hidden border-r border-border bg-sidebar p-4 md:block">
              {["Leads", "AI Chat", "Email Studio", "Messages", "Voice Agent", "Creatives"].map((l, i) => (
                <div key={l} className={`mb-1 rounded-md px-3 py-2 text-sm ${i===0 ? "gradient-brand text-white" : "text-sidebar-foreground/80"}`}>{l}</div>
              ))}
            </aside>
            <div className="col-span-12 p-6 md:col-span-9">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { k: "Active leads", v: "1,284", d: "+12%" },
                  { k: "Booked this week", v: "37", d: "+22%" },
                  { k: "AI replies sent", v: "412", d: "+8%" },
                ].map((s) => (
                  <div key={s.k} className="rounded-xl border border-border bg-background p-4 text-left">
                    <div className="text-xs text-muted-foreground">{s.k}</div>
                    <div className="mt-1 text-2xl font-semibold">{s.v}</div>
                    <div className="mt-1 text-xs text-success">{s.d}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-border bg-background p-4 text-left">
                <div className="text-sm font-medium">Pipeline this week</div>
                <div className="mt-3 flex h-32 items-end gap-2">
                  {[40,65,55,80,95,60,35].map((h, i) => (
                    <div key={i} className="flex-1 rounded-md gradient-brand opacity-90" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { Icon: Upload, t: "Import anything", d: "CSV, Excel, TXT, or paste from a database. We map columns and dedupe automatically." },
            { Icon: Bot, t: "Chat with your leads", d: "Ask 'who's likely to close this week?' — AI answers using your real lead data." },
            { Icon: Mail, t: "AI email composer", d: "One click writes a personalized email per lead. Edit, preview, send." },
            { Icon: MessageCircle, t: "WhatsApp & SMS", d: "Send a templated or AI-written message to one lead or a segment." },
            { Icon: PhoneCall, t: "Voice agent", d: "Our AI calls leads, answers their questions, and books appointments." },
            { Icon: ImageIcon, t: "Creative studio", d: "Generate posters, banners, and ad images — download or share instantly." },
          ].map(({ Icon, t, d }) => (
            <div key={t} className="rounded-xl border border-border bg-card p-6 shadow-elegant transition hover:shadow-glow">
              <div className="grid h-10 w-10 place-items-center rounded-lg gradient-brand">
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="mt-4 text-base font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-t border-border bg-card/40">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 md:grid-cols-3">
          {[
            { n: "01", t: "Upload", d: "Drop a CSV or connect a database. We normalize fields and score every lead." , Icon: Upload},
            { n: "02", t: "Engage", d: "Email, WhatsApp, or call via AI. Every conversation lands in the unified inbox.", Icon: Zap },
            { n: "03", t: "Convert", d: "AI books meetings, sends reminders, and keeps your team in the loop.", Icon: ShieldCheck },
          ].map(({n,t,d,Icon}) => (
            <div key={n}>
              <div className="text-xs font-mono text-muted-foreground">{n}</div>
              <div className="mt-3 inline-grid h-10 w-10 place-items-center rounded-lg border border-border">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-xl font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Built for teams that close fast.</h2>
        <p className="mt-3 text-muted-foreground">Start free. Upgrade when AI is doing the heavy lifting.</p>
        <Link to="/app" className="mt-8 inline-flex items-center gap-2 rounded-lg gradient-brand px-6 py-3 text-sm font-semibold text-white shadow-glow">
          Open the dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Leadflow. Crafted for ambitious teams.
      </footer>
    </div>
  );
}
