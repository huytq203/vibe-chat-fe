'use client';
import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const separatorVariants = tv({
  base: 'shrink-0 bg-border',
  variants: {
    orientation: {
      horizontal: 'h-[1px] w-full',
      vertical: 'h-full w-[1px]',
    },
    variant: {
      default: 'bg-border',
      muted: 'bg-muted',
      primary: 'bg-primary/20',
      dashed: 'bg-transparent border-0 border-border border-dashed',
    },
  },
  compoundVariants: [
    { orientation: 'horizontal', variant: 'dashed', className: 'border-t h-0' },
    { orientation: 'vertical', variant: 'dashed', className: 'border-l w-0' },
  ],
  defaultVariants: {
    orientation: 'horizontal',
    variant: 'default',
  },
});

/** Props for the Separator component */
export interface SeparatorProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof separatorVariants> {
  /** When true, the separator is purely visual and hidden from assistive technology */
  decorative?: boolean;
}

const Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
  ({ className, orientation = 'horizontal', variant, decorative = true, ...props }, ref) => (
    <div
      ref={ref}
      role={decorative ? 'none' : 'separator'}
      aria-orientation={decorative ? undefined : orientation}
      className={separatorVariants({ orientation, variant, className })}
      {...props}
    />
  )
);
Separator.displayName = 'Separator';

export { Separator, separatorVariants };
