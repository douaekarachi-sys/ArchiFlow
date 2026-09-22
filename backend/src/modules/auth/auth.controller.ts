import { Body, Controller, Get, HttpCode, Inject, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import {
  changePasswordSchema,
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  type AuthContext,
  type AuthResult,
  type ChangePasswordInput,
  type ForgotPasswordInput,
  type LoginInput,
  type ResetPasswordInput,
} from '@archiflow/shared';
import type { CookieOptions, Request, Response } from 'express';
import { zod } from '../../common/pipes/zod-validation.pipe';
import { ENV, type Env } from '../../core/config/env';
import { AllowPendingPasswordChange, CurrentUser, Public } from '../../security/decorators';
import { AuthService, type Session } from './auth.service';

export const REFRESH_COOKIE = 'af_rt';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

/**
 * Pas de route d'inscription : les comptes sont créés par l'administrateur (ADR 0010).
 * Le jeton de rafraîchissement ne quitte le serveur que dans un cookie httpOnly, SameSite=Strict,
 * limité au chemin /api/v1/auth : le JavaScript de la page ne peut ni le lire ni l'exfiltrer.
 */
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: this.env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
    };
  }

  private open(res: Response, session: Session): AuthResult {
    res.cookie(REFRESH_COOKIE, session.refreshToken, this.cookieOptions());
    return session.body;
  }

  private readCookie(req: Request): string | undefined {
    const value: unknown = req.cookies?.[REFRESH_COOKIE];
    return typeof value === 'string' ? value : undefined;
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body(zod(loginSchema)) input: LoginInput, @Res({ passthrough: true }) res: Response) {
    return this.open(res, await this.auth.login(input));
  }

  @Public()
  @SkipThrottle({ auth: true })
  @Post('refresh')
  @HttpCode(200)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.open(res, await this.auth.refresh(this.readCookie(req)));
    } catch (error) {
      res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
      throw error;
    }
  }

  @Public()
  @SkipThrottle({ auth: true })
  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.auth.logout(this.readCookie(req));
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
  }

  @SkipThrottle({ auth: true })
  @AllowPendingPasswordChange()
  @Get('me')
  me(@CurrentUser() ctx: AuthContext) {
    return this.auth.me(ctx);
  }

  @AllowPendingPasswordChange()
  @Patch('password')
  async changePassword(
    @CurrentUser() ctx: AuthContext,
    @Body(zod(changePasswordSchema)) input: ChangePasswordInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.open(res, await this.auth.changePassword(ctx, input));
  }

  @Public()
  @Post('forgot')
  @HttpCode(202)
  async forgot(@Body(zod(forgotPasswordSchema)) input: ForgotPasswordInput) {
    await this.auth.forgotPassword(input.email);
    return { status: 'accepted' as const };
  }

  @Public()
  @Post('reset')
  @HttpCode(204)
  async reset(@Body(zod(resetPasswordSchema)) input: ResetPasswordInput): Promise<void> {
    await this.auth.resetPassword(input);
  }
}
