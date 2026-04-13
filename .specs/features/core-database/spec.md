# Core Database Setup Specification

## Objective
Establish the primary database schema for the Velo application using Prisma and PostgreSQL (Neon.tech). Ensure that the data model supports both Student and Instructor flows based on the frontend codebase.

## Requirements
- Setup a `User` table to handle both instructors and students.
- Support role-based access logic (`STUDENT` vs `INSTRUCTOR`).
- Establish a `Vehicle` entity managed by instructors or admins.
- Establish an `Availability` entity for instructors to define when they can give lessons.
- Establish a `Lesson` (Booking) entity that ties a student, an instructor, a vehicle, and a timeslot together.
- Establish a `Payment` entity tracking payment status for lessons.
- Use Prisma as the ORM.
- Use Neon.tech PostgreSQL as the underlying database engine.