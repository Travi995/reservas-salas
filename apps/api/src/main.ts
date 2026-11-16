import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.validation.js';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule));
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // The frontend calls the API directly (VITE_API_URL): allow only the configured web origin.
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }) });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Reservas de salas')
    .setDescription('API para reservar salas de reunión sin solapamientos')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, swaggerConfig),
  );

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
