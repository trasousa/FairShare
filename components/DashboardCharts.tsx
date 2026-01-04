import React, { useState } from 'react';
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
import { ChevronDown, ChevronUp } from 'lucide-react';

interface DashboardChartsProps {
  entries: ExpenseEntry[];
  categories: Category[];
  incomes: IncomeEntry[];
  users: Record<string, User>;
  currency: CurrencyCode;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ entries, categories, incomes, users, currency }) => {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const monthMap = new Map<string, { month: string, SHARED: number, USER_1: number, USER_2: number, INCOME: number, SAVINGS: number }>();
  
  incomes.forEach(inc => {
      if (!monthMap.has(inc.monthId)) {
          monthMap.set(inc.monthId, { month: inc.monthId, SHARED: 0, USER_1: 0, USER_2: 0, INCOME: 0, SAVINGS: 0 });
      }
      const data = monthMap.get(inc.monthId)!;
      data.INCOME += inc.amount;
  });

  entries.forEach(entry => {
      if (!monthMap.has(entry.monthId)) {
          monthMap.set(entry.monthId, { month: entry.monthId, SHARED: 0, USER_1: 0, USER_2: 0, INCOME: 0, SAVINGS: 0 });
      }
      const data = monthMap.get(entry.monthId)!;
      const cat = categories.find(c => c.id === entry.categoryId);
      // Ensure SAVINGS includes investments if they are mapped to savings group
      if (cat?.group === 'SAVINGS') {
          data.SAVINGS += entry.amount;
      } else {
          data[entry.account] += entry.amount;
      }
  });

  const barData = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  let runningWealth = 0;
  const wealthData = barData.map(item => {
      runningWealth += item.SAVINGS;
      return {
          month: item.month,
          wealth: runningWealth,
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

  // Group transactions logic
  const groupedTransactions = React.useMemo(() => {
      const groups = new Map<string, { key: string, categoryId: string, amount: number, entries: ExpenseEntry[] }>();
      
      entries.forEach(e => {
          const cat = categories.find(c => c.id === e.categoryId);
          if (!cat || cat.group === 'SAVINGS') return; // Skip savings in expense list

          const key = `${e.categoryId}-${e.amount}`;
          if (!groups.has(key)) {
              groups.set(key, { key, categoryId: e.categoryId, amount: e.amount, entries: [] });
          }
          groups.get(key)!.entries.push(e);
      });

      return Array.from(groups.values())
          .sort((a, b) => (b.amount * b.entries.length) - (a.amount * a.entries.length)) // Sort by total impact? Or single amount? User wanted "biggest expenses".
          // If I have 12 rents of 1000 (12000 total) and 1 car of 5000. Rent is bigger impact.
          // Let's sort by *Total Group Amount* to reflect true "weight".
          .slice(0, 10);
  }, [entries, categories]);

  const toggleGroup = (key: string) => {
      setExpandedGroupId(prev => prev === key ? null : key);
  };

  return (
    <div className="space-y-6">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Income vs Expenses Trend</h3>
                <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis 
                                dataKey="month" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 12}} 
                                tickFormatter={(val) => {
                                    const [y, m] = val.split('-');
                                    return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('default', { month: 'short' });
                                }}
                            />
                            <YAxis 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#64748b', fontSize: 12}}
                                tickFormatter={(val) => `${val/1000}k`}
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                cursor={{fill: '#f8fafc'}}
                            />
                            <Legend iconType="circle" />
                            <Bar dataKey="INCOME" name="Total Income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
                            <Bar dataKey="SHARED" name="Shared Exp" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="USER_1" name={`${users.user_1.name} Exp`} stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                            <Bar dataKey="USER_2" name={`${users.user_2.name} Exp`} stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
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
                                <linearGradient id="colorWealth" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} domain={['auto', 'auto']} />
                            <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                            <Area type="monotone" dataKey="wealth" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorWealth)" />
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
                 <h3 className="font-bold text-slate-800 mb-6">Where does the money go?</h3>
                 <div className="flex items-center gap-6">
                     <div className="h-48 w-48 relative shrink-0">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />)}
                                </Pie>
                            </PieChart>
                         </ResponsiveContainer>
                         <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <span className="text-xs text-slate-400 font-medium">Top 10</span>
                         </div>
                     </div>
                     <div className="flex-1 space-y-3">
                         {pieData.map((entry, index) => (
                             <div key={index} className="flex justify-between items-center text-sm">
                                 <div className="flex items-center gap-2">
                                     <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                     <span className="text-slate-600 truncate max-w-[100px]">{entry.name}</span>
                                 </div>
                                 <span className="font-semibold text-slate-800">{formatCurrency(entry.value, currency)}</span>
                             </div>
                         ))}
                     </div>
                 </div>
             </div>

             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                 <h3 className="font-bold text-slate-800 mb-6">Biggest Expenses (All Time)</h3>
                 <div className="space-y-4">
                     {groupedTransactions.map((group, idx) => {
                         const cat = categories.find(c => c.id === group.categoryId);
                         const isExpanded = expandedGroupId === group.key;
                         const count = group.entries.length;

                         return (
                             <div key={group.key} className="border-b border-slate-50 last:border-0">
                                 <div 
                                    onClick={() => count > 1 && toggleGroup(group.key)}
                                    className={`flex items-center justify-between py-2 cursor-pointer ${count > 1 ? 'hover:bg-slate-50 rounded-lg px-2 -mx-2 transition' : ''}`}
                                 >
                                     <div className="flex items-center gap-3">
                                         <div className="text-xs font-bold text-slate-300 w-4">#{idx+1}</div>
                                         <div className="flex items-center gap-2">
                                             <div>
                                                 <span className="block text-sm font-semibold text-slate-700">
                                                     {cat?.name} {count > 1 && <span className="text-xs font-normal text-slate-400 ml-1">(x{count})</span>}
                                                 </span>
                                                 {count === 1 && (
                                                     <span className="text-xs text-slate-400">{group.entries[0].description || 'No description'} • {group.entries[0].monthId}</span>
                                                 )}
                                             </div>
                                             {count > 1 && (
                                                 <div className="text-slate-400">
                                                     {isExpanded ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                                 </div>
                                             )}
                                         </div>
                                     </div>
                                     <span className="font-bold text-slate-800">{formatCurrency(group.amount, currency)}</span>
                                 </div>
                                 
                                 {isExpanded && (
                                     <div className="bg-slate-50 rounded-lg p-3 mb-3 ml-8 text-xs space-y-2 animate-in fade-in slide-in-from-top-1">
                                         {group.entries.map((e, subIdx) => (
                                             <div key={e.id} className="flex justify-between text-slate-500">
                                                 <span>{e.monthId} • {e.description || 'Regular entry'}</span>
                                                 <span className="font-medium">{formatCurrency(e.amount, currency)}</span>
                                             </div>
                                         ))}
                                         <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-700">
                                             <span>Total Group</span>
                                             <span>{formatCurrency(group.amount * count, currency)}</span>
                                         </div>
                                     </div>
                                 )}
                             </div>
                         );
                     })}
                 </div>
             </div>
        </div>
    </div>
  );
};