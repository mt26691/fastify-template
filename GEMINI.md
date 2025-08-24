# Project Overview

This is a production-ready Fastify template with TypeScript, featuring a modular architecture, comprehensive testing, and enterprise-grade tooling. The project uses Fastify for the web framework, Prisma as the ORM for a PostgreSQL database, and TypeBox for schema validation. It includes a comprehensive suite of tools for development, testing, and deployment.

## Building and Running

### Prerequisites

- Node.js (v20+)
- Docker

### Installation

```bash
npm install
```

### Environment Setup

1.  Copy `.env.example` to `.env`:

    ```bash
    cp .env.example .env
    ```

2.  Update the `.env` file with your database credentials and other environment-specific configurations.

### Running the Application

-   **Development Mode (with hot-reloading):**

    ```bash
    npm run dev
    ```

-   **Production Mode:**

    ```bash
    npm run build
    npm start
    ```

-   **Docker:**

    ```bash
    docker compose up -d
    ```

### Testing

-   **Run all tests:**

    ```bash
    npm test
    ```

-   **Run integration tests:**

    ```bash
    npm run test:integration
    ```

-   **View test coverage:**

    ```bash
    npm run test:coverage
    ```

## Development Conventions

### Code Style

-   **Formatting:** The project uses Prettier for code formatting. To format the code, run:

    ```bash
    npm run format
    ```

-   **Linting:** The project uses ESLint for static code analysis. To lint the code, run:

    ```bash
    npm run lint
    ```

### Database

-   **Migrations:** Prisma Migrate is used for database schema migrations. To create a new migration, run:

    ```bash
    npm run db:migrate
    ```

-   **Seeding:** The database can be seeded with initial data using the `db:seed` script:

    ```bash
    npm run db:seed
    ```

### Commit Convention

The project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification. This helps to maintain a clear and consistent commit history.
