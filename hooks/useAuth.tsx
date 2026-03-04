"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';
import { registerUser, loginUser, logoutUser } from '@/services/auth.service';
type SystemRole = 'USER' | 'BUYER' | 'PRODUCER' | 'ADMIN' | 'SUPERADMIN' | 'AGENT';

interface AuthUser {
  id?:string;
  name: string | null;
  role: SystemRole;
}

interface AuthState {
  user: AuthUser | null;
  userLocation: { id: string; name: string } | null;
  permissions: string[];
  activeOrg: { id: string; name: string; role: string } | null;
  organizations: Array<{ organizationId: string; role: string; name?: string }>;
}

interface AuthContextType extends AuthState {
  userRole: SystemRole | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const isDev = process.env.NODE_ENV !== 'production';
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userLocation: null,
    permissions: [],
    activeOrg: null,
    organizations: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateSession = useCallback((userData: any) => {
    if (isDev) console.debug('[Auth] hydrateSession invoked', { name: userData.name, role: userData.role });
    Cookies.set(COOKIE_NAMES.USER_ROLE, userData.role, { expires: 7, sameSite: 'lax' });
    Cookies.set(COOKIE_NAMES.USER_NAME, userData.name || '', { expires: 7, sameSite: 'lax' });

    const orgs = Array.isArray(userData.organizations)
      ? userData.organizations.map((o: any) => ({
          organizationId: o.organizationId,
          role: o.role,
          name: o.name || undefined,
        }))
      : [];

    setAuthState({
      user: { id: userData.id ?? undefined, name: userData.name ?? null, role: userData.role },
      userLocation: userData.location || null,
      permissions: Array.isArray(userData.permissions) ? userData.permissions : [],
      organizations: orgs,
      activeOrg: orgs.length > 0 ? { id: orgs[0].organizationId, name: orgs[0].name || '', role: orgs[0].role } : null,
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const checkSession = async () => {
      const startMs = Date.now();
      try {
        // Poll SESSION_READY
        const pollStart = Date.now();
        let sawReady = false;
        while (Date.now() - pollStart < 2000) {
          if (Cookies.get(COOKIE_NAMES.SESSION_READY)) {
            sawReady = true;
            Cookies.remove(COOKIE_NAMES.SESSION_READY);
            if (isDev) console.debug('[Auth] SESSION_READY detected, cleaning and proceeding to /api/me');
            break;
          }
          await delay(100);
        }
        if (!sawReady && isDev) console.debug('[Auth] SESSION_READY not detected during poll, calling /api/me directly');

        if (isDev) console.debug('[Auth] Calling /api/me', { at: Date.now(), sinceStartMs: Date.now() - startMs });
        let res = await fetch('/api/me', { credentials: 'same-origin', signal: controller.signal });

        if (!res.ok && res.status === 401) {
          if (isDev) console.debug('[Auth] /api/me returned 401; retrying after delay');
          await delay(300);
          res = await fetch('/api/me', { credentials: 'same-origin', signal: controller.signal });
        }

        if (isDev) console.debug('[Auth] /api/me response', { ok: res.ok, status: res.status, durationMs: Date.now() - startMs });

        if (res.ok) {
          const data = await res.json();
          if (data?.success && data.user) {
            try {
              const clientPv = Cookies.get(COOKIE_NAMES.PERMISSION_VERSION);
              if (clientPv && data.user.permissionVersion && String(data.user.permissionVersion) !== String(clientPv)) {
                if (isDev) console.debug('[Auth] permission-version mismatch', { clientPv, serverPv: data.user.permissionVersion });
              }
            } catch (e) {
              // ignore
            }

            hydrateSession(data.user);
            return;
          }
        }

        const savedRole = Cookies.get(COOKIE_NAMES.USER_ROLE) as SystemRole | undefined;
        if (savedRole) {
          const savedName = Cookies.get(COOKIE_NAMES.USER_NAME);
          const savedLocation = Cookies.get(COOKIE_NAMES.USER_ZONE);

          if (isDev) console.debug('[Auth] Falling back to UI cookies', { savedRole, savedName });
          setAuthState(prev => ({
            ...prev,
            user: { id: undefined, name: savedName || null, role: savedRole },
            userLocation: savedLocation ? JSON.parse(savedLocation) : null,
          }));
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') console.error('Initial check session failed:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    return () => controller.abort();
  }, [hydrateSession]);

  const handleRedirect = (userData: any) => {
    const isAdmin = userData.role === 'ADMIN' || userData.role === 'SUPERADMIN';
    const target = isAdmin ? '/admin' : '/dashboard';
    if (typeof window !== 'undefined') window.location.href = target;
  };

  const login = async (email: string, password: string) => {
    setIsActionLoading(true);
    setError(null);
    try {
      const result = await loginUser({ email, password });
      if (result.success && result.user) {
        hydrateSession(result.user);
        handleRedirect(result.user);
      } else {
        setError(result.error || 'Identifiants incorrects');
      }
      return result;
    } catch (err) {
      setError('Erreur de connexion');
      return { success: false, error: 'Erreur technique' };
    } finally {
      setIsActionLoading(false);
    }
  };

  const register = async (data: any) => {
    setIsActionLoading(true);
    setError(null);
    try {
      const result = await registerUser(data);
      if (result.success && result.user) {
        hydrateSession(result.user);
        if (result.pendingOrgCreated) {
          window.location.href = '/dashboard';
        } else {
          handleRedirect(result.user);
        }
      } else {
        setError(result.error || "Erreur lors de l'inscription");
      }
      return result;
    } catch (err) {
      setError("Erreur technique lors de l'inscription");
      return { success: false, error: 'Erreur technique' };
    } finally {
      setIsActionLoading(false);
    }
  };

  const logout = async () => {
    try {
      await logoutUser();
    } catch (e) {
      console.error('Logout error:', e);
    }

    Object.values(COOKIE_NAMES).forEach(name => Cookies.remove(name));

    setAuthState({
      user: null,
      userLocation: null,
      permissions: [],
      activeOrg: null,
      organizations: [],
    });

    window.location.href = '/login';
  };

  const contextValue = useMemo(() => ({
    ...authState,
    userRole: authState.user?.role,
    isAuthenticated: !!authState.user,
    isLoading,
    isActionLoading,
    error,
    login,
    register,
    logout,
  }), [authState, isLoading, isActionLoading, error]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};