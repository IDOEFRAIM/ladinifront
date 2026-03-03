'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';
import { registerUser, loginUser, logoutUser } from '@/services/auth.service'; 
import type { Role as SystemRole } from '@prisma/client';

interface AuthContextType {
  user: any;
  userRole: SystemRole | undefined;
  userLocation: { id: string; name: string } | null;
  permissions: string[];
  activeOrg: { id: string; name: string; role: string } | null;
  organizations: Array<{ organizationId: string; role: string; name?: string }>;
  isAuthenticated: boolean;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<any>;
  register: (data: { email: string; password: string; role: SystemRole; name: string; adminSecret?: string; locationId?: string }) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true); 
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<SystemRole | undefined>(undefined);
  const [userLocation, setUserLocation] = useState<{ id: string; name: string } | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [activeOrg, setActiveOrg] = useState<{ id: string; name: string; role: string } | null>(null);
  const [organizations, setOrganizations] = useState<Array<{ organizationId: string; role: string; name?: string }>>([]);
  const router = useRouter();

  // 1. Synchronisation initiale au chargement
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Prefer server-derived session info (JWT / session-token).
        // Wait for the server to indicate readiness via `session-ready` cookie
        // to avoid race where the browser hasn't attached the httpOnly cookie yet.
          const waitForSessionReady = async (timeout = 2000) => {
          const start = Date.now();
          while (Date.now() - start < timeout) {
            const ready = Cookies.get(COOKIE_NAMES.SESSION_READY);
            if (ready) {
              Cookies.remove(COOKIE_NAMES.SESSION_READY);
              return true;
            }
            await new Promise((r) => setTimeout(r, 100));
          }
          return false;
        };

        await waitForSessionReady();

        let res = await fetch('/api/me', { credentials: 'same-origin' });
        // If the session cookie was just set by a previous navigation, the first
        // request may race and return 401. Retry once after a short delay.
        if (!res.ok && res.status === 401) {
          await new Promise((r) => setTimeout(r, 300));
          res = await fetch('/api/me', { credentials: 'same-origin' });
        }
        if (res.ok) {
          const data = await res.json();
          // new response shape: { success: true, user: { ... } }
          if (data?.success && data.user) {
            const u = data.user;
            setUser({ name: u.name ?? null, role: u.role });
            setUserRole(u.role);
            setPermissions(Array.isArray(u.permissions) ? u.permissions : []);
            // normalize organizations from API: { organizationId, role } -> client shape
            const orgs = Array.isArray(u.organizations)
              ? u.organizations.map((o: any) => ({ organizationId: o.organizationId, role: o.role, name: o.name || undefined }))
              : [];
            setOrganizations(orgs);
            if (orgs.length > 0) {
              setActiveOrg({ id: orgs[0].organizationId, name: orgs[0].name || '', role: orgs[0].role });
            } else {
              setActiveOrg(null);
            }
          } else {
            // treat as unauthenticated
            // fallback to cookie hydration below
          }
        } else {
          // Fallback: hydrate from client-visible cookies (role/name) for UX in dev
          const savedRole = Cookies.get(COOKIE_NAMES.USER_ROLE) as SystemRole | undefined;
          const savedName = Cookies.get(COOKIE_NAMES.USER_NAME);
          const savedLocation = Cookies.get(COOKIE_NAMES.USER_ZONE);
          const savedPerms = Cookies.get(COOKIE_NAMES.USER_PERMISSIONS);
          const savedOrg = Cookies.get(COOKIE_NAMES.USER_ORG);

          if (savedRole) {
            setUser({ name: savedName, role: savedRole });
            setUserRole(savedRole);
            if (savedLocation && savedLocation !== 'undefined') {
              try { setUserLocation(JSON.parse(savedLocation)); } catch (e) { setUserLocation(null); }
            }
            if (savedPerms) { try { setPermissions(JSON.parse(savedPerms)); } catch { setPermissions([]); } }
            if (savedOrg) { try { setActiveOrg(JSON.parse(savedOrg)); } catch { setActiveOrg(null); } }
          }
        }
      } catch (e) {
        console.error('Failed to fetch /api/me:', e);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();
  }, []);

  // Fonction utilitaire pour sauvegarder la session dans les cookies
  const saveSession = (userData: any) => {
    // session-token est géré côté serveur (httpOnly JWT) — on ne le touche JAMAIS côté client
    Cookies.set(COOKIE_NAMES.USER_ROLE, userData.role, { expires: 7 });
    Cookies.set(COOKIE_NAMES.USER_NAME, userData.name || '', { expires: 7 });
    
    const location = userData.location || null;
    if (location) {
      Cookies.set(COOKIE_NAMES.USER_ZONE, JSON.stringify(location), { expires: 7 });
    } else {
      Cookies.remove(COOKIE_NAMES.USER_ZONE);
    }

    // Permissions & Org are set server-side via httpOnly-adjacent cookies.
    // We read them here to hydrate React state immediately.
    const permsRaw = Cookies.get(COOKIE_NAMES.USER_PERMISSIONS);
    if (permsRaw) {
      try { setPermissions(JSON.parse(permsRaw)); } catch { setPermissions([]); }
    }
    const orgRaw = Cookies.get(COOKIE_NAMES.USER_ORG);
    if (orgRaw) {
      try { setActiveOrg(JSON.parse(orgRaw)); } catch { setActiveOrg(null); }
    }

    setUser(userData);
    setUserRole(userData.role);
    setUserLocation(location);
    if (userData.organizations && Array.isArray(userData.organizations)) {
      const orgs = userData.organizations.map((o: any) => ({ organizationId: o.organizationId, role: o.role, name: o.name || undefined }));
      setOrganizations(orgs);
      if (orgs.length > 0) setActiveOrg({ id: orgs[0].organizationId, name: orgs[0].name || '', role: orgs[0].role });
    }
  };

  const login = async (email: string, password: string) => {
    setIsActionLoading(true);
    setError(null);
    try {
      const result = await loginUser({ email, password });
      
      if (result.success && result.user) {
        const userData = result.user as any;
        saveSession(userData);

        // Redirection basée sur le rôle après login
        // Use full navigation to ensure server-set httpOnly cookies are sent on next request
        if (typeof window !== 'undefined') {
          if (userData.role === 'ADMIN' || userData.role === 'SUPERADMIN') window.location.href = '/admin';
          else window.location.href = '/dashboard';
        } else {
          if (userData.role === 'ADMIN' || userData.role === 'SUPERADMIN') router.push('/admin');
          else router.push('/dashboard');
        }
        
        return result;
      } else {
        setError(result.error || "Identifiants incorrects");
        return result;
      }
    } catch (err) { 
      setError("Erreur de connexion"); 
      return { success: false, error: "Erreur de connexion" };
    } finally { 
      setIsActionLoading(false); 
    }
  };

  const register = async (data: { email: string; password: string; role: SystemRole; name: string; adminSecret?: string; locationId?: string }) => {
    setIsActionLoading(true);
    setError(null);
    try {
      const result = await registerUser(data);
      if (result.success && result.user) {
        const userData = result.user as any;
        saveSession(userData);

        // If registration created a pending organization, send user to dashboard
        // so they can select the organization from the dashboard UI.
        if (result.pendingOrgCreated) {
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard';
          } else {
            router.push('/dashboard');
          }
          return result;
        }

        if (typeof window !== 'undefined') {
          if (userData.role === 'ADMIN' || userData.role === 'SUPERADMIN') window.location.href = '/admin';
          else window.location.href = '/dashboard';
        } else {
          if (userData.role === 'ADMIN' || userData.role === 'SUPERADMIN') router.push('/admin');
          else router.push('/dashboard');
        }

        return result;
      } else {
        setError(result.error || "Erreur lors de l'inscription");
        return result;
      }
    } catch (err) { 
      setError("Erreur technique lors de l'inscription"); 
      return { success: false, error: "Erreur technique" };
    } finally { 
      setIsActionLoading(false); 
    }
  };

  const logout = async () => {
    // 1. Suppression des cookies httpOnly côté serveur
    try { await logoutUser(); } catch (e) { console.error('Erreur logout serveur:', e); }
    
    // 2. Nettoyage des cookies accessibles côté client
    Cookies.remove(COOKIE_NAMES.USER_ROLE);
    Cookies.remove(COOKIE_NAMES.USER_NAME);
    Cookies.remove(COOKIE_NAMES.USER_ZONE);
    Cookies.remove(COOKIE_NAMES.USER_PERMISSIONS);
    Cookies.remove(COOKIE_NAMES.USER_ORG);
    
    // 3. Nettoyage de l'état React
    setUser(null);
    setUserRole(undefined);
    setUserLocation(null);
    setPermissions([]);
    setActiveOrg(null);
    
    // 4. Redirection forcée avec reload complet pour purger tout le cache
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      userLocation, 
      permissions,
      activeOrg,
      organizations,
      isAuthenticated: !!user && !!userRole, 
      isLoading, 
      isActionLoading, 
      error, 
      login, 
      register, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};