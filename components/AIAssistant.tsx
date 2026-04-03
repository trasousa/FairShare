import React, { useState, useRef, useEffect } from 'react';
import { ExpenseEntry, Category, Trip, CurrencyCode, User, IncomeEntry, Budget, SavingsGoal } from '../types';
import { formatCurrency } from '../services/financeService';
import { Send, Sparkles, Upload, X, AlertTriangle, TrendingUp, Info, Camera, Loader } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
}

interface Insight {
  type: 'warning' | 'tip' | 'info';
  title: string;
  body: string;
}

interface AIAssistantProps {
  entries: ExpenseEntry[];
  categories: Category[];
  trips: Trip[];
  incomes: IncomeEntry[];
  budgets: Budget[];
  savings: SavingsGoal[];
  users: Record<string, User>;
  currency: CurrencyCode;
  theme?: 'light' | 'dark';
  onDeleteEntries?: (ids: string[]) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  entries, categories, trips, incomes, budgets, savings, users, currency, theme = 'light', onDeleteEntries
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'scan' | 'review'>('chat');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: `Hi! I'm your FairShare AI assistant. Ask me anything about your finances — e.g. "How much did we spend on restaurants last month?" or "What are our biggest expenses this year?"` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<Insight[] | null>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildContext = () => ({
    currency,
    users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, { name: v.name }])),
    totalEntries: entries.length,
    totalExpenses: entries.reduce((s, e) => s + e.amount, 0),
    totalIncome: incomes.reduce((s, i) => s + i.amount, 0),
    recentEntries: entries
      .sort((a, b) => (b.date || b.monthId).localeCompare(a.date || a.monthId))
      .slice(0, 50)
      .map(e => ({
        amount: e.amount,
        monthId: e.monthId,
        date: e.date,
        category: categories.find(c => c.id === e.categoryId)?.name || e.categoryId,
        account: e.account,
        description: e.description,
      })),
    categoryTotals: categories.map(c => ({
      name: c.name,
      total: entries.filter(e => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0)
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total),
    trips: trips.map(t => ({
      name: t.name,
      budget: t.budget,
      spent: entries.filter(e => Array.isArray(e.tripId) && e.tripId.includes(t.id)).reduce((s, e) => s + e.amount, 0)
    })),
    budgets: budgets.map(b => ({
      category: categories.find(c => c.id === b.categoryId)?.name || b.categoryId,
      limit: b.limit,
      account: b.account
    })),
    savings: savings.map(s => ({ name: s.name, target: s.targetAmount, type: s.targetType }))
  });

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, context: buildContext() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI request failed');

      // Check if response contains a data action
      const reply: string = data.reply || '';
      let displayReply = reply;
      try {
        const jsonMatch = reply.match(/\{[\s\S]*"action"[\s\S]*\}/);
        if (jsonMatch) {
          const action = JSON.parse(jsonMatch[0]);
          if (action.action === 'delete_entries' && action.ids?.length && onDeleteEntries) {
            const textPart = reply.replace(jsonMatch[0], '').trim();
            displayReply = textPart + `\n\n_Action available: delete ${action.ids.length} entries. [Confirm below]_`;
            setMessages(prev => [...prev,
              { role: 'assistant', text: displayReply },
              { role: 'assistant', text: `__ACTION__${JSON.stringify(action)}` }
            ]);
            setLoading(false);
            return;
          }
        }
      } catch { /* not an action */ }

      setMessages(prev => [...prev, { role: 'assistant', text: displayReply }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${e.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async () => {
    setInsightsLoading(true);
    setInsights(null);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: buildContext() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setInsights(data.insights || []);
    } catch (e: any) {
      setInsights([{ type: 'warning', title: 'Error', body: e.message }]);
    } finally {
      setInsightsLoading(false);
    }
  };

  const handleScanFile = (file: File) => {
    setScanResult(null);
    setScanError('');
    setScanLoading(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      try {
        const res = await fetch('/api/ai/scan-receipt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType })
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Scan failed');
        setScanResult(data);
      } catch (e: any) {
        setScanError(e.message);
      } finally {
        setScanLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const cardBg = theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';

  const insightIcon = (type: string) => {
    if (type === 'warning') return <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />;
    if (type === 'tip') return <TrendingUp size={16} className="text-indigo-500 shrink-0 mt-0.5" />;
    return <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />;
  };

  const insightBg = (type: string) => {
    if (type === 'warning') return 'bg-amber-50 border-amber-200';
    if (type === 'tip') return 'bg-indigo-50 border-indigo-200';
    return 'bg-blue-50 border-blue-200';
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">AI Assistant</h2>
          <p className="text-xs text-slate-500">Ask questions, scan receipts, or get a spending review</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['chat', 'scan', 'review'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition -mb-px capitalize ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {tab === 'chat' ? '💬 Chat' : tab === 'scan' ? '📷 Scan Receipt' : '📊 Expense Review'}
          </button>
        ))}
      </div>

      {/* Chat Tab */}
      {activeTab === 'chat' && (
        <div className={`${cardBg} border rounded-xl flex flex-col`} style={{ height: '520px' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => {
              if (msg.text.startsWith('__ACTION__')) {
                const action = JSON.parse(msg.text.replace('__ACTION__', ''));
                return (
                  <div key={i} className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <p className="text-xs text-amber-800 font-medium">Delete {action.ids.length} entries as suggested?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { onDeleteEntries?.(action.ids); setMessages(prev => prev.filter((_, j) => j !== i).concat({ role: 'assistant', text: `Done — deleted ${action.ids.length} entries.` })); }}
                        className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition"
                      >Confirm</button>
                      <button onClick={() => setMessages(prev => prev.filter((_, j) => j !== i))} className="text-xs border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition">Dismiss</button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : msg.isError
                        ? 'bg-red-50 border border-red-200 text-red-700 rounded-bl-sm'
                        : (theme === 'dark' ? 'bg-slate-800 text-slate-200 rounded-bl-sm' : 'bg-slate-100 text-slate-800 rounded-bl-sm')
                  }`}>
                    {msg.text.replace(/_Action available:.*_/, '')}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className={`px-4 py-2.5 rounded-2xl rounded-bl-sm ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  <Loader size={14} className="animate-spin text-indigo-500" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className={`p-3 border-t ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} flex gap-2`}>
            <input
              className={`flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200 transition ${inputBg}`}
              placeholder="Ask about your finances…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Scan Tab */}
      {activeTab === 'scan' && (
        <div className={`${cardBg} border rounded-xl p-6 space-y-4`}>
          <p className="text-sm text-slate-600">Upload a photo of a receipt and the AI will extract the amount, date, and category for you.</p>

          <label className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl p-8 cursor-pointer transition ${scanLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-indigo-50 border-slate-300 hover:border-indigo-300'}`}>
            {scanLoading ? <Loader size={32} className="animate-spin text-indigo-500" /> : <Camera size={32} className="text-slate-400" />}
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-700">{scanLoading ? 'Scanning…' : 'Click to upload receipt'}</p>
              <p className="text-xs text-slate-400 mt-1">JPG, PNG, WEBP supported</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" disabled={scanLoading} onChange={e => e.target.files?.[0] && handleScanFile(e.target.files[0])} />
          </label>

          {scanError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">
              <AlertTriangle size={16} /> {scanError}
            </div>
          )}

          {scanResult && !scanResult.error && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <p className="text-sm font-bold text-emerald-800">Receipt scanned successfully</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Amount', scanResult.amount !== null ? `${scanResult.currency || currency} ${scanResult.amount}` : '—'],
                  ['Date', scanResult.date || '—'],
                  ['Description', scanResult.description || '—'],
                  ['Suggested Category', scanResult.suggestedCategory || '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{label}</p>
                    <p className="text-sm font-semibold text-slate-800">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">Go to Register → Single Expense to add this entry using these details.</p>
              <button onClick={() => { setScanResult(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 transition">
                <X size={12} /> Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Review Tab */}
      {activeTab === 'review' && (
        <div className={`${cardBg} border rounded-xl p-6 space-y-4`}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-600">Get an AI-powered analysis of your spending patterns, budget health, and savings opportunities.</p>
            <button
              onClick={loadInsights}
              disabled={insightsLoading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50 shrink-0"
            >
              {insightsLoading ? <Loader size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {insightsLoading ? 'Analysing…' : 'Analyse Now'}
            </button>
          </div>

          {insights && (
            <div className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className={`flex gap-3 border rounded-xl p-4 ${insightBg(ins.type)}`}>
                  {insightIcon(ins.type)}
                  <div>
                    <p className="text-sm font-bold text-slate-800">{ins.title}</p>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{ins.body}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!insights && !insightsLoading && (
            <div className="text-center py-8 text-slate-400">
              <Sparkles size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Click "Analyse Now" to get personalised insights</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
