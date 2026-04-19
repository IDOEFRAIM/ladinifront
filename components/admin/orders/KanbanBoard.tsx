"use client";

import React, { useEffect, useState } from 'react';
import OrderCard from './OrderCard';
import ZoneSelector from '@/components/ui/ZoneSelector';
import { useZone } from '@/context/ZoneContext';

const STATUS_COLUMNS = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];

export default function KanbanBoard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { zoneId } = useZone();

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const url = '/api/admin/orders' + (zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : '');
        const res = await fetch(url);
        if (!res.ok) {
          const text = await res.text().catch(() => '[non-text body]');
          console.error('/api/admin/orders error', res.status, text);
          setOrders([]);
          setLoading(false);
          return;
        }
        const j = await res.json();
        // API may return either a bare array or an envelope { data: [...] }
        if (Array.isArray(j)) {
          setOrders(j);
        } else if (j && Array.isArray((j as any).data)) {
          setOrders((j as any).data);
        } else {
          console.warn('Unexpected /api/admin/orders payload, defaulting to empty array', j);
          setOrders([]);
        }
      } catch (e) {
        console.error(e);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [zoneId]);

  const safeOrders = Array.isArray(orders) ? orders : [];
  const byStatus = (status: string) => safeOrders.filter(o => (o?.status || '').toUpperCase() === status);

  // Drag handlers
  const onDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData('text/plain', orderId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDropToColumn = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain');
    if (!orderId) return;
    // optimistic update
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }) });
      if (!res.ok) throw new Error('update failed');
    } catch (err) {
      console.error('Failed to update order status', err);
      // reload with zone filter
      try {
        const r = await fetch('/api/admin/orders' + (zoneId ? `?zoneId=${encodeURIComponent(zoneId)}` : ''));
        if (r.ok) {
          const j = await r.json();
          setOrders(Array.isArray(j) ? j : (j?.data || []));
        } else {
          const t = await r.text().catch(() => '');
          console.error('Reload /api/admin/orders error', r.status, t);
          setOrders([]);
        }
      } catch (e) {
        console.error('Reload failed', e);
        setOrders([]);
      }
    }
  };

  return (
    <div style={{ width: '100%' }}>
      <ZoneSelector />
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {STATUS_COLUMNS.map(col => (
          <div key={col} onDragOver={e => e.preventDefault()} onDrop={e => onDropToColumn(e, col)} style={{ background: '#fff', borderRadius: 12, padding: 12, flex: 1, minHeight: 240, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
            <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{col} ({byStatus(col).length})</h3>
            {loading ? <p>Chargement...</p> : byStatus(col).map(o => (
              <div key={o?.id} draggable onDragStart={e => onDragStart(e, o?.id)}>
                <OrderCard order={o} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
