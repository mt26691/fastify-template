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

## Project Structure

```
src/
├── config/
│   └── env.ts          # Environment variable validation
├── plugins/
│   └── swagger.ts      # Swagger/OpenAPI documentation setup
├── routes/
│   └── health.ts       # Health check endpoint
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
- Swagger UI: `http://localhost:3000/documentation`
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
- `@/*` - Import from `src/`

Example:
```typescript
import { config } from '@config/env'
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

## License

ISC