import { motion } from "framer-motion";
import { cn } from "@/src/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const variants = {
      primary: "bg-red-700 text-white hover:brightness-110 shadow-md",
      secondary: "bg-yellow-400 text-red-900 hover:brightness-105 shadow-md",
      outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm",
      ghost: "text-slate-400 hover:text-red-600 transition-colors",
    };

    const sizes = {
      sm: "px-4 py-1.5 text-sm",
      md: "px-6 py-2.5",
      lg: "px-8 py-3.5 text-lg",
    };

    return (
      <motion.button
        ref={ref}
        whileHover={{ brightness: 1.1 }}
        whileTap={{ scale: 0.96, translateY: 2 }}
        className={cn(
          "relative inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:opacity-50 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button };
