import React, { useState, useMemo } from 'react';
import { Trip, ExpenseEntry, CurrencyCode, User, AccountType, Category } from '../types';
import { formatCurrency } from '../services/financeService';
import { generateId } from '../services/utils';
import { Plane, MapPin, Plus, Calendar, AlertCircle, Edit2, Layers, ChevronDown, ChevronUp, Trash2, PieChart } from 'lucide-react';

interface TravelDashboardProps {
  trips: Trip[];
  entries: ExpenseEntry[];
  categories: Category[];
  currency: CurrencyCode;
  users: Record<string, User>;
  onAddTrip: (trip: Omit<Trip, 'id'>) => void;
  onUpdateTrip: (trip: Trip) => void;
  onDeleteTrip: (tripId: string) => void;
  onAddEntry: (entry: Omit<ExpenseEntry, 'id'>) => void;
  onNavigateToMonth: (monthId: string) => void;
}

export const TravelDashboard: React.FC<TravelDashboardProps> = ({ trips, entries, categories, currency, users, onAddTrip, onUpdateTrip, onDeleteTrip, onAddEntry, onNavigateToMonth }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({ status: 'PLANNED', account: 'SHARED' });
  const [selectedYear, setSelectedYear] = useState('All');
  const [expandedDestination, setExpandedDestination] = useState<string | null>(null);
  const [addingExpenseTripId, setAddingExpenseTripId] = useState<string | null>(null);

  // Expense form state
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseTripCategory, setExpenseTripCategory] = useState<ExpenseEntry['tripCategory']>('OTHER');
  const [expenseAccount, setExpenseAccount] = useState<AccountType>('SHARED');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    trips.forEach(trip => years.add(new Date(trip.startDate).getFullYear().toString()));
    return ['All', ...Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))];
  }, [trips]);

  // Filter by Year first
  const filteredTrips = useMemo(() => {
    if (selectedYear === 'All') return trips;
    return trips.filter(trip => new Date(trip.startDate).getFullYear().toString() === selectedYear);
  }, [trips, selectedYear]);

  // Group by Destination
  const groupedTrips = useMemo(() => {
      const groups = new Map<string, Trip[]>();
      filteredTrips.forEach(trip => {
          const key = trip.destination;
          if (!groups.has(key)) {
              groups.set(key, []);
          }
          groups.get(key)!.push(trip);
      });
      return groups;
  }, [filteredTrips]);

  const getTripExpenses = (tripId: string) => entries.filter(e => e.tripId?.includes(tripId));
  const getTripTotal = (tripId: string) => getTripExpenses(tripId).reduce((sum, e) => sum + e.amount, 0);

  const handleEdit = (trip: Trip) => {
      setEditingTrip(trip);
      setNewTrip(trip);
      setIsFormOpen(true);
      setAddingExpenseTripId(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (trip: Trip) => {
      if (confirm(`Delete trip "${trip.name}"? Linked expenses will NOT be deleted.`)) {
          onDeleteTrip(trip.id);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newTrip.name && newTrip.destination && newTrip.startDate && newTrip.budget) {
          if (editingTrip && newTrip.id) {
              onUpdateTrip(newTrip as Trip);
          } else {
              onAddTrip(newTrip as Omit<Trip, 'id'>);
          }
          setIsFormOpen(false);
          setEditingTrip(null);
          setNewTrip({ status: 'PLANNED' });
      }
  };

  const handleAddExpense = (trip: Trip) => {
      if (!expenseAmount || parseFloat(expenseAmount) <= 0) return;

      // Derive monthId from the selected date
      const dateParts = expenseDate.split('-');
      const monthId = `${dateParts[0]}-${dateParts[1]}`;

      // Find a TRAVEL category to use
      const travelCategory = categories.find(c => c.group === 'TRAVEL');
      const categoryId = travelCategory?.id || 'travel_general';

      onAddEntry({
          monthId,
          categoryId,
          amount: parseFloat(expenseAmount),
          account: expenseAccount,
          description: expenseDescription || undefined,
          date: expenseDate,
          entryType: 'single',
          tripId: [trip.id],
          tripCategory: expenseTripCategory,
      });

      // Reset form
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseTripCategory('OTHER');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setAddingExpenseTripId(null);
  };

  const openExpenseForm = (trip: Trip) => {
      setAddingExpenseTripId(addingExpenseTripId === trip.id ? null : trip.id);
      setExpenseAccount(trip.account || 'SHARED');
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseTripCategory('OTHER');
      setExpenseDate(new Date().toISOString().split('T')[0]);
  };

  const getMonthFromTrip = (trip: Trip): string => {
      const d = new Date(trip.startDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  const renderTripCard = (trip: Trip) => {
      const totalSpent = getTripTotal(trip.id);
      const progress = Math.min((totalSpent / trip.budget) * 100, 100);
      const expenses = getTripExpenses(trip.id);
      const isOver = totalSpent > trip.budget;
      const isAddingExpense = addingExpenseTripId === trip.id;

      return (
        <div key={trip.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition relative group">
            <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-white shadow-sm overflow-hidden shrink-0 bg-white flex items-center justify-center">
                        <img
                            src={(!trip.account || trip.account === 'SHARED') ? users.shared?.avatar : trip.account === 'USER_1' ? users.user_1?.avatar : users.user_2?.avatar}
                            className="w-full h-full object-cover"
                            alt="Owner"
                        />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-800">{trip.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                            <MapPin size={12}/> {trip.destination}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${trip.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                        {trip.status}
                    </span>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(trip); }}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        title="Edit Trip"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(trip); }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete Trip"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="p-5 flex-1 space-y-4">
                <div>
                    <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-500">Budget Used</span>
                        <span className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>{formatCurrency(totalSpent, currency)} / {formatCurrency(trip.budget, currency)}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                    {isOver && <div className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle size={10}/> Over Budget</div>}
                </div>

                <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Breakdown</p>
                    {['FLIGHT', 'ACCOMMODATION', 'FOOD', 'ACTIVITY', 'OTHER'].map(cat => {
                        const catTotal = expenses.filter(e => e.tripCategory === cat).reduce((s, e) => s + e.amount, 0);
                        if(catTotal === 0) return null;
                        return (
                            <div key={cat} className="flex justify-between text-xs text-slate-600 border-b border-slate-50 pb-1 last:border-0">
                                <span className="capitalize">{cat.toLowerCase()}</span>
                                <span className="font-medium">{formatCurrency(catTotal, currency)}</span>
                            </div>
                        )
                    })}
                    {expenses.length === 0 && <p className="text-xs text-slate-400 italic">No expenses recorded yet.</p>}
                </div>

                {/* Inline Expense Form */}
                {isAddingExpense && (
                    <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 space-y-3 animate-in fade-in">
                        <h4 className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Add Expense</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Amount</label>
                                <input
                                    type="number" step="0.01" required placeholder="0.00"
                                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm bg-white"
                                    value={expenseAmount}
                                    onChange={e => setExpenseAmount(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Type</label>
                                <select
                                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm bg-white"
                                    value={expenseTripCategory}
                                    onChange={e => setExpenseTripCategory(e.target.value as ExpenseEntry['tripCategory'])}
                                >
                                    <option value="FLIGHT">Flight/Transport</option>
                                    <option value="ACCOMMODATION">Accommodation</option>
                                    <option value="FOOD">Food & Drink</option>
                                    <option value="ACTIVITY">Activity</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Account</label>
                                <select
                                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm bg-white"
                                    value={expenseAccount}
                                    onChange={e => setExpenseAccount(e.target.value as AccountType)}
                                >
                                    <option value="SHARED">Shared</option>
                                    <option value="USER_1">{users.user_1?.name}</option>
                                    <option value="USER_2">{users.user_2?.name}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Date</label>
                                <input
                                    type="date"
                                    className="w-full border border-indigo-200 rounded-lg p-2 text-sm bg-white"
                                    value={expenseDate}
                                    onChange={e => setExpenseDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 mb-1">Description (optional)</label>
                            <input
                                type="text" placeholder="e.g. Hotel booking"
                                className="w-full border border-indigo-200 rounded-lg p-2 text-sm bg-white"
                                value={expenseDescription}
                                onChange={e => setExpenseDescription(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleAddExpense(trip)}
                                disabled={!expenseAmount || parseFloat(expenseAmount) <= 0}
                                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                                Save Expense
                            </button>
                            <button
                                onClick={() => setAddingExpenseTripId(null)}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-400">
                    <Calendar size={10} className="inline mr-1"/>
                    {new Date(trip.startDate).toLocaleDateString()}
                    {trip.endDate ? ` - ${new Date(trip.endDate).toLocaleDateString()}` : ''}
                </p>
                <div className="flex items-center gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); openExpenseForm(trip); }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-md transition"
                        title="Add Expense"
                    >
                        <Plus size={12}/> Expense
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onNavigateToMonth(getMonthFromTrip(trip)); }}
                        className="flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-slate-500 hover:bg-slate-100 rounded-md transition"
                        title="View in Monthly Breakdown"
                    >
                        <PieChart size={12}/> Monthly
                    </button>
                </div>
            </div>
        </div>
      );
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Plane className="text-indigo-600" /> Travel & Adventures
            </h2>
            <div className="flex items-center gap-4">
                <select
                    value={selectedYear}
                    onChange={e => setSelectedYear(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none text-slate-700"
                >
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <button
                    onClick={() => {
                        setEditingTrip(null);
                        setNewTrip({ status: 'PLANNED' });
                        setIsFormOpen(!isFormOpen);
                    }}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
                >
                    {isFormOpen ? <><Calendar size={16}/> Cancel</> : <><Plus size={16}/> Plan New Trip</>}
                </button>
            </div>
        </div>

        {isFormOpen && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                <h3 className="font-bold text-slate-700 mb-4">{editingTrip ? 'Edit Trip Details' : 'New Adventure'}</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Trip Name</label>
                        <input required type="text" placeholder="e.g. Eurotrip 2025" className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                            value={newTrip.name || ''} onChange={e => setNewTrip({...newTrip, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Destination</label>
                        <input required type="text" placeholder="e.g. Paris, France" className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                            value={newTrip.destination || ''} onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Total Budget</label>
                        <input required type="number" placeholder="0.00" className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                            value={newTrip.budget || ''} onChange={e => setNewTrip({...newTrip, budget: parseFloat(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                        <input required type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                            value={newTrip.startDate || ''} onChange={e => setNewTrip({...newTrip, startDate: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">End Date (Optional)</label>
                        <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                            value={newTrip.endDate || ''} onChange={e => setNewTrip({...newTrip, endDate: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Account</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                            value={newTrip.account || 'SHARED'}
                            onChange={e => setNewTrip({...newTrip, account: e.target.value as AccountType})}
                        >
                            <option value="SHARED">Shared</option>
                            <option value="USER_1">{users.user_1?.name}</option>
                            <option value="USER_2">{users.user_2?.name}</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                        <select
                            className="w-full border border-slate-300 rounded-lg p-2 text-sm"
                            value={newTrip.status || 'PLANNED'}
                            onChange={e => setNewTrip({...newTrip, status: e.target.value as Trip['status']})}
                        >
                            <option value="PLANNED">Planned</option>
                            <option value="ACTIVE">Active</option>
                            <option value="COMPLETED">Completed</option>
                        </select>
                    </div>
                    <div className="col-span-1 md:col-span-2 flex gap-3 pt-2">
                        <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                            {editingTrip ? 'Update Trip' : 'Create Trip'}
                        </button>
                        <button type="button" onClick={() => { setIsFormOpen(false); setEditingTrip(null); }} className="bg-white border border-slate-300 text-slate-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                    </div>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {Array.from(groupedTrips.entries()).map(([destination, destTrips]) => {
                const isStack = destTrips.length > 1;
                const isExpanded = expandedDestination === destination;

                if (!isStack) {
                    return renderTripCard(destTrips[0]);
                }

                // Calculate Stack Totals
                const stackTotalBudget = destTrips.reduce((sum, t) => sum + t.budget, 0);

                return (
                    <div key={destination} className="relative group/stack">
                        {/* Stacked Effect Backgrounds */}
                        {!isExpanded && (
                            <>
                                <div className="absolute top-3 left-3 w-full h-full bg-slate-200 border border-slate-300 rounded-xl shadow-sm rotate-3 z-0"></div>
                                <div className="absolute top-1.5 left-1.5 w-full h-full bg-slate-100 border border-slate-200 rounded-xl shadow-sm rotate-1 z-10"></div>
                            </>
                        )}

                        {/* Main Stack Card or Expanded Container */}
                        {isExpanded ? (
                            <div className="relative z-20 space-y-4">
                                <div
                                    onClick={() => setExpandedDestination(null)}
                                    className="bg-slate-800 text-white p-3 rounded-xl cursor-pointer flex items-center justify-between hover:bg-slate-700 transition shadow-lg"
                                >
                                    <div className="flex items-center gap-2">
                                        <Layers size={16} />
                                        <span className="font-bold text-sm">{destination}</span>
                                    </div>
                                    <ChevronUp size={16} />
                                </div>
                                {destTrips.map(renderTripCard)}
                            </div>
                        ) : (
                            <div
                                onClick={() => setExpandedDestination(destination)}
                                className="relative z-20 bg-white rounded-xl border border-slate-200 shadow-md p-6 flex flex-col items-center justify-center min-h-[180px] cursor-pointer hover:shadow-lg hover:-translate-y-1 transition group"
                            >
                                <div className="absolute top-3 right-3 bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">
                                    {destTrips.length}
                                </div>
                                <div className="w-12 h-12 bg-white text-indigo-600 rounded-full flex items-center justify-center mb-3 shadow-sm border border-slate-100 group-hover:scale-110 transition">
                                    <Layers size={24} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-800 text-center">{destination}</h3>
                                <p className="text-slate-500 text-xs mt-1">Total Budget: {formatCurrency(stackTotalBudget, currency)}</p>
                                <div className="mt-4 flex items-center gap-1 text-[10px] text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronDown size={12} /> View Trips
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            <div className="bg-indigo-900 text-white rounded-xl shadow-lg p-6 flex flex-col justify-center min-h-[180px]">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center mb-3 text-xl">✈️</div>
                <h3 className="text-base font-bold mb-2">Travel Smart</h3>
                <p className="text-indigo-200 text-xs leading-relaxed">
                    Create a trip to track expenses separate from your monthly budget. Assign expenses to categories like Flight or Food to see exactly where your vacation money goes.
                </p>
            </div>
        </div>
    </div>
  );
};
