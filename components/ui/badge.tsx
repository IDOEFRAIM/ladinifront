import React from 'react';

type BadgeProps = {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'destructive' | 'secondary';
};

export function Badge({ children, className = '', variant = 'default' }: BadgeProps) {
  const variants: Record<string, string> = {
    default: 'bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs',
    outline: 'border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs',
    destructive: 'bg-red-100 text-red-800 px-2 py-0.5 rounded-full text-xs',
    secondary: 'bg-gray-50 text-gray-600 px-2 py-0.5 rounded-full text-xs',
  };
  const classes = [variants[variant], className].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
}

export default Badge;
