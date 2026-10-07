import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-xl border border-white/10 bg-brand-black/70 px-4 text-base text-white shadow-xs transition-[color,border-color,box-shadow] outline-none selection:bg-brand-purple selection:text-white placeholder:text-brand-gray/60 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-white/20 focus-visible:border-brand-purple focus-visible:ring-[3px] focus-visible:ring-brand-purple/40",
        "aria-invalid:border-red-500 aria-invalid:ring-red-500/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
