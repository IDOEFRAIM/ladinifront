'use client';

import React from 'react';
import { FaMicrophone } from 'react-icons/fa';
import AudioRecorder from '@/components/audio/voiceRecorder';

interface StepAudioProps {
  onRecordingComplete: (blob: Blob | null) => void;
  onNext: () => void;
}

export default function StepAudio({ onRecordingComplete, onNext }: StepAudioProps) {
  return (
    <div className="flex flex-col items-center space-y-8 animate-in slide-in-from-right-10 text-center">
      <div className="bg-green-100 text-green-700 w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-inner">
        <FaMicrophone size={36} />
      </div>
      <h3 className="font-black text-slate-800 uppercase italic">Message Vocal</h3>
      <AudioRecorder onRecordingComplete={onRecordingComplete} />
      <button
        type="button"
        onClick={onNext}
        className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest"
      >
        Vérifier l'annonce
      </button>
    </div>
  );
}
