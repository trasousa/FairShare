import { User, Category, Budget, SavingsGoal, ExpenseEntry, Trip, IncomeEntry } from './types';

export const USERS: Record<string, User> = {
  user_1: {
    id: 'user_1',
    name: 'Alex',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    monthlyIncome: 4500,
    color: '#3b82f6', // blue-500
  },
  user_2: {
    id: 'user_2',
    name: 'Jordan',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    monthlyIncome: 2800,
    color: '#ec4899', // pink-500
  }
};

export const INITIAL_CATEGORIES: Category[] = [
  // Fixed / Shared
  { id: 'rent', name: 'Rent & Housing', group: 'FIXED', defaultAccount: 'SHARED' },
  { id: 'utilities', name: 'Utilities & Internet', group: 'FIXED', defaultAccount: 'SHARED' },
  { id: 'insurance', name: 'Insurance', group: 'FIXED', defaultAccount: 'SHARED' },
  
  // Variable / Shared
  { id: 'groceries', name: 'Supermarket', group: 'VARIABLE', defaultAccount: 'SHARED' },
  { id: 'dining_shared', name: 'Dining Out (Together)', group: 'VARIABLE', defaultAccount: 'SHARED' },
  { id: 'household', name: 'Household Items', group: 'VARIABLE', defaultAccount: 'SHARED' },
  { id: 'transport_shared', name: 'Car/Transport (Shared)', group: 'VARIABLE', defaultAccount: 'SHARED' },
  
  // Travel
  { id: 'travel_general', name: 'Travel & Trips', group: 'TRAVEL', defaultAccount: 'SHARED' },

  // Savings (Linked to Goals)
  { id: 'goal_emergency', name: 'Emergency Fund', group: 'SAVINGS', defaultAccount: 'SHARED' },
  { id: 'goal_laptop', name: 'New Laptop', group: 'SAVINGS', defaultAccount: 'USER_1' },
  { id: 'goal_invest', name: 'ETF Portfolio', group: 'SAVINGS', defaultAccount: 'SHARED' },

  // Personal User 1
  { id: 'personal_u1_transport', name: 'Commute/Gas', group: 'VARIABLE', defaultAccount: 'USER_1' },
  { id: 'personal_u1_lunch', name: 'Work Lunch', group: 'VARIABLE', defaultAccount: 'USER_1' },
  { id: 'personal_u1_hobby', name: 'Hobbies & Sports', group: 'LIFESTYLE', defaultAccount: 'USER_1' },
  
  // Personal User 2
  { id: 'personal_u2_transport', name: 'Commute/Gas', group: 'VARIABLE', defaultAccount: 'USER_2' },
  { id: 'personal_u2_shopping', name: 'Shopping & Clothes', group: 'LIFESTYLE', defaultAccount: 'USER_2' },
  { id: 'personal_u2_wellness', name: 'Beauty & Wellness', group: 'LIFESTYLE', defaultAccount: 'USER_2' },
];

export const INITIAL_BUDGETS: Budget[] = [
  { categoryId: 'rent', limit: 1800, account: 'SHARED' },
  { categoryId: 'utilities', limit: 200, account: 'SHARED' },
  { categoryId: 'groceries', limit: 600, account: 'SHARED' },
  { categoryId: 'dining_shared', limit: 400, account: 'SHARED' },
  { categoryId: 'personal_u1_hobby', limit: 300, account: 'USER_1' },
  { categoryId: 'personal_u2_shopping', limit: 300, account: 'USER_2' },
];

export const INITIAL_SAVINGS: SavingsGoal[] = [
  { id: 'goal_emergency', name: 'Emergency Fund', initialAmount: 12000, targetAmount: 20000, targetType: 'FIXED', account: 'SHARED' },
  { id: 'goal_laptop', name: 'New Laptop', initialAmount: 1200, targetAmount: 2500, targetType: 'FIXED', account: 'USER_1' },
  { id: 'goal_invest', name: 'ETF Portfolio', initialAmount: 5000, targetAmount: 15, targetType: 'PERCENTAGE', account: 'SHARED' }, // 15% goal
];

export const INITIAL_TRIPS: Trip[] = [
    { id: 't1', name: 'Summer Vacation', destination: 'Italy', startDate: '2025-07-10', status: 'PLANNED', budget: 5000 },
    { id: 't2', name: 'Weekend Getaway', destination: 'Mountains', startDate: '2024-06-15', endDate: '2024-06-17', status: 'COMPLETED', budget: 1200 }
];

const generateIncome = (): IncomeEntry[] => {
    const incomes: IncomeEntry[] = [];
    const today = new Date();
    // Generate for last 6 months
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        
        // Base Salaries
        incomes.push({ id: `inc-u1-${monthId}`, monthId, source: 'Salary (Alex)', amount: 4500, recipient: 'USER_1', isRecurring: true });
        incomes.push({ id: `inc-u2-${monthId}`, monthId, source: 'Salary (Jordan)', amount: 2800, recipient: 'USER_2', isRecurring: true });

        // Random Bonus
        if (i === 2) {
            incomes.push({ id: `inc-bonus-${monthId}`, monthId, source: 'Performance Bonus', amount: 1200, recipient: 'USER_1', isRecurring: false });
        }
    }
    return incomes;
};

export const INITIAL_INCOMES: IncomeEntry[] = generateIncome();

// Helper to generate history relative to TODAY so dashboard always has data
const generateHistory = (): ExpenseEntry[] => {
  const history: ExpenseEntry[] = [];
  const today = new Date();
  
  // Generate data for the last 6 months
  for (let i = 6; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthId = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      
      // Rent
      history.push({ id: `rent-${monthId}`, monthId, categoryId: 'rent', amount: 1800, account: 'SHARED', entryType: 'worksheet' });
      // Groceries
      history.push({ id: `groc-${monthId}`, monthId, categoryId: 'groceries', amount: 450 + (Math.random() * 100 - 50), account: 'SHARED', entryType: 'worksheet' });
      // Dining
      history.push({ id: `dine-${monthId}`, monthId, categoryId: 'dining_shared', amount: 200 + (Math.random() * 100), account: 'SHARED', entryType: 'worksheet' });
      // Personal
      history.push({ id: `u1-${monthId}`, monthId, categoryId: 'personal_u1_hobby', amount: 100 + (Math.random() * 100), account: 'USER_1', entryType: 'worksheet' });
      history.push({ id: `u2-${monthId}`, monthId, categoryId: 'personal_u2_shopping', amount: 200 + (Math.random() * 150), account: 'USER_2', entryType: 'worksheet' });
      
      // Savings Contributions
      history.push({ id: `save1-${monthId}`, monthId, categoryId: 'goal_emergency', amount: 500, account: 'SHARED', entryType: 'worksheet' });
      history.push({ id: `save2-${monthId}`, monthId, categoryId: 'goal_laptop', amount: 200, account: 'USER_1', entryType: 'worksheet' });
      
      // Investment
      history.push({ id: `inv-${monthId}`, monthId, categoryId: 'goal_invest', amount: 900, account: 'SHARED', entryType: 'worksheet' });
  }

  // Add a specific travel expense in the past
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const lastMonthId = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
  
  history.push({
      id: 'travel-exp-1',
      monthId: lastMonthId,
      categoryId: 'travel_general',
      amount: 450,
      account: 'SHARED',
      description: 'Hotel Booking',
      entryType: 'single',
      tripId: 't2',
      tripCategory: 'ACCOMMODATION'
  });

  return history;
};

export const INITIAL_ENTRIES: ExpenseEntry[] = generateHistory();