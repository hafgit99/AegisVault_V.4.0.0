import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    className = '', 
    ...props 
}, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:grayscale';
    
    const variants = {
        primary: 'bg-[var(--color-sage-green)] text-white shadow-lg shadow-black/5 hover:brightness-110',
        secondary: 'bg-white/5 border border-white/10 text-white hover:bg-white/10',
        ghost: 'bg-transparent text-[var(--color-deep-navy)] hover:bg-black/5 dark:text-white dark:hover:bg-white/5',
        danger: 'bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600'
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-8 py-3.5 text-base'
    };

    return (
        <button
            ref={ref}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
});

Button.displayName = 'Button';
