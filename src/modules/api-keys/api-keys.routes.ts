import { FastifyPluginAsync } from 'fastify';
import { apiKeyService } from './api-keys.service';
import { Type } from '@sinclair/typebox';

const apiKeysRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post(
    '/api-keys',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['API Keys'],
        summary: 'Create a new API key',
        body: Type.Object({
          name: Type.Optional(Type.String({ description: 'Name or description for the API key' })),
          expiresAt: Type.Optional(Type.String({ format: 'date-time', description: 'Expiration date' })),
        }),
        response: {
          201: Type.Object({
            id: Type.String(),
            key: Type.String({ description: 'The raw API key (only shown once)' }),
            name: Type.Union([Type.String(), Type.Null()]),
            createdAt: Type.String({ format: 'date-time' }),
            lastUsed: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
            expiresAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
            isActive: Type.Boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name, expiresAt } = request.body as { name?: string; expiresAt?: string };
      
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const apiKey = await apiKeyService.createApiKey({
        userId: request.user.id,
        name,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      return reply.code(201).send(apiKey);
    }
  );

  fastify.get(
    '/api-keys',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['API Keys'],
        summary: 'List all API keys for the authenticated user',
        response: {
          200: Type.Array(
            Type.Object({
              id: Type.String(),
              name: Type.Union([Type.String(), Type.Null()]),
              createdAt: Type.String({ format: 'date-time' }),
              lastUsed: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
              expiresAt: Type.Union([Type.String({ format: 'date-time' }), Type.Null()]),
              isActive: Type.Boolean(),
            })
          ),
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const apiKeys = await apiKeyService.listUserApiKeys(request.user.id);
      return reply.send(apiKeys);
    }
  );

  fastify.patch(
    '/api-keys/:keyId/revoke',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['API Keys'],
        summary: 'Revoke an API key',
        params: Type.Object({
          keyId: Type.String(),
        }),
        response: {
          204: Type.Null(),
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const { keyId } = request.params as { keyId: string };
      await apiKeyService.revokeApiKey(keyId, request.user.id);
      return reply.code(204).send();
    }
  );

  fastify.delete(
    '/api-keys/:keyId',
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ['API Keys'],
        summary: 'Delete an API key',
        params: Type.Object({
          keyId: Type.String(),
        }),
        response: {
          204: Type.Null(),
        },
      },
    },
    async (request, reply) => {
      if (!request.user) {
        return reply.code(401).send({ error: 'Unauthorized' });
      }
      
      const { keyId } = request.params as { keyId: string };
      await apiKeyService.deleteApiKey(keyId, request.user.id);
      return reply.code(204).send();
    }
  );
};

export default apiKeysRoutes;