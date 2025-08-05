import { FastifyPluginAsync } from 'fastify'
import { AuthService } from '@services/auth'

const sessions: FastifyPluginAsync = async (fastify, _opts) => {
  const authService = new AuthService(fastify)

  // Get user sessions
  fastify.get(
    '/sessions',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Get all active sessions for the current user',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userAgent: { type: 'string', nullable: true },
                accessTokenExpiry: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return await reply.code(401).send({ error: 'Unauthorized' })
      }
      const sessions = await authService.getUserSessions(request.user.userId as string)
      return sessions
    }
  )

  // Invalidate specific session
  fastify.delete(
    '/sessions/:sessionId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Invalidate a specific session',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
          required: ['sessionId'],
        },
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return await reply.code(401).send({ error: 'Unauthorized' })
      }
      const { sessionId } = request.params as { sessionId: string }
      await authService.invalidateSession(sessionId, request.user.userId as string)
      return await reply.code(204).send()
    }
  )

  // Invalidate all sessions
  fastify.post(
    '/sessions/invalidate-all',
    {
      preHandler: [fastify.authenticate],
      schema: {
        description: 'Invalidate all sessions for the current user',
        tags: ['Authentication'],
        security: [{ bearerAuth: [] }],
        response: {
          204: {
            type: 'null',
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return await reply.code(401).send({ error: 'Unauthorized' })
      }
      await authService.invalidateAllSessions(request.user.userId as string)
      return await reply.code(204).send()
    }
  )
}

export default sessions
