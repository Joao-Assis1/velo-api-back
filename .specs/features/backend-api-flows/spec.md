# Backend API Flows Specification

## Objective
Implement backend API endpoints in NestJS based on the frontend functionality flows defined in the application architecture. Connect these endpoints to the recently created Prisma migration models (PostgreSQL on Neon.tech).

## Identified Flows
1. **Users & Auth**: Registration for Students and Instructors. Fetching user profile and listing instructors.
2. **Vehicles**: Instructors adding their teaching vehicles.
3. **Availability**: Instructors setting available time slots for lessons.
4. **Lessons (Booking)**: Students booking lessons, tracking lesson statuses (`SCHEDULED`, `COMPLETED`, `CANCELLED`).
5. **Payments**: Processing/tracking lesson payments.

## Requirements
- Create NestJS controllers for each entity.
- Create NestJS services utilizing the injected `PrismaService` to execute database queries.
- Connect Prisma schema definitions to RESTful API requests and responses.