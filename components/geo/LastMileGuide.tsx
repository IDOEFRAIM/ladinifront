'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LocationPin } from './geolocalisationPin';
import VoiceRecorder from '@/components/audio/voiceRecorder';
import { MessageSquareText, Mic, Database, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

const OfflineMap = dynamic(() => import('./offlineMap'), { 
    ssr: false,
    loading: () => (
        <div style={{ 
            height: '220px', backgroundColor: '#F9F7F5', borderRadius: '12px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: '2px dashed #E0D7D0', color: '#A63C06', fontSize: '0.8rem', gap: '10px'
        }}>
            <Zap size={20} className="animate-pulse" />
            <span>Chargement de la carte...</span>
        </div>
    )
});

const THEME = {
    primary: '#A63C06',    
    secondary: '#2E7D32',  
    bg: '#FFFFFF',         
    surface: '#FDFCFB',    
    border: '#F1EDE9',     
    text: '#2D3436',
    muted: '#7F8C8D'
};

export default function LastMileGuide({ onChange }: { onChange: (data: any) => void }) {
    const [coords, setCoords] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
    const [description, setDescription] = useState('');
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (coords) {
                onChange({ lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy, description, audioBlob });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [coords, description, audioBlob, onChange]);

    return (
        <div style={{ backgroundColor: THEME.bg, padding: '20px' }}>
            {/* GPS ACTIVATION */}
            <div style={{ marginBottom: '20px' }}>
                <LocationPin onLocationFound={setCoords} />
            </div>

            {coords && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    
                    {/* CARTE CLAIRE */}
                    <div style={{ borderRadius: '16px', overflow: 'hidden', border: `1px solid ${THEME.border}`, position: 'relative' }}>
                        <OfflineMap lat={coords.lat} lng={coords.lng} />
                        <div style={{ 
                            position: 'absolute', bottom: '10px', right: '10px', 
                            backgroundColor: 'white', padding: '4px 8px', borderRadius: '6px',
                            fontSize: '0.65rem', border: `1px solid ${THEME.border}`, fontWeight: 'bold'
                        }}>
                            Précision: ±{Math.round(coords.accuracy)}m
                        </div>
                    </div>

                    {/* DESCRIPTION */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800', color: THEME.primary, marginBottom: '8px' }}>
                            <MessageSquareText size={16} /> Précisions pour le livreur
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={{ 
                                width: '100%', padding: '15px', backgroundColor: '#F9F9F9', 
                                border: `1px solid ${THEME.border}`, color: THEME.text,
                                minHeight: '90px', borderRadius: '12px', outline: 'none', fontSize: '0.9rem'
                            }}
                            placeholder="Ex: Maison clôturée en blanc, juste après la boutique..."
                        />
                    </div>

                    {/* AUDIO SECTION CLAIRE */}
                    <div style={{ padding: '20px', backgroundColor: '#F6FBF7', borderRadius: '16px', border: `1px solid #E1EFE3` }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '800', color: THEME.secondary, marginBottom: '12px' }}>
                            <Mic size={16} /> Note vocale de guidage
                        </label>
                        <VoiceRecorder onRecordingComplete={setAudioBlob} />
                    </div>
                </div>
            )}
        </div>
    );
}