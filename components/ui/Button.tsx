import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> 
{
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', fullWidth = false, children, className = '', ...props }) => 
{
    // min-h-11: every button is a >=44px touch target; inline-flex centers icon + label
    const baseStyles = `inline-flex min-h-11 items-center justify-center gap-2 rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 
        focus:ring-offset-2 focus:ring-brand-blue ring-offset-brand-black cursor-pointer`;
    
    const variants = 
    {
        primary:     "bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-lg shadow-brand-blue/30 hover:shadow-brand-purple/50",
        secondary:   "bg-white text-brand-black hover:bg-gray-100",
        outline:     "border border-brand-purple text-brand-purple hover:bg-brand-purple/10",
        destructive: "bg-red-500 text-white hover:bg-red-600",
    };

    const sizes =
    {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3",
        lg: "px-8 py-4 text-lg",
    };

    return (
        <button className={`${baseStyles} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;