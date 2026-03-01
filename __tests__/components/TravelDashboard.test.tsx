import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TravelDashboard } from '../../components/TravelDashboard';
import { Trip, ExpenseEntry, User, Category } from '../../types';

const mockUsers: Record<string, User> = {
  user_1: { id: 'user_1', name: 'Alex', avatar: '', monthlyIncome: 4500, color: '#3b82f6' },
  user_2: { id: 'user_2', name: 'Jordan', avatar: '', monthlyIncome: 2800, color: '#ec4899' },
  shared: { id: 'shared', name: 'Shared', avatar: '', monthlyIncome: 0, color: '#64748b' },
};

const mockCategories: Category[] = [
  { id: 'travel_general', name: 'Travel & Trips', group: 'TRAVEL', defaultAccount: 'SHARED' },
];

const mockTrips: Trip[] = [
  { id: 't1', name: 'Summer Vacation', destination: 'Italy', startDate: '2025-07-10', status: 'PLANNED', budget: 5000, account: 'SHARED' },
  { id: 't2', name: 'Weekend Getaway', destination: 'Mountains', startDate: '2025-02-15', endDate: '2025-02-17', status: 'COMPLETED', budget: 1200 },
];

const mockEntries: ExpenseEntry[] = [
  { id: 'e1', monthId: '2025-02', categoryId: 'travel_general', amount: 450, account: 'SHARED', entryType: 'single', tripId: ['t2'], tripCategory: 'ACCOMMODATION' },
  { id: 'e2', monthId: '2025-02', categoryId: 'travel_general', amount: 120, account: 'SHARED', entryType: 'single', tripId: ['t2'], tripCategory: 'FLIGHT' },
];

const defaultProps = {
  trips: mockTrips,
  entries: mockEntries,
  categories: mockCategories,
  currency: 'USD' as const,
  users: mockUsers,
  onAddTrip: vi.fn(),
  onUpdateTrip: vi.fn(),
  onDeleteTrip: vi.fn(),
  onAddEntry: vi.fn(),
  onNavigateToMonth: vi.fn(),
};

describe('TravelDashboard', () => {
  it('renders trip cards', () => {
    render(<TravelDashboard {...defaultProps} />);
    expect(screen.getByText('Summer Vacation')).toBeInTheDocument();
    expect(screen.getByText('Weekend Getaway')).toBeInTheDocument();
  });

  it('shows correct trip status badges', () => {
    render(<TravelDashboard {...defaultProps} />);
    expect(screen.getByText('PLANNED')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('displays expense totals correctly for linked trip', () => {
    render(<TravelDashboard {...defaultProps} />);
    // Weekend Getaway should show $570 total (450+120)
    expect(screen.getByText(/570/)).toBeInTheDocument();
  });

  it('shows "No expenses recorded yet" for trips without expenses', () => {
    render(<TravelDashboard {...defaultProps} />);
    expect(screen.getByText('No expenses recorded yet.')).toBeInTheDocument();
  });

  it('opens trip form when Plan New Trip is clicked', async () => {
    render(<TravelDashboard {...defaultProps} />);
    const button = screen.getByText(/Plan New Trip/);
    await userEvent.click(button);
    expect(screen.getByText('New Adventure')).toBeInTheDocument();
  });

  it('shows inline expense form when Add Expense is clicked', async () => {
    render(<TravelDashboard {...defaultProps} />);
    const addButtons = screen.getAllByTitle('Add Expense');
    await userEvent.click(addButtons[0]);
    expect(screen.getByText('Add Expense', { selector: 'h4' })).toBeInTheDocument();
  });

  it('calls onAddEntry when expense form is submitted', async () => {
    const onAddEntry = vi.fn();
    render(<TravelDashboard {...defaultProps} onAddEntry={onAddEntry} />);

    // Open expense form for first trip
    const addButtons = screen.getAllByTitle('Add Expense');
    await userEvent.click(addButtons[0]);

    // Fill amount
    const amountInput = screen.getByPlaceholderText('0.00');
    await userEvent.type(amountInput, '250');

    // Submit
    const saveButton = screen.getByText('Save Expense');
    await userEvent.click(saveButton);

    expect(onAddEntry).toHaveBeenCalledOnce();
    expect(onAddEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 250,
        tripId: ['t1'],
        entryType: 'single',
      })
    );
  });

  it('calls onDeleteTrip when delete is confirmed', async () => {
    const onDeleteTrip = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TravelDashboard {...defaultProps} onDeleteTrip={onDeleteTrip} />);

    const deleteButtons = screen.getAllByTitle('Delete Trip');
    await userEvent.click(deleteButtons[0]);

    expect(onDeleteTrip).toHaveBeenCalledWith('t1');
    vi.restoreAllMocks();
  });

  it('does not delete trip when confirm is cancelled', async () => {
    const onDeleteTrip = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<TravelDashboard {...defaultProps} onDeleteTrip={onDeleteTrip} />);

    const deleteButtons = screen.getAllByTitle('Delete Trip');
    await userEvent.click(deleteButtons[0]);

    expect(onDeleteTrip).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('calls onNavigateToMonth when Monthly button is clicked', async () => {
    const onNavigateToMonth = vi.fn();
    render(<TravelDashboard {...defaultProps} onNavigateToMonth={onNavigateToMonth} />);

    const monthlyButtons = screen.getAllByTitle('View in Monthly Breakdown');
    await userEvent.click(monthlyButtons[0]);

    expect(onNavigateToMonth).toHaveBeenCalledWith('2025-07');
  });

  it('validates expense form requires amount', async () => {
    const onAddEntry = vi.fn();
    render(<TravelDashboard {...defaultProps} onAddEntry={onAddEntry} />);

    const addButtons = screen.getAllByTitle('Add Expense');
    await userEvent.click(addButtons[0]);

    // Try to save without amount
    const saveButton = screen.getByText('Save Expense');
    expect(saveButton).toBeDisabled();

    expect(onAddEntry).not.toHaveBeenCalled();
  });
});
