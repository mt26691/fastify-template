import { FastifyPluginAsyncTypebox } from '../../types/fastify'
import { UserService } from './user.service'
import * as S from './user.schema'
import * as C from './user.controller'

export const autoPrefix = '/users'

const userRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  // Create service instance
  const userService = new UserService(fastify)

  // Bind controller context
  const controllerContext = { userService }

  // Create user (admin only)
  fastify.post(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Create a new user (admin only)',
        security: [{ bearerAuth: [] }],
        body: S.CreateUserBody,
        response: {
          201: S.User,
          400: S.ErrorResponse,
          401: S.ErrorResponse,
          403: S.ErrorResponse,
          409: S.ErrorResponse,
        },
      },
    },
    C.createUser.bind(controllerContext)
  )

  // Get all users (admin only)
  fastify.get(
    '/',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Get all users (admin only)',
        security: [{ bearerAuth: [] }],
        querystring: S.GetUsersQuery,
        response: {
          200: S.UsersListResponse,
          401: S.ErrorResponse,
          403: S.ErrorResponse,
        },
      },
    },
    C.getUsers.bind(controllerContext)
  )

  // Get user by ID
  fastify.get(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Get user by ID',
        security: [{ bearerAuth: [] }],
        params: S.UserIdParams,
        response: {
          200: S.User,
          401: S.ErrorResponse,
          403: S.ErrorResponse,
          404: S.ErrorResponse,
        },
      },
    },
    C.getUser.bind(controllerContext)
  )

  // Update user
  fastify.patch(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Update user',
        security: [{ bearerAuth: [] }],
        params: S.UserIdParams,
        body: S.UpdateUserBody,
        response: {
          200: S.User,
          400: S.ErrorResponse,
          401: S.ErrorResponse,
          403: S.ErrorResponse,
          404: S.ErrorResponse,
          409: S.ErrorResponse,
        },
      },
    },
    C.updateUser.bind(controllerContext)
  )

  // Delete user (admin only)
  fastify.delete(
    '/:id',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['users'],
        summary: 'Delete user (admin only)',
        security: [{ bearerAuth: [] }],
        params: S.UserIdParams,
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
            },
          },
          400: S.ErrorResponse,
          401: S.ErrorResponse,
          403: S.ErrorResponse,
          404: S.ErrorResponse,
        },
      },
    },
    C.deleteUser.bind(controllerContext)
  )
}

export default userRoutes
