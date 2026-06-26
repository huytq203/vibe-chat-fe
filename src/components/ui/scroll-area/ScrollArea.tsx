'use client';
import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const scrollAreaVariants = tv({
  base: 'relative overflow-auto [scrollbar-width:thin] [scrollbar-color:hsl(var(--border))_transparent] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/40',
  variants: {
    orientation: {
      vertical: 'overflow-x-hidden overflow-y-auto',
      horizontal: 'overflow-y-hidden overflow-x-auto',
      both: 'overflow-auto',
    },
  },
  defaultVariants: {
    orientation: 'vertical',
  },
});

/** Props for the ScrollArea component */
export interface ScrollAreaProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof scrollAreaVariants> {}

const ScrollArea = React.forwardRef<HTMLDivElement, ScrollAreaProps>(
  ({ className, orientation, children, ...props }, ref) => (
    <div ref={ref} className={scrollAreaVariants({ orientation, className })} {...props}>
      {children}
    </div>
  ),
);
ScrollArea.displayName = 'ScrollArea';

export { ScrollArea };
