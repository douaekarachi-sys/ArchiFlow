import { Bot, Send, User } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import type { ChatAnswer } from '@/api/endpoints';
import { chatbotApi } from '@/api/endpoints';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { useProjects } from '@/hooks/use-projects';
import { errorMessage } from '@/utils/errors';

interface ChatMessage {
  id: string;
  from: 'user' | 'assistant';
  text: string;
  detail?: string[];
  shouldEscalate?: boolean;
  escalated?: boolean;
}

/**
 * Chatbot client (T9) : repli local par défaut, sans réseau (packages/shared/src/chatbot). Le
 * projet utilisé est le plus récemment mis à jour — un client suit généralement un projet actif
 * à la fois (même convention que le tableau de bord client).
 */
export function ChatbotPage() {
  const { t } = useTranslation();
  const projects = useProjects({ pageSize: 1 });
  const projectId = projects.data?.data[0]?.id ?? null;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');

  const ask = useMutation({
    mutationFn: (message: string) => chatbotApi.ask(projectId!, message),
    onSuccess: (answer: ChatAnswer, message) => {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), from: 'user', text: message },
        {
          id: crypto.randomUUID(),
          from: 'assistant',
          text: t(answer.key, answer.params),
          detail: answer.steps.map((s) => t(s.key, s.params)),
          shouldEscalate: answer.shouldEscalate,
        },
      ]);
    },
  });

  const escalate = useMutation({
    mutationFn: (message: string) => chatbotApi.escalate(projectId!, message),
  });

  const submit = () => {
    const message = input.trim();
    if (!message || !projectId) return;
    setInput('');
    ask.mutate(message);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('chatbot.title')} subtitle={t('chatbot.subtitle')} />

      {projects.isPending ? (
        <Skeleton className="h-96 rounded-card" />
      ) : projects.isError ? (
        <ErrorState message={errorMessage(t, projects.error)} onRetry={() => void projects.refetch()} />
      ) : !projectId ? (
        <EmptyState icon={<Bot />} title={t('projects.empty.title')} description={t('projects.empty.CLIENT')} />
      ) : (
        <div className="flex flex-col gap-3 rounded-card border border-line bg-surface">
          <div className="flex min-h-80 flex-col gap-3 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="text-sm text-fg-secondary">{t('chatbot.emptyConversation')}</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex gap-2 ${message.from === 'user' ? 'justify-end' : ''}`}>
                  {message.from === 'assistant' && (
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-text">
                      <Bot className="size-3.5" />
                    </span>
                  )}
                  <div className={`max-w-md rounded-card px-3 py-2 text-sm ${message.from === 'user' ? 'bg-primary text-on-solid' : 'bg-inset text-fg'}`}>
                    <p>{message.text}</p>
                    {message.detail && message.detail.length > 0 && (
                      <ul className="mt-1.5 flex flex-col gap-0.5 border-t border-line/40 pt-1.5 text-xs opacity-90">
                        {message.detail.map((line, index) => (
                          <li key={index}>{line}</li>
                        ))}
                      </ul>
                    )}
                    {message.shouldEscalate && !message.escalated && (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="mt-2"
                        loading={escalate.isPending}
                        onClick={() => {
                          const lastUserMessage = [...messages].reverse().find((m) => m.from === 'user')?.text ?? '';
                          escalate.mutate(lastUserMessage, {
                            onSuccess: () => setMessages((prev) => prev.map((m) => (m.id === message.id ? { ...m, escalated: true } : m))),
                          });
                        }}
                      >
                        {t('chatbot.escalateAction')}
                      </Button>
                    )}
                    {message.escalated && <p className="mt-1.5 text-xs italic opacity-90">{t('chatbot.escalated')}</p>}
                  </div>
                  {message.from === 'user' && (
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-inset text-fg-muted">
                      <User className="size-3.5" />
                    </span>
                  )}
                </div>
              ))
            )}
            {ask.isError && <ErrorState message={errorMessage(t, ask.error)} onRetry={() => undefined} />}
          </div>
          <form
            className="flex items-center gap-2 border-t border-line p-3"
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={t('chatbot.placeholder')}
              className="h-10 flex-1 rounded-field border border-line bg-inset px-3 text-sm text-fg placeholder:text-fg-muted"
            />
            <Button type="submit" icon={<Send />} loading={ask.isPending} disabled={!input.trim()}>
              {t('chatbot.send')}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
