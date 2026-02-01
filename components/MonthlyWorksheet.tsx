import React, { useState, useEffect } from 'react';
import { Category, ExpenseEntry, AccountType, Budget, Trip, CurrencyCode, SavingsGoal, User } from '../types';
import { AlertCircle, Plus, Edit2, Check, X, Plane, TrendingUp, MessageSquare, Trash2, GripVertical, Settings2 } from 'lucide-react';

interface MonthlyWorksheetProps {
  entries: ExpenseEntry[];
  budgets: Budget[];
  categories: Category[];
  savings?: SavingsGoal[];
  users: Record<string, User>;
  trips: Trip[];
  monthId: string;
  currency: CurrencyCode;
  getInputClass: (isInput?: boolean) => string;
  onUpdateEntry: (categoryId: string, account: AccountType, amount: number, tripId?: string, description?: string) => void;
  onAddCategory: (name: string, group: string, account: AccountType) => void;
  onEditCategory: (id: string, newName: string) => void;
  onDeleteCategory: (id: string) => void;
  onReorderCategories: (newCategories: Category[]) => void;
  onDateClick: () => void;
}

import { ChevronDown, ChevronUp } from 'lucide-react';

const MoneyInput = ({ value, onChange, onDescriptionChange, description, color, currency, readOnly = false, getInputClass }: { value: number; onChange: (val: number) => void; onDescriptionChange: (val: string) => void; description?: string; color: string; currency: CurrencyCode; readOnly?: boolean; getInputClass: (isInput?: boolean) => string; }) => {
  const [localValue, setLocalValue] = useState(value === 0 ? '' : value.toString());
  const [showDesc, setShowDesc] = useState(false);

  useEffect(() => {
    if (document.activeElement !== document.querySelector(`[value="${localValue}"]`)) {
      setLocalValue(value === 0 ? '' : value.toString());
    }
  }, [value]);

  const evaluate = (expression: string): number => {
      try {
          if (!/^[\d\+\-\*\/\.\(\)\s]+$/.test(expression)) return parseFloat(expression) || 0;
          const result = new Function('return ' + expression)();
          return isFinite(result) ? Number(result.toFixed(2)) : 0;
      } catch (e) {
          return 0;
      }
  };

  const handleBlur = () => {
      const result = evaluate(localValue);
      setLocalValue(result === 0 ? '' : result.toString());
      onChange(result);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
          (e.target as HTMLInputElement).blur();
      }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '' || /^[\d\+\-\*\/\.\(\)\s]*$/.test(raw)) {
        setLocalValue(raw);
    }
  };

  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : currency === 'BRL' ? 'R$' : '$';

  return (
    <div className="relative group/input">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-medium pointer-events-none z-10">{symbol}</span>
        <input 
            type="text" 
            inputMode="text"
            placeholder="0"
            readOnly={readOnly}
            className={getInputClass()}
            style={!readOnly && value > 0 ? { 
                backgroundColor: `${color}10`, 
                borderColor: `${color}50`, 
                color: color, 
                fontWeight: 'bold',
                boxShadow: `0 0 0 1px ${color}20`,
                paddingLeft: '2rem'
            } : { paddingLeft: '2rem' }}
            value={localValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
        />
        {!readOnly && (
            <>
                <button 
                    onClick={() => setShowDesc(!showDesc)}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-md transition-all ${description ? 'bg-indigo-50 hover:bg-indigo-100' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100 opacity-0 group-hover/input:opacity-100'}`}
                    style={{ color: description ? color : undefined }}
                    title={description || "Add comment"}
                >
                    <MessageSquare size={14} fill={description ? "currentColor" : "none"} />
                </button>
                {showDesc && (
                    <div className="absolute top-full right-0 z-50 mt-2 w-64 bg-white border border-slate-200 shadow-xl rounded-xl p-3 animate-in fade-in zoom-in-95 duration-200 ring-1 ring-slate-900/5">
                        <textarea 
                            value={description || ''} 
                            onChange={e => onDescriptionChange(e.target.value)}
                            className={getInputClass(false)}
                            placeholder="Add a note or description..."
                            autoFocus
                        />
                        <div className="flex justify-end mt-2">
                            <button 
                                onClick={() => setShowDesc(false)} 
                                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium transition shadow-sm shadow-indigo-200"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </>
        )}
    </div>
  );
};

export const MonthlyWorksheet: React.FC<MonthlyWorksheetProps> = ({ entries, budgets, categories, savings = [], users, trips, monthId, currency, getInputClass, onUpdateEntry, onAddCategory, onEditCategory, onDeleteCategory, onReorderCategories, onDateClick }) => {
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatGroup, setNewCatGroup] = useState('VARIABLE');
  const [newCatAccounts, setNewCatAccounts] = useState({ SHARED: true, USER_1: false, USER_2: false });
  const [activeTripId, setActiveTripId] = useState<string>('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const [draggedCatId, setDraggedCatId] = useState<string | null>(null);

  const toggleSection = (title: string) => setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));

  const getAmount = (catId: string, account: AccountType, tripId?: string) => {
    return entries
        .filter(e => e.categoryId === catId && e.account === account && e.monthId === monthId && (tripId ? e.tripId?.includes(tripId) : (!e.tripId || e.tripId.length === 0)))
        .reduce((sum, e) => sum + e.amount, 0);
  };

  const getDescription = (catId: string, account: AccountType, tripId?: string) => {
      const entry = entries.find(e => e.categoryId === catId && e.account === account && e.monthId === monthId && e.entryType === 'worksheet' && (tripId ? e.tripId?.includes(tripId) : (!e.tripId || e.tripId.length === 0)));
      return entry?.description || '';
  };

  const getBudget = (catId: string) => budgets.find(b => b.categoryId === catId)?.limit || 0;

  const handleAddSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newCatName.trim()) {
          if (newCatAccounts.SHARED) onAddCategory(newCatName, newCatGroup, 'SHARED');
          if (newCatAccounts.USER_1) onAddCategory(newCatName, newCatGroup, 'USER_1');
          if (newCatAccounts.USER_2) onAddCategory(newCatName, newCatGroup, 'USER_2');
          
          setIsAddingCat(false);
          setNewCatName('');
          setNewCatAccounts({ SHARED: true, USER_1: false, USER_2: false });
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

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCatId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedCatId || draggedCatId === targetId) return;

    const sourceIdx = categories.findIndex(c => c.id === draggedCatId);
    const targetIdx = categories.findIndex(c => c.id === targetId);
    
    if (sourceIdx !== -1 && targetIdx !== -1) {
        const newCats = [...categories];
        const [moved] = newCats.splice(sourceIdx, 1);
        newCats.splice(targetIdx, 0, moved);
        onReorderCategories(newCats);
    }
    setDraggedCatId(null);
  };

  const renderCategoryRow = (cat: Category, showShared: boolean, showU1: boolean, showU2: boolean, tripId?: string, isSubRow = false) => {
    const budget = getBudget(cat.id);
    const sharedVal = getAmount(cat.id, 'SHARED', tripId);
    const u1Val = getAmount(cat.id, 'USER_1', tripId);
    const u2Val = getAmount(cat.id, 'USER_2', tripId);
    let rowTotal = (showShared ? sharedVal : 0) + (showU1 ? u1Val : 0) + (showU2 ? u2Val : 0);
    const isOverBudget = !tripId && budget > 0 && rowTotal > budget;
    const isEditing = editingCatId === cat.id;

    const isDragging = draggedCatId === cat.id;
    const tripName = tripId ? trips.find(t => t.id === tripId)?.name : 'General';

    return (
        <div 
            key={cat.id + (tripId || '')} 
            className={`block md:grid md:grid-cols-12 md:gap-4 items-center hover:bg-slate-50 p-2 rounded-lg transition-colors group ${isDragging ? 'opacity-50 bg-indigo-100' : ''} ${isSubRow ? 'md:ml-6 border-l-2 border-slate-100' : ''}`}
            draggable={!isSubRow && isOrganizing && cat.group !== 'SAVINGS'}
            onDragStart={e => !isSubRow && handleDragStart(e, cat.id)}
            onDragOver={e => e.preventDefault()}
            onDrop={e => !isSubRow && handleDrop(e, cat.id)}
        >
            <div className="md:col-span-5 mb-2 md:mb-0 flex items-center gap-2">
            {!isSubRow && isOrganizing && cat.group !== 'SAVINGS' && <GripVertical size={16} className="text-slate-300 cursor-grab" />}
            {isEditing && !isSubRow ? (
                <div className="flex items-center gap-2 flex-1">
                    <input autoFocus type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)} className={getInputClass()} onKeyDown={(e) => e.key === 'Enter' && saveEditing()} />
                    <button onClick={saveEditing} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded"><Check size={14}/></button>
                    <button onClick={() => setEditingCatId(null)} className="text-slate-400 hover:bg-slate-100 p-1 rounded"><X size={14}/></button>
                </div>
            ) : (
                <div className="group/name flex-1 flex items-center justify-between overflow-hidden">
                    <div className="truncate">
                        <p className={`font-medium text-slate-700 text-sm ${isSubRow ? 'text-xs text-slate-500 italic flex items-center gap-1' : ''}`}>
                            {isSubRow && <Plane size={10} />}
                            {isSubRow ? tripName : cat.name}
                        </p>
                        {!isSubRow && budget > 0 && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className={`text-[10px] ${isOverBudget ? 'text-red-500 font-semibold' : 'text-slate-400'}`}>Budget: {budget}</span>
                                {isOverBudget && <AlertCircle size={10} className="text-red-500" />}
                            </div>
                        )}
                    </div>
                    {!isSubRow && cat.group !== 'SAVINGS' && !isOrganizing && (
                        <div className="flex items-center gap-1 opacity-0 group-hover/name:opacity-100 transition-opacity flex-shrink-0">
                            {cat.group === 'TRAVEL' && (
                                <div className="relative">
                                    <select 
                                        className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-300"
                                        onChange={(e) => {
                                            if (e.target.value) onUpdateEntry(cat.id, 'SHARED', 0, e.target.value);
                                            e.target.value = '';
                                        }}
                                        value=""
                                    >
                                        <option value="">+ Trip</option>
                                        {trips.filter(t => t.status !== 'COMPLETED').map(t => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            <button onClick={() => startEditing(cat)} className="text-slate-300 hover:text-indigo-500 p-1"><Edit2 size={12} /></button>
                            <button onClick={() => { if(confirm('Delete category?')) onDeleteCategory(cat.id); }} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={12} /></button>
                        </div>
                    )}
                </div>
            )}
            </div>
            
            <div className="md:col-span-7">
                <div className="grid grid-cols-3 gap-2">
                    <div>{showShared && <MoneyInput value={sharedVal} onChange={(val) => onUpdateEntry(cat.id, 'SHARED', val, tripId)} onDescriptionChange={(d) => onUpdateEntry(cat.id, 'SHARED', sharedVal, tripId, d)} description={getDescription(cat.id, 'SHARED', tripId)} color={users.shared?.color || '#a855f7'} currency={currency} getInputClass={getInputClass}/>}</div>
                    <div>{showU1 && <MoneyInput value={u1Val} onChange={(val) => onUpdateEntry(cat.id, 'USER_1', val, tripId)} onDescriptionChange={(d) => onUpdateEntry(cat.id, 'USER_1', u1Val, tripId, d)} description={getDescription(cat.id, 'USER_1', tripId)} color={users.user_1.color} currency={currency} getInputClass={getInputClass}/>}</div>
                    <div>{showU2 && <MoneyInput value={u2Val} onChange={(val) => onUpdateEntry(cat.id, 'USER_2', val, tripId)} onDescriptionChange={(d) => onUpdateEntry(cat.id, 'USER_2', u2Val, tripId, d)} description={getDescription(cat.id, 'USER_2', tripId)} color={users.user_2.color} currency={currency} getInputClass={getInputClass}/>}</div>
                </div>
            </div>
        </div>
    );
  };

  const renderSection = (title: string, filterFn: (c: Category) => boolean, showShared: boolean, showU1: boolean, showU2: boolean, isTravelSection = false, isSavingsSection = false) => {
    let sectionCategories = categories.filter(filterFn);
    if (isSavingsSection) sectionCategories = sectionCategories.filter(cat => savings.some(s => s.id === cat.id));
    if (sectionCategories.length === 0) return null;

    const isCollapsed = collapsedSections[title];

    return (
    <div className="mb-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div 
        className="flex justify-between items-end mb-4 border-b border-slate-100 pb-2 cursor-pointer hover:bg-slate-50/50 transition-colors rounded px-2 select-none"
        onClick={() => toggleSection(title)}
      >
          <div className="flex items-center gap-2">
            <h3 className={`text-sm font-bold uppercase tracking-wider ${isSavingsSection ? 'text-emerald-600 flex items-center gap-2' : 'text-slate-400'}`}>
                {isSavingsSection && <TrendingUp size={16}/>}
                {title}
            </h3>
            {isCollapsed ? <ChevronDown size={14} className="text-slate-400"/> : <ChevronUp size={14} className="text-slate-400"/>}
          </div>
      </div>

      {!isCollapsed && (
        <>
        <div className="hidden md:grid grid-cols-12 gap-4 items-center mb-2 px-2 text-xs font-semibold text-slate-400">
            <div className="col-span-5">Category</div>
            <div className="col-span-7 grid grid-cols-3 gap-2">
                <div>Shared</div>
                <div>{users.user_1?.name}</div>
                <div>{users.user_2?.name}</div>
            </div>
        </div>

        <div className="space-y-4">
            {sectionCategories.map(cat => {
                if (isTravelSection) {
                    const involvedTripIds = [...new Set(entries.filter(e => e.categoryId === cat.id && e.monthId === monthId && e.tripId && e.tripId.length > 0).flatMap(e => e.tripId || []))];
                    
                    return (
                        <div key={cat.id} className="space-y-1">
                            {renderCategoryRow(cat, showShared, showU1, showU2)}
                            {involvedTripIds.map(tid => renderCategoryRow(cat, showShared, showU1, showU2, tid, true))}
                        </div>
                    );
                }
                return renderCategoryRow(cat, showShared, showU1, showU2);
            })}
        </div>
        </>
      )}
    </div>
    );
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative">
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex flex-col md:flex-row justify-between items-center gap-4">
             <span className="text-xs font-medium text-slate-500 text-center md:text-left">Enter your expenses directly in the columns below.</span>
            <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <div className="flex items-center gap-2">
                    {users.shared?.avatar ? <img src={users.shared.avatar} className="w-5 h-5 rounded-full object-cover border border-slate-200" alt="Shared" /> : <div className="w-3 h-3 rounded-full" style={{ backgroundColor: users.shared?.color }}></div>}
                    Shared
                </div>
                <div className="flex items-center gap-2">
                    {users.user_1?.avatar ? <img src={users.user_1.avatar} className="w-5 h-5 rounded-full object-cover border border-slate-200" alt={users.user_1.name} /> : <div className="w-3 h-3 rounded-full" style={{ backgroundColor: users.user_1.color }}></div>}
                    {users.user_1?.name}
                </div>
                <div className="flex items-center gap-2">
                    {users.user_2?.avatar ? <img src={users.user_2.avatar} className="w-5 h-5 rounded-full object-cover border border-slate-200" alt={users.user_2.name} /> : <div className="w-3 h-3 rounded-full" style={{ backgroundColor: users.user_2.color }}></div>}
                    {users.user_2?.name}
                </div>
            </div>
        </div>
        
        <div className="p-4 sm:p-6 pb-24">
            {renderSection("Wealth Building & Savings", c => c.group === 'SAVINGS', true, true, true, false, true)}
            {renderSection("Shared Household & Living", c => c.group !== 'TRAVEL' && c.group !== 'SAVINGS' && c.defaultAccount === 'SHARED', true, false, false)}
            {renderSection("Personal Expenses", c => c.group !== 'TRAVEL' && c.group !== 'SAVINGS' && c.defaultAccount !== 'SHARED', false, true, true)}
            {renderSection("Travel & Adventures", c => c.group === 'TRAVEL', true, true, true, true)}
        </div>

        <div className="absolute bottom-0 w-full bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] rounded-b-xl z-20">
             {!isAddingCat ? (
                <div className="flex items-center gap-4">
                     <button onClick={() => setIsAddingCat(true)} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold text-sm px-4 py-2 rounded-xl transition shadow-sm">
                         <Plus size={18} /> Add New Category
                     </button>
                      <button 
                        onClick={() => setIsOrganizing(!isOrganizing)} 
                        className={`flex items-center gap-2 font-bold text-sm px-4 py-2 rounded-xl border transition shadow-sm ${isOrganizing ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                      >
                         <Settings2 size={16} /> {isOrganizing ? 'Done' : 'Organize Mode'}
                     </button>
                </div>
             ) : (
                 <form onSubmit={handleAddSubmit} className="flex flex-col md:flex-row gap-6 items-start w-full bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-in slide-in-from-bottom-4">
                     <div className="flex-1 space-y-3 w-full">
                         <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category Info</h4>
                         <input autoFocus type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} className={getInputClass()} placeholder="Category Name (e.g. Health)" />
                         <select value={newCatGroup} onChange={e => setNewCatGroup(e.target.value)} className={getInputClass(false)}>
                             <option value="VARIABLE">Variable Expense</option>
                             <option value="FIXED">Fixed Expense</option>
                             <option value="LIFESTYLE">Lifestyle</option>
                             <option value="TRAVEL">Travel</option>
                         </select>
                     </div>
                     <div className="flex-1 space-y-3 w-full">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enable for Accounts</h4>
                        <div className="flex gap-2">
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition text-xs font-bold ${newCatAccounts.SHARED ? 'bg-white border-purple-500 text-purple-700 shadow-md ring-2 ring-purple-100' : 'bg-white border-slate-200 text-slate-400'}`}>
                                <input type="checkbox" className="hidden" checked={newCatAccounts.SHARED} onChange={e => setNewCatAccounts(p => ({...p, SHARED: e.target.checked}))} />
                                <div className={`w-3 h-3 rounded-full ${newCatAccounts.SHARED ? 'bg-purple-500' : 'bg-slate-200'}`}></div>
                                Shared
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition text-xs font-bold ${newCatAccounts.USER_1 ? 'bg-white border-blue-500 text-blue-700 shadow-md ring-2 ring-blue-100' : 'bg-white border-slate-200 text-slate-400'}`}>
                                <input type="checkbox" className="hidden" checked={newCatAccounts.USER_1} onChange={e => setNewCatAccounts(p => ({...p, USER_1: e.target.checked}))} />
                                <div className={`w-3 h-3 rounded-full ${newCatAccounts.USER_1 ? 'bg-blue-500' : 'bg-slate-200'}`}></div>
                                {users.user_1.name}
                            </label>
                            <label className={`flex-1 flex items-center justify-center gap-2 p-3 border rounded-xl cursor-pointer transition text-xs font-bold ${newCatAccounts.USER_2 ? 'bg-white border-pink-500 text-pink-700 shadow-md ring-2 ring-pink-100' : 'bg-white border-slate-200 text-slate-400'}`}>
                                <input type="checkbox" className="hidden" checked={newCatAccounts.USER_2} onChange={e => setNewCatAccounts(p => ({...p, USER_2: e.target.checked}))} />
                                <div className={`w-3 h-3 rounded-full ${newCatAccounts.USER_2 ? 'bg-pink-500' : 'bg-slate-200'}`}></div>
                                {users.user_2.name}
                            </label>
                        </div>
                        <div className="flex gap-3">
                            <button type="submit" className="flex-1 bg-slate-900 text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">Add Categories</button>
                            <button type="button" onClick={() => setIsAddingCat(false)} className="px-6 py-3 bg-white text-slate-600 border border-slate-200 rounded-xl text-sm font-bold hover:bg-slate-50 transition">Cancel</button>
                        </div>
                     </div>
                 </form>
             )}
        </div>
    </div>
  );
};