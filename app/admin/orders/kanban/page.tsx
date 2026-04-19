"use client";

import React from 'react';
import KanbanBoard from '@/components/admin/orders/KanbanBoard';
import ZoneManagers from '@/components/admin/zones/ZoneManagers';
import ZoneProvider from '@/context/ZoneContext';

export default function OrdersKanbanPage() {
  return (
    <ZoneProvider>
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>Kanban - Commandes</h1>
        <ZoneManagers />
        <div style={{ height: 18 }} />
        <KanbanBoard />
      </div>
    </ZoneProvider>
  );
}
