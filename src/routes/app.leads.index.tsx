import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Eye, FileSpreadsheet, Loader2, Trash2, Download, Wand2 } from "lucide-react";
import { useLeads, downloadLeadsCsv, normalizePhone, type LeadStatus } from "@/lib/leads-client";
import { api } from "@/api/client";

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [fixingPhones, setFixingPhones] = useState(false);

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

  // Drop any selected ids that fell out of the current filter/result set.
  useEffect(() => {
    setSelected((prev) => {
      const visible = new Set(filtered.map((l) => l.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);

  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(filtered.map((l) => l.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function exportCsv() {
    const rows = selected.size ? filtered.filter((l) => selected.has(l.id)) : filtered;
    if (!rows.length) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadLeadsCsv(rows, `leads-export-${stamp}.csv`);
  }

  // One-time cleanup: re-run the phone normalizer over existing leads so
  // records saved before the parser fix (or entered with messy formatting)
  // get reformatted, and unusable values (junk placeholders, too-short
  // numbers) get cleared instead of sitting there looking like real data.
  async function fixPhoneNumbers() {
    const targets = (selected.size ? filtered.filter((l) => selected.has(l.id)) : leads).filter((l) => l.phone);
    if (!targets.length) {
      window.alert("No phone numbers to check in the current view.");
      return;
    }
    if (!window.confirm(`Re-check formatting on ${targets.length} lead${targets.length === 1 ? "" : "s"} with a phone number? Unusable values will be cleared.`)) return;
    setFixingPhones(true);
    let changed = 0;
    let cleared = 0;
    try {
      for (const l of targets) {
        const result = normalizePhone(l.phone!);
        const next = result.valid ? result.formatted : null;
        if (next === l.phone) continue; // already in the right shape
        await api.updateLead(l.id, { phone: next });
        changed++;
        if (!result.valid) cleared++;
      }
      await reload();
      window.alert(
        changed
          ? `Updated ${changed} lead${changed === 1 ? "" : "s"}.${cleared ? ` ${cleared} had an unusable number and were cleared.` : ""}`
          : "All phone numbers were already in the correct format."
      );
    } catch (e) {
      window.alert(`Failed to fix phone numbers: ${(e as Error).message}`);
    } finally {
      setFixingPhones(false);
    }
  }

  async function deleteSelected() {
    if (!selected.size) return;
    const ids = [...selected];
    if (!window.confirm(`Delete ${ids.length} lead${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.deleteLeadsBulk(ids);
      setSelected(new Set());
      await reload();
    } catch (e) {
      window.alert(`Failed to delete leads: ${(e as Error).message}`);
    } finally {
      setDeleting(false);
    }
  }

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
            {selected.size > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">{selected.size} selected</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete {selected.size} selected
              </button>
            )}
            <button
              onClick={fixPhoneNumbers}
              disabled={fixingPhones}
              title={selected.size ? `Re-check phone formatting on ${selected.size} selected lead(s)` : "Re-check phone formatting on all leads"}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-60"
            >
              {fixingPhones ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              Fix phone numbers{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              title={selected.size ? `Export ${selected.size} selected lead(s)` : `Export ${filtered.length} lead(s)`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-xs hover:bg-accent disabled:opacity-60"
            >
              <Download className="h-3.5 w-3.5" /> Export CSV{selected.size > 0 ? ` (${selected.size})` : ""}
            </button>
            <button
              onClick={reload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2 py-1.5 text-xs hover:bg-accent"
            >
              <Loader2 className="h-3.5 w-3.5" /> Refresh
            </button>
          </div>
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
                  <th className="px-4 py-2.5 text-left font-medium">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleAll}
                      aria-label="Select all leads"
                      className="h-4 w-4 rounded border-border accent-primary"
                    />
                  </th>
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
                  <tr key={l.id} className={`border-t border-border hover:bg-muted/30 ${selected.has(l.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(l.id)}
                        onChange={() => toggleOne(l.id)}
                        aria-label={`Select ${l.name}`}
                        className="h-4 w-4 rounded border-border accent-primary"
                      />
                    </td>
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
                    <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">No leads found.</td>
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
