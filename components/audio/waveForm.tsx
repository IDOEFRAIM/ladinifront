'use client';

import React, { useRef, useEffect } from 'react';

const THEME = {
    barBase: '#1A237E',   // Indigo
    barPeak: '#A63C06',   // Ocre
};

interface WaveformProps {
    analyser: AnalyserNode | null;
    isRecording: boolean;
}

export default function Waveform({ analyser, isRecording }: WaveformProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !analyser) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Configuration audio
        analyser.fftSize = 64; 
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const render = () => {
            // On continue l'animation tant que c'est monté, mais on ne dessine rien si !isRecording
            animationRef.current = requestAnimationFrame(render);

            const ratio = window.devicePixelRatio || 1;
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            // Ajuster la résolution interne du canvas (évite le flou)
            if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
                canvas.width = width * ratio;
                canvas.height = height * ratio;
                ctx.scale(ratio, ratio);
            }

            // Nettoyage complet
            ctx.clearRect(0, 0, width, height);

            if (!isRecording) return;

            analyser.getByteFrequencyData(dataArray);

            const barWidth = (width / bufferLength) * 1.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                // On réduit un peu l'amplitude pour ne pas toucher les bords (0.8)
                const barHeight = (dataArray[i] / 255) * height * 0.8;
                
                // Calcul pour centrer verticalement (look symétrique)
                const y = (height - barHeight) / 2;

                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                gradient.addColorStop(0, THEME.barPeak);
                gradient.addColorStop(1, THEME.barBase);

                ctx.fillStyle = gradient;
                
                // Dessin de la barre arrondie centrée
                drawRoundRect(ctx, x, y, barWidth - 2, barHeight, 4);

                x += barWidth;
            }
        };

        render();

        return () => {
            if (animationRef.current) cancelAnimationFrame(animationRef.current);
        };
    }, [analyser, isRecording]);

    // Fonction optimisée pour les barres
    function drawRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
        if (h < 1) h = 2; // Hauteur minimale pour que la barre reste visible
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        ctx.fill();
    }

    return (
        <canvas 
            ref={canvasRef} 
            className="w-full h-15 block transition-colors duration-300"
            style={{ 
                backgroundColor: isRecording ? 'rgba(26, 35, 126, 0.05)' : 'transparent',
                borderRadius: '8px'
            }} 
        />
    );
}