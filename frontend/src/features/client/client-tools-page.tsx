import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createCommentSchema, type CreateCommentInput } from '@archiflow/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { Download, FileSpreadsheet, FileText, MessageSquare, Send } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { architectureApi, commentsApi, reportsApi, type ProjectSummary } from '@/api/endpoints';
import { useSession } from '@/auth/session-store';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Panel } from '@/components/ui/panel';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useProject, useProjects } from '@/hooks/use-projects';
import { errorMessage, validationMessage } from '@/utils/errors';
import { ProjectPicker } from '../projects/project-picker';

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });

/**
 * Documents et Messages (T17, point 1) — DERNIÈRES entrées du portail client. Documents est une
 * vue dérivée pure (PDF, BOM, versions déjà générés ailleurs) ; Messages est le seul nouveau
 * modèle explicitement autorisé, un fil de commentaires partagé client/équipe par projet.
 */
export function DocumentsPage() {
  const { t } = useTranslation();
  const query = useProjects({ pageSize: 100 });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('nav.documents')} subtitle={t('clientDocuments.subtitle')} />
      {query.isPending ? (
        <Skeleton className="h-64" />
      ) : query.isError ? (
        <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
      ) : query.data.data.length === 0 ? (
        <EmptyState icon={<FileText />} title={t('clientDocuments.empty')} description={t('clientDocuments.emptyHint')} />
      ) : (
        <div className="flex flex-col gap-4">
          {query.data.data.map((project) => (
            <ProjectDocuments key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectDocuments({ project }: { project: ProjectSummary }) {
  const { t } = useTranslation();
  const versions = useQuery({ queryKey: ['architecture', 'versions', project.id], queryFn: () => architectureApi.versions(project.id) });
  const pdf = useMutation({
    mutationFn: () => reportsApi.downloadPdf(project.id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `architecture-${project.id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  return (
    <Panel title={project.name}>
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-wrap gap-2">
          <Button icon={<Download />} variant="secondary" loading={pdf.isPending} onClick={() => pdf.mutate()}>
            {t('clientDocuments.downloadPdf')}
          </Button>
          <Button asChild variant="ghost" icon={<FileSpreadsheet />}>
            <Link to={`/client/projects/${project.id}/bom`}>{t('clientDocuments.viewBom')}</Link>
          </Button>
        </div>
        {pdf.isError && <p className="text-sm text-critical-text">{errorMessage(t, pdf.error)}</p>}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-muted">{t('clientDocuments.versionsTitle')}</h3>
          {versions.isPending ? (
            <Skeleton className="mt-2 h-10" />
          ) : versions.isError ? (
            <p className="mt-2 text-sm text-critical-text">{errorMessage(t, versions.error)}</p>
          ) : versions.data.length === 0 ? (
            <p className="mt-2 text-sm text-fg-muted">{t('clientDocuments.noVersions')}</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-1">
              {versions.data.map((v) => (
                <li key={v.number} className="flex items-center justify-between text-sm text-fg-secondary">
                  <span>{t('clientDocuments.versionLabel', { number: v.number })}</span>
                  <span className="text-xs text-fg-muted">{dateFormat.format(new Date(v.createdAt))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

export function MessagesPickerPage() {
  const { t } = useTranslation();
  return (
    <ProjectPicker title={t('nav.messages')} description={t('clientMessages.pickerDescription')} icon={MessageSquare} basePath="/client" linkSuffix="messages" />
  );
}

export function MessagesDetailPage() {
  const { t } = useTranslation();
  const { id: projectId } = useParams<{ id: string }>();
  const userId = useSession((s) => s.profile?.id);
  const project = useProject(projectId ?? null);
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['comments', projectId], queryFn: () => commentsApi.list(projectId!), enabled: !!projectId });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateCommentInput>({ resolver: zodResolver(createCommentSchema), defaultValues: { body: '' } });
  const send = useMutation({
    mutationFn: (input: CreateCommentInput) => commentsApi.create(projectId!, input),
    onSuccess: () => {
      reset();
      void queryClient.invalidateQueries({ queryKey: ['comments', projectId] });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={project.data?.name ?? t('nav.messages')} subtitle={t('clientMessages.subtitle')} />
      <Panel>
        <div className="flex flex-col gap-3 p-4">
          {query.isPending ? (
            <Skeleton className="h-48" />
          ) : query.isError ? (
            <ErrorState message={errorMessage(t, query.error)} onRetry={() => void query.refetch()} />
          ) : query.data.length === 0 ? (
            <EmptyState icon={<MessageSquare />} title={t('clientMessages.empty')} description={t('clientMessages.emptyHint')} className="py-10" />
          ) : (
            <ul className="flex flex-col gap-3">
              {query.data.map((comment) => {
                const mine = comment.author?.id === userId;
                return (
                  <li
                    key={comment.id}
                    className={`max-w-[85%] rounded-card border p-3 ${mine ? 'ml-auto border-primary/30 bg-primary-soft/30' : 'border-line bg-inset'}`}
                  >
                    <p className="text-sm text-fg">{comment.body}</p>
                    <p className="mt-1 text-xs text-fg-muted">
                      {comment.author ? `${comment.author.firstName} ${comment.author.lastName}` : t('clientMessages.unknownAuthor')} ·{' '}
                      {dateFormat.format(new Date(comment.createdAt))}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <form
          onSubmit={(e) => void handleSubmit((input) => send.mutateAsync(input))(e)}
          className="flex items-start gap-2 border-t border-line p-4"
        >
          <div className="flex-1">
            <textarea
              {...register('body')}
              rows={2}
              placeholder={t('clientMessages.placeholder')}
              className="w-full rounded-field border border-line bg-inset px-3 py-2 text-sm text-fg placeholder:text-fg-muted hover:border-line-strong focus-visible:border-primary"
            />
            {(errors.body || send.isError) && (
              <p className="mt-1 text-xs text-critical-text">{validationMessage(t, errors.body?.message) ?? errorMessage(t, send.error)}</p>
            )}
          </div>
          <Button type="submit" icon={<Send />} loading={send.isPending}>
            {t('clientMessages.send')}
          </Button>
        </form>
      </Panel>
    </div>
  );
}
