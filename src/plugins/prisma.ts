import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'
import { prisma, disconnectPrisma } from '@services/prisma'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: typeof prisma
  }
}

const prismaPlugin: FastifyPluginAsync = async (fastify, _opts) => {
  await prisma.$connect()
  
  fastify.decorate('prisma', prisma)
  
  fastify.addHook('onClose', async () => {
    await disconnectPrisma()
  })
}

export default fp(prismaPlugin, {
  name: 'prisma'
})