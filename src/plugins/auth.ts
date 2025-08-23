import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';
import { config } from '@config/env';
import { apiKeyService } from '../modules/api-keys/api-keys.service';
import { prisma } from '@services/prisma';

interface JWTPayload {
  id?: string;
  userId: string;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  sessionId: string;
  type: 'access' | 'refresh';
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: JWTPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify, _opts) => {
  await fastify.register(jwt, {
    secret: config.JWT_SECRET,
  });

  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      const apiKeyHeader = request.headers['x-api-key'] as string;

      if (apiKeyHeader) {
        try {
          const validatedUser = await apiKeyService.validateApiKey(apiKeyHeader);

          if (!validatedUser) {
            throw new Error('Invalid API key');
          }

          request.user = {
            ...validatedUser,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          request.apiKeyAuth = true;
          return;
        } catch {
          if (!authHeader) {
            return await reply.code(401).send({ error: 'Invalid API key' });
          }
        }
      }

      if (!authHeader) {
        return await reply.code(401).send({ error: 'No authentication provided' });
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return await reply.code(401).send({ error: 'Invalid token format' });
      }

      try {
        const decoded = fastify.jwt.verify<JWTPayload>(token);

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId || decoded.id as string },
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            role: true,
          },
        });

        if (!user) {
          return await reply.code(401).send({ error: 'User not found' });
        }

        request.user = {
          ...user,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      } catch {
        return await reply.code(401).send({ error: 'Invalid token' });
      }
    } catch {
      return await reply.code(500).send({ error: 'Internal server error' });
    }
  });

  fastify.decorate('adminOnly', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = request.user;

      if (!user) {
        return await reply.code(401).send({ error: 'Authentication required' });
      }

      if (user.role !== 'ADMIN') {
        return await reply.code(403).send({ error: 'Admin access required' });
      }
    } catch {
      return await reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

export default fp(authPlugin, {
  name: 'auth',
});