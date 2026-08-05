import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Bot, Mail, MessageCircle, PhoneCall, ImageIcon, Sparkles, Search, Bell, Sun, Moon, LogOut, Loader2, Users } from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-client";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Dashboard — Leadflow" }] }),
  component: AppLayout,
});

const nav: { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
  { to: "/app", label: "Leads", icon: LayoutDashboard, exact: true },
  { to: "/app/leads", label: "All Leads", icon: Users },
  { to: "/app/chat", label: "AI Chat", icon: Bot },
  { to: "/app/email", label: "Email Studio", icon: Mail },
  { to: "/app/messages", label: "WhatsApp", icon: MessageCircle },
  { to: "/app/caller", label: "Voice Agent", icon: PhoneCall },
  { to: "/app/studio", label: "Creatives", icon: ImageIcon },
];

function AppLayout() {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, isLoading, logout } = useAuth();

  // Auth guard: redirect to /auth if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      navigate({ to: "/auth", replace: true });
    }
  }, [isLoading, user, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gradient-hero">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return null;

  async function signOut() {
    await logout();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen gradient-hero text-foreground">
      <div className="grid min-h-screen grid-cols-[260px_1fr]">
        <aside className="border-r border-sidebar-border bg-sidebar/70 backdrop-blur">
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand shadow-glow">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">Leadflow</div>
              <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Workspace · {user?.name ?? "User"}</div>
            </div>
          </div>
          <nav className="p-3">
            {nav.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to as "/app"}
                  className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    active
                      ? "gradient-brand text-white shadow-glow"
                      : "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

        </aside>

        <main className="flex min-h-screen flex-col">
          <header className="flex h-16 items-center justify-between border-b border-border glass px-6">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative max-w-md flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  placeholder="Search leads, conversations, campaigns…"
                  className="w-full rounded-xl border border-border bg-card/80 pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggle} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:bg-accent" aria-label="Toggle theme">
                {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:bg-accent">
                <Bell className="h-4 w-4" />
              </button>
              <div className="ml-2 flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5">
                <div className="grid h-7 w-7 place-items-center rounded-lg gradient-brand text-xs font-semibold text-white">
                  {(user!.name ?? user!.email).slice(0, 2).toUpperCase()}
                </div>
                <div className="hidden max-w-[150px] truncate text-xs leading-tight md:block">
                  <div className="truncate font-medium">{user!.email}</div>
                  <div className="text-muted-foreground">Signed in</div>
                </div>
                <button onClick={signOut} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-accent" aria-label="Sign out">
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-x-hidden p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
