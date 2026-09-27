"use client";

import React, { useState, useEffect } from 'react';
import { useGeoLocation } from '@/hooks/useGeoLocalisation';
import axios from 'axios';
import { useForm } from 'react-hook-form';
import { FaUser, FaPhone, FaMapMarkerAlt, FaEnvelope } from 'react-icons/fa';

type FormData = {
  name: string;
  email: string;
  phone: string;
  location: string;
  whatsappEnabled: boolean;
  dailyAdviceTime: string;
  latitude: number;
  longitude: number;
  cnibNumber: string;
};

export default function ProducerSettingsForm({ 
  initialData, 
  producerId, 
  serverAction 
}: { 
  initialData: FormData; 
  producerId: string; 
  serverAction?: (data: FormData) => Promise<any> 
}) {
  const { register, handleSubmit, setValue, reset } = useForm<FormData>({ 
    defaultValues: initialData 
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const { location, getLocation, isLoading: geoLoading } = useGeoLocation();

  // Force la mise à jour si les données initiales changent
  useEffect(() => {
    if (initialData) {
      reset(initialData);
    }
  }, [initialData, reset]);

  // Mise à jour lors de la détection GPS
  useEffect(() => {
    if (location) {
      setValue('latitude', location.lat, { shouldDirty: true, shouldValidate: true });
      setValue('longitude', location.lng, { shouldDirty: true, shouldValidate: true });
    }
  }, [location, setValue]);

  async function onSubmit(data: FormData) {
    setIsLoading(true);
    try {
      if (serverAction) {
        await serverAction(data);
      } else {
        await axios.post('/api/productor/settings', { ...data, producerId });
      }
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
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
          <FaUser className="text-green-600"/> Nom
        </label>
        <input {...register('name')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
          <FaEnvelope className="text-green-600"/> Email
        </label>
        <input type="email" {...register('email')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
          <FaPhone className="text-green-600"/> Téléphone
        </label>
        <input {...register('phone')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-1">
          <FaMapMarkerAlt className="text-green-600"/> Adresse
        </label>
        <input {...register('location')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div className="flex items-center gap-2 py-2">
        <input type="checkbox" id="whatsapp" {...register('whatsappEnabled')} className="w-4 h-4 text-green-600" />
        <label htmlFor="whatsapp" className="text-sm font-medium text-gray-700">Recevoir via WhatsApp</label>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Heure de conseil quotidien</label>
        <input type="time" {...register('dailyAdviceTime')} className="px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <input 
          type="number" 
          step="any"
          {...register('latitude', { valueAsNumber: true })} 
          placeholder="Latitude" 
          className="px-3 py-2 border border-gray-300 rounded-lg" 
        />
        <input 
          type="number" 
          step="any"
          {...register('longitude', { valueAsNumber: true })} 
          placeholder="Longitude" 
          className="px-3 py-2 border border-gray-300 rounded-lg" 
        />
        <button 
          type="button" 
          onClick={() => getLocation()} 
          disabled={geoLoading}
          className="px-3 py-2 bg-green-700 text-white rounded-lg text-sm hover:bg-green-800 disabled:bg-gray-400"
        >
          {geoLoading ? '...' : 'Position'}
        </button>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700 block mb-1">Numéro CNIB</label>
        <input {...register('cnibNumber')} className="w-full px-4 py-2 border border-gray-300 rounded-lg" />
      </div>

      <button 
        type="submit" 
        disabled={isLoading} 
        className="w-full py-3 bg-green-700 text-white rounded-xl font-bold disabled:opacity-50"
      >
        {isLoading ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
      </button>
    </form>
  );
}