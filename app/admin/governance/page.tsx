"use client";

import React, { useState } from 'react';
import CategoryManager from '@/components/admin/governance/CategoryManager';
import StandardPriceManager from '@/components/admin/governance/StandardPriceManager';
import ZoneProvider from '@/context/ZoneContext';
import { Tags, DollarSign, ShieldBan } from 'lucide-react';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255,255,255,0.72)', border: 'rgba(6,78,59,0.07)', muted: '#64748B', text: '#1F2937',
};

const TABS = [
  { key: 'categories', label: 'Catégories & Sous-catégories', icon: Tags },
  { key: 'prices', label: 'Prix Standards (Indice DRDR)', icon: DollarSign },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function GovernancePage() {
  const [activeTab, setActiveTab] = useState<TabKey>('categories');

  return (
    <ZoneProvider>
      <div style={{ minHeight: '60vh' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: C.forest, fontFamily: "'Space Grotesk', sans-serif" }}>
            Gouvernance — Direction Régionale
          </h1>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>
            Gérez les catégories de produits, sous-catégories, prix standards et verrouillages par zone.
          </p>
        </div>

        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20, background: C.glass,
          borderRadius: 14, padding: 4, border: `1px solid ${C.border}`, width: 'fit-content',
        }}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
                fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: active ? 700 : 500,
                background: active ? C.forest : 'transparent',
                color: active ? '#fff' : C.muted,
                transition: 'all 0.2s',
              }}>
                <tab.icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'categories' && <CategoryManager />}
        {activeTab === 'prices' && <StandardPriceManager />}
      </div>
    </ZoneProvider>
  );
}
