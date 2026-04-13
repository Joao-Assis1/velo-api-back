# Backend Split Users Models Design

## Schema Changes
- Delete `model User` and `enum Role`.
- Define `model Student` containing core user details + `ladvUploaded`. Includes inverse relations: `lessons`, `payments`.
- Define `model Instructor` containing core user details + `bio`, `instructorType`, `location`, `pricePerClass`, `rating`, `reviewsCount`. Includes inverse relations: `vehicles`, `availabilities`, `lessons`.
- In `Vehicle`, `Availability`: change `instructor User` to `instructor Instructor`.
- In `Payment`: change `student User` to `student Student`.
- In `Lesson`: change `student User` to `student Student`, and `instructor User` to `instructor Instructor`.

## API and Application Flow
- `src/modules/users` will be deleted.
- New `src/modules/students` and `src/modules/instructors` will be created with `Controller`, `Service`, and `DTO` files.
- References in existing modules (e.g. `LessonsService` includes) need to match the new relation names (Prisma's defaults should work seamlessly if we name them `student` and `instructor`).