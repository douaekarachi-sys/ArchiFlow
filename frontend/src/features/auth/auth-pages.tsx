import { zodResolver } from '@hookform/resolvers/zod';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  passwordSchema,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
} from '@archiflow/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, LogIn, Mail } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ApiError } from '@/api/client';
import { authApi } from '@/api/endpoints';
import { AuthLayout } from '@/app/layouts/auth-layout';
import { useSession } from '@/auth/session-store';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { Input } from '@/components/ui/input';
import { errorMessage, validationMessage } from '@/utils/errors';

const linkClass = 'text-sm font-medium text-primary-text underline-offset-4 hover:underline';

// --- Connexion ----------------------------------------------------------------------------------

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setSession = useSession((s) => s.setSession);
  const [error, setError] = useState<unknown>(null);
  const form = useForm<z.input<typeof loginSchema>, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await authApi.login(values);
      queryClient.clear();
      setSession(result);
      void navigate(result.redirectTo, { replace: true });
    } catch (e) {
      setError(e);
      // Le mot de passe est effacé ; l'adresse est conservée.
      form.resetField('password');
    }
  });

  return (
    <AuthLayout title={t('auth.login.title')} subtitle={t('auth.login.subtitle')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {error !== null && <Alert tone="critical">{errorMessage(t, error)}</Alert>}
        <Field label={t('auth.login.email')} error={validationMessage(t, errors.email?.message)}>
          <Input type="email" autoComplete="username" autoFocus {...form.register('email')} />
        </Field>
        <Field label={t('auth.login.password')} error={validationMessage(t, errors.password?.message)}>
          <PasswordInput autoComplete="current-password" {...form.register('password')} />
        </Field>
        <Button type="submit" size="lg" icon={<LogIn />} loading={isSubmitting} className="mt-2 w-full">
          {t('auth.login.submit')}
        </Button>
        <div className="flex flex-col items-center gap-3 pt-2">
          <Link to="/forgot-password" className={linkClass}>
            {t('auth.login.forgot')}
          </Link>
          <p className="text-center text-xs text-fg-muted">{t('auth.noPublicSignup')}</p>
        </div>
      </form>
    </AuthLayout>
  );
}

// --- Mot de passe oublié -----------------------------------------------------------------------

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const form = useForm<z.input<typeof forgotPasswordSchema>, unknown, ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await authApi.forgot(values);
      setSent(true);
    } catch (e) {
      setError(e);
    }
  });

  return (
    <AuthLayout title={t('auth.forgot.title')} subtitle={t('auth.forgot.subtitle')}>
      {sent ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success">{t('auth.forgot.sent')}</Alert>
          <Link to="/login" className={linkClass}>
            {t('auth.forgot.backToLogin')}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error !== null && <Alert tone="critical">{errorMessage(t, error)}</Alert>}
          <Field label={t('auth.login.email')} error={validationMessage(t, form.formState.errors.email?.message)}>
            <Input type="email" autoComplete="username" autoFocus {...form.register('email')} />
          </Field>
          <Button type="submit" size="lg" icon={<Mail />} loading={form.formState.isSubmitting} className="w-full">
            {t('auth.forgot.submit')}
          </Button>
          <Button asChild variant="ghost" className="self-center">
            <Link to="/login">
              <ArrowLeft />
              {t('auth.forgot.backToLogin')}
            </Link>
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

// --- Réinitialisation --------------------------------------------------------------------------

const resetFormSchema = z.object({ newPassword: passwordSchema });

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const [done, setDone] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const form = useForm<z.infer<typeof resetFormSchema>>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { newPassword: '' },
  });

  const onSubmit = form.handleSubmit(async ({ newPassword }) => {
    setError(null);
    try {
      await authApi.reset({ token, newPassword });
      setDone(true);
    } catch (e) {
      setError(e);
    }
  });

  return (
    <AuthLayout title={t('auth.reset.title')} subtitle={t('auth.reset.subtitle')}>
      {done ? (
        <div className="flex flex-col gap-4">
          <Alert tone="success">{t('auth.reset.done')}</Alert>
          <Button asChild size="lg" className="w-full">
            <Link to="/login">{t('auth.login.submit')}</Link>
          </Button>
        </div>
      ) : token.length < 32 ? (
        <div className="flex flex-col gap-4">
          <Alert tone="warning">{t('auth.reset.missingToken')}</Alert>
          <Link to="/forgot-password" className={linkClass}>
            {t('auth.forgot.title')}
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {error !== null && (
            <Alert tone="critical">
              {error instanceof ApiError && error.code === 'UNPROCESSABLE'
                ? t('auth.reset.missingToken')
                : errorMessage(t, error)}
            </Alert>
          )}
          <Field
            label={t('auth.reset.newPassword')}
            hint={t('auth.changePassword.hint')}
            error={validationMessage(t, form.formState.errors.newPassword?.message)}
          >
            <PasswordInput autoComplete="new-password" autoFocus {...form.register('newPassword')} />
          </Field>
          <Button type="submit" size="lg" icon={<KeyRound />} loading={form.formState.isSubmitting} className="w-full">
            {t('auth.reset.submit')}
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

// --- Changement de mot de passe (obligatoire si provisoire — ADR 0010) --------------------------

export function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile, setSession } = useSession();
  const [error, setError] = useState<unknown>(null);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });
  const { errors, isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      const result = await authApi.changePassword(values);
      setSession(result);
      void navigate(result.redirectTo, { replace: true });
    } catch (e) {
      setError(e);
      form.resetField('currentPassword');
    }
  });

  return (
    <AuthLayout title={t('auth.changePassword.title')}>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {profile?.mustChangePassword && <Alert tone="info">{t('auth.changePassword.requiredNotice')}</Alert>}
        {error !== null && <Alert tone="critical">{errorMessage(t, error)}</Alert>}
        <Field label={t('auth.changePassword.current')} error={validationMessage(t, errors.currentPassword?.message)}>
          <PasswordInput autoComplete="current-password" autoFocus {...form.register('currentPassword')} />
        </Field>
        <Field
          label={t('auth.changePassword.new')}
          hint={t('auth.changePassword.hint')}
          error={validationMessage(t, errors.newPassword?.message)}
        >
          <PasswordInput autoComplete="new-password" {...form.register('newPassword')} />
        </Field>
        <Button type="submit" size="lg" icon={<KeyRound />} loading={isSubmitting} className="mt-2 w-full">
          {t('auth.changePassword.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
