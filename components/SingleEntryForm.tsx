import React, { useState } from 'react';
import { Category, ExpenseEntry, AccountType, Trip, User, CurrencyCode } from '../types';
import { Plus, Plane } from 'lucide-react';

interface SingleEntryFormProps {
  categories: Category[];
  trips: Trip[];
  currentMonth: string;
  users: Record<string, User>;
  currency: CurrencyCode;
  theme?: 'light' | 'dark';
  getInputClass: (isInput?: boolean) => string;
  onAddEntry: (entry: Omit<ExpenseEntry, 'id'>) => void;
}

const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', GBP: '£', JPY: '¥', BRL: 'R$', USD: '$' };

const CATEGORY_GROUPS = ['SHARED', 'USER_1', 'USER_2'] as const;

export const SingleEntryForm: React.FC<SingleEntryFormProps> = ({
  categories, trips, currentMonth, users, currency, theme = 'light', getInputClass, onAddEntry
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [account, setAccount] = useState<AccountType>('SHARED');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [tripCategory, setTripCategory] = useState<ExpenseEntry['tripCategory']>('OTHER');
  const [submitted, setSubmitted] = useState(false);

  if (!users || !users.user_1 || !users.user_2) return <div>Loading users...</div>;

  const symbol = CURRENCY_SYMBOL[currency] ?? '$';
  const selectedCategory = categories.find(c => c.id === categoryId);
  const isTravelCategory = selectedCategory?.group === 'TRAVEL';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;
    if (isTravelCategory && selectedTripIds.length === 0) {
      alert('Please select at least one Trip for this travel expense.');
      return;
    }
    onAddEntry({
      monthId: currentMonth,
      categoryId,
      amount: parseFloat(amount),
      account,
      description,
      date,
      entryType: 'single',
      tripId: isTravelCategory ? selectedTripIds : undefined,
      tripCategory: isTravelCategory ? tripCategory : undefined,
    });
    setAmount('');
    setDescription('');
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 1200);
    if (isTravelCategory) { setSelectedTripIds([]); setTripCategory('OTHER'); }
  };

  const handleTripSelection = (tripId: string) => {
    setSelectedTripIds(prev => prev.includes(tripId) ? prev.filter(id => id !== tripId) : [...prev, tripId]);
  };

  const isDark = theme === 'dark';
  const card = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100';
  const labelCls = `block text-[11px] font-bold uppercase tracking-widest mb-1.5 ${isDark ? 'text-slate-500' : 'text-slate-400'}`;
  const inputCls = `w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition focus:ring-2 focus:ring-indigo-200 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400'}`;

  const accountOptions: { key: AccountType; label: string; avatar?: string; color?: string }[] = [
    { key: 'SHARED', label: users.shared?.name ?? 'Shared', avatar: users.shared?.avatar, color: users.shared?.color },
    { key: 'USER_1', label: users.user_1.name, avatar: users.user_1.avatar, color: users.user_1.color },
    { key: 'USER_2', label: users.user_2.name, avatar: users.user_2.avatar, color: users.user_2.color },
  ];

  // Group categories for the selector
  const expenseCategories = categories.filter(c => c.group !== 'SAVINGS');
  const sharedCats = expenseCategories.filter(c => c.defaultAccount === 'SHARED');
  const u1Cats = expenseCategories.filter(c => c.defaultAccount === 'USER_1');
  const u2Cats = expenseCategories.filter(c => c.defaultAccount === 'USER_2');

  return (
    <div className={`rounded-2xl border shadow-sm overflow-hidden ${card}`}>
      {/* Header strip */}
      <div className="h-1 bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500" />

      <form onSubmit={handleSubmit} className="p-6 space-y-5">

        {/* Amount — prominent */}
        <div>
          <label className={labelCls}>Amount</label>
          <div className="relative">
            <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold pointer-events-none select-none ${isDark ? 'text-slate-500' : 'text-slate-300'}`}>
              {symbol}
            </span>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              placeholder="0.00"
              className={`w-full rounded-xl border pl-10 pr-4 py-3 text-2xl font-bold outline-none transition focus:ring-2 focus:ring-indigo-200 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-600' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-300'}`}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelCls}>Description</label>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            placeholder="e.g. Dinner at Mario's"
            className={inputCls}
          />
        </div>

        {/* Date + Category row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className={inputCls + ' appearance-none [&::-webkit-calendar-picker-indicator]:hidden'}
            />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select
              value={categoryId}
              onChange={e => setCategoryId(e.target.value)}
              className={inputCls}
            >
              {sharedCats.length > 0 && (
                <optgroup label="Shared">
                  {sharedCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
              {u1Cats.length > 0 && (
                <optgroup label={users.user_1.name}>
                  {u1Cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
              {u2Cats.length > 0 && (
                <optgroup label={users.user_2.name}>
                  {u2Cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* Account selector — avatar pills */}
        <div>
          <label className={labelCls}>Account</label>
          <div className="flex gap-2">
            {accountOptions.map(opt => {
              const isSelected = account === opt.key;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setAccount(opt.key)}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-all text-sm font-semibold ${
                    isSelected
                      ? 'border-transparent shadow-md'
                      : isDark
                        ? 'border-slate-700 text-slate-400 hover:border-slate-600'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  style={isSelected ? { backgroundColor: (opt.color ?? '#6366f1') + '18', borderColor: opt.color ?? '#6366f1', color: opt.color ?? '#6366f1' } : {}}
                >
                  {opt.avatar ? (
                    <img src={opt.avatar} className="w-6 h-6 rounded-full object-cover shrink-0" alt={opt.label} />
                  ) : (
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: (opt.color ?? '#6366f1') + '20', color: opt.color ?? '#6366f1' }}>
                      {opt.label[0]}
                    </span>
                  )}
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Travel details */}
        {isTravelCategory && (
          <div className={`rounded-xl border p-4 space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-200 ${isDark ? 'bg-indigo-950/40 border-indigo-800/40' : 'bg-indigo-50/80 border-indigo-100'}`}>
            <p className={`text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>
              <Plane size={13} /> Trip Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Trip(s)</label>
                <div className={`rounded-xl border p-2 space-y-1 max-h-28 overflow-y-auto ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-indigo-200'}`}>
                  {trips.filter(t => t.status !== 'COMPLETED').map(t => (
                    <label key={t.id} className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer text-xs font-medium transition ${selectedTripIds.includes(t.id) ? (isDark ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 hover:bg-slate-50')}`}>
                      <input type="checkbox" checked={selectedTripIds.includes(t.id)} onChange={() => handleTripSelection(t.id)} className="rounded text-indigo-600" />
                      {t.name}
                    </label>
                  ))}
                  {trips.length === 0 && <p className="text-[11px] text-red-500 px-2 py-1">No trips — create one in Planning → Trips first.</p>}
                </div>
              </div>
              <div>
                <label className={labelCls}>Type</label>
                <select value={tripCategory} onChange={e => setTripCategory(e.target.value as any)} className={inputCls}>
                  <option value="FLIGHT">Flight / Transport</option>
                  <option value="ACCOMMODATION">Accommodation</option>
                  <option value="FOOD">Food & Drink</option>
                  <option value="ACTIVITY">Activity</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] ${
            submitted
              ? 'bg-emerald-500 text-white'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/20'
          }`}
        >
          {submitted ? (
            <span className="animate-in fade-in">Added ✓</span>
          ) : (
            <><Plus size={16} /> Add Expense</>
          )}
        </button>
      </form>
    </div>
  );
};
