import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';
import { useTheme, type ThemePreference } from '@/utils/theme';

const OPTIONS: Array<{ value: ThemePreference; icon: typeof Sun }> = [
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
  { value: 'system', icon: Monitor },
];

/** Trois choix — clair, sombre, système (ADR 0015) — repris tel quel sur la page de connexion. */
export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { preference, resolved, setPreference } = useTheme();
  const CurrentIcon = resolved === 'dark' ? Moon : Sun;

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('theme.label')} title={t('theme.label')} className={className}>
          <CurrentIcon />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-40 rounded-card border border-line bg-elevated p-1 shadow-elevated"
        >
          {OPTIONS.map(({ value, icon: Icon }) => (
            <DropdownMenu.Item
              key={value}
              onSelect={() => setPreference(value)}
              className={cn(
                'flex h-9 cursor-pointer items-center gap-2 rounded-button px-2.5 text-sm outline-none',
                'text-fg data-[highlighted]:bg-overlay/5',
              )}
            >
              <Icon className="size-4 text-fg-muted" aria-hidden="true" />
              {t(`theme.${value}`)}
              {preference === value && <Check className="ml-auto size-4 text-primary" aria-hidden="true" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
