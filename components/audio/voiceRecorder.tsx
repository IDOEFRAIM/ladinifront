"use client";

import React, { useEffect, useRef, useState } from "react";
import AudioPlayer from "./AudioPlayer";
import Waveform from "./waveForm";

const THEME = {
    record: "#D32F2F",
    stop: "#333333",
    bg: "#F5F5F5",
};

interface VoiceRecorderProps {
    onRecordingComplete: (audioBlob: Blob | null) => void;
}

export default function VoiceRecorder({ onRecordingComplete }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [timer, setTimer] = useState(0);
    const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [permissionState, setPermissionState] = useState<"granted" | "denied" | "prompt" | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const timerIntervalRef = useRef<number | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
            if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
            if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
            if (audioContextRef.current && audioContextRef.current.state !== "closed") audioContextRef.current.close();
            if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
        };
    }, []);

    const startRecording = async () => {
        try {
            setError(null);
            try {
                if ((navigator as any).permissions?.query) {
                    const p = await (navigator as any).permissions.query({ name: "microphone" });
                    setPermissionState(p.state);
                    p.onchange = () => setPermissionState(p.state);
                }
            } catch (_) {}

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext) as any;
            const ctx = new AudioCtx();
            audioContextRef.current = ctx;

            const source = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            if (ctx.state === "suspended") await ctx.resume();
            setAnalyserNode(analyser);

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });
                onRecordingComplete(blob);
                if (isMounted.current) setAudioURL(URL.createObjectURL(blob));
                streamRef.current?.getTracks().forEach((t) => t.stop());
                streamRef.current = null;
            };

            mediaRecorder.start();
            setIsRecording(true);
            setTimer(0);
            timerIntervalRef.current = window.setInterval(() => setTimer((p) => p + 1), 1000);
        } catch (err: any) {
            console.error("Erreur accès micro:", err);
            const name = err?.name;
            if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") {
                setError("Permission refusée. Autorisez le micro depuis les paramètres du navigateur.");
                setPermissionState("denied");
            } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
                setError("Aucun périphérique micro trouvé.");
                setPermissionState("denied");
            } else {
                setError(err?.message || "Erreur lors de l'accès au micro");
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
        setIsRecording(false);
        if (timerIntervalRef.current) window.clearInterval(timerIntervalRef.current);
    };

    const deleteRecording = () => {
        if (audioURL) URL.revokeObjectURL(audioURL);
        setAudioURL(null);
        onRecordingComplete(null);
        setTimer(0);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    };

    return (
        <div className="mt-4 p-4 rounded-lg border border-dashed border-slate-300 text-center" style={{ backgroundColor: THEME.bg }}>
            <label className="block font-bold mb-3 text-sm text-slate-500 uppercase tracking-tight">🎤 Ajouter une note vocale</label>

            {error && !audioURL && (
                <div style={{ marginBottom: 12, color: "#B91C1C", fontWeight: 700 }}>
                    <div>{error}</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 500, marginTop: 8 }}>
                        Vérifiez : paramètres du site → Microphone, ou Paramètres système → Confidentialité → Microphone.
                    </div>
                    <div style={{ marginTop: 8 }}>
                        <button
                            onClick={() => {
                                setError(null);
                                startRecording();
                            }}
                            style={{ padding: "8px 12px", borderRadius: 8, background: "#D32F2F", color: "white", border: "none" }}
                        >
                            Réessayer
                        </button>
                    </div>
                </div>
            )}

            {!audioURL ? (
                <div className="flex flex-col items-center gap-4">
                    <div className="w-full max-w-[300px] h-12 flex items-center justify-center">
                        <Waveform analyser={analyserNode} isRecording={isRecording} />
                    </div>

                    {isRecording ? (
                        <div className="text-red-600 font-bold animate-pulse text-sm">ENREGISTREMENT... {formatTime(timer)}</div>
                    ) : (
                        <div className="text-xs text-slate-400">(Appuyez pour commencer)</div>
                    )}

                    <button
                        type="button"
                        onClick={isRecording ? stopRecording : startRecording}
                        style={{ backgroundColor: isRecording ? THEME.stop : THEME.record, transition: "all 0.2s ease" }}
                        className="w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center text-2xl active:scale-90"
                    >
                        {isRecording ? "⏹" : "🎙"}
                    </button>
                </div>
            ) : (
                <div className="flex justify-center">
                    <AudioPlayer src={audioURL} onDelete={deleteRecording} />
                </div>
            )}
        </div>
    );
}