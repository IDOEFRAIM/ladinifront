import React from 'react';
import AdminDashboardClient from './AdminDashboardClient';
import { fetchAdminMetrics } from '@/app/actions/admin.server';

export default async function AdminDashboardPage() {
  // 1. On récupère la réponse du serveur
  const response = await fetchAdminMetrics();
  
  // 2. On n'envoie que la partie "metrics" (le contenu de data) au client
  // On ajoute un repli (fallback) {} pour éviter le crash si l'API échoue
  const initialMetrics = response?.success ? response.data : null;

  async function serverRefresh() {
    'use server'
    const res = await fetchAdminMetrics();
    // On renvoie directement la partie data pour que le client reçoive 
    // la même structure qu'au chargement initial
    return res?.success ? res.data : null;
  }

  return (
    <AdminDashboardClient 
      initialData={initialMetrics} 
      serverRefresh={serverRefresh} 
    />
  );
}