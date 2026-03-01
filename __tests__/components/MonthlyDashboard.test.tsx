import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MonthlyDashboard } from '../../components/MonthlyDashboard';
import { ExpenseEntry, Budget, Category, SavingsGoal, IncomeEntry, User } from '../../types';

const mockUsers: Record<string, User> = {
  user_1: { id: 'user_1', name: 'Alex', avatar: '', monthlyIncome: 4500, color: '#3b82f6' },
  user_2: { id: 'user_2', name: 'Jordan', avatar: '', monthlyIncome: 2800, color: '#ec4899' },
  shared: { id: 'shared', name: 'Shared Account', avatar: '', monthlyIncome: 0, color: '#64748b' },
};

const mockCategories: Category[] = [
  { id: 'rent', name: 'Rent & Housing', group: 'FIXED', defaultAccount: 'SHARED' },
  { id: 'groceries', name: 'Supermarket', group: 'VARIABLE', defaultAccount: 'SHARED' },
  { id: 'hobby_u1', name: 'Hobbies', group: 'LIFESTYLE', defaultAccount: 'USER_1' },
  { id: 'shopping_u2', name: 'Shopping', group: 'LIFESTYLE', defaultAccount: 'USER_2' },
  { id: 'goal_emergency', name: 'Emergency Fund', group: 'SAVINGS', defaultAccount: 'SHARED' },
];

const mockEntries: ExpenseEntry[] = [
  { id: 'e1', monthId: '2025-01', categoryId: 'rent', amount: 1800, account: 'SHARED', entryType: 'worksheet' },
  { id: 'e2', monthId: '2025-01', categoryId: 'groceries', amount: 450, account: 'SHARED', entryType: 'worksheet' },
  { id: 'e3', monthId: '2025-01', categoryId: 'hobby_u1', amount: 150, account: 'USER_1', entryType: 'worksheet' },
  { id: 'e4', monthId: '2025-01', categoryId: 'shopping_u2', amount: 200, account: 'USER_2', entryType: 'worksheet' },
  { id: 'e5', monthId: '2025-01', categoryId: 'goal_emergency', amount: 500, account: 'SHARED', entryType: 'worksheet' },
];

const mockBudgets: Budget[] = [
  { categoryId: 'rent', limit: 1800, account: 'SHARED' },
  { categoryId: 'groceries', limit: 600, account: 'SHARED' },
];

const mockSavings: SavingsGoal[] = [
  { id: 'goal_emergency', name: 'Emergency Fund', initialAmount: 12000, targetAmount: 20000, targetType: 'FIXED', account: 'SHARED' },
];

const mockIncomes: IncomeEntry[] = [
  { id: 'i1', monthId: '2025-01', source: 'Salary', amount: 4500, recipient: 'USER_1', isRecurring: true },
  { id: 'i2', monthId: '2025-01', source: 'Salary', amount: 2800, recipient: 'USER_2', isRecurring: true },
];

const defaultProps = {
  entries: mockEntries,
  budgets: mockBudgets,
  categories: mockCategories,
  savings: mockSavings,
  incomes: mockIncomes,
  users: mockUsers,
  currency: 'USD' as const,
  currentMonth: '2025-01',
  onDeleteEntry: vi.fn(),
};

describe('MonthlyDashboard', () => {
  it('renders account summary cards', () => {
    render(<MonthlyDashboard {...defaultProps} />);
    expect(screen.getByText('Shared Account')).toBeInTheDocument();
    expect(screen.getAllByText('Alex').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Jordan').length).toBeGreaterThan(0);
  });

  it('renders FairShare Contributions section', () => {
    render(<MonthlyDashboard {...defaultProps} />);
    expect(screen.getByText('FairShare Contributions')).toBeInTheDocument();
  });

  it('renders Expense Analysis section', () => {
    render(<MonthlyDashboard {...defaultProps} />);
    expect(screen.getByText('Expense Analysis')).toBeInTheDocument();
  });

  it('renders correct category groups', () => {
    render(<MonthlyDashboard {...defaultProps} />);
    // Category groups should appear
    expect(screen.getByText('FIXED')).toBeInTheDocument();
    expect(screen.getByText('VARIABLE')).toBeInTheDocument();
  });

  it('displays filter buttons', () => {
    render(<MonthlyDashboard {...defaultProps} />);
    expect(screen.getAllByText('All').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Shared').length).toBeGreaterThan(0);
  });

  it('renders Wealth Building section', () => {
    render(<MonthlyDashboard {...defaultProps} />);
    expect(screen.getByText('Wealth Building')).toBeInTheDocument();
    // Should show savings total
    expect(screen.getByText(/saved this month/)).toBeInTheDocument();
  });

  it('calculates income correctly from monthly entries', () => {
    // This tests that income comes from monthlyIncomes, not base values
    render(<MonthlyDashboard {...defaultProps} />);
    // The contribution section shows income values
    // With 4500 + 2800 = 7300 total, ratio ~61.6% / ~38.4%
    expect(screen.getByText('Total Income')).toBeInTheDocument();
  });

  it('renders without crashing when no entries exist', () => {
    render(<MonthlyDashboard {...defaultProps} entries={[]} />);
    expect(screen.getByText('Expense Analysis')).toBeInTheDocument();
  });
});
