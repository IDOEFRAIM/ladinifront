import React from 'react';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'destructive' | 'secondary';

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  variant?: BadgeVariant;
};

const variants: Record<BadgeVariant, string> = {
  default: 'bg-stone-100 text-stone-700',
  success: 'bg-forest-light text-forest',
  warning: 'bg-amber-light text-amber-muted',
  danger: 'bg-red-100 text-red-800',
  info: 'bg-blue-100 text-blue-800',
  outline: 'border border-soft-border text-muted bg-transparent',
  destructive: 'bg-red-100 text-red-800',
  secondary: 'bg-stone-50 text-stone-600',
};

export function Badge({ children, className = '', variant = 'default' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

export default Badge;
