import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { FastifyInstance } from 'fastify'
import { build } from '../../../../test/helper'
import { prisma } from '../../../../services/prisma'

describe('User Routes Integration Tests', () => {
  let app: FastifyInstance
  let adminToken: string
  let userToken: string
  let adminUserId: string
  let regularUserId: string

  beforeAll(async () => {
    app = await build()
    
    // Clean database
    await prisma.userSession.deleteMany()
    await prisma.passwordResetToken.deleteMany()
    await prisma.user.deleteMany()

    // Create admin user
    const adminResponse = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        name: 'Admin User',
        username: 'admin',
        email: 'admin@example.com',
        password: 'AdminPass123!',
      },
    })
    
    const adminData = JSON.parse(adminResponse.body)
    adminToken = adminData.accessToken
    adminUserId = adminData.user.id

    // Update admin role directly in database
    await prisma.user.update({
      where: { id: adminUserId },
      data: { role: 'ADMIN' },
    })

    // Create regular user
    const userResponse = await app.inject({
      method: 'POST',
      url: '/auth/signup',
      payload: {
        name: 'Regular User',
        username: 'user',
        email: 'user@example.com',
        password: 'UserPass123!',
      },
    })
    
    const userData = JSON.parse(userResponse.body)
    userToken = userData.accessToken
    regularUserId = userData.user.id
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(async () => {
    // Clean up test users (except admin and regular user)
    await prisma.user.deleteMany({
      where: {
        id: {
          notIn: [adminUserId, regularUserId],
        },
      },
    })
  })

  describe('POST /users (Create User)', () => {
    it('should allow admin to create a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'New User',
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'NewPass123!',
          role: 'USER',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body).toMatchObject({
        name: 'New User',
        username: 'newuser',
        email: 'newuser@example.com',
        role: 'USER',
      })
      expect(body.password).toBeUndefined()
      expect(body.salt).toBeUndefined()
    })

    it('should reject non-admin user creating users', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Another User',
          username: 'anotheruser',
          email: 'another@example.com',
          password: 'AnotherPass123!',
        },
      })

      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('Admin access required')
    })

    it('should reject duplicate email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Duplicate User',
          username: 'duplicate',
          email: 'admin@example.com', // Existing email
          password: 'DupePass123!',
        },
      })

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('email already exists')
    })
  })

  describe('GET /users (List Users)', () => {
    it('should allow admin to list all users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('users')
      expect(body).toHaveProperty('pagination')
      expect(Array.isArray(body.users)).toBe(true)
      expect(body.users.length).toBeGreaterThanOrEqual(2) // At least admin and regular user
    })

    it('should support pagination', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users?page=1&limit=1',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.users).toHaveLength(1)
      expect(body.pagination.limit).toBe(1)
      expect(body.pagination.page).toBe(1)
    })

    it('should support search', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users?search=admin',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.users.length).toBeGreaterThanOrEqual(1)
      expect(body.users.some((u: any) => 
        u.name.toLowerCase().includes('admin') || 
        u.username.toLowerCase().includes('admin') ||
        u.email.toLowerCase().includes('admin')
      )).toBe(true)
    })

    it('should filter by role', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users?role=ADMIN',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.users.every((u: any) => u.role === 'ADMIN')).toBe(true)
    })

    it('should reject non-admin user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users',
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })

  describe('GET /users/:id (Get User)', () => {
    it('should allow admin to get any user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(regularUserId)
      expect(body.email).toBe('user@example.com')
    })

    it('should allow user to get their own profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBe(regularUserId)
    })

    it('should reject user getting another user profile', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/users/${adminUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/users/00000000-0000-0000-0000-000000000000',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(404)
    })
  })

  describe('PATCH /users/:id (Update User)', () => {
    it('should allow admin to update any user', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Updated User Name',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Updated User Name')
    })

    it('should allow user to update their own profile', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          name: 'Self Updated Name',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.name).toBe('Self Updated Name')
    })

    it('should prevent non-admin from changing role', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${regularUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
        payload: {
          role: 'ADMIN',
        },
      })

      expect(response.statusCode).toBe(403)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('Cannot change own role')
    })

    it('should allow admin to change user role', async () => {
      // Create a test user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Role Test User',
          username: 'roletest',
          email: 'roletest@example.com',
          password: 'RoleTest123!',
        },
      })
      const { id } = JSON.parse(createResponse.body)

      const response = await app.inject({
        method: 'PATCH',
        url: `/users/${id}`,
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

  describe('DELETE /users/:id (Delete User)', () => {
    it('should allow admin to delete users', async () => {
      // Create a test user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          name: 'Delete Test User',
          username: 'deletetest',
          email: 'delete@example.com',
          password: 'Delete123!',
        },
      })
      const { id } = JSON.parse(createResponse.body)

      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('deleted successfully')

      // Verify user is deleted
      const getResponse = await app.inject({
        method: 'GET',
        url: `/users/${id}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })
      expect(getResponse.statusCode).toBe(404)
    })

    it('should prevent admin from deleting themselves', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${adminUserId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('Cannot delete own account')
    })

    it('should reject non-admin user', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: `/users/${adminUserId}`,
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      })

      expect(response.statusCode).toBe(403)
    })
  })
})