import { FastifyPluginAsync } from 'fastify'

const root: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.get('/', (_request, reply) => {
    return reply.redirect('/docs')
  })
}

export default root