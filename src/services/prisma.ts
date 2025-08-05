import { PrismaClient } from '@prisma/client'
import { logger } from '@utils/logger'
import { config } from '@config/env'

export const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
})

// Log Prisma queries in development
if (config.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug(
      {
        query: e.query,
        params: e.params,
        duration: e.duration,
      },
      'Prisma Query'
    )
  })
}

prisma.$on('error', (e) => {
  logger.error(e, 'Prisma Error')
})

prisma.$on('info', (e) => {
  logger.info(e, 'Prisma Info')
})

prisma.$on('warn', (e) => {
  logger.warn(e, 'Prisma Warning')
})

// Graceful shutdown
export const disconnectPrisma = async (): Promise<void> => {
  await prisma.$disconnect()
  logger.info('Prisma disconnected')
}
