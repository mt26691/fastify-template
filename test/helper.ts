import { FastifyInstance } from 'fastify'
import { app } from '../src/app'
import fastify from 'fastify'
import { config } from '../src/config/env'

export async function build(): Promise<FastifyInstance> {
  const server = fastify({
    logger: {
      level: config.NODE_ENV === 'test' ? 'error' : 'info',
    },
  })

  await server.register(app)
  await server.ready()

  return server
}