import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-forest text-white hover:brightness-105',
  secondary: 'bg-white text-forest border border-soft-border hover:shadow-sm',
  danger: 'bg-danger text-white hover:brightness-95',
  ghost: 'bg-transparent text-forest hover:bg-clay',
};

const sizeClasses = {
  sm: 'py-1.5 px-3 text-xs',
  md: 'py-2.5 px-5 text-sm',
  lg: 'py-3 px-6 text-base',
};

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-bold rounded-[var(--radius-button)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;
