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
  Calendar as CalendarIcon,
  Sparkles
} from 'lucide-react';

import { ExpenseEntry, AccountType, Budget, SavingsGoal, Category, TimeRange, Trip, IncomeEntry, User, UserId, AppInstance, CurrencyCode, Suggestion, CurrentUserId, ChatSession } from './types';
import { MonthlyWorksheet } from './components/MonthlyWorksheet';
import { SingleEntryForm } from './components/SingleEntryForm';
import { DashboardCharts } from './components/DashboardCharts';
import { MonthlyDashboard } from './components/MonthlyDashboard';
import { BudgetManager } from './components/BudgetManager';
import { TravelDashboard } from './components/TravelDashboard';
import { IncomeManager } from './components/IncomeManager';
import { SettingsPage } from './components/SettingsPage';
import { AIAssistant } from './components/AIAssistant';
import { MonthPicker } from './components/MonthPicker';
import { ErrorBoundary } from './components/ErrorBoundary'; 
import { getMonthLabel } from './services/financeService';
import { getInstance, saveInstance } from './services/storage';
import { generateId, entryHasTrip, entryHasNoTrip, normalizeTripId } from './services/utils';
import { useToast } from './components/Toast';

type MainTab = 'insights' | 'register' | 'planning' | 'ai' | 'settings';
type RegisterView = 'worksheet' | 'single' | 'income';
type PlanningView = 'budget' | 'travel';
type InsightsView = 'global' | 'monthly';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

/** Merge two arrays by id — server items win for existing IDs, local-only items are preserved. */
function mergeById<T extends { id: string }>(local: T[], server: T[]): T[] {
    const serverMap = new Map(server.map(item => [item.id, item]));
    const localOnly = local.filter(item => !serverMap.has(item.id));
    return [...server, ...localOnly];
}

interface AppProps {
    instanceId: string;
    currentUser: CurrentUserId;
    onExit: () => void;
}

function App({ instanceId, currentUser, onExit }: AppProps) {
  const [loading, setLoading] = useState(true);
  const [easterEggCount, setEasterEggCount] = useState(0);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [instanceName, setInstanceName] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [createdTimestamp, setCreatedTimestamp] = useState<number>(Date.now());
  const { toast } = useToast();
  
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
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [prefillData, setPrefillData] = useState<Partial<ExpenseEntry> | null>(null);

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
            // Normalize tripId fields from legacy string format to arrays
            const normalizedEntries = data.data.entries.map(e => ({
                ...e,
                tripId: normalizeTripId(e.tripId)
            }));
            setEntries(normalizedEntries);
            setIncomes(data.data.incomes);
            setCategories(data.data.categories);
            setBudgets(data.data.budgets);
            setSavings(data.data.savings);
            // Normalize trips: ensure account defaults to SHARED
            setTrips(data.data.trips.map(t => ({ ...t, account: t.account || 'SHARED' })));
            setSuggestions(data.data.suggestions || []);
            setChatSessions(data.data.chatSessions || []);
            setLastUpdated(data.lastUpdated || 0);
            setCreatedTimestamp(data.created || Date.now());
            setLoading(false);
        } else {
            onExit(); // Instance not found
        }
    };
    loadData();
  }, [instanceId]);

  // Sync polling (every 5 seconds)
  useEffect(() => {
      if (loading || saveStatus !== 'saved') return;

      const poll = async () => {
          try {
              const data = await getInstance(instanceId);
              if (data && data.lastUpdated && data.lastUpdated > lastUpdated) {
                  // Newer data on server — merge arrays so local-only items aren't lost
                  const serverEntries = data.data.entries.map((e: ExpenseEntry) => ({ ...e, tripId: normalizeTripId(e.tripId) }));
                  setEntries(prev => mergeById(prev, serverEntries));
                  setIncomes(prev => mergeById(prev, data.data.incomes));
                  setCategories(data.data.categories);
                  setBudgets(data.data.budgets);
                  setSavings(prev => mergeById(prev, data.data.savings));
                  setTrips(prev => mergeById(prev, data.data.trips.map((t: Trip) => ({ ...t, account: t.account || 'SHARED' }))));
                  setSuggestions(prev => mergeById(prev, data.data.suggestions || []));
                  setChatSessions(prev => mergeById(prev, data.data.chatSessions || []));
                  setLastUpdated(data.lastUpdated);
                  toast('Synced changes from another device', 'info');
              }
          } catch (e) {
              console.error("Polling error:", e);
          }
      };

      const interval = setInterval(poll, 5000);
      return () => clearInterval(interval);
  }, [instanceId, loading, saveStatus, lastUpdated]);

  // Persist Data Changes
  useEffect(() => {
      if (loading) return;
      
      setSaveStatus('unsaved');
      
      const saveData = async () => {
          setSaveStatus('saving');
          try {
              const updatedInstance: AppInstance = {
                  id: instanceId,
                  name: instanceName,
                  created: createdTimestamp,
                  lastAccessed: Date.now(),
                  lastUpdated: lastUpdated,
                  currency: currency,
                  theme: theme,
                  users: users,
                  data: {
                      entries,
                      categories,
                      budgets,
                      savings,
                      trips,
                      incomes,
                      suggestions,
                      chatSessions
                  }
              };
              const result = await saveInstance(updatedInstance);
              setLastUpdated(result.lastUpdated);
              setSaveStatus('saved');
          } catch (err: any) {
              if (err.status === 409) {
                  console.warn("Conflict detected, merging data...");
                  const data = await getInstance(instanceId);
                  if (data) {
                      const serverEntries = data.data.entries.map((e: ExpenseEntry) => ({ ...e, tripId: normalizeTripId(e.tripId) }));
                      setEntries(prev => mergeById(prev, serverEntries));
                      setIncomes(prev => mergeById(prev, data.data.incomes));
                      setCategories(data.data.categories);
                      setBudgets(data.data.budgets);
                      setSavings(prev => mergeById(prev, data.data.savings));
                      setTrips(prev => mergeById(prev, data.data.trips.map((t: Trip) => ({ ...t, account: t.account || 'SHARED' }))));
                      setSuggestions(prev => mergeById(prev, data.data.suggestions || []));
                      setChatSessions(prev => mergeById(prev, data.data.chatSessions || []));
                      setLastUpdated(data.lastUpdated || 0);
                      toast('Merged changes from server', 'info');
                  }
                  setSaveStatus('saved');
              } else {
                  console.error("Save error:", err);
                  setSaveStatus('unsaved');
                  toast('Failed to save — will retry', 'error');
              }
          }
      };

      const timeoutId = setTimeout(saveData, 500); 
      return () => clearTimeout(timeoutId);

  }, [entries, incomes, categories, budgets, savings, trips, suggestions, chatSessions, users, currency, theme, loading, instanceName]);

  const changeMonth = (direction: -1 | 1) => {
      const [year, month] = currentMonth.split('-').map(Number);
      const date = new Date(year, month - 1 + direction);
      const newMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      setCurrentMonth(newMonth);
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

  const handleAddSuggestion = (text: string) => {
      if (!text.trim()) return;
      const newSug: Suggestion = {
          id: generateId(),
          text: text.trim(),
          timestamp: Date.now()
      };
      setSuggestions(prev => [newSug, ...prev]);
  };

  const handleResolveSuggestion = (id: string) => {
      setSuggestions(prev => prev.filter(s => s.id !== id));
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

  if (loading || !users.user_1 || !users.user_2) return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/30 animate-pulse">FS</div>
      <div className="space-y-2 w-64">
        <div className="h-3 bg-slate-200 rounded-full animate-pulse w-full" />
        <div className="h-3 bg-slate-200 rounded-full animate-pulse w-4/5" />
        <div className="h-3 bg-slate-200 rounded-full animate-pulse w-3/5" />
      </div>
      <p className="text-xs text-slate-400 font-medium">Loading your finances…</p>
    </div>
  );

  const bgClass = theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-800';
  const navBarClass = theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600';
  const navItemClass = (isActive: boolean) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-indigo-50 text-indigo-700') : 'hover:bg-black/5'}`;
  const dropdownClass = theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-200 text-slate-700';
  
  const getInputClass = (isInput: boolean = true) => 
    `w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-100 outline-none transition-colors ${
      theme === 'dark' 
        ? (isInput ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-400' : 'bg-slate-800 border-slate-700 text-slate-200') 
        : (isInput ? 'bg-white border-slate-300 text-slate-700 placeholder-slate-400' : 'bg-white border-slate-300 text-slate-700')
    }`;

  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 pb-20 md:pb-0 ${bgClass}`}>

      <MonthPicker
        isOpen={isMonthPickerOpen} onClose={() => setIsMonthPickerOpen(false)} 
        currentMonthId={currentMonth} onSelect={setCurrentMonth}
      />

      {/* Top Navigation (Desktop) */}
      <header className={`fixed top-0 left-0 right-0 h-16 border-b px-4 lg:px-8 flex items-center justify-between z-40 ${navBarClass}`}>
           <div className="flex items-center gap-8">
               <div 
                    className="flex items-center gap-3 cursor-pointer select-none group"
                    onClick={() => {
                        if (easterEggCount + 1 >= 2) {
                            setShowEasterEgg(true);
                            setEasterEggCount(0);
                        } else {
                            setEasterEggCount(p => p + 1);
                        }
                    }}
               >
                   <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/30 transition-transform group-active:scale-95">FS</div>
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
                 <div className="relative">
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

               {/* Save Status — subtle dot */}
               <div className="flex items-center gap-1" title={saveStatus === 'saved' ? 'All changes saved' : 'Saving…'}>
                   {saveStatus === 'saving' ? (
                       <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                   ) : (
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
                   )}
               </div>

               {/* AI Assistant */}
               <button
                   onClick={() => setActiveMainTab('ai')}
                   title="AI Assistant"
                   className={`p-2 rounded-full transition-colors ${activeMainTab === 'ai' ? (theme === 'dark' ? 'bg-slate-800 text-indigo-400' : 'bg-indigo-50 text-indigo-600') : (theme === 'dark' ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600')}`}
               >
                   <Sparkles size={18} />
               </button>

               <button
                    onClick={() => setActiveMainTab('settings')}
                    className={`p-2 rounded-full transition-colors ${activeMainTab === 'settings' ? (theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-indigo-600') : 'text-slate-400 hover:text-slate-500'}`}
               >
                   <SettingsIcon size={20} />
               </button>
           </div>
        </header>

        {/* Main Content Area */}
        <div className="pt-20 px-6 lg:px-12 max-w-[1800px] mx-auto w-full space-y-6">
          <ErrorBoundary componentName="Main Content">
            {activeMainTab === 'insights' && (
                <>
                    <div className={`flex md:hidden justify-center p-1 rounded-xl gap-2 mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}>
                        <button onClick={() => setActiveInsightsView('global')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeInsightsView === 'global' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Global</button>
                        <button onClick={() => setActiveInsightsView('monthly')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activeInsightsView === 'monthly' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Monthly</button>
                    </div>
                    
                    {activeInsightsView === 'global' && (
                        <DashboardCharts entries={filteredDashboardEntries} categories={categories} incomes={filteredDashboardIncomes} users={users} currency={currency} trips={trips} />
                    )}

                    {activeInsightsView === 'monthly' && (
                        <MonthlyDashboard 
                            currentMonth={currentMonth} 
                            entries={entries} 
                            budgets={budgets} 
                            categories={categories} 
                            savings={savings} 
                            incomes={incomes} 
                            users={users} 
                            currency={currency} 
                            onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))}
                        />
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
                          getInputClass={getInputClass}
                          onUpdateEntry={(cid, acc, amt, tid, desc) => {
                              setEntries(prev => {
                                  // For worksheet entries, we filter by category, account, month, AND specific trip
                                  const singleSum = prev.filter(e => e.categoryId === cid && e.account === acc && e.monthId === currentMonth && e.entryType === 'single' && (tid ? entryHasTrip(e.tripId, tid) : entryHasNoTrip(e.tripId))).reduce((s, e) => s + e.amount, 0);
                                  const needed = amt - singleSum;

                                  const idx = prev.findIndex(e => e.categoryId === cid && e.account === acc && e.monthId === currentMonth && e.entryType === 'worksheet' && (tid ? entryHasTrip(e.tripId, tid) : entryHasNoTrip(e.tripId)));

                                  if (idx >= 0) {
                                      const next = [...prev];
                                      next[idx] = { ...next[idx], amount: needed, ...(tid !== undefined ? { tripId: tid ? [tid] : [] } : {}), ...(desc !== undefined ? { description: desc } : {}) };
                                      return next;
                                  }
                                  return [...prev, { id: generateId(), monthId: currentMonth, categoryId: cid, account: acc, amount: needed, entryType: 'worksheet', tripId: tid ? [tid] : [], description: desc }];
                              });
                          }}
                          onAddCategory={(n, g, a) => {
                              setCategories(p => {
                                  if (p.some(c => c.name.toLowerCase() === n.toLowerCase() && c.group === g && c.defaultAccount === a)) return p;
                                  return [...p, {id: n.toLowerCase().replace(/\s+/g, '_') + '_' + generateId().slice(0, 8), name: n, group: g as any, defaultAccount: a}];
                              });
                          }}
                          onEditCategory={(id, n) => {
                              setCategories(p => {
                                  const target = p.find(c => c.id === id);
                                  if (!target) return p;
                                  const oldName = target.name;
                                  const group = target.group;
                                  return p.map(c => (c.name === oldName && c.group === group) ? { ...c, name: n } : c);
                              });
                          }}
                          onDeleteCategory={(id) => {
                              setCategories(p => {
                                  const target = p.find(c => c.id === id);
                                  if (!target) return p;
                                  const name = target.name;
                                  const group = target.group;
                                  return p.filter(c => !(c.name === name && c.group === group));
                              });
                          }}
                          onReorderCategories={(newCats) => setCategories(newCats)}
                          onDateClick={() => setIsMonthPickerOpen(true)}
                        />
                    )}
                    {activeRegisterView === 'single' && (
                        <div className="max-w-xl mx-auto"><SingleEntryForm categories={categories} trips={trips} entries={entries} currentMonth={currentMonth} users={users} currency={currency} theme={theme} getInputClass={getInputClass} currentUser={currentUser} prefillData={prefillData} onClearPrefill={() => setPrefillData(null)} onAddEntry={(e) => setEntries(p => [...p, { ...e, id: generateId() }])} /></div>
                    )}
                    {activeRegisterView === 'income' && (
                        <IncomeManager incomes={incomes} currentMonth={currentMonth} users={users} currency={currency} onAddIncome={(s, a, r, ir, mid) => setIncomes(p => [...p, {id: generateId(), monthId: mid, source: s, amount: a, recipient: r, isRecurring: ir}])} onDeleteIncome={(id) => setIncomes(p => p.filter(i => i.id !== id))} />
                    )}
                </div>
            )}
            
            {activeMainTab === 'planning' && (
                <div className="space-y-6">
                    <div className={`flex md:hidden justify-center p-1 rounded-xl gap-2 mb-4 ${theme === 'dark' ? 'bg-white/5' : 'bg-slate-200'}`}>
                        <button onClick={() => setActivePlanningView('budget')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activePlanningView === 'budget' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Budgets</button>
                        <button onClick={() => setActivePlanningView('travel')} className={`flex-1 py-2 text-xs font-bold rounded-lg ${activePlanningView === 'travel' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Trips</button>
                    </div>

                    {activePlanningView === 'travel' && <TravelDashboard
                        users={users} trips={trips} entries={entries} categories={categories} currency={currency}
                        onAddTrip={(t) => setTrips(p => [...p, { ...t, id: generateId() }])}
                        onUpdateTrip={(updatedTrip) => setTrips(p => p.map(t => t.id === updatedTrip.id ? updatedTrip : t))}
                        onDeleteTrip={(tripId) => setTrips(p => p.filter(t => t.id !== tripId))}
                        onAddEntry={(e) => setEntries(p => [...p, { ...e, id: generateId() }])}
                        onNavigateToMonth={(monthId) => {
                            setCurrentMonth(monthId);
                            setActiveMainTab('insights');
                            setActiveInsightsView('monthly');
                        }}
                    />}
                    
                    {activePlanningView === 'budget' && <BudgetManager
                      budgets={budgets} categories={categories} savings={savings}
                      entries={entries} incomes={incomes} totalIncome={currentTotalIncome}
                      users={users} currency={currency} getInputClass={getInputClass}
                      onAddBudget={(cid, lim, acc) => setBudgets(p => {
                          // Replace existing budget for same category+account, or append
                          const idx = p.findIndex(b => b.categoryId === cid && b.account === acc);
                          if (idx >= 0) { const next = [...p]; next[idx] = { categoryId: cid, limit: lim, account: acc }; return next; }
                          return [...p, { categoryId: cid, limit: lim, account: acc }];
                      })}
                      onDeleteBudget={(cid, acc) => setBudgets(p => p.filter(b => !(b.categoryId === cid && b.account === acc)))}
                      onAddGoal={(n, t, tt, i, acc, sd, td, pp) => {
                          const gid = n.toLowerCase().replace(/\s+/g, '_') + '_' + generateId().slice(0, 8);
                          setCategories(p => [...p, { id: gid, name: n, group: 'SAVINGS', defaultAccount: acc }]);
                          setSavings(p => [...p, { id: gid, name: n, targetAmount: t, targetType: tt, initialAmount: i, account: acc, startDate: sd, targetDate: td, projectionPeriod: pp || (tt === 'PERCENTAGE' ? 'MONTHLY' : undefined) }]);
                      }}
                      onUpdateGoal={(updated) => setSavings(p => p.map(s => s.id === updated.id ? updated : s))}
                      onDeleteGoal={(id) => {
                          setSavings(p => p.filter(s => s.id !== id));
                          setCategories(p => p.filter(c => c.id !== id));
                      }}
                    />}
                </div>
            )}
            
            {activeMainTab === 'ai' && (
              <AIAssistant
                  entries={entries}
                  categories={categories}
                  trips={trips}
                  incomes={incomes}
                  budgets={budgets}
                  savings={savings}
                  users={users}
                  currency={currency}
                  theme={theme}
                  currentUser={currentUser}
                  chatSessions={chatSessions}
                  onUpdateChatSessions={setChatSessions}
                  onDeleteEntries={(ids) => setEntries(prev => prev.filter(e => !ids.includes(e.id)))}
                  onAddEntries={(newEntries) => setEntries(prev => [...prev, ...newEntries.map(e => ({ ...e, id: generateId() }))])}
                  onAddIncome={(source, amount, recipient, monthId) => setIncomes(prev => [...prev, { id: generateId(), monthId, source, amount, recipient, isRecurring: false }])}
                  onNavigateToExpense={(prefill) => {
                    setPrefillData(prefill);
                    setActiveMainTab('register');
                    setActiveRegisterView('single');
                  }}
              />
            )}

            {activeMainTab === 'settings' && (
              <SettingsPage
                  instanceName={instanceName}
                  users={users}
                  currency={currency}
                  theme={theme}
                  getInputClass={getInputClass}
                  entries={entries}
                  categories={categories}
                  trips={trips}
                  onUpdateInstanceName={setInstanceName}
                  onUpdateUser={handleUpdateUser}
                  onUpdateCurrency={setCurrency}
                  onUpdateTheme={handleUpdateTheme}
                  onExport={handleExport}
                  onImportReplace={(imported) => {
                      const norm = (imported.data.entries || []).map((e: ExpenseEntry) => ({ ...e, tripId: normalizeTripId(e.tripId) }));
                      setEntries(norm);
                      setIncomes(imported.data.incomes || []);
                      setCategories(imported.data.categories || []);
                      setBudgets(imported.data.budgets || []);
                      setSavings(imported.data.savings || []);
                      setTrips((imported.data.trips || []).map((t: Trip) => ({ ...t, account: t.account || 'SHARED' })));
                      setSuggestions(imported.data.suggestions || []);
                      if (imported.currency) setCurrency(imported.currency);
                      const importedUsers = imported.users || {};
                      if (!importedUsers.shared) importedUsers.shared = { id: 'shared', name: 'Shared Account', avatar: 'https://api.dicebear.com/7.x/icons/svg?seed=Shared', monthlyIncome: 0, color: '#64748b' };
                      setUsers(importedUsers);
                      if (imported.name) setInstanceName(imported.name);
                  }}
                  onDeleteEntry={(id) => setEntries(prev => prev.filter(e => e.id !== id))}
                  onDeleteOrphans={() => setEntries(prev => prev.filter(e => categories.some(c => c.id === e.categoryId)))}
                  onDeleteZeros={() => setEntries(prev => prev.filter(e => e.amount !== 0))}
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
            <button onClick={() => setActiveMainTab('ai')} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMainTab === 'ai' ? 'text-indigo-500' : 'text-slate-400'}`}>
                <Sparkles size={20} />
                <span className="text-[10px] font-medium">AI</span>
            </button>
            <button onClick={() => setActiveMainTab('settings')} className={`flex flex-col items-center gap-1 p-2 rounded-lg ${activeMainTab === 'settings' ? 'text-indigo-500' : 'text-slate-400'}`}>
                <SettingsIcon size={20} />
                <span className="text-[10px] font-medium">Settings</span>
            </button>
        </div>

        {showEasterEgg && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => { setShowEasterEgg(false); setSuggestionText(''); }}>
              <div className="bg-white p-8 rounded-3xl shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-200 text-center max-w-sm w-full mx-4 border border-white/20" onClick={e => e.stopPropagation()}>
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6 shadow-xl shadow-indigo-500/30 rotate-3">FS</div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">FairShare</h3>
                  
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-mono text-slate-500 mb-6 border border-slate-200">
                      <span>v1.1</span>
                  </div>

                  <div className="text-left border-t border-slate-100 pt-6 mt-2 space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">New Improvement Suggestion</label>
                        <textarea 
                            value={suggestionText}
                            onChange={(e) => setSuggestionText(e.target.value)}
                            placeholder="What should we add next?..."
                            className="w-full text-sm border border-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-indigo-100 outline-none transition-all resize-none bg-slate-50 mb-2"
                            rows={2}
                        />
                        <button 
                            disabled={!suggestionText.trim()}
                            onClick={() => { handleAddSuggestion(suggestionText); setSuggestionText(''); }}
                            className="w-full py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                        >
                            Save Suggestion
                        </button>
                      </div>

                      {suggestions.length > 0 && (
                          <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pending Suggestions ({suggestions.length})</label>
                              <div className="max-h-48 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                                  {suggestions.map(s => (
                                      <div key={s.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex justify-between items-start gap-3 group">
                                          <div className="flex-1">
                                              <p className="text-xs text-slate-700 leading-relaxed">{s.text}</p>
                                              <span className="text-[9px] text-slate-400 mt-1 block">{new Date(s.timestamp).toLocaleDateString()}</span>
                                          </div>
                                          <button 
                                            onClick={() => handleResolveSuggestion(s.id)}
                                            className="p-1.5 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                            title="Resolve"
                                          >
                                              <CheckCircle2 size={14} />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>

                  <button onClick={() => { setShowEasterEgg(false); setSuggestionText(''); }} className="w-full mt-6 bg-slate-900 text-white py-3.5 rounded-2xl font-bold hover:bg-slate-800 transition active:scale-95">Close</button>
              </div>
          </div>
        )}
    </div>
  );
}

export default App;