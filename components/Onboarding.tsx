import React, { useState } from 'react';
import { CurrencyCode, Category, AccountType } from '../types';
import { createNewInstance } from '../services/storage';
import { ArrowRight, ArrowLeft, Check, Users, ListChecks, Plus, Trash2, AlertTriangle } from 'lucide-react';

const DEFAULT_CATEGORIES: Omit<Category, 'id'>[] = [
    { name: 'Rent/Mortgage', group: 'FIXED', defaultAccount: 'SHARED' },
    { name: 'Groceries', group: 'VARIABLE', defaultAccount: 'SHARED' },
    { name: 'Utilities', group: 'FIXED', defaultAccount: 'SHARED' },
    { name: 'Dining Out', group: 'LIFESTYLE', defaultAccount: 'SHARED' },
    { name: 'Transportation', group: 'VARIABLE', defaultAccount: 'USER_1' },
    { name: 'Shopping', group: 'LIFESTYLE', defaultAccount: 'USER_1' },
    { name: 'Health & Wellness', group: 'LIFESTYLE', defaultAccount: 'USER_2' },
    { name: 'Entertainment', group: 'LIFESTYLE', defaultAccount: 'SHARED' },
    { name: 'General Savings', group: 'SAVINGS', defaultAccount: 'SHARED' },
];

const generateId = () => Math.random().toString(36).substr(2, 9);

interface OnboardingProps {
    onComplete: (id: string) => void;
    onCancel: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    
    // Form State
    const [instanceName, setInstanceName] = useState('Our Finances');
    const [currency, setCurrency] = useState<CurrencyCode>('USD');
    const [u1Name, setU1Name] = useState('Partner 1');
    const [u1Income, setU1Income] = useState('');
    const [u2Name, setU2Name] = useState('Partner 2');
    const [u2Income, setU2Income] = useState('');
    
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES.map(c => ({ ...c, id: generateId() })));
    const [newCatName, setNewCatName] = useState('');
    const [newCatGroup, setNewCatGroup] = useState<'FIXED' | 'VARIABLE' | 'LIFESTYLE'>('VARIABLE');

    const handleUpdateCategoryAccount = (id: string, account: AccountType) => {
        setCategories(cats => cats.map(c => c.id === id ? { ...c, defaultAccount: account } : c));
    };

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if (newCatName.trim()) {
            setCategories(cats => [...cats, { id: generateId(), name: newCatName.trim(), group: newCatGroup, defaultAccount: 'SHARED' }]);
            setNewCatName('');
        }
    };

    const handleDeleteCategory = (id: string) => {
        setCategories(cats => cats.filter(c => c.id !== id));
    };

    const handleFinish = async () => {
        if (instanceName && u1Name && u2Name && categories.length > 0) {
            setIsSaving(true);
            setError('');
            try {
                const newInstance = await createNewInstance(
                    instanceName,
                    currency,
                    { name: u1Name, income: parseFloat(u1Income) || 0, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u1Name}` },
                    { name: u2Name, income: parseFloat(u2Income) || 0, avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${u2Name}` },
                    categories
                );
                onComplete(newInstance.id);
            } catch (e) {
                console.error(e);
                setIsSaving(false);
                setError('Failed to create database. Is the backend server running?');
            }
        }
    };

    if (isSaving) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Creating your database...</div>;

    const renderStep1 = () => (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Household Name</label>
                    <input autoFocus type="text" className="w-full text-lg border-b-2 border-slate-200 py-2 focus:border-indigo-600 outline-none transition" value={instanceName} onChange={e => setInstanceName(e.target.value)} />
                </div>
                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Currency</label>
                    <select value={currency} onChange={e => setCurrency(e.target.value as CurrencyCode)} className="w-full text-lg border-b-2 border-slate-200 py-2 focus:border-indigo-600 outline-none transition bg-transparent">
                        {['USD', 'EUR', 'GBP', 'JPY', 'BRL'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Users className="text-blue-500"/> Partner 1</h3>
                    <input type="text" className="w-full border p-3 rounded-lg text-sm mb-3" placeholder="Name" value={u1Name} onChange={e => setU1Name(e.target.value)} />
                    <input type="number" className="w-full border p-3 rounded-lg text-sm" placeholder="Est. Monthly Income" value={u1Income} onChange={e => setU1Income(e.target.value)} />
                </div>
                 <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Users className="text-pink-500"/> Partner 2</h3>
                    <input type="text" className="w-full border p-3 rounded-lg text-sm mb-3" placeholder="Name" value={u2Name} onChange={e => setU2Name(e.target.value)} />
                    <input type="number" className="w-full border p-3 rounded-lg text-sm" placeholder="Est. Monthly Income" value={u2Income} onChange={e => setU2Income(e.target.value)} />
                </div>
            </div>
            <div className="flex justify-end pt-6">
                <button disabled={!instanceName || !u1Name || !u2Name} onClick={() => setStep(2)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50">Next <ArrowRight size={18}/></button>
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="animate-in fade-in slide-in-from-right-4">
            <div className="max-h-[400px] overflow-y-auto pr-4 space-y-2">
                {categories.map(cat => (
                    <div key={cat.id} className="grid grid-cols-12 gap-2 items-center text-sm p-2 rounded-lg hover:bg-slate-50">
                        <span className="col-span-4 font-medium text-slate-700">{cat.name}</span>
                        <div className="col-span-7 flex gap-1 bg-slate-100 rounded-lg p-1">
                            <button onClick={() => handleUpdateCategoryAccount(cat.id, 'SHARED')} className={`flex-1 text-xs py-1 rounded-md transition ${cat.defaultAccount === 'SHARED' ? 'bg-white shadow-sm font-bold text-purple-700' : 'text-slate-500'}`}>Shared</button>
                            <button onClick={() => handleUpdateCategoryAccount(cat.id, 'USER_1')} className={`flex-1 text-xs py-1 rounded-md transition ${cat.defaultAccount === 'USER_1' ? 'bg-white shadow-sm font-bold text-blue-700' : 'text-slate-500'}`}>{u1Name}</button>
                            <button onClick={() => handleUpdateCategoryAccount(cat.id, 'USER_2')} className={`flex-1 text-xs py-1 rounded-md transition ${cat.defaultAccount === 'USER_2' ? 'bg-white shadow-sm font-bold text-pink-700' : 'text-slate-500'}`}>{u2Name}</button>
                        </div>
                        <div className="col-span-1 text-right">
                           {cat.group !== 'SAVINGS' && <button onClick={() => handleDeleteCategory(cat.id)} className="text-slate-300 hover:text-red-500 transition p-1"><Trash2 size={14}/></button>}
                        </div>
                    </div>
                ))}
            </div>
            <form onSubmit={handleAddCategory} className="grid grid-cols-12 gap-2 items-center mt-4 pt-4 border-t">
                <div className="col-span-4">
                    <input type="text" value={newCatName} onChange={e => setNewCatName(e.target.value)} placeholder="New Category" className="w-full text-sm border p-2 rounded-lg" />
                </div>
                <div className="col-span-4">
                     <select value={newCatGroup} onChange={e => setNewCatGroup(e.target.value as any)} className="w-full text-sm border p-2 rounded-lg bg-white">
                        <option value="VARIABLE">Variable Expense</option>
                        <option value="FIXED">Fixed Expense</option>
                        <option value="LIFESTYLE">Lifestyle</option>
                     </select>
                </div>
                <div className="col-span-4">
                    <button type="submit" className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-600 p-2 rounded-lg text-sm font-medium hover:bg-indigo-100"><Plus size={16}/> Add</button>
                </div>
            </form>
            <div className="flex justify-between pt-6 mt-6 border-t">
                <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-500 font-medium hover:text-slate-800"><ArrowLeft size={18}/> Back</button>
                <button onClick={handleFinish} className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg shadow-emerald-200"><Check size={18}/> Complete Setup</button>
            </div>
        </div>
    );

    return (
        <div className="min-h-dvh bg-slate-50 flex items-center justify-center p-4 sm:p-6">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200/50">
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-bold text-slate-800">Setup your FairShare</h2>
                        <div className="flex items-center gap-2">
                            <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <Users size={20}/>
                            </div>
                             <div className={`w-10 h-10 flex items-center justify-center rounded-full transition-colors ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <ListChecks size={20}/>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 border border-red-100">
                            <AlertTriangle size={18} /> {error}
                        </div>
                    )}

                    {step === 1 ? renderStep1() : renderStep2()}
                </div>
                
                <div className="bg-slate-50/80 p-4 text-center border-t border-slate-100">
                    <button onClick={onCancel} className="text-xs text-slate-400 hover:text-red-500">Cancel Setup</button>
                </div>
            </div>
        </div>
    );
};