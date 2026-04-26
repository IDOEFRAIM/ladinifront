"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function AuctionCard({ auction }: { auction: any }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-2xl p-6 border border-emerald-900/5 shadow-sm"
    >
      <h3 className="text-lg font-bold text-[#064E3B]">{auction.subCategoryName || 'Produit'}</h3>
      <p className="text-slate-500 my-2">
        {auction.quantity} {auction.unit} • {auction.maxPricePerUnit} FCFA
      </p>
      
      <Countdown deadline={auction.deadline} />
      
      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-slate-400">{auction.bidsCount} offre(s)</span>
        <Link 
          href={`/auction/${auction.id}`} 
          className="bg-[#064E3B] text-white px-4 py-2 rounded-xl font-bold text-sm"
        >
          Voir l'enchère
        </Link>
      </div>
    </motion.div>
  );
}

// Le timer reste ici car il a besoin du cycle de vie client
function Countdown({ deadline }: { deadline: string | Date }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const d = new Date(deadline);
  const diff = Math.max(0, d.getTime() - now.getTime());

  if (diff === 0) return <div className="text-red-500 font-bold">Terminée</div>;

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div className="font-bold text-emerald-700">
      {days}j {hours}h {minutes}m {seconds}s restants
    </div>
  );
}