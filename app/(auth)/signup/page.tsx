'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
type SystemRole = 'USER' | 'BUYER' | 'PRODUCER' | 'ADMIN' | 'SUPERADMIN' | 'AGENT';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGeoLocation } from '@/hooks/useGeoLocalisation';
import { Sprout, Loader2, User, Mail, Lock, ShieldAlert, ShoppingCart, Leaf } from 'lucide-react';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

const signupSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caracteres"),
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caracteres"),
  role: z.enum(['USER', 'ADMIN', 'PRODUCER']),
  adminSecret: z.string().optional(),
  // optional org request fields for producers
  wantsOrganization: z.boolean().optional(),
  orgName: z.string().min(2).optional(),
  orgType: z.enum(['GOVERNMENT_REGIONAL', 'COOPERATIVE', 'NGO', 'PRIVATE_TRADER', 'RESELLER']).optional(),
  orgTaxId: z.string().optional().nullable(),
  orgDescription: z.string().optional().nullable(),
  phone: z.string().optional(),
  cnibNumber: z.string().optional().nullable(),
  whatsappEnabled: z.boolean().optional().default(true),
  dailyAdviceTime: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).refine((data) => (data.role !== 'ADMIN' || !!data.adminSecret), {
  message: "Code secret requis pour les administrateurs",
  path: ["adminSecret"],
}).refine((data) => {
  if (data.wantsOrganization) return !!(data.orgName && data.orgType);
  return true;
}, { message: 'Champs organisation requis si demandé', path: ['orgName'] });

type SignupFormInputs = z.infer<typeof signupSchema>;

const ROLE_REDIRECTS: Record<string, string> = { ADMIN: '/admin', USER: '/market', PRODUCER: '/dashboard' };

const ROLES = [
  { value: 'USER', label: 'Acheteur', icon: ShoppingCart },
  { value: 'PRODUCER', label: 'Producteur', icon: Leaf },
  { value: 'ADMIN', label: 'Staff', icon: ShieldAlert },
];

function SignupPageContent() {
  const { register: registerUser, isAuthenticated, isLoading, userRole } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<SignupFormInputs>({
    // zodResolver typing is strict; cast to any to avoid inferred optional mismatch
    resolver: zodResolver(signupSchema) as any,
    defaultValues: { role: 'USER', name: '', email: '', password: '', adminSecret: '', phone: '', cnibNumber: null, whatsappEnabled: true, dailyAdviceTime: '' } as any
  });

  // extra org fields
  const wantsOrg = watch('wantsOrganization');
  const orgName = watch('orgName');
  const orgType = watch('orgType');

  const selectedRole = watch('role');

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;
    router.replace(ROLE_REDIRECTS[userRole?.toUpperCase() || 'USER']);
  }, [isAuthenticated, isLoading, userRole, router]);

  const onSubmit = async (data: SignupFormInputs) => {
    // mark producer registrations explicitly so server creates Producer record
    const payload: any = { ...data, role: data.role as SystemRole };
    if (data.role === 'PRODUCER') payload.isProducer = true;
    // include org creation request if applicable
    if ((data as any).wantsOrganization) {
      payload.wantsOrganization = true;
      payload.orgName = (data as any).orgName;
      payload.orgType = (data as any).orgType;
      payload.orgTaxId = (data as any).orgTaxId || null;
      payload.orgDescription = (data as any).orgDescription || null;
    }
    const result = await registerUser(payload);
    return result?.success ? toast.success("Inscription reussie !") : toast.error(result?.error || "Erreur");
  };

  // Geo hook
  const { location, error: geoError, isLoading: geoLoading, getLocation } = useGeoLocation();

  // When location is obtained, write into form
  React.useEffect(() => {
    if (location) {
      setValue('latitude' as any, location.lat);
      setValue('longitude' as any, location.lng);
    }
  }, [location, setValue]);

  const inputStyle = (hasError: boolean, isCritical = false) => ({
    width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
    borderRadius: 12, border: `1px solid ${hasError ? '#DC2626' : C.border}`,
    background: isCritical ? 'rgba(220,38,38,0.03)' : 'rgba(255,255,255,0.6)',
    fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.forest,
    outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' as const,
  });

  const iconStyle = (hasError: boolean, isCritical = false) => ({
    position: 'absolute' as const, left: 14, top: '50%', transform: 'translateY(-50%)',
    color: hasError ? '#DC2626' : isCritical ? '#DC2626' : C.muted, opacity: 0.6,
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand, padding: 16 }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 60% 20%, rgba(16,185,129,0.04) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(217,119,6,0.03) 0%, transparent 50%)' }} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 32, border: `1px solid ${C.border}`, padding: 36,
        width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(6,78,59,0.06)',
      }}>
        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 18, background: 'rgba(16,185,129,0.08)', marginBottom: 16 }}>
            <Sprout size={28} style={{ color: C.forest }} />
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em' }}>FrontAg</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>Systeme de gestion agricole</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ROLE SELECTOR */}
          <div style={{ marginBottom: 8 }}>
            <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8, marginLeft: 2 }}>Choisir votre profil</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {ROLES.map((r) => {
                const active = selectedRole === r.value;
                return (
                  <button key={r.value} type="button" onClick={() => setValue('role', r.value as any)} style={{
                    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: '16px 8px', borderRadius: 16, cursor: 'pointer', transition: 'all 0.3s',
                    border: `2px solid ${active ? C.forest : C.border}`,
                    background: active ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
                    transform: active ? 'scale(1.03)' : 'scale(1)',
                    boxShadow: active ? '0 4px 16px rgba(6,78,59,0.06)' : 'none',
                  }}>
                    <r.icon size={22} style={{ color: active ? C.forest : C.muted, marginBottom: 6, transition: 'color 0.2s' }} />
                    <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.01em', color: active ? C.forest : C.muted }}>{r.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* FIELDS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <User size={16} style={iconStyle(!!errors.name)} />
              <input {...register("name")} disabled={isSubmitting} placeholder="Nom" style={inputStyle(!!errors.name)} />
              {errors.name && <p style={{ color: '#DC2626', fontSize: 10, fontWeight: 700, marginTop: 3, textTransform: 'uppercase' }}>{errors.name.message}</p>}
            </div>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={iconStyle(!!errors.email)} />
              <input {...register("email")} disabled={isSubmitting} placeholder="Email" style={inputStyle(!!errors.email)} />
              {errors.email && <p style={{ color: '#DC2626', fontSize: 10, fontWeight: 700, marginTop: 3, textTransform: 'uppercase' }}>{errors.email.message}</p>}
            </div>
            <div style={{ position: 'relative' }}>
              <User size={16} style={iconStyle(!!errors.phone)} />
              <input {...register("phone")} disabled={isSubmitting} placeholder="Téléphone" style={inputStyle(!!errors.phone)} />
            </div>
            <div style={{ position: 'relative' }}>
              <User size={16} style={iconStyle(!!errors.cnibNumber)} />
              <input {...register("cnibNumber")} disabled={isSubmitting} placeholder="Numéro CNIB (optionnel)" style={inputStyle(!!errors.cnibNumber)} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" {...register('whatsappEnabled' as any)} defaultChecked /> Recevoir les notifications WhatsApp
              </label>
              <div style={{ marginLeft: 'auto' }}>
                <button type="button" onClick={() => getLocation()} disabled={geoLoading} style={{ padding: '8px 12px', borderRadius: 8, background: C.forest, color: '#fff' }}>{geoLoading ? '...' : 'Obtenir ma position'}</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input type="time" {...register('dailyAdviceTime' as any)} placeholder="Heure conseillée" style={{ ...inputStyle(false), flex: 1 }} />
              <input {...register('latitude' as any)} placeholder="Latitude" style={{ ...inputStyle(false), width: 140 }} readOnly />
              <input {...register('longitude' as any)} placeholder="Longitude" style={{ ...inputStyle(false), width: 140 }} readOnly />
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={iconStyle(!!errors.password)} />
              <input type="password" {...register("password")} disabled={isSubmitting} placeholder="Mot de passe" style={inputStyle(!!errors.password)} />
              {errors.password && <p style={{ color: '#DC2626', fontSize: 10, fontWeight: 700, marginTop: 3, textTransform: 'uppercase' }}>{errors.password.message}</p>}
            </div>
            {selectedRole === 'ADMIN' && (
              <div style={{ position: 'relative' }}>
                <ShieldAlert size={16} style={iconStyle(!!errors.adminSecret, true)} />
                <input type="password" {...register("adminSecret")} disabled={isSubmitting} placeholder="Cle Admin" style={inputStyle(!!errors.adminSecret, true)} />
                {errors.adminSecret && <p style={{ color: '#DC2626', fontSize: 10, fontWeight: 700, marginTop: 3, textTransform: 'uppercase' }}>{errors.adminSecret.message}</p>}
              </div>
            )}

            {selectedRole === 'PRODUCER' && (
              <div style={{ marginTop: 6 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" {...register('wantsOrganization' as any)} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Je représente une organisation (créer une organisation)</span>
                </label>

                {wantsOrg && (
                  <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input {...register('orgName' as any)} placeholder="Nom de l'organisation" style={inputStyle(!!(errors as any).orgName)} />
                    <select {...register('orgType' as any)} style={inputStyle(!!(errors as any).orgType)}>
                      <option value="COOPERATIVE">Coopérative</option>
                      <option value="GOVERNMENT_REGIONAL">Gouvernement régional</option>
                      <option value="NGO">ONG</option>
                      <option value="PRIVATE_TRADER">Commerçant privé</option>
                      <option value="RESELLER">Revendeur</option>
                    </select>
                    <input {...register('orgTaxId' as any)} placeholder="Identifiant fiscal (optionnel)" style={inputStyle(false)} />
                    <textarea {...register('orgDescription' as any)} placeholder="Description (optionnelle)" style={{ ...inputStyle(false), minHeight: 80 }} />
                  </div>
                )}
              </div>
            )}
          </div>

          <button type="submit" disabled={isSubmitting} style={{
            width: '100%', padding: '14px 24px', borderRadius: 100, border: 'none', cursor: 'pointer',
            background: selectedRole === 'ADMIN' ? '#DC2626' : C.forest, color: '#fff',
            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: selectedRole === 'ADMIN' ? '0 4px 16px rgba(220,38,38,0.15)' : '0 4px 16px rgba(6,78,59,0.15)',
            transition: 'all 0.2s', opacity: isSubmitting ? 0.6 : 1, marginTop: 8,
          }}>
            {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : selectedRole === 'ADMIN' ? 'Etablir acces Staff' : 'Creer mon acces'}
          </button>
        </form>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.muted }}>
            Deja membre ? <Link href="/login" style={{ color: C.forest, fontWeight: 700, textDecoration: 'none' }}>Connectez-vous</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const { isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={36} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16 }}>Initialisation du flux...</p>
    </div>
  );
  return <SignupPageContent />;
}
