import { FastifyPluginAsync } from 'fastify'
import { prisma } from '@services/prisma'
import { z } from 'zod'

// Schema for query parameters
const getUsersQuerySchema = z.object({
  page: z.string().transform(Number).pipe(z.number().positive()).optional(),
  limit: z.string().transform(Number).pipe(z.number().positive().max(100)).optional(),
  search: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
})

const usersRoute: FastifyPluginAsync = async (fastify, _opts) => {
  // Get all users (admin only)
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Get all users (admin only)',
        security: [{ bearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            page: { type: 'integer', minimum: 1, default: 1 },
            limit: { type: 'integer', minimum: 1, maximum: 100, default: 10 },
            search: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
          },
        },
        response: {
          200: {
            description: 'List of users',
            type: 'object',
            properties: {
              users: {
                type: 'array',
                items: {
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
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  limit: { type: 'integer' },
                  total: { type: 'integer' },
                  totalPages: { type: 'integer' },
                },
              },
            },
          },
          401: {
            description: 'Unauthorized',
            type: 'object',
            properties: {
              error: { type: 'string' },
            },
          },
          403: {
            description: 'Forbidden - admin access required',
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
        // Check if user is admin
        if (!request.user || request.user.role !== 'ADMIN') {
          return await reply.code(403).send({ error: 'Admin access required' })
        }

        const query = getUsersQuerySchema.parse(request.query)
        const page = query.page || 1
        const limit = query.limit || 10
        const skip = (page - 1) * limit

        // Build where clause
        interface WhereClause {
          OR?: Array<{
            name?: { contains: string; mode: 'insensitive' }
            username?: { contains: string; mode: 'insensitive' }
            email?: { contains: string; mode: 'insensitive' }
          }>
          role?: 'USER' | 'ADMIN'
        }
        const where: WhereClause = {}
        if (query.search) {
          where.OR = [
            { name: { contains: query.search, mode: 'insensitive' } },
            { username: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ]
        }
        if (query.role) {
          where.role = query.role
        }

        // Get users and count
        const [users, total] = await Promise.all([
          prisma.user.findMany({
            where,
            select: {
              id: true,
              name: true,
              username: true,
              email: true,
              role: true,
              createdAt: true,
              updatedAt: true,
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
          }),
          prisma.user.count({ where }),
        ])

        const totalPages = Math.ceil(total / limit)

        return await reply.send({
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages,
          },
        })
      } catch (error) {
        if (error instanceof z.ZodError) {
          return await reply.code(400).send({ error: error.errors[0].message })
        }

        fastify.log.error(error)
        return await reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // Get user by ID (admin only)
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Get user by ID (admin only)',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            id: { type: 'string' },
          },
          required: ['id'],
        },
        response: {
          200: {
            description: 'User information',
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
          403: {
            description: 'Forbidden - admin access required',
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
        // Check if user is admin
        if (!request.user || request.user.role !== 'ADMIN') {
          return await reply.code(403).send({ error: 'Admin access required' })
        }

        const { id } = request.params as { id: string }

        const user = await prisma.user.findUnique({
          where: { id },
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
}

export default usersRoute
