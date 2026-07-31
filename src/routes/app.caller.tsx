import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PhoneCall, Plus, X, Loader2, Sparkles, Play, CalendarPlus, CheckCircle2, Mic, FileText } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useLeads, updateLeadStatus, type Lead } from "@/lib/leads-client";

export const Route = createFileRoute("/app/caller")({
  component: VoiceAgent,
});

const goals = ["Qualify lead", "Book a demo", "Re-engage", "Pricing discussion"];
const voices = [
  { id: "aria", label: "Aria · warm female" },
  { id: "ryan", label: "Ryan · confident male" },
  { id: "nova", label: "Nova · friendly neutral" },
];

interface Call {
  id: string;
  lead_id: string | null;
  goal: string | null;
  voice: string | null;
  status: "queued" | "in_progress" | "completed" | "no_answer" | "failed";
  outcome: string | null;
  transcript: { speaker: string; text: string }[];
  summary: string | null;
  duration_sec: number;
  created_at: string;
}

function VoiceAgent() {
  const { leads, reload } = useLeads();
  const [calls, setCalls] = useState<Call[]>([]);
  const [appts, setAppts] = useState<{ id: string; title: string; scheduled_at: string; lead_id: string | null }[]>([]);
  const [composing, setComposing] = useState(false);
  const [open, setOpen] = useState<Call | null>(null);

  async function refresh() {
    const data = (await api.getCallLogs()).map((c) => ({
      ...c,
      transcript: c.transcript ? (JSON.parse(c.transcript) as { speaker: string; text: string }[]) : [],
    })) as Call[];
    if (data) setCalls(data);
    const ap = await api.getAppointments() as { id: string; title: string; scheduled_at: string; lead_id: string | null }[];
    if (ap) setAppts(ap);
  }
  useEffect(() => { refresh(); }, []);

  const groups = useMemo(() => {
    const g: Record<string, Call[]> = { queued: [], in_progress: [], completed: [], no_answer: [] };
    for (const c of calls) (g[c.status === "failed" ? "no_answer" : c.status] ??= []).push(c);
    return g;
  }, [calls]);

  const lanes: { key: string; label: string; tint: string }[] = [
    { key: "queued", label: "Queued", tint: "gradient-soft" },
    { key: "in_progress", label: "Calling", tint: "gradient-peach" },
    { key: "completed", label: "Completed", tint: "gradient-mint" },
    { key: "no_answer", label: "No answer", tint: "gradient-sky" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Voice Agent</h1>
          <p className="mt-1 text-sm text-muted-foreground">Queue calls, let the agent talk to leads, then review transcripts and auto-booked appointments.</p>
        </div>
        <button onClick={() => setComposing(true)} className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow">
          <Plus className="h-4 w-4" /> Queue new call
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {lanes.map(({ key, label, tint }) => (
          <div key={key} className="flex min-h-[280px] flex-col rounded-2xl border border-border bg-card/70 p-3 shadow-soft">
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className={`grid h-7 w-7 place-items-center rounded-lg ${tint}`}><PhoneCall className="h-3.5 w-3.5 text-foreground/80" /></span>
                <div className="text-sm font-semibold">{label}</div>
              </div>
              <div className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{groups[key]?.length ?? 0}</div>
            </div>
            <div className="space-y-2">
              {(groups[key] ?? []).map((c) => {
                const lead = leads.find((l) => l.id === c.lead_id);
                return (
                  <button key={c.id} onClick={() => setOpen(c)} className="w-full rounded-xl border border-border bg-background p-3 text-left hover:bg-muted/40">
                    <div className="flex items-center gap-2">
                      <div className="grid h-7 w-7 place-items-center rounded-full gradient-sky text-[10px] font-semibold">
                        {lead?.name.split(" ").map((p) => p[0]).join("").slice(0,2)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{lead?.name ?? "—"}</div>
                        <div className="truncate text-xs text-muted-foreground">{lead?.phone ?? ""}</div>
                      </div>
                      {c.outcome && <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-[10px] capitalize text-success-foreground">{c.outcome.replace("_", " ")}</span>}
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">{c.summary ?? c.goal ?? "—"}</div>
                    <div className="mt-1.5 text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</div>
                  </button>
                );
              })}
              {(groups[key]?.length ?? 0) === 0 && (
                <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No calls</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {appts.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <CalendarPlus className="h-4 w-4 text-primary" />
            <div className="text-sm font-semibold">Appointments booked by the agent</div>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
            {appts.map((a) => {
              const lead = leads.find((l) => l.id === a.lead_id);
              return (
                <div key={a.id} className="rounded-xl border border-border bg-background p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    <div className="text-sm font-medium">{a.title}</div>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{lead?.name} · {new Date(a.scheduled_at).toLocaleString()}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {composing && <Composer leads={leads} onClose={() => setComposing(false)} onDone={() => { setComposing(false); refresh(); reload(); }} />}
      {open && <CallDetail call={open} lead={leads.find((l) => l.id === open.lead_id) ?? null} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Composer({ leads, onClose, onDone }: { leads: Lead[]; onClose: () => void; onDone: () => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [goal, setGoal] = useState(goals[0]);
  const [voice, setVoice] = useState(voices[0].id);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const eligible = leads.filter((l) => l.phone);
  const filtered = eligible.filter((l) => !search || l.name.toLowerCase().includes(search.toLowerCase()));

  function toggle(id: string) { setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function launch() {
    if (!selected.size) { toast.error("Pick at least one lead"); return; }
    setBusy(true);
    try {
      const targets = leads.filter((l) => selected.has(l.id));
      const queued = targets.map((lead) => ({ lead_id: lead.id, goal, voice, status: "queued" }));
      const inserted = (await api.insertCallLogs(queued)).map((c) => ({
        ...c,
        transcript: c.transcript ? (JSON.parse(c.transcript) as { speaker: string; text: string }[]) : [],
      })) as Call[];
      toast.success(`${targets.length} call${targets.length === 1 ? "" : "s"} queued`);
      onDone();
      for (const lead of targets) {
        const call = inserted.find((c) => c.lead_id === lead.id);
        if (!call) continue;
        runCall(call.id, lead, goal, voice);
      }
    } catch (e) {
      toast.error("Failed", { description: (e as Error).message });
    } finally { setBusy(false); }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm">
      <div className="grid w-full max-w-3xl grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2"><PhoneCall className="h-4 w-4" /><div className="text-sm font-semibold">Queue voice agent calls</div></div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Leads to call ({selected.size}/{eligible.length})</div>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm" />
            <div className="mt-2 max-h-72 space-y-1 overflow-y-auto rounded-xl border border-border bg-background p-2">
              {filtered.slice(0, 60).map((l) => (
                <label key={l.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60">
                  <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} />
                  <span className="flex-1 truncate">{l.name} <span className="text-xs text-muted-foreground">· {l.phone}</span></span>
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <div className="text-xs font-medium text-muted-foreground">Call goal</div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {goals.map((g) => (
                  <button key={g} onClick={() => setGoal(g)} className={`rounded-full border px-3 py-1 text-xs ${goal === g ? "gradient-brand border-transparent text-white" : "border-border bg-background hover:bg-accent"}`}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-medium text-muted-foreground">Agent voice</div>
              <div className="mt-1 space-y-1">
                {voices.map((v) => (
                  <label key={v.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-xs">
                    <input type="radio" name="voice" checked={voice === v.id} onChange={() => setVoice(v.id)} />
                    <Mic className="h-3.5 w-3.5 text-muted-foreground" /> {v.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-border bg-background p-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 font-medium text-foreground"><Sparkles className="h-3.5 w-3.5" /> Auto-recorded & summarized</div>
              <p className="mt-1">Each call gets a transcript, summary, lead status update, and an appointment if the lead agrees.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={launch} disabled={busy} className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Start calls
          </button>
        </div>
      </div>
    </div>
  );
}

async function runCall(callId: string, lead: Lead, goal: string, _voice: string) {
  await api.updateCallLog({ id: callId, status: "in_progress", started_at: new Date().toISOString() });
  try {
    const res = await api.aiCallScript({
      lead: { id: lead.id, name: lead.name, company: lead.company, email: lead.email, city: lead.city, status: lead.status, score: lead.score, value: lead.value, source: lead.source, notes: lead.notes },
      goal,
    });
    const outcome = res.suggested_outcome ?? "callback";
    const duration = 60 + Math.floor(Math.random() * 240);
    const finalStatus = outcome === "voicemail" ? "no_answer" : "completed";
    await api.updateCallLog({ id: callId, status: finalStatus, outcome, transcript: res.mock_transcript ?? [], summary: res.summary ?? "", duration_sec: duration, ended_at: new Date().toISOString() });

    const newLeadStatus = outcome === "booked" ? "booked" : outcome === "interested" ? "qualified" : outcome === "not_interested" ? "lost" : "contacted";
    await updateLeadStatus(lead.id, newLeadStatus);

    if (res.book_appointment) {
      const when = new Date(); when.setDate(when.getDate() + 2); when.setHours(14, 0, 0, 0);
      await api.insertAppointment({ lead_id: lead.id, call_id: callId, title: `${goal} with ${lead.name}`, scheduled_at: when.toISOString() });
    }
  } catch (e) {
    await api.updateCallLog({ id: callId, status: "failed", summary: (e as Error).message, ended_at: new Date().toISOString() });
  }
}

function CallDetail({ call, lead, onClose }: { call: Call; lead: Lead | null; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="grid max-h-[85vh] w-full max-w-2xl grid-rows-[auto_1fr] overflow-hidden rounded-2xl border border-border bg-card shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl gradient-sky"><PhoneCall className="h-4 w-4 text-foreground/80" /></div>
            <div>
              <div className="text-sm font-semibold">{lead?.name ?? "Unknown"}</div>
              <div className="text-xs text-muted-foreground">{call.goal} · {Math.round(call.duration_sec / 60)}m {call.duration_sec % 60}s · <span className="capitalize">{call.outcome ?? call.status}</span></div>
            </div>
          </div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto p-5">
          {call.summary && (
            <div className="mb-4 rounded-xl border border-border bg-background p-4">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold"><FileText className="h-3.5 w-3.5" /> Summary</div>
              <p className="text-sm text-muted-foreground">{call.summary}</p>
            </div>
          )}
          <div className="text-xs font-semibold">Transcript</div>
          <div className="mt-2 space-y-2">
            {(call.transcript ?? []).map((t, i) => (
              <div key={i} className={`flex gap-2 ${t.speaker === "agent" ? "" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${t.speaker === "agent" ? "bg-muted/60" : "gradient-brand text-white"}`}>
                  <div className="text-[10px] uppercase tracking-wide opacity-70">{t.speaker}</div>
                  {t.text}
                </div>
              </div>
            ))}
            {(!call.transcript || call.transcript.length === 0) && (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No transcript captured.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
