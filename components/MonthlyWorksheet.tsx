import React, { useState, useEffect } from 'react';
import { Category, ExpenseEntry, AccountType, Budget, Trip, CurrencyCode, SavingsGoal } from '../types';
import { AlertCircle, Plus, Edit2, Check, X, Plane, TrendingUp } from 'lucide-react';

interface MonthlyWorksheetProps {
  entries: ExpenseEntry[];
  budgets: Budget[];
  categories: Category[];
  savings?: SavingsGoal[];
  trips: Trip[];
  monthId: string;
  currency: CurrencyCode;
  onUpdateEntry: (categoryId: string, account: AccountType, amount: number, tripId?: string) => void;
  onAddCategory: (name: string, group: string, account: AccountType) => void;
  onEditCategory: (id: string, newName: string) => void;
  onDateClick: () => void;
}

const MoneyInput = ({ value, onChange, colorBase, currency, readOnly = false }: { value: number; onChange: (val: number) => void; colorBase: 'purple' | 'blue' | 'pink' | 'emerald'; currency: CurrencyCode; readOnly?: boolean; }) => {
  const [localValue, setLocalValue] = useState(value === 0 ? '' : value.toString());

  useEffect(() => {
    if (parseFloat(localValue || '0') !== value) {
        setLocalValue(value === 0 ? '' : value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
        setLocalValue(raw);
        const num = parseFloat(raw);
        onChange(!isNaN(num) ? num : 0);
    }
  };

  const colorClasses = {
    purple: value > 0 ? 'bg-purple-50 border-purple-200 text-purple-700 font-medium' : 'bg-white border-slate-200 text-slate-600',
    blue: value > 0 ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white border-slate-200 text-slate-600',
    pink: value > 0 ? 'bg-pink-50 border-pink-200 text-pink-700 font-medium' : 'bg-white border-slate-200 text-slate-600',
    emerald: value > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-medium' : 'bg-white border-slate-200 text-slate-600',
  };

  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : currency === 'BRL' ? 'R$' : '$';

  return (
    <div className="relative group/input">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">{symbol}</span>
        <input 
            type="text" 
            inputMode="decimal"
            placeholder="0"
            readOnly={readOnly}
            className={`w-full pl-6 pr-2 py-1.5 text-sm border rounded-md outline-none focus:ring-2 transition text-right ${readOnly ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : colorClasses[colorBase]} focus:ring-${colorBase}-200`}
            value={localValue}
            onChange={handleChange}
            onBlur={() => setLocalValue(value === 0 ? '' : value.toString())}
        />
    </div>
  );
};

export const MonthlyWorksheet: React.FC<MonthlyWorksheetProps> = ({ entries, budgets, categories, savings = [], trips, monthId, currency, onUpdateEntry, onAddCategory, onEditCategory, onDateClick }) => {
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState('VARIABLE');
  const [newCatAccount, setNewCatAccount] = useState<AccountType>('SHARED');
  const [activeTripId, setActiveTripId] = useState<string>('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const getAmount = (catId: string, account: AccountType) => entries.filter(e => e.categoryId === catId && e.account === account && e.monthId === monthId).reduce((sum, e) => sum + e.amount, 0);
  const getBudget = (catId: string) => budgets.find(b => b.categoryId === catId)?.limit || 0;

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newCatName.trim()) {
          onAddCategory(newCatName, newCatGroup, newCatAccount);
          setIsAddingCat(false);
          setNewCatName('');
      }
  };

  const startEditing = (cat: Category) => {
      setEditingCatId(cat.id);
      setEditingName(cat.name);
  };

  const saveEditing = () => {
      if(editingCatId && editingName.trim()) {
          onEditCategory(editingCatId, editingName);
          setEditingCatId(null);
      }
  };

  const renderSection = (title: string, filterFn: (c: Category) => boolean, showShared: boolean, showU1: boolean, showU2: boolean, isTravelSection = false, isSavingsSection = false) => {
    let sectionCategories = categories.filter(filterFn);
    if (isSavingsSection) sectionCategories = sectionCategories.filter(cat => savings.some(s => s.id === cat.id));
    if (sectionCategories.length === 0) return null;

    return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2">
          <h3 className={`text-sm font-bold uppercase tracking-wider ${isSavingsSection ? 'text-emerald-600 flex items-center gap-2' : 'text-slate-400'}`}>
              {isSavingsSection && <TrendingUp size={16}/>}
              {title}
          </h3>
          {isTravelSection && (
              <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Assign to Trip:</span>
                  <div className="relative">
                      <select value={activeTripId} onChange={(e) => setActiveTripId(e.target.value)} className="pl-7 pr-3 py-1 text-xs border border-indigo-200 bg-indigo-50 text-indigo-700 rounded-md outline-none focus:ring-2 focus:ring-indigo-200 cursor-pointer appearance-none">
                          <option value="">(General / None)</option>
                          {trips.filter(t => t.status !== 'COMPLETED').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                      </select>
                      <Plane size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-indigo-500 pointer-events-none"/>
                  </div>
              </div>
          )}
      </div>

      <div className="hidden md:grid grid-cols-12 gap-4 items-center mb-2 px-2 text-xs font-semibold text-slate-400">
          <div className="col-span-5">Category</div>
          <div className="col-span-7 grid grid-cols-3 gap-2">
            <div>Shared</div>
            <div>User 1</div>
            <div>User 2</div>
          </div>
      </div>

      <div className="space-y-4">
        {sectionCategories.map(cat => {
            const budget = getBudget(cat.id);
            const sharedVal = getAmount(cat.id, 'SHARED');
            const u1Val = getAmount(cat.id, 'USER_1');
            const u2Val = getAmount(cat.id, 'USER_2');
            let rowTotal = (showShared ? sharedVal : 0) + (showU1 ? u1Val : 0) + (showU2 ? u2Val : 0);
            const isOverBudget = budget > 0 && rowTotal > budget;
            const isEditing = editingCatId === cat.id;

            return (
              <div key={cat.id} className="block md:grid md:grid-cols-12 md:gap-4 items-center hover:bg-slate-50 p-2 rounded-lg transition-colors group">
                <div className="md:col-span-5 mb-2 md:mb-0">
                  {isEditing ? (
                      <div className="flex items-center gap-2">
                          <input autoFocus type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full text-sm border border-indigo-300 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500" onKeyDown={(e) => e.key === 'Enter' && saveEditing()} />
                          <button onClick={saveEditing} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check size={14}/></button>
                          <button onClick={() => setEditingCatId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={14}/></button>
                      </div>
                  ) : (
                      <div className="group/name flex items-center justify-between">
                          <div>
                            <p className="font-medium text-slate-700 text-sm cursor-pointer" onClick={() => startEditing(cat)}>{cat.name}</p>
                            {budget > 0 && (
                                <div className="flex items-center gap-1 mt-0.5">
                                    <span className={`text-[10px] ${isOverBudget ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>Budget: {budget}</span>
                                    {isOverBudget && <AlertCircle size={10} className="text-red-500" />}
                                </div>
                            )}
                          </div>
                          {!isSavingsSection && <button onClick={() => startEditing(cat)} className="opacity-0 group-hover/name:opacity-100 text-slate-300 hover:text-indigo-500 transition-opacity"><Edit2 size={12} /></button>}
                      </div>
                  )}
                </div>
                
                <div className="md:col-span-7">
                    <div className="grid grid-cols-3 gap-2">
                        <div>{showShared && <MoneyInput value={sharedVal} onChange={(val) => onUpdateEntry(cat.id, 'SHARED', val, activeTripId)} colorBase={isSavingsSection ? 'emerald' : 'purple'} currency={currency}/>}</div>
                        <div>{showU1 && <MoneyInput value={u1Val} onChange={(val) => onUpdateEntry(cat.id, 'USER_1', val, activeTripId)} colorBase={isSavingsSection ? 'emerald' : 'blue'} currency={currency}/>}</div>
                        <div>{showU2 && <MoneyInput value={u2Val} onChange={(val) => onUpdateEntry(cat.id, 'USER_2', val, activeTripId)} colorBase={isSavingsSection ? 'emerald' : 'pink'} currency={currency}/>}</div>
                    </div>
                </div>
              </div>
            );
        })}
      </div>
    </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
             <span className="text-xs font-medium text-slate-500 text-center md:text-left">Enter your expenses directly in the columns below.</span>
            <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div>Shared</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div>User 1</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-pink-500"></div>User 2</div>
            </div>
        </div>
        
        <div className="p-4 sm:p-6 pb-24">
            {renderSection("Wealth Building & Savings", c => c.group === 'SAVINGS', true, true, true, false, true)}
            {renderSection("Shared Household & Living", c => c.group !== 'TRAVEL' && c.group !== 'SAVINGS' && c.defaultAccount === 'SHARED', true, false, false)}
            {renderSection("Personal Expenses", c => c.group !== 'TRAVEL' && c.group !== 'SAVINGS' && c.defaultAccount !== 'SHARED', false, true, true)}
            {renderSection("Travel & Adventures", c => c.group === 'TRAVEL', true, true, true, true)}
        </div>

        <div className="absolute bottom-0 w-full bg-white/80 backdrop-blur-sm border-t border-slate-200 p-3">
             {!isAddingCat ? (
                 <button onClick={() => setIsAddingCat(true)} className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium text-sm px-2">
                     <Plus size={18} /> Add New Category
                 </button>
             ) : (
                 <form onSubmit={handleAddSubmit} className="flex flex-col md:flex-row gap-2 items-stretch md:items-end">
                     <div className="flex-1">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Category Name</label>
                         <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none" placeholder="e.g. Pet Care" />
                     </div>
                     <div className="w-full md:w-36">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Group</label>
                         <select value={newCatGroup} onChange={e => setNewCatGroup(e.target.value)} className="w-full border border-slate-300 rounded-lg p-2 text-sm h-full">
                             <option value="FIXED">Fixed</option>
                             <option value="VARIABLE">Variable</option>
                             <option value="LIFESTYLE">Lifestyle</option>
                             <option value="TRAVEL">Travel</option>
                         </select>
                     </div>
                     <div className="w-full md:w-36">
                         <label className="block text-xs font-medium text-slate-500 mb-1">Default</label>
                         <select value={newCatAccount} onChange={e => setNewCatAccount(e.target.value as AccountType)} className="w-full border border-slate-300 rounded-lg p-2 text-sm h-full">
                             <option value="SHARED">Shared</option>
                             <option value="USER_1">User 1</option>
                             <option value="USER_2">User 2</option>
                         </select>
                     </div>
                     <div className="flex gap-2 self-end">
                        <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Add</button>
                        <button type="button" onClick={() => setIsAddingCat(false)} className="bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-200">Cancel</button>
                     </div>
                 </form>
             )}
        </div>
    </div>
  );
};