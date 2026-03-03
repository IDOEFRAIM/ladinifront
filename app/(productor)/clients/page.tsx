'use client';

import React, { useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Users, UserPlus, Phone, MapPin, Mail, Search, Plus, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk', sans-serif", body:"'Inter', sans-serif" };

type Client = { id: string; name: string; phone: string; email: string; location: string; totalOrders: number; totalSpent: number; lastOrderDate: string };

async function fetchClients(): Promise<Client[]> {
  try { const res = await axios.get('/api/clients', { withCredentials: true }); return res.data.clients || []; } catch { return []; }
}

const formatCurrency = (amount: number) => amount.toLocaleString('fr-FR') + ' F';

function GlassCard({ children, style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div style={{ background: C.glass, backdropFilter: 'blur(20px)', borderRadius: 24, border: `1px solid ${C.border}`, ...style }} {...props}>{children}</div>;
}

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => { fetchClients().then(data => { setClients(data); setLoading(false); }); }, []);

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.id.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm));

  const handleAddClient = async (newClient: Omit<Client, 'id' | 'totalOrders' | 'totalSpent' | 'lastOrderDate'>) => {
    try { const res = await axios.post('/api/clients', newClient, { withCredentials: true }); if (res.status >= 200 && res.status < 300) fetchClients().then(data => setClients(data)); } catch {}
    setIsModalOpen(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: C.sand, paddingBottom: 80, fontFamily: F.body }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(249,251,248,0.85)', backdropFilter: 'blur(20px)', padding: '20px 24px', borderBottom: `1px solid ${C.border}` }}>
        <h1 style={{ fontFamily: F.heading, fontSize: '1.5rem', fontWeight: 900, color: C.forest, display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Users size={22} color={C.emerald} /> Gestion des Clients
        </h1>
        <p style={{ fontSize: '0.8rem', color: C.muted, marginBottom: 16 }}>Base de donnees de vos acheteurs</p>
        <button onClick={() => setIsModalOpen(true)} style={{ width: '100%', padding: '14px 0', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', fontWeight: 800, borderRadius: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.85rem' }}>
          <Plus size={18} /> Ajouter un Nouveau Client
        </button>
      </div>

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
          <input type="text" placeholder="Rechercher par nom, ID ou telephone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '14px 14px 14px 42px', borderRadius: 14, border: `1px solid ${C.border}`, background: C.glass, backdropFilter: 'blur(12px)', fontFamily: F.body, fontSize: '0.85rem', outline: 'none', color: C.text, boxSizing: 'border-box' as const }} />
        </div>

        <h2 style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 800, color: C.text }}>Clients ({filteredClients.length})</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ textAlign: 'center' as const, padding: '40px 0' }}><Loader2 size={28} color={C.emerald} className="animate-spin" style={{ margin: '0 auto' }} /></div>
          ) : filteredClients.length === 0 ? (
            <div style={{ textAlign: 'center' as const, padding: '40px 0', color: C.muted, fontSize: '0.85rem' }}>Aucun client trouve pour {searchTerm || 'votre recherche'}.</div>
          ) : (
            <AnimatePresence>
              {filteredClients.map((client, i) => (
                <motion.div key={client.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                  <Link href={`/clients/${client.id}`} style={{ textDecoration: 'none' }}>
                    <GlassCard style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', transition: 'all 0.2s' }}>
                      <div>
                        <span style={{ fontFamily: F.heading, fontSize: '1rem', fontWeight: 800, color: C.text }}>{client.name}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.muted, marginTop: 4 }}><MapPin size={12} /> {client.location}</span>
                        <span style={{ fontSize: '0.7rem', color: C.emerald, fontWeight: 700, marginTop: 4, display: 'block' }}>{formatCurrency(client.totalSpent)} depenses ({client.totalOrders} commandes)</span>
                      </div>
                      <ChevronRight size={18} color={C.muted} style={{ opacity: 0.4 }} />
                    </GlassCard>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>

      {isModalOpen && <ClientFormModal onClose={() => setIsModalOpen(false)} onSubmit={handleAddClient} />}
    </div>
  );
}

type ClientFormProps = { onClose: () => void; onSubmit: (client: Omit<Client, 'id' | 'totalOrders' | 'totalSpent' | 'lastOrderDate'>) => void };
type ClientFormData = { name: string; phone: string; email: string; location: string };

const ClientFormModal: React.FC<ClientFormProps> = ({ onClose, onSubmit }) => {
  const { register, handleSubmit, formState: { errors } } = useForm<ClientFormData>();
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <motion.div initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200 }} style={{ background: 'white', width: '100%', padding: 28, borderRadius: '24px 24px 0 0', boxShadow: '0 -20px 60px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: 14, marginBottom: 20 }}>
          <h3 style={{ fontFamily: F.heading, fontSize: '1.15rem', fontWeight: 800, color: C.forest, display: 'flex', alignItems: 'center', gap: 8 }}><UserPlus size={20} color={C.emerald} /> Ajouter un Client</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.muted, fontSize: '1.5rem', cursor: 'pointer', fontWeight: 700 }}>&times;</button>
        </div>
        <form onSubmit={handleSubmit((data) => onSubmit(data))} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <InputGroup label="Nom Complet" icon={Users} register={register} name="name" required error={errors.name} />
          <InputGroup label="Telephone" icon={Phone} register={register} name="phone" type="tel" required error={errors.phone} />
          <InputGroup label="Email (Optionnel)" icon={Mail} register={register} name="email" type="email" />
          <InputGroup label="Adresse / Localisation" icon={MapPin} register={register} name="location" />
          <button type="submit" style={{ width: '100%', padding: '14px 0', background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})`, color: 'white', fontWeight: 800, borderRadius: 14, border: 'none', cursor: 'pointer', marginTop: 8, fontSize: '0.9rem' }}>Enregistrer le Client</button>
        </form>
      </motion.div>
    </div>
  );
};

type InputGroupProps = { label: string; icon: React.ElementType; register: any; name: string; type?: string; required?: boolean; error?: any };
const InputGroup: React.FC<InputGroupProps> = ({ label, icon: Icon, register, name, type = 'text', required = false, error }) => (
  <div>
    <label style={{ fontFamily: F.body, fontSize: '0.8rem', fontWeight: 600, color: C.text, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      <Icon size={14} color={C.emerald} /> {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
    </label>
    <input type={type} {...register(name, { required })} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: `1px solid ${C.border}`, fontFamily: F.body, fontSize: '0.85rem', outline: 'none', background: 'rgba(6,78,59,0.02)', color: C.text, boxSizing: 'border-box' as const }} />
    {error && <span style={{ color: '#EF4444', fontSize: '0.7rem', marginTop: 4, display: 'block' }}>Ce champ est requis</span>}
  </div>
);
