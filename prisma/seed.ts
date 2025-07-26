import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import { logger } from "../src/utils/logger";

const prisma = new PrismaClient();

interface UserSeedData {
  name: string;
  username: string;
  email: string;
  password: string;
  role?: UserRole;
}

async function seedUsers(users: UserSeedData[]): Promise<void> {
  logger.info(`Seeding ${users.length} users...`);

  for (const userData of users) {
    try {
      // Generate salt and hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      // Create or update user
      const user = await prisma.user.upsert({
        where: { email: userData.email },
        update: {
          name: userData.name,
          username: userData.username,
          password: hashedPassword,
          salt,
          role: userData.role ?? UserRole.USER,
        },
        create: {
          name: userData.name,
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          salt,
          role: userData.role ?? UserRole.USER,
        },
      });

      logger.info("Seeded user:", {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      });
    } catch (error) {
      logger.error(`Failed to seed user ${userData.email}:`, error);
    }
  }
}

async function main(): Promise<void> {
  logger.info("Starting database seed...");

  // Define users to seed
  const usersToSeed: UserSeedData[] = [
    {
      name: "Admin User",
      username: "admin",
      email: "admin@example.com",
      password: "admin123",
      role: UserRole.ADMIN,
    },
    {
      name: "Moderator User",
      username: "moderator",
      email: "mod@example.com",
      password: "mod123",
      role: UserRole.ADMIN,
    },
  ];

  // Seed users
  await seedUsers(usersToSeed);

  logger.info("Database seeding completed!");
}

// Execute the main function
main()
  .catch((e) => {
    logger.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// Export for potential reuse in tests or other scripts
export { seedUsers };
