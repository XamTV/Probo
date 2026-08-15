import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Le front et l'API sont servis sur le même domaine derrière le reverse
  // proxy : pas de CORS à ouvrir, et les cookies httpOnly fonctionnent.
  app.setGlobalPrefix('api');

  const port = Number(process.env.API_PORT ?? 3000);
  await app.listen(port);
}

void bootstrap();
