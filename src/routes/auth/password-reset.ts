import { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { AuthService } from '@services/auth'
import { config } from '@config/env'

const requestResetSchema = z.object({
  email: z.string().email(),
})

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

const passwordReset: FastifyPluginAsync = async (fastify, _opts) => {
  const authService = new AuthService(fastify)

  // Request password reset
  fastify.post(
    '/password-reset/request',
    {
      schema: {
        description: 'Request a password reset token',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['email'],
          properties: {
            email: { type: 'string', format: 'email' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              token: { type: 'string', description: 'Only in development' },
            },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const { email } = requestResetSchema.parse(request.body)
        const token = await authService.requestPasswordReset(email)

        const response: { message: string; token?: string } = {
          message: 'If the email exists, a reset link will be sent',
        }

        // Only return token in development
        if (config.NODE_ENV === 'development') {
          response.token = token
        }

        return await reply.send(response)
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({ error: 'Invalid email' })
        }
        return reply.code(500).send({ error: 'Internal server error' })
      }
    }
  )

  // Reset password
  fastify.post(
    '/password-reset/confirm',
    {
      schema: {
        description: 'Reset password with token',
        tags: ['Authentication'],
        body: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: { type: 'string' },
            newPassword: { type: 'string', minLength: 8, maxLength: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              message: { type: 'string' },
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
        const data = resetPasswordSchema.parse(request.body)
        await authService.resetPassword(data.token, data.newPassword)
        return await reply.send({ message: 'Password reset successful' })
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

export default passwordReset
