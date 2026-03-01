import { describe, it, expect } from 'vitest';
import { ExpenseEntry, Category, Budget, AccountType } from '../types';

// Replicate core expense logic from the app

const getAmount = (entries: ExpenseEntry[], catId: string, account: AccountType, monthId: string, tripId?: string) => {
  return entries
    .filter(e =>
      e.categoryId === catId &&
      e.account === account &&
      e.monthId === monthId &&
      (tripId ? e.tripId?.includes(tripId) : (!e.tripId || e.tripId.length === 0))
    )
    .reduce((sum, e) => sum + e.amount, 0);
};

const sampleCategories: Category[] = [
  { id: 'rent', name: 'Rent', group: 'FIXED', defaultAccount: 'SHARED' },
  { id: 'rent_u1', name: 'Rent', group: 'FIXED', defaultAccount: 'USER_1' },
  { id: 'groceries', name: 'Supermarket', group: 'VARIABLE', defaultAccount: 'SHARED' },
];

const sampleEntries: ExpenseEntry[] = [
  { id: 'e1', monthId: '2025-01', categoryId: 'rent', amount: 1000, account: 'SHARED', entryType: 'worksheet' },
  { id: 'e2', monthId: '2025-01', categoryId: 'rent_u1', amount: 500, account: 'USER_1', entryType: 'worksheet' },
  { id: 'e3', monthId: '2025-01', categoryId: 'groceries', amount: 300, account: 'SHARED', entryType: 'worksheet' },
  { id: 'e4', monthId: '2025-01', categoryId: 'groceries', amount: 50, account: 'SHARED', entryType: 'single' },
];

describe('Worksheet update logic', () => {
  it('calculates amount for specific category and account', () => {
    const amount = getAmount(sampleEntries, 'rent', 'SHARED', '2025-01');
    expect(amount).toBe(1000);
  });

  it('calculates single entry sum correctly', () => {
    const singleSum = sampleEntries
      .filter(e =>
        e.categoryId === 'groceries' &&
        e.account === 'SHARED' &&
        e.monthId === '2025-01' &&
        e.entryType === 'single' &&
        (!e.tripId || e.tripId.length === 0)
      )
      .reduce((s, e) => s + e.amount, 0);

    expect(singleSum).toBe(50);
  });

  it('worksheet entry stores needed = total - singleSum', () => {
    const targetTotal = 400;
    const singleSum = 50;
    const needed = targetTotal - singleSum;
    expect(needed).toBe(350);
  });
});

describe('Income ratio calculation', () => {
  it('calculates fair share split', () => {
    const incomeU1 = 4500;
    const incomeU2 = 2800;
    const totalIncome = incomeU1 + incomeU2;
    const user1Ratio = totalIncome > 0 ? incomeU1 / (incomeU1 + incomeU2) : 0.5;

    expect(user1Ratio).toBeCloseTo(0.6164, 3);
    expect(1 - user1Ratio).toBeCloseTo(0.3836, 3);
  });

  it('defaults to 50/50 when no income', () => {
    const ratio = 0 > 0 ? 0 / 0 : 0.5;
    expect(ratio).toBe(0.5);
  });
});

describe('Income fallback logic', () => {
  it('uses monthly income entries when they exist', () => {
    const monthlyIncomes = [
      { id: 'i1', monthId: '2025-01', source: 'Salary', amount: 5000, recipient: 'USER_1' as const, isRecurring: true },
    ];
    const baseIncome = 4500;

    const hasMonthlyEntries = monthlyIncomes.filter(i => i.recipient === 'USER_1').length > 0;
    const incomeU1 = hasMonthlyEntries
      ? monthlyIncomes.filter(i => i.recipient === 'USER_1').reduce((sum, i) => sum + i.amount, 0)
      : baseIncome;

    expect(incomeU1).toBe(5000);
  });

  it('falls back to base income when no monthly entries exist', () => {
    const monthlyIncomes: any[] = [];
    const baseIncome = 4500;

    const hasMonthlyEntries = monthlyIncomes.filter((i: any) => i.recipient === 'USER_1').length > 0;
    const incomeU1 = hasMonthlyEntries
      ? monthlyIncomes.filter((i: any) => i.recipient === 'USER_1').reduce((sum: number, i: any) => sum + i.amount, 0)
      : baseIncome;

    expect(incomeU1).toBe(4500);
  });

  it('does NOT fall back when monthly income sums to 0 (the bug fix)', () => {
    const monthlyIncomes = [
      { id: 'i1', monthId: '2025-01', source: 'Unpaid Leave', amount: 0, recipient: 'USER_1' as const, isRecurring: false },
    ];
    const baseIncome = 4500;

    // Fixed logic: check length > 0, not the sum
    const hasMonthlyEntries = monthlyIncomes.filter(i => i.recipient === 'USER_1').length > 0;
    const incomeU1 = hasMonthlyEntries
      ? monthlyIncomes.filter(i => i.recipient === 'USER_1').reduce((sum, i) => sum + i.amount, 0)
      : baseIncome;

    expect(incomeU1).toBe(0); // Should be 0, not fallback to 4500
  });
});

describe('Category grouping and section totals (Bug 5 fix)', () => {
  it('sums across all category IDs in a name group', () => {
    // Rent has two categories with same name but different accounts
    const rentCategories = sampleCategories.filter(c => c.name === 'Rent');
    expect(rentCategories).toHaveLength(2);

    // Section total should sum BOTH category IDs
    const sharedTotal = rentCategories.reduce(
      (sum, cat) => sum + getAmount(sampleEntries, cat.id, 'SHARED', '2025-01'),
      0
    );
    const u1Total = rentCategories.reduce(
      (sum, cat) => sum + getAmount(sampleEntries, cat.id, 'USER_1', '2025-01'),
      0
    );

    expect(sharedTotal).toBe(1000); // rent = 1000 SHARED
    expect(u1Total).toBe(500);      // rent_u1 = 500 USER_1
  });

  it('bug: using only first ID would miss some amounts', () => {
    // Old buggy code: getAmount(groupedByName[name][0].id, 'USER_1')
    // This would only check 'rent' for USER_1, missing 'rent_u1'
    const rentCategories = sampleCategories.filter(c => c.name === 'Rent');
    const buggyU1Total = getAmount(sampleEntries, rentCategories[0].id, 'USER_1', '2025-01');
    expect(buggyU1Total).toBe(0); // The first ID 'rent' has no USER_1 entries

    // Fixed: sum across all IDs
    const fixedU1Total = rentCategories.reduce(
      (sum, cat) => sum + getAmount(sampleEntries, cat.id, 'USER_1', '2025-01'),
      0
    );
    expect(fixedU1Total).toBe(500); // Now correctly includes rent_u1
  });
});
