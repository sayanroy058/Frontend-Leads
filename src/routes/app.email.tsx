import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Mail, Sparkles, Send, Wand2, Loader2, Plus, X, CheckCircle2, Clock, Inbox, Eye, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useLeads, updateLeadStatus, type Lead } from "@/lib/leads-client";

export const Route = createFileRoute("/app/email")({
  component: EmailStudio,
});

const tones = ["Friendly", "Professional", "Direct", "Playful"] as const;
const goals = ["Book a meeting", "Send a proposal", "Re-engage", "Share case study"] as const;

type Status = "draft" | "queued" | "sent" | "delivered" | "opened" | "failed" | "received";

interface EmailRow {
  id: string;
  lead_id: string | null;
  subject: string;
  body: string;
  tone: string | null;
  goal: string | null;
  status: Status;
  direction: "outbound" | "inbound" | null;
  from_email: string | null;
  to_email: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  created_at: string;
}

function EmailStudio() {
  const { leads, reload: reloadLeads } = useLeads();
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [composing, setComposing] = useState(false);

  async function refresh() {
    try { await api.syncInbox(); } catch { /* AgentMail not configured — show local mail only */ }
    const data = await api.getEmails() as EmailRow[];
    if (data) setEmails(data);
  }
  useEffect(() => { refresh(); }, []);

  const [sending, setSending] = useState<Set<string>>(new Set());
  const received = useMemo(() => emails.filter((e) => e.direction === "inbound"), [emails]);

  async function sendEmail(e: EmailRow) {
    setSending((s) => new Set(s).add(e.id));
    try {
      await api.sendEmail(e.id);
      if (e.lead_id) { await updateLeadStatus(e.lead_id, "contacted"); reloadLeads(); }
      toast.success("Email sent from sayanazure@agentmail.to");
    } catch (err) {
      toast.error("Send failed", { description: (err as Error).message });
    } finally {
      setSending((s) => { const n = new Set(s); n.delete(e.id); return n; });
      refresh();
    }
  }

  const byStatus = useMemo(() => {
    const groups: Record<string, EmailRow[]> = { draft: [], queued: [], sent: [], delivered: [], opened: [] };
    for (const e of emails) {
      const k = e.status === "failed" ? "draft" : e.status;
      (groups[k] ?? (groups[k] = [])).push(e);
    }
    return groups;
  }, [emails]);

  const lanes: { key: keyof typeof byStatus; label: string; tint: string; Icon: typeof Mail }[] = [
    { key: "draft", label: "Drafts", tint: "gradient-soft", Icon: Wand2 },
    { key: "queued", label: "Queued", tint: "gradient-peach", Icon: Clock },
    { key: "sent", label: "Sent", tint: "gradient-sky", Icon: Send },
    { key: "delivered", label: "Delivered", tint: "gradient-mint", Icon: Inbox },
    { key: "opened", label: "Opened", tint: "gradient-brand", Icon: Eye },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Email Studio</h1>
          <p className="mt-1 text-sm text-muted-foreground">AI drafts a personalized email for any lead — send it in one click and track delivery here.</p>
        </div>
        <button onClick={() => setComposing(true)} className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow">
          <Plus className="h-4 w-4" /> New AI email
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg gradient-mint">
              <Inbox className="h-3.5 w-3.5 text-foreground/80" />
            </span>
            <div className="text-sm font-semibold">Inbox</div>
            <span className="text-xs text-muted-foreground">sayanazure@agentmail.to</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{received.length}</span>
            <button onClick={refresh} className="grid h-7 w-7 place-items-center rounded-lg border border-border hover:bg-accent" title="Sync inbox">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {received.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No incoming mail yet — replies to sent emails will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {received.map((e) => (
              <div key={e.id} className="rounded-xl border border-border bg-background p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{e.subject || "(no subject)"}</div>
                    <div className="truncate text-xs text-muted-foreground">from {e.from_email ?? "unknown"}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">received</span>
                </div>
                <div className="mt-2 line-clamp-3 text-xs text-muted-foreground">{e.body}</div>
                <div className="mt-2 text-[11px] text-muted-foreground">{new Date(e.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {lanes.map(({ key, label, tint, Icon }) => (
          <div key={key} className="flex min-h-[280px] flex-col rounded-2xl border border-border bg-card/70 p-3 shadow-soft">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`grid h-7 w-7 place-items-center rounded-lg ${tint}`}>
                  <Icon className="h-3.5 w-3.5 text-foreground/80" />
                </span>
                <div className="text-sm font-semibold">{label}</div>
              </div>
              <div className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{byStatus[key]?.length ?? 0}</div>
            </div>
            <div className="space-y-2">
              {(byStatus[key] ?? []).map((e) => {
                const lead = leads.find((l) => l.id === e.lead_id);
                return (
                  <div key={e.id} className="rounded-xl border border-border bg-background p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{e.subject}</div>
                        <div className="truncate text-xs text-muted-foreground">to {lead?.name ?? "—"} · {lead?.company ?? ""}</div>
                      </div>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] capitalize text-muted-foreground">{e.tone ?? "—"}</span>
                    </div>
                    <div className="mt-2 line-clamp-3 text-xs text-muted-foreground">{e.body}</div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{new Date(e.created_at).toLocaleString()}</span>
                      {e.status === "draft" && (
                        <button onClick={() => sendEmail(e)} disabled={sending.has(e.id)} className="inline-flex items-center gap-1 rounded-md gradient-brand px-2 py-0.5 text-white disabled:opacity-60">
                          {sending.has(e.id) ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                          {sending.has(e.id) ? "Sending" : "Send"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {(byStatus[key]?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No items</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {composing && (
        <ComposeModal leads={leads} onClose={() => setComposing(false)} onDone={() => { setComposing(false); refresh(); }} />
      )}
    </div>
  );
}


function ComposeModal({ leads, onClose, onDone }: { leads: Lead[]; onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tone, setTone] = useState<(typeof tones)[number]>("Professional");
  const [goal, setGoal] = useState<(typeof goals)[number]>("Book a meeting");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = leads.filter((l) =>
    !search || l.name.toLowerCase().includes(search.toLowerCase()) || (l.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) { setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }

  async function generateAll() {
    if (!selected.size) { toast.error("Pick at least one recipient"); return; }
    setBusy(true);
    try {
      const targets = leads.filter((l) => selected.has(l.id));
      const results = await Promise.all(
        targets.map(async (lead) => {
          const out = await api.aiComposeEmail({
            lead: { id: lead.id, name: lead.name, company: lead.company, email: lead.email, city: lead.city, status: lead.status, score: lead.score, value: lead.value, source: lead.source, notes: lead.notes },
            tone, goal,
          });
          return { lead_id: lead.id, subject: out.subject, body: out.body, tone, goal, status: "draft" };
        }),
      );
      await api.insertEmails(results);
      toast.success(`AI drafted ${results.length} emails`);
      onDone();
    } catch (e) {
      toast.error("AI generation failed", { description: (e as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-3xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2"><Mail className="h-4 w-4" /><div className="text-sm font-semibold">New AI email</div></div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Recipients ({selected.size})</div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search leads…" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm" />
            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
              {filtered.slice(0, 60).map((l) => (
                <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                  <span className="flex-1 truncate">{l.name} <span className="text-xs text-muted-foreground">· {l.company}</span></span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Tone</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {tones.map((t) => (
                  <button key={t} onClick={() => setTone(t)} className={`rounded-full border px-3 py-1 text-xs ${tone === t ? "gradient-brand border-transparent text-white" : "border-border bg-background hover:bg-accent"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Goal</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {goals.map((g) => (
                  <button key={g} onClick={() => setGoal(g)} className={`rounded-full border px-3 py-1 text-xs ${goal === g ? "gradient-brand border-transparent text-white" : "border-border bg-background hover:bg-accent"}`}>{g}</button>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground"><Sparkles className="h-3.5 w-3.5" /> One-click AI generation</div>
              <p className="mt-1">AI will draft a personalized email for each recipient using their company, city, and notes. You can edit any draft before sending.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5 text-success" /> Drafts saved automatically</div>
          <button onClick={generateAll} disabled={busy} className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Generate {selected.size > 0 ? `${selected.size} email${selected.size === 1 ? "" : "s"}` : "emails"}
          </button>
        </div>
      </div>
    </div>
  );
}
