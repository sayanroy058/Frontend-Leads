import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, Eye, FileSpreadsheet, Loader2 } from "lucide-react";
import { useLeads, type LeadStatus } from "@/lib/leads-client";

export const Route = createFileRoute("/app/leads/")({
  component: AllLeads,
});

const statusStyles: Record<LeadStatus, string> = {
  new: "bg-sky/40 text-foreground",
  contacted: "bg-warning/20 text-warning-foreground",
  qualified: "bg-lilac/50 text-foreground",
  booked: "bg-success/25 text-success-foreground",
  lost: "bg-destructive/15 text-destructive",
};

const statuses: LeadStatus[] = ["new", "contacted", "qualified", "booked", "lost"];

function AllLeads() {
  const { leads, loading, reload } = useLeads();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | LeadStatus>("all");

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (status !== "all" && l.status !== status) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return (
        l.name.toLowerCase().includes(s) ||
        (l.email ?? "").toLowerCase().includes(s) ||
        (l.company ?? "").toLowerCase().includes(s) ||
        (l.phone ?? "").toLowerCase().includes(s) ||
        (l.city ?? "").toLowerCase().includes(s)
      );
    });
  }, [leads, q, status]);

  const counts = useMemo(() => {
    const t: Record<string, number> = {};
    for (const l of leads) t[l.status] = (t[l.status] ?? 0) + 1;
    return t;
  }, [leads]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">All leads</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every lead with full details. Click a row to view or edit.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search leads…"
              className="w-56 rounded-xl border border-border bg-card py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | LeadStatus)}
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none"
          >
            <option value="all">All status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
          <div className="text-2xl font-semibold">{leads.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        {statuses.map((s) => (
          <div key={s} className="rounded-2xl border border-border bg-card p-3 text-center shadow-soft">
            <div className="text-2xl font-semibold">{counts[s] ?? 0}</div>
            <div className="text-xs text-muted-foreground capitalize">{s}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm font-semibold">All leads</div>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{filtered.length}</span>
          </div>
          <button
            onClick={reload}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-xs hover:bg-accent"
          >
            <Loader2 className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="grid h-40 place-items-center">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Lead</th>
                  <th className="px-4 py-2.5 text-left font-medium">Company / City</th>
                  <th className="px-4 py-2.5 text-left font-medium">Phone</th>
                  <th className="px-4 py-2.5 text-left font-medium">Source</th>
                  <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  <th className="px-4 py-2.5 text-left font-medium">Score</th>
                  <th className="px-4 py-2.5 text-right font-medium">Value</th>
                  <th className="px-4 py-2.5 text-left font-medium">Created</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => (
                  <tr key={l.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 place-items-center rounded-xl gradient-brand text-xs font-semibold text-white">
                          {l.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium leading-tight">{l.name}</div>
                          <div className="text-xs text-muted-foreground">{l.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{l.company}<div className="text-xs text-muted-foreground">{l.city}</div></td>
                    <td className="px-4 py-3">{l.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-xs capitalize text-muted-foreground">{l.source}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles[l.status]}`}>{l.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-12 overflow-hidden rounded-full bg-muted">
                          <div className="h-full gradient-brand" style={{ width: `${l.score}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground">{l.score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">${Number(l.value ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to="/app/leads/$leadId"
                        params={{ leadId: l.id }}
                        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-accent"
                      >
                        <Eye className="h-3.5 w-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">No leads found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
