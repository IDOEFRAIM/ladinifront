'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type CreateAuctionFn = (payload: Record<string, unknown>) => Promise<{ success?: boolean; ok?: boolean; id?: string; data?: { id?: string }; error?: string }>;

/** État, validations de dates et soumission du formulaire de création d'enchère. */
export function useNewAuctionForm(serverCreateAuction?: CreateAuctionFn) {
  const router = useRouter();
  const [form, setForm] = useState({
    subCategoryId: "",
    quantity: "",
    unit: "KG",
    maxPricePerUnit: "",
    deadline: "",
    incoterm: "DDP",
    deliveryLocation: "",
    deliveryDeadline: "",
    targetZoneId: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function onChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((s) => ({ ...s, [e.target.name]: e.target.value }));
    if (e.target.name === 'deadline') validateDate((e.target as HTMLInputElement).value);
    if (e.target.name === 'deliveryDeadline') validateDeliveryDate((e.target as HTMLInputElement).value);
  }

  function validateDate(value: string) {
    setError('');
    if (!value) return true;
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      setError('Date invalide');
      return false;
    }
    if (d <= new Date()) {
      setError('La date doit être dans le futur');
      return false;
    }
    return true;
  }

  function validateDeliveryDate(value: string) {
    setError('');
    if (!value) return true;
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      setError('Date de livraison invalide');
      return false;
    }
    if (d <= new Date()) {
      setError('La date de livraison doit être dans le futur');
      return false;
    }
    if (form.deadline) {
      const end = new Date(form.deadline);
      if (!isNaN(end.getTime()) && d <= end) {
        setError('La date limite de livraison doit être après la fin de l\'enchère');
        return false;
      }
    }
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateDate(form.deadline)) return;
    if (!validateDeliveryDate(form.deliveryDeadline)) return;
    setLoading(true);

    try {
      const payload = {
        subCategoryId: form.subCategoryId,
        quantity: Number(form.quantity),
        unit: form.unit,
        maxPricePerUnit: Number(form.maxPricePerUnit),
        deadline: new Date(form.deadline).toISOString(),
        incoterm: form.incoterm,
        deliveryLocation: form.deliveryLocation,
        deliveryDeadline: new Date(form.deliveryDeadline).toISOString(),
        targetZoneId: form.targetZoneId || undefined,
      };

      const res = typeof serverCreateAuction === 'function' 
        ? await serverCreateAuction(payload)
        : await fetch("/api/auctions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }).then(r => r.json());

      if (res.success || res.ok) {
        router.push(`/auction/${res.data?.id || res.id}`);
      } else {
        setError(res.error || "Erreur lors de la création");
      }
    } catch (err) {
      setError("Erreur réseau ou date invalide");
    } finally {
      setLoading(false);
    }
  }

  return { router, form, onChange, loading, error, onSubmit };
}
