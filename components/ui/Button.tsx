import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> 
{
    variant?: 'primary' | 'secondary' | 'outline' | 'destructive';
    fullWidth?: boolean;
    children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', fullWidth = false, children, className = '', ...props }) => 
{
    const baseStyles = `px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 focus:outline-none focus:ring-2 
        focus:ring-offset-2 focus:ring-brand-blue ring-offset-brand-black cursor-pointer`;
    
    const variants = 
    {
        primary:     "bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-lg shadow-brand-blue/30 hover:shadow-brand-purple/50",
        secondary:   "bg-white text-brand-black hover:bg-gray-100",
        outline:     "border border-brand-purple text-brand-purple hover:bg-brand-purple/10",
        destructive: "bg-red-500 text-white hover:bg-red-600",
    };

    return (
        <button className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
            {children}
        </button>
    );
};

export default Button;