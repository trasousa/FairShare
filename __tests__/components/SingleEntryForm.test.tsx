import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SingleEntryForm } from '../../components/SingleEntryForm';
import { Category, Trip, User } from '../../types';

const mockUsers: Record<string, User> = {
  user_1: { id: 'user_1', name: 'Alex', avatar: '', monthlyIncome: 4500, color: '#3b82f6' },
  user_2: { id: 'user_2', name: 'Jordan', avatar: '', monthlyIncome: 2800, color: '#ec4899' },
  shared: { id: 'shared', name: 'Shared', avatar: '', monthlyIncome: 0, color: '#64748b' },
};

const mockCategories: Category[] = [
  { id: 'groceries', name: 'Supermarket', group: 'VARIABLE', defaultAccount: 'SHARED' },
  { id: 'travel_general', name: 'Travel & Trips', group: 'TRAVEL', defaultAccount: 'SHARED' },
  { id: 'hobby', name: 'Hobbies', group: 'LIFESTYLE', defaultAccount: 'USER_1' },
];

const mockTrips: Trip[] = [
  { id: 't1', name: 'Summer Vacation', destination: 'Italy', startDate: '2025-07-10', status: 'ACTIVE', budget: 5000 },
];

const defaultProps = {
  categories: mockCategories,
  trips: mockTrips,
  currentMonth: '2025-01',
  users: mockUsers,
  currency: 'USD' as const,
  theme: 'light' as const,
  currentUser: 'user_1' as const,
  getInputClass: () => 'w-full border rounded-lg p-2.5',
  onAddEntry: vi.fn(),
};

describe('SingleEntryForm', () => {
  it('renders form fields', () => {
    render(<SingleEntryForm {...defaultProps} />);
    expect(screen.getByText('Add Expense')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. Dinner at Mario's")).toBeInTheDocument();
  });

  it('submits with valid data', async () => {
    const onAddEntry = vi.fn();
    render(<SingleEntryForm {...defaultProps} onAddEntry={onAddEntry} />);

    await userEvent.type(screen.getByPlaceholderText('0.00'), '50');
    await userEvent.type(screen.getByPlaceholderText("e.g. Dinner at Mario's"), 'Test expense');

    const submitButton = screen.getByText('Add Expense');
    await userEvent.click(submitButton);

    expect(onAddEntry).toHaveBeenCalledOnce();
    expect(onAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50,
        description: 'Test expense',
        entryType: 'single',
        categoryId: 'groceries',
      })
    );
  });

  it('shows trip selection when travel category is selected', async () => {
    render(<SingleEntryForm {...defaultProps} />);

    // Select travel category
    const categorySelect = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(categorySelect, 'travel_general');

    expect(screen.getByText('Trip Details')).toBeInTheDocument();
    expect(screen.getByText('Summer Vacation')).toBeInTheDocument();
  });

  it('requires trip selection for travel expenses', async () => {
    const onAddEntry = vi.fn();
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<SingleEntryForm {...defaultProps} onAddEntry={onAddEntry} />);

    // Select travel category
    const categorySelect = screen.getAllByRole('combobox')[0];
    await userEvent.selectOptions(categorySelect, 'travel_general');

    // Fill amount and description
    await userEvent.type(screen.getByPlaceholderText('0.00'), '100');
    await userEvent.type(screen.getByPlaceholderText("e.g. Dinner at Mario's"), 'Flight');

    // Try to submit without selecting a trip
    await userEvent.click(screen.getByText('Add Expense'));

    expect(window.alert).toHaveBeenCalledWith('Please select at least one Trip for this travel expense.');
    expect(onAddEntry).not.toHaveBeenCalled();

    vi.restoreAllMocks();
  });
});
