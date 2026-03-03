"use client";

import React, { useState } from 'react';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { FaUser, FaPhone, FaMapMarkerAlt, FaEnvelope, FaLock, FaPalette } from 'react-icons/fa';

type FormData = {
  name: string;
  email: string;
  phone: string;
  location: string;
};

export default function ProducerSettingsForm({ initialData, producerId }: { initialData: FormData; producerId: string }) {
  const { register, handleSubmit } = useForm<FormData>({ defaultValues: initialData });
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/productor/settings', { ...data, producerId });
      if (!res || res.status < 200 || res.status >= 300) throw new Error('Erreur lors de la sauvegarde');
      alert('Profil mis à jour avec succès');
    } catch (err) {
      console.error(err);
      alert('Impossible de sauvegarder les paramètres.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1"><FaUser className="text-green-600"/> Nom</label>
        <input {...register('name')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1"><FaEnvelope className="text-green-600"/> Email</label>
        <input type="email" {...register('email')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1"><FaPhone className="text-green-600"/> Téléphone</label>
        <input {...register('phone')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1"><FaMapMarkerAlt className="text-green-600"/> Adresse</label>
        <input {...register('location')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-green-700 text-white rounded-xl font-bold">
          {isLoading ? 'Sauvegarde...' : 'Sauvegarder'}
        </button>
      </div>
    </form>
  );
}
