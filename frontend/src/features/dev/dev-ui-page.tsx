/**
 * Page de référence des composants — DÉVELOPPEMENT UNIQUEMENT (voir router.tsx : la route
 * n'existe pas en production, `import.meta.env.DEV`). Sert à valider chaque composant du
 * design system dans toutes ses variantes et tous ses états, en clair et en sombre, avant de
 * les brancher sur de vrais écrans. Les libellés sont en français direct, sans passer par
 * i18n : ce n'est pas un écran utilisateur.
 */
import {
  AlertTriangle, BookOpen, Boxes, Building2, FileText, FolderKanban, Gauge,
  Search, Server, ShieldAlert, Users,
} from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { CategoryBadge } from '@/components/patterns/category-badge';
import { ProjectStatusBadge } from '@/components/patterns/project-status';
import { ThemeToggle } from '@/components/patterns/theme-toggle';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDestructive } from '@/components/ui/confirm-destructive';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { FilterBar, FilterDropdownTrigger } from '@/components/ui/filter-bar';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/ui/kpi-card';
import { MultiColumnStat } from '@/components/ui/multi-column-stat';
import { Panel } from '@/components/ui/panel';
import { PasswordInput } from '@/components/ui/password-input';
import { RankedList } from '@/components/ui/ranked-list';
import { ScrollRow, ScrollRowItem } from '@/components/ui/scroll-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SeverityDots } from '@/components/ui/severity-dots';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { Tabs } from '@/components/ui/tabs';
import { Table, TBody, Td, Th, THead, Tr } from '@/components/ui/table';
import { Tooltip } from '@/components/ui/tooltip';
import type { EquipmentCategory } from '@archiflow/shared';

const PROJECT_STATUSES = [
  'DRAFT', 'SUBMITTED', 'PENDING_ASSIGNMENT', 'ASSIGNED', 'ENGINEERING', 'ARCHITECTURE',
  'INTERNAL_REVIEW', 'COMMERCIAL_REVIEW', 'CLIENT_REVIEW', 'CLIENT_COMMENTS', 'REVISION',
  'CLIENT_APPROVED', 'COMPLETED',
] as const;

const CATEGORIES: EquipmentCategory[] = [
  'firewall', 'router', 'switch', 'access-point', 'wifi-controller', 'server',
  'storage', 'load-balancer', 'ups', 'rack', 'workstation', 'internet',
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-b border-line py-10 first:pt-0">
      <div>
        <h2 className="text-xl font-semibold text-fg">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-secondary">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export function DevUiPage() {
  const [segment, setSegment] = useState<'mine' | 'org'>('mine');
  const [tab, setTab] = useState('overview');
  const [selectValue, setSelectValue] = useState('rabat');

  return (
    <div className="mx-auto min-h-dvh max-w-5xl bg-page px-6 py-8">
      <header className="mb-8 flex items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-primary-text">Design system — dev only</p>
          <h1 className="mt-1 text-2xl font-semibold text-fg">Composants ArchiFlow</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            <Link to="/login" className="underline underline-offset-2 hover:text-fg">← Retour à la connexion</Link>
          </p>
        </div>
        <ThemeToggle />
      </header>

      <Section title="Boutons" description="5 variantes, 3 tailles, états focus / disabled / loading (brief §9.2).">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" size="icon" aria-label="Rechercher"><Search /></Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm">Petit</Button>
          <Button size="md">Moyen</Button>
          <Button size="lg">Grand</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled>Désactivé</Button>
          <Button loading>Chargement…</Button>
          <Button icon={<FolderKanban />}>Avec icône</Button>
        </div>
      </Section>

      <Section title="Statuts de projet" description="Pastille + icône + libellé — jamais la couleur seule.">
        <div className="flex flex-wrap gap-2">
          {PROJECT_STATUSES.map((status) => <ProjectStatusBadge key={status} status={status} />)}
        </div>
      </Section>

      <Section title="Badges génériques" description="Neutre, primaire, succès, avertissement, critique, info.">
        <div className="flex flex-wrap gap-2">
          {(['neutral', 'primary', 'success', 'warning', 'critical', 'info'] as const).map((tone) => (
            <Badge key={tone} tone={tone}>{tone}</Badge>
          ))}
        </div>
      </Section>

      <Section title="Catégories d'équipement" description="Pastille + libellé, fond teinté — code couleur constant partout.">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => <CategoryBadge key={cat} category={cat} />)}
        </div>
      </Section>

      <Section title="Indicateurs à pastilles" description="Niveau résumé à côté d'un chiffre — jamais seul.">
        <div className="flex flex-wrap items-center gap-6 text-sm text-fg">
          <span className="flex items-center gap-2">16 critiques <SeverityDots level={4} max={4} tone="critical" /></span>
          <span className="flex items-center gap-2">66 élevées <SeverityDots level={3} max={4} tone="high" /></span>
          <span className="flex items-center gap-2">12 moyennes <SeverityDots level={2} max={4} tone="warning" /></span>
          <span className="flex items-center gap-2">3 info <SeverityDots level={1} max={4} tone="info" /></span>
        </div>
      </Section>

      <Section title="Bloc KPI — barre empilée" description="Le chiffre donne le contexte, la barre donne la répartition (motif signature).">
        <div className="grid gap-4 sm:grid-cols-2">
          <KpiCard
            title="Anomalies"
            subtitle="Par sévérité"
            value={97}
            valueLabel="anomalies ouvertes"
            segments={[
              { key: 'critical', label: 'Critique', value: 16, colorClass: 'bg-critical' },
              { key: 'high', label: 'Élevée', value: 30, colorClass: 'bg-high' },
              { key: 'warning', label: 'Moyenne', value: 34, colorClass: 'bg-warning' },
              { key: 'info', label: 'Info', value: 17, colorClass: 'bg-info' },
            ]}
            onSegmentClick={(key) => console.info('filtrer sur', key)}
          />
          <KpiCard
            title="Projets"
            subtitle="Par phase"
            value={13}
            valueLabel="projets actifs"
            segments={[
              { key: 'design', label: 'Conception', value: 4, colorClass: 'bg-primary' },
              { key: 'review', label: 'Revue', value: 3, colorClass: 'bg-warning' },
              { key: 'done', label: 'Terminé', value: 6, colorClass: 'bg-success' },
            ]}
          />
        </div>
      </Section>

      <Section title="Bloc multi-colonnes à séparateurs" description="Plusieurs colonnes dans un même bloc, filets verticaux — pas des cartes isolées.">
        <MultiColumnStat
          columns={[
            { key: 'users', icon: <Users />, label: 'Utilisateurs actifs', value: 6, detail: <span className="text-xs text-fg-muted">Dans l'organisation</span> },
            { key: 'clients', icon: <Building2 />, label: 'Sociétés clientes', value: 2, detail: <span className="text-xs text-fg-muted">Rabat, Casablanca</span> },
            { key: 'catalog', icon: <BookOpen />, label: 'Modèles au catalogue', value: 22, detail: <span className="text-xs text-fg-muted">6 fabricants</span> },
          ]}
        />
      </Section>

      <Section title="Liste classée" description="Nom, valeur, pourcentage, barre de couleur fine à gauche de la ligne.">
        <Panel title="Projets les plus à risque - Par anomalies ouvertes">
          <RankedList
            className="px-4"
            onSelect={(key) => console.info('ouvrir', key)}
            items={[
              { key: 'p1', name: 'Data center Casablanca — terminé', value: 18, percent: 34, colorClass: 'bg-critical' },
              { key: 'p2', name: 'Nouveau siège Rabat — conception', value: 12, percent: 22, colorClass: 'bg-high' },
              { key: 'p3', name: 'Usine Settat — dimensionnement', value: 7, percent: 13, colorClass: 'bg-warning' },
              { key: 'p4', name: 'Hôtel Marrakech — chiffrage', value: 3, percent: 6, colorClass: 'bg-info' },
            ]}
          />
        </Panel>
      </Section>

      <Section title="Rangée défilante" description="Beaucoup d'éléments comparables, sans pagination.">
        <ScrollRow>
          {[
            { name: 'Cisco', models: 3, icon: <Server /> },
            { name: 'Aruba', models: 3, icon: <Boxes /> },
            { name: 'Fortinet', models: 3, icon: <ShieldAlert /> },
            { name: 'HPE', models: 5, icon: <Server /> },
            { name: 'Dell', models: 5, icon: <Server /> },
            { name: 'Lenovo', models: 3, icon: <Server /> },
          ].map((m) => (
            <ScrollRowItem key={m.name} className="w-44">
              <article className="flex h-full flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-elevated">
                <span className="flex size-9 items-center justify-center rounded-field bg-primary-soft text-primary-text [&_svg]:size-5">{m.icon}</span>
                <div>
                  <p className="font-medium text-fg">{m.name}</p>
                  <p className="text-xs text-fg-muted">{m.models} modèles</p>
                </div>
              </article>
            </ScrollRowItem>
          ))}
        </ScrollRow>
      </Section>

      <Section title="Contrôle segmenté" description="Deux options, l'active sur fond blanc / bordure violette.">
        <SegmentedControl
          aria-label="Portée des projets"
          value={segment}
          onChange={setSegment}
          options={[{ value: 'mine', label: 'Mes projets' }, { value: 'org', label: 'Organisation' }]}
        />
      </Section>

      <Section title="Barre de filtres" description="Menus déroulants sur surface creusée, pilote toute la page.">
        <FilterBar>
          <FilterDropdownTrigger label="Client" value="Groupe Atlas Services" />
          <FilterDropdownTrigger label="Statut" />
          <FilterDropdownTrigger label="Phase" />
          <FilterDropdownTrigger label="Ingénieur" />
          <FilterDropdownTrigger label="Période" />
        </FilterBar>
      </Section>

      <Section title="Onglets">
        <Tabs
          value={tab}
          onChange={setTab}
          items={[{ key: 'overview', label: 'Vue d’ensemble' }, { key: 'details', label: 'Détails' }, { key: 'history', label: 'Historique' }]}
        />
      </Section>

      <Section title="Select">
        <Select value={selectValue} onValueChange={setSelectValue}>
          <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="rabat">Groupe Atlas Services — Rabat</SelectItem>
            <SelectItem value="casa">Maghreb Logistique — Casablanca</SelectItem>
          </SelectContent>
        </Select>
      </Section>

      <Section title="Infobulle">
        <Tooltip content="Bientôt disponible — Phase 5">
          <Button variant="secondary">Survoler pour voir l’infobulle</Button>
        </Tooltip>
      </Section>

      <Section title="Champs de formulaire" description="Libellé toujours au-dessus, jamais un placeholder à sa place.">
        <div className="grid max-w-md gap-4">
          <Field label="Adresse e-mail"><Input type="email" placeholder="prenom.nom@archiflow.local" /></Field>
          <Field label="Mot de passe" hint="Au moins 12 caractères."><PasswordInput /></Field>
          <Field label="Champ en erreur" error="Ce champ est requis."><Input aria-invalid /></Field>
          <Field label="Champ désactivé"><Input disabled placeholder="Non modifiable" /></Field>
        </div>
      </Section>

      <Section title="Alertes">
        <div className="flex flex-col gap-3">
          <Alert tone="critical">Identifiants incorrects.</Alert>
          <Alert tone="warning">Ce modèle est archivé : il reste visible mais ne peut plus être ajouté.</Alert>
          <Alert tone="success">Projet créé.</Alert>
          <Alert tone="info">Votre compte a été créé avec un mot de passe provisoire.</Alert>
        </div>
      </Section>

      <Section title="États obligatoires" description="Chargement, vide, erreur — pour chaque liste et chaque vue.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-card border border-line p-4"><p className="mb-3 text-xs font-medium uppercase text-fg-muted">Chargement</p><Skeleton className="h-24" /></div>
          <div className="rounded-card border border-line p-2"><p className="mb-1 px-2 pt-2 text-xs font-medium uppercase text-fg-muted">Vide</p><EmptyState icon={<FolderKanban />} title="Aucun projet" description="Les projets apparaîtront ici." /></div>
          <div className="rounded-card border border-line p-2"><p className="mb-1 px-2 pt-2 text-xs font-medium uppercase text-fg-muted">Erreur</p><ErrorState message="Le serveur ne répond pas." onRetry={() => undefined} /></div>
        </div>
      </Section>

      <Section title="Table dense">
        <Panel>
          <Table>
            <THead><Tr><Th>Projet</Th><Th>Client</Th><Th>Statut</Th></Tr></THead>
            <TBody>
              <Tr><Td>Data center Casablanca</Td><Td>Groupe Atlas Services</Td><Td><ProjectStatusBadge status="COMPLETED" /></Td></Tr>
              <Tr><Td>Usine Settat</Td><Td>Groupe Atlas Services</Td><Td><ProjectStatusBadge status="ENGINEERING" /></Td></Tr>
            </TBody>
          </Table>
        </Panel>
      </Section>

      <Section title="Dialogue et confirmation destructive">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild><Button variant="secondary">Ouvrir un dialogue</Button></DialogTrigger>
            <DialogContent title="Affecter une ressource" description="Choisissez un rôle et un utilisateur.">
              <p className="text-sm text-fg-secondary">Contenu du dialogue.</p>
            </DialogContent>
          </Dialog>
          <ConfirmDestructive
            action="Archiver le modèle"
            target="Catalyst 9300-48P"
            consequence="Il restera visible dans les architectures existantes mais ne pourra plus être ajouté."
            trigger={<Button variant="danger">Archiver…</Button>}
            onConfirm={() => undefined}
          />
        </div>
      </Section>

      <Section title="Panneau" description="Surface + bordure, rayon 12 px.">
        <Panel title="Titre du panneau" actions={<Button variant="ghost" size="sm" icon={<Gauge />}>Action</Button>}>
          <p className="p-4 text-sm text-fg-secondary">Contenu du panneau.</p>
        </Panel>
      </Section>

      <Section title="Alerte de contraste" description="Rappel : cette page ne remplace pas tokens.test.ts, elle montre le rendu.">
        <Alert tone="info" icon={<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}>
          <FileText className="hidden" aria-hidden="true" />
          Vérifiez cette page en clair ET en sombre avec le sélecteur de thème ci-dessus.
        </Alert>
      </Section>
    </div>
  );
}
