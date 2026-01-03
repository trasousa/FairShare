import React, { useState } from 'react';
import { IncomeEntry, AccountType, User, CurrencyCode } from '../types';
import { formatCurrency } from '../services/financeService';
import { Plus, Trash2, ArrowUpRight, Calendar as CalendarIcon } from 'lucide-react';
import { MonthPicker } from './MonthPicker';

interface IncomeManagerProps {
  incomes: IncomeEntry[];
  currentMonth: string;
  users: Record<string, User>;
  currency: CurrencyCode;
  onAddIncome: (source: string, amount: number, recipient: AccountType, isRecurring: boolean, monthId: string) => void;
  onDeleteIncome: (id: string) => void;
}

export const IncomeManager: React.FC<IncomeManagerProps> = ({ incomes, currentMonth, users, currency, onAddIncome, onDeleteIncome }) => {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState<AccountType>('USER_1');
  const [isRecurring, setIsRecurring] = useState(false);
  const [incomeMonth, setIncomeMonth] = useState(currentMonth);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  const monthlyIncomes = incomes.filter(i => i.monthId === currentMonth);
  const totalMonthlyIncome = monthlyIncomes.reduce((sum, i) => sum + i.amount, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (source && amount) {
      onAddIncome(source, parseFloat(amount), recipient, isRecurring, incomeMonth);
      setSource('');
      setAmount('');
      setIsRecurring(false);
    }
  };

  return (
    <div className="space-y-6">
      <MonthPicker
        isOpen={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        currentMonthId={incomeMonth}
        onSelect={(month) => {
          setIncomeMonth(month);
          setIsMonthPickerOpen(false);
        }}
      />
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ArrowUpRight className="text-emerald-600" /> Income Sources
           </h2>
           <p className="text-sm text-slate-500">Manage salary, bonuses, and other inflows for {new Date(currentMonth).toLocaleDateString('default', { month: 'long', year: 'numeric' })}.</p>
        </div>
        <div className="bg-emerald-50 px-4 py-2 rounded-xl text-right">
             <span className="text-xs font-bold text-emerald-600 uppercase tracking-wide block">Total Income</span>
             <span className="text-2xl font-bold text-slate-800">{formatCurrency(totalMonthlyIncome, currency)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                <Plus size={16} /> Register Income
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Source Name</label>
                    <input 
                        type="text" 
                        value={source} 
                        onChange={e => setSource(e.target.value)} 
                        placeholder="e.g. Monthly Salary" 
                        className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-100" 
                        required 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Amount</label>
                      <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                          <input 
                              type="number" 
                              value={amount} 
                              onChange={e => setAmount(e.target.value)} 
                              placeholder="0.00" 
                              className="w-full text-sm border border-slate-300 rounded-lg pl-8 pr-2.5 py-2.5 outline-none focus:ring-2 focus:ring-emerald-100 font-bold text-slate-700" 
                              required 
                          />
                      </div>
                  </div>
                   <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Month</label>
                      <button
                        type="button"
                        onClick={() => setIsMonthPickerOpen(true)}
                        className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-emerald-100 text-left flex items-center gap-2"
                      >
                        <CalendarIcon size={14} className="text-slate-400" />
                        {new Date(incomeMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </button>
                  </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Recipient</label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => setRecipient('USER_1')} className={`flex-1 py-2 text-xs rounded-lg border transition ${recipient === 'USER_1' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'border-slate-200 text-slate-600'}`}>{users.user_1.name}</button>
                        <button type="button" onClick={() => setRecipient('USER_2')} className={`flex-1 py-2 text-xs rounded-lg border transition ${recipient === 'USER_2' ? 'bg-pink-50 border-pink-200 text-pink-700 font-bold' : 'border-slate-200 text-slate-600'}`}>{users.user_2.name}</button>
                        <button type="button" onClick={() => setRecipient('SHARED')} className={`flex-1 py-2 text-xs rounded-lg border transition ${recipient === 'SHARED' ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold' : 'border-slate-200 text-slate-600'}`}>Shared</button>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="checkbox" id="recurring" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="rounded text-emerald-600 focus:ring-emerald-500" />
                    <label htmlFor="recurring" className="text-xs text-slate-600">Recurring (Copy to next month)</label>
                </div>
                <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg text-sm font-bold hover:bg-slate-800 transition">Add Income</button>
            </form>
        </div>

        <div className="lg:col-span-2 space-y-4">
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                 {(['USER_1', 'USER_2', 'SHARED'] as AccountType[]).map(acc => {
                     const total = monthlyIncomes.filter(i => i.recipient === acc).reduce((sum, i) => sum + i.amount, 0);
                     const label = acc === 'SHARED' ? 'Shared' : acc === 'USER_1' ? users.user_1.name : users.user_2.name;
                     const color = acc === 'SHARED' ? 'text-purple-600' : acc === 'USER_1' ? 'text-blue-600' : 'text-pink-600';
                     const bg = acc === 'SHARED' ? 'bg-purple-50' : acc === 'USER_1' ? 'bg-blue-50' : 'bg-pink-50';
                     
                     return (
                         <div key={acc} className={`${bg} rounded-lg p-3 border border-white/50`}>
                             <span className={`text-[10px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
                             <span className="block text-lg font-bold text-slate-800 mt-1">{formatCurrency(total, currency)}</span>
                         </div>
                     )
                 })}
             </div>

             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                        <tr>
                            <th className="px-4 py-3">Source</th>
                            <th className="px-4 py-3">Recipient</th>
                            <th className="px-4 py-3 text-right">Amount</th>
                            <th className="px-4 py-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {monthlyIncomes.map(inc => (
                            <tr key={inc.id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-medium text-slate-700">
                                    {inc.source}
                                    {inc.isRecurring && <span className="ml-2 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">Recurring</span>}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-1 rounded font-bold ${
                                        inc.recipient === 'SHARED' ? 'bg-purple-100 text-purple-700' : 
                                        inc.recipient === 'USER_1' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                                    }`}>
                                        {inc.recipient === 'SHARED' ? 'Shared' : inc.recipient === 'USER_1' ? users.user_1.name : users.user_2.name}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-emerald-600">+{formatCurrency(inc.amount, currency)}</td>
                                <td className="px-4 py-3 text-right">
                                    <button onClick={() => onDeleteIncome(inc.id)} className="text-slate-300 hover:text-red-500 transition">
                                        <Trash2 size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {monthlyIncomes.length === 0 && (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-400 italic">No income recorded for this month.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        </div>
      </div>
    </div>
  );
};