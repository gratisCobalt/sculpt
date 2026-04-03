# Sculpt Native - Fitness Tracking App

## Project Overview
React Native-style fitness tracking web app built with React, TypeScript, Vite, and Tailwind CSS. Deployed on Cloudflare Pages.

## Tech Stack
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS v4
- Radix UI (component primitives)
- TanStack React Query (data fetching)
- Recharts (charts/graphs)
- Vitest + Testing Library (tests)
- Cloudflare Pages + Workers (deployment)
- PostHog (analytics)

## File Structure
- `src/components/` - Reusable UI components
- `src/pages/` - Page-level components
- `src/contexts/` - React context providers
- `src/hooks/` - Custom React hooks
- `src/lib/` - Utility functions
- `src/types/` - TypeScript type definitions
- `src/test/` - Test files
- `functions/` - Cloudflare Workers API functions
- `db/` - Database schema and migrations
- `data/` - Data files

## Coding Standards

### TypeScript
- Strict mode enabled - no `any` types without justification
- Use interfaces for object shapes, types for unions/intersections
- Prefer `const` assertions and discriminated unions
- Always type function parameters and return values

### React
- Functional components only
- Use custom hooks to extract shared logic
- Prefer composition over prop drilling
- Use Radix UI primitives for accessible interactive elements

### CSS / Tailwind
- Tailwind utility classes as primary styling method
- Use `cn()` helper (clsx + tailwind-merge) for conditional classes
- CSS custom properties for theme values
- No inline styles where Tailwind classes suffice

### Testing
- Vitest for unit and integration tests
- Testing Library for component tests
- Test behavior, not implementation details
- 80%+ coverage target

## Validation
- PostToolUse hook validates TypeScript/JSON/CSS syntax after every edit
- Stop hook runs full build + lint check at session end

## Workflow

### Plan Mode
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately
- Write detailed specs upfront to reduce ambiguity

### Subagent Strategy
- Use subagents to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- One task per subagent for focused execution

### Verification Before Done
- Never mark a task complete without proving it works
- Run `npm run build` to verify no type/build errors
- Run `npm run test:run` to verify tests pass
- Check the dev server when making UI changes

### Autonomous Bug Fixing
- When given a bug report: just fix it
- Point at logs, errors, failing tests -- then resolve them
- Go fix failing CI tests without being told how

## Core Principles
- Simplicity First: Make every change as simple as possible. Minimal code impact.
- No Laziness: Find root causes. No temporary fixes. Senior developer standards.
- Minimal Impact: Only touch what's necessary. No side effects with new bugs.
- Demand Elegance: For non-trivial changes, pause and ask "is there a more elegant way?" Skip for simple, obvious fixes.
