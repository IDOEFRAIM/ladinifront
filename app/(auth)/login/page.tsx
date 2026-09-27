'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AlertTriangle, ArrowLeft, Leaf, Loader2, Lock, Phone } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast, Toaster } from 'react-hot-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { RequiredPhoneSchema } from '@/lib/validators';
import { BF_PREFIX, withBurkinaPrefix } from '@/lib/phone-input';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

const loginSchema = z.object({
  phone: RequiredPhoneSchema,
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

// Au-delà, on considère le serveur en panne : l'utilisateur ne doit jamais rester devant un spinner infini.
const LOGIN_TIMEOUT_MS = 20_000;
const SESSION_CHECK_GRACE_MS = 8_000;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, userRole } = useAuth();

  const [failure, setFailure] = useState<string | null>(null);
  const [sessionCheckStuck, setSessionCheckStuck] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
    defaultValues: { phone: BF_PREFIX, password: '' },
  });

  const redirectUserByRole = (role: string, onboarded?: boolean) => {
    if (onboarded === false) {
      router.push('/onboarding');
      return;
    }
    const n = role?.toUpperCase();
    const map: Record<string, string> = {
      SUPERADMIN: '/admin',
      ADMIN: '/admin',
      PRODUCER: '/dashboard',
      AGENT: '/agent/deliveries',
      BUYER: '/buyer-dashboard',
      USER: '/market',
    };
    router.push(map[n] || '/market');
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole) redirectUserByRole(userRole);
  }, [isAuthenticated, isLoading, userRole]);

  // Vérification de session trop longue (serveur lent ou en panne) : on affiche quand même le formulaire.
  useEffect(() => {
    if (!isLoading) return;
    const t = setTimeout(() => setSessionCheckStuck(true), SESSION_CHECK_GRACE_MS);
    return () => clearTimeout(t);
  }, [isLoading]);

  const onSubmit = async (data: LoginFormInputs) => {
    setFailure(null);
    let result: any;
    try {
      result = await Promise.race([
        login(data.phone, data.password),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), LOGIN_TIMEOUT_MS)),
      ]);
    } catch (e) {
      setFailure(
        (e as Error)?.message === 'timeout'
          ? "Le serveur met trop de temps à répondre. Vérifiez votre connexion puis réessayez dans un instant."
          : "Connexion impossible pour le moment. Réessayez dans un instant."
      );
      return;
    }
    if (result?.success) {
      toast.success("Connexion reussie !");
      const user = result.data?.user;
      if (user?.role) redirectUserByRole(user.role, user.onboardingCompleted);
    } else {
      const msg = result?.error || "Echec de la connexion";
      toast.error(msg);
      setFailure(msg);
    }
  };

  if (isLoading && !sessionCheckStuck) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
        <Loader2 size={36} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 500, color: C.muted, marginTop: 16 }}>Verification de vos acces...</p>
        <Link href="/" style={{ marginTop: 20, fontSize: 13, color: C.forest, fontWeight: 600 }}>Retour à l&apos;accueil</Link>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.sand, padding: 16,
    }}>
      {/* Subtle bg gradient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0, background: 'radial-gradient(ellipse at 60% 20%, rgba(16,185,129,0.04) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(217,119,6,0.03) 0%, transparent 50%)' }} />

      <div style={{
        position: 'relative', zIndex: 1,
        background: C.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderRadius: 32, border: `1px solid ${C.border}`,
        padding: 36, width: '100%', maxWidth: 420,
        boxShadow: '0 8px 40px rgba(6,78,59,0.06)',
      }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: C.muted, textDecoration: 'none', marginBottom: 12 }}>
          <ArrowLeft size={14} /> Retour à l&apos;accueil
        </Link>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 56, height: 56, borderRadius: 18,
            background: 'rgba(16,185,129,0.08)', marginBottom: 16,
          }}>
            <Leaf size={28} style={{ color: C.forest }} />
          </div>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.5rem', fontWeight: 800, color: C.forest, letterSpacing: '-0.02em', marginBottom: 6 }}>
            Connexion a LADINI
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.muted }}>
            Connectons producteurs et consommateurs au Burkina Faso.
          </p>
        </div>

        {sessionCheckStuck && isLoading && (
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 12, color: C.muted, textAlign: 'center', marginBottom: 12 }}>
            La vérification de votre session est lente. Vous pouvez vous connecter ci-dessous.
          </p>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {failure && (
            <div role="alert" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.25)' }}>
              <AlertTriangle size={18} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#991B1B', lineHeight: 1.4 }}>
                <div style={{ fontWeight: 700 }}>{failure}</div>
                <div style={{ marginTop: 6, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                  <Link href="/" style={{ color: C.forest, fontWeight: 700 }}>Retour à l&apos;accueil</Link>
                  <Link href="/catalogue" style={{ color: C.forest, fontWeight: 700 }}>Voir le catalogue</Link>
                </div>
              </div>
            </div>
          )}

          {/* TÉLÉPHONE */}
          <div>
            <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Téléphone</label>
            <div style={{ position: 'relative' }}>
              <Phone size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, opacity: 0.6 }} />
              <input
                type="tel"
                {...register("phone", { onChange: (e) => { e.target.value = withBurkinaPrefix(e.target.value); } })}
                disabled={isSubmitting}
                inputMode="tel"
                autoComplete="tel"
                placeholder="+226 70 00 00 00"
                style={{
                  width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
                  borderRadius: 12, border: `1px solid ${errors.phone ? '#DC2626' : C.border}`,
                  background: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif", fontSize: 14,
                  color: C.forest, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {errors.phone && <p style={{ color: '#DC2626', fontSize: 11, fontWeight: 600, marginTop: 4 }}>{errors.phone.message}</p>}
          </div>

          {/* PASSWORD */}
          <div>
            <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, opacity: 0.6 }} />
              <input
                type="password"
                {...register("password")}
                disabled={isSubmitting}
                placeholder="Votre mot de passe"
                style={{
                  width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
                  borderRadius: 12, border: `1px solid ${errors.password ? '#DC2626' : C.border}`,
                  background: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif", fontSize: 14,
                  color: C.forest, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {errors.password && <p style={{ color: '#DC2626', fontSize: 11, fontWeight: 600, marginTop: 4 }}>{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%', padding: '14px 24px', borderRadius: 100,
              background: C.forest, color: '#fff', border: 'none', cursor: 'pointer',
              fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(6,78,59,0.15)',
              transition: 'all 0.2s', opacity: isSubmitting ? 0.6 : 1,
              marginTop: 4,
            }}
          >
            {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : failure ? "Réessayer" : "Se connecter"}
          </button>
        </form>

        <div style={{ marginTop: 28, textAlign: 'center' }}>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: C.muted }}>
            Pas encore de compte ?{' '}
            <Link href="/signup" style={{ color: C.forest, fontWeight: 700, textDecoration: 'none' }}>
              Creer un compte
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
