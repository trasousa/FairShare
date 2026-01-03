import React, { useState } from 'react';
import { Category, ExpenseEntry, AccountType, Trip, User, CurrencyCode } from '../types';
import { Plus, Calendar, FileText, Plane } from 'lucide-react';

interface SingleEntryFormProps {
  categories: Category[];
  trips: Trip[];
  currentMonth: string;
  users: Record<string, User>;
  currency: CurrencyCode;
  onAddEntry: (entry: Omit<ExpenseEntry, 'id'>) => void;
}

export const SingleEntryForm: React.FC<SingleEntryFormProps> = ({ categories, trips, currentMonth, users, currency, onAddEntry }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [account, setAccount] = useState<AccountType>('SHARED');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const [selectedTripId, setSelectedTripId] = useState('');
  const [tripCategory, setTripCategory] = useState<ExpenseEntry['tripCategory']>('OTHER');

  const selectedCategory = categories.find(c => c.id === categoryId);
  const isTravelCategory = selectedCategory?.group === 'TRAVEL';

  // Symbol for display
  const symbol = currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'JPY' ? '¥' : currency === 'BRL' ? 'R$' : '$';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !categoryId) return;
    
    if (isTravelCategory && !selectedTripId) {
        alert("Please select a Trip for this travel expense.");
        return;
    }

    onAddEntry({
        monthId: currentMonth, 
        categoryId,
        amount: parseFloat(amount),
        account,
        description,
        date,
        entryType: 'single',
        tripId: isTravelCategory ? selectedTripId : undefined,
        tripCategory: isTravelCategory ? tripCategory : undefined
    });

    setAmount('');
    setDescription('');
    if(isTravelCategory) {
        setTripCategory('OTHER');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
       <h2 className="font-semibold text-slate-800 mb-6">Add Expense</h2>
       <form onSubmit={handleSubmit} className="space-y-4">
           
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                   <label className="block text-sm font-medium text-slate-500 mb-1">Amount</label>
                   <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">{symbol}</span>
                        <input 
                            type="number" 
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none font-bold text-slate-700"
                            placeholder="0.00"
                            required
                        />
                   </div>
               </div>
               <div>
                   <label className="block text-sm font-medium text-slate-500 mb-1">Date</label>
                   <div className="relative">
                       <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                       <input 
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600"
                       />
                   </div>
               </div>
           </div>

           <div>
               <label className="block text-sm font-medium text-slate-500 mb-1">Description</label>
               <div className="relative">
                   <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                   <input 
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600"
                        placeholder="e.g. Dinner at Mario's"
                        required
                   />
               </div>
           </div>

           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                   <label className="block text-sm font-medium text-slate-500 mb-1">Category</label>
                   <select 
                       value={categoryId} 
                       onChange={e => setCategoryId(e.target.value)}
                       className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-slate-600"
                   >
                       {categories.map(c => (
                           <option key={c.id} value={c.id}>{c.name}</option>
                       ))}
                   </select>
               </div>
               <div>
                   <label className="block text-sm font-medium text-slate-500 mb-1">Account</label>
                   <select 
                       value={account} 
                       onChange={e => setAccount(e.target.value as AccountType)}
                       className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none bg-white text-slate-600"
                   >
                       <option value="SHARED">Shared Account</option>
                       <option value="USER_1">{users.user_1.name}</option>
                       <option value="USER_2">{users.user_2.name}</option>
                   </select>
               </div>
           </div>

           {isTravelCategory && (
               <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 animate-in fade-in">
                   <h3 className="text-sm font-bold text-indigo-700 flex items-center gap-2 mb-3">
                       <Plane size={16}/> Trip Details
                   </h3>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                       <div>
                           <label className="block text-xs font-semibold text-slate-500 mb-1">Select Trip</label>
                           <select 
                                value={selectedTripId}
                                onChange={e => setSelectedTripId(e.target.value)}
                                className="w-full text-sm border-slate-300 rounded-lg p-2"
                                required
                           >
                               <option value="">-- Choose Trip --</option>
                               {trips.filter(t => t.status !== 'COMPLETED').map(t => (
                                   <option key={t.id} value={t.id}>{t.name}</option>
                               ))}
                           </select>
                           {trips.length === 0 && <p className="text-xs text-red-500 mt-1">No active trips found. Create one in Travel tab first.</p>}
                       </div>
                       <div>
                           <label className="block text-xs font-semibold text-slate-500 mb-1">Type</label>
                           <select 
                                value={tripCategory}
                                onChange={e => setTripCategory(e.target.value as any)}
                                className="w-full text-sm border-slate-300 rounded-lg p-2"
                           >
                               <option value="FLIGHT">Flight/Transport</option>
                               <option value="ACCOMMODATION">Accommodation</option>
                               <option value="FOOD">Food & Drink</option>
                               <option value="ACTIVITY">Activity</option>
                               <option value="OTHER">Other</option>
                           </select>
                       </div>
                   </div>
               </div>
           )}

           <div className="pt-4">
               <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
               >
                   <Plus size={18} /> Add Transaction
               </button>
           </div>
       </form>
    </div>
  );
};