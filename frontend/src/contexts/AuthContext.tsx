// fix: read roleName from /me response — admin access restored 2026-06-14
// build-fix: AuthContext — types corrected 2026-06-14
'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
  id:                  number;
  username:            string;
  email:               string;
  full_name:           string;
  role:                string;
  tenantId?:           number;
  // permissions can arrive as string[] (backend RBAC codes) or
  // Record<string,boolean> (custom UI overrides saved to user.permissions JSONB).
  // can() handles both forms transparently.
  permissions:         string[] | Record<string, boolean>;
  mustChangePassword?: boolean;
}

interface AuthContextType {
  user:                    User | null;
  isLoading:               boolean;
  login:                   (credentials: LoginCredentials) => Promise<void>;
  logout:                  () => void;
  refreshUser:             (throwOn401?: boolean) => Promise<void>;
  clearMustChangePassword: () => void;
  /** Check if the current user has a specific backend permission code */
  can:                     (permission: string) => boolean;
}

interface LoginCredentials {
  username: string;
  password: string;
}

// /auth/login response — built in auth.service.ts BEFORE SnakeCaseInterceptor → camelCase
interface LoginUserPayload {
  id:                 number;
  username:           string;
  email:              string;
  fullName:           string;
  roleName:           string;
  tenantId?:          number;
  mustChangePassword: boolean;
}

interface LoginResponse {
  access_token: string;
  user:         LoginUserPayload;
}

// /auth/me response — built in auth.controller.ts → snake_case
interface MeResponse {
  id:                   number;
  username:             string;
  email:                string;
  full_name:            string;
  role_name?:           string;
  roleName?:            string;   // camelCase variant from JWT strategy
  role?:                string;
  tenantId?:            number;
  tenant_id?:           number;
  must_change_password: boolean;
  permissions?:         string[];  // ← populated by controller from req.user
}

// ── Constants ──────────────────────────────────────────────────────────────────

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const STORAGE_KEYS = {
  USER:         'user',
  REFRESHED_AT: 'user_refreshed_at',
} as const;

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]         = useState<User | null>(null);
  const [isLoading, setLoading] = useState(true);
  const router                  = useRouter();

  // ── Helpers ────────────────────────────────────────────────────────────

  const persistUser = useCallback((u: User) => {
    setUser(u);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(u));
    localStorage.setItem(STORAGE_KEYS.REFRESHED_AT, String(Date.now()));
  }, []);

  const clearUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.REFRESHED_AT);
  }, []);

  // ── Permission check helper ────────────────────────────────────────────

  /**
   * can('expense.create') — returns true if the user has the permission OR is admin.
   * Admin role bypasses all permission checks (matches backend hasPermission logic).
   */
  const can = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      if (user.role === 'admin' || user.role === 'superadmin') return true;
      const perms = user.permissions;
      if (!perms) return false;
      // Handle string[] (backend RBAC codes from /auth/me)
      if (Array.isArray(perms)) return perms.includes(permission);
      // Handle Record<string,boolean> (custom UI overrides stored in user.permissions JSONB)
      if (typeof perms === 'object') return (perms as Record<string, boolean>)[permission] === true;
      return false;
    },
    [user],
  );

  // ── refreshUser ────────────────────────────────────────────────────────

  const refreshUser = useCallback(async (throwOn401 = false) => {
    try {
    const res = await api.get<MeResponse>('/auth/me');

    if (res.success && res.data) {
      const d = res.data;
      persistUser({
        id:                 d.id,
        username:           d.username,
        email:              d.email,
        full_name:          d.full_name ?? d.username,
        role:               d.role_name ?? d.roleName ?? d.role ?? 'unknown',
        tenantId:           d.tenantId ?? d.tenant_id ?? undefined,
        // Normalize permissions: /me returns string[] (serialized Set), 
        // but we also support Record<string,boolean> for custom overrides.
        permissions:        Array.isArray(d.permissions)
                              ? d.permissions
                              : (d.permissions && typeof d.permissions === 'object'
                                  ? d.permissions
                                  : []),
        mustChangePassword: d.must_change_password ?? false,
      });
    } else {
      // 401 = token expired, missing branch, or tenant check failed
      api.clearToken();
      clearUser();
      if (throwOn401) {
        throw new Error(res.message ?? 'Account setup incomplete. Contact your administrator.');
      }
    }
    } catch (err: any) {
      // Re-throw during login flow so login page can surface the message
      if (throwOn401) throw err;
      // Background refresh failure — clear session gracefully
      console.warn('refreshUser failed:', err);
      api.clearToken();
      clearUser();
    }
  }, [persistUser, clearUser]);

  // ── Bootstrap ──────────────────────────────────────────────────────────

  useEffect(() => {
    const token     = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (!token) {
      setLoading(false);
      return;
    }

    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Ensure permissions array exists on cached user (backward compat)
        if (!parsed.permissions) parsed.permissions = [];
        setUser(parsed);
      } catch { /* corrupted cache */ }
    }

    const lastRefresh = Number(localStorage.getItem(STORAGE_KEYS.REFRESHED_AT) ?? 0);
    const isStale     = Date.now() - lastRefresh > REFRESH_INTERVAL_MS;

    if (isStale || !savedUser) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── auth:logout event (from ApiClient on 401) ──────────────────────────

  useEffect(() => {
    const handleLogout = () => {
      clearUser();
      router.replace('/auth/login');
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, [clearUser, router]);

  // ── login ──────────────────────────────────────────────────────────────

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      const res = await api.post<LoginResponse>('/auth/login', credentials);

      if (!res.success || !res.data) {
        throw new Error(res.message ?? 'Login failed. Please check your credentials.');
      }

      const { access_token, user: d } = res.data;

      // Login response is camelCase (built in auth.service.ts before SnakeCaseInterceptor)
      // permissions are NOT in the login response — they come from refreshUser()
      // We set [] here and immediately refresh to populate them
      const mappedUser: User = {
        id:                 d.id,
        username:           d.username,
        email:              d.email,
        full_name:          d.fullName ?? d.username,
        role:               d.roleName ?? 'unknown',
        tenantId:           d.tenantId ?? undefined,
        permissions:        [],  // populated below via refreshUser()
        mustChangePassword: d.mustChangePassword ?? false,
      };

      api.setToken(access_token);
      persistUser(mappedUser);

      // Immediately refresh to load permissions from /auth/me
      // Pass true so any 401 (e.g. cashier missing branchId) surfaces as a login error
      await refreshUser(true);

      router.push(mappedUser.mustChangePassword ? '/auth/set-new-password' : '/dashboard');
    },
    [persistUser, refreshUser, router],
  );

  // ── logout ─────────────────────────────────────────────────────────────

  const logout = useCallback(() => {
    api.clearToken();
    clearUser();
    router.replace('/auth/login');
  }, [clearUser, router]);

  // ── clearMustChangePassword ────────────────────────────────────────────

  const clearMustChangePassword = useCallback(() => {
    if (!user) return;
    persistUser({ ...user, mustChangePassword: false });
  }, [user, persistUser]);

  return (
    <AuthContext.Provider value={{
      user, isLoading, login, logout, refreshUser, clearMustChangePassword, can,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
