# Backend Flow Features Design

## Schema Design (Prisma)
- Added multiple optional columns to the `User` table to keep the Single-Table approach for both roles but accommodate new data.
- Refactored `Availability` to hold `dayOfWeek` (0-6), `startTime` ("08:00"), `endTime` ("18:00"), and `isEnabled`.
- Expanded `Lesson` to handle the execution cycle (`checkInTime`, `checkOutTime`) and feedback cycle.

## API Additions
- **LessonsController**:
  - `PATCH /lessons/:id/checkin` -> sets `status = 'in-progress'` and `checkInTime`.
  - `PATCH /lessons/:id/checkout` -> sets `status = 'completed'`, `checkOutTime`, and calculates `durationMinutes`.
  - `PATCH /lessons/:id/feedback-instructor` -> saves instructor's text feedback about the student.
  - `PATCH /lessons/:id/feedback-student` -> saves student's rating and text for the instructor.
- **UsersController / VehiclesController / AvailabilityController**:
  - DTO updates to allow sending the new fields.