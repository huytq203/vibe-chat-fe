"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button/Button";

type QuickActionProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
};

export function QuickAction({ icon, label, active, onClick }: QuickActionProps) {
  return (
    <Button
      variant={active ? "solid" : "ghost"}
      onClick={onClick}
      className="h-auto  rounded-lg px-1 py-2.5 text-muted-foreground bg-primary/10 hover:text-primary">
      <div className="flex flex-col items-center gap-1">
        {icon}
        <span className="text-[10.5px] font-medium">{label}</span>
      </div>
    </Button>
  );
}
