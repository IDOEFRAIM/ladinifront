  'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2, Sprout, CalendarClock, PackageCheck, ShoppingBag, Minus, Plus, Trash2 } from 'lucide-react';
import { getPublicFutureProductionsAction } from '@/app/actions/production.server';
import { createPreorderAction, getBuyerPreordersAction, updatePreorderAction, cancelPreorderAction } from '@/app/actions/preorders.server';
import type { PublicProduction } from '@/services/production.service';
import type { BuyerPreorder } from '@/services/preorder.service';

type Tab = 'browse' | 'mine';

export default function BuyerPreordersPage() {
  const [tab, setTab] = useState<Tab>('browse');
  const [productions, setProductions] = useState<PublicProduction[]>([]);
  const [preorders, setPreorders] = useState<BuyerPreorder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [qty, setQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [updateQty, setUpdateQty] = useState('');
  const [cancelOrderId, setCancelOrderId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, mineRes] = await Promise.all([
        getPublicFutureProductionsAction(),
        getBuyerPreordersAction(),
      ]);
      if (prodRes.success) setProductions(prodRes.data);
      if (mineRes.success) setPreorders(mineRes.data);
      else if (!mineRes.success) toast.error(mineRes.error);
    } catch {
      toast.error('Chargement impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submitPreorder = async (marketOfferId: string) => {
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) return toast.error('Quantité invalide');
    setSubmitting(true);
    try {
      const res = await createPreorderAction({ marketOfferId, quantity });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Précommande enregistrée');
      setActiveId(null);
      setQty('');
      await load();
      setTab('mine');
    } finally {
      setSubmitting(false);
    }
  };

  const openUpdate = (order: BuyerPreorder) => {
    setUpdatingOrderId(order.id);
    setUpdateQty(String(order.quantity));
  };

  const handleUpdatePreorder = async () => {
    if (!updatingOrderId) return;
    const quantity = Number(updateQty);
    if (!quantity || quantity <= 0) return toast.error('Quantité invalide');
    setSubmitting(true);
    try {
      const res = await updatePreorderAction({ orderId: updatingOrderId, quantity });
      if (!res.success) return toast.error(mapError(res.error));
      toast.success('Réservation mise à jour');
      setUpdatingOrderId(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelPreorder = async () => {
    if (!cancelOrderId) return;
    setSubmitting(true);
    try {
      const res = await cancelPreorderAction({ orderId: cancelOrderId });
      if (!res.success) return toast.error(mapError(res.error));
      toast.success('Précommande annulée');
      setCancelOrderId(null);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  const mapError = (code?: string | null) => {
    switch (code) {
      case 'ORDER_LOCKED':
        return 'La précommande est déjà confirmée.';
      case 'MODIFICATION_WINDOW_CLOSED':
        return 'Impossible de modifier sous 30 jours avant la disponibilité.';
      case 'INSUFFICIENT_FUTURE_QUANTITY':
        return 'Quantité indisponible.';
      default:
        return code || 'Erreur inattendue';
    }
  };

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
            {productions.map((p) => {
              const remaining = p.availableQuantity - p.reservedQuantity;
              const isOpen = activeId === p.id;
              return (
                <div key={p.id} className="bg-white rounded-2xl border border-emerald-900/5 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-slate-800">{p.productLabel}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{p.producer?.businessName ?? p.farm.name}</p>
                    </div>
                    {p.pricePerUnit !== null && (
                      <span className="text-sm font-extrabold text-emerald-700 whitespace-nowrap">
                        {p.pricePerUnit.toLocaleString()} <span className="text-[10px] font-medium text-slate-400">XOF/{p.unit}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <PackageCheck className="w-3.5 h-3.5 text-emerald-600" /> {remaining} {p.unit} dispo.
                    </span>
                    {p.estimatedAvailableAt && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                        {new Date(p.estimatedAvailableAt).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </div>

                  {isOpen ? (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={qty}
                        onChange={(e) => setQty(e.target.value)}
                        placeholder={`Quantité (${p.unit})`}
                        className="flex-1 min-w-0 px-3 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400"
                      />
                      <button
                        onClick={() => submitPreorder(p.id)}
                        disabled={submitting}
                        className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-60"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBag className="w-4 h-4" />}
                        Réserver
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setActiveId(p.id); setQty(''); }}
                      disabled={remaining <= 0 || p.pricePerUnit === null}
                      className="mt-3 w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm font-bold disabled:opacity-50"
                    >
                      {remaining <= 0 ? 'Complet' : 'Précommander'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )
      ) : preorders.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="w-9 h-9" />} text="Vous n'avez pas encore de précommande." />
      ) : (
        <div className="grid gap-3">
          {preorders.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-emerald-900/5 p-4 shadow-sm flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800">{o.marketOffer?.productLabel ?? 'Production'}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {o.marketOffer?.estimatedAvailableAt
                    ? `Disponible le ${new Date(o.marketOffer.estimatedAvailableAt).toLocaleDateString('fr-FR')}`
                    : 'Date à confirmer'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{o.quantity} {o.marketOffer ? 'unités' : ''} à {o.unitPrice.toLocaleString()} XOF</p>
                <div className="flex gap-2 mt-2 text-xs">
                  <button
                    onClick={() => openUpdate(o)}
                    disabled={Boolean(o.preorderConvertedAt)}
                    className="px-3 py-1 rounded-full border border-emerald-200 text-emerald-700 disabled:opacity-50"
                  >
                    Ajuster
                  </button>
                  <button
                    onClick={() => setCancelOrderId(o.id)}
                    disabled={Boolean(o.preorderConvertedAt)}
                    className="px-3 py-1 rounded-full border border-red-200 text-red-600 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Trash2 size={14} /> Annuler
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-emerald-700">
                  {o.totalAmount.toLocaleString()} <span className="text-[10px] text-slate-400">{o.currency}</span>
                </p>
                <StatusBadge status={o.status} converted={Boolean(o.preorderConvertedAt)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${
        active ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700'
      }`}
    >
      {label}
    </button>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="bg-white rounded-2xl border border-emerald-900/5 p-10 text-center">
      <div className="text-slate-300 flex justify-center mb-3">{icon}</div>
      <p className="text-sm text-slate-500">{text}</p>
    </div>
  );
}

function StatusBadge({ status, converted }: { status: string; converted: boolean }) {
  const label = converted ? 'Confirmée' : status === 'PREORDER' ? 'En attente' : status;
  const cls = converted ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
  return <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${cls}`}>{label}</span>;
}
