'use client';
import * as React from 'react';
import { tv } from 'tailwind-variants';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

const breadcrumbVariants = tv({
  slots: {
    nav: '',
    list: 'flex flex-wrap items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5',
    item: 'inline-flex items-center gap-1.5',
    link: 'transition-colors hover:text-foreground',
    page: 'font-medium text-foreground',
    separator: 'text-muted-foreground/60 [&>svg]:w-3.5 [&>svg]:h-3.5',
    ellipsis: 'flex h-9 w-9 items-center justify-center',
  },
});

const { nav, list, item, link, page, separator, ellipsis } = breadcrumbVariants();

/* ─── Root ──────────────────────────────────────────────────────────── */

export type BreadcrumbProps = React.ComponentPropsWithoutRef<'nav'>;

const Breadcrumb = React.forwardRef<HTMLElement, BreadcrumbProps>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} aria-label="breadcrumb" className={nav({ className })} {...props} />
  )
);
Breadcrumb.displayName = 'Breadcrumb';

/* ─── List ──────────────────────────────────────────────────────────── */

export type BreadcrumbListProps = React.ComponentPropsWithoutRef<'ol'>;

const BreadcrumbList = React.forwardRef<HTMLOListElement, BreadcrumbListProps>(
  ({ className, ...props }, ref) => (
    <ol ref={ref} className={list({ className })} {...props} />
  )
);
BreadcrumbList.displayName = 'BreadcrumbList';

/* ─── Item ──────────────────────────────────────────────────────────── */

export type BreadcrumbItemProps = React.ComponentPropsWithoutRef<'li'>;

const BreadcrumbItem = React.forwardRef<HTMLLIElement, BreadcrumbItemProps>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={item({ className })} {...props} />
  )
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

/* ─── Link ──────────────────────────────────────────────────────────── */

/** Props for the BreadcrumbLink component */
export interface BreadcrumbLinkProps extends React.ComponentPropsWithoutRef<'a'> {
  /** Render as a child span instead of an anchor element */
  asChild?: boolean;
}

const BreadcrumbLink = React.forwardRef<HTMLAnchorElement, BreadcrumbLinkProps>(
  ({ className, asChild, ...props }, ref) => {
    if (asChild) {
      return <span ref={ref as React.Ref<HTMLSpanElement>} className={link({ className })} {...(props as React.HTMLAttributes<HTMLSpanElement>)} />;
    }
    return <a ref={ref} className={link({ className })} {...props} />;
  }
);
BreadcrumbLink.displayName = 'BreadcrumbLink';

/* ─── Page (current) ────────────────────────────────────────────────── */

export type BreadcrumbPageProps = React.ComponentPropsWithoutRef<'span'>;

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, BreadcrumbPageProps>(
  ({ className, ...props }, ref) => (
    <span ref={ref} role="link" aria-disabled="true" aria-current="page" className={page({ className })} {...props} />
  )
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

/* ─── Separator ─────────────────────────────────────────────────────── */

export type BreadcrumbSeparatorProps = React.ComponentPropsWithoutRef<'li'>;

const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, BreadcrumbSeparatorProps>(
  ({ className, children, ...props }, ref) => (
    <li ref={ref} role="presentation" aria-hidden="true" className={separator({ className })} {...props}>
      {children ?? <ChevronRight />}
    </li>
  )
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

/* ─── Ellipsis ──────────────────────────────────────────────────────── */

export type BreadcrumbEllipsisProps = React.ComponentPropsWithoutRef<'span'>;

const BreadcrumbEllipsis = React.forwardRef<HTMLSpanElement, BreadcrumbEllipsisProps>(
  ({ className, ...props }, ref) => (
    <span ref={ref} role="presentation" aria-hidden="true" className={ellipsis({ className })} {...props}>
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More</span>
    </span>
  )
);
BreadcrumbEllipsis.displayName = 'BreadcrumbEllipsis';

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
  breadcrumbVariants,
};
