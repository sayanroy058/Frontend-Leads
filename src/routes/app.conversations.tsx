import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  MessageSquare, PhoneCall, Mail, StickyNote, Bot, ShieldCheck,
  Clock, AlertTriangle, RefreshCw, Send, CheckCheck, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";

// Phase 0 — One thread per contact. Every channel's events land in a single
// ordered conversation with conversation-level status + SLA timer.

export const Route = createFileRoute("/app/conversations")({
  component: ConversationsPage,
});

interface Conversation {
  id: string;
  lead_id: string;
  status: "new" | "active" | "awaiting_reply" | "resolved" | "archived";
  sla_due_at: string | null;
  sla_status: "none" | "within_sla" | "breached";
  first_event_at: string | null;
  last_event_at: string | null;
  created_at: string;
  lead_name: string;
  company: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  source: string | null;
  last_content: string | null;
  last_event_created: string | null;
}

interface ConvEvent {
  id: string;
  type: string;
  channel: string;
  direction: string;
  content: string | null;
  handled_by: string;
  action: string;
  summary: string | null;
  created_at: string;
}

const statusStyles: Record<string, string> = {
  new: "bg-sky/40 text-foreground",
  active: "bg-lilac/50 text-foreground",
  awaiting_reply: "bg-warning/20 text-warning-foreground",
  resolved: "bg-success/25 text-success-foreground",
  archived: "bg-muted text-muted-foreground",
};

const slaStyles: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  within_sla: "bg-success/25 text-success-foreground",
  breached: "bg-destructive/15 text-destructive",
};

const eventIcon: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  call: PhoneCall,
  note: StickyNote,
  chat: Bot,
  dm: MessageSquare,
  system: ShieldCheck,
};

function ConversationsPage() {
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ conversation: Conversation; events: ConvEvent[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [slaFilter, setSlaFilter] = useState<string>("all");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function loadList() {
    try {
      const data = await api.getConversations({
        ...(filter !== "all" ? { status: filter } : {}),
        ...(slaFilter !== "all" ? { sla: slaFilter } : {}),
      });
      setConvs(data ?? []);
    } catch (e) { toast.error("Couldn't load conversations", { description: (e as Error).message }); }
    setLoading(false);
  }

  async function loadDetail(id: string) {
    try {
      const d = await api.getConversation(id);
      setDetail(d);
    } catch (e) { toast.error("Couldn't load thread", { description: (e as Error).message }); }
  }

  useEffect(() => { loadList(); }, [filter, slaFilter]);
  useEffect(() => { if (selected) loadDetail(selected); }, [selected]);

  function open(id: string) { setSelected(id); loadDetail(id); }

  async function addNote() {
    if (!note.trim() || !selected) return;
    setBusy(true);
    try {
      await api.addConversationNote(selected, note.trim());
      toast.success("Note added");
      setNote("");
      loadDetail(selected);
      loadList();
    } catch (e) { toast.error("Failed to add note", { description: (e as Error).message }); }
    setBusy(false);
  }

  async function setStatus(status: string) {
    if (!selected) return;
    try {
      await api.setConversationStatus(selected, status);
      toast.success(`Conversation ${status}`);
      loadDetail(selected);
      loadList();
    } catch (e) { toast.error("Failed to update", { description: (e as Error).message }); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Conversations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One thread per contact — every channel feeds this. SLA lives here, so nothing goes untouched.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none">
            <option value="all">All status</option>
            <option value="awaiting_reply">Awaiting reply</option>
            <option value="active">Active</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </select>
          <select value={slaFilter} onChange={(e) => setSlaFilter(e.target.value)} className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none">
            <option value="all">All SLA</option>
            <option value="breached">Breached</option>
            <option value="within_sla">Within SLA</option>
          </select>
          <button onClick={loadList} className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:bg-accent" aria-label="Refresh">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* Conversation list */}
        <div className="space-y-2">
          {loading ? (
            <div className="grid h-40 place-items-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : convs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No conversations yet.
            </div>
          ) : (
            convs.map((c) => (
              <button
                key={c.id}
                onClick={() => open(c.id)}
                className={`w-full rounded-2xl border p-3 text-left transition ${selected === c.id ? "border-brand bg-card shadow-soft" : "border-border bg-card/60 hover:bg-card"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-brand text-xs font-semibold text-white">
                      {c.lead_name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{c.lead_name}</div>
                      <div className="truncate text-xs text-muted-foreground">{c.company ?? c.email ?? c.phone ?? "—"}</div>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyles[c.status]}`}>{c.status.replace("_", " ")}</span>
                </div>
                <div className="mt-2 truncate text-xs text-muted-foreground">{c.last_content ?? "No messages yet"}</div>
                <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {c.last_event_created ? new Date(c.last_event_created).toLocaleString() : new Date(c.created_at).toLocaleDateString()}
                  </span>
                  <span className={`flex items-center gap-1 rounded-full px-1.5 py-0.5 ${slaStyles[c.sla_status]}`}>
                    {c.sla_status === "breached" ? <AlertTriangle className="h-3 w-3" /> : <CheckCheck className="h-3 w-3" />}
                    {c.sla_status === "none" ? "No SLA" : c.sla_status === "breached" ? "SLA breached" : "Within SLA"}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Thread detail */}
        <div className="min-h-[60vh] rounded-2xl border border-border bg-card/60 p-5 shadow-soft">
          {!detail ? (
            <div className="grid h-full min-h-[40vh] place-items-center text-sm text-muted-foreground">
              Select a conversation to view its thread.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold">
                    {detail.conversation.lead_name}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${statusStyles[detail.conversation.status]}`}>
                      {detail.conversation.status.replace("_", " ")}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${slaStyles[detail.conversation.sla_status]}`}>
                      {detail.conversation.sla_status === "none" ? "No SLA" : detail.conversation.sla_status === "breached" ? "SLA breached" : "Within SLA"}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[detail.conversation.company, detail.conversation.city, detail.conversation.phone, detail.conversation.email].filter(Boolean).join(" · ") || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button onClick={() => setStatus("resolved")} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent">Resolve</button>
                  <button onClick={() => setStatus("active")} className="rounded-lg border border-border px-3 py-1.5 hover:bg-accent">Reopen</button>
                  <button onClick={() => setStatus("archived")} className="rounded-lg border border-border px-3 py-1.5 text-muted-foreground hover:bg-accent">Archive</button>
                </div>
              </div>


              <div className="space-y-2">
                {detail.events.length === 0 && <div className="text-sm text-muted-foreground">No events yet.</div>}
                {detail.events.map((e) => {
                  const Icon = eventIcon[e.channel] ?? MessageSquare;
                  return (
                    <div key={e.id} className="flex gap-3 rounded-xl border border-border bg-background p-3">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-medium capitalize text-foreground">{e.type}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${e.direction === "inbound" ? "bg-warning/20" : "bg-success/20"}`}>
                            {e.direction}
                          </span>
                          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] capitalize">{e.handled_by}</span>
                          <span className="ml-auto">{new Date(e.created_at).toLocaleString()}</span>
                        </div>
                        <div className="mt-1 text-sm leading-relaxed">{e.content ?? e.summary ?? "—"}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="border-t border-border pt-3">
                <div className="flex items-end gap-2">
                  <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addNote(); }}
                    placeholder="Add an internal note…"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  />
                  <button onClick={addNote} disabled={busy || !note.trim()} className="inline-flex items-center gap-1.5 rounded-xl gradient-brand px-3 py-2 text-sm font-medium text-white shadow-glow disabled:opacity-60">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Note
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

