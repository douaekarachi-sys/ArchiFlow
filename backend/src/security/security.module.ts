import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ENV, type Env } from '../core/config/env';
import { PasswordHasher } from './hashing/password-hasher';
import { AccessTokenService } from './tokens/access-token.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        secret: env.JWT_ACCESS_SECRET,
        signOptions: { expiresIn: env.JWT_ACCESS_TTL as `${number}m`, algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  providers: [PasswordHasher, AccessTokenService],
  exports: [PasswordHasher, AccessTokenService],
})
export class SecurityModule {}
