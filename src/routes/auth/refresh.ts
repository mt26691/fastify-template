import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthService } from '@services/auth'

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
})

const refresh: FastifyPluginAsync = async (fastify, _opts) => {
  const authService = new AuthService(fastify)

  fastify.post(
    '/refresh',
    {
      schema: {
        description: 'Refresh access token using refresh token',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              accessToken: { type: 'string' },
              refreshToken: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { refreshToken } = refreshSchema.parse(request.body)
        const tokens = await authService.refreshAccessToken(refreshToken)

        if (!tokens) {
          return await reply.code(401).send({ error: 'Invalid or expired refresh token' })
        }

        return await reply.send(tokens)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return await reply.code(400).send({ error: 'Invalid input' })
        }
        return await reply.code(401).send({ error: 'Invalid or expired refresh token' })
      }
    }
  )
}

export default refresh
