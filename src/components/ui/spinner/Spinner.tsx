'use client';
import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const spinnerVariants = tv({
  base: 'animate-spin rounded-full border-2 border-current border-t-transparent',
  variants: {
    size: {
      xs: 'h-3 w-3 border-[1.5px]',
      sm: 'h-4 w-4 border-2',
      md: 'h-6 w-6 border-2',
      lg: 'h-8 w-8 border-3',
      xl: 'h-12 w-12 border-4',
    },
    variant: {
      primary: 'text-primary',
      secondary: 'text-secondary',
      white: 'text-white',
      muted: 'text-muted-foreground',
    }
  },
  defaultVariants: {
    size: 'md',
    variant: 'primary'
  }
});

/** Props for the Spinner component */
export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={spinnerVariants({ size, variant, className })}
        role="status"
        aria-label="Loading"
        {...props}
      >
        <span className="sr-only">Loading...</span>
      </div>
    );
  }
);

Spinner.displayName = 'Spinner';

export { Spinner };
