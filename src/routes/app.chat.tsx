import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send, Sparkles, User2, Loader2 } from "lucide-react";
import { useLeads } from "@/lib/leads-client";
import { api } from "@/api/client";

export const Route = createFileRoute("/app/chat")({
  component: AIChat,
});

type Msg = { id: string; role: "user" | "assistant"; text: string; citations?: string[] };

const suggested = [
  "Who are my top 5 leads to call today?",
  "Which leads asked for pricing?",
  "Summarize my booked deals this week.",
  "Which sources convert best to booked meetings?",
];

function AIChat() {
  const { leads } = useLeads();
  const [messages, setMessages] = useState<Msg[]>([
    { id: "m0", role: "assistant", text: "Hi — I'm your lead assistant. Ask me anything about your pipeline. I'll cite specific leads when I answer." },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const leadById = useMemo(() => Object.fromEntries(leads.map((l) => [l.id, l])), [leads]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9, behavior: "smooth" }); }, [messages, pending]);

  // Load chat history
  useEffect(() => {
    (async () => {
      const data = await api.getChatMessages() as { id: string; role: string; content: string; citations: string | null }[];
      if (data && data.length) {
        setMessages([
          { id: "m0", role: "assistant", text: "Welcome back. Continuing where we left off." },
          ...data.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            text: m.content,
            citations: m.citations ? (JSON.parse(m.citations) as string[]) : [],
          })),
        ]);
      }
    })();
  }, []);

  async function send(text?: string) {
    const t = (text ?? input).trim();
    if (!t || pending) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: t };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setPending(true);
    api.insertChatMessage({ role: "user", content: t });
    try {
      const ctx = leads.slice(0, 80).map((l) => ({
        id: l.id, name: l.name, company: l.company, email: l.email,
        city: l.city, status: l.status, score: l.score, value: l.value,
        source: l.source, notes: l.notes,
      }));
      const res = await api.aiChat({ question: t, leads: ctx });
      const asst: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: res.text,
        citations: res.citations,
      };
      setMessages((prev) => [...prev, asst]);
      api.insertChatMessage({ role: "assistant", content: res.text, citations: res.citations });
    } catch (e) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", text: `Sorry — I couldn't reach the AI service. ${(e as Error).message}` }]);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  }

  function renderText(text: string) {
    const parts = text.split(/(\[lead:[a-z0-9-]{8,}\])/gi);
    return parts.map((p, i) => {
      const m = p.match(/^\[lead:([a-z0-9-]{8,})\]$/i);
      if (!m) return <span key={i}>{p}</span>;
      const short = m[1];
      const full = leads.find((l) => l.id.startsWith(short));
      if (!full) return <span key={i} className="rounded-md bg-muted px-1.5 py-0.5 text-xs">lead</span>;
      return (
        <button
          key={i}
          onMouseEnter={() => setHovered(full.id)}
          onMouseLeave={() => setHovered(null)}
          className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-lilac/60 px-1.5 py-0.5 text-xs font-medium text-foreground hover:bg-primary hover:text-primary-foreground"
        >
          {full.name}
        </button>
      );
    });
  }

  return (
    <div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex min-h-0 flex-col rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="grid h-10 w-10 place-items-center rounded-xl gradient-brand text-white shadow-glow">
            <Bot className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">Ask your leads</div>
            <div className="text-xs text-muted-foreground">AI answers using your {leads.length} live leads — with citations</div>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-1 text-xs text-success-foreground sm:flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" /> Connected
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-brand text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <div className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "gradient-brand text-white shadow-glow"
                  : "bg-muted/60 text-foreground"
              }`}>
                {m.role === "assistant" ? renderText(m.text) : m.text}
                {m.role === "assistant" && m.citations && m.citations.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                    <span>Cited:</span>
                    {m.citations.map((id) => {
                      const l = leadById[id];
                      return l ? <span key={id} className="rounded bg-card px-1.5 py-0.5">{l.name}</span> : null;
                    })}
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-border bg-background">
                  <User2 className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
          {pending && (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl gradient-brand text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
                <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> Thinking…
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-background p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask anything about your leads…"
              rows={1}
              className="max-h-32 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none"
            />
            <button onClick={() => send()} disabled={pending} className="inline-flex items-center gap-1.5 rounded-xl gradient-brand px-3 py-2 text-xs font-medium text-white shadow-glow disabled:opacity-60">
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>
      </div>

      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-sm font-semibold">Suggested prompts</div>
          <div className="mt-3 space-y-2">
            {suggested.map((s) => (
              <button key={s} onClick={() => send(s)} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-xs hover:bg-accent">
                {s}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
          <div className="text-sm font-semibold">Lead in focus</div>
          {hovered && leadById[hovered] ? (
            <div className="mt-3 space-y-2 text-xs">
              <div className="text-base font-semibold">{leadById[hovered].name}</div>
              <div className="text-muted-foreground">{leadById[hovered].company} · {leadById[hovered].city}</div>
              <div className="rounded-md bg-muted/60 p-2">{leadById[hovered].notes}</div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-md bg-background p-2"><div className="text-muted-foreground">Score</div><div className="font-semibold">{leadById[hovered].score}</div></div>
                <div className="rounded-md bg-background p-2"><div className="text-muted-foreground">Status</div><div className="font-semibold capitalize">{leadById[hovered].status}</div></div>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-xs text-muted-foreground">Hover a cited lead to preview them here.</div>
          )}
        </div>
      </aside>
    </div>
  );
}
