import React from "react";

type LogoProps = { size?: "xs" | "sm" | "base" | "lg" | "xl"; variant?: "icon" | "full"; textVariant?: "white" | "gradient"; className?: string; textClassName?: string; };

export default function Logo({ size = "base", variant = "full", textVariant = "white", className = "", textClassName = "", }: LogoProps) 
{
    const sizes = 
    {
        xs:   { img: "w-6 h-6",   text: "text-lg" },
        sm:   { img: "w-10 h-10", text: "text-xl" },
        base: { img: "w-14 h-14", text: "text-3xl" },
        lg:   { img: "w-16 h-16", text: "text-4xl" },
        xl:   { img: "w-20 h-20", text: "text-5xl" },
    };

    const textStyle = textVariant === "gradient" ? "gradient-text" : "text-white";

    return (
        <div onClick={(() => window.location.href = '/')} className={`cursor-pointer flex items-center justify-center ${className}`}>
            <img src="/logo.png" alt="Logo Fluxo" className={`${sizes[size].img} object-contain`} />

            {variant === "full" && (
                <span className={`font-bebas tracking-tight text-white ${sizes[size].text} ${textStyle} ${textClassName}`}>
                    FLUXO
                </span>
            )}
        </div>
    );
}