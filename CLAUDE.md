# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot reload using tsx watch on src/server.ts

### Build & Production
- `npm run build` - Compile TypeScript to JavaScript (output to dist/)
- `npm start` - Run production server from dist/server.js

### Code Quality
- `npm run lint` - Run ESLint on all TypeScript files in src/
- `npm run typecheck` - Run TypeScript compiler without emitting files
- `npm test` - Run tests with Vitest

## Architecture

This is a modern Fastify TypeScript application with a clean architecture:

### Entry Points
- **Server**: `src/server.ts` - Creates and starts the Fastify server with logging configuration
- **App**: `src/app.ts` - Registers all plugins and routes using @fastify/autoload

### Core Structure
- `src/config/env.ts` - Environment validation using Zod, validates and types all env vars at startup
- `src/plugins/` - Fastify plugins (loaded first), includes Swagger documentation setup
- `src/routes/` - API route handlers, automatically loaded and registered

### Key Features
1. **Environment Validation**: All environment variables are validated at startup using Zod schemas
2. **Swagger Documentation**: Auto-generated API docs available at /documentation
3. **Type Safety**: Full TypeScript support with strict typing
4. **Hot Reload**: Development server restarts automatically on file changes using tsx
5. **Structured Logging**: Uses Pino with pretty printing in development

### Development Workflow
- Environment variables are validated on server start
- Routes and plugins are automatically loaded
- Swagger documentation is generated from route schemas
- TypeScript provides compile-time type checking

### Adding New Features
- **Routes**: Create files in `src/routes/`, export FastifyPluginAsync
- **Plugins**: Create files in `src/plugins/`, wrap with fastify-plugin
- **Environment Variables**: Add to schema in `src/config/env.ts`