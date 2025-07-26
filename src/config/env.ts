import { config as dotenvConfig } from 'dotenv'
import { z } from 'zod'

// Load environment variables
dotenvConfig()

// Define the schema for environment variables
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().positive()).default('3000'),
  HOST: z.string().default('0.0.0.0'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  
  // Database
  DATABASE_URL: z.string(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // Bcrypt
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().positive()).default('10'),
})

// Parse and validate environment variables
const parsedEnv = envSchema.safeParse(process.env)

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:')
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2))
  process.exit(1)
}

export const config = parsedEnv.data

// Type for the config
export type Config = z.infer<typeof envSchema>