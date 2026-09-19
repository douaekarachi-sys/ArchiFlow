import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';
import { ConfirmDestructive } from './confirm-destructive';
import { Field } from './field';
import { Input } from './input';

describe('Button', () => {
  it('ne soumet jamais un formulaire par accident : type="button" par défaut', () => {
    render(<Button>Action</Button>);
    expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute('type', 'button');
  });

  it('désactivé : non cliquable', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Action
      </Button>,
    );
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('chargement : non cliquable, aria-busy, libellé conservé dans le DOM', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Enregistrer
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Enregistrer' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    // Le libellé reste rendu (invisible) : la largeur du bouton ne change pas.
    expect(screen.getByText('Enregistrer')).toHaveClass('invisible');
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('chargement avec icône : le spinner REMPLACE l’icône, le libellé reste visible', () => {
    const { container } = render(
      <Button loading icon={<Plus data-testid="icon" />}>
        Ajouter
      </Button>,
    );
    expect(screen.queryByTestId('icon')).toBeNull();
    expect(container.querySelector('svg.animate-spin')).not.toBeNull();
    expect(screen.getByText('Ajouter')).not.toHaveClass('invisible');
  });

  it('les effets de survol ne s’appliquent qu’aux boutons actifs', () => {
    render(<Button variant="secondary">Action</Button>);
    const cls = screen.getByRole('button').className;
    expect(cls).toContain('enabled:hover:');
    expect(cls).not.toMatch(/(^|\s)hover:/);
  });

  it('applique les tokens, jamais une couleur en dur', () => {
    render(<Button variant="danger">Supprimer</Button>);
    expect(screen.getByRole('button').className).not.toMatch(/#[0-9a-f]{3,6}|rgb\(/i);
  });
});

describe('Field', () => {
  it('relie libellé, contrôle et erreur ; l’erreur porte une icône et un texte', () => {
    render(
      <Field label="Adresse IP" error="Adresse invalide">
        <Input mono />
      </Field>,
    );
    const input = screen.getByLabelText('Adresse IP');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveClass('font-mono');
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Adresse invalide');
    expect(alert.querySelector('svg')).not.toBeNull();
    expect(input.getAttribute('aria-describedby')).toContain(alert.id);
  });
});

describe('ConfirmDestructive', () => {
  it('nomme la cible, ouvre le focus sur « Annuler » et n’agit qu’après confirmation', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <ConfirmDestructive
        action="Supprimer le projet"
        target="Nouveau siège Rabat"
        trigger={<Button variant="danger">Supprimer</Button>}
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Supprimer' }));

    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Supprimer le projet « Nouveau siège Rabat » ?');
    expect(screen.getByRole('button', { name: 'Annuler' })).toHaveFocus();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Supprimer le projet' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('« Annuler » ferme sans rien faire', async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDestructive action="Archiver" target="Cisco C9300" trigger={<Button>Archiver</Button>} onConfirm={onConfirm} />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Archiver' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Annuler' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
