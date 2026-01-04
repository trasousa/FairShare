import React, { useState } from 'react';
import { User, UserId, CurrencyCode } from '../types';
import { Save, User as UserIcon, Upload, RotateCcw, Download, Database, Sun, Moon, LogOut } from 'lucide-react';

interface SettingsPageProps {
  users: Record<string, User>;
  currency: CurrencyCode;
  theme?: 'light' | 'dark';
  onUpdateUser: (id: UserId, data: Partial<User>) => void;
  onUpdateCurrency: (c: CurrencyCode) => void;
  onUpdateTheme: (t: 'light' | 'dark') => void;
  onExport: () => void;
  onExit: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ users, currency, theme = 'light', onUpdateUser, onUpdateCurrency, onUpdateTheme, onExport, onExit }) => {
  const [localUsers, setLocalUsers] = useState(users);
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (id: UserId, field: keyof User, value: any) => {
    setLocalUsers(prev => ({
        ...prev,
        [id]: { ...prev[id], [field]: value }
    }));
  };

  const handleSave = () => {
      (Object.values(localUsers) as User[]).forEach(u => {
          onUpdateUser(u.id, u);
      });
      setSuccessMsg('Settings saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
             <div>
                <h2 className="text-2xl font-bold text-slate-800">Settings & Preferences</h2>
                <p className="text-slate-500">Manage profiles, currency, and data.</p>
             </div>
             {successMsg && (
                 <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-top-2">
                     {successMsg}
                 </div>
             )}
        </div>

        {/* General App Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Database size={18} className="text-slate-500"/> App Configuration
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Display Currency</label>
                     <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
                         {['USD', 'EUR', 'GBP', 'JPY', 'BRL'].map(c => (
                             <button 
                                key={c}
                                onClick={() => onUpdateCurrency(c as CurrencyCode)}
                                className={`px-4 py-2 text-sm font-bold rounded-md transition ${currency === c ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                             >
                                 {c}
                             </button>
                         ))}
                     </div>
                 </div>
                 
                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Theme</label>
                     <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
                         <button 
                            onClick={() => onUpdateTheme('light')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition ${theme === 'light' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                             <Sun size={16} /> Light
                         </button>
                         <button 
                            onClick={() => onUpdateTheme('dark')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-md transition ${theme === 'dark' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                         >
                             <Moon size={16} /> Dark
                         </button>
                     </div>
                 </div>

                 <div className="md:col-span-2 flex justify-end">
                     <button 
                        onClick={onExport}
                        className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                     >
                         <Download size={16}/> Export Database (JSON)
                     </button>
                 </div>
             </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* User 1 Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: localUsers.user_1.color }}></div>
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <UserIcon size={18} style={{ color: localUsers.user_1.color }}/> Partner 1
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <img src={localUsers.user_1.avatar} className="w-16 h-16 rounded-full border-2 border-slate-100 object-cover" />
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Avatar URL</label>
                            <input 
                                type="text" 
                                value={localUsers.user_1.avatar}
                                onChange={(e) => handleChange('user_1', 'avatar', e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded p-2 text-slate-600"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input 
                            type="text" 
                            value={localUsers.user_1.name}
                            onChange={(e) => handleChange('user_1', 'name', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-100 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Theme Color</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="color" 
                                value={localUsers.user_1.color}
                                onChange={(e) => handleChange('user_1', 'color', e.target.value)}
                                className="h-10 w-20 p-1 border border-slate-300 rounded cursor-pointer"
                            />
                            <span className="text-xs text-slate-500">{localUsers.user_1.color}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* User 2 Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: localUsers.user_2.color }}></div>
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <UserIcon size={18} style={{ color: localUsers.user_2.color }}/> Partner 2
                </h3>
                
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <img src={localUsers.user_2.avatar} className="w-16 h-16 rounded-full border-2 border-slate-100 object-cover" />
                        <div className="flex-1">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">Avatar URL</label>
                            <input 
                                type="text" 
                                value={localUsers.user_2.avatar}
                                onChange={(e) => handleChange('user_2', 'avatar', e.target.value)}
                                className="w-full text-xs border border-slate-300 rounded p-2 text-slate-600"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input 
                            type="text" 
                            value={localUsers.user_2.name}
                            onChange={(e) => handleChange('user_2', 'name', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-100 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Theme Color</label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="color" 
                                value={localUsers.user_2.color}
                                onChange={(e) => handleChange('user_2', 'color', e.target.value)}
                                className="h-10 w-20 p-1 border border-slate-300 rounded cursor-pointer"
                            />
                            <span className="text-xs text-slate-500">{localUsers.user_2.color}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 pt-6">
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition shadow-lg shadow-slate-900/20"
            >
                <Save size={18} /> Save Changes
            </button>

            <button 
                onClick={onExit}
                className="flex items-center gap-2 border border-red-200 text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition"
            >
                <LogOut size={18} /> Exit Instance
            </button>
        </div>
    </div>
  );
};