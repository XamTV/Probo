import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuditService } from '../audit/audit.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/** Shortest secret that makes brute-forcing an HS256 signature pointless. */
const JWT_SECRET_MIN_LENGTH = 32;

@Global()
@Module({
  imports: [
    // registerAsync, not register: a synchronous register reads process.env
    // when the module is DEFINED, which happens before ConfigModule has loaded
    // the .env file. The secret would be undefined, @nestjs/jwt would refuse to
    // sign, and every sign-in would fail with a 500 — in production as much as
    // in the tests that caught it.
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.getOrThrow<string>('JWT_SECRET');
        if (secret.length < JWT_SECRET_MIN_LENGTH) {
          throw new Error(`JWT_SECRET is too short: ${JWT_SECRET_MIN_LENGTH} characters at least.`);
        }
        return { secret, signOptions: { expiresIn: '12h' } };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuditService],
  exports: [AuthService, AuditService],
})
export class AuthModule {}
