import { TriangleAlert } from 'lucide-react';
import { useState, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from './dialog';

interface ConfirmDestructiveProps {
  /** Libellé de l'action, déjà traduit : « Supprimer le projet ». */
  action: string;
  /** Nom de la cible, affiché tel quel : « Nouveau siège Rabat ». */
  target: string;
  /** Conséquence, déjà traduite : ce qui sera perdu. */
  consequence?: ReactNode;
  /** Élément déclencheur, unique (généralement un Button). Le focus y revient à la fermeture. */
  trigger: ReactElement;
  onConfirm: () => Promise<unknown> | void;
}

/**
 * Toute action irréversible passe par une confirmation qui NOMME la cible (brief §9.2) :
 * « Supprimer le projet Nouveau siège Rabat ? », jamais « Êtes-vous sûr ? ».
 * Le focus s'ouvre sur « Annuler » : une validation réflexe par Entrée ne détruit rien.
 */
export function ConfirmDestructive({ action, target, consequence, trigger, onConfirm }: ConfirmDestructiveProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    setPending(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent
        title={t('confirm.title', { action, target })}
        hideClose
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).querySelector<HTMLButtonElement>('[data-autofocus]')?.focus();
        }}
        footer={
          <>
            <DialogClose asChild>
              <Button variant="secondary" data-autofocus disabled={pending}>
                {t('common.cancel')}
              </Button>
            </DialogClose>
            <Button variant="danger" loading={pending} onClick={() => void confirm()}>
              {action}
            </Button>
          </>
        }
      >
        <div className="flex gap-3 rounded-field border border-critical/40 bg-critical/10 p-3 text-sm text-fg">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-critical-text" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="font-medium">{t('confirm.irreversible')}</p>
            {consequence && <p className="text-fg-secondary">{consequence}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
