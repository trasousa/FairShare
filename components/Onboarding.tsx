import React, { useState } from 'react';
import { CurrencyCode } from '../types';
import { createNewInstance } from '../services/storage';
import { ArrowRight, Check, User, AlertTriangle } from 'lucide-react';

interface OnboardingProps {
    onComplete: (id: string) => void;
    onCancel: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onCancel }) => {
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    
    // Form State
    const [instanceName, setInstanceName] = useState('');
    const [currency, setCurrency] = useState<CurrencyCode>('USD');
    
    const [u1Name, setU1Name] = useState('');
    const [u1Income, setU1Income] = useState('');
    const [u1Avatar, setU1Avatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Felix');

    const [u2Name, setU2Name] = useState('');
    const [u2Income, setU2Income] = useState('');
    const [u2Avatar, setU2Avatar] = useState('https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka');

    const handleFinish = async () => {
        if (instanceName && u1Name && u2Name) {
            setIsSaving(true);
            setError('');
            try {
                const newInstance = await createNewInstance(
                    instanceName,
                    currency,
                    { name: u1Name, income: parseFloat(u1Income) || 0, avatar: u1Avatar },
                    { name: u2Name, income: parseFloat(u2Income) || 0, avatar: u2Avatar }
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

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-indigo-600 p-6 text-white text-center">
                    <h2 className="text-2xl font-bold">Setup your Tracker</h2>
                    <p className="text-indigo-200">Step {step} of 3</p>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 bg-red-50 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 border border-red-100">
                            <AlertTriangle size={18} /> {error}
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Household Name</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    className="w-full text-lg border-b-2 border-slate-200 py-2 focus:border-indigo-600 outline-none transition"
                                    placeholder="e.g. Smith Family Finances"
                                    value={instanceName}
                                    onChange={e => setInstanceName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Currency</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['USD', 'EUR', 'GBP', 'JPY', 'BRL'].map((c) => (
                                        <button 
                                            key={c}
                                            onClick={() => setCurrency(c as CurrencyCode)}
                                            className={`py-3 rounded-xl font-bold border-2 transition ${currency === c ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end pt-6">
                                <button 
                                    disabled={!instanceName}
                                    onClick={() => setStep(2)}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Next <ArrowRight size={18}/>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <User className="text-blue-500"/> Partner 1 Details
                            </h3>
                            <div className="flex gap-4 items-start">
                                <img src={u1Avatar} className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200"/>
                                <div className="flex-1 space-y-4">
                                    <input 
                                        type="text" 
                                        className="w-full border p-3 rounded-lg text-sm"
                                        placeholder="Name (e.g. John)"
                                        value={u1Name}
                                        onChange={e => setU1Name(e.target.value)}
                                    />
                                    <input 
                                        type="number" 
                                        className="w-full border p-3 rounded-lg text-sm"
                                        placeholder="Est. Monthly Income"
                                        value={u1Income}
                                        onChange={e => setU1Income(e.target.value)}
                                    />
                                    <input 
                                        type="text" 
                                        className="w-full border p-3 rounded-lg text-xs text-slate-500"
                                        placeholder="Avatar URL (Optional)"
                                        value={u1Avatar}
                                        onChange={e => setU1Avatar(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between pt-6 border-t border-slate-100 mt-6">
                                <button onClick={() => setStep(1)} className="text-slate-500 font-medium hover:text-slate-800">Back</button>
                                <button 
                                    disabled={!u1Name}
                                    onClick={() => setStep(3)}
                                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50"
                                >
                                    Next <ArrowRight size={18}/>
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <User className="text-pink-500"/> Partner 2 Details
                            </h3>
                            <div className="flex gap-4 items-start">
                                <img src={u2Avatar} className="w-20 h-20 rounded-full bg-slate-100 border-2 border-slate-200"/>
                                <div className="flex-1 space-y-4">
                                    <input 
                                        type="text" 
                                        className="w-full border p-3 rounded-lg text-sm"
                                        placeholder="Name (e.g. Jane)"
                                        value={u2Name}
                                        onChange={e => setU2Name(e.target.value)}
                                    />
                                    <input 
                                        type="number" 
                                        className="w-full border p-3 rounded-lg text-sm"
                                        placeholder="Est. Monthly Income"
                                        value={u2Income}
                                        onChange={e => setU2Income(e.target.value)}
                                    />
                                    <input 
                                        type="text" 
                                        className="w-full border p-3 rounded-lg text-xs text-slate-500"
                                        placeholder="Avatar URL (Optional)"
                                        value={u2Avatar}
                                        onChange={e => setU2Avatar(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between pt-6 border-t border-slate-100 mt-6">
                                <button onClick={() => setStep(2)} className="text-slate-500 font-medium hover:text-slate-800">Back</button>
                                <button 
                                    disabled={!u2Name}
                                    onClick={handleFinish}
                                    className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 disabled:opacity-50 shadow-lg shadow-emerald-200"
                                >
                                    <Check size={18}/> Complete Setup
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="bg-slate-50 p-4 text-center">
                    <button onClick={onCancel} className="text-xs text-slate-400 hover:text-red-500">Cancel Setup</button>
                </div>
            </div>
        </div>
    );
};