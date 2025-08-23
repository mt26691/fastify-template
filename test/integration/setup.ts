import { beforeAll, afterAll, beforeEach } from 'vitest'
import { config as dotenvConfig } from 'dotenv'
import { prisma } from '../../src/services/prisma.js'
import { execSync } from 'child_process'
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql'
import { logger } from '../../src/utils/logger.js'

// Set NODE_ENV before loading environment variables
process.env.NODE_ENV = 'test'

// Load test environment variables
dotenvConfig({ path: '.env.test' })

let container: StartedPostgreSqlContainer

beforeAll(async () => {
  logger.info('Starting PostgreSQL test container...')
  
  // Start PostgreSQL container
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('fastify_test_db')
    .withUsername('test_user')
    .withPassword('test_password')
    .start()

  // Update DATABASE_URL with container connection string
  const databaseUrl = `postgresql://test_user:test_password@${container.getHost()}:${container.getMappedPort(5432)}/fastify_test_db?schema=public`
  process.env.DATABASE_URL = databaseUrl
  
  logger.info('Test container started, running migrations...')
  
  try {
    // Run migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl
      }
    })
    logger.info('Migrations completed successfully')
  } catch (error) {
    logger.error('Failed to run migrations:', error)
    throw error
  }
}, 60000) // 60 second timeout for container startup

beforeEach(async () => {
  // Clean up database before each test
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.user.deleteMany(),
  ])
})

afterAll(async () => {
  logger.info('Cleaning up test environment...')
  
  // Disconnect Prisma
  await prisma.$disconnect()
  
  // Stop and remove container
  if (container) {
    await container.stop()
    logger.info('Test container stopped')
  }
})