import React from 'react';
import AdminSettingsClient from '@/app/admin/AdminSettingsClient';

export default async function AdminSettingsPage() {
  // Server-side: get current admin user and pass as initialProfile
  let userId: string | undefined = undefined;
  try {
    const sessionMod = await import('@/lib/session');
    const session = await sessionMod.getSessionFromRequest({} as any).catch(() => null);
    userId = session?.userId;
  } catch (e) {
    // ignore
  }

  let initialProfile: any = { id: undefined, name: '', role: '', theme: 'light' };
  try {
    if (userId) {
      const mod = await import('@/app/actions/admin.server');
      const user = await mod.getAdminUser(String(userId));
      if (user) initialProfile = { id: user.id, name: user.name || '', role: user.role || '', theme: 'light' };
    }
  } catch (e) {
    // ignore - client will fallback
  }

  // bind server action for role update
  let serverUpdateRole = undefined;
  try {
    const mod = await import('@/app/actions/admin.server');
    const updateUserRole = mod.updateUserRole;
    serverUpdateRole = async (role: string, targetUserId?: string) => {
      try {
        const id = targetUserId || String(userId);
        const res = await updateUserRole(id, role);
        return res || { success: true };
      } catch (err) {
        return { success: false, error: String(err) };
      }
    };
  } catch (e) {
    // ignore
  }

  return <AdminSettingsClient initialProfile={initialProfile} />;
}

