import { FastifyPluginAsync } from 'fastify'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { UserType } from '../modules/user/user.schema'

// TypeBox plugin type
export type FastifyPluginAsyncTypebox = FastifyPluginAsync<
  Record<never, never>,
  import('fastify').RawServerDefault,
  TypeBoxTypeProvider
>

// Extend Fastify instance
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    prisma: import('@prisma/client').PrismaClient
  }

  interface FastifyRequest {
    user?: UserType
  }
}
