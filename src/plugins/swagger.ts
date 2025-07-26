import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { FastifyPluginAsync } from 'fastify'
import { config } from '@config/env'

const swaggerPlugin: FastifyPluginAsync = async (fastify, opts) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Fastify API',
        description: 'API documentation for Fastify application',
        version: '1.0.0'
      },
      servers: [
        {
          url: `http://localhost:${config.PORT}`,
          description: 'Development server'
        }
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' }
      ]
    }
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, request, reply) => swaggerObject,
    transformSpecificationClone: true
  })
}

export default fp(swaggerPlugin, {
  name: 'swagger'
})