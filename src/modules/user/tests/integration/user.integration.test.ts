import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { app } from '../../../../app.js'
import { prisma } from '../../../../services/prisma.js'

describe('User Routes Integration Tests', () => {
  let server: any
  let adminToken: string
  let userToken: string
  let adminUserId: string
  let regularUserId: string

  beforeEach(async () => {
    server = Fastify({
      logger: false,
    })
    await server.register(app)
    await server.ready()
    
    // Clean database
    await prisma.userSession.deleteMany()
    await prisma.passwordResetToken.deleteMany()
    await prisma.user.deleteMany()

    // Create admin user
    const adminResponse = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        name: 'Admin User',
        username: 'admin',
        email: 'admin@example.com',
        password: 'AdminPass123!',
      },
    })
    const adminBody = JSON.parse(adminResponse.body)
    adminUserId = adminBody.user.id
    adminToken = adminBody.accessToken

    // Update admin user to have ADMIN role
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'ADMIN' },
    })

    // Create regular user
    const userResponse = await server.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        name: 'Regular User',
        username: 'regular',
        email: 'regular@example.com',
        password: 'UserPass123!',
      },
    })
    const userBody = JSON.parse(userResponse.body)
    regularUserId = userBody.user.id
    userToken = userBody.accessToken
  })

  describe('GET /users', () => {
    it('should require authentication', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should allow regular users to list users', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBe(2) // Admin and regular user
    })

    it('should support pagination', async () => {
      // Create additional users
      for (let i = 0; i < 5; i++) {
        await server.inject({
          method: 'POST',
          url: '/auth/signup',
          payload: {
            name: `Test User ${i}`,
            username: `testuser${i}`,
            email: `test${i}@example.com`,
            password: 'TestPass123!',
          },
        })
      }

      const response = await server.inject({
        method: 'GET',
        url: '/users?limit=3&offset=0',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.length).toBe(3)
    })
  })

  describe('GET /users/:id', () => {
    it('should allow users to get their own profile', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(regularUserId)
      expect(body.username).toBe('regular')
      expect(body).not.toHaveProperty('password')
      expect(body).not.toHaveProperty('salt')
    })

    it('should allow users to get other user profiles', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/users/${adminUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(adminUserId)
    })

    it('should return 404 for non-existent user', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/users/non-existent-id',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('PATCH /users/:id', () => {
    it('should allow users to update their own profile', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Updated Name',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Updated Name')
    })

    it('should not allow users to update other profiles', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/users/${adminUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Hacked Name',
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should allow admins to update any profile', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Admin Updated Name',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Admin Updated Name')
    })

    it('should validate unique username', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          username: 'admin', // Already taken
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('Username already exists')
    })

    it('should validate unique email', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          email: 'admin@example.com', // Already taken
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('Email already exists')
    })

    it('should allow users to update their password', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          password: 'NewPassword123!',
        },
      })

      expect(response.statusCode).toBe(200)

      // Try to sign in with new password
      const signinResponse = await server.inject({
        method: 'POST',
        url: '/auth/signin',
        payload: {
          username: 'regular',
          password: 'NewPassword123!',
        },
      })

      expect(signinResponse.statusCode).toBe(200)
    })
  })

  describe('DELETE /users/:id', () => {
    it('should not allow regular users to delete any user', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should allow admins to delete users', async () => {
      // Create a user to delete
      const createResponse = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'To Delete',
          username: 'todelete',
          email: 'todelete@example.com',
          password: 'DeleteMe123!',
        },
      })
      const createBody = JSON.parse(createResponse.body)
      const userToDeleteId = createBody.user.id

      // Delete the user
      const response = await server.inject({
        method: 'DELETE',
        url: `/users/${userToDeleteId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(204)

      // Verify user is deleted
      const getResponse = await server.inject({
        method: 'GET',
        url: `/users/${userToDeleteId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(getResponse.statusCode).toBe(404)
    })

    it('should return 404 when deleting non-existent user', async () => {
      const response = await server.inject({
        method: 'DELETE',
        url: '/users/non-existent-id',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('Role-based access control', () => {
    it('should not allow regular users to change roles', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          role: 'ADMIN', // Trying to escalate privileges
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.role).toBe('USER') // Should remain USER
    })

    it('should allow admins to change user roles', async () => {
      const response = await server.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          role: 'ADMIN',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.role).toBe('ADMIN')
    })
  })
})