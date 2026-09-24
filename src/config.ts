import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  HIKVISION_HOST: z.string().url().default('https://192.168.18.229'),
  HIKVISION_USERNAME: z.string().min(1).default('admin'),
  HIKVISION_PASSWORD: z.string().default(''),
  HIKVISION_VERIFY_TLS: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  HIKVISION_TIMEOUT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('12000'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .default('4000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  API_SECRET_KEY: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
}

export const config = parsed.success ? parsed.data : envSchema.parse({});
