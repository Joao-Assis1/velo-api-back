# Backend Split Users Models Tasks

## 1. Update Schema and Migrate
**What**: Replace `User` with `Student` and `Instructor` in `prisma/schema.prisma`. Update foreign keys. Run Prisma migration.
**Where**: `prisma/schema.prisma`, Terminal
**Done when**: Migration is applied successfully and Prisma types are generated.

## 2. API Refactor
**What**: Remove `users` module. Generate `students` and `instructors` modules. Create DTOs, Services, and Controllers.
**Where**: `src/modules/`
**Done when**: NestJS modules are fully created and `app.module.ts` is updated.

## 3. Codebase Integration
**What**: Ensure `lessons`, `vehicles`, `availability`, and `payments` services still compile, updating imports or return types if necessary. Update Swagger tags.
**Where**: `src/modules/**/*.ts`
**Done when**: `npm run build` succeeds without TS errors.