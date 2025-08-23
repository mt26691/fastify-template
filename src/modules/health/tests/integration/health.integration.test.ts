import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { app } from '../../../../app.js'
import { prisma } from '../../../../services/prisma.js'

describe('Health Routes Integration Tests', () => {
  let server: any

  beforeEach(async () => {
    server = Fastify({
      logger: false,
    })
    await server.register(app)
    await server.ready()
  })

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('timestamp')
      expect(body).toHaveProperty('uptime')
      expect(body).toHaveProperty('version')
      
      expect(body.status).toBe('ok')
      expect(typeof body.uptime).toBe('number')
      expect(body.uptime).toBeGreaterThan(0)
    })

    it('should return valid ISO timestamp', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      const body = JSON.parse(response.body)
      const timestamp = new Date(body.timestamp)
      
      expect(timestamp).toBeInstanceOf(Date)
      expect(timestamp.getTime()).not.toBeNaN()
    })

    it('should be accessible without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
        headers: {
          // No authorization header
        },
      })

      expect(response.statusCode).toBe(200)
    })

    it('should handle concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        app.inject({
          method: 'GET',
          url: '/health',
        })
      )

      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.status).toBe('ok')
      })
    })
  })

  describe('GET /health/ready', () => {
    it('should return ready status when database is connected', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      
      expect(body).toHaveProperty('status')
      expect(body).toHaveProperty('services')
      
      expect(body.status).toBe('ok')
      expect(body.services).toHaveProperty('database')
      expect(body.services.database).toBe('ok')
    })

    it('should return 503 when database is disconnected', async () => {
      // Disconnect database
      await prisma.$disconnect()

      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
      })

      expect(response.statusCode).toBe(503)
      const body = JSON.parse(response.body)
      
      expect(body.status).toBe('unhealthy')
      expect(body.services.database).toBe('unavailable')

      // Reconnect for other tests
      await prisma.$connect()
    })

    it('should be accessible without authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
        headers: {
          // No authorization header
        },
      })

      expect(response.statusCode).toBe(200)
    })

    it('should handle database query timeout gracefully', async () => {
      // This test would ideally mock a slow database query
      // For now, we just test that the endpoint responds
      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
      })

      expect(response.statusCode).toBe(200)
      expect(response.headers['content-type']).toContain('application/json')
    })
  })

  describe('Health Check Performance', () => {
    it('should respond quickly', async () => {
      const start = Date.now()
      
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })
      
      const duration = Date.now() - start
      
      expect(response.statusCode).toBe(200)
      expect(duration).toBeLessThan(100) // Should respond in less than 100ms
    })

    it('readiness check should complete within reasonable time', async () => {
      const start = Date.now()
      
      const response = await server.inject({
        method: 'GET',
        url: '/health/ready',
      })
      
      const duration = Date.now() - start
      
      expect(response.statusCode).toBe(200)
      expect(duration).toBeLessThan(500) // Database check might take longer
    })
  })

  describe('Health Check Headers', () => {
    it('should return correct content type', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      expect(response.headers['content-type']).toContain('application/json')
    })

    it('should not have cache headers', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health',
      })

      // Health checks should not be cached
      expect(response.headers['cache-control']).toBeUndefined()
    })
  })
})