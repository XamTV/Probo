import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // The JWT secret is validated where it is read, in AuthModule's factory:
  // checking process.env here would run before ConfigModule has loaded .env,
  // and would reject a secret that is in fact present.
  const app = await NestFactory.create(AppModule);

  // The session lives in an httpOnly cookie, so the guard needs them parsed.
  app.use(cookieParser());

  // The front end and the API are served from the same domain behind the
  // reverse proxy: no CORS to open, and httpOnly cookies just work.
  app.setGlobalPrefix('api');

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
