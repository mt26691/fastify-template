import { defineConfig } from 'vitest/config'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/integration/setup.ts'],
    include: [
      'test/integration/**/*.test.ts',
      'src/modules/**/tests/integration/**/*.test.ts'
    ],
    sequence: {
      hooks: 'list',
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@config': path.resolve(__dirname, './src/config'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@services': path.resolve(__dirname, './src/services'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '../../src/app.js': path.resolve(__dirname, './src/app.ts'),
      '../../src/services/prisma.js': path.resolve(__dirname, './src/services/prisma.ts'),
      '../../src/utils/logger.js': path.resolve(__dirname, './src/utils/logger.ts'),
      '../../../../app.js': path.resolve(__dirname, './src/app.ts'),
      '../../../../services/prisma.js': path.resolve(__dirname, './src/services/prisma.ts'),
    },
  },
  server: {
    deps: {
      inline: ['@fastify/autoload', 'fastify-plugin']
    }
  }
})