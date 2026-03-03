'use client';

import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import Link from 'next/link';
import { Camera, X, Phone, RefreshCcw, ShieldCheck, Truck, CheckCircle2, AlertTriangle, Send } from 'lucide-react';

const C = { forest:'#064E3B', emerald:'#10B981', lime:'#84CC16', amber:'#D97706', sand:'#F9FBF8', glass:'rgba(255,255,255,0.72)', border:'rgba(6,78,59,0.07)', muted:'#64748B', text:'#1F2937' };
const F = { heading:"'Space Grotesk',sans-serif", body:"'Inter',sans-serif" };

type ClaimFormData = { orderId: string; issueType: string; details: string; };

const labelStyle: React.CSSProperties = { display:'block', marginBottom:8, fontWeight:800, fontSize:'0.78rem', color:C.muted, textTransform:'uppercase' as const, letterSpacing:0.5, fontFamily:F.body };
const inputStyle: React.CSSProperties = { width:'100%', padding:'14px 18px', borderRadius:14, border:`1px solid ${C.border}`, fontSize:'0.95rem', fontFamily:F.body, background:'white', outline:'none', color:C.text, transition:'border 0.2s' };

/*  Sub-components  */
const ClaimHeader = () => (
    <div style={{ textAlign:'center', padding:'48px 20px 12px' }}>
        <div style={{ width:72, height:72, borderRadius:20, background:`${C.amber}14`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
            <AlertTriangle size={32} color={C.amber} />
        </div>
        <h1 style={{ fontFamily:F.heading, fontSize:'clamp(1.8rem,4vw,2.4rem)', fontWeight:800, color:C.text, letterSpacing:'-0.03em', margin:'0 0 10px' }}>Signaler un problème</h1>
        <p style={{ fontFamily:F.body, color:C.muted, fontSize:'1rem', lineHeight:1.6, maxWidth:480, margin:'0 auto' }}>
            Notre équipe analyse chaque réclamation sous 24h. Joignez une photo pour accélérer le traitement.
        </p>
    </div>
);

const ClaimForm = ({ register, errors, handleSubmit, onSubmit, status, previewUrl, fileInputRef, handleFileChange, removeImage }: any) => (
    <div style={{ flex:2, minWidth:320 }}>
        <div style={{ background:C.glass, backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)', borderRadius:24, border:`1px solid ${C.border}`, padding:36 }}>
            <h2 style={{ fontFamily:F.heading, fontWeight:800, fontSize:'1.15rem', color:C.text, marginBottom:28 }}>Détails de la réclamation</h2>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div style={{ marginBottom:20 }}>
                    <label style={labelStyle}>N° DE COMMANDE</label>
                    <input {...register('orderId', { required: true })} placeholder="Ex: CMD-2024-001" style={inputStyle} />
                    {errors.orderId && <span style={{ color:'#EF4444', fontSize:'0.78rem', fontFamily:F.body, marginTop:4, display:'block' }}>Ce champ est requis</span>}
                </div>
                <div style={{ marginBottom:20 }}>
                    <label style={labelStyle}>TYPE DE PROBLÈME</label>
                    <select {...register('issueType', { required: true })} style={{ ...inputStyle, cursor:'pointer' }}>
                        <option value="">Sélectionnez une raison</option>
                        <option value="quality">Produit abîmé ou non conforme</option>
                        <option value="missing">Article manquant</option>
                        <option value="delivery">Problème de livraison</option>
                    </select>
                    {errors.issueType && <span style={{ color:'#EF4444', fontSize:'0.78rem', fontFamily:F.body }}>Ce champ est requis</span>}
                </div>
                <div style={{ marginBottom:20 }}>
                    <label style={labelStyle}>DÉTAILS (SOYEZ PRÉCIS)</label>
                    <textarea {...register('details', { required: true })} rows={3} placeholder="Expliquez-nous le souci..." style={{ ...inputStyle, resize:'none' as const }} />
                    {errors.details && <span style={{ color:'#EF4444', fontSize:'0.78rem', fontFamily:F.body }}>Ce champ est requis</span>}
                </div>
                <div style={{ marginBottom:30 }}>
                    <label style={labelStyle}>PREUVE PHOTO (OBLIGATOIRE)</label>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/jpeg,image/png,image/webp" style={{ display:'none' }} />
                    {!previewUrl ? (
                        <div onClick={() => fileInputRef.current?.click()} style={{ border:`2px dashed ${C.border}`, borderRadius:18, padding:30, textAlign:'center', cursor:'pointer', background:`${C.forest}05`, display:'flex', flexDirection:'column', alignItems:'center', gap:12, transition:'background 0.2s' }}>
                            <Camera size={32} color={C.forest} />
                            <div>
                                <div style={{ fontWeight:800, fontSize:'0.9rem', color:C.forest, fontFamily:F.body }}>Prendre une photo du produit</div>
                                <div style={{ fontSize:'0.75rem', color:C.muted, marginTop:4, fontFamily:F.body }}>Uniquement JPG, PNG, WEBP (Max 5Mo)</div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ position:'relative', borderRadius:18, overflow:'hidden', border:`2px solid ${C.emerald}` }}>
                            <img src={previewUrl} alt="Preview" style={{ width:'100%', height:220, objectFit:'cover' }} />
                            <button type="button" onClick={removeImage} style={{ position:'absolute', top:12, right:12, background:'rgba(0,0,0,0.7)', color:'white', border:'none', borderRadius:'50%', width:32, height:32, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <X size={18} />
                            </button>
                            <div style={{ background:`${C.emerald}14`, padding:10, fontSize:'0.85rem', color:C.forest, fontWeight:800, textAlign:'center', fontFamily:F.body }}>Image prête pour analyse sécurisée</div>
                        </div>
                    )}
                </div>
                <button type="submit" style={{ width:'100%', padding:20, background:C.forest, color:'white', fontWeight:800, fontSize:'1.05rem', border:'none', borderRadius:100, cursor:'pointer', boxShadow:'0 6px 20px rgba(6,78,59,0.2)', fontFamily:F.body, display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
                    <Send size={18} />
                    {status === 'submitting' ? 'ENVOI EN COURS...' : 'ENVOYER MA RÉCLAMATION'}
                </button>
            </form>
        </div>
    </div>
);

const ClaimSidebar = () => (
    <div style={{ flex:1, minWidth:300, display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ background:`${C.emerald}0A`, padding:30, borderRadius:24, border:`1px solid ${C.emerald}20` }}>
            <h3 style={{ fontSize:'1.1rem', fontWeight:800, color:C.forest, marginBottom:20, fontFamily:F.heading }}>Aide immédiate</h3>
            <div style={{ display:'flex', alignItems:'center', gap:15 }}>
                <div style={{ width:45, height:45, background:C.forest, borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', color:'white' }}>
                    <Phone size={20} />
                </div>
                <div>
                    <div style={{ fontSize:'0.75rem', color:C.muted, fontWeight:700, fontFamily:F.body }}>WHATSAPP / APPEL</div>
                    <div style={{ fontWeight:800, fontSize:'1rem', color:C.text, fontFamily:F.body }}>+226 70 00 00 00</div>
                </div>
            </div>
        </div>
        <div style={{ background:C.glass, backdropFilter:'blur(20px)', padding:30, borderRadius:24, border:`1px solid ${C.border}` }}>
            <h3 style={{ fontSize:'1.1rem', fontWeight:800, marginBottom:20, color:C.text, fontFamily:F.heading }}>Garanties FrontAg</h3>
            <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
                <Commitment icon={<RefreshCcw size={18} />} text="Remplacement sans frais sur votre prochaine commande." />
                <Commitment icon={<ShieldCheck size={18} />} text="Remboursement garanti si le produit est avarié." />
                <Commitment icon={<Truck size={18} />} text="Pas besoin de renvoyer le produit défectueux." />
            </div>
        </div>
    </div>
);

const ClaimSuccessScreen = () => (
    <div style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:40, background:C.sand }}>
        <CheckCircle2 size={64} color={C.emerald} style={{ marginBottom:24 }} />
        <h1 style={{ fontSize:'2.2rem', fontWeight:800, color:C.forest, marginBottom:12, fontFamily:F.heading }}>Requête enregistrée.</h1>
        <p style={{ maxWidth:450, color:C.muted, fontSize:'1.1rem', lineHeight:1.6, marginBottom:40, fontFamily:F.body }}>
            Nos équipes analysent vos photos. Une solution de remplacement ou de remboursement vous sera envoyée par SMS sous 24h.
        </p>
        <Link href="/market" style={{ background:C.forest, color:'white', padding:'18px 40px', borderRadius:100, textDecoration:'none', fontWeight:800, fontFamily:F.body }}>
            Retour au Marché
        </Link>
    </div>
);

const Commitment = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
    <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
        <div style={{ color:C.forest, marginTop:2 }}>{icon}</div>
        <p style={{ margin:0, fontSize:'0.85rem', color:C.muted, fontWeight:600, lineHeight:1.4, fontFamily:F.body }}>{text}</p>
    </div>
);

/*  Main Page  */
export default function ClaimPage() {
    const { register, handleSubmit, formState: { errors } } = useForm<ClaimFormData>();
    const [status, setStatus] = useState<'idle'|'submitting'|'success'>('idle');
    const [previewUrl, setPreviewUrl] = useState<string|null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) { alert('Fichier trop lourd (max 5Mo)'); return; }
        setPreviewUrl(URL.createObjectURL(file));
    };
    const removeImage = () => { setPreviewUrl(null); if (fileInputRef.current) fileInputRef.current.value = ''; };
    const onSubmit = async (data: ClaimFormData) => {
        setStatus('submitting');
        await new Promise(r => setTimeout(r, 1500));
        console.log('Claim submitted:', data);
        setStatus('success');
    };

    if (status === 'success') return <ClaimSuccessScreen />;

    return (
        <div style={{ minHeight:'100vh', background:C.sand, fontFamily:F.body }}>
            <ClaimHeader />
            <div style={{ maxWidth:1100, margin:'0 auto', padding:'32px 24px 80px', display:'flex', gap:32, flexWrap:'wrap' }}>
                <ClaimForm register={register} errors={errors} handleSubmit={handleSubmit} onSubmit={onSubmit} status={status} previewUrl={previewUrl} fileInputRef={fileInputRef} handleFileChange={handleFileChange} removeImage={removeImage} />
                <ClaimSidebar />
            </div>
        </div>
    );
}
