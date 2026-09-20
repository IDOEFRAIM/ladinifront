'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';
import { C, F } from '@/features/orders/components/tracking/tracking-ui';
import { useTracking } from '@/features/orders/components/tracking/useTracking';
import { TrackingLoading, TrackingError } from '@/features/orders/components/tracking/TrackingScreens';
import OtpCard from '@/features/orders/components/tracking/OtpCard';
import TrackingStepper from '@/features/orders/components/tracking/TrackingStepper';
import RiderCard from '@/features/orders/components/tracking/RiderCard';
import ParcelSummary from '@/features/orders/components/tracking/ParcelSummary';

export default function TrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.orderId as string;
  const { data, loading, refreshing, error, copied, fetchTracking, copyOTP } = useTracking(orderId);

  if (loading) return <TrackingLoading />;
  if (error) return <TrackingError message={error} onBack={() => router.push('/buyer-dashboard')} />;

  const { order, delivery, timeline, isFailed, items } = data || {};

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '16px 20px 60px' }}>
      
      {/* Header Mobile-First */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={() => router.back()} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 14, border: `1px solid ${C.border}`, background: '#fff', cursor: 'pointer', transition: 'all 0.2s' }}>
          <ArrowLeft size={20} color={C.forest} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
             <h1 style={{ fontFamily: F.heading, fontSize: '1.2rem', fontWeight: 800, color: C.forest, margin: 0 }}>Suivi Live</h1>
             {refreshing && <Loader2 size={12} className="animate-spin" color={C.emerald} />}
          </div>
          <span style={{ fontFamily: F.body, fontSize: 11, color: C.muted, fontWeight: 600 }}>REF #{orderId?.substring(0, 8).toUpperCase()}</span>
        </div>
        <button onClick={() => fetchTracking(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 100, border: `1px solid ${C.border}`, background: refreshing ? C.sand : '#fff', cursor: 'pointer', fontFamily: F.body, fontSize: 12, fontWeight: 700, color: C.forest }}>
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? '...' : 'Actualiser'}
        </button>
      </div>

      {delivery?.deliveryCode && order?.status !== 'DELIVERED' && !isFailed && (
        <OtpCard code={delivery.deliveryCode} copied={copied} onCopy={copyOTP} />
      )}

      <TrackingStepper timeline={timeline} isFailed={Boolean(isFailed)} />

      {delivery?.agent && <RiderCard delivery={delivery} agent={delivery.agent} />}

      <ParcelSummary items={items} order={order} />

    </div>
  );
}
