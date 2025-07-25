import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyPluginAsync, FastifyRequest, FastifyReply, onRequestHookHandler } from 'fastify'
import { config } from '@config/env'
import { prisma } from '@services/prisma'
import type { JWTPayload } from '@services/auth'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JWTPayload
  }
}

const jwtPlugin: FastifyPluginAsync = async (fastify, _opts) => {
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  })

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const token = request.headers.authorization?.replace('Bearer ', '')
      
      if (!token) {
        return await reply.code(401).send({ error: 'No token provided' })
      }

      const decoded = fastify.jwt.verify<JWTPayload>(token)

      // Verify session is still valid
      const session = await prisma.userSession.findUnique({
        where: {
          id: decoded.sessionId,
          accessToken: token,
        },
      })

      if (!session || session.accessTokenExpiry < new Date()) {
        return await reply.code(401).send({ error: 'Invalid or expired session' })
      }

      request.user = decoded
    } catch {
      return await reply.code(401).send({ error: 'Invalid token' })
    }
  })
}

export default fp(jwtPlugin, {
  name: 'jwt',
})