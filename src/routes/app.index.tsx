import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  Upload, Users, Sparkles, FileSpreadsheet,
  Filter, MoreHorizontal, Search, Mail, MessageCircle, PhoneCall, CheckCircle2, Eye,
  Plus, UserPlus, X, Loader2,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { toast } from "sonner";
import { useLeads, insertLeadsBulk, parseLeadFile, rowsToLeads, useActivity, type Lead, type LeadStatus } from "@/lib/leads-client";

export const Route = createFileRoute("/app/")({
  component: LeadsDashboard,
});

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-sky/40 text-foreground",
  contacted: "bg-warning/20 text-warning-foreground",
  qualified: "bg-lilac/50 text-foreground",
  booked: "bg-success/25 text-success-foreground",
  lost: "bg-destructive/15 text-destructive",
};

function Stat({ label, value, delta, Icon, tint }: { label: string; value: string; delta: string; Icon: typeof Users; tint: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tint}`}>
          <Icon className="h-4 w-4 text-foreground/80" />
        </div>
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
      {delta ? <div className="mt-1 text-xs text-success-foreground/80">{delta} vs last week</div> : <div className="mt-1 h-4" />}
    </div>
  );
}

function LeadsDashboard() {
  const { leads, reload } = useLeads();
  const { counts, activity } = useActivity();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | LeadStatus>("all");
  const [adding, setAdding] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return l.name.toLowerCase().includes(s) || (l.email ?? "").toLowerCase().includes(s) || (l.company ?? "").toLowerCase().includes(s);
    });
  }, [leads, q, status]);

  async function onUpload(files: FileList | null) {
    if (!files || !files.length) return;
    const f = files[0];
    let rows: Record<string, string>[] = [];
    try {
      rows = await parseLeadFile(f);
    } catch (err) {
      toast.error("Couldn't read that file", { description: (err as Error).message });
      return;
    }
    const newLeads = rowsToLeads(rows);
    if (!newLeads.length) {
      toast.error("Couldn't parse leads", { description: "Make sure your file has a header row with at least a name or email column." });
      return;
    }
    const { error } = await insertLeadsBulk(newLeads);
    if (error) {
      toast.error("Upload failed", { description: error.message });
      return;
    }
    toast.success(`Imported ${newLeads.length} leads`, { description: f.name });
    reload();
  }

  // Derive pipeline series from real data (last 7 days)
  const pipelineSeries = useMemo(() => {
    const days: { day: string; new: number; qualified: number; booked: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString("en", { weekday: "short" });
      const sameDay = leads.filter((l) => new Date(l.created_at).toDateString() === d.toDateString());
      days.push({
        day: label,
        new: sameDay.filter((l) => l.status === "new").length,
        qualified: sameDay.filter((l) => l.status === "qualified").length,
        booked: sameDay.filter((l) => l.status === "booked").length,
      });
    }
    return days;
  }, [leads]);

  const sourceBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const l of leads) map[l.source ?? "other"] = (map[l.source ?? "other"] ?? 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name: name[0].toUpperCase() + name.slice(1), value }));
  }, [leads]);

  const COLORS = ["oklch(0.72 0.18 290)", "oklch(0.82 0.16 60)", "oklch(0.74 0.16 165)", "oklch(0.75 0.12 230)", "oklch(0.7 0.18 25)"];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Leads overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">A live snapshot of your pipeline, AI activity and delivery status.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <UserPlus className="h-4 w-4" /> Add lead
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow"
          >
            <Upload className="h-4 w-4" /> Upload leads
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,.tsv,.xlsx,.xls,.xlsm,.ods"
            onChange={(e) => onUpload(e.target.files)}
            className="hidden"
          />
          <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent">
            <Sparkles className="h-4 w-4" /> AI enrich
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Stat label="Total leads" value={leads.length.toLocaleString()} delta="" Icon={Users} tint="gradient-soft" />
        <Stat label="Emails sent" value={counts.emails.toString()} delta="" Icon={Mail} tint="gradient-peach" />
        <Stat label="WhatsApps" value={counts.whatsapps.toString()} delta="" Icon={MessageCircle} tint="gradient-mint" />
        <Stat label="Calls placed" value={counts.calls.toString()} delta="" Icon={PhoneCall} tint="gradient-sky" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Pipeline this week</div>
              <div className="text-xs text-muted-foreground">New, qualified, booked per day</div>
            </div>
            <div className="flex gap-3 text-xs">
              <Legend color="oklch(0.72 0.18 290)" label="New" />
              <Legend color="oklch(0.82 0.16 60)" label="Qualified" />
              <Legend color="oklch(0.74 0.16 165)" label="Booked" />
            </div>
          </div>
          <div className="mt-4 h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pipelineSeries}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.72 0.18 290)" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="oklch(0.72 0.18 290)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.82 0.16 60)" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="oklch(0.82 0.16 60)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.5 0 0 / 0.1)" />
                <XAxis dataKey="day" stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="currentColor" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="new" stroke="oklch(0.72 0.18 290)" fill="url(#g1)" strokeWidth={2} />
                <Area type="monotone" dataKey="qualified" stroke="oklch(0.82 0.16 60)" fill="url(#g2)" strokeWidth={2} />
                <Area type="monotone" dataKey="booked" stroke="oklch(0.74 0.16 165)" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-sm font-semibold">Source breakdown</div>
          <div className="text-xs text-muted-foreground">Where leads come from</div>
          <div className="mt-2 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sourceBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                  {sourceBreakdown.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="transparent" />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
            {sourceBreakdown.map((s, i) => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                <span className="text-muted-foreground">{s.name}</span>
                <span className="ml-auto font-medium">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
              <div className="text-sm font-semibold">Recent leads</div>
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{Math.min(filtered.length, 6)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-44 rounded-lg border border-border bg-background py-1.5 pl-8 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring" />
              </div>
              <select value={status} onChange={(e) => setStatus(e.target.value as "all" | LeadStatus)} className="rounded-lg border border-border bg-background px-2 py-1.5 text-xs">
                <option value="all">All status</option>
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="booked">Booked</option>
                <option value="lost">Lost</option>
              </select>
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-xs hover:bg-accent">
                <Filter className="h-3.5 w-3.5" /> Filter
              </button>
              <Link
                to="/app/leads"
                className="inline-flex items-center gap-1.5 rounded-lg gradient-brand px-2.5 py-1.5 text-xs font-medium text-white shadow-glow"
              >
                <Eye className="h-3.5 w-3.5" /> View all leads
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Company</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">Score</th>
                  <th className="px-4 py-2.5 text-left font-medium">Value</th>
                  <th className="px-4 py-2.5 text-left font-medium">Source</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 6).map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-xs font-semibold text-white">
                          {l.name.split(" ").map((p) => p[0]).join("").slice(0,2)}
                        </div>
                        <div>
                          <div className="font-medium leading-tight">{l.name}</div>
                          <div className="text-xs text-muted-foreground">{l.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{l.company}<div className="text-xs text-muted-foreground">{l.city}</div></td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[l.status]}`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <div className="h-full gradient-brand" style={{ width: `${l.score}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{l.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">${Number(l.value ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{l.source}</td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/app/leads/$leadId" params={{ leadId: l.id }} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent">
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                      <button className="ml-1 grid h-7 w-7 place-items-center rounded-md hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
          <div className="text-sm font-semibold">Live activity</div>
          <div className="text-xs text-muted-foreground">Delivery status across channels</div>
          <div className="mt-4 space-y-3">
            {activity.length === 0 && (
              <div className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                No activity yet. Send your first AI email, WhatsApp, or call.
              </div>
            )}
            {activity.map((a) => {
              const Icon = a.type === "email" ? Mail : a.type === "whatsapp" ? MessageCircle : PhoneCall;
              const tint = a.type === "email" ? "gradient-peach" : a.type === "whatsapp" ? "gradient-mint" : "gradient-sky";
              return (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border bg-background/60 p-3">
                  <div className={`grid h-8 w-8 place-items-center rounded-lg ${tint}`}>
                    <Icon className="h-4 w-4 text-foreground/80" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm">{a.text}</div>
                    <div className="text-[11px] text-muted-foreground">{new Date(a.when).toLocaleString()}</div>
                  </div>
                  <CheckCircle2 className="h-4 w-4 text-success" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {adding && (
        <AddLeadModal
          onClose={() => setAdding(false)}
          onSaved={() => { setAdding(false); reload(); }}
        />
      )}
    </div>
  );
}

const statusOptions: LeadStatus[] = ["new", "contacted", "qualified", "booked", "lost"];

function AddLeadModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phone: "", company: "", city: "",
    source: "manual", status: "new" as LeadStatus, value: "", notes: "",
  });
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const inputCls = "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setBusy(true);
    const { error } = await insertLeadsBulk([{
      name: form.name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      company: form.company.trim() || null,
      city: form.city.trim() || null,
      source: form.source.trim() || "manual",
      status: form.status,
      value: form.value.trim() === "" ? null : Number(form.value),
      notes: form.notes.trim() || null,
    }]);
    setBusy(false);
    if (error) { toast.error("Couldn't add lead", { description: error.message }); return; }
    toast.success("Lead added");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/30 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="grid max-h-[90vh] w-full max-w-lg grid-rows-[auto_1fr_auto] overflow-hidden rounded-2xl border border-border bg-card shadow-elegant" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <div className="flex items-center gap-2"><UserPlus className="h-4 w-4" /><div className="text-sm font-semibold">Add lead manually</div></div>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <form id="add-lead-form" onSubmit={onSubmit} className="overflow-y-auto p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Full name *</span>
              <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} required />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Status</span>
              <select className={inputCls} value={form.status} onChange={(e) => set({ status: e.target.value as LeadStatus })}>
                {statusOptions.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Email</span>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Phone</span>
              <input className={inputCls} value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Company</span>
              <input className={inputCls} value={form.company} onChange={(e) => set({ company: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">City</span>
              <input className={inputCls} value={form.city} onChange={(e) => set({ city: e.target.value })} />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Source</span>
              <input className={inputCls} value={form.source} onChange={(e) => set({ source: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Value (USD)</span>
              <input type="number" min={0} step="any" className={inputCls} value={form.value} onChange={(e) => set({ value: e.target.value })} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">Notes</span>
              <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => set({ notes: e.target.value })} />
            </label>
          </div>
        </form>
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent">Cancel</button>
          <button type="submit" form="add-lead-form" disabled={busy} className="inline-flex items-center gap-2 rounded-lg gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow disabled:opacity-60">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add lead
          </button>
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-muted-foreground">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} /> {label}
    </div>
  );
}
