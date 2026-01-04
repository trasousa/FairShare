import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Target, 
  Settings,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  Calendar as CalendarIcon,
  PieChart,
  Plane,
  ArrowUpRight,
  LogOut,
  PenTool,
  CheckCircle2,
  Cloud
} from 'lucide-react';

import { ExpenseEntry, AccountType, Budget, SavingsGoal, Category, TimeRange, Trip, IncomeEntry, User, UserId, AppInstance, CurrencyCode } from './types';
import { MonthlyWorksheet } from './components/MonthlyWorksheet';
import { SingleEntryForm } from './components/SingleEntryForm';
import { DashboardCharts } from './components/DashboardCharts';
import { MonthlyDashboard } from './components/MonthlyDashboard';
import { BudgetManager } from './components/BudgetManager';
import { TravelDashboard } from './components/TravelDashboard';
import { IncomeManager } from './components/IncomeManager';
import { SettingsPage } from './components/SettingsPage';
import { MonthPicker } from './components/MonthPicker';
import { getInstance, saveInstance } from './services/storage';

type Tab = 'overview' | 'monthly' | 'tracker' | 'budget' | 'travel' | 'settings';
type TrackerMode = 'worksheet' | 'single' | 'income';
type SaveStatus = 'saved' | 'saving' | 'unsaved';

const NAV_GROUPS = [
    {
        title: 'Insights',
        items: [
            { id: 'overview', label: 'Global Dashboard', icon: LayoutDashboard },
            { id: 'monthly', label: 'Monthly Deep Dive', icon: PieChart },
        ]
    },
    {
        title: 'Management',
        items: [
            { id: 'tracker', label: 'Tracker (Exp & Inc)', icon: PenTool },
            { id: 'travel', label: 'Travel & Trips', icon: Plane },
            { id: 'budget', label: 'Budgets & Goals', icon: Target },
        ]
    }
];

interface AppProps {
    instanceId: string;
    onExit: () => void;
}

function App({ instanceId, onExit }: AppProps) {
  const [loading, setLoading] = useState(true);
  const [instanceName, setInstanceName] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  
  // App State
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [trackerMode, setTrackerMode] = useState<TrackerMode>('worksheet');
  const [dashboardRange, setDashboardRange] = useState<TimeRange>('THIS_YEAR');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Data State
  const [users, setUsers] = useState<Record<string, User>>({});
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  // Load Instance Data (Async)
  useEffect(() => {
    const loadData = async () => {
        const data = await getInstance(instanceId);
        if (data) {
            setInstanceName(data.name);
            setUsers(data.users);
            setCurrency(data.currency);
            setTheme(data.theme || 'light');
            setEntries(data.data.entries);
            setIncomes(data.data.incomes);
            setCategories(data.data.categories);
            setBudgets(data.data.budgets);
            setSavings(data.data.savings);
            setTrips(data.data.trips);
            setLoading(false);
        } else {
            onExit(); // Instance not found
        }
    };
    loadData();
  }, [instanceId]);

  // Persist Data Changes
  useEffect(() => {
      if (loading) return;
      
      setSaveStatus('unsaved');
      
      const saveData = async () => {
          setSaveStatus('saving');
          const updatedInstance: AppInstance = {
              id: instanceId,
              name: instanceName,
              created: Date.now(),
              lastAccessed: Date.now(),
              currency: currency,
              theme: theme,
              users: users,
              data: {
                  entries,
                  categories,
                  budgets,
                  savings,
                  trips,
                  incomes
              }
          };
          await saveInstance(updatedInstance);
          setSaveStatus('saved');
      };

      const timeoutId = setTimeout(saveData, 1000); 
      return () => clearTimeout(timeoutId);

  }, [entries, incomes, categories, budgets, savings, trips, users, currency, instanceName, theme, loading]);

  const changeMonth = (direction: -1 | 1) => {
      const [year, month] = currentMonth.split('-').map(Number);
      const date = new Date(year, month - 1 + direction);
      const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      setCurrentMonth(newMonth);
  };

  const monthLabel = new Date(currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' });

  const currentTotalIncome = useMemo(() => {
      if (!users.user_1) return 0;
      const monthlyInc = incomes.filter(i => i.monthId === currentMonth);
      if (monthlyInc.length > 0) {
          return monthlyInc.reduce((sum, i) => sum + i.amount, 0);
      }
      return users.user_1.monthlyIncome + users.user_2.monthlyIncome;
  }, [incomes, currentMonth, users]);

  // --- Handlers ---
  const handleUpdateUser = (id: UserId, data: Partial<User>) => {
      setUsers(prev => ({ ...prev, [id]: { ...prev[id], ...data } }));
  };

  const handleUpdateTheme = (t: 'light' | 'dark') => {
      setTheme(t);
  };

  const handleExport = async () => {
      const data = await getInstance(instanceId);
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fairshare_backup_${instanceName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const filterByDate = (dateStr: string) => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const [year, month] = dateStr.split('-').map(Number);
    const entryDate = new Date(year, month - 1, 1);
    
    switch (dashboardRange) {
        case 'THIS_MONTH': return year === now.getFullYear() && (month - 1) === now.getMonth();
        case 'LAST_3_MONTHS': return entryDate >= new Date(now.getFullYear(), now.getMonth() - 2, 1) && entryDate <= now;
        case 'LAST_6_MONTHS': return entryDate >= new Date(now.getFullYear(), now.getMonth() - 5, 1) && entryDate <= now;
        case 'LAST_12_MONTHS': return entryDate >= new Date(now.getFullYear(), now.getMonth() - 11, 1) && entryDate <= now;
        case 'THIS_YEAR': return year === now.getFullYear();
        case 'ALL_TIME': return true;
        default: return true;
    }
  };

  const filteredDashboardEntries = useMemo(() => entries.filter(e => filterByDate(e.monthId)), [entries, dashboardRange]);
  const filteredDashboardIncomes = useMemo(() => incomes.filter(i => filterByDate(i.monthId)), [incomes, dashboardRange]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-400">Loading Database...</div>;

  const bgClass = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800';
  const headerClass = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const sidebarClass = 'fixed lg:sticky top-0 left-0 h-screen w-64 bg-slate-900 text-white z-50 transition-transform duration-300 transform';

  return (
    <div className={`flex min-h-screen font-sans transition-colors duration-300 ${bgClass}`}>
      
      <MonthPicker 
        isOpen={isMonthPickerOpen} onClose={() => setIsMonthPickerOpen(false)} 
        currentMonthId={currentMonth} onSelect={setCurrentMonth}
      />

      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar Navigation */}
      <aside className={`${sidebarClass} ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} flex flex-col`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-white">FS</div>
             <div className="flex flex-col">
                 <span className="font-bold text-lg leading-none tracking-tight">FairShare</span>
                 <span className="text-[10px] text-slate-400 mt-1 truncate max-w-[120px]">{instanceName}</span>
             </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400"><X size={24} /></button>
        </div>
        
        <nav className="p-4 space-y-8 overflow-y-auto flex-1">
            {NAV_GROUPS.map((group, idx) => (
                <div key={idx}>
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 px-2">{group.title}</h3>
                    <div className="space-y-1">
                        {group.items.map((item) => (
                            <button
                            key={item.id}
                            onClick={() => { setActiveTab(item.id as any); setSidebarOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${
                                activeTab === item.id 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50 font-medium' 
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                            }`}
                            >
                                <item.icon size={18} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0 space-y-2">
             <button
                onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm ${
                    activeTab === 'settings' 
                    ? 'bg-slate-800 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
             >
                 <Settings size={18} />
                 <span>Settings</span>
             </button>
             <button
                onClick={onExit}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm text-red-400 hover:bg-slate-800 hover:text-red-300"
             >
                 <LogOut size={18} />
                 <span>Exit Instance</span>
             </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        <header className={`h-16 border-b px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30 transition-colors ${headerClass}`}>
           <div className="flex items-center gap-4">
               <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                   <Menu size={24} />
               </button>
               <h1 className={`text-xl font-bold capitalize flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                   {activeTab === 'overview' ? 'Global Analysis' : 
                    activeTab === 'monthly' ? 'Monthly Analysis' :
                    activeTab === 'tracker' ? 'Financial Tracker' : 
                    activeTab === 'settings' ? 'Settings' :
                    activeTab === 'travel' ? 'Travel Dashboard' : 'Budget & Goals'}
               </h1>
           </div>
           
           <div className="flex items-center gap-2 sm:gap-6">
               
               {/* Save Status Indicator */}
               <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                   {saveStatus === 'saved' ? (
                       <CheckCircle2 size={14} className="text-emerald-500" />
                   ) : (
                       <Cloud size={14} className="text-indigo-500 animate-pulse" />
                   )}
                   <span className="text-xs font-medium text-slate-500 hidden sm:inline">
                       {saveStatus === 'saved' ? 'Saved' : 'Saving...'}
                   </span>
               </div>

               {activeTab === 'overview' && (
                 <div className="relative">
                    <select 
                      value={dashboardRange} onChange={(e) => setDashboardRange(e.target.value as TimeRange)}
                      className={`appearance-none border-none rounded-lg py-2 pl-4 pr-10 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
                    >
                      <option value="THIS_MONTH">This Month</option>
                      <option value="LAST_3_MONTHS">Last 3 Months</option>
                      <option value="LAST_6_MONTHS">Last 6 Months</option>
                      <option value="LAST_12_MONTHS">Last 12 Months</option>
                      <option value="THIS_YEAR">This Year</option>
                      <option value="ALL_TIME">All Time</option>
                    </select>
                    <CalendarIcon size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                 </div>
               )}

               {/* Month Selector */}
               {(['tracker', 'monthly'].includes(activeTab)) && (
                 <div className={`flex items-center rounded-lg p-1 transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <button onClick={() => changeMonth(-1)} className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white text-slate-500'}`}><ChevronLeft size={16} /></button>
                      <button onClick={() => setIsMonthPickerOpen(true)} className={`px-3 text-sm font-semibold w-32 text-center select-none py-1.5 transition-colors rounded-md ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-white text-slate-700'}`}>{monthLabel}</button>
                      <button onClick={() => changeMonth(1)} className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white text-slate-500'}`}><ChevronRight size={16} /></button>
                 </div>
               )}
           </div>
        </header>

        <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {activeTab === 'overview' && <DashboardCharts entries={filteredDashboardEntries} categories={categories} incomes={filteredDashboardIncomes} users={users} currency={currency} />}

          {activeTab === 'monthly' && <MonthlyDashboard currentMonth={currentMonth} entries={entries} budgets={budgets} categories={categories} savings={savings} incomes={incomes} users={users} currency={currency} />}

          {activeTab === 'tracker' && (
              <div className="space-y-6">
                  {/* Tracker Sub-Navigation */}
                  <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                      <div className={`p-1 rounded-xl shadow-sm border inline-flex w-full sm:w-auto overflow-x-auto transition-colors ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                          <button 
                            onClick={() => setTrackerMode('worksheet')} 
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${trackerMode === 'worksheet' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-indigo-500/10'}`}
                          >
                              <Grid size={16} /> Worksheet
                          </button>
                          <button 
                            onClick={() => setTrackerMode('single')} 
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${trackerMode === 'single' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-indigo-500/10'}`}
                          >
                              <List size={16} /> Single Entry
                          </button>
                          <button 
                            onClick={() => setTrackerMode('income')} 
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${trackerMode === 'income' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:bg-emerald-500/10'}`}
                          >
                              <ArrowUpRight size={16} /> Income
                          </button>
                      </div>
                  </div>

                  {/* Worksheet View */}
                  {trackerMode === 'worksheet' && (
                      <MonthlyWorksheet 
                        entries={entries} 
                        budgets={budgets} 
                        categories={categories}
                        savings={savings}
                        trips={trips} 
                        monthId={currentMonth} 
                        currency={currency}
                        onUpdateEntry={(cid, acc, amt, tid) => {
                             setEntries(prev => {
                                const singleSum = prev.filter(e => e.categoryId === cid && e.account === acc && e.monthId === currentMonth && e.entryType === 'single').reduce((s, e) => s + e.amount, 0);
                                const needed = amt - singleSum;
                                const idx = prev.findIndex(e => e.categoryId === cid && e.account === acc && e.monthId === currentMonth && e.entryType === 'worksheet');
                                if (idx >= 0) {
                                    const next = [...prev];
                                    next[idx] = { ...next[idx], amount: needed, ...(tid ? { tripId: tid } : {}) };
                                    return next;
                                }
                                return [...prev, { id: Math.random().toString(36), monthId: currentMonth, categoryId: cid, account: acc, amount: needed, entryType: 'worksheet', tripId: tid }];
                             });
                        }}
                        onAddCategory={(n, g, a) => setCategories(p => [...p, {id: n.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4), name: n, group: g as any, defaultAccount: a}])}
                        onEditCategory={(id, n) => setCategories(p => p.map(c => c.id === id ? { ...c, name: n } : c))}
                        onDateClick={() => setIsMonthPickerOpen(true)}
                      />
                  )}

                  {/* Single Entry View */}
                  {trackerMode === 'single' && (
                      <div className="max-w-xl mx-auto">
                          <SingleEntryForm 
                            categories={categories} 
                            trips={trips} 
                            currentMonth={currentMonth} 
                            users={users} 
                            currency={currency} 
                            onAddEntry={(e) => setEntries(p => [...p, { ...e, id: Math.random().toString(36) }])} 
                          />
                      </div>
                  )}

                  {/* Income Manager View */}
                  {trackerMode === 'income' && (
                      <IncomeManager 
                        incomes={incomes} 
                        currentMonth={currentMonth} 
                        users={users} 
                        currency={currency} 
                        onAddIncome={(s, a, r, ir, mid) => setIncomes(p => [...p, {id: Math.random().toString(36), monthId: mid, source: s, amount: a, recipient: r, isRecurring: ir}])} 
                        onDeleteIncome={(id) => setIncomes(p => p.filter(i => i.id !== id))} 
                      />
                  )}
              </div>
          )}
          
          {activeTab === 'travel' && <TravelDashboard trips={trips} entries={entries} currency={currency} onAddTrip={(t) => setTrips(p => [...p, { ...t, id: Math.random().toString(36) }])} />}

          {activeTab === 'budget' && <BudgetManager budgets={budgets} categories={categories} savings={savings} entries={entries} totalIncome={currentTotalIncome} users={users} currency={currency}
            onAddBudget={(cid, lim, acc) => setBudgets(p => [...p, { categoryId: cid, limit: lim, account: acc }])}
            onAddGoal={(n, t, tt, i, acc, sd, td) => {
                const gid = n.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
                setCategories(p => [...p, { id: gid, name: n, group: 'SAVINGS', defaultAccount: acc }]);
                setSavings(p => [...p, { id: gid, name: n, targetAmount: t, targetType: tt, initialAmount: i, account: acc, startDate: sd, targetDate: td }]);
            }}
          />}
          
          {activeTab === 'settings' && (
            <SettingsPage 
                users={users} 
                currency={currency} 
                theme={theme}
                onUpdateUser={handleUpdateUser} 
                onUpdateCurrency={setCurrency} 
                onUpdateTheme={handleUpdateTheme}
                onExport={handleExport} 
            />
          )}

        </div>
      </main>
    </div>
  );
}

export default App;