# Feature Roadmap

## Phase 1: Foundation & Authentication (Weeks 1-2)
### Features:
- Splash screen with branding
- Onboarding flow explaining app purpose
- Authentication screen (student/instructor selection)
- Registration flow with basic info collection
- Role-based navigation (student vs instructor paths)
- Logout functionality
- Persistent state management (context/localStorage)

### Components to create:
- SplashScreen
- Onboarding
- AuthScreen
- RegisterForm
- Navigation components
- Protected routes (conceptual)

## Phase 2: Student Dashboard (Weeks 3-4)
### Features:
- Student home/dashboard with overview
- Schedule viewing and management
- Class booking system
- Progress tracking (lessons completed, remaining)
- Profile management
- Payment history and upcoming payments
- Personal data management
- Settings and preferences

### Components to create:
- StudentHome
- StudentSchedule
- BookingCalendar
- ProgressTracker
- StudentProfile
- PaymentHistory
- PersonalDataForm
- SettingsPanel

## Phase 3: Instructor Dashboard (Weeks 5-6)
### Features:
- Instructor dashboard with daily overview
- Schedule management and availability setting
- Student list management
- Individual student detail view
- Profile management
- Vehicle information management
- Earnings tracking
- Availability calendar

### Components to create:
- InstructorDashboard
- InstructorSchedule
- ManageStudents
- StudentDetailView
- InstructorProfile
- VehicleManager
- AvailabilityCalendar
- EarningsTracker

## Phase 4: Advanced Features & Refinements (Weeks 7-8)
### Features:
- Real-time notifications
- Reminder system (SMS/email push notifications)
- Document upload (CNH, medical certificates, etc.)
- In-app messaging between students and instructors
- Rating and review system
- Administrative oversight features
- Offline capabilities
- Accessibility improvements
- Performance optimization

### Components to create:
- NotificationSystem
- DocumentUploader
- MessagingInterface
- RatingReviewSystem
- AdminOverview
- OfflineIndicator

## Technical Improvements (Ongoing)
- Migration from Vite to Next.js (as requested)
- Implementation of proper data fetching layer (React Query/SWR)
- Form validation library integration (React Hook Form + Zod)
- Unit and integration testing setup
- Storybook for component documentation
- Error boundaries and loading states
- SEO optimization (for public pages)
- PWA capabilities