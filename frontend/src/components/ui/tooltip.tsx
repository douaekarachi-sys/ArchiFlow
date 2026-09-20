import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export const TooltipProvider = TooltipPrimitive.Provider;

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
}

/** Infobulle courte — utilisée notamment pour les entrées de navigation « Bientôt disponible ». */
export function Tooltip({ content, children, side = 'right', className }: TooltipProps) {
  return (
    <TooltipPrimitive.Root delayDuration={300}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={8}
          className={cn(
            'z-50 max-w-56 rounded-field border border-line bg-elevated px-2.5 py-1.5 text-xs text-fg shadow-elevated',
            'data-[state=delayed-open]:animate-[fade-in_var(--duration-fast)_ease-out]',
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-elevated" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
