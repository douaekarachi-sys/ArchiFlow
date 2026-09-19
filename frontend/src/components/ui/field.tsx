import * as LabelPrimitive from '@radix-ui/react-label';
import { CircleAlert } from 'lucide-react';
import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

interface FieldProps {
  label: ReactNode;
  /** Message d'erreur déjà traduit. */
  error?: string;
  hint?: ReactNode;
  className?: string;
  /** Le contrôle ; il reçoit id, aria-invalid et aria-describedby. */
  children: ReactElement<Record<string, unknown>>;
}

/**
 * Champ de formulaire : libellé, contrôle, aide, erreur. L'erreur est portée par une icône ET un
 * texte, jamais par la seule couleur de la bordure (brief §9.1).
 */
export function Field({ label, error, hint, className, children }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <LabelPrimitive.Root htmlFor={id} className="text-caption font-medium text-fg-secondary">
        {label}
      </LabelPrimitive.Root>
      {isValidElement(children)
        ? cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })
        : children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-xs text-fg-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-critical-text">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  );
}
