import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { prisma } from '@services/prisma'
import { config } from '@config/env'
import { UserRole } from '@prisma/client'
import { logger } from '@utils/logger'
import type { FastifyInstance } from 'fastify'

export interface SignUpData {
  name: string
  username: string
  email: string
  password: string
}

export interface SignInData {
  username: string
  password: string
}

export interface JWTPayload {
  userId: string
  username: string
  email: string
  role: UserRole
  sessionId: string
  type: 'access' | 'refresh'
}

export class AuthService {
  constructor(private fastify: FastifyInstance) {}

  async signUp(data: SignUpData): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const { name, username, email, password } = data

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    })

    if (existingUser) {
      throw new Error(existingUser.email === email ? 'Email already exists' : 'Username already exists')
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user and session in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          username,
          email,
          password: hashedPassword,
          salt,
        },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
        },
      })

      // Create session
      const sessionId = crypto.randomUUID()
      
      // Generate access token
      const accessToken = this.fastify.jwt.sign({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        sessionId,
        type: 'access',
      } as JWTPayload, {
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      })

      // Generate refresh token
      const refreshToken = this.fastify.jwt.sign({
        userId: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        sessionId,
        type: 'refresh',
      } as JWTPayload, {
        expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      })

      // Calculate expiry times
      const accessTokenExpiry = new Date()
      accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 15) // 15 minutes
      
      const refreshTokenExpiry = new Date()
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7) // 7 days

      await tx.userSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          accessToken,
          refreshToken,
          accessTokenExpiry,
          refreshTokenExpiry,
        },
      })

      return { user, accessToken, refreshToken }
    })

    logger.info({ userId: result.user.id, username: result.user.username }, 'User signed up')
    return result
  }

  async signIn(data: SignInData, userAgent?: string): Promise<{ user: any; accessToken: string; refreshToken: string }> {
    const { username, password } = data

    // Find user by username or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
    })

    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      throw new Error('Invalid credentials')
    }

    // Create session
    const sessionId = crypto.randomUUID()
    
    // Generate access token
    const accessToken = this.fastify.jwt.sign({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      sessionId,
      type: 'access',
    } as JWTPayload, {
      expiresIn: config.JWT_ACCESS_EXPIRES_IN,
    })

    // Generate refresh token
    const refreshToken = this.fastify.jwt.sign({
      userId: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      sessionId,
      type: 'refresh',
    } as JWTPayload, {
      expiresIn: config.JWT_REFRESH_EXPIRES_IN,
    })

    // Calculate expiry times
    const accessTokenExpiry = new Date()
    accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 15) // 15 minutes
    
    const refreshTokenExpiry = new Date()
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7) // 7 days

    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        accessToken,
        refreshToken,
        userAgent,
        accessTokenExpiry,
        refreshTokenExpiry,
      },
    })

    const userWithoutPassword = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }

    logger.info({ userId: user.id, username: user.username }, 'User signed in')
    return { user: userWithoutPassword, accessToken, refreshToken }
  }

  async getUserSessions(userId: string): Promise<any[]> {
    return prisma.userSession.findMany({
      where: { userId },
      select: {
        id: true,
        userAgent: true,
        accessTokenExpiry: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async invalidateSession(sessionId: string, userId: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: {
        id: sessionId,
        userId,
      },
    })
    logger.info({ sessionId, userId }, 'Session invalidated')
  }

  async invalidateAllSessions(userId: string): Promise<void> {
    await prisma.userSession.deleteMany({
      where: { userId },
    })
    logger.info({ userId }, 'All sessions invalidated')
  }

  async requestPasswordReset(email: string): Promise<string> {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      // Don't reveal if user exists
      return 'If the email exists, a reset link will be sent'
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex')

    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1 hour from now

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    })

    logger.info({ userId: user.id, email }, 'Password reset requested')

    // In production, send email with reset link
    // For now, return the token
    return resetToken
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: hashedToken,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    })

    if (!resetToken) {
      throw new Error('Invalid or expired reset token')
    }

    // Hash new password
    const salt = await bcrypt.genSalt(config.BCRYPT_ROUNDS)
    const hashedPassword = await bcrypt.hash(newPassword, salt)

    // Update password and delete reset token
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: resetToken.userId },
        data: {
          password: hashedPassword,
          salt,
        },
      })

      await tx.passwordResetToken.delete({
        where: { id: resetToken.id },
      })

      // Invalidate all sessions
      await tx.userSession.deleteMany({
        where: { userId: resetToken.userId },
      })
    })

    logger.info({ userId: resetToken.userId }, 'Password reset completed')
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const payload = this.fastify.jwt.verify(token) as JWTPayload

      // Check if session exists and is valid
      const session = await prisma.userSession.findUnique({
        where: {
          id: payload.sessionId,
          accessToken: token,
        },
      })

      if (!session || session.accessTokenExpiry < new Date()) {
        return null
      }

      return payload
    } catch (error) {
      return null
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string } | null> {
    try {
      const payload = this.fastify.jwt.verify(refreshToken) as JWTPayload

      // Verify it's a refresh token
      if (payload.type !== 'refresh') {
        throw new Error('Invalid token type')
      }

      // Check if session exists and is valid
      const session = await prisma.userSession.findUnique({
        where: {
          id: payload.sessionId,
          refreshToken: refreshToken,
        },
        include: {
          user: true,
        },
      })

      if (!session || session.refreshTokenExpiry < new Date()) {
        throw new Error('Invalid or expired refresh token')
      }

      // Generate new access token
      const newAccessToken = this.fastify.jwt.sign({
        userId: session.user.id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
        sessionId: session.id,
        type: 'access',
      } as JWTPayload, {
        expiresIn: config.JWT_ACCESS_EXPIRES_IN,
      })

      // Generate new refresh token
      const newRefreshToken = this.fastify.jwt.sign({
        userId: session.user.id,
        username: session.user.username,
        email: session.user.email,
        role: session.user.role,
        sessionId: session.id,
        type: 'refresh',
      } as JWTPayload, {
        expiresIn: config.JWT_REFRESH_EXPIRES_IN,
      })

      // Calculate new expiry times
      const accessTokenExpiry = new Date()
      accessTokenExpiry.setMinutes(accessTokenExpiry.getMinutes() + 15) // 15 minutes
      
      const refreshTokenExpiry = new Date()
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 7) // 7 days

      // Update session with new tokens
      await prisma.userSession.update({
        where: { id: session.id },
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
          accessTokenExpiry,
          refreshTokenExpiry,
        },
      })

      logger.info({ userId: session.userId, sessionId: session.id }, 'Access token refreshed')
      return { accessToken: newAccessToken, refreshToken: newRefreshToken }
    } catch (error) {
      logger.error({ error }, 'Failed to refresh access token')
      return null
    }
  }
}