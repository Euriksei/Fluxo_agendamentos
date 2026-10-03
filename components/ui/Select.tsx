import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> 
{
    variant?: 'primary' | 'secondary' | 'dark' | 'outline';
    fullWidth?: boolean;
    children: React.ReactNode;
}

const Select: React.FC<SelectProps> = ({ variant = 'primary', fullWidth = false, children, className = '', ...props }) => 
{
    const baseStyles = `px-4 py-3 rounded-lg font-medium transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue 
        ring-offset-brand-black disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer`;

    const variants = 
    {
        primary: `bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-lg shadow-brand-blue/30`,
        secondary: `bg-white text-brand-black border border-gray-300 focus:ring-gray-400`,
        dark: `bg-brand-black text-white border border-white/10 focus:ring-gray-400`,
        outline: `border border-brand-purple text-brand-purple bg-transparent focus:ring-brand-purple`
    };

    return (
        <select className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
            {children}
        </select>
    );
};

export default Select;