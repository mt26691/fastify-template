import { Type, Static } from '@sinclair/typebox'

// Request schemas
export const SignUpBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  username: Type.String({ minLength: 3, maxLength: 30, pattern: '^[a-zA-Z0-9_]+$' }),
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 8, maxLength: 128 }),
})

export const SignInBody = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String(),
  userAgent: Type.Optional(Type.String()),
})

export const RefreshTokenBody = Type.Object({
  refreshToken: Type.String(),
})

export const PasswordResetRequestBody = Type.Object({
  email: Type.String({ format: 'email' }),
})

export const PasswordResetBody = Type.Object({
  token: Type.String(),
  newPassword: Type.String({ minLength: 8, maxLength: 128 }),
})

// Response schemas
export const AuthResponse = Type.Object({
  user: Type.Object({
    id: Type.String(),
    name: Type.String(),
    username: Type.String(),
    email: Type.String(),
    role: Type.Union([Type.Literal('USER'), Type.Literal('ADMIN')]),
  }),
  accessToken: Type.String(),
  refreshToken: Type.String(),
})

export const MessageResponse = Type.Object({
  message: Type.String(),
})

export const SessionResponse = Type.Object({
  id: Type.String(),
  deviceId: Type.String(),
  browser: Type.Optional(Type.String()),
  userAgent: Type.Optional(Type.String()),
  ipAddresses: Type.Array(Type.String()),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  lastActiveAt: Type.String({ format: 'date-time' }),
})

export const SessionsListResponse = Type.Object({
  sessions: Type.Array(SessionResponse),
  currentSessionId: Type.String(),
})

// Type exports
export type SignUpBodyType = Static<typeof SignUpBody>
export type SignInBodyType = Static<typeof SignInBody>
export type RefreshTokenBodyType = Static<typeof RefreshTokenBody>
export type PasswordResetRequestBodyType = Static<typeof PasswordResetRequestBody>
export type PasswordResetBodyType = Static<typeof PasswordResetBody>
export type AuthResponseType = Static<typeof AuthResponse>
export type MessageResponseType = Static<typeof MessageResponse>
export type SessionResponseType = Static<typeof SessionResponse>
export type SessionsListResponseType = Static<typeof SessionsListResponse>
