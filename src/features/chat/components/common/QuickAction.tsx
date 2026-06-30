"use client";

import { forwardRef, type ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/ui/button/Button";
import { cn } from "@/lib/utils/cn";

type QuickActionProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
} & Omit<ButtonProps, "variant" | "children">;

/** Nút hành động nhanh (lưới ContactInfo). forwardRef + spread props → dùng được làm
 *  trigger của Popover (Base UI merge props/ref vào Button). */
export const QuickAction = forwardRef<HTMLButtonElement, QuickActionProps>(
  ({ icon, label, active, className, ...props }, ref) => (
    <Button
      ref={ref}
      variant={active ? "solid" : "ghost"}
      className={cn(
        "h-auto text-muted-foreground hover:bg-transparent focus-visible:bg-transparent",
        className,
      )}
      {...props}
    >
      <div className="flex flex-col items-center gap-1">
        <span className="bg-primary/10 hover:text-primary rounded-full p-3">
        {icon}

        </span>
        <span className="text-[10.5px] font-medium">{label}</span>
      </div>
    </Button>
  ),
);
QuickAction.displayName = "QuickAction";
