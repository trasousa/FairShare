import React from 'react';
import { User, AccountType, SavingsGoal, ExpenseEntry, CurrencyCode } from '../types';
import { formatCurrency } from '../services/financeService';
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react';

interface AccountSummaryProps {
  type: AccountType;
  title: string;
  user?: User;
  spent: number;
  budget: number;
  savings: SavingsGoal[];
  entries: ExpenseEntry[];
  income?: number;
  currency: CurrencyCode;
}

export const AccountSummary: React.FC<AccountSummaryProps> = ({ type, title, user, spent, budget, savings, entries, income, currency }) => {
  
  const calculateGoalTotal = (goal: SavingsGoal) => {
      const contributed = entries
        .filter(e => e.categoryId === goal.id)
        .reduce((sum, e) => sum + e.amount, 0);
      return goal.initialAmount + contributed;
  };

  const totalCurrentSavings = savings.reduce((acc, s) => acc + calculateGoalTotal(s), 0);
  
  let colorClass = 'bg-purple-500';
  let lightClass = 'bg-purple-50';
  let textClass = 'text-purple-700';
  
  if (type === 'USER_1') {
    colorClass = 'bg-blue-500';
    lightClass = 'bg-blue-50';
    textClass = 'text-blue-700';
  } else if (type === 'USER_2') {
    colorClass = 'bg-pink-500';
    lightClass = 'bg-pink-50';
    textClass = 'text-pink-700';
  }

  const budgetProgress = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className={`p-4 border-b border-slate-100 flex items-center justify-between ${lightClass}`}>
        <div className="flex items-center gap-3">
           {user ? (
               <img src={user.avatar} className="w-10 h-10 rounded-full border-2 border-white" />
           ) : (
               <div className={`w-10 h-10 rounded-full ${colorClass} text-white flex items-center justify-center`}>
                  <Wallet size={20} />
               </div>
           )}
           <div>
               <h3 className={`font-bold ${textClass}`}>{title}</h3>
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
                  <div className={`h-full ${colorClass}`} style={{ width: `${budgetProgress}%` }}></div>
              </div>
              <div className="flex justify-between mt-1 text-xs text-slate-400">
                  <span>{Math.round(budgetProgress)}% of Budget</span>
                  <span>Target: {formatCurrency(budget, currency)}</span>
              </div>
          </div>

          {/* Savings Stat */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="flex items-center gap-2 mb-3 text-slate-500">
                  <PiggyBank size={16} />
                  <span className="text-sm font-semibold">Net Worth & Savings</span>
              </div>
              <div className="mb-3">
                 <span className="text-2xl font-bold text-slate-800">{formatCurrency(totalCurrentSavings, currency)}</span>
              </div>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                  {savings.map(goal => (
                      <div key={goal.id} className="flex justify-between text-xs border-b border-slate-100 last:border-0 pb-1">
                          <span className="text-slate-600">{goal.name}</span>
                          <span className="font-medium text-slate-900">{formatCurrency(calculateGoalTotal(goal), currency)}</span>
                      </div>
                  ))}
                  {savings.length === 0 && <span className="text-xs text-slate-400 italic">No savings goals tracked.</span>}
              </div>
          </div>
      </div>
    </div>
  );
};