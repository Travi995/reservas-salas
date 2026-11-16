import { ConsoleLogger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './app.setup.js';
import type { Env } from './config/env.validation.js';

async function bootstrap() {
  // Buffer startup logs until the logger chosen by LOG_FORMAT is in place.
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get<ConfigService<Env, true>>(ConfigService);
  app.useLogger(
    new ConsoleLogger({
      json: config.get('LOG_FORMAT', { infer: true }) === 'json',
    }),
  );
  configureApp(app);

  // The frontend calls the API directly (VITE_API_URL): allow only the configured web origin.
  app.enableCors({ origin: config.get('WEB_ORIGIN', { infer: true }) });

  // API docs are a development aid: not exposed in production.
  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Reservas de salas')
      .setDescription('API para reservar salas de reunión sin solapamientos')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, () =>
      SwaggerModule.createDocument(app, swaggerConfig),
    );
  }

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
