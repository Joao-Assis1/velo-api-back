# Backend API Flows Design

## Architecture
- **Controllers**: Will define routing paths (`@Controller('users')`, `@Controller('lessons')`, etc.) and HTTP methods (`@Get()`, `@Post()`, `@Patch()`). They will receive incoming requests and extract parameters/body payloads.
- **Services**: Injected with `@Injectable()` and using the `PrismaService`. They will execute Prisma Client operations (e.g., `this.prisma.user.create()`).

## Endpoint Mappings

### Users (`/users`)
- `POST /users`: Create User
- `GET /users/:id`: Get User Profile
- `GET /users`: List Users (filterable by role via query param `?role=INSTRUCTOR`)

### Vehicles (`/vehicles`)
- `POST /vehicles`: Create Vehicle
- `GET /vehicles`: List Vehicles (filterable by `?instructorId=xyz`)

### Availability (`/availability`)
- `POST /availability`: Create Availability slot
- `GET /availability`: List Availabilities (filterable by `?instructorId=xyz`)

### Lessons (`/lessons`)
- `POST /lessons`: Book Lesson
- `GET /lessons`: List Lessons (filterable by `?studentId=xyz` or `?instructorId=xyz`)
- `PATCH /lessons/:id`: Update Lesson status (e.g., mark as completed or cancelled)

### Payments (`/payments`)
- `POST /payments`: Create Payment for a lesson
- `GET /payments`: List Payments (filterable by `?studentId=xyz`)