import { describe, it, expect } from 'vitest';
import { ExpenseEntry, Trip } from '../types';

// Replicate the fixed trip expense filtering logic
const getTripExpenses = (entries: ExpenseEntry[], tripId: string) =>
  entries.filter(e => e.tripId?.includes(tripId));

const getTripTotal = (entries: ExpenseEntry[], tripId: string) =>
  getTripExpenses(entries, tripId).reduce((sum, e) => sum + e.amount, 0);

const sampleTrip: Trip = {
  id: 'trip-1',
  name: 'Summer Vacation',
  destination: 'Italy',
  startDate: '2025-07-10',
  status: 'ACTIVE',
  budget: 3000,
  account: 'SHARED',
};

const sampleEntries: ExpenseEntry[] = [
  { id: 'e1', monthId: '2025-07', categoryId: 'travel_general', amount: 500, account: 'SHARED', entryType: 'single', tripId: ['trip-1'], tripCategory: 'FLIGHT' },
  { id: 'e2', monthId: '2025-07', categoryId: 'travel_general', amount: 200, account: 'SHARED', entryType: 'single', tripId: ['trip-1'], tripCategory: 'FOOD' },
  { id: 'e3', monthId: '2025-07', categoryId: 'travel_general', amount: 800, account: 'SHARED', entryType: 'single', tripId: ['trip-1'], tripCategory: 'ACCOMMODATION' },
  { id: 'e4', monthId: '2025-07', categoryId: 'travel_general', amount: 100, account: 'USER_1', entryType: 'single', tripId: ['trip-1'], tripCategory: 'ACTIVITY' },
  // Unrelated expense
  { id: 'e5', monthId: '2025-07', categoryId: 'groceries', amount: 300, account: 'SHARED', entryType: 'worksheet' },
  // Another trip
  { id: 'e6', monthId: '2025-07', categoryId: 'travel_general', amount: 400, account: 'SHARED', entryType: 'single', tripId: ['trip-2'], tripCategory: 'FLIGHT' },
];

describe('Trip expense filtering', () => {
  it('filters expenses by tripId using includes', () => {
    const expenses = getTripExpenses(sampleEntries, 'trip-1');
    expect(expenses).toHaveLength(4);
    expect(expenses.every(e => e.tripId?.includes('trip-1'))).toBe(true);
  });

  it('does not include expenses from other trips', () => {
    const expenses = getTripExpenses(sampleEntries, 'trip-1');
    expect(expenses.find(e => e.id === 'e6')).toBeUndefined();
  });

  it('does not include non-trip expenses', () => {
    const expenses = getTripExpenses(sampleEntries, 'trip-1');
    expect(expenses.find(e => e.id === 'e5')).toBeUndefined();
  });

  it('returns empty for non-existent trip', () => {
    const expenses = getTripExpenses(sampleEntries, 'trip-99');
    expect(expenses).toHaveLength(0);
  });
});

describe('Trip total calculation', () => {
  it('calculates correct total', () => {
    const total = getTripTotal(sampleEntries, 'trip-1');
    expect(total).toBe(1600); // 500+200+800+100
  });

  it('returns 0 for trip with no expenses', () => {
    const total = getTripTotal(sampleEntries, 'trip-99');
    expect(total).toBe(0);
  });
});

describe('Trip budget progress', () => {
  it('calculates under budget correctly', () => {
    const total = getTripTotal(sampleEntries, 'trip-1');
    const progress = Math.min((total / sampleTrip.budget) * 100, 100);
    expect(progress).toBeCloseTo(53.33, 1);
    expect(total).toBeLessThan(sampleTrip.budget);
  });

  it('detects over budget', () => {
    const overBudgetTrip = { ...sampleTrip, budget: 1000 };
    const total = getTripTotal(sampleEntries, 'trip-1');
    expect(total).toBeGreaterThan(overBudgetTrip.budget);
  });
});

describe('Trip category breakdown', () => {
  it('calculates per-category totals', () => {
    const expenses = getTripExpenses(sampleEntries, 'trip-1');
    const categories = ['FLIGHT', 'ACCOMMODATION', 'FOOD', 'ACTIVITY'] as const;
    const breakdown: Record<string, number> = {};

    categories.forEach(cat => {
      breakdown[cat] = expenses.filter(e => e.tripCategory === cat).reduce((s, e) => s + e.amount, 0);
    });

    expect(breakdown.FLIGHT).toBe(500);
    expect(breakdown.ACCOMMODATION).toBe(800);
    expect(breakdown.FOOD).toBe(200);
    expect(breakdown.ACTIVITY).toBe(100);
  });
});
