import React from 'react';

interface TextAreaProps extends React.TextAreaHTMLAttributes<HTMLTextAreaElement> 
{
    variant?: 'default' | 'outline' | 'ghost';
    fullWidth?: boolean;
}

const TextArea: React.FC<TextAreaProps> = ({ variant = 'default', fullWidth = false, className = '', ...props }) => 
{
    const baseStyles = `px-4 py-3 rounded-xl text-white bg-brand-black border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-blue 
        focus:border-transparent placeholder-brand-gray resize-none`;

    const variants =
    {
        default: "border-white/10",
        outline: "border-brand-purple focus:ring-brand-purple",
        ghost: "border-transparent bg-brand-dark focus:ring-brand-blue"
    };

    return (
        <textarea className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props} />
    );
};

export default TextArea;