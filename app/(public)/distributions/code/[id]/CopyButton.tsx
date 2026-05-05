'use client';
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
        copied
          ? 'bg-emerald-500 text-white'
          : 'bg-white text-emerald-900 hover:bg-emerald-50'
      }`}
    >
      {copied ? <><Check size={16} /> Copie !</> : <><Copy size={16} /> Copier le code</>}
    </button>
  );
}