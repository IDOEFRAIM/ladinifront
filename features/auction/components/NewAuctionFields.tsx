'use client';

import type { ChangeEvent } from 'react';
import { Box, Calendar, DollarSign, MapPin, Tag, Scale } from 'lucide-react';

export interface NewAuctionFormState {
  subCategoryId: string;
  quantity: string;
  unit: string;
  maxPricePerUnit: string;
  deadline: string;
  incoterm: string;
  deliveryLocation: string;
  deliveryDeadline: string;
  targetZoneId: string;
}

interface Props {
  form: NewAuctionFormState;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  subCategories: unknown[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  zones: unknown[];
}

export default function NewAuctionFields({ form, onChange, subCategories, zones }: Props) {
  return (
    <>
      {/* Catégorie */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
          <Tag size={14} className="text-emerald-500" /> Produit (ID Sous-Catégorie)
        </label>
        <select
          name="subCategoryId"
          value={form.subCategoryId}
          onChange={onChange}
          required
          className="w-full px-5 py-4 rounded-2xl border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
        >
          <option value="">Sélectionner un produit...</option>
          {subCategories.map((s: any) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* Quantité & Unité */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
            <Scale size={14} className="text-emerald-500" /> Quantité désirée
          </label>
          <div className="relative">
            <input
              name="quantity"
              type="number"
              value={form.quantity}
              onChange={onChange}
              min={1}
              required
              className="w-full px-5 py-4 rounded-2xl border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
            Unité
          </label>
          <select 
            name="unit" 
            value={form.unit} 
            onChange={onChange}
            className="w-full px-5 py-4 rounded-2xl border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none"
          >
            <option value="KG">Kilogrammes (kg)</option>
            <option value="TONNE">Tonnes (t)</option>
            <option value="LITRE">Litres (l)</option>
            <option value="BAG">Sacs (bag)</option>
          </select>
        </div>
      </div>

      {/* Prix Max */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
          <DollarSign size={14} className="text-emerald-500" /> Prix plafond par unité (FCFA)
        </label>
        <input
          name="maxPricePerUnit"
          type="number"
          value={form.maxPricePerUnit}
          onChange={onChange}
          min={25}
          required
          className="w-full px-5 py-4 rounded-2xl border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-mono font-bold text-emerald-700"
          placeholder="Ex: 500"
        />
      </div>

      {/* Date Limite */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
          <Calendar size={14} className="text-emerald-500" /> Fin de l'enchère
        </label>
        <input
          name="deadline"
          type="datetime-local"
          value={form.deadline}
          onChange={onChange}
          required
          className="w-full px-5 py-4 rounded-2xl border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      {/* Logistique */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
            <Box size={14} className="text-emerald-500" /> Incoterm
          </label>
          <select
            name="incoterm"
            value={form.incoterm}
            onChange={onChange}
            className="w-full px-5 py-4 rounded-2xl border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all appearance-none"
          >
            <option value="DDP">DDP (livré chez l'acheteur)</option>
            <option value="EXW">EXW (à récupérer à la ferme)</option>
            <option value="FCA">FCA (remis au transporteur)</option>
            <option value="CPT">CPT (transport payé)</option>
            <option value="CIP">CIP (transport + assurance)</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
            <Calendar size={14} className="text-emerald-500" /> Date limite de livraison
          </label>
          <input
            name="deliveryDeadline"
            type="datetime-local"
            value={form.deliveryDeadline}
            onChange={onChange}
            required
            className="w-full px-5 py-4 rounded-2xl border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
          <MapPin size={14} className="text-emerald-500" /> Lieu de livraison / retrait
        </label>
        <input
          name="deliveryLocation"
          type="text"
          value={form.deliveryLocation}
          onChange={onChange}
          required
          className="w-full px-5 py-4 rounded-2xl border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all"
          placeholder="Ex: Entrepôt SIAO, Ouagadougou / Ferme de Koubri"
        />
      </div>

      {/* Zone Cible */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs font-bold text-stone-500 uppercase tracking-wider ml-1">
          <MapPin size={14} className="text-emerald-500" /> Zone géographique (Optionnel)
        </label>
        {/* Simple select for zones */}
        <select
          name="targetZoneId"
          value={form.targetZoneId}
          onChange={onChange}
          className="mt-2 w-full px-4 py-3 rounded-lg border"
        >
          <option value="">Aucune (toutes zones)</option>
          {zones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
      </div>

    </>
  );
}
