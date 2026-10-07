import * as React from "react"
import { cn } from "@/lib/utils"

// Variant map in place of class-variance-authority (no extra dependency).
const base =
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all outline-none cursor-pointer focus-visible:ring-[3px] focus-visible:ring-brand-purple/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-dark disabled:pointer-events-none disabled:opacity-60 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"

const variants = {
  default: "bg-brand-purple text-white shadow-lg shadow-brand-purple/25 hover:bg-brand-purple/90 hover:shadow-brand-purple/40",
  outline: "border border-white/10 bg-brand-black/40 text-white hover:bg-white/5 hover:border-white/20",
  ghost: "text-white hover:bg-white/5",
  link: "text-brand-purple underline-offset-4 hover:underline",
} as const

const sizes = {
  default: "h-10 px-4 py-2 has-[>svg]:px-3",
  sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
  lg: "h-12 px-6 text-base has-[>svg]:px-4",
  icon: "size-10",
} as const

type ButtonVariant = keyof typeof variants
type ButtonSize = keyof typeof sizes

function buttonVariants({ variant = "default", size = "default", className }: { variant?: ButtonVariant; size?: ButtonSize; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className)
}

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={buttonVariants({ variant, size, className })}
      {...props}
    />
  )
}

export { Button, buttonVariants }
