# React UI Stack Skill

## Overview

Production-grade React frontend development with TypeScript, modern patterns, and component-driven architecture.

---

## Tech Stack

- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite (preferred) or Next.js for SSR/SSG
- **State Management**: Zustand (lightweight) or Redux Toolkit (complex apps)
- **Styling**: Tailwind CSS + shadcn/ui component primitives
- **Routing**: React Router v6+ or file-based (Next.js)
- **Data Fetching**: TanStack Query (React Query) v5
- **Forms**: React Hook Form + Zod validation
- **Testing**: Vitest + React Testing Library + Playwright (E2E)

---

## Project Structure

```
src/
  components/
    ui/              # Atomic design system components (Button, Input, Card...)
    layout/          # Layout shells, headers, sidebars, footers
    features/        # Feature-specific components grouped by domain
  hooks/             # Custom hooks (useAuth, useDebounce, useApi...)
  lib/
    api/             # API client wrappers, axios/fetch instances
    utils/           # Pure utility functions
    constants/       # App-wide constants
  stores/            # Zustand stores or Redux slices
  types/             # Shared TypeScript types/interfaces
  pages/             # Route-level components (if not file-based routing)
  styles/            # Global styles, Tailwind config extensions
```

---

## Coding Conventions

### Components

- Use **function components** exclusively. No class components.
- One component per file. File name matches component name in **PascalCase**.
- Co-locate related files: `Button.tsx`, `Button.test.tsx`, `Button.stories.tsx`
- Props defined as **interface**, not type alias.
- Destructure props in function signature.

```tsx
interface UserCardProps {
  user: User;
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

export function UserCard({ user, onSelect, isLoading = false }: UserCardProps) {
  // implementation
}
```

### Hooks

- Prefix all custom hooks with `use`.
- Keep hooks focused: one hook = one concern.
- Use `useCallback` and `useMemo` only when profiling shows a need.

### State

- **Local state**: `useState` for component-scoped state.
- **Shared state**: Zustand stores for cross-component state.
- **Server state**: TanStack Query for all API data (never store API data in global state).
- **URL state**: Use search params for filter/sort/page state.

### Styling

- Tailwind utility classes directly in JSX.
- Extract repeated patterns into components, not `@apply`.
- Use `cn()` helper (from `clsx` + `tailwind-merge`) for conditional classes.
- No inline `style` props unless dynamically computed values.

### Forms

- React Hook Form for all forms.
- Zod schemas for validation (shared with backend when possible).
- Use ` Controller` for complex inputs (date pickers, rich text).

```tsx
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

const form = useForm<FormValues>({
  resolver: zodResolver(schema),
});
```

### API Integration

- Centralized API client in `lib/api/`.
- TanStack Query for GET requests, mutations for POST/PUT/DELETE.
- Error boundaries for unhandled errors.
- Optimistic updates where appropriate.

```tsx
// lib/api/client.ts
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// hooks/useUsers.ts
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<User[]>('/users').then((r) => r.data),
  });
}
```

---

## Testing Strategy

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | Vitest | Utilities, hooks, pure logic |
| Component | React Testing Library | Render + interaction tests |
| Integration | React Testing Library | Multi-component flows |
| E2E | Playwright | Critical user journeys |

- Test behavior, not implementation.
- Use `screen` queries (getByRole, getByLabelText) over getByTestId.
- Mock API calls at the network layer (MSW).

---

## Performance Patterns

- Lazy load routes with `React.lazy` + `Suspense`.
- Virtualize long lists (`@tanstack/react-virtual`).
- Image optimization: lazy loading, responsive `srcset`.
- Code split at route level; dynamic imports for heavy features.
- Memoize expensive computations only after profiling.

---

## Accessibility

- Semantic HTML first (`<button>`, `<nav>`, `<main>`, `<article>`).
- ARIA attributes only when semantic HTML is insufficient.
- Keyboard navigation for all interactive elements.
- Focus management on route changes and modals.
- Color contrast meets WCAG 2.1 AA.

---

## Environment & Config

- `.env.local` for local secrets (gitignored).
- `VITE_` prefix for client-exposed variables.
- Never expose server secrets in client bundle.
- Type-safe env via `import.meta.env` with validation on startup.
