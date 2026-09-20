'use client';

import React from 'react';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { C, F } from '@/features/checkout/components/checkout/checkout-ui';
import { useCheckout } from '@/features/checkout/components/checkout/useCheckout';
import CustomerInfoCard from '@/features/checkout/components/checkout/CustomerInfoCard';
import DeliveryPointCard from '@/features/checkout/components/checkout/DeliveryPointCard';
import PaymentMethodCard from '@/features/checkout/components/checkout/PaymentMethodCard';
import OrderTotalCard from '@/features/checkout/components/checkout/OrderTotalCard';

export default function CheckoutPage() {
  const {
    items, cartTotal, router, isOnline, isMounted, isProcessing, globalError, setGeoData,
    register, handleSubmit, watch, onSubmit,
  } = useCheckout();

  if (!isMounted) return null;

  return (
    <div style={{ background: C.sand, color: C.text, minHeight: '100vh', padding: '24px 5%' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        
        <header style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <button 
                onClick={() => router.back()} 
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, marginBottom: 8 }}
            >
                <ArrowLeft size={16} /> Retour
            </button>
            <h1 style={{ fontFamily: F.heading, fontSize: '1.8rem', fontWeight: 800, color: C.forest, margin: 0 }}>Finalisation</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
             <span style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase' }}>Panier</span>
             <p style={{ fontWeight: 800, color: C.forest }}>{items.length} Article(s)</p>
          </div>
        </header>

        {globalError && (
          <div style={{ background: '#FEF2F2', color: C.error, padding: 16, borderRadius: 16, marginBottom: 24, border: `1px solid ${C.error}20`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertCircle size={20} />
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{globalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32 }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <CustomerInfoCard register={register} isProcessing={isProcessing} />
            <DeliveryPointCard onChange={setGeoData} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <PaymentMethodCard register={register} watch={watch} isProcessing={isProcessing} />
            <OrderTotalCard cartTotal={cartTotal} isOnline={isOnline} isProcessing={isProcessing} />
          </div>
        </form>
      </div>
    </div>
  );
}
