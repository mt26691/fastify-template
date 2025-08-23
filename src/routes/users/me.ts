import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@services/prisma'
import { z } from 'zod'

// Schema for update request
const updateUserBodySchema = z.object({
  name: z.string().min(1).optional(),
  username: z.string().min(3).optional(),
  email: z.string().email().optional(),
})

const meRoute: FastifyPluginAsync = async (fastify, _opts) => {
  // Get current user information
  fastify.get(
    '/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Get current user information',
        security: [{ bearerAuth: [] }],
        response: {
          200: {
            description: 'Current user information',
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          404: {
            description: 'User not found',
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
        if (!request.user) {
          return await reply.code(401).send({ error: 'Unauthorized' })
        }

        const userId = request.user.id
        const user = await prisma.user.findUnique({
          where: {
            id: userId,
          },
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        if (!user) {
          return await reply.code(404).send({ error: 'User not found' })
        }

        return await reply.send(user)
      } catch (error) {
        fastify.log.error(error)
        return await reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // Update current user information
  fastify.patch(
    '/me',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Update current user information',
        security: [{ bearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1 },
            username: { type: 'string', minLength: 3 },
            email: { type: 'string', format: 'email' },
          },
          additionalProperties: false,
        },
        response: {
          200: {
            description: 'Updated user information',
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              username: { type: 'string' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['USER', 'ADMIN'] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
          400: {
            description: 'Bad request',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          409: {
            description: 'Conflict - username or email already exists',
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
        const validatedBody = updateUserBodySchema.parse(request.body)

        // Check if any data was provided
        if (Object.keys(validatedBody).length === 0) {
          return await reply.code(400).send({ error: 'No data provided to update' })
        }

        // Check if username or email already exists (if they're being updated)
        if (!request.user) {
          return await reply.code(401).send({ error: 'Unauthorized' })
        }

        if (validatedBody.username || validatedBody.email) {
          const existingUser = await prisma.user.findFirst({
            where: {
              AND: [
                { id: { not: request.user.id } },
                {
                  OR: [
                    validatedBody.username ? { username: validatedBody.username } : {},
                    validatedBody.email ? { email: validatedBody.email } : {},
                  ],
                },
              ],
            },
          })

          if (existingUser) {
            if (existingUser.username === validatedBody.username) {
              return await reply.code(409).send({ error: 'Username already exists' })
            }
            if (existingUser.email === validatedBody.email) {
              return await reply.code(409).send({ error: 'Email already exists' })
            }
          }
        }

        // Update user
        const userId = request.user.id
        const updatedUser = await prisma.user.update({
          where: {
            id: userId,
          },
          data: validatedBody,
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        fastify.log.info({ userId: updatedUser.id }, 'User updated their profile')
        return await reply.send(updatedUser)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return await reply.code(400).send({ error: error.errors[0].message })
        }

        fastify.log.error(error)
        return await reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )
}

export default meRoute
