import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Rangée de cartes défilant horizontalement — beaucoup d'éléments comparables, sans pagination. */
export function ScrollRow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2', className)}>
      {children}
    </div>
  );
}

export function ScrollRowItem({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('shrink-0 snap-start', className)}>{children}</div>;
}
