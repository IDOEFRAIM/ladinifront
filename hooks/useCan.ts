'use client';

import { useMemo } from 'react';
import Cookies from 'js-cookie';
import { COOKIE_NAMES } from '@/lib/cookie-helpers';

/**
 * useCan — Hook RBAC côté client.
 * Lit le cookie « user-permissions » (JSON string[]) posé au login par auth.service.
 *
 * Exemples :
 *   const canEdit = useCan('STOCK_EDIT');
 *   const canManage = useCanAll(['STOCK_EDIT', 'STOCK_DELETE']);
 *   const canView = useCanAny(['STOCK_VIEW', 'PRODUCT_VIEW']);
 */

function readPermissions(): string[] {
  const raw = Cookies.get(COOKIE_NAMES.USER_PERMISSIONS);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

/** Vérifie une seule permission */
export function useCan(permission: string): boolean {
  const perms = useMemo(readPermissions, []);
  const role = Cookies.get(COOKIE_NAMES.USER_ROLE);
  if (role === 'ADMIN' || role === 'SUPERADMIN') return true;
  return perms.includes(permission);
}

/** Toutes les permissions requises */
export function useCanAll(permissions: string[]): boolean {
  const perms = useMemo(readPermissions, []);
  const role = Cookies.get(COOKIE_NAMES.USER_ROLE);
  if (role === 'ADMIN' || role === 'SUPERADMIN') return true;
  return permissions.every(p => perms.includes(p));
}

/** Au moins une des permissions */
export function useCanAny(permissions: string[]): boolean {
  const perms = useMemo(readPermissions, []);
  const role = Cookies.get(COOKIE_NAMES.USER_ROLE);
  if (role === 'ADMIN' || role === 'SUPERADMIN') return true;
  return permissions.some(p => perms.includes(p));
}

/** Retourne la liste brute des permissions */
export function usePermissions(): string[] {
  return useMemo(readPermissions, []);
}

/** Retourne les infos de l'organisation active (cookie user-org) */
export function useActiveOrg(): { id: string; name: string; role: string } | null {
  return useMemo(() => {
    const raw = Cookies.get(COOKIE_NAMES.USER_ORG);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  }, []);
}
