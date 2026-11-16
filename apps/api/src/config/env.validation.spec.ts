import { validateEnv } from './env.validation.js';

const VALID = {
  DB_HOST: 'localhost',
  DB_PORT: '5440',
  DB_USER: 'reservas',
  DB_PASSWORD: 'reservas',
  DB_NAME: 'reservas',
  JWT_SECRET: 'x'.repeat(48),
  JWT_EXPIRES_IN: '8h',
};

describe('validateEnv', () => {
  it('coerces types and applies defaults', () => {
    const env = validateEnv(VALID);
    expect(env.DB_PORT).toBe(5440);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
  });

  it('lists every problem at once', () => {
    expect(() =>
      validateEnv({
        ...VALID,
        DB_HOST: undefined,
        DB_PORT: 'abc',
        JWT_EXPIRES_IN: 'eight hours',
      }),
    ).toThrow(/DB_HOST.*\n.*DB_PORT.*\n.*JWT_EXPIRES_IN/s);
  });

  it('rejects a short or example JWT secret', () => {
    expect(() => validateEnv({ ...VALID, JWT_SECRET: 'short' })).toThrow(
      /JWT_SECRET/,
    );
    expect(() =>
      validateEnv({ ...VALID, JWT_SECRET: 'cambia-este-secreto' }),
    ).toThrow(/example value/);
  });
});
