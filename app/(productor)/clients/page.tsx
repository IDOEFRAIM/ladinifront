import React from 'react';
import ClientsClient from '@/components/clients/ClientsClient';

import { fetchClients as fetchClientsAction } from '@/app/actions/clients.server';
import { createClient as createClientAction } from '@/app/actions/clients.server';

export default async function ClientsPage() {
  let clients = [];
  try {
    clients = await fetchClientsAction();
  } catch (e) {
    // fallback: empty list
    clients = [];
  }

  const serverCreateClient = async (data: any) => {
    try {
      const created = await createClientAction(data);
      return created || null;
    } catch (e) {
      console.error('serverCreateClient error', e);
      return null;
    }
  };

  return <ClientsClient initialClients={clients} serverCreateClient={serverCreateClient} />;
}
