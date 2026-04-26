"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Box, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Tag, 
  Scale, 
  Loader2, 
  ArrowRight,
  ChevronLeft 
} from "lucide-react";
import { motion } from "framer-motion";

// Design tokens alignés sur le style AgriConnect
const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  sand: '#F9FBF8',
  border: 'rgba(6,78,59,0.08)',
};

export default function NewAuctionClient({ serverCreateAuction, subCategories = [], zones = [] }: { serverCreateAuction?: (payload: any) => Promise<any>, subCategories?: any[], zones?: any[] }) {
  const router = useRouter();
  const [form, setForm] = useState({
    subCategoryId: "",
    quantity: "",
    unit: "KG",
    maxPricePerUnit: "",
    deadline: "",
    targetZoneId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
    if (e.target.name === 'deadline') validateDate((e.target as HTMLInputElement).value);
  }

  function validateDate(value: string) {
    setError('');
    if (!value) return true;
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      setError('Date invalide');
      return false;
    }
    if (d <= new Date()) {
      setError('La date doit être dans le futur');
      return false;
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = {
        subCategoryId: form.subCategoryId,
        quantity: Number(form.quantity),
        unit: form.unit,
        maxPricePerUnit: Number(form.maxPricePerUnit),
        deadline: new Date(form.deadline).toISOString(),
        targetZoneId: form.targetZoneId || undefined,
      };

      const res = typeof serverCreateAuction === 'function' 
        ? await serverCreateAuction(payload)
        : await fetch("/api/auctions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).then(r => r.json());

      if (res.success || res.ok) {
        router.push(`/auction/${res.data?.id || res.id}`);
      } else {
        setError(res.error || "Erreur lors de la création");
      }
    } catch (err) {
      setError("Erreur réseau ou date invalide");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: C.sand }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        {/* Retour & Header */}
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors mb-6 text-sm font-medium"
        >
          <ChevronLeft size={16} /> Retour
        </button>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-stone-900 tracking-tight italic" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            Créer une <span className="text-emerald-600">nouvelle enchère</span>
          </h1>
          <p className="text-stone-500 mt-2">Définissez vos besoins pour recevoir les meilleures offres des producteurs.</p>
        </div>

        {/* Formulaire Card */}
        <div className="bg-white rounded-[2.5rem] border border-stone-200 shadow-xl shadow-emerald-900/5 p-8 md:p-10 relative overflow-hidden">
          
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded-r-xl"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={onSubmit} className="space-y-6">
            
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

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-5 rounded-2xl text-white font-bold text-lg shadow-lg shadow-emerald-700/20 hover:shadow-emerald-700/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100"
                style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    Lancer l'enchère <ArrowRight size={20} />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </motion.div>
    </div>
  );
}