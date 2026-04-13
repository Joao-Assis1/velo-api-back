# Auth & Navigation Tasks

## Task List

### TASK-01: Create Component Structure
**Description**: Set up the component directory structure for auth and navigation screens
**Where**: src/components/
**Depends on**: Nothing
**Reuses**: Existing AppContext and types
**Done when**: Directory structure created with all necessary folders
**Tests**: 
- ls src/components/screens/auth/ returns SplashScreen.tsx, Onboarding.tsx, RoleSelection.tsx
- ls src/components/screens/ returns auth/, student/, instructor/ directories
**Gate**: pass

### TASK-02: Implement SplashScreen Component
**Description**: Create the initial splash screen with app branding and automatic timeout
**Where**: src/components/screens/auth/SplashScreen.tsx
**Depends on**: TASK-01
**Reuses**: motion/framer, lucide-icons
**Done when**: Component displays logo and automatically transitions after 3 seconds
**Tests**:
- Visual: Logo and app name visible
- Functional: Automatically navigates to onboarding after 3000ms
- Code: Uses useEffect for timeout, motion for animations
**Gate**: pass

### TASK-03: Implement Onboarding Component
**Description**: Create multi-step onboarding carousel explaining app benefits
**Where**: src/components/screens/auth/Onboarding.tsx
**Depends on**: TASK-01
**Reuses**: motion/framer for transitions, lucide-icons
**Done when**: Component shows 3-4 slides with skip option and navigation controls
**Tests**:
- Visual: Slides show student/instructor benefits
- Functional: Next/prev buttons work, skip button jumps to role selection
- Code: Uses motion for slide transitions, handles state for current slide
**Gate**: pass

### TASK-04: Implement RoleSelection Component
**Description**: Create role selection screen with clear student/instructor options
**Where**: src/components/screens/auth/RoleSelection.tsx
**Depends on**: TASK-01
**Reuses**: lucide-icons, shadcn-ui buttons/cards (when available)
**Done when**: Component shows two options and navigates to appropriate home screen
**Tests**:
- Visual: Clear visual distinction between student and instructor options
- Functional: Student selection -> student-home, Instructor selection -> instructor-dashboard
- Code: Uses context navigateTo function, handles loading states
**Gate**: pass

### TASK-05: Implement StudentHome Placeholder
**Description**: Create basic student home screen as placeholder for Phase 2
**Where**: src/components/screens/student/StudentHome.tsx
**Depends on**: TASK-01
**Reuses**: Existing layout concepts
**Done when**: Component shows welcome message and navigation placeholders
**Tests**:
- Visual: Shows "Welcome, Student!" message
- Functional: Has navigation links to upcoming features (schedule, profile, etc.)
- Code: Basic functional component with proper exports
**Gate**: pass

### TASK-06: Implement InstructorDashboard Placeholder
**Description**: Create basic instructor dashboard screen as placeholder for Phase 3
**Where**: src/components/screens/instructor/InstructorDashboard.tsx
**Depends on**: TASK-01
**Reuses**: Existing layout concepts
**Done when**: Component shows welcome message and navigation placeholders
**Tests**:
- Visual: Shows "Welcome, Instructor!" message
- Functional: Has navigation links to upcoming features (schedule, students, etc.)
- Code: Basic functional component with proper exports
**Gate**: pass

### TASK-07: Refactor AppContext for Navigation
**Description**: Enhance AppContext to support the new component-based navigation
**Where**: src/context/AppContext.tsx
**Depends on**: TASK-01 through TASK-06
**Reuses**: Existing context structure
**Done when**: Context supports screen navigation for new component structure
**Tests**:
- Functional: All new screens can be navigated to via context
- Code: Maintains backward compatibility with existing screens
- Types: Proper typing for new screen values
**Gate**: pass

### TASK-08: Create Main Layout Component
**Description**: Create a consistent layout wrapper for all screens
**Where**: src/components/layout/MainLayout.tsx
**Depends on**: TASK-01
**Reuses**: Nothing new
**Done when**: Component provides consistent header/footer structure
**Tests**:
- Visual: Applies consistent styling to child components
- Functional: Accepts children prop and renders them
- Code: Simple wrapper component
**Gate**: pass

### TASK-09: Update App.tsx to Use New Components
**Description**: Replace monolithic screen logic with new component structure
**Where**: src/App.tsx
**Depends on**: TASK-01 through TASK-08
**Reuses**: All new components
**Done when**: App.tsx uses new component structure instead of inline screen logic
**Tests**:
- Functional: App renders correctly with new navigation flow
- Performance: Reduced complexity in App.tsx (separation of concerns)
- Code: App.tsx delegating to components, not containing screen logic
**Gate**: pass

### TASK-10: Add Navigation Constants and Types
**Description**: Create centralized navigation constants and extend types if needed
**Where**: src/constants/navigation.ts and src/types/nav.ts (if needed)
**Depends on**: TASK-01
**Reuses**: Existing types.ts
**Done when**: Navigation strings and types are centralized
**Tests**:
- Functional: No hardcoded screen strings in components
- Code: Single source of truth for navigation strings
- Types: Proper TypeScript definitions
**Gate**: pass

## Dependencies Summary
- TASK-01 is foundational for all other tasks
- TASKS-02 through TASK-06 can be worked on in parallel after TASK-01
- TASK-07 depends on all screen components being created
- TASK-08 and TASK-09 depend on layout and screen components
- TASK-10 can be done anytime after TASK-01

## Estimated Effort
- TASK-01: 15 min (directory setup)
- TASK-02: 45 min (SplashScreen)
- TASK-03: 60 min (Onboarding - most complex)
- TASK-04: 45 min (RoleSelection)
- TASK-05: 30 min (StudentHome placeholder)
- TASK-06: 30 min (InstructorDashboard placeholder)
- TASK-07: 30 min (Context updates)
- TASK-08: 20 min (MainLayout)
- TASK-09: 45 min (App.tsx refactor)
- TASK-10: 20 min (constants/types)

Total: ~6 hours