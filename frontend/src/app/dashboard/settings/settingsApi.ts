// Small fetch helper for the Settings sub-tabs. Unlike the inline helper in page.tsx it THROWS on
// non-2xx so callers can show the backend's message instead of treating an error body as data.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function call(method: string, path: string, body?: any) {
  const t = typeof window !== 'undefined' ? localStorage.getItem('access_token') : '';
  const r = await fetch(`${API_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data: any = null;
  try { data = await r.json(); } catch { /* empty body */ }
  if (!r.ok) {
    const m = data?.message;
    throw new Error(Array.isArray(m) ? m.join(', ') : (m || `Request failed (${r.status})`));
  }
  return data;
}

export const settingsApi = {
  get:   (p: string) => call('GET', p),
  post:  (p: string, b?: any) => call('POST', p, b ?? {}),
  patch: (p: string, b: any) => call('PATCH', p, b),
  del:   (p: string) => call('DELETE', p),
};

export const asList = (res: any): any[] => (Array.isArray(res) ? res : (res?.data ?? []));
