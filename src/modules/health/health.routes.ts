import { FastifyPluginAsync } from 'fastify'

export const autoPrefix = '/health'

const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get(
    '/',
    {
      schema: {
        tags: ['health'],
        summary: 'Health check endpoint',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              uptime: { type: 'number' },
              version: { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const healthCheck = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      }

      return reply.send(healthCheck)
    }
  )

  fastify.get(
    '/ready',
    {
      schema: {
        tags: ['health'],
        summary: 'Readiness check endpoint',
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  database: { type: 'string' },
                },
              },
            },
          },
          503: {
            type: 'object',
            properties: {
              status: { type: 'string' },
              services: {
                type: 'object',
                properties: {
                  database: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      const services: { database: string } = {
        database: 'unavailable',
      }

      try {
        // Check database connectivity
        await fastify.prisma.$queryRaw`SELECT 1`
        services.database = 'ok'
      } catch (error) {
        fastify.log.error('Database health check failed:', error)
      }

      const isHealthy = Object.values(services).every((status) => status === 'ok')
      const statusCode = isHealthy ? 200 : 503

      return reply.code(statusCode).send({
        status: isHealthy ? 'ok' : 'unhealthy',
        services,
      })
    }
  )
}

export default healthRoutes
