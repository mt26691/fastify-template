import { FastifyPluginAsyncTypebox } from '../../types/fastify'
import { AuthService } from '../../services/auth'
import * as S from './auth.schema'

export const autoPrefix = '/auth'

const authRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  const authService = new AuthService(fastify)

  // Sign up
  fastify.post(
    '/signup',
    {
      schema: {
        tags: ['auth'],
        summary: 'Create a new user account',
        body: S.SignUpBody,
        response: {
          201: S.AuthResponse,
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
          409: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { email: _email, username: _username } = request.body

      // Create user - service handles duplicate checking
      try {
        const result = await authService.signUp(request.body)
        return await reply.code(201).send(result)
      } catch (error) {
        if (error instanceof Error && error.message.includes('already exists')) {
          throw fastify.httpErrors.conflict(error.message)
        }
        throw error
      }
    }
  )

  // Sign in
  fastify.post(
    '/signin',
    {
      schema: {
        tags: ['auth'],
        summary: 'Sign in with email and password',
        body: S.SignInBody,
        response: {
          200: S.AuthResponse,
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await authService.signIn(request.body, request.headers['user-agent'])
        return reply.send(result)
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid credentials') {
          throw fastify.httpErrors.unauthorized(error.message)
        }
        throw error
      }
    }
  )

  // Refresh token
  fastify.post(
    '/refresh',
    {
      schema: {
        tags: ['auth'],
        summary: 'Refresh access token',
        body: S.RefreshTokenBody,
        response: {
          200: S.AuthResponse,
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await authService.refreshAccessToken(request.body.refreshToken)
      if (!result) {
        throw fastify.httpErrors.unauthorized('Invalid or expired refresh token')
      }
      return reply.send({
        user: {
          // Note: User data would need to be fetched or included in the result
          id: '',
          name: '',
          username: '',
          email: '',
          role: 'USER' as const,
        },
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      })
    }
  )

  // Sign out
  fastify.post(
    '/signout',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Sign out current session',
        security: [{ bearerAuth: [] }],
        response: {
          200: S.MessageResponse,
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const token = request.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        throw fastify.httpErrors.unauthorized('No token provided')
      }

      // Extract sessionId from token and invalidate
      const decoded = fastify.jwt.decode(token) as { sessionId?: string; userId?: string }
      if (decoded !== null && 'sessionId' in decoded && 'userId' in decoded && decoded.sessionId && decoded.userId) {
        await authService.invalidateSession(decoded.sessionId, decoded.userId)
      }
      return reply.send({ message: 'Successfully signed out' })
    }
  )

  // Get sessions
  fastify.get(
    '/sessions',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Get all active sessions for the current user',
        security: [{ bearerAuth: [] }],
        response: {
          200: S.SessionsListResponse,
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw fastify.httpErrors.unauthorized()
      }

      const token = request.headers.authorization?.replace('Bearer ', '')
      const sessions = await authService.getUserSessions(request.user.id)

      // Determine current session ID from token
      const decoded = fastify.jwt.decode(token ?? '') as { sessionId?: string }
      const currentSessionId = decoded !== null && 'sessionId' in decoded && decoded.sessionId ? decoded.sessionId : ''

      return reply.send({
        sessions: sessions.map((s) => ({
          id: s.id,
          deviceId: '', // Would need to be added to getUserSessions return
          browser: undefined,
          userAgent: s.userAgent || undefined,
          ipAddresses: [], // Would need to be added to getUserSessions return
          createdAt: s.createdAt.toISOString(),
          updatedAt: s.createdAt.toISOString(), // Using createdAt as updatedAt is not returned
          lastActiveAt: s.createdAt.toISOString(),
        })),
        currentSessionId,
      })
    }
  )

  // Revoke session
  fastify.delete(
    '/sessions/:sessionId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['auth'],
        summary: 'Revoke a specific session',
        security: [{ bearerAuth: [] }],
        params: {
          type: 'object',
          properties: {
            sessionId: { type: 'string' },
          },
          required: ['sessionId'],
        },
        response: {
          200: S.MessageResponse,
          401: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
          404: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        throw fastify.httpErrors.unauthorized()
      }

      const { sessionId } = request.params as { sessionId: string }
      await authService.invalidateSession(sessionId, request.user.id)
      return reply.send({ message: 'Session revoked successfully' })
    }
  )

  // Request password reset
  fastify.post(
    '/password-reset/request',
    {
      schema: {
        tags: ['auth'],
        summary: 'Request a password reset token',
        body: S.PasswordResetRequestBody,
        response: {
          200: S.MessageResponse,
        },
      },
    },
    async (request, reply) => {
      const result = await authService.requestPasswordReset(request.body.email)
      const response: any = { message: 'If the email exists, a reset link will be sent' }
      
      // In development/test mode, include the token
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        response.token = result
      }
      
      return reply.send(response)
    }
  )

  // Reset password
  fastify.post(
    '/password-reset/confirm',
    {
      schema: {
        tags: ['auth'],
        summary: 'Reset password with token',
        body: S.PasswordResetBody,
        response: {
          200: S.MessageResponse,
          400: {
            type: 'object',
            properties: {
              error: { type: 'string' },
              statusCode: { type: 'integer' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        await authService.resetPassword(request.body.token, request.body.newPassword)
        return reply.send({ message: 'Password reset successful' })
      } catch (error) {
        if (error instanceof Error && error.message === 'Invalid or expired reset token') {
          throw fastify.httpErrors.badRequest(error.message)
        }
        throw error
      }
    }
  )
}

export default authRoutes
