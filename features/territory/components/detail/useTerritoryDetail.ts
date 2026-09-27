'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { getLocations, updateLocation, getClimaticRegions } from '@/features/territory/actions/territory.actions';
import { ZoneDetail } from '@/features/territory/components/detail/territory-detail.types';
import { getStatChanges, createFeedItem, mapZoneToForm, extractCounts } from '@/features/territory/components/detail/territory-detail.utils';
import { useCounterAnimation } from '@/features/territory/components/detail/useCounterAnimation';

// 2. HOOK PRINCIPAL
export function useTerritoryDetail(territoryId: string) {
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [zone, setZone] = useState<ZoneDetail | null>(null);
  const [regions, setRegions] = useState<{id: string, name: string}[]>([]);
  const [feed, setFeed] = useState<unknown[]>([]);
  const [form, setForm] = useState(mapZoneToForm({}));

  const { displayCounts, animate } = useCounterAnimation({ producers: 0, orders: 0, farms: 0 });
  const prevCountsRef = useRef<any>(null);

  // Gère les animations et le feed sans polluer la fonction de fetch
  const handleDataSync = useCallback((newZone: any) => {
    const counts = extractCounts(newZone);
    const changes = getStatChanges(prevCountsRef.current, counts);

    changes.forEach(key => {
      type CountKey = 'producers' | 'orders' | 'farms';
      animate(key as CountKey, prevCountsRef.current[key as CountKey], counts[key as CountKey]);
    });

    if (prevCountsRef.current?.orders !== counts.orders) {
      setFeed(f => [createFeedItem(counts.orders - prevCountsRef.current.orders), ...f].slice(0, 6));
    }
    prevCountsRef.current = counts;
  }, [animate]);

  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const [zRes, rRes] = await Promise.all([getLocations(), getClimaticRegions()]);
      const found = zRes.data?.find((z) => z.id === territoryId);

      if (found) {
        setZone(found);
        setForm(mapZoneToForm(found));
        handleDataSync(found);
      }
      if (rRes.success && rRes.data) setRegions(rRes.data.map((r: any) => ({ id: r.id, name: r.name })));
    } finally {
      setLoading(false);
    }
  }, [territoryId, handleDataSync]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(timer);
  }, [fetchData]);

  const handleUpdate = async () => {
    const loader = toast.loading("Mise à jour...");
    const payload = { 
      ...form, 
      latitude: parseFloat(form.latitude) || 0, 
      longitude: parseFloat(form.longitude) || 0 
    };
    
    const res = await updateLocation(territoryId, payload);
    const isSuccess = res.success;

    toast[isSuccess ? 'success' : 'error'](
      isSuccess ? "Synchronisé" : ('error' in res && typeof res.error === 'string' ? res.error : "Erreur"),
      { id: loader }
    );
    
    if (isSuccess) {
      setIsEditing(false);
      fetchData(true);
    }
  };

  return { loading, isEditing, setIsEditing, zone, regions, feed, displayCounts, form, setForm, handleUpdate };
}
