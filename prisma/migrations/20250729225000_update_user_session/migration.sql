/*
  Warnings:

  - You are about to drop the column `accessToken` on the `user_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `accessTokenExpiry` on the `user_sessions` table. All the data in the column will be lost.
  - Added the required column `deviceId` to the `user_sessions` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "user_sessions_accessToken_idx";

-- DropIndex
DROP INDEX "user_sessions_accessToken_key";

-- AlterTable
ALTER TABLE "password_reset_tokens" ALTER COLUMN "expiresAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "user_sessions" DROP COLUMN "accessToken",
DROP COLUMN "accessTokenExpiry",
ADD COLUMN     "browser" TEXT,
ADD COLUMN     "deviceId" UUID NOT NULL,
ADD COLUMN     "ipAddresses" TEXT[],
ADD COLUMN     "revokedAt" TIMESTAMPTZ,
ALTER COLUMN "refreshTokenExpiry" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMPTZ,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "user_sessions_deviceId_idx" ON "user_sessions"("deviceId");
