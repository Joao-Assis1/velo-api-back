# Next.js Migration Specification

## Context
The current project is a Vite + React SPA with a monolithic `App.tsx` containing all logic, types, and mock data. We need to migrate to Next.js (App Router) to improve scalability, SEO, and developer experience, while adopting ShadCN UI for a more professional component library.

## Requirements

### R-01: Framework Setup
- Initialize Next.js 15+ with App Router.
- Configure TypeScript, Tailwind CSS, and ESLint.
- Set up ShadCN UI base (radix-ui, tailwind-merge, clsx).

### R-02: Project Structure
- Implement a feature-based folder structure.
- `src/app`: App Router pages and layouts.
- `src/components`: UI components (ShadCN and custom).
- `src/hooks`: Custom React hooks.
- `src/lib`: Utility functions.
- `src/context`: React Context providers.
- `src/types`: TypeScript definitions.
- `src/constants`: App constants and mock data.

### R-03: Component Extraction
- Extract reusable UI components from `App.tsx` (Button, Card, Input).
- Replace them with ShadCN equivalents where possible.
- Extract screen-level components (SplashScreen, Onboarding, etc.) to `src/components/screens`.

### R-04: State & Navigation
- Migrate `AppContext` to Next.js.
- Replace client-side state navigation with Next.js App Router (file-based routing).
- Implement role-based access control using Next.js middleware or layout-level checks.

### R-05: Styling
- Maintain the "Velo" branding colors and theme.
- Ensure Tailwind CSS 4+ (current in package.json) is properly configured for Next.js.

### R-06: Mock Data & Types
- Move mock data and types from `App.tsx` to centralized files in `src/constants/mockData.ts` and `src/types/index.ts`.

## Success Criteria
- The application runs on `localhost:3000` using `npm run dev` (Next.js).
- All screens currently in `App.tsx` are accessible via routes or state within the new structure.
- Navigation flows between roles (student/instructor) are functional.
- ShadCN UI components are used for core layout and form elements.
- Code is clean, modular, and follows the `tlc-spec-driven` conventions.
