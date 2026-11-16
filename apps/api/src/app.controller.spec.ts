import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        {
          provide: AppService,
          useValue: { health: vi.fn().mockResolvedValue({ status: 'ok', db: 'up' }) },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('devuelve el estado de salud', async () => {
    await expect(appController.health()).resolves.toEqual({ status: 'ok', db: 'up' });
  });
});
