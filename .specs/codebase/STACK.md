# Frontend Stack

## Target Stack (as requested)
- **Next.js** - React framework for server-side rendering and routing
- **React** - UI library for building components  
- **TypeScript** - Typed superset of JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **ShadCN UI** - Component library built on Radix UI and Tailwind CSS

## Current Stack (for migration reference)
- **Vite** - Current build tool (to be replaced with Next.js)
- **React** - UI library
- **TypeScript** - Typed superset of JavaScript
- **Tailwind CSS** - Utility-first CSS framework (via @tailwindcss/vite)
- **Framer Motion** - Animation library
- **Lucide React** - Icon library
- **date-fns** - Date manipulation
- **clsx + tailwind-merge** - Class name utilities

## State Management
- **React Context API** (current implementation)
- **Target**: Consider React Query/SWR for server state, Context for UI state

## Styling
- **Tailwind CSS** - Utility-first approach
- **ShadCN UI** - Pre-built accessible components

## Key Migration Tasks
- Replace Vite configuration with Next.js
- Update build and dev scripts
- Migrate from Vite-specific imports to Next.js equivalents
- Implement Next.js routing (pages/router) instead of state-based navigation
- Optimize for Next.js features (SSR, SSG, ISR where beneficial)