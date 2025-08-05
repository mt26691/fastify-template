# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npm run db:generate

# Build application
RUN npm run build

# Stage 3: Production
FROM gcr.io/distroless/nodejs20-debian12:nonroot AS runner
WORKDIR /app

# Set NODE_ENV
ENV NODE_ENV=production

# Copy production dependencies from deps stage
COPY --from=deps --chown=nonroot:nonroot /app/node_modules ./node_modules

# Copy built application from builder stage
COPY --from=builder --chown=nonroot:nonroot /app/dist ./dist
COPY --from=builder --chown=nonroot:nonroot /app/package*.json ./
COPY --from=builder --chown=nonroot:nonroot /app/prisma ./prisma

# Expose port
EXPOSE 3000

# Run the application
CMD ["dist/server.js"]