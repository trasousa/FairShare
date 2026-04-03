import React, { useState, useMemo } from 'react';
import { ExpenseEntry, Category, Trip, CurrencyCode, AccountType, User } from '../types';
import { formatCurrency } from '../services/financeService';
import { entryHasTrip, entryHasNoTrip, normalizeTripId } from '../services/utils';
import { Search, Trash2, AlertTriangle, Filter, ChevronDown, ChevronUp, X } from 'lucide-react';

interface DataExplorerProps {
  entries: ExpenseEntry[];
  categories: Category[];
  trips: Trip[];
  currency: CurrencyCode;
  users: Record<string, User>;
  theme?: 'light' | 'dark';
  onDeleteEntry: (id: string) => void;
  onDeleteOrphans: () => void;
  onDeleteZeros: () => void;
}

export const DataExplorer: React.FC<DataExplorerProps> = ({
  entries, categories, trips, currency, users, theme = 'light',
  onDeleteEntry, onDeleteOrphans, onDeleteZeros
}) => {
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState<AccountType | 'ALL'>('ALL');
  const [filterMonth, setFilterMonth] = useState('ALL');
  const [showOnlyOrphans, setShowOnlyOrphans] = useState(false);
  const [showOnlyZeros, setShowOnlyZeros] = useState(false);
  const [sortField, setSortField] = useState<'date' | 'amount' | 'category'>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState<'orphans' | 'zeros' | null>(null);

  const catMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const tripMap = useMemo(() => new Map(trips.map(t => [t.id, t])), [trips]);

  const months = useMemo(() => {
    const s = new Set(entries.map(e => e.monthId));
    return ['ALL', ...Array.from(s).sort().reverse()];
  }, [entries]);

  const enriched = useMemo(() => entries.map(e => ({
    ...e,
    tripId: normalizeTripId(e.tripId),
    cat: catMap.get(e.categoryId),
    tripNames: normalizeTripId(e.tripId).map(tid => tripMap.get(tid)?.name).filter(Boolean),
    isOrphan: !catMap.has(e.categoryId),
  })), [entries, catMap, tripMap]);

  const orphanCount = useMemo(() => enriched.filter(e => e.isOrphan).length, [enriched]);
  const zeroCount = useMemo(() => enriched.filter(e => e.amount === 0).length, [enriched]);

  const filtered = useMemo(() => {
    let list = enriched;
    if (filterAccount !== 'ALL') list = list.filter(e => e.account === filterAccount);
    if (filterMonth !== 'ALL') list = list.filter(e => e.monthId === filterMonth);
    if (showOnlyOrphans) list = list.filter(e => e.isOrphan);
    if (showOnlyZeros) list = list.filter(e => e.amount === 0);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.cat?.name || e.categoryId).toLowerCase().includes(q) ||
        e.tripNames.some(n => n?.toLowerCase().includes(q)) ||
        String(e.amount).includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      let diff = 0;
      if (sortField === 'amount') diff = a.amount - b.amount;
      else if (sortField === 'category') diff = (a.cat?.name || a.categoryId).localeCompare(b.cat?.name || b.categoryId);
      else diff = (a.date || a.monthId).localeCompare(b.date || b.monthId);
      return sortAsc ? diff : -diff;
    });
    return list;
  }, [enriched, filterAccount, filterMonth, showOnlyOrphans, showOnlyZeros, search, sortField, sortAsc]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc(a => !a);
    else { setSortField(field); setSortAsc(false); }
  };

  const cardBg = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputCls = `border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-200 transition ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`;
  const thCls = `text-left text-xs font-semibold text-slate-500 uppercase tracking-wider pb-2 cursor-pointer select-none hover:text-indigo-600 transition`;

  const accountLabel = (a: AccountType) => a === 'SHARED' ? '👥 Shared' : a === 'USER_1' ? users.user_1?.name : users.user_2?.name;
  const accountBadge = (a: AccountType) => a === 'SHARED' ? 'bg-purple-100 text-purple-700' : a === 'USER_1' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700';

  return (
    <div className="space-y-4">
      {/* Issue Summary */}
      {(orphanCount > 0 || zeroCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {orphanCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700">{orphanCount} orphaned {orphanCount === 1 ? 'entry' : 'entries'}</p>
                <p className="text-xs text-red-500">Linked to deleted categories</p>
              </div>
              <button
                onClick={() => setConfirmCleanup('orphans')}
                className="ml-2 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition"
              >
                Clean Up
              </button>
            </div>
          )}
          {zeroCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700">{zeroCount} zero-amount {zeroCount === 1 ? 'entry' : 'entries'}</p>
                <p className="text-xs text-amber-500">Worksheet placeholders with no value</p>
              </div>
              <button
                onClick={() => setConfirmCleanup('zeros')}
                className="ml-2 text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition"
              >
                Clean Up
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmCleanup && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-lg flex items-center justify-between gap-4">
          <p className="text-sm text-slate-700 font-medium">
            {confirmCleanup === 'orphans'
              ? `Delete all ${orphanCount} orphaned entries? This cannot be undone.`
              : `Delete all ${zeroCount} zero-amount entries? This cannot be undone.`}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { confirmCleanup === 'orphans' ? onDeleteOrphans() : onDeleteZeros(); setConfirmCleanup(null); }}
              className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition"
            >
              Yes, Delete
            </button>
            <button onClick={() => setConfirmCleanup(null)} className="text-xs font-bold border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`${cardBg} border rounded-xl p-4 flex flex-wrap gap-3 items-center`}>
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputCls} pl-8 w-full`}
            placeholder="Search description, category, trip…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>
        <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className={inputCls}>
          {months.map(m => <option key={m} value={m}>{m === 'ALL' ? 'All Months' : m}</option>)}
        </select>
        <select value={filterAccount} onChange={e => setFilterAccount(e.target.value as any)} className={inputCls}>
          <option value="ALL">All Accounts</option>
          <option value="SHARED">Shared</option>
          <option value="USER_1">{users.user_1?.name}</option>
          <option value="USER_2">{users.user_2?.name}</option>
        </select>
        <button
          onClick={() => { setShowOnlyOrphans(o => !o); setShowOnlyZeros(false); }}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition ${showOnlyOrphans ? 'bg-red-50 border-red-300 text-red-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          <Filter size={12} /> Orphans only
        </button>
        <button
          onClick={() => { setShowOnlyZeros(z => !z); setShowOnlyOrphans(false); }}
          className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition ${showOnlyZeros ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}
        >
          <Filter size={12} /> Zeros only
        </button>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} of {entries.length} entries</span>
      </div>

      {/* Table */}
      <div className={`${cardBg} border rounded-xl overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className={`border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-800/50' : 'border-slate-100 bg-slate-50'}`}>
              <tr>
                <th className={`${thCls} px-4 pt-3`} onClick={() => toggleSort('date')}>
                  Date {sortField === 'date' && (sortAsc ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />)}
                </th>
                <th className={`${thCls} px-4 pt-3`} onClick={() => toggleSort('category')}>
                  Category {sortField === 'category' && (sortAsc ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />)}
                </th>
                <th className={`${thCls} px-4 pt-3 hidden md:table-cell`}>Description</th>
                <th className={`${thCls} px-4 pt-3 hidden lg:table-cell`}>Account</th>
                <th className={`${thCls} px-4 pt-3 hidden lg:table-cell`}>Trip</th>
                <th className={`${thCls} px-4 pt-3`} onClick={() => toggleSort('amount')}>
                  Amount {sortField === 'amount' && (sortAsc ? <ChevronUp size={12} className="inline" /> : <ChevronDown size={12} className="inline" />)}
                </th>
                <th className="px-4 pt-3 pb-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-slate-400 py-10 text-sm italic">No entries match the current filters.</td>
                </tr>
              )}
              {filtered.map(e => (
                <tr key={e.id} className={`hover:bg-indigo-50/30 transition group ${e.isOrphan ? 'bg-red-50/40' : e.amount === 0 ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                    <div>{e.date ? new Date(e.date + 'T12:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }) : e.monthId}</div>
                  </td>
                  <td className="px-4 py-2.5">
                    {e.isOrphan ? (
                      <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertTriangle size={12} /> <span className="font-mono">{e.categoryId}</span>
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-slate-700">{e.cat?.name}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 hidden md:table-cell max-w-[200px] truncate">
                    {e.description || <span className="italic text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${accountBadge(e.account)}`}>{accountLabel(e.account)}</span>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-xs text-slate-500">
                    {e.tripNames.length > 0 ? e.tripNames.join(', ') : <span className="italic text-slate-300">—</span>}
                  </td>
                  <td className={`px-4 py-2.5 font-semibold text-sm whitespace-nowrap ${e.amount === 0 ? 'text-amber-500' : 'text-slate-700'}`}>
                    {formatCurrency(e.amount, currency)}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => onDeleteEntry(e.id)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      title="Delete entry"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
