export type UserId = 'user_1' | 'user_2' | 'shared';
export type CurrentUserId = 'user_1' | 'user_2';
export type AccountType = 'SHARED' | 'USER_1' | 'USER_2';
export type SplitType = 'DYNAMIC' | 'EQUAL' | 'PERSONAL';
export type TimeRange = 'THIS_MONTH' | 'LAST_3_MONTHS' | 'LAST_6_MONTHS' | 'LAST_12_MONTHS' | 'THIS_YEAR' | 'ALL_TIME';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JPY' | 'BRL';

export interface User {
  id: UserId;
  name: string;
  avatar: string;
  monthlyIncome: number; // Default base income
  color: string;
}

export interface IncomeEntry {
  id: string;
  monthId: string;
  source: string;
  amount: number;
  recipient: AccountType; // Who received this income
  isRecurring: boolean;
}

export interface ExpenseEntry {
  id: string;
  monthId: string; // e.g., "2024-05"
  categoryId: string;
  amount: number;
  account: AccountType;
  description?: string; // Optional for single entries
  date?: string; // Optional ISO date
  entryType: 'worksheet' | 'single'; // Distinguish between bulk totals and specific items
  tripId?: string[]; // Optional: Links expense to one or more specific trips
  tripCategory?: 'FLIGHT' | 'ACCOMMODATION' | 'FOOD' | 'ACTIVITY' | 'OTHER'; // Specific to travel
  linkedExpenseId?: string; // For deduction/refund entries: the expense this offsets
  updatedAt?: number; // Timestamp for optimistic concurrency
}

// Returned by parse-statement when AI is uncertain about a category mapping
export interface PendingCategoryQuestion {
  transactionDescription: string;
  question: string;
  options: string[]; // category IDs to choose from
}

export interface Category {
  id: string;
  name: string;
  group: 'FIXED' | 'VARIABLE' | 'LIFESTYLE' | 'SAVINGS' | 'TRAVEL';
  defaultAccount: AccountType; 
}

export interface Budget {
  categoryId: string;
  limit: number;
  account: AccountType; // Explicitly link budget to an account for grouping
}

export interface SavingsGoal {
  id: string;
  name: string;
  initialAmount: number; // Starting balance
  targetAmount: number; // If fixed, this is the value. If percentage, this is the % (e.g., 20)
  targetType: 'FIXED' | 'PERCENTAGE';
  projectionPeriod?: 'MONTHLY' | 'ANNUAL';
  account: AccountType;
  startDate?: string; // Optional start date for the goal
  targetDate?: string; // Optional target completion date
}

export interface MonthData {
  id: string; // "2024-05"
  name: string;
  isOpen: boolean;
}

export interface Trip {
    id: string;
    name: string;
    destination: string;
    startDate: string;
    endDate?: string;
    status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
    budget: number;
    account?: AccountType;
}

export interface Suggestion {
    id: string;
    text: string;
    timestamp: number;
}

export interface ChatSession {
    id: string;
    name: string;
    messages: ChatMessage[];
    createdAt: number;
    updatedAt: number;
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    text: string;
    isError?: boolean;
    attachment?: { name: string; type: 'image' | 'pdf' };
    // Structured data stored as JSON strings to keep type simple for persistence
    transactionsJson?: string;
    transactionOwner?: string;
    targetMonth?: string;
    insightsJson?: string;
    receiptDataJson?: string;
}

export interface UserSettings {
    apiKey?: string;
    model?: string;
    provider?: 'google' | 'openai' | 'anthropic';
}

export interface AppInstance {
    id: string;
    name: string;
    created: number;
    lastAccessed: number;
    lastUpdated?: number;
    currency: CurrencyCode;
    theme?: 'light' | 'dark';
    users: Record<string, User>;
    data: {
        entries: ExpenseEntry[];
        categories: Category[];
        budgets: Budget[];
        savings: SavingsGoal[];
        trips: Trip[];
        incomes: IncomeEntry[];
        suggestions?: Suggestion[];
        chatSessions?: ChatSession[];
        userSettings?: Record<string, UserSettings>;
    }
}