// patch 2026-06-16T16:30: auto-hydrate token on init — fixes superadmin 401
// src/lib/api/client.ts
// fix: auto-append /api prefix — 2026-06-14
// Ensure /api prefix is always present regardless of how env var is set
const _rawUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const API_BASE_URL = _rawUrl.endsWith('/api') ? _rawUrl : `${_rawUrl}/api`;

type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  message?: string;
  status: number;
};

class ApiClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
  }

  hydrateToken() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    try {
      const res = await fetch(url, { ...options, headers });
      // 204 No Content has no body — res.json() would throw
      const contentType = res.headers.get('content-type') ?? '';
      const hasBody = res.status !== 204 && contentType.includes('application/json');
      const data = hasBody ? await res.json() : {};
      return {
        success: res.ok,
        data: res.ok ? data : undefined,
        message: !res.ok ? (data.message || `HTTP ${res.status}`) : undefined,
        status: res.status,
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Network error',
        status: 0,
      };
    }
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(body) });
  }

  patch<T>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(body) });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Auto-hydrate token from localStorage on module load
// This ensures superadmin and other pages that load before AuthContext
// can set the token still send the Authorization header correctly
const api = new ApiClient();
if (typeof window !== 'undefined') api.hydrateToken();
export { api };