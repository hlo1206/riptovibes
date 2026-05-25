const DEFAULT_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://fr.glitchnode.cloud:25574';

export function getSession() {
  if (typeof window === 'undefined') return { apiBase: DEFAULT_BASE, password: '' };
  return {
    apiBase: localStorage.getItem('rv_api_base') || DEFAULT_BASE,
    password: localStorage.getItem('rv_app_password') || ''
  };
}

export function saveSession({ apiBase, password }) {
  localStorage.setItem('rv_api_base', String(apiBase || DEFAULT_BASE).replace(/\/$/, ''));
  localStorage.setItem('rv_app_password', password || '');
}

export function clearSession() {
  localStorage.removeItem('rv_app_password');
}

export function authHeaders(extra = {}) {
  const { password } = getSession();
  return { 'x-app-password': password, ...extra };
}

export async function apiFetch(path, options = {}) {
  const { apiBase } = getSession();
  const isForm = options.body instanceof FormData;
  const headers = authHeaders(isForm ? (options.headers || {}) : { 'Content-Type': 'application/json', ...(options.headers || {}) });
  const res = await fetch(`${apiBase}${path}`, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      if (contentType.includes('application/json')) {
        const data = await res.json();
        message = data.error || data.message || message;
      } else {
        message = await res.text();
      }
    } catch {}
    throw new Error(message || 'Request failed');
  }
  if (contentType.includes('application/json')) return res.json();
  return res;
}

export async function apiBlob(path, options = {}) {
  const { apiBase } = getSession();
  const res = await fetch(`${apiBase}${path}`, { ...options, headers: authHeaders(options.headers || {}) });
  if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
  return res.blob();
}

export async function testConnection(apiBase, password) {
  const base = String(apiBase || DEFAULT_BASE).replace(/\/$/, '');
  const health = await fetch(`${base}/health`);
  if (!health.ok) throw new Error(`Health failed: ${health.status}`);
  const auth = await fetch(`${base}/api/settings`, { headers: { 'x-app-password': password || '' } });
  if (!auth.ok) throw new Error(auth.status === 401 ? 'Wrong app password' : `Auth test failed: ${auth.status}`);
  return true;
}

export function previewUrl(projectId) {
  const { apiBase } = getSession();
  return `${apiBase}/preview/${projectId}/`;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function filenameFromPath(filePath) {
  return String(filePath || '').split('/').pop() || 'file';
}
