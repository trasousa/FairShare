import React, { useMemo, useState } from 'react';
import { ExpenseEntry, Budget, Category, SavingsGoal, IncomeEntry, User, CurrencyCode, AccountType } from '../types';
import { AccountSummary } from './AccountSummary';
import { formatCurrency, getMonthLabel } from '../services/financeService';
import { TrendingUp, AlertCircle, CheckCircle2, ChevronRight, ChevronDown, Filter, GitFork, List, MessageSquare, Info } from 'lucide-react';
import { ResponsiveContainer, Sankey, Tooltip as RechartsTooltip, Layer, Rectangle } from 'recharts';
import { AppTooltip } from './AppTooltip';

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
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});
  const [viewMode, setViewMode] = useState<'LIST' | 'FLOW'>('LIST');
  const [filterAccount, setFilterAccount] = useState<'ALL' | AccountType>('ALL');

  const monthlyEntries = useMemo(() => 
    entries.filter(e => e.monthId === currentMonth), 
  [entries, currentMonth]);

  const monthlyIncomes = incomes.filter(i => i.monthId === currentMonth);
  
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
      return !cat || cat.group !== 'SAVINGS';
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
      let target = 0;
      if (goal.targetType === 'FIXED') {
          // Fixed savings goals are handled via contributions, no simple monthly target for now
          return sum; 
      } else {
          const baseIncome = goal.projectionPeriod === 'ANNUAL' ? totalIncome * 12 : totalIncome;
          target = baseIncome * (goal.targetAmount / 100);
          // If annual, divide by 12 to get monthly requirement
          if (goal.projectionPeriod === 'ANNUAL') target /= 12;
          return sum + target;
      }
  }, 0);
  
  const displaySavingsTarget = monthlySavingsTarget > 0 ? monthlySavingsTarget : (totalIncome * 0.2);

  const { savingsShared, savingsU1, savingsU2 } = useMemo(() => {
    return {
      savingsShared: savingsEntries.filter(e => e.account === 'SHARED').reduce((sum, e) => sum + e.amount, 0),
      savingsU1: savingsEntries.filter(e => e.account === 'USER_1').reduce((sum, e) => sum + e.amount, 0),
      savingsU2: savingsEntries.filter(e => e.account === 'USER_2').reduce((sum, e) => sum + e.amount, 0)
    };
  }, [savingsEntries]);

  const attributedU1 = savingsU1 + (savingsShared * user1Ratio);
  const attributedU2 = savingsU2 + (savingsShared * (1 - user1Ratio));

  const budgetTotals = useMemo(() => {
      const acc = { SHARED: 0, USER_1: 0, USER_2: 0 };
      budgets.forEach(b => {
          const cat = categories.find(c => c.id === b.categoryId);
          if (cat) acc[cat.defaultAccount] += b.limit;
      });
      return acc;
  }, [budgets, categories]);

  const sharedBudgetNeed = budgetTotals.SHARED; 
  const fairShareBase = Math.max(totals.SHARED, sharedBudgetNeed);
  
  const user1Contribution = fairShareBase * user1Ratio;
  const user2Contribution = fairShareBase * (1 - user1Ratio);

  const groupedBreakdown = useMemo(() => {
    const filteredEntries = filterAccount === 'ALL' 
        ? monthlyEntries 
        : monthlyEntries.filter(e => e.account === filterAccount);

    const groups: Record<string, any> = {};
    
    // Create a map of categories grouped by name + group
    const uniqueCategoryGroups: Record<string, { name: string, group: string, ids: string[] }> = {};
    categories.forEach(c => {
        const key = `${c.name}|${c.group}`;
        if (!uniqueCategoryGroups[key]) {
            uniqueCategoryGroups[key] = { name: c.name, group: c.group, ids: [] };
        }
        uniqueCategoryGroups[key].ids.push(c.id);
    });

    Object.values(uniqueCategoryGroups).forEach(uCat => {
        const entriesForCat = filteredEntries.filter(e => uCat.ids.includes(e.categoryId));
        const budget = budgets.filter(b => uCat.ids.includes(b.categoryId)).reduce((sum, b) => sum + b.limit, 0);
        
        if (entriesForCat.length === 0 && budget === 0) return;

        const spentByUser1 = entriesForCat.filter(e => e.account === 'USER_1').reduce((sum, e) => sum + e.amount, 0);
        const spentByUser2 = entriesForCat.filter(e => e.account === 'USER_2').reduce((sum, e) => sum + e.amount, 0);
        const spentShared = entriesForCat.filter(e => e.account === 'SHARED').reduce((sum, e) => sum + e.amount, 0);
        const totalSpent = spentByUser1 + spentByUser2 + spentShared;

        if (!groups[uCat.group]) {
            groups[uCat.group] = {
                name: uCat.group,
                spentByUser1: 0,
                spentByUser2: 0,
                spentShared: 0,
                totalSpent: 0,
                totalBudget: 0,
                items: []
            };
        }

        groups[uCat.group].spentByUser1 += spentByUser1;
        groups[uCat.group].spentByUser2 += spentByUser2;
        groups[uCat.group].spentShared += spentShared;
        groups[uCat.group].totalSpent += totalSpent;
        groups[uCat.group].totalBudget += budget;
        groups[uCat.group].items.push({
            name: uCat.name,
            ids: uCat.ids,
            spentByUser1,
            spentByUser2,
            spentShared,
            totalSpent,
            budget
        });
    });

    // Handle Uncategorized
    const knownCatIds = categories.map(c => c.id);
    const uncategorizedEntries = filteredEntries.filter(e => !knownCatIds.includes(e.categoryId));
    if (uncategorizedEntries.length > 0) {
        const uGroup = 'OTHER';
        if (!groups[uGroup]) {
            groups[uGroup] = { name: uGroup, spentByUser1: 0, spentByUser2: 0, spentShared: 0, totalSpent: 0, totalBudget: 0, items: [] };
        }
        const s1 = uncategorizedEntries.filter(e => e.account === 'USER_1').reduce((sum, e) => sum + e.amount, 0);
        const s2 = uncategorizedEntries.filter(e => e.account === 'USER_2').reduce((sum, e) => sum + e.amount, 0);
        const ss = uncategorizedEntries.filter(e => e.account === 'SHARED').reduce((sum, e) => sum + e.amount, 0);
        groups[uGroup].spentByUser1 += s1;
        groups[uGroup].spentByUser2 += s2;
        groups[uGroup].spentShared += ss;
        groups[uGroup].totalSpent += (s1 + s2 + ss);
        groups[uGroup].items.push({ name: 'Uncategorized', ids: [], spentByUser1: s1, spentByUser2: s2, spentShared: ss, totalSpent: s1+s2+ss, budget: 0 });
    }

    return Object.values(groups).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [categories, monthlyEntries, filterAccount, budgets]);

  const sankeyData = useMemo(() => {
    const GREEN = '#10b981';
    const RED = '#ef4444';
    const INDIGO = '#6366f1';

    const nodes: any[] = [
      { name: users.user_1.name, color: GREEN }, // 0
      { name: users.user_2.name, color: GREEN }, // 1
      { name: 'Total Pot', color: INDIGO }       // 2
    ];
    
    const links: any[] = [];
    
    const valIncomeU1 = isNaN(incomeU1) ? 0 : incomeU1;
    const valIncomeU2 = isNaN(incomeU2) ? 0 : incomeU2;

    if (valIncomeU1 > 0) links.push({ source: 0, target: 2, value: valIncomeU1 });
    if (valIncomeU2 > 0) links.push({ source: 1, target: 2, value: valIncomeU2 });

    let nodeIndex = 3;
    const totalSpent = monthlyEntries.reduce((sum, e) => sum + e.amount, 0);

    const groups = ['FIXED', 'VARIABLE', 'LIFESTYLE', 'SAVINGS', 'TRAVEL'];
    
    groups.forEach(groupName => {
        const groupEntries = monthlyEntries.filter(e => {
            const cat = categories.find(c => c.id === e.categoryId);
            return cat?.group === groupName;
        });

        const groupTotal = isNaN(groupEntries.reduce((sum, e) => sum + e.amount, 0)) ? 0 : groupEntries.reduce((sum, e) => sum + e.amount, 0);
        if (groupTotal <= 0) return;

        const groupNodeIdx = nodeIndex++;
        nodes.push({ 
            name: groupName, 
            color: groupName === 'SAVINGS' ? GREEN : RED 
        });
        
        links.push({
            source: 2,
            target: groupNodeIdx,
            value: groupTotal
        });

        const catMap = new Map<string, number>();
        groupEntries.forEach(e => {
            const cat = categories.find(c => c.id === e.categoryId);
            const name = cat?.name || 'Unknown';
            catMap.set(name, (catMap.get(name) || 0) + e.amount);
        });

        catMap.forEach((val, name) => {
            const catNodeIdx = nodeIndex++;
            nodes.push({ name, color: groupName === 'SAVINGS' ? GREEN : RED });
            links.push({
                source: groupNodeIdx,
                target: catNodeIdx,
                value: val
            });
        });
    });

    const unallocated = isNaN(totalIncome - totalSpent) ? 0 : totalIncome - totalSpent;
    if (unallocated > 0.01) {
        nodes.push({ name: 'Unallocated', color: GREEN });
        links.push({
            source: 2,
            target: nodeIndex++,
            value: unallocated
        });
    }

    const validLinks = links.filter(l => typeof l.value === 'number' && l.value > 0);

    return { nodes, links: validLinks };
  }, [categories, monthlyEntries, incomeU1, incomeU2, totalIncome, users]);

  const toggleGroup = (groupId: string) => {
      setExpandedGroupIds(prev => ({
          ...prev,
          [groupId]: !prev[groupId]
      }));
  };

  const toggleCat = (id: string) => {
      setExpandedCatId(prev => prev === id ? null : id);
  };

  if (!users || !users.user_1 || !users.user_2) {
      return <div className="p-8 text-center text-slate-400">Loading user data...</div>;
  }

    return (
    <div className="space-y-8">
        
        {/* Mobile-Only Summary View */}
        <div className="md:hidden grid grid-cols-2 gap-3 mb-2">
            <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg">
                <span className="text-[10px] uppercase tracking-wider opacity-80 block mb-1">Total Spent</span>
                <span className="text-xl font-bold">{formatCurrency(totals.SHARED + totals.USER_1 + totals.USER_2, currency)}</span>
            </div>
            <div className="bg-emerald-600 rounded-2xl p-4 text-white shadow-lg">
                <span className="text-[10px] uppercase tracking-wider opacity-80 block mb-1">Savings</span>
                <span className="text-xl font-bold">{formatCurrency(monthlySavingsTotal, currency)}</span>
            </div>
            <div className="bg-slate-800 rounded-2xl p-4 text-white shadow-lg col-span-2 flex justify-between items-center">
                <div>
                    <span className="text-[10px] uppercase tracking-wider opacity-80 block mb-1">Shared Pot Status</span>
                    <span className="text-sm font-bold">{formatCurrency(totals.SHARED, currency)} / {formatCurrency(sharedBudgetNeed, currency)}</span>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-white/20 flex items-center justify-center">
                    <span className="text-[10px] font-bold">{sharedBudgetNeed > 0 ? Math.round((totals.SHARED / sharedBudgetNeed) * 100) : 0}%</span>
                </div>
            </div>
        </div>

        {/* 1. Account Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 h-auto">
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
            <div className="col-span-1 sm:col-span-2 lg:col-span-1">
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
                        { 
                            label: 'Shared', 
                            val: savingsShared, 
                            color: users.shared?.color, 
                            avatar: users.shared?.avatar, 
                            pct: null,
                            breakdown: [
                                { label: users.user_1.name, val: savingsShared * user1Ratio },
                                { label: users.user_2.name, val: savingsShared * (1 - user1Ratio) }
                            ]
                        },
                        { label: users.user_1.name, val: savingsU1, color: users.user_1.color, avatar: users.user_1.avatar, pct: monthlySavingsTotal > 0 ? (attributedU1 / monthlySavingsTotal) * 100 : 0 },
                        { label: users.user_2.name, val: savingsU2, color: users.user_2.color, avatar: users.user_2.avatar, pct: monthlySavingsTotal > 0 ? (attributedU2 / monthlySavingsTotal) * 100 : 0 }
                    ].map((item, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/5">
                            <div className="flex items-center gap-1.5 mb-1">
                                <img src={item.avatar} className="w-3.5 h-3.5 rounded-full" />
                                <span className="text-[10px] text-emerald-200 truncate">{item.label}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-xs font-bold">{formatCurrency(item.val, currency)}</span>
                                {item.pct !== null ? (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-emerald-300 opacity-80">
                                            Total: {Math.round(item.pct)}%
                                        </span>
                                        <AppTooltip content={`Total attributed wealth (Personal savings + ${Math.round(item.label === users.user_1.name ? user1Ratio*100 : (1-user1Ratio)*100)}% of shared savings)`}>
                                            <Info size={8} className="text-emerald-300/50 cursor-help" />
                                        </AppTooltip>
                                    </div>
                                ) : item.breakdown ? (
                                    <div className="flex flex-col mt-0.5 border-t border-white/5 pt-0.5">
                                        {item.breakdown.map((b, bi) => (
                                            <span key={bi} className="text-[9px] text-emerald-300/80 leading-tight">
                                                {b.label.split(' ')[0]}: {formatCurrency(b.val, currency)}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
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

        {/* 3. Category Breakdown & Flow */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="font-bold text-slate-800">Expense Analysis</h3>
                    <p className="text-xs text-slate-400 mt-1">Detailed breakdown of your spending habits.</p>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl w-fit">
                    <button 
                        onClick={() => setViewMode('LIST')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition ${viewMode === 'LIST' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <List size={14} /> List
                    </button>
                    <button 
                        onClick={() => setViewMode('FLOW')}
                        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg transition ${viewMode === 'FLOW' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <GitFork size={14} /> Flow
                    </button>
                </div>
            </div>

            <div className="px-6 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Account:</span>
                    <div className="flex gap-1 ml-2">
                        {['ALL', 'SHARED', 'USER_1', 'USER_2'].map(acc => (
                            <button 
                                key={acc}
                                onClick={() => setFilterAccount(acc as any)}
                                className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${filterAccount === acc ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
                            >
                                {acc === 'ALL' ? 'All' : acc === 'SHARED' ? 'Shared' : acc === 'USER_1' ? users.user_1.name : users.user_2.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {viewMode === 'LIST' ? (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Category Group</th>
                                <th className="px-6 py-3 text-right">{users.user_1.name}</th>
                                <th className="px-6 py-3 text-right">{users.user_2.name}</th>
                                <th className="px-6 py-3 text-right">Shared</th>
                                <th className="px-6 py-3 text-right font-bold">Total</th>
                                <th className="px-6 py-3 text-right">Budget</th>
                                <th className="px-6 py-3 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {groupedBreakdown.map((group) => {
                                const isGroupExpanded = expandedGroupIds[group.name];
                                const groupOver = group.totalBudget > 0 && group.totalSpent > group.totalBudget;

                                return (
                                    <React.Fragment key={group.name}>
                                        <tr onClick={() => toggleGroup(group.name)} className={`cursor-pointer transition bg-slate-50/30 ${isGroupExpanded ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                                            <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                                                {isGroupExpanded ? <ChevronDown size={16} className="text-indigo-500" /> : <ChevronRight size={16} className="text-slate-400" />}
                                                {group.name}
                                                <span className="ml-2 px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[9px] font-bold">{group.items.length}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-slate-600 font-medium">{formatCurrency(group.spentByUser1, currency)}</td>
                                            <td className="px-6 py-4 text-right text-slate-600 font-medium">{formatCurrency(group.spentByUser2, currency)}</td>
                                            <td className="px-6 py-4 text-right text-slate-600 font-medium">{formatCurrency(group.spentShared, currency)}</td>
                                            <td className={`px-6 py-4 text-right font-bold ${group.name === 'SAVINGS' ? 'text-emerald-600' : 'text-slate-900'}`}>{formatCurrency(group.totalSpent, currency)}</td>
                                            <td className="px-6 py-4 text-right text-slate-400">{group.totalBudget > 0 ? formatCurrency(group.totalBudget, currency) : '-'}</td>
                                            <td className="px-6 py-4 text-right">
                                                {group.totalBudget > 0 ? (
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${groupOver ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                        {Math.round((group.totalSpent / group.totalBudget) * 100)}%
                                                    </span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                        </tr>
                                        {isGroupExpanded && group.items.map((item: any) => {
                                            const isCatExpanded = expandedCatId === item.name; // Use name as unique key for expansion within group
                                            const isOver = item.budget > 0 && item.totalSpent > item.budget;
                                            
                                            return (
                                                <React.Fragment key={item.name}>
                                                    <tr onClick={(e) => { e.stopPropagation(); toggleCat(item.name); }} className={`cursor-pointer transition border-l-4 ${isCatExpanded ? 'bg-white border-indigo-400' : 'hover:bg-slate-50/50 border-transparent'}`}>
                                                        <td className="px-10 py-3 font-medium text-slate-600 flex items-center gap-2">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                            {item.name}
                                                        </td>
                                                        <td className="px-6 py-3 text-right text-slate-500 text-xs">{formatCurrency(item.spentByUser1, currency)}</td>
                                                        <td className="px-6 py-3 text-right text-slate-500 text-xs">{formatCurrency(item.spentByUser2, currency)}</td>
                                                        <td className="px-6 py-3 text-right text-slate-500 text-xs">{formatCurrency(item.spentShared, currency)}</td>
                                                        <td className="px-6 py-3 text-right font-semibold text-slate-700">{formatCurrency(item.totalSpent, currency)}</td>
                                                        <td className="px-6 py-3 text-right text-slate-400 text-xs">{item.budget > 0 ? formatCurrency(item.budget, currency) : '-'}</td>
                                                        <td className="px-6 py-3 text-right">
                                                            {item.budget > 0 && (
                                                                <div className="w-16 h-1.5 bg-slate-100 rounded-full ml-auto overflow-hidden">
                                                                    <div className={`h-full ${isOver ? 'bg-red-400' : 'bg-indigo-400'}`} style={{ width: `${Math.min((item.totalSpent / item.budget) * 100, 100)}%` }}></div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                    {isCatExpanded && (
                                                        <tr>
                                                            <td colSpan={7} className="bg-slate-50/80 p-0">
                                                                <div className="px-14 py-4 space-y-2 border-b border-slate-100">
                                                                    {monthlyEntries.filter(e => item.ids.includes(e.categoryId) || (item.name === 'Uncategorized' && !knownCatIds.includes(e.categoryId))).sort((a,b) => (b.date||'').localeCompare(a.date||'')).map(entry => (
                                                                        <div key={entry.id} className="flex justify-between items-center text-[11px] text-slate-600 pl-4 border-l-2 border-slate-200">
                                                                            <div className="flex items-center gap-3">
                                                                                <span className="text-slate-400 font-mono w-16">{entry.date?.split('-').slice(1).join('/') || entry.monthId}</span>
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <img src={entry.account === 'SHARED' ? users.shared?.avatar : entry.account === 'USER_1' ? users.user_1?.avatar : users.user_2?.avatar} className="w-3.5 h-3.5 rounded-full" />
                                                                                    <span className="font-medium text-slate-500">{entry.account === 'SHARED' ? 'Shared' : entry.account === 'USER_1' ? users.user_1.name : entry.account === 'USER_2' ? users.user_2.name : 'Unknown'}</span>
                                                                                </div>
                                                                                {entry.description && (
                                                                                    <AppTooltip content={entry.description}>
                                                                                        <div className="flex items-center gap-1 cursor-help">
                                                                                            <MessageSquare size={10} className="text-slate-300" />
                                                                                            <span className="text-slate-400 italic truncate max-w-[200px]">- {entry.description}</span>
                                                                                        </div>
                                                                                    </AppTooltip>
                                                                                )}
                                                                            </div>
                                                                            <span className="font-bold text-slate-700">{formatCurrency(entry.amount, currency)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-4 sm:p-8">
                    <div className="h-[600px] w-full bg-slate-50/50 rounded-3xl p-6 border border-slate-100">
                        <ResponsiveContainer width="100%" height="100%">
                            <Sankey
                                data={sankeyData}
                                node={{ stroke: '#fff', strokeWidth: 2 }}
                                link={(linkProps: any) => {
                                    const { source, target, value } = linkProps;
                                    if (!source || !target || !sankeyData.nodes[target.index]) return null;
                                    const targetNode = sankeyData.nodes[target.index];
                                    const linkColor = targetNode.color;
                                    const strokeWidth = Math.max(1.5, Math.sqrt(value / totalIncome) * 20); 
                                    return (
                                        <g><path d={linkProps.path} stroke={linkColor} strokeWidth={strokeWidth} strokeOpacity={0.6} fill="none" /></g>
                                    );
                                }}
                                nodePadding={20} 
                                margin={{ top: 20, bottom: 20, left: 10, right: 10 }}
                            >
                                <RechartsTooltip 
                                    content={({ active, payload }: any) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            const isNode = data.source === undefined;
                                            return (
                                                <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-white/10 text-xs">
                                                    <p className="font-bold mb-1">{isNode ? data.name : `${data.source.name} → ${data.target.name}`}</p>
                                                    <p className="text-indigo-300 font-mono">{formatCurrency(data.value, currency)}</p>
                                                    {isNode && totalIncome > 0 && data.name !== 'Total Pot' && <p className="text-[10px] opacity-60 mt-1">{((data.value / totalIncome) * 100).toFixed(1)}% of total</p>}
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Layer>
                                    {sankeyData.nodes.map((node, i) => {
                                        const { x, y, dx, dy, name, color } = node;
                                        const isRight = x > 500; 
                                        return (
                                            <g key={`node-${i}`}>
                                                <Rectangle x={x} y={y} width={dx} height={dy} fill={color} radius={[4, 4, 4, 4]} />
                                                <text
                                                    x={isRight ? x - 10 : x + dx + 10}
                                                    y={y + dy / 2}
                                                    textAnchor={isRight ? 'end' : 'start'}
                                                    fontSize="11"
                                                    fontWeight="bold"
                                                    fill="#475569"
                                                    dominantBaseline="central"
                                                >
                                                    {name}
                                                </text>
                                            </g>
                                        );
                                    })}
                                </Layer>
                            </Sankey>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-6 flex flex-wrap justify-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Income & Savings</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expenses</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#6366f1]"></div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Pot</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
    );
};
