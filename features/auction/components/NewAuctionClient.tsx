"use client";

import { Loader2, ArrowRight, ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";
import { useNewAuctionForm } from '@/features/auction/hooks/useNewAuctionForm';
import NewAuctionFields from '@/features/auction/components/NewAuctionFields';

// Design tokens alignés sur le style AgriConnect
const C = {
  forest: '#064E3B',
  emerald: '#10B981',
  sand: '#F9FBF8',
  border: 'rgba(6,78,59,0.08)',
};

type CreateAuctionFn = Parameters<typeof useNewAuctionForm>[0];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function NewAuctionClient({ serverCreateAuction, subCategories = [], zones = [] }: { serverCreateAuction?: CreateAuctionFn; subCategories?: unknown[]; zones?: unknown[] }) {
  const { router, form, onChange, loading, error, onSubmit } = useNewAuctionForm(serverCreateAuction);

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
            <NewAuctionFields form={form} onChange={onChange} subCategories={subCategories} zones={zones} />

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
