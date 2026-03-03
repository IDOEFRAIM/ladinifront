'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FaPlay, FaPause, FaTrash } from 'react-icons/fa';

interface AudioPlayerProps {
    src: string | Blob;
    onDelete?: () => void;
}

export default function AudioPlayer({ src, onDelete }: AudioPlayerProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);

    // 1. Gestion sécurisée de l'URL Blob
    const audioSrc = useMemo(() => {
        if (typeof src === 'string') return src;
        return URL.createObjectURL(src);
    }, [src]);

    useEffect(() => {
        return () => {
            if (typeof src !== 'string') {
                URL.revokeObjectURL(audioSrc);
            }
        };
    }, [audioSrc, src]);

    // 2. Synchronisation de l'état avec les événements réels de l'audio
    const togglePlay = async () => {
        if (!audioRef.current) return;
        
        try {
            if (audioRef.current.paused) {
                await audioRef.current.play();
            } else {
                audioRef.current.pause();
            }
        } catch (err) {
            console.error("Erreur de lecture audio :", err);
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const current = audioRef.current.currentTime;
            const total = audioRef.current.duration;
            setCurrentTime(current);
            if (total > 0) {
                setProgress((current / total) * 100);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !duration) return;
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left; // Plus précis que offsetX
        const width = rect.width;
        const newTime = (x / width) * duration;
        
        audioRef.current.currentTime = newTime;
        // On met à jour l'état immédiatement pour une sensation de réactivité
        setCurrentTime(newTime);
        setProgress((x / width) * 100);
    };

    const formatTime = (time: number) => {
        if (isNaN(time)) return "0:00";
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    return (
        <div className="flex items-center gap-4 bg-white p-3 rounded-[2rem] shadow-sm border border-slate-100 w-full max-w-md">
            <audio 
                ref={audioRef} 
                src={audioSrc} 
                onTimeUpdate={handleTimeUpdate}
                onEnded={() => setIsPlaying(false)}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onLoadedMetadata={handleLoadedMetadata}
                preload="metadata"
            />

            <button 
                onClick={togglePlay}
                type="button"
                aria-label={isPlaying ? "Pause" : "Play"}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-md shrink-0"
            >
                {isPlaying ? <FaPause size={12} /> : <FaPlay size={12} className="ml-1" />}
            </button>

            <div className="flex-1 flex flex-col justify-center gap-1">
                <div 
                    className="h-2 bg-slate-100 rounded-full cursor-pointer relative overflow-hidden"
                    onClick={handleSeek}
                >
                    <div 
                        className="h-full bg-green-500 transition-all duration-100 ease-linear"
                        style={{ width: `${progress}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {onDelete && (
                <button 
                    onClick={onDelete}
                    type="button"
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                    <FaTrash size={14} />
                </button>
            )}
        </div>
    );
}