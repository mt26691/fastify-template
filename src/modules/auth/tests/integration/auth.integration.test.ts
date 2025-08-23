import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { app } from '../../../../app.js'
import { prisma } from '../../../../services/prisma.js'

describe('Auth Routes Integration Tests', () => {
  let server: any
  let testUserId: string
  let testAccessToken: string
  let testRefreshToken: string

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
  })

  describe('POST /auth/signup', () => {
    it('should create a new user successfully', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      
      expect(body).toHaveProperty('user')
      expect(body).toHaveProperty('accessToken')
      expect(body).toHaveProperty('refreshToken')
      
      expect(body.user).toMatchObject({
        name: 'Test User',
        username: 'testuser',
        email: 'test@example.com',
        role: 'USER',
      })
      
      expect(body.user).not.toHaveProperty('password')
      expect(body.user).not.toHaveProperty('salt')
    })

    it('should validate required fields', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          username: 'testuser',
          // Missing name, email, password
        },
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject duplicate username', async () => {
      // Create first user
      await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User 1',
          username: 'testuser',
          email: 'test1@example.com',
          password: 'TestPass123!',
        },
      })

      // Try to create with same username
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User 2',
          username: 'testuser',
          email: 'test2@example.com',
          password: 'TestPass123!',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('Username already exists')
    })

    it('should reject duplicate email', async () => {
      // Create first user
      await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User 1',
          username: 'testuser1',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })

      // Try to create with same email
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User 2',
          username: 'testuser2',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.error).toContain('Email already exists')
    })
  })

  describe('POST /auth/signin', () => {
    beforeEach(async () => {
      // Create a test user
      const { body } = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })
      const parsedBody = JSON.parse(body)
      testUserId = parsedBody.user.id
    })

    it('should sign in with username', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signin',
        payload: {
          username: 'testuser',
          password: 'TestPass123!',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      
      expect(body).toHaveProperty('user')
      expect(body).toHaveProperty('accessToken')
      expect(body).toHaveProperty('refreshToken')
      
      expect(body.user.username).toBe('testuser')
    })

    it('should sign in with email', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signin',
        payload: {
          username: 'test@example.com', // Email used as username
          password: 'TestPass123!',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      
      expect(body).toHaveProperty('user')
      expect(body).toHaveProperty('accessToken')
      expect(body).toHaveProperty('refreshToken')
    })

    it('should reject invalid password', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signin',
        payload: {
          username: 'testuser',
          password: 'WrongPassword!',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Invalid credentials')
    })

    it('should reject non-existent user', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signin',
        payload: {
          username: 'nonexistent',
          password: 'TestPass123!',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Invalid credentials')
    })
  })

  describe('POST /auth/refresh', () => {
    beforeEach(async () => {
      // Create and sign in a test user
      const { body: user } = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })
      const parsedUser = JSON.parse(user)
      testUserId = parsedUser.user.id
      testAccessToken = parsedUser.accessToken
      testRefreshToken = parsedUser.refreshToken
    })

    it('should refresh tokens with valid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: testRefreshToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      
      expect(body).toHaveProperty('accessToken')
      expect(body).toHaveProperty('refreshToken')
      
      // New tokens should be different
      expect(body.accessToken).not.toBe(testAccessToken)
      expect(body.refreshToken).not.toBe(testRefreshToken)
    })

    it('should reject invalid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Invalid or expired refresh token')
    })

    it('should reject access token as refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: testAccessToken, // Using access token
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.error).toBe('Invalid or expired refresh token')
    })
  })

  describe('GET /auth/sessions', () => {
    beforeEach(async () => {
      // Create and sign in a test user
      const { body: user } = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })
      const parsedUser = JSON.parse(user)
      testUserId = parsedUser.user.id
      testAccessToken = parsedUser.accessToken
    })

    it('should get user sessions with valid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/sessions',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
      expect(body[0]).toHaveProperty('id')
      expect(body[0]).toHaveProperty('accessTokenExpiry')
      expect(body[0]).toHaveProperty('refreshTokenExpiry')
    })

    it('should reject without authorization', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/sessions',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject with invalid token', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/sessions',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /auth/sessions/invalidate-all', () => {
    beforeEach(async () => {
      // Create and sign in a test user
      const { body: user } = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })
      const parsedUser = JSON.parse(user)
      testUserId = parsedUser.user.id
      testAccessToken = parsedUser.accessToken
    })

    it('should invalidate all sessions', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/sessions/invalidate-all',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
      })

      expect(response.statusCode).toBe(204)

      // Try to use the token again - should fail
      const checkResponse = await server.inject({
        method: 'GET',
        url: '/auth/sessions',
        headers: {
          authorization: `Bearer ${testAccessToken}`,
        },
      })

      expect(checkResponse.statusCode).toBe(401)
    })
  })

  describe('Password Reset Flow', () => {
    beforeEach(async () => {
      // Create a test user
      await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })
    })

    describe('POST /auth/password-reset/request', () => {
      it('should request password reset', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/password-reset/request',
          payload: {
            email: 'test@example.com',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.message).toBe('If the email exists, a reset link will be sent')
        
        // In development/test, we get the token
        if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
          expect(body).toHaveProperty('token')
        }
      })

      it('should handle non-existent email gracefully', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/password-reset/request',
          payload: {
            email: 'nonexistent@example.com',
          },
        })

        // Should return same response to prevent email enumeration
        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.message).toBe('If the email exists, a reset link will be sent')
      })
    })

    describe('POST /auth/password-reset/confirm', () => {
      it('should reset password with valid token', async () => {
        // Request reset
        const resetResponse = await server.inject({
          method: 'POST',
          url: '/auth/password-reset/request',
          payload: {
            email: 'test@example.com',
          },
        })
        const resetBody = JSON.parse(resetResponse.body)
        const resetToken = resetBody.token

        // Reset password
        const response = await server.inject({
          method: 'POST',
          url: '/auth/password-reset/confirm',
          payload: {
            token: resetToken,
            newPassword: 'NewTestPass123!',
          },
        })

        expect(response.statusCode).toBe(200)
        const body = JSON.parse(response.body)
        expect(body.message).toBe('Password reset successful')

        // Try to sign in with new password
        const signinResponse = await server.inject({
          method: 'POST',
          url: '/auth/signin',
          payload: {
            username: 'testuser',
            password: 'NewTestPass123!',
          },
        })

        expect(signinResponse.statusCode).toBe(200)
      })

      it('should reject invalid token', async () => {
        const response = await server.inject({
          method: 'POST',
          url: '/auth/password-reset/confirm',
          payload: {
            token: 'invalid-token',
            newPassword: 'NewTestPass123!',
          },
        })

        expect(response.statusCode).toBe(400)
        const body = JSON.parse(response.body)
        expect(body.error).toBe('Invalid or expired reset token')
      })

      it('should reject weak password', async () => {
        // Request reset
        const resetResponse = await server.inject({
          method: 'POST',
          url: '/auth/password-reset/request',
          payload: {
            email: 'test@example.com',
          },
        })
        const resetBody = JSON.parse(resetResponse.body)
        const resetToken = resetBody.token

        // Try to reset with weak password
        const response = await server.inject({
          method: 'POST',
          url: '/auth/password-reset/confirm',
          payload: {
            token: resetToken,
            newPassword: 'weak',
          },
        })

        expect(response.statusCode).toBe(400)
      })
    })
  })
})