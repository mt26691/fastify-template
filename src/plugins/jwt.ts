import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyPluginAsync, FastifyRequest } from 'fastify'
import { config } from '@config/env'
import { prisma } from '@services/prisma'
import type { JWTPayload } from '@services/auth'

declare module 'fastify' {
  interface FastifyRequest {
    user?: JWTPayload
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify, _opts) => {
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  })

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: any) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return reply.code(401).send({ error: 'No token provided' })
      }

      const decoded = fastify.jwt.verify(token) as JWTPayload

      // Verify session is still valid
      const session = await prisma.userSession.findUnique({
        where: {
          id: decoded.sessionId,
          accessToken: token,
        },
      })

      if (!session || session.accessTokenExpiry < new Date()) {
        return reply.code(401).send({ error: 'Invalid or expired session' })
      }

      request.user = decoded
    } catch (err) {
      return reply.code(401).send({ error: 'Invalid token' })
    }
  })
}

export default fp(jwtPlugin, {
  name: 'jwt',
})