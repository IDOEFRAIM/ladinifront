import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', id, ...props }: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label htmlFor={inputId} className="text-xs font-bold text-muted uppercase tracking-wide">{label}</label>}
      <input
        id={inputId}
        className={`w-full px-3 py-2.5 border border-stone-300 rounded-[var(--radius-input)] bg-white text-stone-900 placeholder:text-stone-400 focus:ring-2 focus:ring-success focus:border-success outline-none transition-colors ${className}`}
        {...props}
      />
    </div>
  );
}

export default Input;
