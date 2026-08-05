import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft, Save, Trash2, Loader2, Sparkles, Mail, Phone,
  Building2, MapPin, Tag, FileText, DollarSign, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import type { LeadStatus } from "@/lib/leads-client";

export const Route = createFileRoute("/app/leads/$leadId")({
  component: LeadDetail,
});

type Lead = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: LeadStatus;
  score: number;
  value: number | null;
  city: string | null;
  notes: string | null;
  last_activity: string | null;
  created_at: string;
};

const statuses: LeadStatus[] = ["new", "contacted", "qualified", "booked", "lost"];

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-sky/40 text-foreground",
  contacted: "bg-warning/20 text-warning-foreground",
  qualified: "bg-lilac/50 text-foreground",
  booked: "bg-success/25 text-success-foreground",
  lost: "bg-destructive/15 text-destructive",
};

const inputCls =
  "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function LeadDetail() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLead(await api.getLead(leadId));
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [leadId]);

  const set = (patch: Partial<Lead>) => setLead((p) => (p ? { ...p, ...patch } : p));

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!lead) return;
    setSaving(true);
    try {
      const updated = await api.updateLead(leadId, lead);
      setLead(updated);
      toast.success("Lead updated");
    } catch (err) {
      toast.error("Update failed", { description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!lead) return;
    if (!window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteLead(leadId);
      toast.success("Lead deleted");
      navigate({ to: "/app", replace: true });
    } catch (err) {
      toast.error("Delete failed", { description: (err as Error).message });
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="grid h-[60vh] place-items-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-border bg-card p-10 text-center shadow-soft">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">Lead not found</h2>
        <p className="mt-1 text-sm text-muted-foreground">It may have been deleted or the link is invalid.</p>
        <Link
          to="/app"
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow"
        >
          <ArrowLeft className="h-4 w-4" /> Back to leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/app" className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card hover:bg-accent">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{lead.name}</h1>
            <p className="text-sm text-muted-foreground">View and edit lead details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
          >
            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
          </button>
          <button
            type="submit"
            form="lead-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl gradient-brand px-4 py-2 text-sm font-medium text-white shadow-glow disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </button>
        </div>
      </div>

      <form id="lead-form" onSubmit={onSave} className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-soft lg:col-span-2">
          <h2 className="text-sm font-semibold">Contact &amp; lead info</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input className={inputCls} value={lead.name} onChange={(e) => set({ name: e.target.value })} required />
            </Field>
            <Field label="Status">
              <select className={inputCls} value={lead.status} onChange={(e) => set({ status: e.target.value as LeadStatus })}>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} value={lead.email ?? ""} onChange={(e) => set({ email: e.target.value || null })} />
            </Field>
            <Field label="Phone">
              <input className={inputCls} value={lead.phone ?? ""} onChange={(e) => set({ phone: e.target.value || null })} />
            </Field>
            <Field label="Company">
              <input className={inputCls} value={lead.company ?? ""} onChange={(e) => set({ company: e.target.value || null })} />
            </Field>
            <Field label="City">
              <input className={inputCls} value={lead.city ?? ""} onChange={(e) => set({ city: e.target.value || null })} />
            </Field>
            <Field label="Source">
              <input className={inputCls} value={lead.source ?? ""} onChange={(e) => set({ source: e.target.value || null })} />
            </Field>
            <Field label="Score (auto)">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full gradient-brand" style={{ width: `${lead.score}%` }} />
                </div>
                <span className="text-sm font-semibold">{lead.score}</span>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">Auto-scored from how many lead fields are filled.</p>
            </Field>
            <Field label="Value (USD)">
              <input type="number" min={0} step="any" className={inputCls} value={lead.value ?? ""} onChange={(e) => set({ value: e.target.value === "" ? null : Number(e.target.value) })} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Notes">
              <textarea rows={4} className={inputCls} value={lead.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} />
            </Field>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
            <h2 className="text-sm font-semibold">Summary</h2>
            <div className="mt-3 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl gradient-brand text-sm font-semibold text-white">
                {lead.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
              </div>
              <div>
                <div className="font-medium">{lead.name}</div>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[lead.status]}`}>
                  {lead.status}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-4 w-4" /><span className="truncate">{lead.email ?? "—"}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4" /><span>{lead.phone ?? "—"}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Building2 className="h-4 w-4" /><span>{lead.company ?? "—"}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-4 w-4" /><span>{lead.city ?? "—"}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Tag className="h-4 w-4" /><span className="capitalize">{lead.source ?? "—"}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><DollarSign className="h-4 w-4" /><span>${Number(lead.value ?? 0).toLocaleString()}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Sparkles className="h-4 w-4" /><span>Score {lead.score}/100</span></div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground shadow-soft">
            <FileText className="mb-2 h-4 w-4" />
            <div className="flex justify-between gap-2"><span>Created</span><span className="text-foreground/80">{new Date(lead.created_at).toLocaleString()}</span></div>
            <div className="mt-1 flex justify-between gap-2"><span>Last activity</span><span className="text-foreground/80">{lead.last_activity ? new Date(lead.last_activity).toLocaleString() : "—"}</span></div>
            <div className="mt-1 flex justify-between gap-2"><span>ID</span><span className="truncate pl-2 text-foreground/60">{lead.id}</span></div>
          </div>
        </div>
      </form>
    </div>
  );
}