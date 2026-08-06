// Defaults to the deployed backend on Vercel. Override per environment with
// VITE_API_URL (e.g. "/api" in dev to go through the Vite proxy to localhost:3001).
const API_BASE: string = import.meta.env.VITE_API_URL ?? "https://backend-leads.vercel.app/api";

function getToken(): string | null {
  try { return localStorage.getItem("auth_token"); } catch { return null; }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  register: (data: { name: string; email: string; password: string }) =>
    request<{ token: string; user: { id: number; name: string | null; email: string } }>("POST", "/auth/register", data),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: { id: number; name: string | null; email: string } }>("POST", "/auth/login", data),
  logout: () => request("POST", "/auth/logout"),
  getMe: () => request<{ user: { id: number; name: string | null; email: string } | null }>("GET", "/auth/me"),

  // Leads
  getLeads: () => request<any[]>("GET", "/leads"),
  insertLeadsBulk: (data: any[]) => request<any[]>("POST", "/leads/bulk", data),
  updateLeadStatus: (id: string, status: string) => request("POST", "/leads/status", { id, status }),
  getLead: (id: string) => request<any>("GET", `/leads/${id}`),
  updateLead: (id: string, data: any) => request<any>("PUT", `/leads/${id}`, data),
  deleteLead: (id: string) => request<any>("DELETE", `/leads/${id}`),
  getActivityCounts: () => request<{ emails: number; whatsapps: number; calls: number; appts: number }>("GET", "/leads/activity/counts"),
  getActivityFeed: () => request<any[]>("GET", "/leads/activity/feed"),

  // Chat
  getChatMessages: () => request<any[]>("GET", "/messages/chat"),
  insertChatMessage: (data: { role: string; content: string; citations?: string[] }) => request<{ id: string }>("POST", "/messages/chat", data),

  // Email
  getEmails: () => request<any[]>("GET", "/messages/emails"),
  insertEmails: (data: any[]) => request("POST", "/messages/emails", data),
  updateEmailStatus: (data: { id: string; status: string; sent_at?: string; delivered_at?: string; opened_at?: string }) => request("POST", "/messages/emails/status", data),
  sendEmail: (id: string) => request<any>("POST", "/messages/emails/send", { id }),
  syncInbox: () => request<{ synced: number; total: number }>("POST", "/messages/emails/sync"),

  // WhatsApp
  getWhatsapps: () => request<any[]>("GET", "/messages/whatsapps"),
  insertWhatsapps: (data: any[]) => request("POST", "/messages/whatsapps", data),
  updateWhatsappStatus: (data: { id: string; status: string; sent_at?: string; delivered_at?: string; read_at?: string }) => request("POST", "/messages/whatsapps/status", data),

  // Calls
  getCallLogs: () => request<any[]>("GET", "/messages/calls"),
  insertCallLogs: (data: any[]) => request<any[]>("POST", "/messages/calls", data),
  updateCallLog: (data: any) => request("POST", "/messages/calls/status", data),

  // Appointments
  getAppointments: () => request<any[]>("GET", "/messages/appointments"),
  insertAppointment: (data: any) => request("POST", "/messages/appointments", data),

  // AI
  aiChat: (data: { question: string; leads: any[] }) => request<{ text: string; citations: string[] }>("POST", "/ai/chat", data),
  aiComposeEmail: (data: { lead: any; tone: string; goal: string; senderName?: string }) => request<{ subject: string; body: string }>("POST", "/ai/email", data),
  aiComposeWhatsapp: (data: { lead: any; intent: string }) => request<{ body: string }>("POST", "/ai/whatsapp", data),
  aiCallScript: (data: { lead: any; goal: string }) => request<any>("POST", "/ai/call", data),
  aiImage: (data: { prompt: string; size?: string }) => request<{ image: string }>("POST", "/ai/image", data),
};
