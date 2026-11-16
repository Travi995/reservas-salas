import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    // El .env vive en la raíz del monorepo (compartido con docker-compose).
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: Number(config.get<string>('DB_PORT', '5440')),
        username: config.get<string>('DB_USER', 'reservas'),
        password: config.get<string>('DB_PASSWORD', 'reservas'),
        database: config.get<string>('DB_NAME', 'reservas'),
        autoLoadEntities: true,
        // Esquema solo mediante migraciones explícitas (ADR-0002 / ADR-0003).
        synchronize: false,
      }),
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
