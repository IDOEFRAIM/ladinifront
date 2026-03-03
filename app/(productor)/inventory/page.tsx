'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getFarms, getStocks } from '@/services/inventory.service';
import FarmList from '@/components/productorDashboard/inventory/FarmList';
import StockBoard from '@/components/productorDashboard/inventory/StockBoard';
import { Warehouse, Loader2 } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

function LoadingUI() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={36} color={C.emerald} className="animate-spin" />
    </div>
  );
}

function MainContent({ farms, selectedFarmId, setSelectedFarmId, loadFarms, stocks, loadStocks }: {
  farms: any[]; selectedFarmId: string | null; setSelectedFarmId: (id: string | null) => void; loadFarms: () => void; stocks: any[]; loadStocks: (farmId: string) => void;
}) {
  return (
    <div style={{ height: '100vh', background: C.sand, padding: '24px', fontFamily: F.body }} className="lg:p-8 flex flex-col lg:flex-row gap-8 overflow-hidden">
      {/* Left sidebar */}
      <div className="w-full lg:w-1/3 xl:w-1/4 h-[40vh] lg:h-full" style={{ flexShrink: 0 }}>
        <FarmList farms={farms} selectedFarmId={selectedFarmId} onSelectFarm={setSelectedFarmId} onFarmCreated={loadFarms} />
      </div>

      {/* Main */}
      <div style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {selectedFarmId ? (
          <>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontFamily: F.heading, fontSize: '1.75rem', fontWeight: 900, color: C.forest, letterSpacing: '-0.02em' }}>
                {farms.find(f => f.id === selectedFarmId)?.name}
              </h1>
              <p style={{ fontSize: '0.7rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: 2 }}>Gestion des stocks & mouvements</p>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              <StockBoard farmId={selectedFarmId} stocks={stocks} onRefresh={() => loadStocks(selectedFarmId)} />
            </div>
          </>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `2px dashed ${C.border}`, borderRadius: 32, color: C.muted }}>
            <Warehouse size={56} style={{ opacity: 0.15, marginBottom: 16 }} />
            <p style={{ fontFamily: F.heading, fontSize: '1.1rem', fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 2 }}>Selectionnez une ferme</p>
            <p style={{ fontFamily: F.body, fontSize: '0.8rem', marginTop: 8 }}>ou creez-en une nouvelle pour commencer</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [farms, setFarms] = useState<any[]>([]);
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadFarms(); }, []);
  useEffect(() => { if (selectedFarmId) loadStocks(selectedFarmId); else setStocks([]); }, [selectedFarmId]);

  const loadFarms = async () => {
    const res = await getFarms();
    if (res.success && res.data) { setFarms(res.data); if (res.data.length > 0 && !selectedFarmId) setSelectedFarmId(res.data[0].id); }
    setIsLoading(false);
  };

  const loadStocks = async (farmId: string) => {
    const res = await getStocks(farmId);
    if (res.success && res.data) setStocks(res.data);
  };

  if (isLoading) return <LoadingUI />;
  return <MainContent farms={farms} selectedFarmId={selectedFarmId} setSelectedFarmId={setSelectedFarmId} loadFarms={loadFarms} stocks={stocks} loadStocks={loadStocks} />;
}
