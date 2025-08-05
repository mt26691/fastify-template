import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthService } from '@services/auth'

const signUpSchema = z.object({
  name: z.string().min(1).max(100),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/),
  email: z.string().email(),
  password: z.string().min(8).max(100),
})

const signup: FastifyPluginAsync = async (fastify, _opts) => {
  const authService = new AuthService(fastify)

  fastify.post(
    '/signup',
    {
      schema: {
        description: 'Create a new user account',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['name', 'username', 'email', 'password'],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            username: { type: 'string', minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8, maxLength: 100 },
          },
        },
        response: {
          201: {
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
          400: {
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
        const data = signUpSchema.parse(request.body)
        const result = await authService.signUp(data)
        return await reply.code(201).send(result)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: error.errors[0].message })
        }
        if (error instanceof Error) {
          return reply.code(400).send({ error: error.message })
        }
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )
}

export default signup
