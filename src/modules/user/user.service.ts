import { FastifyInstance } from 'fastify'
import bcrypt from 'bcrypt'
import { UserRepository } from './user.repo.prisma'
import { CreateUserBodyType, UpdateUserBodyType, GetUsersQueryType, UserType } from './user.schema'
import { Prisma } from '@prisma/client'

export class UserService {
  private userRepo: UserRepository

  constructor(private fastify: FastifyInstance) {
    this.userRepo = new UserRepository(fastify.prisma)
  }

  async createUser(data: CreateUserBodyType): Promise<UserType> {
    // Check if user already exists
    const existingUser = await this.userRepo.findByEmail(data.email)
    if (existingUser) {
      throw this.fastify.httpErrors.conflict('User with this email already exists')
    }

    const existingUsername = await this.userRepo.findByUsername(data.username)
    if (existingUsername) {
      throw this.fastify.httpErrors.conflict('Username already taken')
    }

    // Generate salt and hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(data.password, salt)

    // Create user
    const user = await this.userRepo.create({
      name: data.name,
      username: data.username,
      email: data.email,
      password: hashedPassword,
      salt,
      role: data.role || 'USER',
    })

    // Remove password and salt from response
    const { password: _, salt: __, ...userWithoutPassword } = user
    return {
      ...userWithoutPassword,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }

  async getUserById(id: string): Promise<UserType> {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw this.fastify.httpErrors.notFound('User not found')
    }

    const { password: _, salt: __, ...userWithoutPassword } = user
    return {
      ...userWithoutPassword,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }
  }

  async getUsers(query: GetUsersQueryType): Promise<{ users: UserType[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
    const { page = 1, limit = 10, search, role } = query
    const skip = (page - 1) * limit

    // Build where clause
    const where: Prisma.UserWhereInput = {}
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (role) {
      where.role = role
    }

    // Get users and count
    const [users, total] = await Promise.all([
      this.userRepo.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.userRepo.count(where),
    ])

    // Remove passwords and salts
    const usersWithoutPasswords = users.map(({ password: _, salt: __, ...user }) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }))

    return {
      users: usersWithoutPasswords,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async updateUser(id: string, data: UpdateUserBodyType): Promise<UserType> {
    const existingUser = await this.userRepo.findById(id)
    if (!existingUser) {
      throw this.fastify.httpErrors.notFound('User not found')
    }

    // Check email uniqueness if updating email
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.userRepo.exists({ email: data.email })
      if (emailExists) {
        throw this.fastify.httpErrors.conflict('Email already in use')
      }
    }

    const updatedUser = await this.userRepo.update(id, data)
    const { password: _, salt: __, ...userWithoutPassword } = updatedUser
    return {
      ...userWithoutPassword,
      createdAt: updatedUser.createdAt.toISOString(),
      updatedAt: updatedUser.updatedAt.toISOString(),
    }
  }

  async deleteUser(id: string): Promise<{ message: string }> {
    const user = await this.userRepo.findById(id)
    if (!user) {
      throw this.fastify.httpErrors.notFound('User not found')
    }

    await this.userRepo.delete(id)
    return { message: 'User deleted successfully' }
  }
}
