import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthService } from '@services/auth'

const signInSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

const signin: FastifyPluginAsync = async (fastify, _opts) => {
  const authService = new AuthService(fastify)

  fastify.post('/signin', {
    schema: {
      description: 'Sign in with username/email and password',
      tags: ['Authentication'],
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string', description: 'Username or email' },
          password: { type: 'string' },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                role: { type: 'string' },
                createdAt: { type: 'string' },
              },
            },
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
  }, async (request, reply) => {
    try {
      const data = signInSchema.parse(request.body)
      const userAgent = request.headers['user-agent']
      const result = await authService.signIn(data, userAgent)
      return await reply.send(result)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({ error: 'Invalid input' })
      }
      if (error instanceof Error && error.message === 'Invalid credentials') {
        return reply.code(401).send({ error: error.message })
      }
      return reply.code(500).send({ error: 'Internal server error' })
    }
  })
}

export default signin