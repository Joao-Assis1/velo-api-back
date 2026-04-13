# Core Database Tasks

## 1. Init Prisma
**What**: Install Prisma, initialize schema, and setup `.env`.
**Where**: `package.json`, `prisma/schema.prisma`
**Done when**: `npx prisma init` has successfully created the `prisma` directory.

## 2. Define Prisma Schema
**What**: Implement the database schema detailed in `design.md`.
**Where**: `prisma/schema.prisma`
**Done when**: Schema successfully validates (`npx prisma validate`).

## 3. Database Migration
**What**: Push the schema to Neon.tech PostgreSQL.
**Where**: Terminal / Neon DB
**Done when**: `npx prisma migrate dev --name init` completes successfully.

## 4. Prisma Module Setup
**What**: Create a global `PrismaModule` and `PrismaService` in NestJS.
**Where**: `src/modules/prisma/`
**Done when**: The service successfully instantiates the PrismaClient and connects to the database on app startup.