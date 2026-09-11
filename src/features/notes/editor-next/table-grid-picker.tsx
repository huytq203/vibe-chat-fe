"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";

const MAX = 8;

/**
 * Bộ chọn dạng lưới kiểu Notion: di chuột để chọn số cột × hàng rồi nhấp để
 * chèn. Thay thao tác chèn "3×3" cố định cũ để chọn trước kích thước bảng.
 * Được dùng chung bởi menu bảng trên thanh công cụ và overlay chèn của lệnh `/`.
 */
export function TableGridPicker({ onPick }: { onPick: (rows: number, cols: number) => void }) {
  const [hover, setHover] = useState<{ r: number; c: number }>({ r: 1, c: 1 });

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-8 gap-[3px]">
        {Array.from({ length: MAX * MAX }).map((_, i) => {
          const r = Math.floor(i / MAX) + 1;
          const c = (i % MAX) + 1;
          const active = r <= hover.r && c <= hover.c;
          return (
            <button
              key={i}
              type="button"
              aria-label={`${c} cột × ${r} hàng`}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => onPick(r, c)}
              className={cn(
                "size-4 rounded-[3px] border transition-colors",
                active
                  ? "border-primary bg-primary"
                  : "border-border bg-popover hover:border-primary",
              )}
            />
          );
        })}
      </div>
      <span className="text-center text-sm text-muted-foreground tabular-nums">
        {hover.c} cột × {hover.r} hàng
      </span>
    </div>
  );
}
