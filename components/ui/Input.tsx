import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> 
{
    variant?: 'default' | 'outline' | 'ghost';
    fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({ variant = 'default', fullWidth = false, className = '', ...props }) => 
{
    const baseStyles = `min-w-0 px-4 py-3 rounded-xl text-base text-white bg-brand-black border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue 
        focus:border-transparent placeholder-brand-gray`;

    const variants =
    {
        default: "border-white/10",
        outline: "border-brand-purple focus:ring-brand-purple",
        ghost: "border-transparent bg-brand-dark focus:ring-brand-blue"
    };

    return (
        <input className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props} />
    );
};

export default Input;