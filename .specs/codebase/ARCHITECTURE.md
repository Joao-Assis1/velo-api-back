# Application Architecture

## Overall Structure
- **Single Page Application (SPA)** with client-side routing managed through React state
- **Context-based State Management** using React Context API for global app state
- **Component-based UI** with all components primarily located in App.tsx (currently monolithic)
- **Screen-based Navigation** where different views are controlled by state transitions

## Layered Architecture
1. **Presentation Layer**: React components (currently all in App.tsx)
2. **State Management Layer**: AppContext.tsx providing global state and actions
3. **Data Layer**: Not explicitly separated - data appears to be managed within components/context
4. **Utilities Layer**: lib/utils.ts for helper functions (cn utility)
5. **Types Layer**: src/types.ts for TypeScript interfaces and types

## Key Architectural Decisions
- **Monolithic Component Structure**: All UI logic currently resides in App.tsx
- **Centralized State**: AppContext manages screen navigation, user authentication, role selection
- **Imperative Navigation**: Screen changes handled via state setter functions in context
- **Role-based Routing**: Different screen flows for student vs instructor roles

## Data Flow
- User interactions → Context state updates → Component re-renders → UI updates
- No external data fetching observed in current codebase (likely to be implemented)
- Local state management for UI elements

## Scalability Concerns
- Current monolithic App.tsx will become unwieldy as features grow
- No clear separation of concerns between components
- Limited reusability of UI components
- No modular code organization

## Planned Improvements Needed
- Component extraction from App.tsx into reusable components
- Feature-based folder organization
- Implementation of proper data fetching layer
- Consideration for state management scalability (Context vs Redux/Zustand)