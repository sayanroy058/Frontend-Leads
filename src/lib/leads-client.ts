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

const EXPORT_COLUMNS: { key: keyof Lead; header: string }[] = [
  { key: "name", header: "Name" },
  { key: "email", header: "Email" },
  { key: "phone", header: "Phone" },
  { key: "company", header: "Company" },
  { key: "city", header: "City" },
  { key: "source", header: "Source" },
  { key: "status", header: "Status" },
  { key: "score", header: "Score" },
  { key: "value", header: "Value" },
  { key: "notes", header: "Notes" },
  { key: "created_at", header: "Created" },
];

/** Quote a CSV field only when it needs it (comma, quote, or newline present). */
function csvField(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function leadsToCsv(leads: Lead[]): string {
  const header = EXPORT_COLUMNS.map((c) => csvField(c.header)).join(",");
  const rows = leads.map((l) => EXPORT_COLUMNS.map((c) => csvField(l[c.key])).join(","));
  return [header, ...rows].join("\r\n");
}

/** Trigger a browser download of `leads` as a CSV file named `filename`. */
export function downloadLeadsCsv(leads: Lead[], filename = "leads-export.csv") {
  const csv = leadsToCsv(leads);
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }); // BOM for Excel
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

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
  // raw: false + cellText forces SheetJS to hand back each cell's *displayed*
  // text (respecting its number format) instead of the underlying JS number.
  // Without this, phone/contact columns stored as numbers come through
  // mangled — scientific notation on long digit strings (e.g. "9.19877e+9")
  // or a dropped leading zero — even though the cell shows the right digits
  // in Excel itself.
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return raw.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [String(k).trim().toLowerCase(), String(v ?? "").trim()])));
}

const NAME_KEYS = ["name", "full name", "fullname", "lead name", "contact name", "first name"];
const EMAIL_KEYS = ["email", "email address", "e-mail"];
const PHONE_KEYS = [
  "phone", "phone number", "phone no", "phone no.",
  "mobile", "mobile number", "mobile no", "mobile no.",
  "contact", "contact number", "contact no", "contact no.",
  "cell", "cell phone", "cellphone", "cell number",
  "tel", "telephone", "telephone number",
  "whatsapp", "whatsapp number",
];
const COMPANY_KEYS = ["company", "organization", "organisation", "business"];
const CITY_KEYS = ["city", "location", "town"];
const SOURCE_KEYS = ["source", "channel", "origin"];
const NOTES_KEYS = ["notes", "note", "remarks", "comment", "comments", "message"];

function pick(row: Record<string, string>, keys: string[]) {
  for (const k of keys) if (row[k]) return row[k];
  return "";
}

// Known junk/placeholder values people put in a phone column when there's no
// real number — never worth trying to parse as digits.
const PHONE_PLACEHOLDER_RE = /^(n\/?a|none|null|unknown|-+|—|x+|tbd|pending)$/i;

export interface PhoneParseResult {
  formatted: string | null; // display-ready, or null if unusable
  valid: boolean;
}

/**
 * Normalize a phone value pulled from CSV/Excel into a consistent, readable
 * format, or flag it as unusable. Handles:
 *  - spreadsheet artifacts: scientific notation ("9.19877E+9"), a trailing
 *    ".0" left by cells stored as floats
 *  - formatting noise: spaces, dashes, dots, parens
 *  - extensions ("... ext 204") — stripped, the base number is kept
 *  - multiple numbers in one field ("A / B") — the first is used
 *  - junk placeholders ("N/A", "-", "TBD", letters-only) — rejected
 *  - implausible numbers — too short, or all-repeated-digit ("00000000000")
 *
 * A bare 10-digit number is assumed Indian (+91), matching this dataset's
 * dominant pattern; numbers that already carry a country code (11+ digits,
 * or a leading "+") are kept as detected. Output is grouped for readability,
 * e.g. "+91 90629 86383".
 */
export function normalizePhone(raw: string): PhoneParseResult {
  let v = raw.trim();
  if (!v) return { formatted: null, valid: false };
  if (PHONE_PLACEHOLDER_RE.test(v)) return { formatted: null, valid: false };

  // Scientific notation — expand back to a plain integer string first.
  if (/e\+?\d+$/i.test(v)) {
    const n = Number(v);
    if (Number.isFinite(n)) v = String(Math.trunc(n));
  }
  v = v.replace(/\.0+$/, "");

  // Only the first number if the field holds more than one ("A / B", "A, B").
  v = v.split(/[/,]|(?:\s{2,})/)[0].trim();

  // Drop a trailing extension ("ext 204", "x204").
  v = v.replace(/\s*(?:ext\.?|x)\s*\d+$/i, "").trim();

  const hasPlus = v.trim().startsWith("+");
  let digits = v.replace(/\D/g, "");

  // A leading trunk-prefix "0" (a domestic dialing convention, e.g.
  // "091-9876543211" or "0-91-9876543211") is not part of a country code —
  // drop it before parsing so it doesn't get misread as one. Covers both a
  // bare 11-digit number ("0" + 10-digit) and "0" prefixed onto an
  // already-country-coded number ("0" + "91" + 10-digit).
  if (!hasPlus && digits.startsWith("0") && (digits.length === 11 || digits.length === 13)) {
    digits = digits.slice(1);
  }

  if (!digits) return { formatted: null, valid: false };
  if (digits.length < 7 || digits.length > 15) return { formatted: null, valid: false }; // ITU E.164 bounds
  if (/^(\d)\1+$/.test(digits)) return { formatted: null, valid: false }; // all one repeated digit

  let cc = "";
  let national = digits;
  if (hasPlus) {
    // Best-effort split: assume a 1-3 digit country code, rest is the
    // national number. India (91) is the common case in this dataset.
    if (digits.startsWith("91") && digits.length === 12) { cc = "91"; national = digits.slice(2); }
    else if (digits.length > 10) { cc = digits.slice(0, digits.length - 10); national = digits.slice(-10); }
    else { national = digits; }
  } else if (digits.length === 12 && digits.startsWith("91")) {
    cc = "91"; national = digits.slice(2);
  } else if (digits.length === 10) {
    cc = "91"; // bare 10-digit number — assume Indian, the dominant source here
    national = digits;
  } else if (digits.length > 10) {
    cc = digits.slice(0, digits.length - 10);
    national = digits.slice(-10);
  }

  // Group for readability: Indian numbers as 5-5 ("98765 43210"); other
  // 10-digit national numbers (e.g. US) as 3-3-4 ("555 123 4567"); anything
  // else left ungrouped rather than guessing a wrong split.
  const grouped =
    national.length === 10
      ? cc === "91"
        ? `${national.slice(0, 5)} ${national.slice(5)}`
        : `${national.slice(0, 3)} ${national.slice(3, 6)} ${national.slice(6)}`
      : national;
  const formatted = cc ? `+${cc} ${grouped}` : grouped;
  return { formatted, valid: true };
}

export interface ImportStats {
  total: number;
  imported: number;
  invalidPhones: number; // rows imported but the phone value was rejected
}

export function rowsToLeads(rows: Record<string, string>[]): { leads: Partial<Lead>[]; stats: ImportStats } {
  let invalidPhones = 0;
  const leads = rows.map((r) => {
    const first = pick(r, ["first name", "firstname"]);
    const lastN = pick(r, ["last name", "lastname", "surname"]);
    const name = pick(r, NAME_KEYS) || `${first} ${lastN}`.trim() || pick(r, EMAIL_KEYS);
    if (!name) return null;
    const phoneRaw = pick(r, PHONE_KEYS);
    const phone = phoneRaw ? normalizePhone(phoneRaw) : { formatted: null, valid: false };
    if (phoneRaw && !phone.valid) invalidPhones++;
    return {
      name, email: pick(r, EMAIL_KEYS) || null, phone: phone.formatted,
      company: pick(r, COMPANY_KEYS) || null, city: pick(r, CITY_KEYS) || null,
      source: (pick(r, SOURCE_KEYS) || "import").toLowerCase(), notes: pick(r, NOTES_KEYS) || null,
      status: "new" as LeadStatus, score: 0,
    } as Partial<Lead>;
  }).filter(Boolean) as Partial<Lead>[];
  return { leads, stats: { total: rows.length, imported: leads.length, invalidPhones } };
}
