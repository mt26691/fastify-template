import { randomBytes, createHash } from 'crypto';
import { prisma } from '@services/prisma';

export interface CreateApiKeyDto {
  userId: string;
  name?: string;
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  key?: string;
  name: string | null;
  createdAt: Date;
  lastUsed: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
}

export type UserWithoutSensitive = {
  id: string;
  username: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
};

// Define types for ApiKey model until Prisma migration is run
type ApiKey = {
  id: string;
  key: string;
  name: string | null;
  userId: string;
  createdAt: Date;
  lastUsed: Date | null;
  expiresAt: Date | null;
  isActive: boolean;
};

type ApiKeyWithUser = ApiKey & {
  user: UserWithoutSensitive;
};

// Prisma-like argument types for ApiKey operations
type ApiKeyCreateArgs = {
  data: {
    key: string;
    name?: string;
    userId: string;
    expiresAt?: Date;
  };
};

type ApiKeyFindUniqueArgs = {
  where: { key: string } | { id: string };
  include?: {
    user: {
      select: {
        id: boolean;
        username: boolean;
        email: boolean;
        name: boolean;
        role: boolean;
      };
    };
  };
};

type ApiKeyFindManyArgs = {
  where: { userId: string };
  orderBy?: { createdAt: 'asc' | 'desc' };
};

type ApiKeyFindFirstArgs = {
  where: {
    id: string;
    userId: string;
  };
};

type ApiKeyUpdateArgs = {
  where: { id: string };
  data: { isActive?: boolean; lastUsed?: Date };
};

type ApiKeyDeleteArgs = {
  where: { id: string };
};

// Extended Prisma client type with ApiKey operations
type PrismaWithApiKey = typeof prisma & {
  apiKey: {
    create: (args: ApiKeyCreateArgs) => Promise<ApiKey>;
    findUnique: (args: ApiKeyFindUniqueArgs) => Promise<ApiKeyWithUser | ApiKey | null>;
    findMany: (args: ApiKeyFindManyArgs) => Promise<ApiKey[]>;
    findFirst: (args: ApiKeyFindFirstArgs) => Promise<ApiKey | null>;
    update: (args: ApiKeyUpdateArgs) => Promise<ApiKey>;
    delete: (args: ApiKeyDeleteArgs) => Promise<ApiKey>;
  };
};

export class ApiKeyService {
  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private generateApiKey(): { raw: string; hashed: string } {
    const raw = `sk_${randomBytes(32).toString('base64url')}`;
    const hashed = this.hashApiKey(raw);
    return { raw, hashed };
  }

  async createApiKey(dto: CreateApiKeyDto): Promise<ApiKeyResponse & { key: string }> {
    const user = await prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { raw, hashed } = this.generateApiKey();

    // Use type assertion for apiKey operations until migration is complete
    const prismaWithApiKey = prisma as PrismaWithApiKey;

    const apiKey = await prismaWithApiKey.apiKey.create({
      data: {
        key: hashed,
        name: dto.name,
        userId: dto.userId,
        expiresAt: dto.expiresAt,
      },
    });

    return {
      id: apiKey.id,
      key: raw,
      name: apiKey.name,
      createdAt: apiKey.createdAt,
      lastUsed: apiKey.lastUsed,
      expiresAt: apiKey.expiresAt,
      isActive: apiKey.isActive,
    };
  }

  async validateApiKey(rawKey: string): Promise<UserWithoutSensitive | null> {
    const hashedKey = this.hashApiKey(rawKey);

    const prismaWithApiKey = prisma as PrismaWithApiKey;

    const apiKey = await prismaWithApiKey.apiKey.findUnique({
      where: { key: hashedKey },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    }) as ApiKeyWithUser | null;

    if (!apiKey) {
      return null;
    }

    if (!apiKey.isActive) {
      return null;
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    void prismaWithApiKey.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsed: new Date() },
    }).catch(() => {
      // Silently fail if update fails - not critical
    });

    return apiKey.user;
  }

  async listUserApiKeys(userId: string): Promise<ApiKeyResponse[]> {
    const prismaWithApiKey = prisma as PrismaWithApiKey;

    const apiKeys = await prismaWithApiKey.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map((key: ApiKey) => ({
      id: key.id,
      name: key.name,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
      expiresAt: key.expiresAt,
      isActive: key.isActive,
    }));
  }

  async revokeApiKey(keyId: string, userId: string): Promise<void> {
    const prismaWithApiKey = prisma as PrismaWithApiKey;

    const apiKey = await prismaWithApiKey.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await prismaWithApiKey.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
  }

  async deleteApiKey(keyId: string, userId: string): Promise<void> {
    const prismaWithApiKey = prisma as PrismaWithApiKey;

    const apiKey = await prismaWithApiKey.apiKey.findFirst({
      where: {
        id: keyId,
        userId,
      },
    });

    if (!apiKey) {
      throw new Error('API key not found');
    }

    await prismaWithApiKey.apiKey.delete({
      where: { id: keyId },
    });
  }
}

export const apiKeyService = new ApiKeyService();