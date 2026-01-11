import React, { useState } from 'react';
import { User, UserId, CurrencyCode } from '../types';
import { Save, User as UserIcon, Upload, RotateCcw, Download, Database, Sun, Moon, LogOut, Users } from 'lucide-react';

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
  const [activePicker, setActivePicker] = useState<UserId | null>(null);

  const PRESET_COLORS = ['#64748b', '#ef4444', '#f97316', '#f59e0b', '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

  const handleChange = (id: UserId, field: keyof User, value: any) => {
    setLocalUsers(prev => ({
        ...prev,
        [id]: {
            ...prev[id],
            [field]: value
        }
    }));
  };

  const getAvailableColors = (id: UserId) => {
    return PRESET_COLORS;
  };

  const handleSave = () => {
    Object.entries(localUsers).forEach(([id, data]) => {
        onUpdateUser(id as UserId, data);
    });
    setSuccessMsg('Settings saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const AVATAR_OPTIONS = {
    People: [
        'https://api.dicebear.com/7.x/personas/svg?seed=Felix',
        'https://api.dicebear.com/7.x/personas/svg?seed=Aneka',
        'https://api.dicebear.com/7.x/personas/svg?seed=Jasper',
        'https://api.dicebear.com/7.x/personas/svg?seed=Milo',
        'https://api.dicebear.com/7.x/personas/svg?seed=Luna'
    ],
    Animals: [
        'https://api.dicebear.com/7.x/big-ears/svg?seed=Bear',
        'https://api.dicebear.com/7.x/big-ears/svg?seed=Fox',
        'https://api.dicebear.com/7.x/big-ears/svg?seed=Owl',
        'https://api.dicebear.com/7.x/big-ears/svg?seed=Cat',
        'https://api.dicebear.com/7.x/big-ears/svg?seed=Dog'
    ],
    Objects: [
        'https://api.dicebear.com/7.x/icons/svg?seed=Ball',
        'https://api.dicebear.com/7.x/icons/svg?seed=Flower',
        'https://api.dicebear.com/7.x/icons/svg?seed=Plant',
        'https://api.dicebear.com/7.x/icons/svg?seed=Sun',
        'https://api.dicebear.com/7.x/icons/svg?seed=Book'
    ],
    Abstract: [
        'https://api.dicebear.com/7.x/abstract/svg?seed=One',
        'https://api.dicebear.com/7.x/abstract/svg?seed=Two',
        'https://api.dicebear.com/7.x/abstract/svg?seed=Three',
        'https://api.dicebear.com/7.x/abstract/svg?seed=Four',
        'https://api.dicebear.com/7.x/abstract/svg?seed=Five'
    ]
  };

  const renderAvatarPicker = (id: UserId, currentAvatar: string) => {
    const isOpen = activePicker === id;
    
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setActivePicker(isOpen ? null : id)}
                    className="relative group cursor-pointer"
                >
                    <img src={currentAvatar} className="w-20 h-20 rounded-full border-4 border-white shadow-md object-cover bg-slate-50 transition group-hover:opacity-80" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Upload size={20} className="text-slate-700 bg-white/80 rounded-full p-1" />
                    </div>
                </button>
                <div className="flex-1">
                    <p className="text-sm font-bold text-slate-700 mb-1">Profile Picture</p>
                    <p className="text-xs text-slate-500 mb-2">Click the image to change avatar</p>
                    <input 
                        type="text" 
                        value={currentAvatar}
                        onChange={(e) => handleChange(id, 'avatar', e.target.value)}
                        className="w-full text-[10px] border border-slate-200 rounded px-2 py-1 text-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none font-mono"
                        placeholder="Or paste custom URL..."
                    />
                </div>
            </div>
            
            {isOpen && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4">
                        {Object.entries(AVATAR_OPTIONS).map(([category, options]) => (
                            <div key={category}>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{category}</p>
                                <div className="grid grid-cols-5 gap-2">
                                    {options.map((url) => (
                                        <button 
                                            key={url}
                                            onClick={() => {
                                                handleChange(id, 'avatar', url);
                                                setActivePicker(null);
                                            }}
                                            className={`aspect-square rounded-xl border-2 transition overflow-hidden bg-white shadow-sm hover:scale-105 ${currentAvatar === url ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-transparent'}`}
                                        >
                                            <img src={url} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
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
            {/* Shared Account Card */}
            {localUsers.shared && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden md:col-span-2">
                    <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: localUsers.shared.color }}></div>
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <Users size={18} style={{ color: localUsers.shared.color }}/> Shared Account
                    </h3>
                    
                    {renderAvatarPicker('shared', localUsers.shared.avatar)}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                                <input 
                                    type="text" 
                                    value={localUsers.shared.name}
                                    onChange={(e) => handleChange('shared', 'name', e.target.value)}
                                    className="w-full border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-100 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Theme Color</label>
                                <div className="flex flex-wrap gap-2">
                                    {getAvailableColors('shared').map(c => (
                                        <button 
                                            key={c}
                                            onClick={() => handleChange('shared', 'color', c)}
                                            className={`w-6 h-6 rounded-full border-2 transition ${localUsers.shared?.color === c ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-110'}`}
                                            style={{ backgroundColor: c }}
                                        />
                                    ))}
                                    <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 ml-2 shadow-sm" title="Custom Color">
                                        <input 
                                            type="color" 
                                            value={localUsers.shared.color}
                                            onChange={(e) => handleChange('shared', 'color', e.target.value)}
                                            className="absolute inset-0 w-10 h-10 -top-2 -left-2 cursor-pointer opacity-0"
                                        />
                                        <div className="w-full h-full" style={{ backgroundColor: localUsers.shared.color }}></div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
            {/* User 1 Card */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1" style={{ backgroundColor: localUsers.user_1.color }}></div>
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <UserIcon size={18} style={{ color: localUsers.user_1.color }}/> Partner 1
                </h3>
                
                {renderAvatarPicker('user_1', localUsers.user_1.avatar)}

                <div className="space-y-4 mt-6">
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
                        <label className="block text-sm font-medium text-slate-700 mb-2">Theme Color</label>
                        <div className="flex flex-wrap gap-2">
                            {getAvailableColors('user_1').map(c => (
                                <button 
                                    key={c}
                                    onClick={() => handleChange('user_1', 'color', c)}
                                    className={`w-6 h-6 rounded-full border-2 transition ${localUsers.user_1.color === c ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 ml-2 shadow-sm" title="Custom Color">
                                <input 
                                    type="color" 
                                    value={localUsers.user_1.color}
                                    onChange={(e) => handleChange('user_1', 'color', e.target.value)}
                                    className="absolute inset-0 w-10 h-10 -top-2 -left-2 cursor-pointer opacity-0"
                                />
                                <div className="w-full h-full" style={{ backgroundColor: localUsers.user_1.color }}></div>
                            </div>
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
                
                {renderAvatarPicker('user_2', localUsers.user_2.avatar)}

                <div className="space-y-4 mt-6">
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
                        <label className="block text-sm font-medium text-slate-700 mb-2">Theme Color</label>
                        <div className="flex flex-wrap gap-2">
                            {getAvailableColors('user_2').map(c => (
                                <button 
                                    key={c}
                                    onClick={() => handleChange('user_2', 'color', c)}
                                    className={`w-6 h-6 rounded-full border-2 transition ${localUsers.user_2.color === c ? 'border-slate-600 scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-slate-200 ml-2 shadow-sm" title="Custom Color">
                                <input 
                                    type="color" 
                                    value={localUsers.user_2.color}
                                    onChange={(e) => handleChange('user_2', 'color', e.target.value)}
                                    className="absolute inset-0 w-10 h-10 -top-2 -left-2 cursor-pointer opacity-0"
                                />
                                <div className="w-full h-full" style={{ backgroundColor: localUsers.user_2.color }}></div>
                            </div>
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