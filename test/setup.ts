import { beforeAll, afterAll } from 'vitest'
import { config } from 'dotenv'

// Load test environment variables
config({ path: '.env.test' })

beforeAll(async () => {
  // Global test setup
})

afterAll(async () => {
  // Global test cleanup
})