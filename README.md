# Fastify Production Template

A production-ready Fastify template with TypeScript, featuring a modular architecture, comprehensive testing, and enterprise-grade tooling.

## 🚀 60-Second Quick Start

```bash
# Clone and install
git clone https://github.com/mt26691/fastify-template.git
cd fastify-template
npm install

# Setup environment
cp .env.example .env

# Start development (with hot reload)
npm run dev

# Run with Docker
docker compose up -d
```

Visit http://localhost:3000/docs for API documentation.

## 📐 Architecture

```
src/
├── app.ts                   # Fastify instance builder
├── server.ts               # Entry point
├── config/                 # Configuration
│   └── env.ts             # Environment validation (Zod)
├── plugins/               # Global Fastify plugins
│   ├── jwt.ts            # JWT authentication
│   ├── prisma.ts         # Database client
│   ├── sensible.ts       # Error handling
│   └── swagger.ts        # API documentation
├── modules/              # Feature modules
│   ├── user/
│   │   ├── user.routes.ts       # Route definitions
│   │   ├── user.schema.ts       # TypeBox schemas
│   │   ├── user.controller.ts   # Request handlers
│   │   ├── user.service.ts      # Business logic
│   │   ├── user.repo.prisma.ts  # Data access
│   │   └── tests/
│   │       ├── unit/
│   │       └── integration/
│   ├── auth/
│   └── health/
├── types/                # Type definitions
└── scripts/             # Utility scripts
```

### Key Design Principles

1. **Module-based architecture**: Each feature is self-contained with its own routes, schemas, services, and tests
2. **Type-safe validation**: TypeBox schemas with automatic TypeScript type inference
3. **Layered architecture**: Clear separation between routes → controllers → services → repositories
4. **Plugin system**: Fastify's powerful plugin architecture for code organization
5. **Dependency injection**: Services receive dependencies through constructors

## 🛠️ Tech Stack

- **Runtime**: Node.js 20+ with ESM
- **Framework**: Fastify 5.x
- **Language**: TypeScript 5.x (strict mode)
- **Validation**: TypeBox with Fastify Type Provider
- **Database**: PostgreSQL + Prisma ORM
- **Authentication**: JWT with refresh tokens
- **Testing**: Vitest + Testcontainers
- **Documentation**: OpenAPI/Swagger
- **Logging**: Pino
- **Code Quality**: ESLint (flat config) + Prettier
- **CI/CD**: GitHub Actions
- **Containerization**: Docker (multi-stage, distroless)

## 📦 Available Scripts

```bash
# Development
npm run dev              # Start with hot reload
npm run build           # Compile TypeScript
npm start               # Run production build

# Database
npm run db:generate     # Generate Prisma client
npm run db:migrate      # Run migrations
npm run db:push        # Push schema changes
npm run db:studio      # Open Prisma Studio
npm run db:seed        # Seed database

# Testing
npm test               # Run unit tests
npm run test:integration # Run integration tests
npm run test:ui        # Open Vitest UI

# Code Quality
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format with Prettier
npm run typecheck      # Type checking

# Docker
npm run docker:up      # Start services
npm run docker:down    # Stop services
```

## 🔧 Configuration

Environment variables are validated at startup using Zod:

```typescript
// src/config/env.ts
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  // ... more validations
})
```

## 🧪 Testing Strategy

### Unit Tests
- Service logic isolation
- Repository mocking
- Schema validation

### Integration Tests
- Full route testing
- Database transactions
- Authentication flows

### Coverage Requirements
- Minimum 80% coverage
- CI enforcement
- Badge generation

## 🔐 Authentication & Authorization

### JWT-based Authentication
- Access tokens (15min)
- Refresh tokens (7 days)
- Session management
- Device tracking

### RBAC (Role-Based Access Control)
- User roles: USER, ADMIN
- Route-level protection
- Resource ownership validation

## 📚 API Documentation

Interactive Swagger UI available at `/docs` in development.

### Example Endpoints

```typescript
// Health check
GET /health

// Authentication
POST /auth/signup
POST /auth/signin
POST /auth/refresh
POST /auth/signout
GET  /auth/sessions

// Users (protected)
GET    /users        # Admin only
GET    /users/:id    # Admin or self
PATCH  /users/:id    # Admin or self
DELETE /users/:id    # Admin only
```

## 🚢 Production Deployment

### Docker Deployment

```bash
# Build and run
docker build -t fastify-app .
docker run -p 3000:3000 --env-file .env fastify-app

# Or use docker-compose
docker compose --profile prod up -d
```

### Environment Setup

1. Copy `.env.example` to `.env`
2. Set strong `JWT_SECRET` (min 32 chars)
3. Configure `DATABASE_URL`
4. Set `NODE_ENV=production`

### Health Checks

```bash
# Local
curl http://localhost:3000/health

# Readiness (includes DB check)
curl http://localhost:3000/health/ready
```

## 🤝 Contributing

### Development Workflow

1. Create feature branch from `develop`
2. Implement changes with tests
3. Ensure all checks pass:
   ```bash
   npm run lint && npm run typecheck && npm test
   ```
4. Create PR with description

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation
- `test:` Testing
- `refactor:` Code refactoring
- `chore:` Maintenance

### Code Style

- Functions ≤ 40 lines
- Explicit return types
- No `any` types
- Comprehensive JSDoc

## 📄 License

MIT - see [LICENSE](LICENSE) file

## 🔗 Resources

- [Fastify Documentation](https://fastify.dev/)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Project Issues](https://github.com/mt26691/fastify-template/issues)