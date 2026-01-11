import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  Target, 
  Settings as SettingsIcon,
  PieChart,
  Plane,
  ArrowUpRight,
  PenTool,
  CheckCircle2,
  Cloud,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  List,
  Grid,
  Calendar as CalendarIcon
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
import { ErrorBoundary } from './components/ErrorBoundary'; 
import { getInstance, saveInstance } from './services/storage';

type MainTab = 'insights' | 'register' | 'planning' | 'settings';
type RegisterView = 'worksheet' | 'single' | 'income';
type PlanningView = 'budget' | 'travel';
type InsightsView = 'global' | 'monthly';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

interface AppProps {
    instanceId: string;
    onExit: () => void;
}

function App({ instanceId, onExit }: AppProps) {
  const [loading, setLoading] = useState(true);
  const [easterEggCount, setEasterEggCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [instanceName, setInstanceName] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  
  // Navigation State
  const [activeMainTab, setActiveMainTab] = useState<MainTab>('insights');
  const [activeInsightsView, setActiveInsightsView] = useState<InsightsView>('global');
  const [activeRegisterView, setActiveRegisterView] = useState<RegisterView>('single');
  const [activePlanningView, setActivePlanningView] = useState<PlanningView>('budget');
  
  const [dashboardRange, setDashboardRange] = useState<TimeRange>('THIS_YEAR');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  
  const [currentMonth, setCurrentMonth] = useState(defaultMonth);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Dropdown States
  const [registerMenuOpen, setRegisterMenuOpen] = useState(false);
  const [planningMenuOpen, setPlanningMenuOpen] = useState(false);
  const regMenuRef = useRef<HTMLDivElement>(null);
  const planMenuRef = useRef<HTMLDivElement>(null);

  // Data State
  const [users, setUsers] = useState<Record<string, User>>({});
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [entries, setEntries] = useState<ExpenseEntry[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [savings, setSavings] = useState<SavingsGoal[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);

  // Close dropdowns on outside click
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (regMenuRef.current && !regMenuRef.current.contains(event.target as Node)) {
              setRegisterMenuOpen(false);
          }
          if (planMenuRef.current && !planMenuRef.current.contains(event.target as Node)) {
              setPlanningMenuOpen(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load Instance Data (Async)
  useEffect(() => {
    const loadData = async () => {
        const data = await getInstance(instanceId);
        if (data) {
            setInstanceName(data.name);
            const loadedUsers = data.users;
            if (!loadedUsers.shared) {
                loadedUsers.shared = { id: 'shared', name: 'Shared Account', avatar: 'https://api.dicebear.com/7.x/icons/svg?seed=Shared', monthlyIncome: 0, color: '#64748b' };
            }
            setUsers(loadedUsers);
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

  const getMonthLabel = (dateStr: string) => {
      try {
          if (!dateStr) return 'Select Date';
          const parts = dateStr.split('-');
          if (parts.length !== 2) return dateStr;
          const [y, m] = parts.map(Number);
          if (isNaN(y) || isNaN(m)) return dateStr;
          return new Date(y, m - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
      } catch (e) {
          return dateStr;
      }
  };

  const monthLabel = getMonthLabel(currentMonth);

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
    if (!dateStr) return false;
    try {
        const now = new Date();
        now.setHours(23, 59, 59, 999);
        const [year, month] = dateStr.split('-').map(Number);
        if (!year || !month) return false;
        
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
    } catch (e) {
        return false;
    }
  };

  const filteredDashboardEntries = useMemo(() => entries.filter(e => filterByDate(e.monthId)), [entries, dashboardRange]);
  const filteredDashboardIncomes = useMemo(() => incomes.filter(i => filterByDate(i.monthId)), [incomes, dashboardRange]);

  if (loading || !users.user_1 || !users.user_2) return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-400">Loading Database...</div>;

  const bgClass = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800';
  const navBarClass = theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600';
  const navItemClass = (isActive: boolean) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-indigo-50 text-indigo-700') : 'hover:bg-black/5'}`;
  const dropdownClass = theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 pb-20 md:pb-0 ${bgClass}`}>
      
      <MonthPicker 
        isOpen={isMonthPickerOpen} onClose={() => setIsMonthPickerOpen(false)} 
        currentMonthId={currentMonth} onSelect={setCurrentMonth}
      />

      {/* Top Navigation (Desktop) */}
      <header className={`fixed top-0 left-0 right-0 h-16 border-b px-4 lg:px-8 flex items-center justify-between z-40 ${navBarClass}`}>
           <div className="flex items-center gap-8">
               <div className="flex items-center gap-3">
                   <div 
                        onClick={() => {
                            if (easterEggCount + 1 >= 2) {
                                setShowEasterEgg(true);
                                setEasterEggCount(0);
                            } else {
                                setEasterEggCount(p => p + 1);
                            }
                        }}
                        className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30 cursor-pointer select-none transition-transform active:scale-95"
                   >FS</div>
                   <span className={`font-bold text-lg hidden md:block ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>FairShare</span>
               </div>

               {/* Desktop Menu */}
               <nav className="hidden md:flex items-center gap-2">
                   <button 
                        onClick={() => { setActiveMainTab('insights'); setActiveInsightsView('global'); }}
                        className={navItemClass(activeMainTab === 'insights' && activeInsightsView === 'global')}
                   >
                       <LayoutDashboard size={18}/> Global
                   </button>
                   <button 
                        onClick={() => { setActiveMainTab('insights'); setActiveInsightsView('monthly'); }}
                        className={navItemClass(activeMainTab === 'insights' && activeInsightsView === 'monthly')}
                   >
                       <PieChart size={18}/> Monthly
                   </button>

                   {/* Register Dropdown */}
                   <div className="relative" ref={regMenuRef}>
                       <button 
                            onClick={() => setRegisterMenuOpen(!registerMenuOpen)}
                            className={navItemClass(activeMainTab === 'register')}
                       >
                           <PenTool size={18}/> Register <ChevronDown size={14} className={`transition-transform ${registerMenuOpen ? 'rotate-180' : ''}`}/>
                       </button>
                       {registerMenuOpen && (
                           <div className={`absolute top-full left-0 mt-2 w-48 rounded-xl border shadow-xl p-1 z-50 ${dropdownClass}`}>
                               <button onClick={() => { setActiveMainTab('register'); setActiveRegisterView('single'); setRegisterMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-black/5 flex items-center gap-2"><List size={16}/> Single Expense</button>
                               <button onClick={() => { setActiveMainTab('register'); setActiveRegisterView('worksheet'); setRegisterMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-black/5 flex items-center gap-2"><Grid size={16}/> Expenses Form</button>
                               <button onClick={() => { setActiveMainTab('register'); setActiveRegisterView('income'); setRegisterMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-black/5 flex items-center gap-2"><ArrowUpRight size={16}/> Income</button>
                           </div>
                       )}
                   </div>

                   {/* Planning Dropdown */}
                   <div className="relative" ref={planMenuRef}>
                        <button 
                            onClick={() => setPlanningMenuOpen(!planningMenuOpen)}
                            className={navItemClass(activeMainTab === 'planning')}
                       >
                           <Target size={18}/> Planning <ChevronDown size={14} className={`transition-transform ${planningMenuOpen ? 'rotate-180' : ''}`}/>
                       </button>
                       {planningMenuOpen && (
                           <div className={`absolute top-full left-0 mt-2 w-48 rounded-xl border shadow-xl p-1 z-50 ${dropdownClass}`}>
                               <button onClick={() => { setActiveMainTab('planning'); setActivePlanningView('budget'); setPlanningMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-black/5 flex items-center gap-2"><Target size={16}/> Budgets & Goals</button>
                               <button onClick={() => { setActiveMainTab('planning'); setActivePlanningView('travel'); setPlanningMenuOpen(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-black/5 flex items-center gap-2"><Plane size={16}/> Trips</button>
                           </div>
                       )}
                   </div>
               </nav>
           </div>
           
           <div className="flex items-center gap-4">
               {/* Controls specific to view */}
               {activeMainTab === 'insights' && activeInsightsView === 'global' && (
                 <div className="relative hidden sm:block">
                    <select 
                      value={dashboardRange} onChange={(e) => setDashboardRange(e.target.value as TimeRange)}
                      className={`appearance-none border-none rounded-lg py-1.5 pl-3 pr-8 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-colors ${theme === 'dark' ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-700'}`}
                    >
                      <option value="THIS_MONTH">This Month</option>
                      <option value="LAST_3_MONTHS">Last 3 Months</option>
                      <option value="LAST_6_MONTHS">Last 6 Months</option>
                      <option value="LAST_12_MONTHS">Last 12 Months</option>
                      <option value="THIS_YEAR">This Year</option>
                      <option value="ALL_TIME">All Time</option>
                    </select>
                    <CalendarIcon size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                 </div>
               )}

               {(activeMainTab === 'register' || (activeMainTab === 'insights' && activeInsightsView === 'monthly')) && (
                 <div className={`flex items-center rounded-lg p-1 transition-colors ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                      <button onClick={() => changeMonth(-1)} className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white text-slate-500'}`}><ChevronLeft size={14} /></button>
                      <button onClick={() => setIsMonthPickerOpen(true)} className={`px-2 text-xs font-semibold w-24 text-center select-none py-1 transition-colors rounded-md ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-white text-slate-700'}`}>{monthLabel}</button>
                      <button onClick={() => changeMonth(1)} className={`p-1 rounded-md transition-colors ${theme === 'dark' ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-white text-slate-500'}`}><ChevronRight size={14} /></button>
                 </div>
               )}

               {/* Save Status */}
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

               <button 
                    onClick={() => setActiveMainTab('settings')}
                    className={`p-2 rounded-full transition-colors ${activeMainTab === 'settings' ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-indigo-600') : 'text-slate-400 hover:text-slate-500'}`}
               >
                   <SettingsIcon size={20} />
               </button>
           </div>
        </header>

        {/* Main Content Area */}
        <div className="pt-20 px-4 pb-24 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
          <ErrorBoundary componentName="Main Content">
            {activeMainTab === 'insights' && (
                <>
                    <div className={`flex md:hidden justify-center p-1 rounded-xl gap-2 mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}>
                        <button onClick={() => setActiveInsightsView('global')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeInsightsView === 'global' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Global</button>
                        <button onClick={() => setActiveInsightsView('monthly')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeInsightsView === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Monthly</button>
                    </div>
                    
                    {activeInsightsView === 'global' && (
                        <DashboardCharts entries={filteredDashboardEntries} categories={categories} incomes={filteredDashboardIncomes} users={users} currency={currency} />
                    )}

                    {activeInsightsView === 'monthly' && (
                        <MonthlyDashboard currentMonth={currentMonth} entries={entries} budgets={budgets} categories={categories} savings={savings} incomes={incomes} users={users} currency={currency} />
                    )}
                </>
            )}

            {activeMainTab === 'register' && (
                <div className="space-y-6">
                    {/* Register Sub-Nav (Visible on Mobile/Tablet if not using dropdown, but here we use state) */}
                    <div className={`flex md:hidden justify-center p-1 rounded-xl gap-2 mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}>
                        <button onClick={() => setActiveRegisterView('single')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeRegisterView === 'single' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Single</button>
                        <button onClick={() => setActiveRegisterView('worksheet')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeRegisterView === 'worksheet' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Form</button>
                        <button onClick={() => setActiveRegisterView('income')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeRegisterView === 'income' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Income</button>
                    </div>

                    {activeRegisterView === 'worksheet' && (
                        <MonthlyWorksheet 
                          users={users}
                          entries={entries} budgets={budgets} categories={categories} savings={savings} trips={trips} monthId={currentMonth} currency={currency}
                          onUpdateEntry={(cid, acc, amt, tid, desc) => {
                              setEntries(prev => {
                                  const singleSum = prev.filter(e => e.categoryId === cid && e.account === acc && e.monthId === currentMonth && e.entryType === 'single').reduce((s, e) => s + e.amount, 0);
                                  const needed = amt - singleSum;
                                  const idx = prev.findIndex(e => e.categoryId === cid && e.account === acc && e.monthId === currentMonth && e.entryType === 'worksheet');
                                  if (idx >= 0) { 
                                      const next = [...prev]; 
                                      next[idx] = { ...next[idx], amount: needed, ...(tid !== undefined ? { tripId: tid } : {}), ...(desc !== undefined ? { description: desc } : {}) }; 
                                      return next; 
                                  }
                                  return [...prev, { id: Math.random().toString(36), monthId: currentMonth, categoryId: cid, account: acc, amount: needed, entryType: 'worksheet', tripId: tid, description: desc }];
                              });
                          }}
                          onAddCategory={(n, g, a) => setCategories(p => [...p, {id: n.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4), name: n, group: g as any, defaultAccount: a}])}
                          onEditCategory={(id, n) => setCategories(p => p.map(c => c.id === id ? { ...c, name: n } : c))}
                          onDateClick={() => setIsMonthPickerOpen(true)}
                        />
                    )}
                    {activeRegisterView === 'single' && (
                        <div className="max-w-xl mx-auto"><SingleEntryForm categories={categories} trips={trips} currentMonth={currentMonth} users={users} currency={currency} onAddEntry={(e) => setEntries(p => [...p, { ...e, id: Math.random().toString(36) }])} /></div>
                    )}
                    {activeRegisterView === 'income' && (
                        <IncomeManager incomes={incomes} currentMonth={currentMonth} users={users} currency={currency} onAddIncome={(s, a, r, ir, mid) => setIncomes(p => [...p, {id: Math.random().toString(36), monthId: mid, source: s, amount: a, recipient: r, isRecurring: ir}])} onDeleteIncome={(id) => setIncomes(p => p.filter(i => i.id !== id))} />
                    )}
                </div>
            )}
            
            {activeMainTab === 'planning' && (
                <div className="space-y-6">
                    <div className={`flex md:hidden justify-center p-1 rounded-xl gap-2 mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}>
                        <button onClick={() => setActivePlanningView('budget')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activePlanningView === 'budget' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Budgets</button>
                        <button onClick={() => setActivePlanningView('travel')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activePlanningView === 'travel' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Trips</button>
                    </div>

                    {activePlanningView === 'travel' && <TravelDashboard users={users} trips={trips} entries={entries} currency={currency} onAddTrip={(t) => setTrips(p => [...p, { ...t, id: Math.random().toString(36) }])} onUpdateTrip={(updatedTrip) => setTrips(p => p.map(t => t.id === updatedTrip.id ? updatedTrip : t))} />}
                    
                    {activePlanningView === 'budget' && <BudgetManager budgets={budgets} categories={categories} savings={savings} entries={entries} totalIncome={currentTotalIncome} users={users} currency={currency}
                      onAddBudget={(cid, lim, acc) => setBudgets(p => [...p, { categoryId: cid, limit: lim, account: acc }])}
                      onAddGoal={(n, t, tt, i, acc, sd, td) => {
                          const gid = n.toLowerCase().replace(/\s+/g, '_') + '_' + Math.random().toString(36).substr(2, 4);
                          setCategories(p => [...p, { id: gid, name: n, group: 'SAVINGS', defaultAccount: acc }]);
                          setSavings(p => [...p, { id: gid, name: n, targetAmount: t, targetType: tt, initialAmount: i, account: acc, startDate: sd, targetDate: td }]);
                      }}
                    />}
                </div>
            )}
            
            {activeMainTab === 'settings' && (
              <SettingsPage 
                  users={users} 
                  currency={currency} 
                  theme={theme}
                  onUpdateUser={handleUpdateUser} 
                  onUpdateCurrency={setCurrency} 
                  onUpdateTheme={handleUpdateTheme}
                  onExport={handleExport}
                  onExit={onExit}
              />
            )}
          </ErrorBoundary>
        </div>

        {/* Mobile Bottom Navigation */}
        <div className={`md:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around px-2 z-50 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <button onClick={() => setActiveMainTab('insights')} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMainTab === 'insights' ? 'text-indigo-500' : 'text-slate-400'}`}>
                <LayoutDashboard size={20} />
                <span className="text-[10px] font-medium">Insights</span>
            </button>
            <button onClick={() => setActiveMainTab('register')} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMainTab === 'register' ? 'text-indigo-500' : 'text-slate-400'}`}>
                <PenTool size={20} />
                <span className="text-[10px] font-medium">Register</span>
            </button>
            <button onClick={() => setActiveMainTab('planning')} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMainTab === 'planning' ? 'text-indigo-500' : 'text-slate-400'}`}>
                <Target size={20} />
                <span className="text-[10px] font-medium">Planning</span>
            </button>
            <button onClick={() => setActiveMainTab('settings')} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMainTab === 'settings' ? 'text-indigo-500' : 'text-slate-400'}`}>
                <SettingsIcon size={20} />
                <span className="text-[10px] font-medium">Settings</span>
            </button>
        </div>

        {showEasterEgg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowEasterEgg(false)}>
              <div className="bg-white p-8 rounded-3xl shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200 text-center max-w-xs mx-4 border border-white/20" onClick={e => e.stopPropagation()}>
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-xl shadow-indigo-500/30 rotate-3">FS</div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">FairShare</h3>
                  <p className="text-slate-500 font-medium mb-1">Made with ❤️ by</p>
                  <a href="https://github.com/trasousa" target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline mb-6 block">trasousa</a>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-500 mb-8 border border-slate-200">
                      <span>v1.0.0</span>
                  </div>
                  <button onClick={() => setShowEasterEgg(false)} className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition active:scale-95">Awesome!</button>
              </div>
          </div>
        )}
    </div>
  );
}

export default App;