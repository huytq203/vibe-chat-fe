'use client';
import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const avatarVariants = tv({
  base: 'relative flex shrink-0 overflow-hidden rounded-full items-center justify-center bg-secondary text-secondary-foreground outline-none',
  variants: {
    size: {
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    },
  },
  defaultVariants: {
    size: 'md',
  },
});

/** Props for the Avatar component */
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof avatarVariants> {
  /** Image URL for the avatar */
  src?: string;
  /** Alt text for the image; first 2 chars used as fallback if no `fallback` prop */
  alt?: string;
  /** Text shown when the image fails to load or is not provided */
  fallback?: string;
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, size, src, alt, fallback, ...props }, ref) => {
    const [hasError, setHasError] = React.useState(false);

    return (
      <div ref={ref} className={avatarVariants({ size, className })} {...props}>
        {src && !hasError ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            className="aspect-square h-full w-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span className="font-medium uppercase tracking-wider">
            {fallback || (alt ? alt.substring(0, 2) : '??')}
          </span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';

export { Avatar };
