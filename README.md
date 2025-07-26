# Fastify TypeScript Template

A modern Fastify application template with TypeScript, Swagger documentation, and environment validation.

## Features

- ⚡ **Fastify** - Fast and low overhead web framework
- 🔷 **TypeScript** - Type safety and modern JavaScript features
- 📚 **Swagger/OpenAPI** - Auto-generated API documentation
- 🔐 **Environment Validation** - Runtime validation of environment variables using Zod
- 🏗️ **Modular Architecture** - Clean separation of routes, plugins, and configuration
- 📦 **Path Aliases** - Clean imports using `@config`, `@plugins`, `@routes`
- 🔥 **Hot Reload** - Development server with automatic restart on file changes
- 📝 **Structured Logging** - Beautiful logs in development, JSON in production
- ⏱️ **Request Timing** - Automatic request processing time measurement
- 🗄️ **PostgreSQL + Prisma** - Type-safe database access with migrations
- 🔑 **JWT Authentication** - Complete auth system with sessions management
- 🧪 **Integration Testing** - Testcontainers for isolated database testing

## Project Structure

```
src/
├── config/
│   └── env.ts          # Environment variable validation
├── plugins/
│   ├── swagger.ts      # Swagger/OpenAPI documentation setup
│   └── request-timer.ts # Request timing measurement
├── routes/
│   └── health.ts       # Health check endpoint
├── utils/
│   └── logger.ts       # Standalone logger utility
├── app.ts              # Fastify app configuration
└── server.ts           # Server entry point
```

## Prerequisites

- Node.js 18+ 
- npm or yarn

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fastify-template
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The server will start on `http://localhost:3000`

## Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build the TypeScript project
- `npm start` - Start production server (requires build)
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm test` - Run tests with Vitest

## API Documentation

Once the server is running, you can access:
- Swagger UI: `http://localhost:3000/docs`
- Health check: `http://localhost:3000/health`

## Environment Variables

The application uses a **fail-fast approach** for environment validation:

### Why Fail-Fast Environment Validation?

The `src/config/env.ts` file validates ALL environment variables at startup using Zod schemas. This approach:

- **Prevents silent failures**: Missing or invalid environment variables are caught immediately at startup, not during runtime
- **Improves production safety**: No surprises in production - if the app starts, all config is valid
- **Provides clear error messages**: Shows exactly which variables are missing or invalid
- **Type safety**: Provides full TypeScript types for all environment variables throughout the application
- **No hidden defaults**: Explicitly fails rather than falling back to potentially dangerous default values

The application will NOT start if any required environment variables are missing or invalid. This is intentional - it's better to fail loudly at startup than to run with misconfigured settings.

### Available Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| NODE_ENV | `development\|production\|test` | `development` | Application environment |
| PORT | number | `3000` | Server port |
| HOST | string | `0.0.0.0` | Server host |
| LOG_LEVEL | `fatal\|error\|warn\|info\|debug\|trace\|silent` | `info` | Logging level |

Note: While some variables have defaults for development convenience, in production you should explicitly set ALL environment variables.

## Path Aliases

The project uses TypeScript path aliases for cleaner imports:

- `@config/*` - Import from `src/config/`
- `@plugins/*` - Import from `src/plugins/`
- `@routes/*` - Import from `src/routes/`
- `@utils/*` - Import from `src/utils/`
- `@/*` - Import from `src/`

Example:
```typescript
import { config } from '@config/env'
import { logger } from '@utils/logger'
import { somePlugin } from '@plugins/custom'
```

## Adding New Routes

1. Create a new file in `src/routes/`
2. Export a Fastify plugin:

```typescript
import { FastifyPluginAsync } from 'fastify'

const routes: FastifyPluginAsync = async (fastify, opts) => {
  fastify.get('/example', {
    schema: {
      description: 'Example endpoint',
      tags: ['Example'],
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    return { message: 'Hello World' }
  })
}

export default routes
```

Routes are automatically loaded by `@fastify/autoload`.

## Adding New Plugins

1. Create a new file in `src/plugins/`
2. Export a Fastify plugin using `fastify-plugin`:

```typescript
import fp from 'fastify-plugin'
import { FastifyPluginAsync } from 'fastify'

const plugin: FastifyPluginAsync = async (fastify, opts) => {
  // Plugin logic here
}

export default fp(plugin, {
  name: 'my-plugin'
})
```

## Using the Logger

The project includes a standalone logger utility for logging outside of Fastify request context:

```typescript
import { logger, logInfo, logError, createChildLogger } from '@utils/logger'

// Basic logging
logger.info('Server starting up')

// Helper functions with context
logInfo('User logged in', { userId: '123', email: 'user@example.com' })
logError('Failed to connect to database', error, { service: 'database' })

// Create child logger with persistent context
const dbLogger = createChildLogger({ service: 'database' })
dbLogger.info('Connected to database')
```

Within Fastify routes, use the request logger:
```typescript
fastify.get('/example', async (request, reply) => {
  request.log.info('Processing request')
  // ...
})
```

## Authentication System

The template includes a complete JWT-based authentication system with the following features:

### Endpoints

- `POST /auth/signup` - Create a new user account (returns access & refresh tokens)
- `POST /auth/signin` - Sign in with username/email and password (returns access & refresh tokens)
- `POST /auth/refresh` - Refresh access token using refresh token
- `GET /auth/sessions` - Get all active sessions (requires auth)
- `DELETE /auth/sessions/:sessionId` - Invalidate specific session (requires auth)
- `POST /auth/sessions/invalidate-all` - Invalidate all sessions (requires auth)
- `POST /auth/password-reset/request` - Request password reset token
- `POST /auth/password-reset/confirm` - Reset password with token

### Token Strategy

The authentication system uses a dual-token approach:
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

This provides better security as access tokens expire quickly, limiting exposure if compromised.

### Database Schema

**User**
- `id`, `name`, `username`, `email`, `password`, `salt`, `role`, `createdAt`, `updatedAt`

**UserSession**
- `id`, `userId`, `accessToken`, `refreshToken`, `userAgent`, `accessTokenExpiry`, `refreshTokenExpiry`, `createdAt`, `updatedAt`

**PasswordResetToken**
- `id`, `userId`, `token`, `expiresAt`, `createdAt`

### Default Seeded Users

Running `npm run seed` creates the following test users:

| Username | Email | Password | Role |
|----------|-------|----------|------|
| admin | admin@example.com | admin123 | ADMIN |
| testuser | user@example.com | user123 | USER |
| johndoe | john@example.com | john123 | USER |
| janesmith | jane@example.com | jane123 | USER |
| moderator | mod@example.com | mod123 | ADMIN |

### Testing

The project uses Vitest with Testcontainers for integration testing:

```bash
# Start PostgreSQL for development
npm run docker:up

# Run database migrations
npm run db:migrate

# Seed database with sample users
npm run seed

# Run all tests
npm test

# Run integration tests with isolated database
npm run test:integration

# Run tests with UI
npm run test:ui
```

Integration tests automatically:
- Spin up a PostgreSQL container
- Run migrations
- Execute tests with complete isolation
- Clean up after completion

## License

ISC