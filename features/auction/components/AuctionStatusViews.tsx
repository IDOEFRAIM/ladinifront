import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { C, F } from '@/features/auction/utils/auction-tokens';

export function LoadingView() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
      <Loader2 size={36} className="animate-spin" style={{ color: C.emerald }} />
      <p className="text-sm text-stone-500" style={{ fontFamily: F.body }}>Chargement de l'enchère…</p>
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <AlertTriangle size={40} style={{ color: C.amber }} />
      <p className="text-sm text-stone-600 text-center max-w-xs" style={{ fontFamily: F.body }}>{message}</p>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold text-white transition-all hover:brightness-105"
        style={{ background: `linear-gradient(135deg, ${C.forest}, ${C.emerald})` }}
      >
        <RefreshCw size={14} /> Réessayer
      </button>
    </div>
  );
}
