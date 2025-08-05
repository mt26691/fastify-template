import { FastifyReply, FastifyRequest } from 'fastify'
import { UserService } from './user.service'
import {
  CreateUserBodyType,
  UpdateUserBodyType,
  GetUsersQueryType,
  UserIdParamsType,
} from './user.schema'

export const createUser = async function (
  this: { userService: UserService },
  request: FastifyRequest<{ Body: CreateUserBodyType }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  const user = await this.userService.createUser(request.body)
  return reply.code(201).send(user)
}

export const getUsers = async function (
  this: { userService: UserService },
  request: FastifyRequest<{ Querystring: GetUsersQueryType }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  // Check if user is admin
  if (!request.user || request.user.role !== 'ADMIN') {
    throw request.server.httpErrors.forbidden('Admin access required')
  }

  const result = await this.userService.getUsers(request.query)
  return reply.send(result)
}

export const getUser = async function (
  this: { userService: UserService },
  request: FastifyRequest<{ Params: UserIdParamsType }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  // Check if user is admin or accessing their own profile
  if (!request.user || (request.user.role !== 'ADMIN' && request.user.id !== request.params.id)) {
    throw request.server.httpErrors.forbidden('Access denied')
  }

  const user = await this.userService.getUserById(request.params.id)
  return reply.send(user)
}

export const updateUser = async function (
  this: { userService: UserService },
  request: FastifyRequest<{ Params: UserIdParamsType; Body: UpdateUserBodyType }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  // Check if user is admin or updating their own profile
  if (!request.user || (request.user.role !== 'ADMIN' && request.user.id !== request.params.id)) {
    throw request.server.httpErrors.forbidden('Access denied')
  }

  // Non-admins cannot change their role
  if (request.user.role !== 'ADMIN' && request.body.role) {
    throw request.server.httpErrors.forbidden('Cannot change own role')
  }

  const user = await this.userService.updateUser(request.params.id, request.body)
  return reply.send(user)
}

export const deleteUser = async function (
  this: { userService: UserService },
  request: FastifyRequest<{ Params: UserIdParamsType }>,
  reply: FastifyReply
): Promise<FastifyReply> {
  // Check if user is admin
  if (!request.user || request.user.role !== 'ADMIN') {
    throw request.server.httpErrors.forbidden('Admin access required')
  }

  // Prevent self-deletion
  if (request.user.id === request.params.id) {
    throw request.server.httpErrors.badRequest('Cannot delete own account')
  }

  const result = await this.userService.deleteUser(request.params.id)
  return reply.send(result)
}
