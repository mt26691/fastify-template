import { Type, Static } from '@sinclair/typebox'

// Enums
export const UserRole = Type.Union([Type.Literal('USER'), Type.Literal('ADMIN')])

// Base schemas
export const UserIdParams = Type.Object({
  id: Type.String({ format: 'uuid' }),
})

export const User = Type.Object({
  id: Type.String({ format: 'uuid' }),
  name: Type.String(),
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  role: UserRole,
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
})

export const CreateUserBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  username: Type.String({ minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
  role: Type.Optional(UserRole),
})

export const UpdateUserBody = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  email: Type.Optional(Type.String({ format: 'email' })),
  role: Type.Optional(UserRole),
})

export const GetUsersQuery = Type.Object({
  page: Type.Optional(Type.Integer({ minimum: 1, default: 1 })),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  search: Type.Optional(Type.String()),
  role: Type.Optional(UserRole),
})

export const UsersListResponse = Type.Object({
  users: Type.Array(User),
  pagination: Type.Object({
    page: Type.Integer(),
    limit: Type.Integer(),
    total: Type.Integer(),
    totalPages: Type.Integer(),
  }),
})

export const ErrorResponse = Type.Object({
  error: Type.String(),
  statusCode: Type.Integer(),
  message: Type.String(),
})

// Type exports
export type UserType = Static<typeof User>
export type CreateUserBodyType = Static<typeof CreateUserBody>
export type UpdateUserBodyType = Static<typeof UpdateUserBody>
export type GetUsersQueryType = Static<typeof GetUsersQuery>
export type UsersListResponseType = Static<typeof UsersListResponse>
export type UserIdParamsType = Static<typeof UserIdParams>
export type UserRoleType = Static<typeof UserRole>
