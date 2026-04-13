# Backend Flow Features Tasks

## 1. Prisma Schema Synchronization
**What**: Update `schema.prisma` with all the new properties and relations, then run the DB migration.
**Where**: `prisma/schema.prisma`
**Done when**: `npx prisma migrate dev` succeeds and generates the types.

## 2. Refactor DTOs
**What**: Update all `Create` and `Update` DTO files to include the new fields with `class-validator` rules.
**Where**: `src/modules/**/dto/*.ts`
**Done when**: Types compile successfully.

## 3. Implement Execution and Feedback Flows in Lessons
**What**: Create specific endpoints and logic in `LessonsService` to handle `checkIn`, `checkOut`, and feedbacks.
**Where**: `src/modules/lessons/`
**Done when**: The routes are exposed and process the data correctly.

## 4. Build and Verify
**What**: Run the application and build process to verify the changes.
**Where**: Root directory
**Done when**: `npm run build` passes with no TypeScript errors.