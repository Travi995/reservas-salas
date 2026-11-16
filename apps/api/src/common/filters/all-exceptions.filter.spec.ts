import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function run(exception: unknown) {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it('respeta el código y mensaje de una AppException', () => {
    const res = run(
      new AppException(
        HttpStatus.CONFLICT,
        'ROOM_OVERLAP',
        'La sala ya está reservada.',
      ),
    );
    expect(res).toEqual({
      status: 409,
      body: {
        error: { code: 'ROOM_OVERLAP', message: 'La sala ya está reservada.' },
      },
    });
  });

  it('traduce las excepciones HTTP de Nest al formato único', () => {
    expect(run(new NotFoundException())).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'El recurso no existe.' } },
    });
  });

  it('un error inesperado es 500 sin filtrar detalles internos', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const res = run(new Error('connection string with password=secret'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });
});
