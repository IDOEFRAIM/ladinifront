// hooks/useGeoLocation.ts
'use client';

import { useState } from 'react';

// Structure de nos coordonnées "Sahel"
export interface GeoPoint {
    lat: number;
    lng: number;
    accuracy: number; // En mètres (ex: 5m, 10m)
}

export function useGeoLocation() {
    const [location, setLocation] = useState<GeoPoint | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const getLocation = () => {
        if (!navigator.geolocation) {
            setError("Le GPS n'est pas supporté par ce navigateur.");
            return;
        }

        setIsLoading(true);
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                // Succès
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: Math.round(position.coords.accuracy),
                });
                setIsLoading(false);
            },
            (err) => {
                // Erreur
                setIsLoading(false);
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError("Vous devez autoriser la localisation pour être livré.");
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError("Signal GPS indisponible (êtes-vous en sous-sol ?).");
                        break;
                    case err.TIMEOUT:
                        setError("Le GPS met trop de temps à répondre.");
                        break;
                    default:
                        setError("Erreur de localisation inconnue.");
                }
            },
            // Options pour maximiser la précision
            {
                enableHighAccuracy: true, // Demande le vrai GPS, pas juste le Wifi
                timeout: 15000,           // On attend max 15s
                maximumAge: 0             // On ne veut pas une vieille position en cache
            }
        );
    };

    return { location, error, isLoading, getLocation };
}