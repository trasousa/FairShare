import React, { useState, useMemo } from 'react';
import { Budget, Category, AccountType, User, SavingsGoal, ExpenseEntry, CurrencyCode } from '../types';
import { formatCurrency } from '../services/financeService';
import { Plus, Target, X, Users, PiggyBank, TrendingUp, Calendar } from 'lucide-react';

interface BudgetManagerProps {
  budgets: Budget[];
  categories: Category[];
  savings: SavingsGoal[];
  entries: ExpenseEntry[];
  totalIncome: number;
  users: Record<string, User>;
  currency: CurrencyCode;
  getInputClass: (isInput?: boolean) => string;
  onAddBudget: (categoryId: string, limit: number, account: AccountType) => void;
  onAddGoal: (name: string, target: number, targetType: 'FIXED'|'PERCENTAGE', initial: number, account: AccountType, startDate?: string, targetDate?: string) => void;
}

export const BudgetManager: React.FC<BudgetManagerProps> = ({ budgets, categories, savings, entries, totalIncome, users, currency, getInputClass, onAddBudget, onAddGoal }) => {
  const [activeTab, setActiveTab] = useState<'BUDGETS' | 'GOALS'>('BUDGETS');
  const [isAdding, setIsAdding] = useState(false);
  
  const [selectedCatId, setSelectedCatId] = useState('');
  const [limit, setLimit] = useState('');
  const [selectedAccount, setSelectedAccount] = useState<AccountType>('SHARED');

  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalType, setGoalType] = useState<'FIXED' | 'PERCENTAGE'>('FIXED');
  const [goalInitial, setGoalInitial] = useState('');
  const [goalStartDate, setGoalStartDate] = useState('');
  const [goalTargetDate, setGoalTargetDate] = useState('');
  const [selectedYear, setSelectedYear] = useState('All');

  const availableCategories = categories.filter(c => 
    c.group !== 'SAVINGS' && c.group !== 'TRAVEL' &&
    !budgets.some(b => b.categoryId === c.id && b.account === selectedAccount)
  );

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    savings.forEach(goal => {
        if (goal.startDate) years.add(new Date(goal.startDate).getFullYear().toString());
    });
    return ['All', ...Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))];
  }, [savings]);

  const filteredSavings = useMemo(() => {
    if (selectedYear === 'All' || activeTab === 'BUDGETS') return savings;
    return savings.filter(goal => goal.startDate && new Date(goal.startDate).getFullYear().toString() === selectedYear);
  }, [savings, selectedYear, activeTab]);

  const handleBudgetSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedCatId && limit) {
          onAddBudget(selectedCatId, parseFloat(limit), selectedAccount);
          setIsAdding(false);
          setLimit('');
          setSelectedCatId('');
      }
  };

  const renderBudgetGroup = (account: AccountType, user?: User) => {
      const accountBudgets = budgets.filter(b => b.account === account);
      const totalBudget = accountBudgets.reduce((sum, b) => sum + b.limit, 0);
      const colorClass = account === 'SHARED' ? 'bg-purple-100 text-purple-700' : account === 'USER_1' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700';

      return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                      {user ? <img src={user.avatar} className="w-8 h-8 rounded-full border border-slate-200" /> : <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600"><Users size={16} /></div>}
                      <div>
                          <h4 className="font-bold text-slate-800">{user ? user.name : 'Shared Household'}</h4>
                          <p className="text-xs text-slate-500">Total Budget: {formatCurrency(totalBudget, currency)}</p>
                      </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${colorClass}`}>{accountBudgets.length} Categories</div>
              </div>
              <div className="p-4 space-y-3">
                  {accountBudgets.length === 0 && <p className="text-sm text-slate-400 italic text-center py-2">No budgets set.</p>}
                  {accountBudgets.map(b => {
                      const cat = categories.find(c => c.id === b.categoryId);
                      return (
                          <div key={b.categoryId} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-2 rounded-lg transition">
                              <span className="text-sm font-medium text-slate-700">{cat?.name}</span>
                              <span className="text-sm font-bold text-slate-600">{formatCurrency(b.limit, currency)}</span>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const handleGoalSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(goalName && goalTarget) {
          onAddGoal(goalName, parseFloat(goalTarget), goalType, parseFloat(goalInitial) || 0, selectedAccount, goalStartDate, goalTargetDate);
          setIsAdding(false);
          setGoalName('');
          setGoalTarget('');
          setGoalInitial('');
          setGoalType('FIXED');
          setGoalStartDate('');
          setGoalTargetDate('');
      }
  };

  const getGoalProgress = (goal: SavingsGoal) => {
      const contributed = entries.filter(e => e.categoryId === goal.id).reduce((sum, e) => sum + e.amount, 0);
      return goal.initialAmount + contributed;
  };

  const renderGoalCard = (goal: SavingsGoal) => {
      const current = getGoalProgress(goal);
      const targetVal = goal.targetType === 'PERCENTAGE' 
        ? totalIncome * (goal.targetAmount / 100) 
        : goal.targetAmount;
        
      const progress = targetVal > 0 ? Math.min((current / targetVal) * 100, 100) : 0;
      const accountLabel = goal.account === 'SHARED' ? 'Shared' : goal.account === 'USER_1' ? users.user_1.name : users.user_2.name;
      const accountColor = goal.account === 'SHARED' ? 'bg-purple-100 text-purple-700' : goal.account === 'USER_1' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700';

      return (
          <div key={goal.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h4 className="font-bold text-slate-800 text-lg">{goal.name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md mt-1 inline-block ${accountColor}`}>{accountLabel}</span>
                    </div>
                    <div className="h-10 w-10 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">
                        <TrendingUp size={20} />
                    </div>
                </div>
                <div className="mb-2 flex justify-between items-end">
                    <span className="text-2xl font-bold text-slate-700">{formatCurrency(current, currency)}</span>
                    <div className="text-right">
                         <span className="text-sm text-slate-400 block mb-0.5">
                             Target: {goal.targetType === 'PERCENTAGE' ? `${goal.targetAmount}% of Income` : formatCurrency(targetVal, currency)}
                         </span>
                         {goal.targetType === 'PERCENTAGE' && (
                             <span className="text-xs text-slate-300 font-medium">({formatCurrency(targetVal, currency)} approx)</span>
                         )}
                    </div>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                {(goal.startDate || goal.targetDate) && (
                    <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
                        <Calendar size={12} />
                        {goal.startDate && <span>{new Date(goal.startDate).toLocaleDateString()}</span>}
                        {goal.startDate && goal.targetDate && <span>→</span>}
                        {goal.targetDate && <span>{new Date(goal.targetDate).toLocaleDateString()}</span>}
                    </div>
                )}
              </div>
              <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center">
                   <span className="text-xs text-slate-400">Total Collected</span>
                   <span className="text-xs font-bold text-emerald-600">{Math.round(progress)}% Funded</span>
              </div>
          </div>
      );
  };

  if (!users || !users.user_1 || !users.user_2) return <div>Loading users...</div>;

  return (
    <div className="space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-200 pb-1">
             <button 
                onClick={() => { setActiveTab('BUDGETS'); setIsAdding(false); }}
                className={`pb-3 px-2 text-sm font-bold transition ${activeTab === 'BUDGETS' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
             >
                 Spending Budgets
             </button>
             <button 
                onClick={() => { setActiveTab('GOALS'); setIsAdding(false); }}
                className={`pb-3 px-2 text-sm font-bold transition ${activeTab === 'GOALS' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
             >
                 Savings & Goals
             </button>
        </div>

        <div className="flex justify-between items-center">
             <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 {activeTab === 'BUDGETS' ? <Target className="text-indigo-600" /> : <PiggyBank className="text-indigo-600" />}
                 {activeTab === 'BUDGETS' ? 'Budget Rules' : 'Financial Goals'}
             </h3>
             <div className="flex items-center gap-4">
                {activeTab === 'GOALS' && availableYears.length > 1 && (
                    <select 
                        value={selectedYear} 
                        onChange={e => setSelectedYear(e.target.value)}
                        className={getInputClass(false)}
                    >
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                )}
                <button 
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition shadow-sm"
                >
                    {isAdding ? <><X size={16}/> Cancel</> : <><Plus size={16}/> New {activeTab === 'BUDGETS' ? 'Budget' : 'Goal'}</>}
                </button>
             </div>
        </div>

        {isAdding && (
             <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md animate-in fade-in slide-in-from-top-2">
                 {activeTab === 'BUDGETS' ? (
                     <form onSubmit={handleBudgetSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="col-span-1 md:col-span-2">
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Account</label>
                             <div className="grid grid-cols-3 gap-2">
                                <button type="button" onClick={() => setSelectedAccount('SHARED')} className={`py-2 text-sm rounded-lg border ${selectedAccount === 'SHARED' ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Shared</button>
                                <button type="button" onClick={() => setSelectedAccount('USER_1')} className={`py-2 text-sm rounded-lg border ${selectedAccount === 'USER_1' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{users.user_1.name}</button>
                                <button type="button" onClick={() => setSelectedAccount('USER_2')} className={`py-2 text-sm rounded-lg border ${selectedAccount === 'USER_2' ? 'bg-pink-50 border-pink-200 text-pink-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{users.user_2.name}</button>
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
                            <select value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)} className={getInputClass(false)} required>
                                <option value="">Select category...</option>
                                {availableCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Monthly Limit</label>
                             <input type="number" value={limit} onChange={e => setLimit(e.target.value)} className={getInputClass()} placeholder="0.00" required />
                        </div>
                        <button type="submit" className="col-span-1 md:col-span-2 w-full bg-slate-900 text-white text-sm font-medium py-3 rounded-lg hover:bg-slate-800 transition">Save Budget</button>
                     </form>
                 ) : (
                     <form onSubmit={handleGoalSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="col-span-1 md:col-span-2">
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Goal Owner</label>
                             <div className="grid grid-cols-3 gap-2">
                                <button type="button" onClick={() => setSelectedAccount('SHARED')} className={`py-2 text-sm rounded-lg border ${selectedAccount === 'SHARED' ? 'bg-purple-50 border-purple-200 text-purple-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>Shared</button>
                                <button type="button" onClick={() => setSelectedAccount('USER_1')} className={`py-2 text-sm rounded-lg border ${selectedAccount === 'USER_1' ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{users.user_1.name}</button>
                                <button type="button" onClick={() => setSelectedAccount('USER_2')} className={`py-2 text-sm rounded-lg border ${selectedAccount === 'USER_2' ? 'bg-pink-50 border-pink-200 text-pink-700 font-bold' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{users.user_2.name}</button>
                             </div>
                        </div>
                        <div className="col-span-1 md:col-span-2">
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Goal Name</label>
                             <input type="text" value={goalName} onChange={e => setGoalName(e.target.value)} className={getInputClass()} placeholder="e.g. New Car Fund" required />
                        </div>
                        
                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Target Type</label>
                             <div className="flex bg-slate-100 rounded-lg p-1">
                                 <button type="button" onClick={() => setGoalType('FIXED')} className={`flex-1 py-1.5 text-xs rounded-md font-medium transition ${goalType === 'FIXED' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>Fixed Amount</button>
                                 <button type="button" onClick={() => setGoalType('PERCENTAGE')} className={`flex-1 py-1.5 text-xs rounded-md font-medium transition ${goalType === 'PERCENTAGE' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}>% of Income</button>
                             </div>
                        </div>

                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">{goalType === 'FIXED' ? 'Target Amount ($)' : 'Percentage (%)'}</label>
                             <input type="number" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none" placeholder={goalType === 'FIXED' ? '20000' : '20'} required />
                             {goalType === 'PERCENTAGE' && goalTarget && (
                                 <p className="text-[10px] text-slate-400 mt-1">Approx. {formatCurrency(totalIncome * (parseFloat(goalTarget)/100), currency)} based on current income.</p>
                             )}
                        </div>

                        <div>
                             <label className="block text-xs font-semibold text-slate-500 mb-1">Starting Balance</label>
                             <input type="number" value={goalInitial} onChange={e => setGoalInitial(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none" placeholder="0.00" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                                <input type="date" value={goalStartDate} onChange={e => setGoalStartDate(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Target Date</label>
                                <input type="date" value={goalTargetDate} onChange={e => setGoalTargetDate(e.target.value)} className="w-full text-sm border border-slate-300 rounded-lg p-2.5 outline-none" />
                            </div>
                        </div>

                        <button type="submit" className="col-span-1 md:col-span-2 w-full bg-slate-900 text-white text-sm font-medium py-3 rounded-lg hover:bg-slate-800 transition">Create Goal</button>
                     </form>
                 )}
             </div>
        )}

        {activeTab === 'BUDGETS' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {renderBudgetGroup('SHARED')}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {renderBudgetGroup('USER_1', users.user_1)}
                        {renderBudgetGroup('USER_2', users.user_2)}
                    </div>
                </div>
                <div className="lg:col-span-1">
                    <div className="bg-indigo-900 text-white rounded-xl shadow-lg p-6 sticky top-24">
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4 text-2xl">💡</div>
                        <h3 className="text-lg font-bold mb-2">Budgeting Strategy</h3>
                        <p className="text-indigo-200 text-sm leading-relaxed mb-4">
                            Assign budgets to specific people to track personal spending limits, or use the Shared account for household caps.
                        </p>
                    </div>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSavings.map(renderGoalCard)}
                {filteredSavings.length === 0 && (
                    <div className="col-span-3 text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <PiggyBank className="mx-auto text-slate-300 mb-4" size={48} />
                        <h3 className="text-lg font-semibold text-slate-500">No Goals Found</h3>
                        <p className="text-slate-400 text-sm">Create a savings goal or adjust your filter to start tracking.</p>
                    </div>
                )}
            </div>
        )}
    </div>
  );
};