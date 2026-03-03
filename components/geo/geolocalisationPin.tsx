'use client';

import React, { useEffect } from 'react';
import { useGeoLocation, GeoPoint } from '@/hooks/useGeoLocalisation';
import { Navigation, CheckCircle, RefreshCcw, Loader2 } from 'lucide-react';

const THEME = {
    ocre: '#A63C06',
    green: '#2E7D32',
    bgLight: '#FDFCFB',
    border: '#F1EDE9',
    text: '#2D3436'
};

export const LocationPin = ({ onLocationFound }: { onLocationFound: (loc: GeoPoint) => void }) => {
    const { location, error, isLoading, getLocation } = useGeoLocation();

    useEffect(() => {
        if (location) onLocationFound(location);
    }, [location, onLocationFound]);

    return (
        <div>
            {!location ? (
                <button
                    onClick={getLocation}
                    disabled={isLoading}
                    style={{
                        width: '100%', padding: '18px',
                        backgroundColor: isLoading ? '#F1EDE9' : THEME.ocre,
                        color: isLoading ? '#7F8C8D' : 'white',
                        border: 'none', borderRadius: '14px', fontWeight: '800',
                        cursor: isLoading ? 'wait' : 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                    }}
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Navigation size={20} />}
                    {isLoading ? 'Localisation en cours...' : 'Cliquer pour fixer ma position'}
                </button>
            ) : (
                <div style={{
                    padding: '15px', backgroundColor: '#F6FBF7',
                    border: `1px solid ${THEME.green}`, borderRadius: '14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <CheckCircle size={22} color={THEME.green} />
                        <div>
                            <div style={{ fontWeight: '800', fontSize: '0.9rem', color: THEME.text }}>Position fixée</div>
                            <div style={{ fontSize: '0.75rem', color: THEME.green, fontWeight: '600' }}>Signal GPS actif</div>
                        </div>
                    </div>
                    <button 
                        onClick={getLocation}
                        style={{ background: '#FFF', border: `1px solid ${THEME.border}`, padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                    >
                        <RefreshCcw size={16} color="#7F8C8D" />
                    </button>
                </div>
            )}

            {error && (
                <div style={{ marginTop: '10px', color: '#D63031', fontSize: '0.8rem', fontWeight: '600', padding: '10px', backgroundColor: '#FFF5F5', borderRadius: '10px' }}>
                    ⚠️ GPS : {error}. Merci d'autoriser l'accès.
                </div>
            )}
        </div>
    );
};