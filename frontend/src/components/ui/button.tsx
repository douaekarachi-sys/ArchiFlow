import { Slot, Slottable } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
import { cn } from '@/utils/cn';
import { Spinner } from './spinner';

/**
 * Bouton — spécification exacte du brief §9.2, écrit à la main plutôt que « combattu » dans
 * shadcn (ADR 0007).
 *
 * - Hauteurs 36 / 30 / 44 px, padding 14 px, rayon 8 px, 14 px / 500, icône 16 px, écart 8 px.
 * - Transitions 150 ms sur fond, bordure, transform et ombre.
 * - Les effets de survol ne s'appliquent qu'aux boutons ACTIFS (`enabled:`) : un bouton
 *   désactivé ne réagit pas au survol.
 * - Chargement : le spinner remplace l'icône ; sans icône, il se superpose au libellé rendu
 *   invisible — le libellé reste dans le DOM, donc la largeur ne change pas et le nom accessible
 *   est conservé.
 * - Le remplissage primaire utilise --primary-solid et non --primary : le texte blanc sur
 *   #3D7DFF n'atteint pas WCAG AA (ADR 0012).
 */
export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap',
    'rounded-button text-sm font-medium',
    'transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-out',
    'disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45',
    '[&_svg:not([class*=size-])]:size-4',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary-solid text-on-solid',
          'enabled:hover:-translate-y-px enabled:hover:bg-primary-solid-hover',
          'enabled:active:translate-y-0 enabled:active:bg-primary-solid-active',
        ],
        secondary: [
          'border border-line-strong bg-transparent text-fg',
          'enabled:hover:border-primary enabled:hover:bg-overlay/5',
          'enabled:active:bg-overlay/8',
        ],
        ghost: [
          'bg-transparent text-fg-secondary',
          'enabled:hover:bg-overlay/5 enabled:hover:text-fg',
          'enabled:active:bg-overlay/10 enabled:active:text-fg',
        ],
        danger: [
          'bg-danger-solid text-on-solid',
          'enabled:hover:bg-danger-solid-hover enabled:active:bg-danger-solid-active',
        ],
      },
      size: {
        sm: 'h-[30px] px-3 text-caption',
        md: 'h-9 px-[14px]',
        lg: 'h-11 px-[18px] text-base',
        icon: 'size-9 p-0',
        'icon-sm': 'size-[30px] p-0',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Icône de tête, 16 px ; remplacée par le spinner pendant le chargement. */
  icon?: ReactNode;
  /** Non cliquable, spinner affiché, largeur inchangée. */
  loading?: boolean;
  /** Rend l'enfant (un lien, par exemple) avec l'apparence du bouton. */
  asChild?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Button({
  className,
  variant,
  size,
  icon,
  loading = false,
  asChild = false,
  disabled,
  children,
  type,
  ref,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const iconOnly = size === 'icon' || size === 'icon-sm';
  const overlaySpinner = loading && !icon;

  return (
    <Comp
      ref={ref}
      // Un bouton ne soumet jamais un formulaire par accident.
      type={asChild ? undefined : (type ?? 'button')}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={asChild ? undefined : disabled || loading}
      aria-disabled={asChild && (disabled || loading) ? true : undefined}
      aria-busy={loading || undefined}
      {...props}
    >
      {icon && (loading ? <Spinner /> : <span className="inline-flex" aria-hidden="true">{icon}</span>)}
      {overlaySpinner && (
        <span className="absolute inset-0 flex items-center justify-center">
          <Spinner />
        </span>
      )}
      <Slottable>
        {overlaySpinner && !iconOnly ? <span className="invisible">{children}</span> : children}
      </Slottable>
    </Comp>
  );
}
