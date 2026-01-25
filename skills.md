# Skills.md - Shared Skills for AI Coding Agents

This document contains reusable skills, patterns, and code snippets for AI agents working in the FairShare codebase.

---

## Skill: Create a New React Component

**When to use:** Adding new UI functionality to the application.

**Steps:**
1. Create file in `components/` with PascalCase naming
2. Define props interface
3. Implement functional component with hooks
4. Export as named export

**Template:**
```typescript
import React, { useState } from 'react';
import { ExpenseEntry, User, CurrencyCode } from '../types';
import { formatCurrency } from '../services/financeService';

interface MyComponentProps {
  entries: ExpenseEntry[];
  users: Record<string, User>;
  currency: CurrencyCode;
  onUpdate: (entry: ExpenseEntry) => void;
}

export const MyComponent: React.FC<MyComponentProps> = ({
  entries,
  users,
  currency,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);

  if (!users || !entries) {
    return <div className="p-4 text-slate-400">Loading...</div>;
  }

  return (
    <div className="bg-slate-800 rounded-lg p-4">
      {/* Component content */}
    </div>
  );
};
```

---

## Skill: Add New API Endpoint

**When to use:** Adding backend functionality for data operations.

**Steps:**
1. Add route in `server.js`
2. Add corresponding function in `services/storage.ts`
3. Handle errors appropriately

**Backend Template (server.js):**
```javascript
app.get('/api/myresource/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM mytable WHERE id = ?', [id], (err, row) => {
    if (err) {
      console.error(`GET /api/myresource/${id} error:`, err);
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json(row);
  });
});
```

**Frontend Template (services/storage.ts):**
```typescript
const API_URL = '';

export const getMyResource = async (id: string): Promise<MyResource | null> => {
  const response = await fetch(`${API_URL}/api/myresource/${id}`);
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Backend Error: ${response.statusText}`);
  return await response.json();
};
```

---

## Skill: Add New TypeScript Type

**When to use:** Defining new data structures or constrained values.

**Location:** `types.ts`

**Templates:**
```typescript
// Union type for constrained string values
export type MyStatus = 'pending' | 'active' | 'completed';

// Interface for data structure
export interface MyEntity {
  id: string;
  name: string;
  status: MyStatus;
  amount: number;
  createdAt?: string;  // Optional property
}

// Props interface for components
export interface MyComponentProps {
  items: MyEntity[];
  onSelect: (item: MyEntity) => void;
  isLoading?: boolean;
}
```

---

## Skill: Format Currency Values

**When to use:** Displaying monetary amounts to users.

**Usage:**
```typescript
import { formatCurrency } from './services/financeService';

// In component
const formatted = formatCurrency(1234.56, 'USD'); // "$1,234.56"
const eurFormatted = formatCurrency(1234.56, 'EUR'); // "1.234,56"
```

---

## Skill: Handle Form Submission

**When to use:** Processing user input from forms.

**Template:**
```typescript
const [formData, setFormData] = useState({
  description: '',
  amount: '',
  category: '',
});

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  
  const amount = parseFloat(formData.amount);
  if (isNaN(amount) || amount <= 0) {
    // Handle validation error
    return;
  }

  onSubmit({
    description: formData.description.trim(),
    amount,
    category: formData.category,
  });

  // Reset form
  setFormData({ description: '', amount: '', category: '' });
};
```

---

## Skill: Create Reusable Tailwind Button Styles

**When to use:** Consistent button styling across the app.

**Patterns:**
```typescript
// Primary action button
<button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg transition-colors">
  Save
</button>

// Secondary/Cancel button
<button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors">
  Cancel
</button>

// Danger button
<button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
  Delete
</button>

// Icon button
<button className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
  <IconName className="w-5 h-5" />
</button>
```

---

## Skill: Implement Click-Outside Detection

**When to use:** Closing dropdowns, modals, or menus when clicking outside.

**Template:**
```typescript
import { useRef, useEffect } from 'react';

const [isOpen, setIsOpen] = useState(false);
const menuRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
      setIsOpen(false);
    }
  };

  if (isOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [isOpen]);

return (
  <div ref={menuRef}>
    {/* Menu content */}
  </div>
);
```

---

## Skill: Implement Debounced Auto-Save

**When to use:** Saving data after user stops making changes.

**Template:**
```typescript
import { useRef, useEffect } from 'react';

const timerRef = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }

  timerRef.current = setTimeout(() => {
    saveData(currentData);
  }, 1000); // 1 second delay

  return () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };
}, [currentData]);
```

---

## Skill: Filter Data by Date Range

**When to use:** Displaying entries for specific time periods.

**Template:**
```typescript
const filterByDateRange = (
  entries: ExpenseEntry[],
  startDate: Date,
  endDate: Date
): ExpenseEntry[] => {
  return entries.filter(entry => {
    if (!entry.date) return false;
    try {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    } catch {
      return false;
    }
  });
};
```

---

## Skill: Calculate Income-Based Split

**When to use:** Determining fair expense splits based on income ratio.

**Logic:**
```typescript
const calculateSplit = (
  totalAmount: number,
  user1Income: number,
  user2Income: number
): { user1Share: number; user2Share: number } => {
  const totalIncome = user1Income + user2Income;
  if (totalIncome === 0) {
    return { user1Share: totalAmount / 2, user2Share: totalAmount / 2 };
  }
  
  const user1Ratio = user1Income / totalIncome;
  return {
    user1Share: totalAmount * user1Ratio,
    user2Share: totalAmount * (1 - user1Ratio),
  };
};
```

---

## Skill: Wrap Component with Error Boundary

**When to use:** Preventing crashes from propagating to entire app.

**Usage:**
```typescript
import { ErrorBoundary } from './components/ErrorBoundary';

<ErrorBoundary componentName="MyFeature">
  <MyComponent data={data} />
</ErrorBoundary>
```

---

## Common Lucide Icons Used

```typescript
import {
  Plus,           // Add actions
  Trash2,         // Delete actions
  Edit3,          // Edit actions
  Check,          // Confirm/success
  X,              // Close/cancel
  ChevronDown,    // Expand
  ChevronUp,      // Collapse
  Settings,       // Settings access
  DollarSign,     // Money/finance
  Calendar,       // Date selection
  PieChart,       // Charts/analytics
  Users,          // User-related
  AlertCircle,    // Warnings
} from 'lucide-react';
```
