import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

export type LeadStatus = "new" | "contacted" | "qualified" | "booked" | "lost";

export interface Lead {
  id: string; name: string; email: string | null; phone: string | null;
  company: string | null; source: string | null; status: LeadStatus;
  score: number; value: number | null; city: string | null;
  notes: string | null; last_activity: string | null; created_at: string;
}

export interface ActivityItem { id: string; type: string; text: string; when: string; }

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setLeads(await api.getLeads()); } catch (e) { console.error(e); }
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);
  return { leads, loading, reload: load, setLeads };
}

export async function insertLeadsBulk(rows: Partial<Lead>[]) {
  if (!rows.length) return { error: null, data: [] };
  try {
    const data = await api.insertLeadsBulk(rows);
    return { error: null, data };
  } catch (err) { return { error: err as Error, data: [] }; }
}

export function useActivity() {
  const [counts, setCounts] = useState({ emails: 0, whatsapps: 0, calls: 0, appts: 0 });
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([api.getActivityCounts(), api.getActivityFeed()]);
      setCounts(c); setActivity(a);
    } catch (e) { console.error(e); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return { counts, activity, reload: load };
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  return api.updateLeadStatus(id, status);
}

// CSV/Excel parsing (unchanged)
export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else if (c === "\r") {}
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const [head, ...body] = rows.filter((r) => r.length && r.some((x) => x.trim() !== ""));
  if (!head) return [];
  const headers = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()])));
}

export async function parseLeadFile(file: File): Promise<Record<string, string>[]> {
  const name = file.name.toLowerCase();
  if (!/\.(xlsx|xlsm|xlsb|xls|ods)$/.test(name)) return parseCsv(await file.text());
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  return raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).trim().toLowerCase(), String(v ?? "").trim()])));
}

const NAME_KEYS = ["name", "full name", "fullname", "lead name", "contact name", "first name"];
const EMAIL_KEYS = ["email", "email address", "e-mail"];
const PHONE_KEYS = ["phone", "phone number", "mobile", "tel", "telephone"];
const COMPANY_KEYS = ["company", "organization", "organisation", "business"];
const CITY_KEYS = ["city", "location", "town"];
const SOURCE_KEYS = ["source", "channel", "origin"];
const NOTES_KEYS = ["notes", "note", "remarks", "comment", "comments", "message"];

function pick(row: Record<string, string>, keys: string[]) {
  for (const k of keys) if (row[k]) return row[k];
  return "";
}

export function rowsToLeads(rows: Record<string, string>[]): Partial<Lead>[] {
  return rows.map((r) => {
    const first = pick(r, ["first name", "firstname"]);
    const lastN = pick(r, ["last name", "lastname", "surname"]);
    const name = pick(r, NAME_KEYS) || `${first} ${lastN}`.trim() || pick(r, EMAIL_KEYS);
    if (!name) return null;
    return {
      name, email: pick(r, EMAIL_KEYS) || null, phone: pick(r, PHONE_KEYS) || null,
      company: pick(r, COMPANY_KEYS) || null, city: pick(r, CITY_KEYS) || null,
      source: (pick(r, SOURCE_KEYS) || "import").toLowerCase(), notes: pick(r, NOTES_KEYS) || null,
      status: "new" as LeadStatus, score: 0,
    } as Partial<Lead>;
  }).filter(Boolean) as Partial<Lead>[];
}
