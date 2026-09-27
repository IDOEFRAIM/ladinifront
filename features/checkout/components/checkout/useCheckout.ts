'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { useCart } from '@/features/checkout/context/CartContext';
import { useNetwork } from '@/hooks/useNetwork';
import { useAuth } from '@/hooks/useAuth';
import { queueOfflineOrder } from '@/lib/dexie';
import { createOrderAction } from '@/features/checkout/actions/create-order.actions';
import { asError } from '@/lib/errors';
import type { CheckoutFormData, GeoUpdateData } from '@/features/checkout/components/checkout/checkout.types';

/** État du formulaire de commande, règles de validation et envoi (en ligne ou file hors-ligne). */
export function useCheckout() {
  const { items, cartTotal, clearCart } = useCart();
  const router = useRouter();
  const isOnline = useNetwork();
  const { userLocation, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  const [isMounted, setIsMounted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [geoData, setGeoData] = useState<GeoUpdateData | null>(null);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CheckoutFormData>({
    defaultValues: { name: '', phone: '', city: 'Ouagadougou', paymentMethod: 'mobile_money' }
  });

  useEffect(() => { 
    setIsMounted(true); 
    // Redirection si panier vide (sauf si on est déjà en train de process)
    if (isMounted && items.length === 0 && !isProcessing) {
        router.push('/cart');
    }
    setValue('name', localStorage.getItem('agri_customer_name') || ''); 
    setValue('phone', localStorage.getItem('agri_customer_phone') || ''); 
  }, [items.length, isMounted, router, setValue]);

  const onSubmit: SubmitHandler<CheckoutFormData> = async (formData) => {
    if (isProcessing || isAuthLoading) return;

    // Fix: Capturer le total actuel pour éviter le 0 lors du clearCart éventuel
    const finalPrice = cartTotal;

    if (items.length === 0) {
      setGlobalError("Votre panier est vide.");
      return;
    }

    if (!geoData?.lat || !geoData?.lng) {
      setGlobalError("Localisation précise requise pour la livraison.");
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return;
    }

    if (!isAuthenticated) {
      return router.push(`/login?next=/checkout`);
    }

    setIsProcessing(true);
    setGlobalError('');

    try {
      const orderPayload = {
        customer: { name: formData.name.trim(), phone: formData.phone.trim() },
        delivery: { 
          lat: geoData.lat, 
          lng: geoData.lng, 
          description: geoData.description || "", 
          city: formData.city 
        },
        items: items.map(i => ({ id: i.id, qty: i.quantity, price: Number(i.price) })),
        totalAmount: finalPrice,
        paymentMethod: formData.paymentMethod,
        locationId: userLocation?.id
      };

      // Persistence locale pour confort utilisateur
      localStorage.setItem('agri_customer_name', formData.name);
      localStorage.setItem('agri_customer_phone', formData.phone);

      if (isOnline) {
        const fd = new FormData();
        fd.append('data', JSON.stringify(orderPayload));
        if (geoData?.audioBlob) {
          fd.append('voiceNote', geoData.audioBlob, `voice_${Date.now()}.webm`);
        }

        const result = await createOrderAction(fd);
        if (result?.success) {
          // IMPORTANT: On ne fait PAS clearCart() ici pour éviter le saut à 0
          router.push(`/checkout/success?orderId=${result.data.orderId}&mode=live`);
        } else {
          throw new Error(result?.error || "Erreur lors de la création de la commande.");
        }
      } else {
        // Mode Offline
        await queueOfflineOrder({
          productIds: items.map(i => ({ productId: i.id, quantity: i.quantity })),
          totalAmount: finalPrice,
          customerName: formData.name,
          customerPhone: formData.phone,
          deliveryDesc: geoData.description || formData.city,
          voiceNoteBlob: geoData.audioBlob || null,
          gpsLat: geoData.lat,
          gpsLng: geoData.lng
        });
        router.push(`/checkout/success?mode=offline`);
      }
    } catch (_err: unknown) {
    const err = asError(_err);
      setGlobalError(err.message || "Un problème technique empêche la commande.");
      setIsProcessing(false);
    }
  };

  return {
    items, cartTotal, router, isOnline, isMounted, isProcessing, globalError, setGeoData,
    register, handleSubmit, watch, onSubmit,
  };
}
