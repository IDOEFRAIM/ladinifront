"use client";

import React, { useEffect, useState } from 'react';
import OrderCard from './OrderCard';

const STATUS_COLUMNS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function KanbanBoard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: call server API to fetch orders with zone/org filter
    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/orders');
        const j = await res.json();
        setOrders(j || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const byStatus = (status: string) => orders.filter(o => (o.status || '').toUpperCase() === status);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
      {STATUS_COLUMNS.map(col => (
        <div key={col} style={{ background: '#fff', borderRadius: 12, padding: 12, flex: 1, minHeight: 200, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{col} ({byStatus(col).length})</h3>
          {loading ? <p>Chargement...</p> : byStatus(col).map(o => <OrderCard key={o.id} order={o} />)}
        </div>
      ))}
    </div>
  );
}
