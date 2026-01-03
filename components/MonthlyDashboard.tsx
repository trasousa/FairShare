import React, { useMemo } from 'react';
import { ExpenseEntry, Budget, Category, SavingsGoal, IncomeEntry, User, CurrencyCode } from '../types';
import { AccountSummary } from './AccountSummary';
import { formatCurrency } from '../services/financeService';
import { PieChart, TrendingUp } from 'lucide-react';

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
  const monthLabel = new Date(currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const monthlyEntries = useMemo(() => 
    entries.filter(e => e.monthId === currentMonth), 
  [entries, currentMonth]);

  const monthlyIncomes = incomes.filter(i => i.monthId === currentMonth);
  
  const incomeU1 = monthlyIncomes.filter(i => i.recipient === 'USER_1').reduce((sum, i) => sum + i.amount, 0) 
                 || users.user_1.monthlyIncome; 
  const incomeU2 = monthlyIncomes.filter(i => i.recipient === 'USER_2').reduce((sum, i) => sum + i.amount, 0) 
                 || users.user_2.monthlyIncome; 
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

    return (
    <div className="space-y-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PieChart className="text-indigo-600" size={20}/>
                Monthly Deep Dive
            </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div>
                    <h3 className="text-lg font-semibold mb-2 relative z-10">FairShare Contributions</h3>
                    <p className="text-indigo-200 text-sm mb-6 relative z-10">
                        Target transfers based on the <span className="font-bold text-white">{Math.round(user1Ratio*100)}%</span> / <span className="font-bold text-white">{Math.round((1-user1Ratio)*100)}%</span> income split for shared budget.
                    </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <img src={users.user_1.avatar} className="w-6 h-6 rounded-full border border-white/20" />
                                <span className="font-medium text-xs text-indigo-100">{users.user_1.name}</span>
                            </div>
                            <span className="text-lg font-bold">{formatCurrency(user1Contribution, currency)}</span>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm border border-white/10">
                            <div className="flex items-center gap-2 mb-2">
                                <img src={users.user_2.avatar} className="w-6 h-6 rounded-full border border-white/20" />
                                <span className="font-medium text-xs text-indigo-100">{users.user_2.name}</span>
                            </div>
                            <span className="text-lg font-bold">{formatCurrency(user2Contribution, currency)}</span>
                    </div>
                </div>
            </div>

            <div className="bg-emerald-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                 <div>
                    <h3 className="text-lg font-semibold mb-2 relative z-10 flex items-center gap-2">
                        <TrendingUp size={20} className="text-emerald-300"/> Wealth Building
                    </h3>
                    <p className="text-emerald-200 text-sm mb-6 relative z-10">
                        Total money allocated to savings goals and investments this month.
                    </p>
                </div>
                <div className="relative z-10">
                     <span className="block text-4xl font-bold mb-2">{formatCurrency(monthlySavingsTotal, currency)}</span>
                     <div className="w-full bg-emerald-800 h-2 rounded-full overflow-hidden mb-2">
                         <div className="h-full bg-emerald-400" style={{ width: `${(monthlySavingsTotal / displaySavingsTarget) * 100}%` }}></div>
                     </div>
                     <span className="text-xs text-emerald-300">
                         {totalIncome > 0 ? Math.round((monthlySavingsTotal / totalIncome) * 100) : 0}% of total household income saved
                     </span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto">
            <div className="col-span-1">
                <AccountSummary 
                    type="SHARED" 
                    title="Shared Account" 
                    spent={totals.SHARED} 
                    budget={budgetTotals.SHARED}
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
                    spent={totals.USER_1} 
                    budget={budgetTotals.USER_1}
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
                    spent={totals.USER_2} 
                    budget={budgetTotals.USER_2}
                    savings={savings.filter(s => s.account === 'USER_2')}
                    income={incomeU2}
                    entries={entries}
                    currency={currency}
                />
            </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800">Category Breakdown</h3>
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
                            
                            return (
                                <tr key={item.cat.id} className="hover:bg-slate-50 transition">
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