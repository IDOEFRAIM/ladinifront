'use client';

import { THEME } from '@/features/products/components/view/product-view.theme';
import { IconVolume2, IconVolumeX } from '@/features/products/components/view/ProductIcons';

export function AudioMessage({ product, isPlaying, setIsPlaying, audio, setAudio }: any) {
    if (!product.audioUrl) {
        return (
            <div style={{
                padding: '20px',
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                border: `1px dashed ${THEME.border}`,
                color: THEME.muted,
                fontSize: '0.9rem',
                fontWeight: 600
            }}>
                Audio non disponible pour ce produit.
            </div>
        );
    }

    const toggleAudio = () => {
        if (!audio) {
            const newAudio = new Audio(`/uploads/audio/${product.audioUrl}`);
            setAudio(newAudio);
            newAudio.play();
            setIsPlaying(true);
            newAudio.onended = () => setIsPlaying(false);
        } else {
            if (isPlaying) {
                audio.pause();
            } else {
                audio.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div style={{ 
            padding: '24px', backgroundColor: THEME.active, borderRadius: '24px', 
            display: 'flex', alignItems: 'center', gap: '20px', border: `1px solid ${THEME.accent}33`
        }}>
            <div style={{ 
                width: '50px', height: '50px', borderRadius: '50%', backgroundColor: THEME.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white'
            }}>
                {isPlaying ? <IconVolume2 /> : <IconVolumeX />}
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: THEME.accent }}>MESSAGE DU PRODUCTEUR</div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                    {product.producer?.name || 'Producteur inconnu'}
                </div>
            </div>
            <button onClick={toggleAudio} style={{ 
                backgroundColor: THEME.secondary, color: 'white', border: 'none', 
                padding: '10px 20px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer' 
            }}>
                {isPlaying ? 'PAUSE' : 'ÉCOUTER'}
            </button>
        </div>
    );
}

// --- COMPOSANT PRINCIPAL ---
