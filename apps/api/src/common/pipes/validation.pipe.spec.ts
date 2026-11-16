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

  it('lanza 400 VALIDATION_ERROR con un error por campo, incluidos los anidados', async () => {
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

  it('rechaza propiedades que el DTO no declara', async () => {
    const error = (await validate({
      capacity: 2,
      child: { value: 1 },
      role: 'admin',
    }).catch((e: unknown) => e)) as AppException;
    expect(error.getResponse()).toMatchObject({
      error: { details: [{ field: 'role' }] },
    });
  });
});
