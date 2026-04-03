import React, { useState, useRef, useEffect } from 'react';
import { User, UserId, CurrencyCode, ExpenseEntry, Category, Trip } from '../types';
import { Save, User as UserIcon, Upload, RotateCcw, Download, Database, Sun, Moon, LogOut, Users, Table, AlertTriangle, Sparkles, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { DataExplorer } from './DataExplorer';

interface SettingsPageProps {
  instanceName: string;
  users: Record<string, User>;
  currency: CurrencyCode;
  theme?: 'light' | 'dark';
  getInputClass: (isInput?: boolean) => string;
  entries: ExpenseEntry[];
  categories: Category[];
  trips: Trip[];
  onUpdateInstanceName: (newName: string) => void;
  onUpdateUser: (id: UserId, data: Partial<User>) => void;
  onUpdateCurrency: (c: CurrencyCode) => void;
  onUpdateTheme: (t: 'light' | 'dark') => void;
  onExport: () => void;
  onImportReplace: (data: any) => void;
  onDeleteEntry: (id: string) => void;
  onDeleteOrphans: () => void;
  onDeleteZeros: () => void;
  onExit: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  instanceName, users, currency, theme = 'light', getInputClass,
  entries, categories, trips,
  onUpdateInstanceName, onUpdateUser, onUpdateCurrency, onUpdateTheme,
  onExport, onImportReplace, onDeleteEntry, onDeleteOrphans, onDeleteZeros, onExit
}) => {
  const [localUsers, setLocalUsers] = useState(users);
  const [localInstanceName, setLocalInstanceName] = useState(instanceName);
  const [successMsg, setSuccessMsg] = useState('');
  const [activePicker, setActivePicker] = useState<UserId | null>(null);
  const [activeTab, setActiveTab] = useState<'settings' | 'data'>('settings');
  const [importError, setImportError] = useState('');
  const [importConfirm, setImportConfirm] = useState<any>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // AI config state
  const [aiProvider, setAiProvider] = useState('gemini');
  const [aiModel, setAiModel] = useState('gemini-2.0-flash');
  const [aiApiKey, setAiApiKey] = useState('');
  const [aiBaseUrl, setAiBaseUrl] = useState('https://api.openai.com/v1');
  const [aiKeyHint, setAiKeyHint] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiSaveStatus, setAiSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/config/ai').then(r => r.json()).then(cfg => {
      setAiProvider(cfg.provider || 'gemini');
      setAiModel(cfg.model || 'gemini-2.0-flash');
      setAiBaseUrl(cfg.baseUrl || 'https://api.openai.com/v1');
      setAiKeyHint(cfg.apiKeyHint || '');
    }).catch(() => {});
  }, []);

  const handleSaveAiConfig = async () => {
    setAiSaveStatus('saving');
    try {
      const body: any = { provider: aiProvider, model: aiModel, baseUrl: aiBaseUrl };
      if (aiApiKey) body.apiKey = aiApiKey;
      const res = await fetch('/api/config/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setAiKeyHint(aiApiKey ? `${aiApiKey.slice(0, 4)}…${aiApiKey.slice(-4)}` : data.apiKeyHint || '');
      setAiApiKey('');
      setAiSaveStatus('saved');
      setTimeout(() => setAiSaveStatus('idle'), 2500);
    } catch {
      setAiSaveStatus('error');
      setTimeout(() => setAiSaveStatus('idle'), 3000);
    }
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.data?.entries || !parsed.users) {
          setImportError('Invalid FairShare backup file — missing required fields.');
          return;
        }
        setImportError('');
        setImportConfirm(parsed);
      } catch {
        setImportError('Failed to parse file. Make sure it\'s a valid FairShare JSON export.');
      }
    };
    reader.readAsText(file);
  };

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
    if (localInstanceName !== instanceName) {
        onUpdateInstanceName(localInstanceName);
    }
    setSuccessMsg('Settings saved successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const AVATAR_OPTIONS = [
    'https://api.dicebear.com/7.x/icons/svg?seed=Heart',
    'https://api.dicebear.com/7.x/icons/svg?seed=Sun',
    'https://api.dicebear.com/7.x/icons/svg?seed=Bike',
    'https://api.dicebear.com/7.x/big-ears/svg?seed=Dog'
  ];

  const handleFileUpload = (id: UserId, file: File) => {
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              handleChange(id, 'avatar', reader.result as string);
          };
          reader.readAsDataURL(file);
      }
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
                        className={getInputClass(false)}
                        placeholder="Or paste custom URL..."
                    />
                </div>
            </div>
            
            {isOpen && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="space-y-4">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Choose Icon</p>
                            <div className="grid grid-cols-5 gap-2">
                                {AVATAR_OPTIONS.map((url) => (
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
                                <label className="aspect-square rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-slate-100 transition bg-white text-slate-400 hover:text-slate-600">
                                    <Upload size={20} />
                                    <span className="text-[8px] font-bold uppercase">Upload</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFileUpload(id, e.target.files[0])} />
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex justify-between items-center">
             <div>
                <h2 className="text-2xl font-bold text-slate-800">Settings & Data</h2>
                <p className="text-slate-500">Manage profiles, currency, and explore your data.</p>
             </div>
             {successMsg && (
                 <div className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-sm font-bold animate-in fade-in slide-in-from-top-2">
                     {successMsg}
                 </div>
             )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-slate-200">
            <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition -mb-px ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Database size={16} /> Settings
            </button>
            <button
                onClick={() => setActiveTab('data')}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold border-b-2 transition -mb-px ${activeTab === 'data' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Table size={16} /> Data Explorer
            </button>
        </div>

        {activeTab === 'data' && (
            <DataExplorer
                entries={entries}
                categories={categories}
                trips={trips}
                currency={currency}
                users={users}
                theme={theme}
                onDeleteEntry={onDeleteEntry}
                onDeleteOrphans={onDeleteOrphans}
                onDeleteZeros={onDeleteZeros}
            />
        )}

        {activeTab === 'settings' && <>

        {/* General App Settings */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                 <Database size={18} className="text-slate-500"/> App Configuration
             </h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Instance Name</label>
                     <input 
                         type="text" 
                         value={localInstanceName}
                         onChange={(e) => setLocalInstanceName(e.target.value)}
                         className={getInputClass()}
                     />
                 </div>
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

                 <div className="md:col-span-2 space-y-3">
                     <div className="flex flex-wrap gap-3 items-start">
                         <button
                            onClick={onExport}
                            className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
                         >
                             <Download size={16}/> Export Backup (JSON)
                         </button>
                         <label className="flex items-center gap-2 border border-indigo-200 bg-indigo-50 text-indigo-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-100 transition cursor-pointer">
                             <Upload size={16}/> Import & Replace Data
                             <input
                                 ref={importRef}
                                 type="file"
                                 accept=".json"
                                 className="hidden"
                                 onChange={e => e.target.files?.[0] && handleImportFile(e.target.files[0])}
                             />
                         </label>
                     </div>
                     {importError && (
                         <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-3 py-2">
                             <AlertTriangle size={14} /> {importError}
                         </div>
                     )}
                     {importConfirm && (
                         <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                             <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
                                 <AlertTriangle size={16} /> Replace all current data?
                             </p>
                             <p className="text-xs text-amber-700">
                                 This will load <strong>{importConfirm.name}</strong> ({importConfirm.data?.entries?.length ?? 0} entries, {importConfirm.data?.trips?.length ?? 0} trips). Your current data will be overwritten and saved.
                             </p>
                             <div className="flex gap-2">
                                 <button
                                     onClick={() => { onImportReplace(importConfirm); setImportConfirm(null); setSuccessMsg('Data imported successfully!'); setTimeout(() => setSuccessMsg(''), 3000); }}
                                     className="text-xs font-bold bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition"
                                 >
                                     Yes, Replace
                                 </button>
                                 <button onClick={() => { setImportConfirm(null); if (importRef.current) importRef.current.value = ''; }} className="text-xs font-bold border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition">
                                     Cancel
                                 </button>
                             </div>
                         </div>
                     )}
                     <span className="text-[10px] text-slate-400 block">Export your data as a JSON backup. Use Import to restore from a backup file — this replaces all current data.</span>
                 </div>
             </div>
        </div>

        {/* AI Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Sparkles size={18} className="text-indigo-500"/> AI Configuration
            </h3>
            <p className="text-xs text-slate-500 mb-4">Configure the AI assistant. Your API key is stored in server memory only — it resets on server restart. Use an <code className="bg-slate-100 px-1 rounded">.env</code> file to persist it.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Provider</label>
                    <div className="flex bg-slate-100 rounded-lg p-1 w-fit">
                        {['gemini', 'openai'].map(p => (
                            <button key={p} onClick={() => {
                                setAiProvider(p);
                                if (p === 'gemini') setAiModel('gemini-2.0-flash');
                                else setAiModel('gpt-4o-mini');
                            }} className={`px-4 py-2 text-sm font-bold rounded-md transition capitalize ${aiProvider === p ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                {p === 'gemini' ? 'Gemini' : 'OpenAI-compat'}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                    <input type="text" value={aiModel} onChange={e => setAiModel(e.target.value)} className={getInputClass()} placeholder="e.g. gemini-2.0-flash" />
                </div>
                {aiProvider !== 'gemini' && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Base URL</label>
                        <input type="text" value={aiBaseUrl} onChange={e => setAiBaseUrl(e.target.value)} className={getInputClass()} placeholder="https://api.openai.com/v1" />
                    </div>
                )}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                        API Key {aiKeyHint && <span className="text-xs text-slate-400 font-normal ml-1">current: {aiKeyHint}</span>}
                    </label>
                    <div className="relative">
                        <input
                            type={showApiKey ? 'text' : 'password'}
                            value={aiApiKey}
                            onChange={e => setAiApiKey(e.target.value)}
                            className={`${getInputClass()} pr-10`}
                            placeholder={aiKeyHint ? 'Enter new key to replace…' : 'Paste your API key…'}
                        />
                        <button type="button" onClick={() => setShowApiKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                    </div>
                </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
                <button
                    onClick={handleSaveAiConfig}
                    disabled={aiSaveStatus === 'saving'}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-60"
                >
                    {aiSaveStatus === 'saving' ? 'Saving…' : <><Sparkles size={14} /> Save AI Config</>}
                </button>
                {aiSaveStatus === 'saved' && <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium"><CheckCircle2 size={15} /> Saved!</span>}
                {aiSaveStatus === 'error' && <span className="text-sm text-red-600 font-medium">Save failed</span>}
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
                                    className={getInputClass()}
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
                            className={getInputClass()}
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
                            className={getInputClass()}
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
        </>}
    </div>
  );
};