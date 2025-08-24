import { FastifyPluginAsync } from 'fastify'
import AutoLoad from '@fastify/autoload'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export const app: FastifyPluginAsync = async (fastify, opts) => {
  // Set TypeBox as the type provider
  fastify.withTypeProvider<TypeBoxTypeProvider>()

  // Register plugins
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: { ...opts },
  })

  // Register module routes with autoPrefix
  await fastify.register(AutoLoad, {
    dir: join(__dirname, 'modules'),
    matchFilter: (path) => path.endsWith('.routes.ts') || path.endsWith('.routes.js'),
    autoHooks: true,
    cascadeHooks: true,
    options: { ...opts, prefix: '/api' },
  })
}
