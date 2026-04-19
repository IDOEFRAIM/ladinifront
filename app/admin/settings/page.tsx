import React from 'react';
import AdminSettingsClient from '@/app/admin/AdminSettingsClient';
import { getAdminUser, updateUserRole } from '@/app/actions/admin.server';
import { cookies } from 'next/headers';
import { getSessionFromRequest } from '@/lib/session';

export default async function AdminSettingsPage() {
  let userId: string | undefined = undefined;
  try {
    const cookieStore = await cookies();
    const session = await getSessionFromRequest({ cookies: cookieStore } as any).catch(() => null);
    userId = session?.userId;
  } catch (e) {
    // ignore
  }

  let initialProfile: any = { id: undefined, name: '', role: '', theme: 'light' };
  try {
    if (userId) {
      const user = await getAdminUser(String(userId));
      if (user) initialProfile = { id: user.id, name: user.name || '', role: user.role || '', theme: 'light' };
    }
  } catch (e) {
    // ignore - client will fallback
  }

  async function serverUpdateRole(role: string, targetUserId?: string) {
    'use server';
    try {
      const id = targetUserId || userId || '';
      const res = await updateUserRole(id, role);
      return res ? { success: true, role: (res as any).role } : { success: true };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  }

  return <AdminSettingsClient initialProfile={initialProfile} serverUpdateRole={serverUpdateRole} />;
}

