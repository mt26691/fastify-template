import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

const requestTimer: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('onRequest', async (request, _reply) => {
    request.startTime = process.hrtime.bigint()
  })

  fastify.addHook('onSend', async (request, reply, payload) => {
    if (request.startTime) {
      const endTime = process.hrtime.bigint()
      const responseTimeNs = endTime - request.startTime
      const responseTimeMs = Number(responseTimeNs / 1000000n)

      // Add our custom timing to the log context
      request.log.info(
        {
          processedTimeMs: responseTimeMs,
          endpoint: request.url,
          method: request.method,
          statusCode: reply.statusCode,
        },
        'request timing'
      )
    }
    return payload
  })
}

// Extend the FastifyRequest type to include startTime
declare module 'fastify' {
  interface FastifyRequest {
    startTime?: bigint
  }
}

export default fp(requestTimer, {
  name: 'request-timer',
})
