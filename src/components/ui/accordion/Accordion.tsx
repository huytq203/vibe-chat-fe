'use client';
import * as React from 'react';
import { Accordion as BaseAccordion } from '@base-ui/react';
import { ChevronDown } from 'lucide-react';
import { tv } from 'tailwind-variants';

const accordionVariants = tv({
  slots: {
    root: 'w-full',
    item: 'border-b border-border/50 last:border-0',
    header: 'flex',
    trigger: 'flex flex-1 items-center justify-between py-4 text-sm font-medium transition-all hover:text-primary hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 [&[data-panel-open]>svg]:rotate-180',
    panel: 'overflow-hidden text-sm data-[open]:animate-accordion-down data-[closed]:animate-accordion-up transition-all',
  }
});

const { root, item, header, trigger, panel } = accordionVariants();

export const Accordion = React.forwardRef<React.ElementRef<typeof BaseAccordion.Root>, Omit<React.ComponentPropsWithoutRef<typeof BaseAccordion.Root>, 'className'> & { className?: string }>(
  ({ className, ...props }, ref) => (
    <BaseAccordion.Root ref={ref} className={root({ className })} {...props} />
  )
)
Accordion.displayName = 'Accordion';

export const AccordionItem = React.forwardRef<React.ElementRef<typeof BaseAccordion.Item>, Omit<React.ComponentPropsWithoutRef<typeof BaseAccordion.Item>, 'className'> & { className?: string }>(
  ({ className, ...props }, ref) => (
    <BaseAccordion.Item ref={ref} className={item({ className })} {...props} />
  )
)
AccordionItem.displayName = 'AccordionItem';

export const AccordionTrigger = React.forwardRef<React.ElementRef<typeof BaseAccordion.Trigger>, Omit<React.ComponentPropsWithoutRef<typeof BaseAccordion.Trigger>, 'className'> & { className?: string; /** Hide the default chevron icon */hideChevron?: boolean }>(
  ({ className, children, hideChevron, ...props }, ref) => (
    <BaseAccordion.Header className={header()}>
      <BaseAccordion.Trigger ref={ref} className={trigger({ className })} {...props}>
        {children}
        {!hideChevron && <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" />}
      </BaseAccordion.Trigger>
    </BaseAccordion.Header>
  )
)
AccordionTrigger.displayName = 'AccordionTrigger';

export const AccordionContent = React.forwardRef<React.ElementRef<typeof BaseAccordion.Panel>, Omit<React.ComponentPropsWithoutRef<typeof BaseAccordion.Panel>, 'className'> & { className?: string }>(
  ({ className, children, ...props }, ref) => (
    <BaseAccordion.Panel ref={ref} className={panel({ className })} {...props}>
      <div className="pb-4 pt-0">{children}</div>
    </BaseAccordion.Panel>
  )
)
AccordionContent.displayName = 'AccordionContent';
