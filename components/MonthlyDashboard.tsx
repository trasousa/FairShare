import React, { useMemo, useState } from 'react';
import { ExpenseEntry, Budget, Category, SavingsGoal, IncomeEntry, User, CurrencyCode } from '../types';
import { AccountSummary } from './AccountSummary';
import { formatCurrency, getMonthLabel } from '../services/financeService';
import { PieChart, TrendingUp, Target, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MonthlyDashboardProps {
  entries: ExpenseEntry[];
  budgets: Budget[];
  categories: Category[];
  savings: SavingsGoal[];
  incomes: IncomeEntry[];
  users: Record<string, User>;
  currency: CurrencyCode;
  currentMonth: string;
}

export const MonthlyDashboard: React.FC<MonthlyDashboardProps> = ({ entries, budgets, categories, savings, incomes, users, currency, currentMonth }) => {
  const [expandedCatId, setExpandedCatId] = useState<string | null>(null);

  const monthLabel = getMonthLabel(currentMonth);

  const monthlyEntries = useMemo(() => 
    entries.filter(e => e.monthId === currentMonth), 
  [entries, currentMonth]);

  const monthlyIncomes = incomes.filter(i => i.monthId === currentMonth);
  
  // Safe access for user data inside logic
  const u1Income = users?.user_1?.monthlyIncome || 0;
  const u2Income = users?.user_2?.monthlyIncome || 0;

  const incomeU1 = monthlyIncomes.filter(i => i.recipient === 'USER_1').reduce((sum, i) => sum + i.amount, 0) 
                 || u1Income; 
  const incomeU2 = monthlyIncomes.filter(i => i.recipient === 'USER_2').reduce((sum, i) => sum + i.amount, 0) 
                 || u2Income; 
  const incomeShared = monthlyIncomes.filter(i => i.recipient === 'SHARED').reduce((sum, i) => sum + i.amount, 0);

  const totalIncome = incomeU1 + incomeU2 + incomeShared;
  const user1Ratio = totalIncome > 0 ? incomeU1 / (incomeU1 + incomeU2) : 0.5;
  
  const spendingEntries = monthlyEntries.filter(e => {
      const cat = categories.find(c => c.id === e.categoryId);
      return cat?.group !== 'SAVINGS';
  });

  const savingsEntries = monthlyEntries.filter(e => {
      const cat = categories.find(c => c.id === e.categoryId);
      return cat?.group === 'SAVINGS';
  });

  const totals = useMemo(() => {
    const acc = { SHARED: 0, USER_1: 0, USER_2: 0 };
    spendingEntries.forEach(e => {
       if (acc[e.account] !== undefined) {
         acc[e.account] += e.amount;
       }
    });
    return acc;
  }, [spendingEntries]);
  
  const monthlySavingsTotal = savingsEntries.reduce((sum, e) => sum + e.amount, 0);

  const monthlySavingsTarget = savings.reduce((sum, goal) => {
      if (goal.targetType === 'FIXED') {
          return sum; 
      } else {
          return sum + (totalIncome * (goal.targetAmount / 100));
      }
  }, 0);
  
  const displaySavingsTarget = monthlySavingsTarget > 0 ? monthlySavingsTarget : (totalIncome * 0.2);

  const budgetTotals = useMemo(() => {
      const acc = { SHARED: 0, USER_1: 0, USER_2: 0 };
      budgets.forEach(b => {
          const cat = categories.find(c => c.id === b.categoryId);
          if (cat) acc[cat.defaultAccount] += b.limit;
      });
      return acc;
  }, [budgets, categories]);

  const sharedBudgetNeed = budgetTotals.SHARED; 
  const user1Contribution = sharedBudgetNeed * user1Ratio;
  const user2Contribution = sharedBudgetNeed * (1 - user1Ratio);

  const categoryBreakdown = useMemo(() => {
    return categories.map(cat => {
        const entriesForCat = monthlyEntries.filter(e => e.categoryId === cat.id);
        
        const spentByUser1 = entriesForCat
            .filter(e => e.account === 'USER_1')
            .reduce((sum, e) => sum + e.amount, 0);
            
        const spentByUser2 = entriesForCat
            .filter(e => e.account === 'USER_2')
            .reduce((sum, e) => sum + e.amount, 0);

        const spentShared = entriesForCat
            .filter(e => e.account === 'SHARED')
            .reduce((sum, e) => sum + e.amount, 0);

        const totalSpent = spentByUser1 + spentByUser2 + spentShared;

        return {
            cat,
            isSavings: cat.group === 'SAVINGS',
            spentByUser1,
            spentByUser2,
            spentShared,
            totalSpent
        };
    })
    .filter(item => item.totalSpent > 0)
    .sort((a, b) => b.totalSpent - a.totalSpent);
  }, [categories, monthlyEntries]);

  const toggleCat = (id: string) => {
      setExpandedCatId(prev => prev === id ? null : id);
  };

  // SAFEGUARD: Only return UI if users are loaded
  if (!users || !users.user_1 || !users.user_2) {
      return <div className="p-8 text-center text-slate-400">Loading user data...</div>;
  }

    return (
    <div className="space-y-8">
        
        {/* 1. Account Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto">
            <div className="col-span-1">
                <AccountSummary 
                    type="SHARED" 
                    title="Shared Account" 
                    color={users.shared?.color}
                    spent={totals.SHARED} 
                    budget={budgetTotals.SHARED}
                    budgets={budgets}
                    categories={categories}
                    budgetEntries={monthlyEntries}
                    savings={savings.filter(s => s.account === 'SHARED')}
                    entries={entries} 
                    currency={currency}
                />
            </div>
            <div className="col-span-1">
                <AccountSummary 
                    type="USER_1" 
                    title={users.user_1.name} 
                    user={users.user_1}
                    color={users.user_1.color}
                    spent={totals.USER_1} 
                    budget={budgetTotals.USER_1}
                    budgets={budgets}
                    categories={categories}
                    budgetEntries={monthlyEntries}
                    savings={savings.filter(s => s.account === 'USER_1')}
                    income={incomeU1}
                    entries={entries}
                    currency={currency}
                />
            </div>
            <div className="col-span-1">
                <AccountSummary 
                    type="USER_2" 
                    title={users.user_2.name} 
                    user={users.user_2}
                    color={users.user_2.color}
                    spent={totals.USER_2} 
                    budget={budgetTotals.USER_2}
                    budgets={budgets}
                    categories={categories}
                    budgetEntries={monthlyEntries}
                    savings={savings.filter(s => s.account === 'USER_2')}
                    income={incomeU2}
                    entries={entries}
                    currency={currency}
                />
            </div>
        </div>

        {/* 2. Contributions & Wealth */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                        <h3 className="text-lg font-semibold">FairShare Contributions</h3>
                        <div className="text-right">
                            <span className="text-[10px] uppercase tracking-wider text-indigo-300 block">Total Income</span>
                            <span className="text-sm font-bold text-white">{formatCurrency(totalIncome, currency)}</span>
                        </div>
                    </div>
                    <p className="text-indigo-200 text-sm mb-6 relative z-10">
                        Target transfers based on the <span className="font-bold text-white">{Math.round(user1Ratio*100)}%</span> / <span className="font-bold text-white">{Math.round((1-user1Ratio)*100)}%</span> income split for shared budget.
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-2 mb-1">
                                <img src={users.user_1.avatar} className="w-6 h-6 rounded-full border border-white/20" />
                                <span className="font-medium text-xs text-indigo-100">{users.user_1.name}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold">{formatCurrency(user1Contribution, currency)}</span>
                                <span className="text-[10px] text-indigo-300 opacity-80">Income: {formatCurrency(incomeU1, currency)}</span>
                            </div>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-2 mb-1">
                                <img src={users.user_2.avatar} className="w-6 h-6 rounded-full border border-white/20" />
                                <span className="font-medium text-xs text-indigo-100">{users.user_2.name}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-lg font-bold">{formatCurrency(user2Contribution, currency)}</span>
                                <span className="text-[10px] text-indigo-300 opacity-80">Income: {formatCurrency(incomeU2, currency)}</span>
                            </div>
                    </div>
                </div>
            </div>

            <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                 <div className="mb-4 relative z-10">
                    <h3 className="text-lg font-semibold mb-1 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-300"/> Wealth Building
                    </h3>
                    <div className="flex items-end gap-3">
                        <span className="text-4xl font-bold">{formatCurrency(monthlySavingsTotal, currency)}</span>
                        <span className="text-sm text-emerald-200 mb-1.5">saved this month</span>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-6 relative z-10">
                    {[
                        { label: 'Shared', val: totals.SHARED, color: users.shared?.color, avatar: users.shared?.avatar },
                        { label: users.user_1.name, val: monthlyEntries.filter(e => e.account === 'USER_1' && categories.find(c => c.id === e.categoryId)?.group === 'SAVINGS').reduce((s, e) => s + e.amount, 0), color: users.user_1.color, avatar: users.user_1.avatar },
                        { label: users.user_2.name, val: monthlyEntries.filter(e => e.account === 'USER_2' && categories.find(c => c.id === e.categoryId)?.group === 'SAVINGS').reduce((s, e) => s + e.amount, 0), color: users.user_2.color, avatar: users.user_2.avatar }
                    ].map((item, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-1">
                                <img src={item.avatar} className="w-3.5 h-3.5 rounded-full" />
                                <span className="text-[10px] text-emerald-200 truncate">{item.label}</span>
                            </div>
                            <span className="text-xs font-bold">{formatCurrency(item.val, currency)}</span>
                        </div>
                    ))}
                </div>
                
                <div className="relative z-10 bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-medium text-emerald-100">Savings Target</span>
                        <span className="font-bold">{formatCurrency(displaySavingsTarget, currency)}</span>
                    </div>
                    
                    <div className="w-full bg-emerald-800/50 h-2 rounded-full overflow-hidden mb-4">
                        <div className="h-full bg-emerald-400" style={{ width: `${Math.min((monthlySavingsTotal / displaySavingsTarget) * 100, 100)}%` }}></div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${monthlySavingsTotal >= displaySavingsTarget ? 'bg-emerald-400 text-emerald-900' : 'bg-amber-400 text-amber-900'}`}>
                            {monthlySavingsTotal >= displaySavingsTarget ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                        </div>
                        <div>
                            <p className="text-sm font-bold">
                                {monthlySavingsTotal >= displaySavingsTarget ? 'Target Achieved!' : 'Below Target'}
                            </p>
                            <p className="text-xs text-emerald-200">
                                {monthlySavingsTotal >= displaySavingsTarget 
                                    ? `${formatCurrency(monthlySavingsTotal - displaySavingsTarget, currency)} above goal`
                                    : `${formatCurrency(displaySavingsTarget - monthlySavingsTotal, currency)} remaining`
                                }
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* 3. Category Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Category Breakdown</h3>
                <p className="text-xs text-slate-400 mt-1">Click a category to view individual transactions.</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-slate-50 text-slate-500 font-medium">
                        <tr>
                            <th className="px-6 py-3">Category</th>
                            <th className="px-6 py-3 text-right">{users.user_1.name}</th>
                            <th className="px-6 py-3 text-right">{users.user_2.name}</th>
                            <th className="px-6 py-3 text-right">Shared</th>
                            <th className="px-6 py-3 text-right font-bold">Total</th>
                            <th className="px-6 py-3 text-right">Budget</th>
                            <th className="px-6 py-3 text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {categoryBreakdown.map((item) => {
                            const budget = budgets.find(b => b.categoryId === item.cat.id)?.limit || 0;
                            const isOver = budget > 0 && item.totalSpent > budget;
                            const isExpanded = expandedCatId === item.cat.id;
                            
                            return (
                                <React.Fragment key={item.cat.id}>
                                    <tr onClick={() => toggleCat(item.cat.id)} className={`cursor-pointer transition ${isExpanded ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}>
                                        <td className="px-6 py-3 font-medium text-slate-700 flex items-center gap-2">
                                            {item.isSavings && <TrendingUp size={14} className="text-emerald-500" />}
                                            {item.cat.name}
                                        </td>
                                        <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(item.spentByUser1, currency)}</td>
                                        <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(item.spentByUser2, currency)}</td>
                                        <td className="px-6 py-3 text-right text-slate-600">{formatCurrency(item.spentShared, currency)}</td>
                                        <td className={`px-6 py-3 text-right font-semibold ${item.isSavings ? 'text-emerald-600' : 'text-slate-800'}`}>{formatCurrency(item.totalSpent, currency)}</td>
                                        <td className="px-6 py-3 text-right text-slate-500">{budget > 0 ? formatCurrency(budget, currency) : '-'}</td>
                                        <td className="px-6 py-3 text-right">
                                            {budget > 0 ? (
                                                <span className={`text-xs font-bold ${isOver ? 'text-red-500' : 'text-emerald-500'}`}>
                                                    {Math.round((item.totalSpent / budget) * 100)}%
                                                </span>
                                            ) : <span className="text-slate-400 text-xs">-</span>}
                                        </td>
                                    </tr>
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={7} className="bg-slate-50/50 p-0">
                                                <div className="px-6 py-3 space-y-2 border-b border-indigo-100">
                                                    {monthlyEntries.filter(e => e.categoryId === item.cat.id).sort((a,b) => (b.date||'').localeCompare(a.date||'')).map(entry => (
                                                        <div key={entry.id} className="flex justify-between items-center text-xs text-slate-600 pl-4 border-l-2 border-indigo-200" title={entry.description || 'No description'}>
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-slate-400 font-mono">{entry.date || entry.monthId}</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    <img src={entry.account === 'SHARED' ? users.shared?.avatar : entry.account === 'USER_1' ? users.user_1?.avatar : users.user_2?.avatar} className="w-4 h-4 rounded-full" />
                                                                    <span>{entry.account === 'SHARED' ? 'Shared' : entry.account === 'USER_1' ? users.user_1.name : users.user_2.name}</span>
                                                                </div>
                                                                {entry.description && <span className="text-slate-400 italic">- {entry.description}</span>}
                                                            </div>
                                                            <span className="font-bold">{formatCurrency(entry.amount, currency)}</span>
                                                        </div>
                                                    ))}
                                                    {monthlyEntries.filter(e => e.categoryId === item.cat.id).length === 0 && <p className="text-xs text-slate-400 italic pl-4">No entries found.</p>}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {categoryBreakdown.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-8 text-center text-slate-400">No expenses recorded for this month.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
  );
};