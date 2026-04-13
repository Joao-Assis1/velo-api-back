# Auth & Navigation Design

## Architecture Overview
The authentication and navigation system will be designed as a modular, scalable structure that prepares for Next.js migration while maintaining the current functionality.

## Component Structure
```
src/
├── components/
│   ├── layout/
│   │   └── MainLayout.tsx
│   ├── navigation/
│   │   ├── AuthNavigator.tsx
│   │   └── RouteGuard.tsx
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── SplashScreen.tsx
│   │   │   ├── Onboarding.tsx
│   │   │   └── RoleSelection.tsx
│   │   ├── student/
│   │   │   └── StudentHome.tsx
│   │   └── instructor/
│   │       └── InstructorDashboard.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Card.tsx
├── context/
│   └── AppContext.tsx
├── lib/
│   └── utils.ts
├── hooks/
│   └── useAuth.ts
└── types/
    └── auth.ts
```

## State Management Design
### AppContext Enhancements
- Keep existing screen and userRole state
- Add loading states for async operations
- Add error state for authentication flows
- Add persistence layer preparation (localStorage hooks)

### Navigation Flow
1. **SplashScreen** (3 seconds) → **Onboarding** → **RoleSelection** → Role-specific home
2. Direct access logic: If userRole exists, skip to appropriate home
3. Protected routes: Role-based components check authentication via context

## Component Responsibilities

### SplashScreen.tsx
- Displays app logo and branding
- Automatic timeout to proceed to onboarding
- Simple, visually appealing introduction

### Onboarding.tsx
- Multi-step carousel showing app benefits
- Skip option to proceed directly to role selection
- Visual illustrations of student/instructor features

### RoleSelection.tsx
- Clear choice between Student and Instructor roles
- Visual cards with role-specific icons and descriptions
- Immediate navigation upon selection

### StudentHome.tsx & InstructorDashboard.tsx
- Placeholder views for Phase 2 and 3 implementation
- Basic layout with welcome messages
- Navigation placeholders for upcoming features

### AuthNavigator.tsx
- Central navigation logic
- Route protection based on userRole
- Redirect handling for unauthorized access

### RouteGuard.tsx
- Higher-order component or custom hook for route protection
- Redirects to appropriate screens based on auth state

## Styling Approach
- **Tailwind CSS** for utility-first styling
- **ShadCN UI** components for:
  - Buttons
  - Cards
  - Input fields (when forms are added)
  - Avatars
  - Toasts/notifications
- Responsive design with mobile-first breakpoints
- Consistent spacing and typography using Tailwind's scale

## Animation & Motion
- **Framer Motion** for:
  - Splash screen fade-in/fade-out
  - Onboarding carousel transitions
  - Button hover and press effects
  - Page transitions (prepare for Next.js page transitions)
  - Modal animations (for future use)

## Data Flow
1. User interaction → Component state/local action
2. Local actions → AppContext state updates (via useApp hook)
3. Context changes → Component re-renders via useApp subscription
4. Navigation components read from context to determine display

## Next.js Migration Preparation
### File Structure Readiness
- Components organized for easy migration to Next.js pages/
- Screen components ready to become page components
- Layout components ready for Next.js Layout.js/RFC pattern

### Routing Abstraction
- Navigation logic isolated in AuthNavigator
- Route constants defined in single location
- Prepare for next/link and next/router usage
- SEO metadata preparation (title, description placeholders)

### Data Fetching Readiness
- Context actions designed to be replaced with async data fetching
- Loading and error states already incorporated
- Prepare for React Query/SWR integration

## Accessibility Considerations
- Semantic HTML elements
- Proper ARIA labels for icons and buttons
- Keyboard navigation support
- Focus management for modal/dialogs (future)
- Color contrast compliant with WCAG AA
- Screen reader friendly labels

## Performance Optimizations
- Component memoization where beneficial (React.memo)
- Image optimization placeholders
- Bundle splitting preparation (code splitting by route)
- Lazy loading preparation for heavy components
- Minimal initial payload (splash screen only loads essentials)

## Error Handling & Loading States
- Global error boundary preparation
- Loading skeletons for data-dependent components
- Error retry mechanisms
- Empty states for data listings
- Form validation feedback preparation

## Testing Strategy Preparation
- Components designed for isolation testing
- Clear prop interfaces for mocking
- Custom hooks separation for easier testing
- Test IDs planned for critical elements
- Mock context providers for component testing

## Design Decisions Justification

### Why Modular Component Structure?
- Enables team parallel development
- Facilitates unit testing
- Prepares for Next.js migration
- Improves code maintainability
- Allows UI/UX iteration without touching logic

### Why Keep Context for Navigation State?
- Simple state doesn't require external library yet
- Context is built-in and sufficient for UI state
- Easy to migrate to external state management later
- Avoids over-engineering for current scope

### Why Prepare for Next.js Early?
- Reduces migration effort later
- Ensures component compatibility
- Establishes patterns that work in both frameworks
- Leverages user's explicit stack request

## Open Questions
1. Should onboarding be skippable entirely or just have a "skip" button?
2. What should be the timeout duration for splash screen?
3. Should we implement localStorage persistence for role selection now or wait for backend auth?
4. How detailed should the Phase 2/3 placeholder screens be?

These will be resolved during implementation or in subsequent refinement cycles.