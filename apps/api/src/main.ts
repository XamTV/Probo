import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // The front end and the API are served from the same domain behind the
  // reverse proxy: no CORS to open, and httpOnly cookies just work.
  app.setGlobalPrefix('api');

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
