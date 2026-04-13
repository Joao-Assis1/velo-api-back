# Backend Split Users Models Spec

## Objective
Split the `User` model into two distinct and independent tables: `Student` and `Instructor`, according to the `FLOW_AND_FEATURES.md` and user request. Ensure that all related models (`Lesson`, `Vehicle`, `Availability`, `Payment`) are correctly linked to these new tables.

## Requirements
- Create `Student` table with fields: `id`, `email`, `name`, `phone`, `cpf`, `profilePicture`, `ladvUploaded`, `createdAt`, `updatedAt`.
- Create `Instructor` table with fields: `id`, `email`, `name`, `phone`, `cpf`, `profilePicture`, `bio`, `instructorType`, `location`, `pricePerClass`, `rating`, `reviewsCount`, `createdAt`, `updatedAt`.
- Remove the `User` table and the `Role` enum.
- Update `Lesson` to relate to `Student` and `Instructor`.
- Update `Vehicle` to relate to `Instructor`.
- Update `Availability` to relate to `Instructor`.
- Update `Payment` to relate to `Student`.
- Build and expose `students` and `instructors` APIs instead of the `users` API.