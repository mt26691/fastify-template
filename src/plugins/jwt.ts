import fp from 'fastify-plugin'
import jwt from '@fastify/jwt'
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { config } from '@config/env'
import { UserType } from '../modules/user/user.schema'

interface JWTPayload {
  userId: string
  username: string
  email: string
  role: 'USER' | 'ADMIN'
  sessionId: string
  type: 'access' | 'refresh'
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload
    user: UserType
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

      request.user = {
        id: decoded.userId,
        name: '', // Will be populated from DB if needed
        username: decoded.username,
        email: decoded.email,
        role: decoded.role,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    } catch {
      return await reply.code(401).send({ error: 'Invalid token' })
    }
  })
}

export default fp(jwtPlugin, {
  name: 'jwt',
})
