import { describe, it, expect, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { app } from '../../src/app.js'

describe('Authentication API', () => {
  let server: any

  beforeEach(async () => {
    server = Fastify({
      logger: false,
    })
    await server.register(app)
    await server.ready()
  })

  describe('POST /auth/signup', () => {
    it('should create a new user', async () => {
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

    it('should reject duplicate email', async () => {
      // First signup
      await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser1',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })

      // Try to signup with same email
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

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('Email already exists')
    })

    it('should reject duplicate username', async () => {
      // First signup
      await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser',
          email: 'test1@example.com',
          password: 'TestPass123!',
        },
      })

      // Try to signup with same username
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

      expect(response.statusCode).toBe(409)
      const body = JSON.parse(response.body)
      expect(body.message).toContain('Username already exists')
    })

    it('should validate input', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'tu', // Too short
          email: 'invalid-email',
          password: 'short', // Too short
        },
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /auth/signin', () => {
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
          username: 'test@example.com',
          password: 'TestPass123!',
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('user')
      expect(body).toHaveProperty('accessToken')
      expect(body).toHaveProperty('refreshToken')
    })

    it('should reject invalid credentials', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/signin',
        payload: {
          username: 'testuser',
          password: 'wrongpassword',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.message).toBe('Invalid credentials')
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
      expect(body.message).toBe('Invalid credentials')
    })
  })

  describe('Session Management', () => {
    let authToken: string
    let refreshToken: string
    let userId: string

    beforeEach(async () => {
      // Create and sign in a test user
      const signupResponse = await server.inject({
        method: 'POST',
        url: '/auth/signup',
        payload: {
          name: 'Test User',
          username: 'testuser',
          email: 'test@example.com',
          password: 'TestPass123!',
        },
      })
      
      if (signupResponse.statusCode !== 201) {
        throw new Error(`Signup failed: ${signupResponse.body}`)
      }
      
      const signupBody = JSON.parse(signupResponse.body)
      authToken = signupBody.accessToken
      refreshToken = signupBody.refreshToken
      userId = signupBody.user.id
    })

    it('should get user sessions', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
      expect(body[0]).toHaveProperty('id')
      expect(body[0]).toHaveProperty('accessTokenExpiry')
    })

    it('should require authentication for sessions', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/auth/sessions',
      })

      expect(response.statusCode).toBe(401)
    })

    it('should invalidate all sessions', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/sessions/invalidate-all',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(response.statusCode).toBe(204)

      // Try to use the token again
      const checkResponse = await server.inject({
        method: 'GET',
        url: '/auth/sessions',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      })

      expect(checkResponse.statusCode).toBe(401)
    })
  })

  describe('Token Refresh', () => {
    let initialAccessToken: string
    let initialRefreshToken: string

    beforeEach(async () => {
      // Create and sign in a test user
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

      const signinResponse = await server.inject({
        method: 'POST',
        url: '/auth/signin',
        payload: {
          username: 'testuser',
          password: 'TestPass123!',
        },
      })

      const signinBody = JSON.parse(signinResponse.body)
      initialAccessToken = signinBody.accessToken
      initialRefreshToken = signinBody.refreshToken
    })

    it('should refresh access token with valid refresh token', async () => {
      // Small delay to ensure tokens are different
      await new Promise(resolve => setTimeout(resolve, 10))
      
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: initialRefreshToken,
        },
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body).toHaveProperty('accessToken')
      expect(body).toHaveProperty('refreshToken')
      
      // New tokens should be different from initial ones
      expect(body.accessToken).not.toBe(initialAccessToken)
      expect(body.refreshToken).not.toBe(initialRefreshToken)
    })

    it('should reject invalid refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: 'invalid-refresh-token',
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.message).toBe('Invalid or expired refresh token')
    })

    it('should reject using access token as refresh token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: initialAccessToken, // Using access token instead
        },
      })

      expect(response.statusCode).toBe(401)
      const body = JSON.parse(response.body)
      expect(body.message).toBe('Invalid or expired refresh token')
    })

    it('should use new access token after refresh', async () => {
      // Refresh token
      const refreshResponse = await server.inject({
        method: 'POST',
        url: '/auth/refresh',
        payload: {
          refreshToken: initialRefreshToken,
        },
      })

      const refreshBody = JSON.parse(refreshResponse.body)
      const newAccessToken = refreshBody.accessToken

      // Use new access token
      const sessionsResponse = await server.inject({
        method: 'GET',
        url: '/auth/sessions',
        headers: {
          authorization: `Bearer ${newAccessToken}`,
        },
      })

      expect(sessionsResponse.statusCode).toBe(200)
    })
  })

  describe('Password Reset', () => {
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
      // In development, we get the token
      if (process.env.NODE_ENV === 'development') {
        expect(body).toHaveProperty('token')
      }
    })

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
          newPassword: 'newpassword123',
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
          password: 'newpassword123',
        },
      })

      expect(signinResponse.statusCode).toBe(200)
    })

    it('should reject invalid reset token', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/auth/password-reset/confirm',
        payload: {
          token: 'invalid-token',
          newPassword: 'newpassword123',
        },
      })

      expect(response.statusCode).toBe(400)
      const body = JSON.parse(response.body)
      expect(body.message).toBe('Invalid or expired reset token')
    })
  })
})