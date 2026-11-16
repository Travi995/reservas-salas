import Joi from 'joi';

/** Validated environment. Every value the app reads from process.env is declared here. */
export interface Env {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  WEB_ORIGIN: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_NAME: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
}

export const envSchema = Joi.object<Env, true>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  WEB_ORIGIN: Joi.string().uri().default('http://localhost:5173'),

  DB_HOST: Joi.string().hostname().required(),
  DB_PORT: Joi.number().port().required(),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // A weak secret makes every token forgeable: require a real one.
  JWT_SECRET: Joi.string()
    .min(32)
    .invalid('cambia-este-secreto')
    .required()
    .messages({
      'any.invalid':
        'JWT_SECRET still has the example value: generate one with `openssl rand -base64 48`',
    }),
  // `ms` format: 30m, 8h, 7d…
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^\d+[smhd]$/)
    .required()
    .messages({
      'string.pattern.base': 'JWT_EXPIRES_IN must look like 30m, 8h or 7d',
    }),
});

/**
 * Validates and coerces the environment. Fails fast at startup listing every problem,
 * instead of failing later on the first request that needs a missing value.
 */
export function validateEnv(raw: Record<string, unknown>): Env {
  const { value, error } = envSchema.validate(raw, {
    abortEarly: false,
    allowUnknown: true,
    convert: true,
  });
  if (error) {
    throw new Error(
      `Invalid environment:\n${error.details.map((d) => `  - ${d.message}`).join('\n')}`,
    );
  }
  return value;
}
