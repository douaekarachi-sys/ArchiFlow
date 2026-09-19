import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/utils/cn';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Police à chasse fixe : adresses IP, références, ports, VLAN (brief §9.3). */
  mono?: boolean;
  icon?: ReactNode;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ className, mono, icon, ref, ...props }: InputProps) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute inset-y-0 left-3 inline-flex items-center text-fg-muted" aria-hidden="true">
          {icon}
        </span>
      )}
      <input
        ref={ref}
        className={cn(
          'h-9 w-full rounded-field border border-line bg-inset px-3 text-sm text-fg',
          'placeholder:text-fg-muted',
          'transition-[border-color,box-shadow] duration-150',
          'hover:border-line-strong focus-visible:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-45',
          'aria-invalid:border-critical',
          mono && 'font-mono tabular',
          icon && 'pl-9',
          className,
        )}
        {...props}
      />
    </div>
  );
}
