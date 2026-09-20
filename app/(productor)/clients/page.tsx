import type React from 'react';
import ClientsClient from '@/features/clients/components/ClientsClient';
import { listClients } from '@/features/clients/services/clients.service';
import { createClient } from '@/features/clients/actions/client.actions';
import { requireProducer } from '@/lib/api-guard';
import { RestrictedScreen } from '@/features/production/components/tokens';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const { user, error } = await requireProducer();
  if (error || !user) return <RestrictedScreen />;

  let clients: React.ComponentProps<typeof ClientsClient>['initialClients'] = [];
  try {
    const rows = user.producerId ? await listClients(user.producerId) : [];
    clients = rows.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      email: c.email ?? '',
      location: c.location ?? '',
      totalOrders: c.totalOrders,
      totalSpent: c.totalSpent,
      lastOrderDate: c.lastOrderDate ? c.lastOrderDate.toISOString() : '',
    }));
  } catch {
    clients = []; // repli : liste vide
  }

  // Action inline exposée au navigateur : elle délègue à l'action gardée (session + profil producteur).
  async function serverCreateClient(data: Parameters<typeof createClient>[0]) {
    'use server';
    const res = await createClient(data);
    return res.success ? res.data : null;
  }

  return <ClientsClient initialClients={clients} serverCreateClient={serverCreateClient} />;
}
