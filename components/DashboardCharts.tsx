import React, { useState, useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { ExpenseEntry, Category, AccountType, IncomeEntry, User, CurrencyCode } from '../types';
import { formatCurrency } from '../services/financeService';
import { ChevronDown, ChevronUp, Wallet, User as UserIcon, Users } from 'lucide-react';

interface DashboardChartsProps {
  entries: ExpenseEntry[];
  categories: Category[];
  incomes: IncomeEntry[];
  users: Record<string, User>;
  currency: CurrencyCode;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ entries, categories, incomes, users, currency }) => {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [visibleBars, setVisibleBars] = useState<Record<string, boolean>>({
      INCOME: true,
      SHARED: true,
      USER_1: true,
      USER_2: true
  });

  if (!users || !users.user_1 || !users.user_2) {
      return <div className="p-8 text-center text-slate-400 font-medium">Preparing Dashboard...</div>;
  }

  // --- Data Processing for Charts ---
  const monthMap = new Map<string, { 
      month: string, 
      SHARED: number, USER_1: number, USER_2: number, 
      INCOME: number, 
      SAVINGS: number, SAVINGS_U1: number, SAVINGS_U2: number, SAVINGS_SHARED: number 
  }>();
  
  // Initialize map with all relevant months
  const allMonths = new Set([...incomes.map(i => i.monthId), ...entries.map(e => e.monthId)]);
  allMonths.forEach(m => {
      monthMap.set(m, { 
          month: m, 
          SHARED: 0, USER_1: 0, USER_2: 0, 
          INCOME: 0, 
          SAVINGS: 0, SAVINGS_U1: 0, SAVINGS_U2: 0, SAVINGS_SHARED: 0 
      });
  });

  incomes.forEach(inc => {
      if (monthMap.has(inc.monthId)) {
          const data = monthMap.get(inc.monthId)!;
          data.INCOME += inc.amount;
      }
  });

  entries.forEach(entry => {
      if (monthMap.has(entry.monthId)) {
          const data = monthMap.get(entry.monthId)!;
          const cat = categories.find(c => c.id === entry.categoryId);
          if (cat?.group === 'SAVINGS') {
              data.SAVINGS += entry.amount;
              if (entry.account === 'USER_1') data.SAVINGS_U1 += entry.amount;
              else if (entry.account === 'USER_2') data.SAVINGS_U2 += entry.amount;
              else data.SAVINGS_SHARED += entry.amount;
          } else {
              data[entry.account] += entry.amount;
          }
      }
  });

  const barData = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  // --- Wealth Calculation ---
  let wealthU1 = 0;
  let wealthU2 = 0;
  let wealthShared = 0;

  const wealthData = barData.map(item => {
      wealthU1 += item.SAVINGS_U1;
      wealthU2 += item.SAVINGS_U2;
      wealthShared += item.SAVINGS_SHARED;
      
      return {
          month: item.month,
          totalWealth: wealthU1 + wealthU2 + wealthShared,
          wealthU1,
          wealthU2,
          wealthShared,
          monthlySave: item.SAVINGS
      };
  });

  const catMap = new Map<string, number>();
  entries.forEach(entry => {
      const cat = categories.find(c => c.id === entry.categoryId);
      if (cat && cat.group !== 'SAVINGS') {
          const name = cat.name;
          catMap.set(name, (catMap.get(name) || 0) + entry.amount);
      }
  });

  const pieData = Array.from(catMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const COLORS = ['#6366f1', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

  // --- Totals for Summary Cards ---
  const totals = useMemo(() => {
      const t = { SHARED: 0, USER_1: 0, USER_2: 0 };
      entries.forEach(e => {
          const cat = categories.find(c => c.id === e.categoryId);
          if (cat?.group !== 'SAVINGS') {
              t[e.account] += e.amount;
          }
      });
      return t;
  }, [entries, categories]);

  // --- Grouping Logic ---
  const groupEntries = (filteredEntries: ExpenseEntry[], groupBy: 'CATEGORY' | 'CONSECUTIVE') => {
      if (groupBy === 'CATEGORY') {
          const map = new Map<string, { key: string, name: string, amount: number, account: AccountType, count: number, entries: ExpenseEntry[] }>();
          filteredEntries.forEach(e => {
              const cat = categories.find(c => c.id === e.categoryId);
              const key = cat?.name || 'Unknown';
              if (!map.has(key)) {
                  map.set(key, { key, name: key, amount: 0, account: e.account, count: 0, entries: [] });
              }
              const item = map.get(key)!;
              item.amount += e.amount;
              item.count += 1;
              item.entries.push(e);
          });
          return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
      } else {
          const sorted = [...filteredEntries].sort((a, b) => b.monthId.localeCompare(a.monthId));
          const groups: { key: string, name: string, amount: number, total: number, entries: ExpenseEntry[], account: AccountType }[] = [];
          if (sorted.length === 0) return [];

          let current = {
              key: sorted[0].id,
              name: categories.find(c => c.id === sorted[0].categoryId)?.name || 'Unknown',
              amount: sorted[0].amount,
              total: sorted[0].amount,
              entries: [sorted[0]],
              account: sorted[0].account
          };

          for (let i = 1; i < sorted.length; i++) {
              const e = sorted[i];
              const name = categories.find(c => c.id === e.categoryId)?.name || 'Unknown';
              if (name === current.name && Math.abs(e.amount - current.amount) < 0.01 && e.account === current.account) {
                  current.entries.push(e);
                  current.total += e.amount;
              } else {
                  groups.push(current);
                  current = { key: e.id, name, amount: e.amount, total: e.amount, entries: [e], account: e.account };
              }
          }
          groups.push(current);
          return groups.sort((a, b) => b.total - a.total).slice(0, 10);
      }
  };

  const fixedExpenses = useMemo(() => {
      return groupEntries(entries.filter(e => categories.find(c => c.id === e.categoryId)?.group === 'FIXED'), 'CATEGORY');
  }, [entries, categories]);

  const variableExpenses = useMemo(() => {
      return groupEntries(entries.filter(e => {
          const g = categories.find(c => c.id === e.categoryId)?.group;
          return g !== 'FIXED' && g !== 'SAVINGS';
      }), 'CONSECUTIVE');
  }, [entries, categories]);

  const toggleGroup = (key: string) => {
      setExpandedGroupId(prev => prev === key ? null : key);
  };

  const handleLegendClick = (dataKey: any) => {
      setVisibleBars(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  };

  const renderAccountLabel = (account: AccountType) => {
      const label = account === 'SHARED' ? 'Shared' : account === 'USER_1' ? users.user_1.name : users.user_2.name;
      const bg = account === 'SHARED' ? 'bg-purple-100 text-purple-700' : account === 'USER_1' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700';
      return <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ml-2 ${bg}`}>{label}</span>;
  };

  return (
    <div className="space-y-6">
        
        {/* Expense Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total Shared</p><p className="text-xl font-bold text-slate-800">{formatCurrency(totals.SHARED, currency)}</p></div>
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600"><Users size={20} /></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total {users.user_1.name}</p><p className="text-xl font-bold text-slate-800">{formatCurrency(totals.USER_1, currency)}</p></div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600"><UserIcon size={20} /></div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total {users.user_2.name}</p><p className="text-xl font-bold text-slate-800">{formatCurrency(totals.USER_2, currency)}</p></div>
                <div className="w-10 h-10 rounded-full bg-pink-100 flex items-center justify-center text-pink-600"><UserIcon size={20} /></div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Income vs Expenses Trend</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => { const [y, m] = val.split('-'); return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('default', { month: 'short' }); }} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val/1000}k`} />
                            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} cursor={{fill: '#f8fafc'}} />
                            <Legend iconType="circle" onClick={(e) => handleLegendClick(e.dataKey)} cursor="pointer" />
                            
                            {/* SEPARATE COLUMNS: Income vs Expenses */}
                            <Bar dataKey="INCOME" name="Total Income" stackId="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} hide={!visibleBars.INCOME} />
                            
                            <Bar dataKey="SHARED" name="Shared Exp" stackId="expenses" fill="#a855f7" radius={[0, 0, 0, 0]} hide={!visibleBars.SHARED} />
                            <Bar dataKey="USER_1" name={`${users.user_1.name} Exp`} stackId="expenses" fill="#3b82f6" radius={[0, 0, 0, 0]} hide={!visibleBars.USER_1} />
                            <Bar dataKey="USER_2" name={`${users.user_2.name} Exp`} stackId="expenses" fill="#ec4899" radius={[4, 4, 0, 0]} hide={!visibleBars.USER_2} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Net Worth Growth</h3>
                <p className="text-xs text-slate-400 mb-4">Cumulative savings & investments</p>
                <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={wealthData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorU1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorU2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/><stop offset="95%" stopColor="#ec4899" stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorShared" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.2}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} domain={['auto', 'auto']} />
                            <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                            
                            {/* Stacked Areas for Individual Contributions */}
                            <Area type="monotone" dataKey="wealthShared" name="Shared Wealth" stackId="1" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorShared)" />
                            <Area type="monotone" dataKey="wealthU1" name={`${users.user_1.name} Wealth`} stackId="1" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorU1)" />
                            <Area type="monotone" dataKey="wealthU2" name={`${users.user_2.name} Wealth`} stackId="1" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorU2)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                    <span className="text-2xl font-bold text-emerald-600">{formatCurrency(runningWealth, currency)}</span>
                    <span className="text-xs text-slate-400 block">Total Accumulated</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800">Where does the money go?</h3>
                 </div>
                 <div className="flex flex-col sm:flex-row items-center gap-6 h-64"> 
                     <div className="h-full w-48 relative shrink-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={pieData} 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={60} 
                                    outerRadius={80} 
                                    paddingAngle={4} 
                                    dataKey="value"
                                    cornerRadius={4}
                                >
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />)}
                                </Pie>
                            </PieChart>
                         </ResponsiveContainer>
                         <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">Top 10</span>
                         </div>
                     </div>
                     <div className="flex-1 w-full space-y-2 overflow-y-auto max-h-full pr-2 custom-scrollbar">
                         {pieData.map((entry, index) => (
                             <div key={index} className="flex justify-between items-center text-xs">
                                 <div className="flex items-center gap-2">
                                     <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                     <span className="text-slate-600 truncate max-w-[120px] font-medium">{entry.name}</span>
                                 </div>
                                 <span className="font-bold text-slate-800">{formatCurrency(entry.value, currency)}</span>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>

             <div className="space-y-6">
                 {/* Fixed Expenses Card */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <Wallet size={18} className="text-slate-400"/> Fixed & Recurring
                     </h3>
                     <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                         {fixedExpenses.map((group, idx) => {
                             const isExpanded = expandedGroupId === group.key;
                             return (
                                 <div key={idx} className="border-b border-slate-50 last:border-0 pb-2">
                                     <div 
                                        onClick={() => toggleGroup(group.key)}
                                        className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-1.5 -m-1.5 rounded-lg transition"
                                     >
                                         <div>
                                             <div className="flex items-center gap-2">
                                                 <span className="font-semibold text-slate-700 text-sm">{group.name}</span>
                                                 {group.count > 1 && (
                                                     <div className="text-slate-400">
                                                         {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                     </div>
                                                 )}
                                             </div>
                                             <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                 {group.count} transactions {renderAccountLabel(group.account)}
                                             </div>
                                         </div>
                                         <span className="font-bold text-slate-800 text-sm">{formatCurrency(group.amount, currency)}</span>
                                     </div>
                                     {isExpanded && (
                                         <div className="bg-slate-50 rounded-lg p-3 mt-2 text-xs space-y-2 animate-in fade-in slide-in-from-top-1">
                                             {group.entries.map((e, subIdx) => (
                                                 <div key={e.id} className="flex justify-between text-slate-500">
                                                     <span>{e.monthId}</span>
                                                     <span className="font-medium">{formatCurrency(e.amount, currency)}</span>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                         {fixedExpenses.length === 0 && <p className="text-xs text-slate-400">No fixed expenses found.</p>}
                     </div>
                 </div>

                 {/* Variable Expenses Card */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <ChevronUp size={18} className="text-slate-400"/> Top Variable Spending
                     </h3>
                     <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                         {variableExpenses.map((group, idx) => {
                             const isExpanded = expandedGroupId === group.key;
                             const count = group.entries.length;

                             return (
                                 <div key={group.key} className="border-b border-slate-50 last:border-0 pb-2">
                                     <div 
                                        onClick={() => count > 1 && toggleGroup(group.key)}
                                        className={`flex items-center justify-between py-1.5 cursor-pointer ${count > 1 ? 'hover:bg-slate-50 rounded-lg px-1.5 -mx-1.5 transition' : ''}`}
                                     >
                                         <div className="flex items-center gap-3">
                                             <div className="text-xs font-bold text-slate-300 w-4">#{idx+1}</div>
                                             <div>
                                                 <span className="block text-sm font-semibold text-slate-700">
                                                     {group.catName} {count > 1 && <span className="text-xs font-normal text-slate-400 ml-1">(x{count})</span>}
                                                 </span>
                                                 <div className="flex items-center mt-0.5">
                                                     {renderAccountLabel(group.account)}
                                                     {count === 1 && <span className="text-[10px] text-slate-400 ml-2">{group.entries[0].monthId}</span>}
                                                 </div>
                                             </div>
                                         </div>
                                         <div className="text-right">
                                             <span className="block font-bold text-slate-800 text-sm">{formatCurrency(group.total, currency)}</span>
                                             {count > 1 && (
                                                 <div className="text-slate-400 flex justify-end mt-0.5">
                                                     {isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                     
                                     {isExpanded && (
                                         <div className="bg-slate-50 rounded-lg p-3 mt-2 ml-7 text-xs space-y-2 animate-in fade-in slide-in-from-top-1">
                                             {group.entries.map((e, subIdx) => (
                                                 <div key={e.id} className="flex justify-between text-slate-500">
                                                     <span>{e.monthId} • {e.description || 'Entry'}</span>
                                                     <span className="font-medium">{formatCurrency(e.amount, currency)}</span>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                         {variableExpenses.length === 0 && <p className="text-xs text-slate-400">No variable expenses found.</p>}
                     </div>
                 </div>
             </div>
        </div>
    </div>
  );
};