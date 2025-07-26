import { FastifyPluginAsync } from 'fastify'
import AutoLoad from '@fastify/autoload'
import { join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')

export const app: FastifyPluginAsync = async (fastify, opts) => {
  // Register plugins
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: { ...opts }
  })

  // Register routes with v1 prefix
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'routes'),
    options: { ...opts, prefix: '/v1' }
  })
}