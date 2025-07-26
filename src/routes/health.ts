import { FastifyPluginAsync } from 'fastify'

const health: FastifyPluginAsync = async (fastify, _opts) => {
  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint',
      tags: ['Health'],
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' }
          }
        }
      }
    }
  }, (_request, _reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString()
    }
  })
}

export default health