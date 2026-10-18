import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-xl text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-emerald-500 text-zinc-950 font-semibold hover:bg-emerald-400 shadow-sm shadow-emerald-500/20",
        outline: "border border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100",
        ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60",
        secondary: "bg-zinc-800 text-zinc-100 hover:bg-zinc-700/80",
        destructive: "bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20"
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-8 text-base",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />
  )
);
Button.displayName = "Button";
