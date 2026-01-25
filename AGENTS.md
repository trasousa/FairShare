# AGENTS.md - FairShare Codebase Guidelines

This document provides guidelines for AI coding agents working in the FairShare codebase.

## Project Overview

FairShare is a privacy-focused, self-hosted finance tracker for couples. It tracks shared and personal expenses with income-based splitting.

**Tech Stack:**
- Frontend: TypeScript + React 18 + Vite 7
- Backend: Node.js + Express.js (JavaScript)
- Database: SQLite3
- Styling: Tailwind CSS (via CDN)
- Charts: Recharts

## Build/Lint/Test Commands

```bash
# Install dependencies
npm install

# Development (frontend + backend concurrently)
npm run dev

# Frontend only (Vite dev server on port 5173)
npm run client

# Backend only (Express server on port 3000)
npm run server

# Production build
npm run build

# Start production server
npm start
```

### Docker Commands

```bash
# Build image
docker build -t fairshare .

# Run container
docker run -d -p 3000:3000 -v $(pwd)/data:/app/data --name fairshare-app fairshare

# Docker Compose
docker-compose up -d
```

### Testing

**No test framework is currently configured.** When adding tests:
- Consider Vitest for frontend (already using Vite)
- Run single test: `npx vitest run path/to/test.spec.ts`
- Run tests in watch mode: `npx vitest`

### Linting

**No linter is currently configured.** If adding ESLint:
- Run: `npx eslint src/`
- Fix: `npx eslint src/ --fix`

## Code Style Guidelines

### File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.tsx | `BudgetManager.tsx` |
| Services/Utils | camelCase.ts | `financeService.ts` |
| Types | lowercase.ts | `types.ts` |
| Config files | lowercase | `vite.config.ts` |

### Import Order

```typescript
// 1. React imports
import React, { useState, useMemo, useEffect } from 'react';

// 2. Third-party libraries
import { IconName } from 'lucide-react';
import { BarChart, Bar } from 'recharts';

// 3. Local types
import { ExpenseEntry, User, CurrencyCode } from './types';

// 4. Local components
import { ComponentName } from './components/ComponentName';

// 5. Local services/utilities
import { formatCurrency } from './services/financeService';

// 6. Constants
import { USERS, INITIAL_CATEGORIES } from './constants';
```

### Naming Conventions

**Functions:**
- Components: `PascalCase` - `BudgetManager`, `SingleEntryForm`
- Event handlers: `handle*` - `handleSubmit`, `handleBudgetSubmit`
- Render helpers: `render*` - `renderBudgetGroup`, `renderGoalCard`
- Utility functions: `camelCase` - `formatCurrency`, `getMonthLabel`
- API functions: verb prefix - `getInstance`, `saveInstance`, `deleteInstance`

**Variables:**
- State: `camelCase` - `activeTab`, `isLoading`, `currentMonth`
- Constants: `SCREAMING_SNAKE_CASE` - `USERS`, `API_URL`, `COLORS`
- Booleans: `is*` prefix - `isAdding`, `isMonthPickerOpen`
- Refs: `*Ref` suffix - `triggerRef`, `timerRef`

**Types/Interfaces:**
- Type aliases: `PascalCase` - `UserId`, `AccountType`, `SplitType`
- Interfaces: `PascalCase` - `User`, `ExpenseEntry`, `Budget`
- Props: `*Props` suffix - `BudgetManagerProps`, `SingleEntryFormProps`

### TypeScript Patterns

**Type definitions in `types.ts`:**
```typescript
// Union types for constrained values
export type UserId = 'user_1' | 'user_2' | 'shared';
export type AccountType = 'SHARED' | 'USER_1' | 'USER_2';

// Interfaces for data structures
export interface ExpenseEntry {
  id: string;
  monthId: string;
  description?: string;  // Optional properties use ?
}
```

**Component typing:**
```typescript
interface ComponentProps {
  entries: ExpenseEntry[];
  users: Record<string, User>;
  onAddEntry: (entry: Omit<ExpenseEntry, 'id'>) => void;
}

export const Component: React.FC<ComponentProps> = ({ entries, users }) => {
  const [items, setItems] = useState<ExpenseEntry[]>([]);
  // ...
  };
```

**Common utility types:**
- `Record<string, T>` - for object maps
- `Omit<T, 'key'>` - exclude properties
- `Partial<T>` - optional updates

### Error Handling

**React Error Boundary:**
```typescript
<ErrorBoundary componentName="ComponentName">
  {/* Wrap critical components */}
</ErrorBoundary>
```

**Async/API errors:**
```typescript
const response = await fetch(url);
if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`);
```

**Null/undefined guards:**
```typescript
if (!users || !users.user_1) {
  return <div>Loading...</div>;
}
const income = users?.user_1?.monthlyIncome || 0;
```

### Formatting

- **Indentation:** 2 spaces
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Line length:** ~100 characters preferred

## Project Structure

```
FairShare/
├── App.tsx                 # Main application component (state management)
├── index.tsx               # React entry point
├── types.ts                # Centralized TypeScript types
├── constants.ts            # Initial data and constants
├── server.js               # Express backend (JavaScript)
├── components/             # React components (functional with hooks)
├── services/               # API and utility services
│   ├── financeService.ts   # Finance calculations
│   └── storage.ts          # API abstraction layer
├── data/                   # SQLite database
└── dist/                   # Build output
```

## Architecture Notes

1. **State Management:** All state in root App component, passed via props
2. **Auto-save:** Debounced save (1 second delay) on state changes
3. **API Layer:** All fetch calls abstracted in `services/storage.ts`
4. **Styling:** Tailwind utility classes only (no CSS files)
5. **Components:** Functional with hooks (except ErrorBoundary class)

## Common Tasks

**Adding a new component:**
1. Create `components/ComponentName.tsx`
2. Define `ComponentNameProps` interface
3. Export as named export: `export const ComponentName: React.FC<Props>`
4. Import types from `../types`

**Adding a new API endpoint:**
1. Add route in `server.js`
2. Add corresponding function in `services/storage.ts`
3. Handle errors with try-catch and proper HTTP status codes

**Adding a new type:**
1. Add to `types.ts`
2. Export and import where needed

---

## Agent Skill: Code Simplifier

**Role:** Expert code simplification specialist.
**Goal:** Enhance code clarity, consistency, and maintainability while preserving exact functionality.

**Refinement Guidelines:**

1. **Preserve Functionality**: Never change what the code does - only how it does it.
2. **Apply Project Standards**:
    - Use ES modules.
    - **Prefer `export const Name: React.FC<Props> = ...` for components** (matches project convention).
    - Use explicit return type annotations for top-level functions.
    - Use proper error handling patterns.
3. **Enhance Clarity**:
    - Reduce unnecessary complexity and nesting.
    - Eliminate redundant code.
    - **Avoid nested ternary operators** - prefer switch or if/else.
    - Choose clarity over brevity.
4. **Maintain Balance**:
    - Avoid over-simplification that reduces readability.
    - Do not prioritize "fewer lines" if it obscures logic.

**Process:**
1. Identify recently modified code.
2. Analyze for elegance and consistency.
3. Apply changes (formatting, naming, structure) without altering behavior.
4. Verify simplification.
