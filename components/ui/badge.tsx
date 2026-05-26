import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider",
  {
    variants: {
      variant: {
        default: "border-[#FF2B2B]/40 bg-[#FF2B2B]/12 text-[#FF4D4D]",
        live: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
        muted: "border-[#1A222C] bg-[#080B0F] text-[#F4F7FA]/50",
        warn: "border-amber-500/40 bg-amber-500/10 text-amber-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
