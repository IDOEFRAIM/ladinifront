"use client";

import { useState } from 'react';

export default function AgriChat() {
  const [query, setQuery] = useState('');
  const [culture, setCulture] = useState('sorgho');
  const [zone, setZone] = useState('Centre');
  const [superficie, setSuperficie] = useState('1.0');
  
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResponse('');

    try {
      // Préparation du formulaire pour FastAPI
      const formData = new URLSearchParams();
      formData.append("query", query);
      formData.append("culture", culture);
      formData.append("zone", zone);
      formData.append("superficie", superficie);

      const res = await fetch('http://localhost:8000/ask-formation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Erreur serveur");

      const data = await res.json();
      setResponse(data.response);
    } catch (error) {
      console.error("Erreur:", error);
      setResponse("Erreur : Impossible de joindre l'agent agronomique.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">AgriConnect - Consultant Expert</h1>
      
      {/* Profil Utilisateur */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-100 rounded">
        <div>
          <label className="block text-sm font-medium">Culture</label>
          <input className="w-full p-1 border rounded" value={culture} onChange={(e) => setCulture(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Zone</label>
          <input className="w-full p-1 border rounded" value={zone} onChange={(e) => setZone(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium">Surface (ha)</label>
          <input type="number" className="w-full p-1 border rounded" value={superficie} onChange={(e) => setSuperficie(e.target.value)} />
        </div>
      </div>

      <textarea
        className="w-full p-3 border rounded shadow-sm"
        rows={3}
        placeholder="Posez votre question agronomique..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      
      <button
        onClick={handleAsk}
        disabled={isLoading}
        className="px-4 py-2 bg-green-600 text-white rounded w-full disabled:bg-gray-400"
      >
        {isLoading ? "Analyse en cours..." : "Envoyer ma question"}
      </button>

      <div className="mt-6 p-4 bg-gray-50 rounded border min-h-[100px]">
        <h2 className="font-semibold mb-2">Réponse :</h2>
        {isLoading ? (
          <div className="text-gray-500 animate-pulse">⏳ L'expert rédige le diagnostic personnalisé...</div>
        ) : (
          <p className="whitespace-pre-line">{response || "En attente de votre question."}</p>
        )}
      </div>
    </div>
  );
}