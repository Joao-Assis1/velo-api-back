# Core Database Design

## Overview
We use a relational database model implemented via Prisma, running on Neon PostgreSQL. The schema is normalized but optimized for quick querying of schedules and availability.

## Entity Relationship Diagram (Conceptual)
- **User** 1:N **Vehicle** (Instructor owns/manages vehicles)
- **User** 1:N **Availability** (Instructor has availability slots)
- **User** 1:N **Lesson** (as Student)
- **User** 1:N **Lesson** (as Instructor)
- **Lesson** N:1 **Vehicle**
- **Lesson** 1:1 **Payment** (or N:1 depending on structure, let's keep it 1:1 for now)

## Prisma Schema Draft
```prisma
enum Role {
  STUDENT
  INSTRUCTOR
  ADMIN
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  role      Role     @default(STUDENT)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  vehicles      Vehicle[]
  availabilities Availability[]
  lessonsAsStudent Lesson[] @relation("StudentLessons")
  lessonsAsInstructor Lesson[] @relation("InstructorLessons")
  payments      Payment[]
}

model Vehicle {
  id          String   @id @default(uuid())
  plate       String   @unique
  model       String
  instructorId String
  instructor  User     @relation(fields: [instructorId], references: [id])
  lessons     Lesson[]
}

model Availability {
  id          String   @id @default(uuid())
  startTime   DateTime
  endTime     DateTime
  instructorId String
  instructor  User     @relation(fields: [instructorId], references: [id])
}

model Lesson {
  id           String   @id @default(uuid())
  studentId    String
  instructorId String
  vehicleId    String?
  startTime    DateTime
  endTime      DateTime
  status       String   @default("SCHEDULED") // SCHEDULED, COMPLETED, CANCELLED

  student      User     @relation("StudentLessons", fields: [studentId], references: [id])
  instructor   User     @relation("InstructorLessons", fields: [instructorId], references: [id])
  vehicle      Vehicle? @relation(fields: [vehicleId], references: [id])
  payment      Payment?
}

model Payment {
  id        String   @id @default(uuid())
  amount    Float
  status    String   @default("PENDING") // PENDING, COMPLETED, FAILED
  studentId String
  lessonId  String?  @unique
  
  student   User     @relation(fields: [studentId], references: [id])
  lesson    Lesson?  @relation(fields: [lessonId], references: [id])
}
```