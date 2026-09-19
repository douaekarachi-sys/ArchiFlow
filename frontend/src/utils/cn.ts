import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * Fusion de classes Tailwind. tailwind-merge doit connaître l'échelle de texte personnalisée
 * (text-caption…), sans quoi il confondrait taille et couleur de texte et en supprimerait une.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['xs', 'caption', 'sm', 'base', 'lg', 'xl', '2xl'],
      radius: ['field', 'button', 'card', 'modal'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
