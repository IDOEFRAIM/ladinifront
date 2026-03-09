import React from 'react';
import AdminDashboardClient from './AdminDashboardClient';
import { fetchAdminMetrics } from '@/app/actions/admin.server';

export default async function AdminDashboardPage() {
  const initial = await fetchAdminMetrics();

  async function serverRefresh() {
    'use server'
    return await fetchAdminMetrics();
  }

  return <AdminDashboardClient initialData={initial} serverRefresh={serverRefresh} />;
}
