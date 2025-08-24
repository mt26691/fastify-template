# API Key Authentication

This template now supports dual authentication methods: JWT tokens and API keys.

## Features

- **Secure API Key Generation**: Uses SHA-256 hashing to store keys securely
- **Dual Authentication**: Supports both JWT and API key authentication
- **Key Management**: Full CRUD operations for API keys
- **Expiration Support**: Optional expiration dates for API keys
- **Usage Tracking**: Tracks last usage time for audit purposes
- **Revocation**: Keys can be revoked without deletion

## API Endpoints

### Create API Key
```bash
POST /api-keys
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "name": "Production API Key",
  "expiresAt": "2025-12-31T23:59:59Z"  // Optional
}

Response:
{
  "id": "clh1234...",
  "key": "sk_abc123...",  // Only shown once!
  "name": "Production API Key",
  "createdAt": "2024-08-23T...",
  "lastUsed": null,
  "expiresAt": "2025-12-31T23:59:59Z",
  "isActive": true
}
```

### List API Keys
```bash
GET /api-keys
Authorization: Bearer {JWT_TOKEN}

Response:
[
  {
    "id": "clh1234...",
    "name": "Production API Key",
    "createdAt": "2024-08-23T...",
    "lastUsed": "2024-08-23T...",
    "expiresAt": "2025-12-31T23:59:59Z",
    "isActive": true
  }
]
```

### Revoke API Key
```bash
PATCH /api-keys/{keyId}/revoke
Authorization: Bearer {JWT_TOKEN}

Response: 204 No Content
```

### Delete API Key
```bash
DELETE /api-keys/{keyId}
Authorization: Bearer {JWT_TOKEN}

Response: 204 No Content
```

## Using API Keys

Include the API key in the `x-api-key` header:

```bash
curl http://localhost:3000/users/me \
  -H "x-api-key: sk_your_api_key_here"
```

## Authentication Flow

1. The auth plugin first checks for an API key in the `x-api-key` header
2. If valid, it authenticates the request and sets `request.apiKeyAuth = true`
3. If no API key or invalid, it falls back to JWT authentication
4. If both fail, returns 401 Unauthorized

## Security Notes

- API keys are hashed using SHA-256 before storage
- Raw keys are only shown once during creation
- Keys are prefixed with `sk_` for easy identification
- Support for key expiration and revocation
- Each key is tied to a specific user

## Database Schema

The `ApiKey` model includes:
- `id`: Unique identifier
- `key`: Hashed API key (unique)
- `name`: Optional description
- `userId`: Owner of the key
- `createdAt`: Creation timestamp
- `lastUsed`: Last usage timestamp
- `expiresAt`: Optional expiration date
- `isActive`: Whether the key is active

## Migration

To apply the database changes:

```bash
npx prisma migrate dev --name add-api-keys
```

## Implementation Files

- `prisma/schema.prisma` - ApiKey model definition
- `src/modules/api-keys/api-keys.service.ts` - Business logic
- `src/modules/api-keys/api-keys.routes.ts` - API endpoints
- `src/plugins/auth.ts` - Authentication plugin with API key support
- `src/types/fastify.d.ts` - TypeScript type extensions