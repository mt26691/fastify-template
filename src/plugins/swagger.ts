import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { FastifyPluginAsync } from 'fastify'
import { config } from '@config/env'

const swaggerPlugin: FastifyPluginAsync = async (fastify, _opts) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: 'Fastify API',
        description: 'API documentation for Fastify application',
        version: '1.0.0',
      },
      servers: [
        {
          url: `http://localhost:${String(config.PORT)}`,
          description: 'Development server',
        },
      ],
      tags: [
        { name: 'Health', description: 'Health check endpoints' },
        { name: 'Authentication', description: 'User authentication endpoints' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
  })

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject, _request, _reply) => swaggerObject,
    transformSpecificationClone: true,
  })
}

export default fp(swaggerPlugin, {
  name: 'swagger',
})
