# Backend Flow Features Specification

## Objective
Sync the backend models and API routes with the `FLOW_AND_FEATURES.md` document, ensuring all fields required for the Student and Instructor journeys exist in the database and are exposed via API.

## Requirements
- The **Student** needs CPF, Phone, Profile Picture, and LADV status.
- The **Instructor** needs Bio, Type, Location, Price, and Ratings.
- The **Vehicle** needs Year, Transmission, and Photo.
- The **Availability** must reflect generic weekly timeslots (day of week, start, end string times) instead of strict datetimes.
- The **Lesson** requires detailed tracking: date, string times, check-in, check-out, duration, price, and mutually given feedback.

## Acceptance Criteria
- All these fields are mapped correctly in Prisma.
- NestJS DTOs strictly validate the incoming types.
- Swagger reflects all the new endpoints and structures.