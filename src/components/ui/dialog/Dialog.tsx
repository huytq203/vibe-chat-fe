'use client';
import * as React from 'react';
import { Dialog as BaseDialog } from '@base-ui/react';
import { ArrowLeft, X } from 'lucide-react';
import { tv, type VariantProps } from 'tailwind-variants';

import { useIsMobile } from '@/lib/hooks/useIsMobile';
import { cn } from '@/lib/utils/cn';

const dialogVariants = tv({
  slots: {
    overlay:
      'fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm pointer-events-auto data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
   content: [
      'fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 p-6',
      'w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl',
      // Keep the parent in place when a nested dialog opens to avoid a visual jump.
      'data-[nested-dialog-open]:brightness-[0.82]',
      'data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 ',
      'data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
      'data-[nested-dialog-open]:pointer-events-none',
    ].join(' '),
    header: 'flex flex-col space-y-1.5 text-left',
    footer: 'mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-0 sm:space-x-2',
    title: 'text-lg font-semibold leading-none tracking-tight',
    description: 'text-sm text-muted-foreground',
    close:
      'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none data-open:bg-accent data-open:text-muted-foreground',
  },
  variants: {
    size: {
      default: {
        content: 'max-w-lg sm:rounded-lg',
      },
      fullScreen: {
        content:
          'inset-0 left-0 top-0 translate-x-0 translate-y-0 max-w-none h-full rounded-none border-none',
      },
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

const MOBILE_ROUTE_OVERLAY = 'max-md:bg-transparent max-md:backdrop-blur-none';
const MOBILE_ROUTE_CONTENT = [
  'max-md:inset-0 max-md:left-0 max-md:top-0 max-md:flex max-md:max-h-none max-md:w-full max-md:max-w-none max-md:translate-x-0 max-md:translate-y-0 max-md:flex-col max-md:overflow-hidden max-md:rounded-none max-md:border-0 max-md:p-0 max-md:shadow-none',
  'max-md:data-[starting-style]:translate-x-full max-md:data-[starting-style]:opacity-100 max-md:data-[ending-style]:translate-x-full max-md:data-[ending-style]:opacity-100 max-md:data-open:zoom-in-100 max-md:data-closed:zoom-out-100',
].join(' ');

type DialogRootProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Root> & {
  /** Use a full mobile page with a browser-history entry. Disable only for tiny overlays. */
  mobileRoute?: boolean;
};

const DialogRouteContext = React.createContext(true);

function historyChangeDetails(): Parameters<NonNullable<DialogRootProps['onOpenChange']>>[1] {
  return {
    allowPropagation: () => undefined,
    cancel: () => undefined,
    event: new PopStateEvent('popstate'),
    isCanceled: false,
    isPropagationAllowed: false,
    preventUnmountOnClose: () => undefined,
    reason: 'none',
    trigger: undefined,
  };
}

/**
 * On phones, every substantial dialog owns one native browser-history entry.
 * Android Back / iOS back gestures therefore close the page before leaving its
 * underlying Next.js route. Next remains the URL router.
 */
function Dialog({ defaultOpen = false, mobileRoute = true, onOpenChange, open, ...props }: DialogRootProps) {
  const isMobile = useIsMobile();
  const routeId = React.useId();
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const routeEntryActive = React.useRef(false);
  const resolvedOpen = open ?? internalOpen;
  const resolvedOpenRef = React.useRef(resolvedOpen);

  React.useEffect(() => {
    resolvedOpenRef.current = resolvedOpen;
  }, [resolvedOpen]);

  const setOpen = React.useCallback((nextOpen: boolean, details: Parameters<NonNullable<DialogRootProps['onOpenChange']>>[1]) => {
    resolvedOpenRef.current = nextOpen;
    if (open === undefined) setInternalOpen(nextOpen);
    onOpenChange?.(nextOpen, details);
  }, [onOpenChange, open]);

  React.useEffect(() => {
    if (!isMobile || !mobileRoute) return;
    if (resolvedOpen && !routeEntryActive.current) {
      window.history.pushState(
        { ...window.history.state, __haloMobileDialog: routeId },
        '',
        window.location.href,
      );
      routeEntryActive.current = true;
    } else if (!resolvedOpen && routeEntryActive.current) {
      routeEntryActive.current = false;
      if (window.history.state?.__haloMobileDialog === routeId) window.history.back();
    }
  }, [isMobile, mobileRoute, resolvedOpen, routeId]);

  React.useEffect(() => {
    if (!isMobile || !mobileRoute) return;
    const handlePopState = () => {
      if (window.history.state?.__haloMobileDialog === routeId) {
        routeEntryActive.current = true;
        if (!resolvedOpenRef.current) setOpen(true, historyChangeDetails());
        return;
      }
      if (!routeEntryActive.current) return;
      routeEntryActive.current = false;
      if (resolvedOpenRef.current) setOpen(false, historyChangeDetails());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isMobile, mobileRoute, routeId, setOpen]);

  return (
    <DialogRouteContext.Provider value={mobileRoute}>
      <BaseDialog.Root {...props} open={resolvedOpen} onOpenChange={setOpen} />
    </DialogRouteContext.Provider>
  );
}

/* ─── Trigger ─── */
// Hỗ trợ cả render={} (Base UI) lẫn children trực tiếp.
// Nếu children là một React element (e.g. <Button>), tự động dùng làm render prop
// để tránh nested button (<button><button>…</button></button>).
type BaseTriggerProps = React.ComponentPropsWithoutRef<typeof BaseDialog.Trigger>;

interface DialogTriggerProps extends Omit<BaseTriggerProps, 'render'> {
  render?: BaseTriggerProps['render'];
  children?: React.ReactNode;
}

const DialogTrigger = React.forwardRef<HTMLElement, DialogTriggerProps>(
  ({ render: renderProp, children, ...props }, ref) => {
    const resolvedRender =
      renderProp ?? (React.isValidElement(children) ? children : undefined);

    return (
      <BaseDialog.Trigger
        ref={ref as React.Ref<HTMLButtonElement>}
        render={resolvedRender}
        {...props}
      >
        {resolvedRender ? undefined : children}
      </BaseDialog.Trigger>
    );
  },
);
DialogTrigger.displayName = 'DialogTrigger';


/* ─── Close (re-export for custom close buttons) ─── */
const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<typeof BaseDialog.Close>
>(({ children, render: renderProp, ...props }, ref) => {
  const isElement = React.isValidElement(children);
  return (
    <BaseDialog.Close
      ref={ref}
      render={renderProp ?? (isElement ? (children as React.ReactElement) : undefined)}
      {...props}
    >
      {isElement ? undefined : children}
    </BaseDialog.Close>
  );
});
DialogClose.displayName = 'DialogClose';

/* ─── Content (Portal + Backdrop + Popup + default X button) ─── */
interface DialogContentProps
  extends Omit<React.ComponentPropsWithoutRef<typeof BaseDialog.Popup>, 'className'>,
  VariantProps<typeof dialogVariants> {
  className?: string;
  /** Override the inner mobile-page gutter for custom full-bleed layouts. */
  mobileContentClassName?: string;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, mobileContentClassName, size, ...props }, ref) => {
    const slots = dialogVariants({ size });
    const mobileRoute = React.useContext(DialogRouteContext);
    return (
      <BaseDialog.Portal>
        <BaseDialog.Backdrop className={slots.overlay({ className: mobileRoute ? MOBILE_ROUTE_OVERLAY : undefined })} />
        <BaseDialog.Popup
          ref={ref}
          className={slots.content({ className: cn(className, mobileRoute && MOBILE_ROUTE_CONTENT) })}
          {...props}
        >
          {mobileRoute ? (
            <div
              className="safe-area-controls hidden h-[calc(3.25rem+var(--f7-safe-area-top))] shrink-0 items-end border-b border-border bg-sidebar pb-1 max-md:flex"
              data-mobile-route-bar
            >
              <BaseDialog.Close className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <ArrowLeft aria-hidden="true" className="size-5" />
                Quay lại
              </BaseDialog.Close>
            </div>
          ) : null}
          <div
            className={cn(
              'contents max-md:flex max-md:min-h-0 max-md:flex-1 max-md:flex-col max-md:overflow-y-auto max-md:overscroll-contain max-md:p-4 max-md:pb-[calc(var(--f7-safe-area-bottom)+1rem)]',
              mobileContentClassName,
            )}
            data-mobile-page-content
          >
            {children}
          </div>
          <BaseDialog.Close className={cn(slots.close(), mobileRoute && 'max-md:hidden')}>
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </BaseDialog.Close>
        </BaseDialog.Popup>
      </BaseDialog.Portal>
    );
  },
);
DialogContent.displayName = 'DialogContent';

/* ─── Header ─── */
const DialogHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const slots = dialogVariants();
    return <div ref={ref} className={slots.header({ className })} {...props} />;
  },
);
DialogHeader.displayName = 'DialogHeader';

/* ─── Footer ─── */
const DialogFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const slots = dialogVariants();
    return <div ref={ref} className={slots.footer({ className })} {...props} />;
  },
);
DialogFooter.displayName = 'DialogFooter';

/* ─── Title ─── */
const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  Omit<React.ComponentPropsWithoutRef<typeof BaseDialog.Title>, 'className'> & { className?: string }
>(({ className, ...props }, ref) => {
  const slots = dialogVariants();
  return <BaseDialog.Title ref={ref} className={slots.title({ className })} {...props} />;
});
DialogTitle.displayName = 'DialogTitle';

/* ─── Description ─── */
const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  Omit<React.ComponentPropsWithoutRef<typeof BaseDialog.Description>, 'className'> & { className?: string }
>(({ className, ...props }, ref) => {
  const slots = dialogVariants();
  return (
    <BaseDialog.Description ref={ref} className={slots.description({ className })} {...props} />
  );
});
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogClose,
};
