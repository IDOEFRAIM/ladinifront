"use client";

import React from 'react';

export default function OrderDetailModal({ order, onClose }: { order: any; onClose: () => void }) {
  if (!order) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', borderRadius: 12, padding: 20, width: '90%', maxWidth: 800 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Détails de la commande</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18 }}>✕</button>
        </div>
        <pre style={{ background: '#f3f4f6', padding: 12, borderRadius: 8, maxHeight: '60vh', overflow: 'auto' }}>{JSON.stringify(order, null, 2)}</pre>
      </div>
    </div>
  );
}
