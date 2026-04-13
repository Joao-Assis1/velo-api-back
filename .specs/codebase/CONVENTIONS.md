# Code Conventions

## File Organization
- **Component Files**: `.tsx` extension for React components
- **Type Definitions**: `.ts` extension for TypeScript interfaces and types
- **Styles**: Tailwind CSS utility classes directly in JSX
- **Context**: Centralized state management in `src/context/`
- **Utilities**: Helper functions in `src/lib/`
- **Entry Point**: `src/main.tsx` for ReactDOM rendering
- **Root Component**: `src/App.tsx` contains all application screens

## Naming Conventions
- **Components**: PascalCase (e.g., `App`, `AppProvider`)
- **Functions/Vars**: camelCase (e.g., `navigateTo`, `setUserRole`)
- **Types/Interfaces**: PascalCase (e.g., `UserRole`, `Screen`, `Instructor`)
- **Constants**: Not observed in current codebase
- **Context**: `AppContext` with `useApp` hook

## Import Organization
1. **React imports**: From 'react' and related libraries
2. **Third-party libraries**: Icons, motion, date-fns, etc.
3. **Local utilities**: `./lib/utils`
4. **Local components/types**: Relative paths within src/
5. **CSS**: `./index.css`

## TypeScript Usage
- **Strict typing**: Interfaces for all complex objects
- **Union types**: For limited value sets (UserRole, Screen)
- **Nullable types**: Explicit `| null` for optional values
- **Literal types**: For specific string values (transmission, type)
- **Object shapes**: Detailed interfaces for data models

## Styling Conventions
- **Tailwind CSS**: Utility-first approach
- **cn() utility**: Combines clsx and tailwind-merge for conditional classes
- **Responsive design**: Not explicitly observed in current snippet
- **Dark mode**: Not configured in current codebase

## State Management Patterns
- **React Context**: For global app state (screens, user role, etc.)
- **useState hooks**: For local component state
- **State colocation**: Related state kept together in context
- **Immutable updates**: Using setter functions from useState

## Navigation Patterns
- **State-driven**: Screen changes via state setter
- **Centralized**: All navigation logic in AppContext
- **Scroll reset**: Window scrolls to top on navigation
- **Role-based**: Different flows for student vs instructor

## Error Handling
- **Custom Error**: useApp hook throws error if used outside provider
- **Try/Catch**: Not observed in current codebase
- **Validation**: Not implemented in current snippets

## Performance Considerations
- **Memoization**: Not observed (useMemo, useCallback)
- **Lazy loading**: Not implemented
- **Bundle splitting**: Not configured

## Testing Conventions
- **Not established**: No test files observed in current codebase