# Project State

## Decisions Made
- **Stack**: Next.js, Tailwind CSS, ShadCN UI (as requested by user)
- **Backend Stack**: NestJS, Prisma, PostgreSQL (Neon.tech)
- **State Management**: React Context API (current implementation)
- **Routing**: Client-side navigation via state (to be upgraded to Next.js routing)
- **Styling**: Utility-first with Tailwind CSS
- **Icons**: Lucide React
- **Date Handling**: date-fns with ptBR locale
- **Animations**: Framer Motion

## Open Questions / Blockers
- **Backend Integration**: No backend API defined yet - need to define endpoints for data fetching
- **Authentication Strategy**: Current implementation is role-based simulation - need real auth with JWT/sessions
- **Data Persistence**: Currently using ephemeral state - need to integrate with backend/API
- **File Structure**: Current monolithic App.tsx needs to be broken down into components
- **Next.js Migration**: Need to migrate from Vite + React to Next.js framework
- **Form Handling**: No form validation library implemented yet
- **Testing**: No tests currently written

## Todos
- [x] **BACKEND: SPLIT USERS MODELS** - Separate User into Student and Instructor tables (`.specs/features/backend-split-users-models/tasks.md`)
- [x] **BACKEND: FLOW FEATURES SYNC** - Update schema and APIs based on `FLOW_AND_FEATURES.md` (`.specs/features/backend-flow-features/tasks.md`)
- [x] **BACKEND: SWAGGER** - Added OpenAPI documentation
- [x] **BACKEND: USERS API** - `POST /users`, `GET /users/:id`, `GET /users` (`.specs/features/backend-api-flows/tasks.md`)
- [x] **BACKEND: VEHICLES API** - `POST /vehicles`, `GET /vehicles`
- [x] **BACKEND: AVAILABILITY API** - `POST /availability`, `GET /availability`
- [x] **BACKEND: LESSONS API** - `POST /lessons`, `GET /lessons`, `PATCH /lessons/:id`
- [x] **BACKEND: PAYMENTS API** - `POST /payments`, `GET /payments`
- [x] **BACKEND: DATABASE SETUP** - Created Prisma schema and deployed to Neon (`.specs/features/core-database/tasks.md`)
- [x] **NEXT.js MIGRATION [DONE]** - see `.specs/features/nextjs-migration/tasks.md`
- [x] **RESPONSIVE LAYOUT [DONE]** - see `.specs/features/responsive-layout/tasks.md`
- [x] **BOOKING BAR RESPONSIVE [DONE]** - see `.specs/features/booking-bar-responsive/tasks.md`
- [ ] Replace custom UI components with ShadCN equivalents where possible
- [ ] Add data fetching layer (React Query/SWR or similar)
- [ ] Implement real authentication with backend integration
- [ ] Add form validation (React Hook Form + Zod)
- [ ] Set up testing framework (Vitest + React Testing Library)
- [ ] Create reusable component library
- [ ] Implement responsive design patterns
- [ ] Add loading states and error boundaries
- [ ] Implement proper navigation with Next.js router
- [ ] Add environment configuration for different deployments
- [ ] Set up linting and formatting (ESLint, Prettier)
- [ ] Add SEO metadata and tags
- [ ] Implement PWA capabilities
- [ ] Add accessibility features (ARIA labels, keyboard navigation)

## Deferred Ideas
- **Dark Mode**: Implement with Tailwind CSS dark mode support
- **Internationalization**: Add i18n support for multiple languages
- **Real-time Features**: WebSocket or SSE for live updates
- **Offline Support**: Service workers and caching strategy
- **Analytics**: Integrate Google Analytics or similar
- **Admin Dashboard**: Separate admin interface for school management
- **Payment Processing**: Integrate Stripe or Pix payments
- **Document Management**: Secure file upload and storage
- **Notifications**: Push notifications and email/SMS integration**Notifications**: Push notifications and email/SMS integration