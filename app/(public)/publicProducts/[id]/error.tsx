'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Coffee, ArrowLeft, MessageSquareHeart } from 'lucide-react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
    
    useEffect(() => {
        // On garde la trace technique, mais on ne la montre pas à l'invité
        console.error("Petit accroc sur la route :", error);
    }, [error]);

    return (
        <div style={{ 
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#FDFCFB', // Teinte "sable chaud"
            padding: '24px',
            fontFamily: '"Plus Jakarta Sans", sans-serif'
        }}>
            <div style={{ 
                maxWidth: '500px', 
                textAlign: 'center',
                padding: '40px',
                backgroundColor: 'white',
                borderRadius: '40px',
                boxShadow: '0 30px 60px -12px rgba(166, 60, 6, 0.08)' // Ombre ocre très douce
            }}>
                
                {/* Une icône qui invite au calme */}
                <div style={{ 
                    fontSize: '64px', 
                    marginBottom: '24px',
                    display: 'block'
                }}>
                    ☕
                </div>

                <h2 style={{ 
                    color: '#2D3436', 
                    fontSize: '2rem', 
                    fontWeight: 900, 
                    marginBottom: '16px',
                    letterSpacing: '-0.02em'
                }}>
                    Oups, faisons une petite pause...
                </h2>
                
                <p style={{ 
                    color: '#636E72', 
                    fontSize: '1.1rem', 
                    lineHeight: '1.7',
                    marginBottom: '40px'
                }}>
                    On dirait qu'un petit caillou s'est glissé dans le moteur. <br/>
                    Rien de grave, c'est juste le temps pour nous de remettre les choses en ordre pour vous.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    {/* Bouton principal : L'invitation à réessayer */}
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '20px 32px',
                            backgroundColor: '#A63C06', // Ocre chaleureux
                            color: 'white',
                            border: 'none',
                            borderRadius: '20px',
                            cursor: 'pointer',
                            fontWeight: '800',
                            fontSize: '1.1rem',
                            boxShadow: '0 10px 25px rgba(166, 60, 6, 0.2)',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        On réessaye ensemble ?
                    </button>

                    {/* Bouton secondaire : La sortie sereine */}
                    <Link 
                        href="/catalogue" 
                        style={{
                            padding: '16px',
                            color: '#636E72',
                            textDecoration: 'none',
                            fontWeight: '700',
                            fontSize: '0.95rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px'
                        }}
                    >
                        <ArrowLeft size={18} /> Revenir tranquillement au marché
                    </Link>
                </div>

                {/* La main tendue finale */}
                <div style={{ 
                    marginTop: '48px', 
                    paddingTop: '24px', 
                    borderTop: '1px solid #F1EDE9',
                    color: '#B2BEC3',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px'
                }}>
                    <MessageSquareHeart size={20} color="#A63C06" />
                    <span>Un souci persistant ? <strong>On est là pour vous.</strong></span>
                </div>
            </div>
        </div>
    );
}