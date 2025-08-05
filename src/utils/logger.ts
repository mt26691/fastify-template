import pino from 'pino'
import { config } from '@config/env'

// Create a standalone logger instance for use outside of Fastify context
export const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            translateTime: 'HH:MM:ss Z',
            ignore: 'pid,hostname',
            colorize: true,
          },
        }
      : undefined,
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() }
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
})

// Helper functions for different log levels with context
export const logInfo = (message: string, context?: Record<string, unknown>): void => {
  logger.info(context, message)
}

export const logError = (
  message: string,
  error?: Error,
  context?: Record<string, unknown>
): void => {
  logger.error({ ...context, error }, message)
}

export const logWarn = (message: string, context?: Record<string, unknown>): void => {
  logger.warn(context, message)
}

export const logDebug = (message: string, context?: Record<string, unknown>): void => {
  logger.debug(context, message)
}

// Create child logger with specific context
export const createChildLogger = (context: Record<string, unknown>): pino.Logger => {
  return logger.child(context)
}
