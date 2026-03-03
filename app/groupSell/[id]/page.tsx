'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, FaPhone, FaMapMarkerAlt, FaShieldAlt, 
  FaUserFriends, FaCheck, FaInfoCircle, FaPlay, FaPause 
} from 'react-icons/fa';

// --- DONNÉES SIMULÉES (MOCK) ---
// En vrai, tu récupèreras ça via : const deal = await Repository.getDealById(params.id);
const MOCK_DETAIL = {
  id: '1',
  title: 'Engrais NPK 15-15-15 (Sac 50kg)',
  description: "C'est la saison qui commence ! On se met ensemble pour faire venir un camion de 10 tonnes directement de l'usine. Ça nous évite les intermédiaires du marché central.",
  images: [
    'https://images.unsplash.com/photo-1622289694738-4e8979e2c65f?auto=format&fit=crop&w=500&q=60',
    'https://images.unsplash.com/photo-1589923188900-85dae5233271?auto=format&fit=crop&w=500&q=60'
  ],
  price: {
    individual: 25000,
    group: 21500,
    saving: 3500
  },
  organizer: {
    name: 'Moussa Koné',
    phone: '+226 70 12 34 56',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    reputation: 'Très fiable (15 deals réussis)'
  },
  logistics: {
    location: 'Magasin Central, Quartier Patte d\'Oie',
    date: 'Mardi 24 Octobre',
    payment: 'Cash à la livraison ou Orange Money'
  },
  participants: [
    { name: 'Fatou O.', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { name: 'Jean K.', avatar: 'https://randomuser.me/api/portraits/men/22.jpg' },
    { name: 'Seydou B.', avatar: 'https://randomuser.me/api/portraits/men/85.jpg' },
    { name: 'Awa T.', avatar: 'https://randomuser.me/api/portraits/women/12.jpg' },
    { name: 'Paul S.', avatar: 'https://randomuser.me/api/portraits/men/11.jpg' },
  ],
  totalParticipants: 42,
  targetParticipants: 50
};

export default function GroupDealDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Simulation : l'utilisateur a-t-il déjà rejoint ?
  const [hasJoined, setHasJoined] = useState(false);

  const percentage = Math.round((MOCK_DETAIL.totalParticipants / MOCK_DETAIL.targetParticipants) * 100);

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      
      {/* 1. NAV BAR TRANSPARENTE */}
      <div className="absolute top-0 left-0 right-0 p-4 z-10 flex justify-between items-center">
        <button 
          onClick={() => router.back()} 
          className="bg-white/90 p-3 rounded-full shadow-md text-gray-800 backdrop-blur-sm"
        >
          <FaArrowLeft />
        </button>
        <div className="bg-white/90 px-3 py-1 rounded-full shadow-md text-xs font-bold text-green-700 backdrop-blur-sm">
          Économie : {MOCK_DETAIL.price.saving} F
        </div>
      </div>

      {/* 2. IMAGE HÉROS */}
      <div className="h-72 w-full bg-gray-200 relative">
        <img 
          src={MOCK_DETAIL.images[0]} 
          alt={MOCK_DETAIL.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-5 pt-20">
            <h1 className="text-white text-2xl font-bold leading-tight">{MOCK_DETAIL.title}</h1>
        </div>
      </div>

      <div className="p-5 -mt-6 bg-gray-50 rounded-t-3xl relative z-0">
        
        {/* 3. PRIX ET AUDIO */}
        <div className="flex justify-between items-end mb-6 border-b border-gray-200 pb-6">
            <div>
                <p className="text-gray-500 text-sm line-through">Prix marché : {MOCK_DETAIL.price.individual} F</p>
                <p className="text-3xl font-black text-green-700">{MOCK_DETAIL.price.group} FCFA</p>
                <p className="text-xs text-gray-500">par unité (si on atteint l'objectif)</p>
            </div>
            <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="bg-green-100 text-green-800 p-4 rounded-full active:scale-95 transition-transform"
            >
                {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
        </div>

        {/* 4. ORGANISATEUR (Confiance) */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-3">Organisé par</h3>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <img src={MOCK_DETAIL.organizer.avatar} className="w-12 h-12 rounded-full border-2 border-green-500" />
                    <div>
                        <p className="font-bold text-gray-800">{MOCK_DETAIL.organizer.name}</p>
                        <p className="text-xs text-green-600 flex items-center gap-1">
                            <FaShieldAlt /> {MOCK_DETAIL.organizer.reputation}
                        </p>
                    </div>
                </div>
                {/* Bouton Appel : Très important en Afrique */}
                <a href={`tel:${MOCK_DETAIL.organizer.phone}`} className="bg-green-50 p-3 rounded-full text-green-700 border border-green-200">
                    <FaPhone />
                </a>
            </div>
            
            {/* Message Audio / Description */}
            <div className="mt-4 bg-gray-50 p-3 rounded-lg text-sm text-gray-600 italic border-l-4 border-green-500">
                "{MOCK_DETAIL.description}"
            </div>
        </div>

        {/* 5. PARTICIPANTS (Preuve Sociale) */}
        <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800">Participants ({MOCK_DETAIL.totalParticipants}/{MOCK_DETAIL.targetParticipants})</h3>
                <span className="text-green-600 text-sm font-bold">{percentage}%</span>
            </div>
            
            {/* Barre de progression */}
            <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div className="bg-green-600 h-full rounded-full" style={{ width: `${percentage}%` }}></div>
            </div>

            {/* Avatars */}
            <div className="flex flex-wrap gap-2">
                {MOCK_DETAIL.participants.map((p, idx) => (
                    <div key={idx} className="flex flex-col items-center w-14">
                        <img src={p.avatar} className="w-10 h-10 rounded-full border border-white shadow-sm mb-1" />
                        <span className="text-[10px] text-gray-500 truncate w-full text-center">{p.name}</span>
                    </div>
                ))}
                {/* Pastille "+37 autres" */}
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 border border-white shadow-sm">
                    +{MOCK_DETAIL.totalParticipants - MOCK_DETAIL.participants.length}
                </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">
                ⚠️ Les numéros des participants sont masqués pour leur sécurité. Seul l'organisateur a la liste complète.
            </p>
        </div>

        {/* 6. CLAUSES ET LOGISTIQUE (Info Pratique) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gray-100 p-3 font-bold text-gray-700 flex items-center gap-2">
                <FaInfoCircle /> Comment ça marche ?
            </div>
            <div className="p-4 space-y-4">
                <div className="flex gap-3">
                    <div className="mt-1 text-green-600"><FaMapMarkerAlt /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Lieu de retrait</p>
                        <p className="text-sm text-gray-800">{MOCK_DETAIL.logistics.location}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="mt-1 text-green-600"><FaCheck /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Paiement</p>
                        <p className="text-sm text-gray-800">{MOCK_DETAIL.logistics.payment}</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <div className="mt-1 text-orange-500"><FaUserFriends /></div>
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase">Si l'objectif n'est pas atteint ?</p>
                        <p className="text-sm text-gray-800">
                            La commande est reportée à la semaine suivante ou annulée (aucun frais ne sera débité).
                        </p>
                    </div>
                </div>
            </div>
        </div>

      </div>

      {/* 7. FOOTER FIXE (CTA) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg flex items-center justify-between gap-4">
        <div className="flex flex-col">
            <span className="text-xs text-gray-500">Total à payer</span>
            <span className="font-bold text-xl text-green-700">{MOCK_DETAIL.price.group.toLocaleString()} F</span>
        </div>
        
        <button 
            onClick={() => setHasJoined(!hasJoined)}
            className={`flex-1 py-3 px-6 rounded-xl font-bold shadow-md transition-all ${
                hasJoined 
                ? 'bg-gray-100 text-gray-500 border border-gray-300' 
                : 'bg-green-700 text-white hover:bg-green-800'
            }`}
        >
            {hasJoined ? 'Annuler ma place' : 'Je rejoins le groupe'}
        </button>
      </div>

    </div>
  );
}