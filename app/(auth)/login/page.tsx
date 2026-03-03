'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Leaf, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { toast, Toaster } from 'react-hot-toast';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const C = {
  forest: '#064E3B', emerald: '#10B981', amber: '#D97706', sand: '#F9FBF8',
  glass: 'rgba(255, 255, 255, 0.72)', border: 'rgba(6, 78, 59, 0.07)', muted: '#64748B',
};

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis"),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading, userRole } = useAuth();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema)
  });

  const redirectUserByRole = (role: string) => {
    const n = role?.toUpperCase();
    if (n === 'ADMIN') router.push('/admin');
    else if (n === 'PRODUCER') router.push('/dashboard');
    else router.push('/market');
  };

  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole) redirectUserByRole(userRole);
  }, [isAuthenticated, isLoading, userRole]);

  const onSubmit = async (data: LoginFormInputs) => {
    const result = await login(data.email, data.password);
    if (result?.success) {
      toast.success("Connexion reussie !");
      if (result.user?.role) redirectUserByRole(result.user.role);
    } else {
      toast.error(result?.error || "Echec de la connexion");
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.sand }}>
        <Loader2 size={36} style={{ color: C.emerald, animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 15, fontWeight: 500, color: C.muted, marginTop: 16 }}>Verification de vos acces...</p>
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
            Connexion a FrontAg
          </h2>
          <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, color: C.muted }}>
            Connectons producteurs et consommateurs au Burkina Faso.
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* EMAIL */}
          <div>
            <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.muted, opacity: 0.6 }} />
              <input
                type="email"
                {...register("email")}
                disabled={isSubmitting}
                placeholder="votre@email.com"
                style={{
                  width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 14, paddingBottom: 14,
                  borderRadius: 12, border: `1px solid ${errors.email ? '#DC2626' : C.border}`,
                  background: 'rgba(255,255,255,0.6)', fontFamily: "'Inter', sans-serif", fontSize: 14,
                  color: C.forest, outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            {errors.email && <p style={{ color: '#DC2626', fontSize: 11, fontWeight: 600, marginTop: 4 }}>{errors.email.message}</p>}
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
            {isSubmitting ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : "Se connecter"}
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
