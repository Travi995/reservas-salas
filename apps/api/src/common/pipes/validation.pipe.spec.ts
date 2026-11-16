import { IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AppException } from '../exceptions/app.exception.js';
import { createValidationPipe } from './validation.pipe.js';

class Child {
  @IsInt({ message: 'Debe ser entero.' })
  value: number;
}

class Dto {
  @Min(1, { message: 'Mínimo 1.' })
  capacity: number;

  @ValidateNested()
  @Type(() => Child)
  child: Child;
}

describe('createValidationPipe', () => {
  const pipe = createValidationPipe();
  const validate = (body: unknown) =>
    pipe.transform(body, { type: 'body', metatype: Dto });

  it('throws 400 VALIDATION_ERROR with one error per field, including nested ones', async () => {
    const error = await validate({ capacity: 0, child: { value: 1.5 } }).catch(
      (e: unknown) => e,
    );
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(400);
    expect((error as AppException).getResponse()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Revisa los datos enviados.',
        details: [
          { field: 'capacity', message: 'Mínimo 1.' },
          { field: 'child.value', message: 'Debe ser entero.' },
        ],
      },
    });
  });

  it('rejects properties the DTO does not declare', async () => {
    const error = (await validate({
      capacity: 2,
      child: { value: 1 },
      role: 'admin',
    }).catch((e: unknown) => e)) as AppException;
    expect(error.getResponse()).toMatchObject({
      error: { details: [{ field: 'role' }] },
    });
  });

  it('says "not allowed" in Spanish for undeclared properties', async () => {
    const error = (await validate({
      capacity: 2,
      child: { value: 1 },
      role: 'admin',
    }).catch((e: unknown) => e)) as AppException;
    expect(error.getResponse()).toMatchObject({
      error: {
        details: [{ field: 'role', message: 'Este campo no está permitido.' }],
      },
    });
  });

  it('rejects NUL bytes with a 400 instead of letting Postgres fail with a 500', async () => {
    const error = (await validate({
      capacity: 2,
      child: { value: 1, name: 'a\u0000b' },
    }).catch((e: unknown) => e)) as AppException;
    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toMatchObject({
      error: { details: [{ field: 'child.name' }] },
    });
  });
});
