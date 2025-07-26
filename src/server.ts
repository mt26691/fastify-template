import Fastify from 'fastify'
import { app } from '@/app'
import { config } from '@config/env'

const server = Fastify({
  logger: {
    level: config.LOG_LEVEL,
    transport: config.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  }
})

server.register(app)

const start = async () => {
  try {
    await server.listen({ 
      port: config.PORT, 
      host: config.HOST 
    })
    console.log(`Server listening on http://${config.HOST}:${config.PORT}`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

start()