import React from 'react';
import { User, AccountType, SavingsGoal, ExpenseEntry, CurrencyCode, Budget, Category } from '../types';
import { formatCurrency } from '../services/financeService';
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react';

interface AccountSummaryProps {
  type: AccountType;
  title: string;
  user?: User;
  spent: number;
  budget: number;
  budgets: Budget[];
  categories: Category[];
  budgetEntries: ExpenseEntry[];
  savings: SavingsGoal[];
  entries: ExpenseEntry[];
  income?: number;
  currency: CurrencyCode;
  color?: string;
}

export const AccountSummary: React.FC<AccountSummaryProps> = ({ type, title, user, spent, budget, budgets = [], categories = [], budgetEntries = [], savings, entries, income, currency, color = '#64748b' }) => {
  
  const totalMonthlySavings = savings.reduce((acc, goal) => {
      const contributed = budgetEntries
        .filter(e => e.categoryId === goal.id && e.account === type)
        .reduce((sum, e) => sum + e.amount, 0);
      return acc + contributed;
  }, 0);

  const budgetProgress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  const accountBudgets = budgets.filter(b => b.account === type);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div 
        className="p-4 border-b border-slate-100 flex items-center justify-between"
        style={{ backgroundColor: `${color}15` }}
      >
        <div className="flex items-center gap-3">
           {user ? (
               <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white" style={{ borderColor: color }} />
           ) : (
               <div className="w-10 h-10 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: color }}>
                  <Wallet size={20} />
               </div>
           )}
           <div>
               <h3 className="font-bold" style={{ color: color }}>{title}</h3>
               <p className="text-xs text-slate-500 opacity-80 uppercase tracking-wider">{type === 'SHARED' ? 'Combined' : 'Personal'}</p>
           </div>
        </div>
        {income && (
            <div className="text-right">
                <span className="text-xs text-slate-400 block">Monthly Income</span>
                <span className="font-semibold text-slate-700">{formatCurrency(income, currency)}</span>
            </div>
        )}
      </div>

      <div className="p-5 space-y-6 flex-1">
          {/* Spending Stat */}
          <div>
              <div className="flex justify-between items-end mb-2">
                  <span className="text-sm text-slate-500 flex items-center gap-2"><Wallet size={14}/> Spent this Month</span>
                  <span className="text-xl font-bold text-slate-800">{formatCurrency(spent, currency)}</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="h-full" style={{ width: `${budgetProgress}%`, backgroundColor: color }}></div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-slate-400">
                  <span>{Math.round(budgetProgress)}% of Total Budget</span>
                  <span>Target: {formatCurrency(budget, currency)}</span>
              </div>

              {/* Individual Budgets Breakdown */}
              {accountBudgets.length > 0 && (
                  <div className="mt-5 pt-4 border-t border-slate-50 space-y-3">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Budget Breakdown</p>
                      {accountBudgets.map(b => {
                          const cat = categories.find(c => c.id === b.categoryId);
                          if (!cat) return null;
                          const catSpent = budgetEntries
                              .filter(e => e.categoryId === cat.id && e.account === type)
                              .reduce((sum, e) => sum + e.amount, 0);
                          const percent = b.limit > 0 ? Math.min((catSpent / b.limit) * 100, 100) : 0;
                          const isOver = catSpent > b.limit;
                          
                          return (
                              <div key={b.categoryId}>
                                  <div className="flex justify-between text-xs mb-1">
                                      <span className="text-slate-600 font-medium truncate max-w-[120px]">{cat.name}</span>
                                      <span className={isOver ? 'text-red-500 font-bold' : 'text-slate-700'}>
                                          {formatCurrency(catSpent, currency)} <span className="text-slate-400 font-normal">/ {formatCurrency(b.limit, currency)}</span>
                                      </span>
                                  </div>
                                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${isOver ? 'bg-red-500' : ''}`} 
                                        style={{ width: `${percent}%`, backgroundColor: isOver ? undefined : color, opacity: isOver ? 1 : 0.7 }}
                                      ></div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>

          {/* Savings Stat */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-slate-500">
                  <PiggyBank size={16} />
                  <span className="text-sm font-semibold">Monthly Savings</span>
              </div>
              <div className="mb-3">
                 <span className="text-2xl font-bold text-slate-800">{formatCurrency(totalMonthlySavings, currency)}</span>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {savings.map(goal => {
                      const contributed = budgetEntries
                        .filter(e => e.categoryId === goal.id && e.account === type)
                        .reduce((sum, e) => sum + e.amount, 0);
                      
                      if (contributed === 0) return null;

                      return (
                        <div key={goal.id} className="flex justify-between text-xs border-b border-slate-100 last:border-0 pb-1">
                            <span className="text-slate-600 truncate max-w-[140px]">{goal.name}</span>
                            <span className="font-medium text-slate-900">{formatCurrency(contributed, currency)}</span>
                        </div>
                      );
                  })}
                  {totalMonthlySavings === 0 && <span className="text-xs text-slate-400 italic">No savings this month.</span>}
              </div>
          </div>
      </div>
    </div>
  );
};