"use client";

import React from 'react';

export default function OrderCard({ order }: { order: any }) {
  return (
    <div style={{ background: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 8, cursor: 'grab' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <strong style={{ fontSize: 13 }}>{order.customerName || '—'}</strong>
        <span style={{ fontSize: 12, color: '#6b7280' }}>{order.totalAmount ? `${order.totalAmount} FCFA` : ''}</span>
      </div>
      <div style={{ fontSize: 12, color: '#374151' }}>{order.customerPhone || order.whatsappId || ''}</div>
      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 8 }}>{order.deliveryDesc || ''}</div>
    </div>
  );
}
