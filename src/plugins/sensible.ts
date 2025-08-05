import fp from 'fastify-plugin'
import sensible from 'fastify-sensible'

export default fp(async (fastify) => {
  await fastify.register(sensible, {
    errorHandler: true,
  })

  // Custom error handler
  fastify.setErrorHandler((error, request, reply) => {
    const { statusCode = 500, validation } = error

    // Log errors
    if (statusCode >= 500) {
      fastify.log.error({
        err: error,
        request: {
          method: request.method,
          url: request.url,
          headers: request.headers,
          params: request.params,
          query: request.query,
        },
      })
    } else {
      fastify.log.info({
        err: error,
        request: {
          method: request.method,
          url: request.url,
        },
      })
    }

    // Validation errors
    if (validation) {
      return reply.status(400).send({
        error: 'Validation Error',
        statusCode: 400,
        message: error.message,
        validation,
      })
    }

    // Known HTTP errors
    if (error.statusCode && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: error.name,
        statusCode: error.statusCode,
        message: error.message,
      })
    }

    // Generic server error
    return reply.status(500).send({
      error: 'Internal Server Error',
      statusCode: 500,
      message: statusCode >= 500 ? 'Something went wrong' : error.message,
    })
  })
})
