import type { Role } from '@archiflow/shared';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Plus } from 'lucide-react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { CategoryBadge } from '@/components/patterns/category-badge';
import { Button } from './button';
import { ConfirmDestructive } from './confirm-destructive';
import { Field } from './field';
import { Input } from './input';
import { SegmentedControl } from './segmented-control';
import { Sidebar } from './sidebar';
import { StackedBar } from './stacked-bar';
import { SeverityDots } from './severity-dots';
import { Tabs } from './tabs';
import { TooltipProvider } from './tooltip';

function renderSidebar(role: Role) {
  return render(
    <MemoryRouter>
      <TooltipProvider>
        <Sidebar role={role} />
      </TooltipProvider>
    </MemoryRouter>,
  );
}

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

describe('SegmentedControl', () => {
  it('une seule option active à la fois, changée au clic', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        aria-label="Portée"
        value="mine"
        onChange={onChange}
        options={[{ value: 'mine', label: 'Mes projets' }, { value: 'org', label: 'Organisation' }]}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Mes projets' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Organisation' })).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(screen.getByRole('radio', { name: 'Organisation' }));
    expect(onChange).toHaveBeenCalledWith('org');
  });
});

describe('Tabs', () => {
  it('change l’onglet sélectionné au clic', async () => {
    const onChange = vi.fn();
    render(<Tabs value="a" onChange={onChange} items={[{ key: 'a', label: 'A' }, { key: 'b', label: 'B' }]} />);
    expect(screen.getByRole('tab', { name: 'A' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.click(screen.getByRole('tab', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('StackedBar', () => {
  it('un segment cliquable ouvre la vue filtrée correspondante', async () => {
    const onSegmentClick = vi.fn();
    render(
      <StackedBar
        onSegmentClick={onSegmentClick}
        segments={[
          { key: 'critical', label: 'Critique', value: 3, colorClass: 'bg-critical' },
          { key: 'warning', label: 'Moyenne', value: 1, colorClass: 'bg-warning' },
        ]}
      />,
    );
    // Légende : le pourcentage se calcule sur le total des segments (3+1=4).
    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Critique : 3' }));
    expect(onSegmentClick).toHaveBeenCalledWith('critical');
  });

  it('sans gestionnaire de clic, la barre reste purement décorative', () => {
    render(<StackedBar segments={[{ key: 'a', label: 'A', value: 1, colorClass: 'bg-primary' }]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('SeverityDots', () => {
  it('porte le niveau dans un aria-label, jamais la couleur seule', () => {
    render(<SeverityDots level={3} max={4} tone="high" />);
    expect(screen.getByRole('img', { name: '3 / 4' })).toBeInTheDocument();
  });
});

describe('CategoryBadge', () => {
  it('affiche le libellé traduit de la catégorie', () => {
    render(<CategoryBadge category="firewall" />);
    expect(screen.getByText('Pare-feu')).toBeInTheDocument();
  });
});

describe('Sidebar', () => {
  it('affiche les entrées principales, avec de vrais liens pour les données déjà réelles', () => {
    renderSidebar('ADMIN');
    expect(screen.getByRole('link', { name: 'Tableau de bord' })).toBeInTheDocument();
    // « Projets » a de vraies données (ProjectsPanel) : jamais grisé, contrairement aux
    // sections dont la fonctionnalité n'existe pas encore.
    expect(screen.getByRole('link', { name: 'Projets' })).toHaveAttribute('href', '/admin/projects');
  });

  it('grise les sections dont la fonctionnalité n’existe pas encore, avec leur phase', () => {
    renderSidebar('CLIENT');
    const documents = screen.getByText('Documents').closest('[aria-disabled]');
    expect(documents).toHaveAttribute('aria-disabled', 'true');
  });

  it('le groupe replié masque ses entrées, le chevron pivote', async () => {
    renderSidebar('ADMIN');
    expect(screen.getByRole('link', { name: 'Utilisateurs' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Administration' }));
    expect(screen.queryByRole('link', { name: 'Utilisateurs' })).toBeNull();
  });
});
