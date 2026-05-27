"use client";

import React, { useState, useRef, useEffect } from 'react';

// 1. Déclaration des types stricts du protocole AG-UI
interface AGUIComponentProps {
  lc_type: string;
  id: string[];
  kwargs: {
    title?: string;
    field?: string;
    label?: string;
    placeholder?: string;
    metadata?: Record<string, any>;
  };
}

interface AgentMessage {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  component?: AGUIComponentProps | null;
  activeNode?: string | null;
}

export default function ProPage() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentNode, setCurrentNode] = useState<string | null>(null);

  // Formulaire des variables contextuelles d'injection directe
  const [culture, setCulture] = useState('mil');
  const [zone, setZone] = useState('Centre');
  const [superficie, setSuperficie] = useState('1.0');

  // Input dynamique pour le composant de formulaire AG-UI généré
  const [dynamicFormValue, setDynamicFormValue] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentNode]);

  // Fonction principale de consommation du Stream SSE FastAPI + LangGraph
  const processAgentStream = async (messageToSend: string, extraStateUpdates: Record<string, any> = {}) => {
    setIsLoading(true);
    setCurrentNode("Connexion au serveur...");

    const agentMessageId = Date.now().toString();

    // On pré-ajoute la bulle de l'agent qui va recevoir le stream
    setMessages(prev => [...prev, { 
      id: agentMessageId, 
      sender: 'agent', 
      text: '', 
      component: null 
    }]);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/agents/producer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          thread_id: "session-agriconnect-12345",
          state_updates: { culture, zone, superficie, ...extraStateUpdates }
        }),
      });

      if (!response.body) throw new Error("Flux de réponse illisible ou vide.");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        
        buffer = lines.pop() || ""; 

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (!cleanedLine.startsWith("data: ")) continue;

          // Extraction du payload JSON AG-UI
          const rawJson = cleanedLine.replace("data: ", "");
          const parsedData = jsonParseSafe(rawJson);

          if (!parsedData) continue;

          // Mise à jour du nœud LangGraph actif
          if (parsedData.node) {
            setCurrentNode(parsedData.node);
          }

          // Injection dynamique du texte et du composant UI
          if (parsedData.final_response || parsedData.ag_ui_component) {
            setMessages(prev => prev.map(msg => {
              if (msg.id === agentMessageId) {
                return {
                  ...msg,
                  text: parsedData.final_response || msg.text,
                  component: parsedData.ag_ui_component !== undefined ? parsedData.ag_ui_component : msg.component
                };
              }
              return msg;
            }));
          }
        }
      }
    } catch (error) {
      console.error("Erreur Stream:", error);
      setMessages(prev => prev.map(msg => 
        msg.id === agentMessageId 
          ? { ...msg, text: "❌ Erreur de communication ou serveur injoignable." } 
          : msg
      ));
    } finally {
      setIsLoading(false);
      setCurrentNode(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input;
    setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userText }]);
    setInput('');

    await processAgentStream(userText);
  };

  const handleAGUISubmit = async (fieldName: string, goal: string) => {
    if (!dynamicFormValue.trim() || isLoading) return;

    const submittedValue = dynamicFormValue;
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      sender: 'user', 
      text: `Saisie ${fieldName} : ${submittedValue}` 
    }]);
    setDynamicFormValue('');

    await processAgentStream(`Voici la valeur pour ${fieldName} : ${submittedValue}`, {
      [fieldName]: submittedValue,
      current_goal: goal
    });
  };

  // CORRECTION MAJEURE : Remplacement de json.parse par JSON.parse
  const jsonParseSafe = (str: string) => {
    try { 
      return JSON.parse(str); 
    } catch (e) { 
      return null; 
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 text-gray-900 bg-white rounded-xl shadow-lg mt-10 border border-gray-100">
      <div className="flex justify-between items-center border-b pb-3">
        <h1 className="text-xl font-bold text-emerald-800">🌾 AgriConnect — Consultant Expert PRO</h1>
        <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
          AG-UI Live Connected
        </span>
      </div>

      {/* Variables Contextuelles */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Culture</label>
          <input className="w-full p-2 text-sm border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={culture} onChange={(e) => setCulture(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Zone</label>
          <input className="w-full p-2 text-sm border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={zone} onChange={(e) => setZone(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Surface (ha)</label>
          <input type="number" className="w-full p-2 text-sm border rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none" value={superficie} onChange={(e) => setSuperficie(e.target.value)} />
        </div>
      </div>

      {/* Zone de chat */}
      <div className="border border-gray-200 rounded-xl h-96 overflow-y-auto p-4 bg-slate-50 space-y-4 shadow-inner">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-32 space-y-2">
            <p className="font-semibold text-gray-500">Prêt pour la négociation de marché.</p>
            <p className="text-xs text-gray-400">Exemple : "Je veux publier une offre de vente de mil"</p>
          </div>
        )}
        
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`p-3.5 rounded-xl max-w-[85%] text-sm shadow-sm ${
              msg.sender === 'user' 
                ? 'bg-emerald-600 text-white font-medium rounded-tr-none' 
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none space-y-3'
            }`}>
              <div>{msg.text || (isLoading && msg.id === messages[messages.length - 1].id && "Analyse en cours...")}</div>

              {/* COMPOSANT DYNAMIQUE COMPATIBLE AVEC TON LOG BACKEND */}
              {msg.component && msg.component.id && msg.component.id[1] === "FormInputComponent" && (
                <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2 text-gray-800 animate-fadeIn">
                  <div className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    📌 {msg.component.kwargs.title || "Saisie requise"}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="flex-1 p-2 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-gray-900"
                      placeholder={msg.component.kwargs.placeholder || "Entrez la valeur..."}
                      value={dynamicFormValue}
                      onChange={(e) => setDynamicFormValue(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAGUISubmit(msg.component?.kwargs.field || "field", msg.component?.kwargs.metadata?.goal || "")}
                    />
                    <button
                      onClick={() => handleAGUISubmit(msg.component?.kwargs.field || "field", msg.component?.kwargs.metadata?.goal || "")}
                      disabled={isLoading}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition shadow-sm"
                    >
                      Valider
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Saisie & Logs d'exécution */}
      <div className="space-y-2">
        {currentNode && (
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-amber-600 animate-pulse px-1">
            <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
            <span>Étape LangGraph : <span className="font-bold underline">{currentNode}</span></span>
          </div>
        )}
        
        <div className="flex gap-2">
          <input 
            className="flex-1 p-3 border border-gray-300 rounded-xl text-sm bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-gray-400"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isLoading ? "L'agent travaille..." : "Posez votre question..."}
            disabled={isLoading}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            onClick={handleSend} 
            disabled={isLoading || !input.trim()} 
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl text-sm transition shadow disabled:bg-gray-200"
          >
            Envoyer
          </button>
        </div>
      </div>
    </div>
  );
}