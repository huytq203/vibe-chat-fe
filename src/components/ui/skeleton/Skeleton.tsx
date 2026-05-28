'use client';
import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const skeletonVariants = tv({
  base: 'animate-pulse rounded-md bg-secondary',
  variants: {
    variant: {
      default: 'bg-secondary',
      muted: 'bg-muted',
    },
    rounded: {
      none: 'rounded-none',
      sm: 'rounded-sm',
      md: 'rounded-md',
      lg: 'rounded-lg',
      full: 'rounded-full',
    },
  },
  defaultVariants: {
    variant: 'default',
    rounded: 'md',
  },
});

/** Props for the Skeleton component */
export interface SkeletonProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant, rounded, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={skeletonVariants({ variant, rounded, className })}
        aria-hidden="true"
        {...props}
      />
    );
  }
);
Skeleton.displayName = 'Skeleton';

export { Skeleton, skeletonVariants };
