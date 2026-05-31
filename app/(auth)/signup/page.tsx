'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGeoLocation } from '@/hooks/useGeoLocalisation';
import { Sprout, Loader2, User, Mail, Lock, Phone, MapPin } from 'lucide-react';

const C = {
  forest: '#064E3B', emerald: '#10B981', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

const signupSchema = z.object({
  name: z.string().min(2, 'Le nom doit contenir au moins 2 caractères'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Le mot de passe doit contenir au moins 6 caractères'),
  phone: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
});

type SignupFormInputs = z.infer<typeof signupSchema>;

function SignupPageContent() {
  const { register: registerUser, isAuthenticated, isLoading, onboardingCompleted } = useAuth();
  const router = useRouter();

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', phone: '' },
  });

  const { location, isLoading: geoLoading, getLocation } = useGeoLocation();

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && !onboardingCompleted) {
      router.replace('/onboarding');
    } else if (isAuthenticated && onboardingCompleted) {
      router.replace('/market');
    }
  }, [isAuthenticated, isLoading, onboardingCompleted, router]);

  useEffect(() => {
    if (location) {
      setValue('latitude', location.lat);
      setValue('longitude', location.lng);
    }
  }, [location, setValue]);

  const onSubmit = async (data: SignupFormInputs) => {
    const payload = { ...data, role: 'USER' };
    const result = await registerUser(payload);
    if (result?.success) {
      toast.success('Compte créé ! Configurons votre profil.');
    } else {
      toast.error(result?.error || 'Erreur');
    }
  };

  const inputStyle = (hasError: boolean) => ({
    width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
    borderRadius: 12, border: `1px solid ${hasError ? '#DC2626' : C.border}`,
    background: 'rgba(255,255,255,0.6)',
    fontFamily: "'Inter', sans-serif", fontSize: 15, color: C.forest,
    outline: 'none', transition: 'all 0.2s', boxSizing: 'border-box' as const,
  });

  const iconStyle = (hasError: boolean) => ({
    position: 'absolute' as const, left: 14, top: '50%', transform: 'translateY(-50%)',
    color: hasError ? '#DC2626' : C.muted, opacity: 0.6,
  });

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.sand, padding: 16 }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 60% 20%, rgba(16,185,129,0.04) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(217,119,6,0.03) 0%, transparent 50%)' }} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 32, border: `1px solid ${C.border}`, padding: 36,
        width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(6,78,59,0.06)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 18, background: 'rgba(16,185,129,0.08)', marginBottom: 16 }}>
            <Sprout size={28} style={{ color: C.forest }} />
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.6rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em' }}>Créer un compte</h1>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.muted, marginTop: 6 }}>Rejoignez la place de marché agricole du Burkina Faso</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ position: 'relative' }}>
            <User size={16} style={iconStyle(!!errors.name)} />
            <input {...register('name')} disabled={isSubmitting} placeholder="Nom complet" style={inputStyle(!!errors.name)} />
            {errors.name && <p style={{ color: '#DC2626', fontSize: 11, fontWeight: 700, marginTop: 3 }}>{errors.name.message}</p>}
          </div>

          <div style={{ position: 'relative' }}>
            <Mail size={16} style={iconStyle(!!errors.email)} />
            <input {...register('email')} disabled={isSubmitting} placeholder="Email" type="email" style={inputStyle(!!errors.email)} />
            {errors.email && <p style={{ color: '#DC2626', fontSize: 11, fontWeight: 700, marginTop: 3 }}>{errors.email.message}</p>}
          </div>

          <div style={{ position: 'relative' }}>
            <Phone size={16} style={iconStyle(false)} />
            <input {...register('phone')} disabled={isSubmitting} placeholder="Téléphone (optionnel)" style={inputStyle(false)} />
          </div>

          <div style={{ position: 'relative' }}>
            <Lock size={16} style={iconStyle(!!errors.password)} />
            <input type="password" {...register('password')} disabled={isSubmitting} placeholder="Mot de passe (min. 6 car.)" style={inputStyle(!!errors.password)} />
            {errors.password && <p style={{ color: '#DC2626', fontSize: 11, fontWeight: 700, marginTop: 3 }}>{errors.password.message}</p>}
          </div>

          <button type="button" onClick={() => getLocation()} disabled={geoLoading} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '10px 16px', borderRadius: 12, border: `1px solid ${C.border}`,
            background: location ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer', fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600,
            color: location ? C.forest : C.muted, transition: 'all 0.2s',
          }}>
            <MapPin size={16} />
            {geoLoading ? 'Localisation...' : location ? 'Position obtenue ✓' : 'Obtenir ma position'}
          </button>

          <button type="submit" disabled={isSubmitting} style={{
            width: '100%', padding: '15px 24px', borderRadius: 100, border: 'none', cursor: 'pointer',
            background: C.forest, color: '#fff',
            fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(6,78,59,0.15)',
            transition: 'all 0.2s', opacity: isSubmitting ? 0.6 : 1, marginTop: 4,
            minHeight: 48,
          }}>
            {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Créer mon compte'}
          </button>
        </form>

        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.muted }}>
            Déjà membre ? <Link href="/login" style={{ color: C.forest, fontWeight: 700, textDecoration: 'none' }}>Connectez-vous</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  const { isLoading } = useAuth();
  if (isLoading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
      <Loader2 size={36} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
      <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 16 }}>Chargement...</p>
    </div>
  );
  return <SignupPageContent />;
}
