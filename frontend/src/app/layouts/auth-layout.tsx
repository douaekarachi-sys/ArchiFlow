import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Brand } from '@/components/patterns/brand';
import { ThemeToggle } from '@/components/patterns/theme-toggle';
import { LoginIllustration } from '@/features/auth/login-illustration';

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

/**
 * Écran vitrine de la refonte : panneau plein écran au dégradé violet → indigo (jetons
 * `--auth-*`, fixes — cet écran est volontairement identique dans les deux thèmes), scène
 * d'équipements en volume doux, carte en verre dépoli au centre. Seul écran de l'application où
 * le glassmorphism est autorisé (brief de refonte) : la carte réutilise `.auth-card`, qui force
 * des jetons clairs sur son contenu quel que soit le thème ambiant (tokens.css).
 */
export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="relative min-h-dvh overflow-hidden bg-gradient-to-br from-auth-bg-start to-auth-bg-end">
      <LoginIllustration className="pointer-events-none absolute inset-0 hidden size-full lg:block" />

      <div className="auth-panel-chrome absolute inset-x-0 top-0 z-20 flex items-center justify-between px-5 py-4 sm:px-8">
        <span className="inline-flex items-center gap-2.5 text-fg">
          <svg viewBox="0 0 32 32" className="size-7 shrink-0" aria-hidden="true">
            <rect width="32" height="32" rx="8" className="fill-white/10 stroke-white/25" />
            <path d="M9 10 16 23 23 10" fill="none" stroke="hsl(var(--auth-fiber-glow))" strokeWidth="1.6" />
            <circle cx="9" cy="10" r="3" className="fill-cat-switch" />
            <circle cx="23" cy="10" r="3" className="fill-cat-firewall" />
            <circle cx="16" cy="23" r="3" className="fill-cat-server" />
          </svg>
          <span className="text-base font-semibold tracking-tight">{t('app.name')}</span>
        </span>
        <ThemeToggle />
      </div>

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-20 sm:px-8">
        <div
          className="auth-card w-full max-w-[440px] rounded-modal border border-auth-glass-border/25 bg-auth-glass/80 px-6 py-8 shadow-[0_30px_80px_rgba(30,27,75,0.35)] backdrop-blur-lg sm:px-8"
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Brand />
            <div>
              <h1 className="text-[1.75rem] font-semibold leading-none tracking-[-0.02em] text-fg">{title}</h1>
              {subtitle && <p className="mt-2 text-sm text-fg-secondary">{subtitle}</p>}
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
