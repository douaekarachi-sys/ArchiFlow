import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export const Select = SelectPrimitive.Root;
export const SelectGroup = SelectPrimitive.Group;
export const SelectValue = SelectPrimitive.Value;

export function SelectTrigger({ className, children, ...props }: SelectPrimitive.SelectTriggerProps) {
  return (
    <SelectPrimitive.Trigger
      className={cn(
        'flex h-9 w-full items-center justify-between gap-2 rounded-field border border-line-strong bg-surface px-3 text-sm text-fg',
        'transition-colors duration-150 outline-none',
        'hover:border-primary focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-45 data-[placeholder]:text-fg-muted',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-fg-muted" aria-hidden="true" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, ...props }: SelectPrimitive.SelectContentProps) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position="popper"
        sideOffset={6}
        className={cn(
          'z-50 max-h-64 min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-card border border-line bg-elevated p-1 shadow-elevated',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...props }: SelectPrimitive.SelectItemProps) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex h-9 cursor-pointer select-none items-center gap-2 rounded-button px-2.5 pr-7 text-sm text-fg outline-none',
        'data-[highlighted]:bg-overlay/5',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 flex items-center">
        <Check className="size-4 text-primary" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function SelectLabel({ className, children }: { className?: string; children: ReactNode }) {
  return <SelectPrimitive.Label className={cn('px-2.5 py-1.5 text-xs font-medium text-fg-muted', className)}>{children}</SelectPrimitive.Label>;
}
