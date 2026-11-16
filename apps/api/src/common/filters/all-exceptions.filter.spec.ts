import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AppException } from '../exceptions/app.exception.js';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function run(exception: unknown) {
  const json = vi.fn((_body: { error: { code: string } }) => undefined);
  const status = vi.fn((_code: number) => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status, locals: { requestId: 'req-1' } }),
      getRequest: () => ({ method: 'POST', originalUrl: '/api/v1/x?q=1' }),
    }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it('keeps the code and message of an AppException', () => {
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

  it('translates Nest HTTP exceptions into the unified format', () => {
    expect(run(new NotFoundException())).toEqual({
      status: 404,
      body: { error: { code: 'NOT_FOUND', message: 'El recurso no existe.' } },
    });
  });

  it('an unexpected error is a 500 without leaking internal details', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const res = run(new Error('connection string with password=secret'));
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('logs the request id and path (without query string) of an unexpected error', () => {
    const error = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    run(new Error('boom'));
    const line = String(error.mock.calls.at(-1)?.[0]);
    expect(line).toContain('POST /api/v1/x reqId=req-1');
    expect(line).not.toContain('q=1');
  });
});
