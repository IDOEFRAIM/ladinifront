'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { CheckCircle, Truck, Smartphone, ArrowRight, MessageCircle, Printer, Edit2, ShieldCheck, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function OrderSuccessPage() {
  const { clearCart, items: cartItems } = useCart();
  const searchParams = useSearchParams();
  
  const [state, setState] = useState<OrderState>({
    orderId: '',
    phone: '',
    orderItems: [],
    isInitialized: false
  });
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const orderIdFromUrl = searchParams.get('orderId');
    const phoneFromUrl = searchParams.get('phone');
    const storedOrder = JSON.parse(sessionStorage.getItem('last_processed_order') || 'null');
    
    let finalItems = [];
    let finalId = orderIdFromUrl || (storedOrder?.id) || `AGRI-${Math.floor(Math.random() * 90000) + 10000}`;

    // Si on arrive du panier avec des items
    if (cartItems.length > 0) {
      finalItems = cartItems.map(it => ({
        id: it.id,
        name: it.name,
        price: Number(it.price),
        quantity: it.quantity || 1
      }));
      sessionStorage.setItem('last_processed_order', JSON.stringify({ id: finalId, items: finalItems }));
      clearCart();
    } else if (storedOrder) {
      finalItems = storedOrder.items;
    }

    setState({
      orderId: finalId,
      phone: phoneFromUrl || localStorage.getItem('agri_customer_phone') || '',
      orderItems: finalItems,
      isInitialized: true
    });
  }, [cartItems, clearCart, searchParams]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(state.orderId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const subtotal = useMemo(() => 
    state.orderItems.reduce((acc, it) => acc + (it.price * it.quantity), 0), 
  [state.orderItems]);

  if (!state.isInitialized) return <div className="min-h-screen bg-[#F9FBF8] animate-pulse" />;

  const whatsappLink = `https://wa.me/22601479800?text=${encodeURIComponent(`Commande #${state.orderId}: Merci de confirmer livraison au ${state.phone}`)}`;

  return (
    <div className="min-h-screen bg-[#F9FBF8] py-10 px-5 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="max-w-md mx-auto"
      >
        {/* Header Section */}
        <header className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: 'spring', damping: 12 }}
            className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 text-white shadow-lg shadow-emerald-200"
          >
            <CheckCircle size={40} />
          </motion.div>
          <h1 className="text-2xl font-black text-emerald-900 mb-2 leading-tight">
            {searchParams.get('mode') === 'offline' ? 'Commande sauvegardée' : 'Commande réussie !'}
          </h1>
          
          <button 
            onClick={copyToClipboard}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-emerald-100 rounded-full text-sm font-bold text-slate-500 hover:bg-emerald-50 transition-colors"
          >
            Réf: <span className="text-emerald-600">#{state.orderId}</span>
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
          </button>
        </header>

        {/* Info Cards */}
        <section className="space-y-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-emerald-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Contact Livraison</p>
                <p className="font-bold text-emerald-900">{state.phone || '---'}</p>
              </div>
            </div>
            <button 
              onClick={() => setIsEditingPhone(!isEditingPhone)}
              className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <Edit2 size={16} />
            </button>
          </div>

          <AnimatePresence>
            {isEditingPhone && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <input 
                  type="tel"
                  placeholder="Entrez le nouveau numéro"
                  className="w-full p-4 bg-white border-2 border-emerald-500 rounded-xl outline-none shadow-inner"
                  onChange={(e) => setState(s => ({...s, phone: e.target.value}))}
                  onBlur={() => setIsEditingPhone(false)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Ticket Récapitulatif */}
        <section className="bg-white rounded-3xl p-6 border border-dashed border-slate-200 shadow-sm mb-8 relative">
          <div className="absolute -left-3 top-1/2 w-6 h-6 bg-[#F9FBF8] rounded-full border-r border-slate-200" />
          <div className="absolute -right-3 top-1/2 w-6 h-6 bg-[#F9FBF8] rounded-full border-l border-slate-200" />
          
          <h3 className="text-center text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 border-b pb-4">Résumé de la commande</h3>
          
          <div className="space-y-4">
            {state.orderItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                  <p className="text-xs text-slate-500 font-medium">Quantité : {item.quantity}</p>
                </div>
                <p className="font-black text-emerald-700">{(item.price * item.quantity).toLocaleString()} F</p>
              </div>
            ))}
            
            <div className="pt-6 mt-4 border-t-2 border-slate-50 space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-400">
                <span>Sous-total</span>
                <span>{subtotal.toLocaleString()} CFA</span>
              </div>
              <div className="flex justify-between text-lg font-black text-emerald-900">
                <span>TOTAL</span>
                <span>{subtotal.toLocaleString()} CFA</span>
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <footer className="space-y-3">
          <a 
            href={whatsappLink}
            className="flex items-center justify-center gap-3 w-full bg-[#25D366] text-white py-5 rounded-2xl font-black text-lg shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <MessageCircle size={24} /> Confirmer sur WhatsApp
          </a>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => window.print()}
              className="flex items-center justify-center gap-2 bg-white border border-slate-200 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <Printer size={18} /> Reçu PDF
            </button>
            <Link 
              href="/catalogue"
              className="flex items-center justify-center gap-2 bg-emerald-900 text-white py-4 rounded-2xl font-bold hover:bg-emerald-800 transition-colors"
            >
              Boutique <ArrowRight size={18} />
            </Link>
          </div>
          
          <div className="pt-8 flex items-center justify-center gap-2 text-[10px] font-bold text-emerald-800/40 uppercase tracking-widest">
            <ShieldCheck size={14} /> Données cryptées & sécurisées
          </div>
        </footer>
      </motion.div>
    </div>
  );
}