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
  Area,
  Sector
} from 'recharts';
import { ExpenseEntry, Category, AccountType, IncomeEntry, User, CurrencyCode, Trip } from '../types';
import { formatCurrency } from '../services/financeService';
import { ChevronDown, ChevronUp, Wallet, User as UserIcon, Users, List, BarChart as BarChartIcon, Plane, MessageSquare } from 'lucide-react';
import { AppTooltip } from './AppTooltip';

interface DashboardChartsProps {
  entries: ExpenseEntry[];
  categories: Category[];
  incomes: IncomeEntry[];
  users: Record<string, User>;
  currency: CurrencyCode;
  trips?: Trip[];
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-4 border border-slate-200 shadow-lg rounded-xl text-xs">
                <p className="font-bold text-slate-700 mb-2">{label}</p>
                {payload.map((entry: any, index: number) => (
                    <div key={index} className="flex justify-between gap-4 mb-1" style={{ color: entry.color }}>
                        <span>{entry.name}:</span>
                        <span className="font-bold">{formatCurrency(entry.value, currency)}</span>
                    </div>
                ))}
            </div>
        );
    }
    return null;
};

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ entries, categories, incomes, users, currency, trips = [] }) => {
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | AccountType>('ALL');
  const [pieActiveIndex, setPieActiveIndex] = useState(0);
  const [chartViewMode, setChartViewMode] = useState<'CHART' | 'TABLE'>('CHART');
  const [visibleBars, setVisibleBars] = useState<Record<string, boolean>>({
      INCOME_U1: true,
      INCOME_U2: true,
      INCOME_SHARED: true,
      SHARED: true,
      USER_1: true,
      USER_2: true
  });

  if (!users || !users.user_1 || !users.user_2) {
      return <div className="p-8 text-center text-slate-400 font-medium">Preparing Dashboard...</div>;
  }

  const filteredEntries = useMemo(() => activeFilter === 'ALL' ? entries : entries.filter(e => e.account === activeFilter), [entries, activeFilter]);
  const filteredIncomes = useMemo(() => activeFilter === 'ALL' ? incomes : incomes.filter(i => i.recipient === activeFilter), [incomes, activeFilter]);

  // --- Data Processing for Charts ---
  const monthMap = new Map<string, { 
      month: string, 
      SHARED: number, USER_1: number, USER_2: number, 
      INCOME_U1: number, INCOME_U2: number, INCOME_SHARED: number,
      SAVINGS: number, SAVINGS_U1: number, SAVINGS_U2: number, SAVINGS_SHARED: number 
  }>();
  
  const allMonths = new Set([...filteredIncomes.map(i => i.monthId), ...filteredEntries.map(e => e.monthId)]);
  allMonths.forEach(m => {
      monthMap.set(m, { 
          month: m, 
          SHARED: 0, USER_1: 0, USER_2: 0, 
          INCOME_U1: 0, INCOME_U2: 0, INCOME_SHARED: 0,
          SAVINGS: 0, SAVINGS_U1: 0, SAVINGS_U2: 0, SAVINGS_SHARED: 0 
      });
  });

  filteredIncomes.forEach(inc => {
      if (monthMap.has(inc.monthId)) {
          const data = monthMap.get(inc.monthId)!;
          if (inc.recipient === 'USER_1') data.INCOME_U1 += inc.amount;
          else if (inc.recipient === 'USER_2') data.INCOME_U2 += inc.amount;
          else data.INCOME_SHARED += inc.amount;
      }
  });

  filteredEntries.forEach(entry => {
      if (monthMap.has(entry.monthId)) {
          const data = monthMap.get(entry.monthId)!;
          const cat = categories.find(c => c.id === entry.categoryId);
          if (cat?.group === 'SAVINGS') {
              data.SAVINGS += entry.amount;
              if (entry.account === 'USER_1') data.SAVINGS_U1 += entry.amount;
              else if (entry.account === 'USER_2') data.SAVINGS_U2 += entry.amount;
              else data.SAVINGS_SHARED += entry.amount;
          } else {
              if (data[entry.account] !== undefined) {
                  data[entry.account] += entry.amount;
              }
          }
      }
  });

  const barData = Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month));

  // --- Wealth Calculation ---
  let wealthU1 = 0, wealthU2 = 0, wealthShared = 0;
  const wealthData = barData.map(item => {
      wealthU1 += item.SAVINGS_U1;
      wealthU2 += item.SAVINGS_U2;
      wealthShared += item.SAVINGS_SHARED;
      return {
          month: item.month,
          totalWealth: wealthU1 + wealthU2 + wealthShared,
          wealthU1, wealthU2, wealthShared
      };
  });
  
  const totalAccumulatedWealth = wealthData.length > 0 ? wealthData[wealthData.length - 1].totalWealth : 0;

  // --- Top Expenses Logic ---
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

  const incomeTotals = useMemo(() => {
      return incomes.reduce((acc, i) => {
          if (i.recipient === 'USER_1') acc.USER_1 += i.amount;
          else if (i.recipient === 'USER_2') acc.USER_2 += i.amount;
          else acc.SHARED += i.amount;
          return acc;
      }, { SHARED: 0, USER_1: 0, USER_2: 0 });
  }, [incomes]);

  const groupEntries = (filteredEntries: ExpenseEntry[], groupBy: 'CATEGORY' | 'CONSECUTIVE') => {
      if (groupBy === 'CATEGORY') {
          const map = new Map<string, any>();
          filteredEntries.forEach(e => {
              const cat = categories.find(c => c.id === e.categoryId);
              const key = cat?.name || 'Unknown';
              if (!map.has(key)) map.set(key, { key, name: key, amount: 0, account: e.account, count: 0, entries: [] });
              const item = map.get(key);
              item.amount += e.amount;
              item.count += 1;
              item.entries.push(e);
          });
          return Array.from(map.values()).sort((a, b) => b.amount - a.amount);
      } else {
          const sorted = [...filteredEntries].sort((a, b) => b.monthId.localeCompare(a.monthId));
          const groups: any[] = [];
          if (sorted.length === 0) return [];
          let current = { key: sorted[0].id, name: categories.find(c => c.id === sorted[0].categoryId)?.name || 'Unknown', amount: sorted[0].amount, total: sorted[0].amount, entries: [sorted[0]], account: sorted[0].account };
          for (let i = 1; i < sorted.length; i++) {
              const e = sorted[i];
              const cat = categories.find(c => c.id === e.categoryId);
              const name = cat?.name || 'Unknown';
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

  const fixedExpenses = useMemo(() => groupEntries(filteredEntries.filter(e => categories.find(c => c.id === e.categoryId)?.group === 'FIXED'), 'CATEGORY'), [filteredEntries, categories]);
  const variableExpenses = useMemo(() => groupEntries(filteredEntries.filter(e => { const g = categories.find(c => c.id === e.categoryId)?.group; return g !== 'FIXED' && g !== 'SAVINGS'; }), 'CONSECUTIVE'), [filteredEntries, categories]);

  const pieData = Array.from(
      filteredEntries.reduce((map, e) => {
          const cat = categories.find(c => c.id === e.categoryId);
          if (cat && cat.group !== 'SAVINGS') map.set(cat.name, (map.get(cat.name) || 0) + e.amount);
          return map;
      }, new Map<string, number>()).entries()
  ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  
  const totalPieValue = pieData.reduce((sum, item) => sum + item.value, 0);

  const tripsBarData = useMemo(() => {
      const data = Array.from(allMonths).sort().map(month => {
          const amount = filteredEntries
              .filter(e => e.monthId === month && e.tripId)
              .reduce((sum, e) => sum + e.amount, 0);
          return { month, amount };
      });
      // Filter out months with 0 trip spending? Or keep them? User said "if there is non then its value is 0". So keep them.
      // But maybe filter to range where there is data? Nah, keeping alignment with other charts is better.
      return data;
  }, [allMonths, filteredEntries]);

  const COLORS = ['#6366f1', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

  const toggleGroup = (key: string) => setExpandedGroupId(prev => prev === key ? null : key);
  const handleLegendClick = (dataKey: string) => setVisibleBars(prev => ({ ...prev, [dataKey]: !prev[dataKey] }));
  const renderAccountLabel = (account: AccountType) => {
      const label = account === 'SHARED' ? 'Shared' : account === 'USER_1' ? users.user_1.name : users.user_2.name;
      const color = account === 'SHARED' ? users.shared?.color : account === 'USER_1' ? users.user_1.color : users.user_2.color;
      
      // We can use style for dynamic color
      return <span className="text-[10px] px-1.5 py-0.5 rounded font-bold ml-2 text-white" style={{ backgroundColor: color || '#64748b' }}>{label}</span>;
  };

  return (
    <div className="space-y-6">
        
        {/* Mobile Summary Row */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x">
            <div className="snap-start min-w-[140px] bg-indigo-500 rounded-xl p-3 text-white">
                <span className="text-[9px] uppercase opacity-80 block">Net Worth</span>
                <span className="text-lg font-bold">{formatCurrency(totalAccumulatedWealth, currency)}</span>
            </div>
            <div className="snap-start min-w-[140px] bg-slate-800 rounded-xl p-3 text-white">
                <span className="text-[9px] uppercase opacity-80 block">Total Income</span>
                <span className="text-lg font-bold">{formatCurrency(incomeTotals.SHARED + incomeTotals.USER_1 + incomeTotals.USER_2, currency)}</span>
            </div>
            <div className="snap-start min-w-[140px] bg-slate-700 rounded-xl p-3 text-white">
                <span className="text-[9px] uppercase opacity-80 block">Total Expenses</span>
                <span className="text-lg font-bold">{formatCurrency(totals.SHARED + totals.USER_1 + totals.USER_2, currency)}</span>
            </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[{title: 'Overall', income: incomeTotals.SHARED + incomeTotals.USER_1 + incomeTotals.USER_2, expense: totals.SHARED + totals.USER_1 + totals.USER_2, icon: Wallet, color: '#6366f1', id: 'ALL', desc: 'Total of all shared and personal expenses combined.'},
              {title: 'Shared', income: incomeTotals.SHARED, expense: totals.SHARED, icon: Users, color: users.shared?.color || '#a855f7', id: 'SHARED', desc: 'Shared account activity.', avatar: users.shared?.avatar}, 
              {title: users.user_1.name, income: incomeTotals.USER_1, expense: totals.USER_1, icon: UserIcon, color: users.user_1.color, id: 'USER_1', desc: `${users.user_1.name}'s personal activity.`, avatar: users.user_1.avatar}, 
              {title: users.user_2.name, income: incomeTotals.USER_2, expense: totals.USER_2, icon: UserIcon, color: users.user_2.color, id: 'USER_2', desc: `${users.user_2.name}'s personal activity.`, avatar: users.user_2.avatar}].map((card, idx) => (
                <button 
                    key={idx} 
                    title={card.desc}
                    onClick={() => setActiveFilter(card.id as AccountType | 'ALL')}
                    className={`bg-white p-3 md:p-4 rounded-xl border shadow-sm flex flex-col justify-between transition-all w-full text-left h-full ${activeFilter === card.id ? 'ring-2 scale-[1.02]' : 'hover:shadow-md'}`}
                    style={{ borderColor: activeFilter === card.id ? card.color : '#e2e8f0', boxShadow: activeFilter === card.id ? `0 0 0 2px ${card.color}20` : '' }}
                >
                    <div className="flex items-center gap-2 mb-2 md:mb-3">
                        <div 
                            className="w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center overflow-hidden shadow-sm border border-slate-100"
                            style={{ backgroundColor: `${card.color}20`, color: card.color }}
                        >
                            {card.avatar ? <img src={card.avatar} className="w-full h-full object-cover" alt={card.title} /> : <card.icon size={16} />}
                        </div>
                        <p className="text-[10px] md:text-xs font-bold uppercase tracking-wider truncate" style={{ color: '#94a3b8' }}>{card.title}</p>
                    </div>
                    
                    <div className="space-y-1">
                        <div className="flex justify-between items-end gap-1">
                            <span className="text-[9px] md:text-[10px] font-medium text-slate-400">Inc</span>
                            <span className="text-xs md:text-sm font-bold" style={{ color: card.color, opacity: 0.8 }}>{formatCurrency(card.income, currency)}</span>
                        </div>
                        <div className="flex justify-between items-end gap-1">
                            <span className="text-[9px] md:text-[10px] font-medium text-slate-400">Exp</span>
                            <span className="text-xs md:text-sm font-bold" style={{ color: card.color }}>{formatCurrency(card.expense, currency)}</span>
                        </div>
                    </div>
                </button>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Income vs Expenses Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-slate-800">Income vs Expenses Trend</h3>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setChartViewMode('CHART')}
                            className={`p-1.5 rounded-md transition ${chartViewMode === 'CHART' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <BarChartIcon size={16} />
                        </button>
                        <button 
                            onClick={() => setChartViewMode('TABLE')}
                            className={`p-1.5 rounded-md transition ${chartViewMode === 'TABLE' ? 'bg-white shadow text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={16} />
                        </button>
                    </div>
                </div>
                
                <div className="h-72 w-full overflow-auto">
                    {chartViewMode === 'CHART' ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4} barCategoryGap="20%">
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => { const [y, m] = val.split('-'); return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('default', { month: 'short' }); }} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `${val/1000}k`} />
                                <Tooltip content={<CustomTooltip currency={currency} />} cursor={{fill: '#f8fafc'}} />
                                 <Legend 
                                    verticalAlign="top" 
                                    align="right" 
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '10px', paddingBottom: '20px' }}
                                    iconType="circle" 
                                    onClick={(e) => handleLegendClick(e.dataKey as string)} 
                                    cursor="pointer" 
                                />
                                
                                {/* Stack 1: Income (Side A) - Using Alpha for Income distinction */}
                                <Bar dataKey="INCOME_SHARED" name="Inc: Shared" stackId="income" fill={users.shared?.color} fillOpacity={0.3} hide={!visibleBars.INCOME_SHARED} />
                                <Bar dataKey="INCOME_U1" name={`Inc: ${users.user_1.name}`} stackId="income" fill={users.user_1.color} fillOpacity={0.3} hide={!visibleBars.INCOME_U1} />
                                <Bar dataKey="INCOME_U2" name={`Inc: ${users.user_2.name}`} stackId="income" fill={users.user_2.color} fillOpacity={0.3} radius={[4, 4, 0, 0]} hide={!visibleBars.INCOME_U2} />
                                
                                {/* Stack 2: Expenses (Side B) - Solid colors for Expenses */}
                                <Bar dataKey="SHARED" name="Exp: Shared" stackId="exp" fill={users.shared?.color} hide={!visibleBars.SHARED} />
                                <Bar dataKey="USER_1" name={`Exp: ${users.user_1.name}`} stackId="exp" fill={users.user_1.color} hide={!visibleBars.USER_1} />
                                <Bar dataKey="USER_2" name={`Exp: ${users.user_2.name}`} stackId="exp" fill={users.user_2.color} radius={[4, 4, 0, 0]} hide={!visibleBars.USER_2} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="min-w-[600px]">
                            <table className="w-full text-xs text-left whitespace-nowrap">
                                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="px-3 py-2 sticky left-0 bg-slate-50 z-20 border-b border-slate-200">Month</th>
                                        <th className="px-3 py-2 text-center border-l border-b border-slate-200" colSpan={2}>{users.user_1.name}</th>
                                        <th className="px-3 py-2 text-center border-l border-b border-slate-200" colSpan={2}>{users.user_2.name}</th>
                                        <th className="px-3 py-2 text-center border-l border-b border-slate-200" colSpan={2}>Shared</th>
                                        <th className="px-3 py-2 text-center border-l border-b border-slate-200" colSpan={3}>Total</th>
                                    </tr>
                                    <tr className="bg-slate-50 text-[10px] uppercase tracking-wider">
                                        <th className="px-3 py-1 sticky left-0 bg-slate-50 border-b border-slate-200"></th>
                                        <th className="px-2 py-1 text-right text-emerald-600 border-l border-b border-slate-200 bg-emerald-50/30">Inc</th>
                                        <th className="px-2 py-1 text-right text-slate-500 border-b border-slate-200">Exp</th>
                                        <th className="px-2 py-1 text-right text-emerald-600 border-l border-b border-slate-200 bg-emerald-50/30">Inc</th>
                                        <th className="px-2 py-1 text-right text-slate-500 border-b border-slate-200">Exp</th>
                                        <th className="px-2 py-1 text-right text-emerald-600 border-l border-b border-slate-200 bg-emerald-50/30">Inc</th>
                                        <th className="px-2 py-1 text-right text-slate-500 border-b border-slate-200">Exp</th>
                                        <th className="px-2 py-1 text-right text-emerald-600 border-l border-b border-slate-200 bg-emerald-50/30">Inc</th>
                                        <th className="px-2 py-1 text-right text-slate-500 border-b border-slate-200">Exp</th>
                                        <th className="px-2 py-1 text-right text-indigo-600 font-bold border-b border-slate-200">Net</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {barData.slice().reverse().map(item => {
                                        const income = item.INCOME_SHARED + item.INCOME_U1 + item.INCOME_U2;
                                        const expense = item.SHARED + item.USER_1 + item.USER_2;
                                        const net = income - expense;
                                        return (
                                            <tr key={item.month} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-2 font-mono text-slate-600 sticky left-0 bg-white border-r border-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{item.month}</td>
                                                
                                                <td className="px-2 py-2 text-right text-emerald-600/80 bg-emerald-50/10 border-l border-slate-50">{item.INCOME_U1 > 0 ? formatCurrency(item.INCOME_U1, currency) : '-'}</td>
                                                <td className="px-2 py-2 text-right text-slate-500">{item.USER_1 > 0 ? formatCurrency(item.USER_1, currency) : '-'}</td>
                                                
                                                <td className="px-2 py-2 text-right text-emerald-600/80 bg-emerald-50/10 border-l border-slate-50">{item.INCOME_U2 > 0 ? formatCurrency(item.INCOME_U2, currency) : '-'}</td>
                                                <td className="px-2 py-2 text-right text-slate-500">{item.USER_2 > 0 ? formatCurrency(item.USER_2, currency) : '-'}</td>
                                                
                                                <td className="px-2 py-2 text-right text-emerald-600/80 bg-emerald-50/10 border-l border-slate-50">{item.INCOME_SHARED > 0 ? formatCurrency(item.INCOME_SHARED, currency) : '-'}</td>
                                                <td className="px-2 py-2 text-right text-slate-500">{item.SHARED > 0 ? formatCurrency(item.SHARED, currency) : '-'}</td>
                                                
                                                <td className="px-2 py-2 text-right text-emerald-700 font-medium border-l border-slate-100 bg-emerald-50/30">{formatCurrency(income, currency)}</td>
                                                <td className="px-2 py-2 text-right text-slate-700 font-medium">{formatCurrency(expense, currency)}</td>
                                                <td className={`px-2 py-2 text-right font-bold ${net >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatCurrency(net, currency)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-slate-100 font-bold text-[11px] sticky bottom-0 z-10 shadow-[0_-2px_5px_-2px_rgba(0,0,0,0.05)] border-t border-slate-200">
                                    <tr>
                                        <td className="px-3 py-2 sticky left-0 bg-slate-100 border-r border-slate-200">Total</td>
                                        <td className="px-2 py-2 text-right text-emerald-700 border-l border-slate-200">{formatCurrency(barData.reduce((s, i) => s + i.INCOME_U1, 0), currency)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatCurrency(barData.reduce((s, i) => s + i.USER_1, 0), currency)}</td>
                                        
                                        <td className="px-2 py-2 text-right text-emerald-700 border-l border-slate-200">{formatCurrency(barData.reduce((s, i) => s + i.INCOME_U2, 0), currency)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatCurrency(barData.reduce((s, i) => s + i.USER_2, 0), currency)}</td>
                                        
                                        <td className="px-2 py-2 text-right text-emerald-700 border-l border-slate-200">{formatCurrency(barData.reduce((s, i) => s + i.INCOME_SHARED, 0), currency)}</td>
                                        <td className="px-2 py-2 text-right text-slate-700">{formatCurrency(barData.reduce((s, i) => s + i.SHARED, 0), currency)}</td>
                                        
                                        <td className="px-2 py-2 text-right text-emerald-800 border-l border-slate-200 bg-emerald-100/50">{formatCurrency(barData.reduce((s, i) => s + i.INCOME_SHARED + i.INCOME_U1 + i.INCOME_U2, 0), currency)}</td>
                                        <td className="px-2 py-2 text-right text-slate-800">{formatCurrency(barData.reduce((s, i) => s + i.SHARED + i.USER_1 + i.USER_2, 0), currency)}</td>
                                        <td className="px-2 py-2 text-right text-indigo-700">{formatCurrency(barData.reduce((s, i) => (i.INCOME_SHARED + i.INCOME_U1 + i.INCOME_U2) - (i.SHARED + i.USER_1 + i.USER_2), 0), currency)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Wealth Chart */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                <h3 className="text-lg font-bold text-slate-800 mb-2">Net Worth Growth</h3>
                <p className="text-xs text-slate-400 mb-4">Cumulative savings & investments</p>
                <div className="flex-1 min-h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={wealthData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorU1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={users.user_1.color} stopOpacity={0.4}/><stop offset="95%" stopColor={users.user_1.color} stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorU2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={users.user_2.color} stopOpacity={0.4}/><stop offset="95%" stopColor={users.user_2.color} stopOpacity={0}/></linearGradient>
                                <linearGradient id="colorShared" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={users.shared?.color} stopOpacity={0.4}/><stop offset="95%" stopColor={users.shared?.color} stopOpacity={0}/></linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" hide />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10}} domain={['auto', 'auto']} />
                            <Tooltip formatter={(value: number) => formatCurrency(value, currency)} />
                            <Area type="monotone" dataKey="wealthShared" name="Shared Wealth" stackId="1" stroke={users.shared?.color} strokeWidth={2} fillOpacity={1} fill="url(#colorShared)" />
                            <Area type="monotone" dataKey="wealthU1" name={`${users.user_1.name} Wealth`} stackId="1" stroke={users.user_1.color} strokeWidth={2} fillOpacity={1} fill="url(#colorU1)" />
                            <Area type="monotone" dataKey="wealthU2" name={`${users.user_2.name} Wealth`} stackId="1" stroke={users.user_2.color} strokeWidth={2} fillOpacity={1} fill="url(#colorU2)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-50 text-center">
                    <span className="text-2xl font-bold text-emerald-600">{formatCurrency(totalAccumulatedWealth, currency)}</span>
                    <span className="text-xs text-slate-400 block">Total Accumulated</span>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-6">
                 {/* Pie Chart */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-slate-800">Where does the money go?</h3>
                     </div>
                     <div className="flex flex-col sm:flex-row items-center gap-6 h-64"> 
                         <div className="h-full w-56 relative shrink-0">
                             <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie 
                                        activeIndex={pieActiveIndex}
                                        activeShape={(props: any) => {
                                            const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
                                            return (
                                                <g>
                                                    <text x={cx} y={cy} dy={-6} textAnchor="middle" fill="#64748b" fontSize={9} fontWeight="bold">
                                                        {payload.name.length > 12 ? `${payload.name.substring(0, 12)}...` : payload.name}
                                                    </text>
                                                    <text x={cx} y={cy} dy={10} textAnchor="middle" fill="#334155" fontSize={11} fontWeight="bold">
                                                        {`${((value / totalPieValue) * 100).toFixed(1)}%`}
                                                    </text>
                                                    <Sector
                                                        cx={cx}
                                                        cy={cy}
                                                        innerRadius={innerRadius}
                                                        outerRadius={outerRadius + 4}
                                                        startAngle={startAngle}
                                                        endAngle={endAngle}
                                                        fill={fill}
                                                    />
                                                    <Sector
                                                        cx={cx}
                                                        cy={cy}
                                                        startAngle={startAngle}
                                                        endAngle={endAngle}
                                                        innerRadius={outerRadius + 6}
                                                        outerRadius={outerRadius + 8}
                                                        fill={fill}
                                                    />
                                                </g>
                                            );
                                        }}
                                        data={pieData} 
                                        cx="50%" 
                                        cy="50%" 
                                        innerRadius={70} 
                                        outerRadius={90} 
                                        paddingAngle={4} 
                                        dataKey="value"
                                        cornerRadius={4}
                                        onMouseEnter={(_, index) => setPieActiveIndex(index)}
                                    >
                                        {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />)}
                                    </Pie>
                                </PieChart>
                             </ResponsiveContainer>
                         </div>
                         <div className="flex-1 w-full space-y-1.5 overflow-y-auto max-h-full pr-2 custom-scrollbar">
                             {pieData.map((entry, index) => (
                                 <div 
                                    key={index} 
                                    className={`flex justify-between items-center p-1.5 rounded-lg cursor-pointer transition ${index === pieActiveIndex ? 'bg-slate-50 ring-1 ring-slate-200' : 'hover:bg-slate-50'}`}
                                    onMouseEnter={() => setPieActiveIndex(index)}
                                 >
                                     <div className="flex items-center gap-2">
                                         <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                         <span className="text-slate-600 truncate max-w-[120px] font-medium text-[11px]">{entry.name}</span>
                                     </div>
                                     <div className="flex items-center gap-3">
                                        <span className="text-slate-400 font-medium text-[9px] bg-slate-100 px-1.5 py-0.5 rounded">{((entry.value / totalPieValue) * 100).toFixed(1)}%</span>
                                        <span className="font-bold text-slate-800 text-[11px]">{formatCurrency(entry.value, currency)}</span>
                                     </div>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>

                 {/* Trips Expenses Chart */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Plane size={18} className="text-indigo-600"/> Trip Expenses Over Time
                    </h3>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={tripsBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barGap={4}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => { const [y, m] = val.split('-'); return new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('default', { month: 'short' }); }} />
                                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} tickFormatter={(val) => `${val/1000}k`} />
                                <Tooltip content={<CustomTooltip currency={currency} />} cursor={{fill: '#f8fafc'}} />
                                <Bar dataKey="amount" name="Trip Spending" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
             </div>

             <div className="space-y-6">
                 {/* Fixed Expenses */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <Wallet size={18} className="text-slate-400"/> Fixed & Recurring
                     </h3>
                     <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                         {fixedExpenses.map((group, idx) => {
                             const isExpanded = expandedGroupId === group.key;
                             return (
                                 <div key={idx} className="border-b border-slate-50 last:border-0 pb-2">
                                     <div onClick={() => toggleGroup(group.key)} className="flex justify-between items-center cursor-pointer hover:bg-slate-50 p-1.5 -m-1.5 rounded-lg transition">
                                         <div>
                                             <div className="flex items-center gap-2">
                                                 <span className="font-semibold text-slate-700 text-sm">{group.name}</span>
                                                 {group.count > 1 && <div className="text-slate-400">{isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}</div>}
                                             </div>
                                             <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                                 {group.count} transactions {renderAccountLabel(group.account)}
                                             </div>
                                         </div>
                                         <span className="font-bold text-slate-800 text-sm">{formatCurrency(group.amount, currency)}</span>
                                     </div>
                                     {isExpanded && (
                                         <div className="bg-slate-50 rounded-lg p-3 mt-2 text-xs space-y-2 animate-in fade-in slide-in-from-top-1">
                                             {group.entries.map((e: any) => (
                                                 <div key={e.id} className="flex justify-between text-slate-500"><span>{e.monthId}</span><span className="font-medium">{formatCurrency(e.amount, currency)}</span></div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                         {fixedExpenses.length === 0 && <p className="text-xs text-slate-400">No fixed expenses found.</p>}
                     </div>
                 </div>

                 {/* Variable Expenses */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                         <ChevronUp size={18} className="text-slate-400"/> Top Variable Spending
                     </h3>
                     <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                         {variableExpenses.map((group, idx) => {
                             const isExpanded = expandedGroupId === group.key;
                             const count = group.entries.length;
                             const hasComment = count === 1 && group.entries[0].description && group.entries[0].description.trim() !== "";

                             return (
                                 <div key={group.key} className="border-b border-slate-50 last:border-0 pb-2">
                                     <div onClick={() => count > 1 && toggleGroup(group.key)} className={`flex items-center justify-between py-1.5 cursor-pointer ${count > 1 ? 'hover:bg-slate-50 rounded-lg px-1.5 -mx-1.5 transition' : ''}`}>
                                         <div className="flex items-center gap-3">
                                             <div className="text-xs font-bold text-slate-300 w-4">#{idx+1}</div>
                                             <div>
                                                 <div className="flex items-center gap-2">
                                                     <span className="block text-sm font-semibold text-slate-700">{group.name} {count > 1 && <span className="text-xs font-normal text-slate-400 ml-1">(x{count})</span>}</span>
                                                     {hasComment && (
                                                         <AppTooltip content={group.entries[0].description}>
                                                             <span><MessageSquare size={12} className="text-indigo-400 cursor-help" /></span>
                                                         </AppTooltip>
                                                     )}
                                                 </div>
                                                 <div className="flex items-center mt-0.5">{renderAccountLabel(group.account)}{count === 1 && <span className="text-[10px] text-slate-400 ml-2">{group.entries[0].monthId}</span>}</div>
                                             </div>
                                         </div>
                                         <div className="text-right">
                                             <span className="block font-bold text-slate-800 text-sm">{formatCurrency(group.total, currency)}</span>
                                             {count > 1 && <div className="text-slate-400 flex justify-end mt-0.5">{isExpanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}</div>}
                                         </div>
                                     </div>
                                     {isExpanded && (
                                         <div className="bg-slate-50 rounded-lg p-3 mt-2 ml-7 text-xs space-y-2 animate-in fade-in slide-in-from-top-1">
                                             {group.entries.map((e: any) => (
                                                 <div key={e.id} className="flex justify-between items-center text-slate-500 hover:text-slate-700 transition-colors">
                                                     <div className="flex items-center gap-2">
                                                         <span>{e.monthId}</span>
                                                         {e.description && e.description.trim() !== "" && (
                                                             <AppTooltip content={e.description}>
                                                                 <MessageSquare size={10} className="text-indigo-300 cursor-help" />
                                                             </AppTooltip>
                                                         )}
                                                         <span className="truncate max-w-[120px] italic">{e.description || 'Entry'}</span>
                                                     </div>
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