'use client';

import React from 'react';
import { Loader2, Sprout, ShoppingBag } from 'lucide-react';
import { usePreorders } from '@/features/orders/components/preorders/usePreorders';
import { TabButton, EmptyState } from '@/features/orders/components/preorders/preorder-ui';
import ProductionOfferCard from '@/features/orders/components/preorders/ProductionOfferCard';
import PreorderRow from '@/features/orders/components/preorders/PreorderRow';

export default function BuyerPreordersPage() {
  const {
    tab, setTab, productions, preorders, loading, activeId, setActiveId, qty, setQty, submitting,
    submitPreorder, openUpdate, setCancelOrderId,
  } = usePreorders();

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-2xl font-extrabold text-emerald-900 tracking-tight">Précommandes</h1>
        <p className="text-sm text-slate-500">Réservez les récoltes à venir au meilleur prix</p>
      </header>

      <div className="flex gap-2 mb-5">
        <TabButton active={tab === 'browse'} onClick={() => setTab('browse')} label="Productions futures" />
        <TabButton active={tab === 'mine'} onClick={() => setTab('mine')} label={`Mes précommandes${preorders.length ? ` (${preorders.length})` : ''}`} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 text-emerald-600 animate-spin" />
        </div>
      ) : tab === 'browse' ? (
        productions.length === 0 ? (
          <EmptyState icon={<Sprout className="w-9 h-9" />} text="Aucune production future disponible pour le moment." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {productions.map((p) => (
              <ProductionOfferCard
                key={p.id}
                production={p}
                isOpen={activeId === p.id}
                qty={qty}
                onQtyChange={setQty}
                submitting={submitting}
                onOpen={() => { setActiveId(p.id); setQty(''); }}
                onSubmit={() => submitPreorder(p.id)}
              />
            ))}
          </div>
        )
      ) : preorders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="w-9 h-9" />} text="Vous n'avez pas encore de précommande." />
      ) : (
        <div className="grid gap-3">
          {preorders.map((o) => (
            <PreorderRow key={o.id} order={o} onAdjust={() => openUpdate(o)} onCancel={() => setCancelOrderId(o.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
