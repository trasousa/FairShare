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
    { id: 't2', name: 'Weekend Getaway', destination: 'Mountains', startDate: '2025-02-15', endDate: '2025-02-17', status: 'COMPLETED', budget: 1200 }
];

// Helper to generate months from Jan 2025 to Jan 2026
const getTargetMonths = () => {
    const months: string[] = [];
    const startYear = 2025;
    const endYear = 2026;

    // 2025 Full Year
    for (let m = 1; m <= 12; m++) {
        months.push(`${startYear}-${String(m).padStart(2, '0')}`);
    }
    // Jan 2026
    months.push(`${endYear}-01`);
    
    return months;
};

const generateIncome = (): IncomeEntry[] => {
    const incomes: IncomeEntry[] = [];
    const months = getTargetMonths();

    months.forEach(monthId => {
        // Base Salaries
        incomes.push({ id: `inc-u1-${monthId}`, monthId, source: 'Salary (Alex)', amount: 4500, recipient: 'USER_1', isRecurring: true });
        incomes.push({ id: `inc-u2-${monthId}`, monthId, source: 'Salary (Jordan)', amount: 2800, recipient: 'USER_2', isRecurring: true });

        // Quarterly Bonuses (Mar, Jun, Sep, Dec)
        if (monthId.endsWith('-03') || monthId.endsWith('-06') || monthId.endsWith('-09') || monthId.endsWith('-12')) {
            incomes.push({ id: `inc-bonus-${monthId}`, monthId, source: 'Quarterly Bonus', amount: 1200 + (Math.random() * 500), recipient: 'USER_1', isRecurring: false });
        }
    });
    return incomes;
};

export const INITIAL_INCOMES: IncomeEntry[] = generateIncome();

const generateHistory = (): ExpenseEntry[] => {
  const history: ExpenseEntry[] = [];
  const months = getTargetMonths();
  
  months.forEach(monthId => {
      // Rent
      history.push({ id: `rent-${monthId}`, monthId, categoryId: 'rent', amount: 1800, account: 'SHARED', entryType: 'worksheet' });
      // Groceries (Randomized)
      history.push({ id: `groc-${monthId}`, monthId, categoryId: 'groceries', amount: 450 + (Math.random() * 100 - 50), account: 'SHARED', entryType: 'worksheet' });
      // Dining (Randomized)
      history.push({ id: `dine-${monthId}`, monthId, categoryId: 'dining_shared', amount: 200 + (Math.random() * 100), account: 'SHARED', entryType: 'worksheet' });
      // Personal
      history.push({ id: `u1-${monthId}`, monthId, categoryId: 'personal_u1_hobby', amount: 100 + (Math.random() * 100), account: 'USER_1', entryType: 'worksheet' });
      history.push({ id: `u2-${monthId}`, monthId, categoryId: 'personal_u2_shopping', amount: 200 + (Math.random() * 150), account: 'USER_2', entryType: 'worksheet' });
      
      // Savings Contributions
      history.push({ id: `save1-${monthId}`, monthId, categoryId: 'goal_emergency', amount: 500, account: 'SHARED', entryType: 'worksheet' });
      history.push({ id: `save2-${monthId}`, monthId, categoryId: 'goal_laptop', amount: 200, account: 'USER_1', entryType: 'worksheet' });
      
      // Investment
      history.push({ id: `inv-${monthId}`, monthId, categoryId: 'goal_invest', amount: 900, account: 'SHARED', entryType: 'worksheet' });
  });

  // Add specific travel expenses for the "Weekend Getaway" in Feb 2025
  history.push({
      id: 'travel-exp-1',
      monthId: '2025-02',
      categoryId: 'travel_general',
      amount: 450,
      account: 'SHARED',
      description: 'Mountain Cabin',
      entryType: 'single',
      tripId: 't2',
      tripCategory: 'ACCOMMODATION'
  });
  
  history.push({
      id: 'travel-exp-2',
      monthId: '2025-02',
      categoryId: 'travel_general',
      amount: 120,
      account: 'SHARED',
      description: 'Gas & Tolls',
      entryType: 'single',
      tripId: 't2',
      tripCategory: 'FLIGHT' // Using FLIGHT map for transport
  });

  return history;
};

export const INITIAL_ENTRIES: ExpenseEntry[] = generateHistory();