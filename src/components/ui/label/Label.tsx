'use client';
import * as React from 'react';
import { tv, type VariantProps } from 'tailwind-variants';

const labelVariants = tv({
  base: 'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 select-none',
  variants: {
    muted: {
      true: 'text-muted-foreground',
    },
  },
});

/** Props for the Label component */
export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  /** Hiển thị dấu * đỏ cho field bắt buộc */
  required?: boolean;
}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, muted, required, children, ...props }, ref) => (
    <label ref={ref} className={labelVariants({ muted, className })} {...props}>
      {children}
      {required && <span className="ml-0.5 text-danger">*</span>}
    </label>
  ),
);
Label.displayName = 'Label';

export { Label };
