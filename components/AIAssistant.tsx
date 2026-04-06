import React, { useState, useRef, useEffect } from 'react';
import { ExpenseEntry, Category, Trip, CurrencyCode, User, IncomeEntry, Budget, SavingsGoal, AccountType, CurrentUserId, ChatSession, ChatMessage, UserSettings } from '../types';
import { Send, Sparkles, X, AlertTriangle, TrendingUp, Info, Loader, Plus, FileText, Image, BarChart3, MessageSquarePlus, Trash2, Edit3, Check, ChevronDown, Settings, RefreshCw, WifiOff } from 'lucide-react';
import { generateId } from '../services/utils';

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  categoryId: string;
  comment?: string;
  // Classification: 'expense' (positive debit), 'salary' (large credit), 'deduction' (small credit applied to expense)
  txnType?: 'expense' | 'salary' | 'deduction';
  skipped?: boolean; // User chose to skip this row during import
  linkedExpenseId?: string; // For deductions: the expense entry this offsets
}

interface Insight {
  type: 'warning' | 'tip' | 'info';
  title: string;
  body: string;
}

interface ReceiptData {
  amount: number | null;
  date: string | null;
  description: string | null;
  categoryId: string | null;
  currency: string | null;
}

interface PendingQuestion {
  transactionDescription?: string;
  question: string;
  options: string[];
}

// Internal rich message (not persisted directly)
interface Message {
  role: 'user' | 'assistant';
  text: string;
  isError?: boolean;
  attachment?: { name: string; type: 'image' | 'pdf' };
  transactions?: ParsedTransaction[];
  transactionOwner?: AccountType;
  targetMonth?: string; // Override month for all transactions without a date
  insights?: Insight[];
  receiptData?: ReceiptData;
  pendingQuestions?: PendingQuestion[];
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
  currentUser: CurrentUserId;
  instanceId: string;
  chatSessions: ChatSession[];
  onUpdateChatSessions: (sessions: ChatSession[]) => void;
  onDeleteEntries?: (ids: string[]) => void;
  onUpdateEntries?: (updates: Array<{ id: string } & Partial<ExpenseEntry>>) => void;
  onAddEntries?: (entries: Omit<ExpenseEntry, 'id'>[]) => void;
  onAddIncome?: (source: string, amount: number, recipient: AccountType, monthId: string) => void;
  onNavigateToExpense?: (prefill: Partial<ExpenseEntry>) => void;
  userSettings?: UserSettings;
  onUpdateUserSettings?: (settings: UserSettings) => void;
  onRefresh?: () => void;
}

const MAX_CONTEXT_MESSAGES = 10; // Last N messages sent as conversation context

// Convert between persisted ChatMessage and rich Message
function toMessage(cm: ChatMessage): Message {
  return {
    role: cm.role,
    text: cm.text,
    isError: cm.isError,
    attachment: cm.attachment,
    transactions: cm.transactionsJson ? JSON.parse(cm.transactionsJson) : undefined,
    transactionOwner: cm.transactionOwner as AccountType | undefined,
    targetMonth: cm.targetMonth,
    insights: cm.insightsJson ? JSON.parse(cm.insightsJson) : undefined,
    receiptData: cm.receiptDataJson ? JSON.parse(cm.receiptDataJson) : undefined,
  };
}

function toChatMessage(msg: Message): ChatMessage {
  return {
    role: msg.role,
    text: msg.text,
    isError: msg.isError,
    attachment: msg.attachment,
    transactionsJson: msg.transactions ? JSON.stringify(msg.transactions) : undefined,
    transactionOwner: msg.transactionOwner,
    targetMonth: msg.targetMonth,
    insightsJson: msg.insights ? JSON.stringify(msg.insights) : undefined,
    receiptDataJson: msg.receiptData ? JSON.stringify(msg.receiptData) : undefined,
  };
}

// Lightweight markdown renderer: bold, bullet lists, tables, line breaks
function renderMarkdown(text: string, isDark: boolean, onDeleteEntry?: (id: string) => void): React.ReactNode {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  const renderInline = (line: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const isTableRow = (line: string) => line.trim().startsWith('|') && line.trim().endsWith('|');
  const parseRow = (line: string) => line.trim().slice(1, -1).split('|').map(c => c.trim());

  while (i < lines.length) {
    const line = lines[i];

    // Markdown table
    if (isTableRow(line) && i + 1 < lines.length && /^\|[-| :]+\|$/.test(lines[i + 1].trim())) {
      const headers = parseRow(line);
      i += 2; // skip header + separator
      const idColIdx = headers.findIndex(h => h.toLowerCase() === 'id');
      const visibleHeaders = headers.filter((_, j) => j !== idColIdx);
      const rows: React.ReactNode[] = [];

      while (i < lines.length && isTableRow(lines[i])) {
        const cells = parseRow(lines[i]);
        const rowId = idColIdx >= 0 ? cells[idColIdx] : undefined;
        const visibleCells = cells.filter((_, j) => j !== idColIdx);
        rows.push(
          <tr key={i} className={`border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            {visibleCells.map((cell, j) => (
              <td key={j} className="px-2 py-1 text-xs">{renderInline(cell)}</td>
            ))}
            {onDeleteEntry && rowId && (
              <td className="px-2 py-1">
                <button
                  onClick={() => onDeleteEntry(rowId)}
                  className={`text-[10px] px-1.5 py-0.5 rounded transition ${isDark ? 'text-red-400 hover:bg-red-900/40' : 'text-red-500 hover:bg-red-50'}`}
                  title="Delete entry"
                >✕</button>
              </td>
            )}
          </tr>
        );
        i++;
      }

      nodes.push(
        <div key={key++} className="overflow-x-auto my-2">
          <table className={`w-full text-xs rounded-lg border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
            <thead>
              <tr className={isDark ? 'bg-slate-800' : 'bg-slate-50'}>
                {visibleHeaders.map((h, j) => (
                  <th key={j} className="px-2 py-1.5 text-left font-semibold">{h}</th>
                ))}
                {onDeleteEntry && idColIdx >= 0 && <th className="px-2 py-1.5 w-8" />}
              </tr>
            </thead>
            <tbody>{rows}</tbody>
          </table>
        </div>
      );
      continue;
    }

    if (line.startsWith('• ') || line.startsWith('- ')) {
      nodes.push(
        <div key={key++} className="flex gap-1.5 my-0.5">
          <span className="mt-0.5 shrink-0">•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line === '') {
      nodes.push(<div key={key++} className="h-2" />);
    } else {
      nodes.push(<div key={key++}>{renderInline(line)}</div>);
    }
    i++;
  }
  return <>{nodes}</>;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  entries, categories, trips, incomes, budgets, savings, users, currency, theme = 'light', currentUser, instanceId, chatSessions, onUpdateChatSessions, onDeleteEntries, onUpdateEntries, onAddEntries, onAddIncome, onNavigateToExpense, userSettings, onUpdateUserSettings, onRefresh
}) => {
  const currentUserName = users[currentUser]?.name || currentUser;
  const isDark = theme === 'dark';

  // SSE session token (per-tab UUID)
  const sessionTokenRef = useRef<string>(generateId());
  const [isDisplaced, setIsDisplaced] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [draftApiKey, setDraftApiKey] = useState(userSettings?.apiKey || '');
  const [draftModel, setDraftModel] = useState(userSettings?.model || '');
  const [draftProvider, setDraftProvider] = useState<UserSettings['provider']>(userSettings?.provider || 'google');

  // SSE connection for session displacement and real-time sync
  useEffect(() => {
    const token = sessionTokenRef.current;
    const url = `/api/sync/events?userId=${encodeURIComponent(currentUser)}&sessionToken=${encodeURIComponent(token)}`;
    const evtSource = new EventSource(url);
    evtSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.event === 'session-displaced') {
          setIsDisplaced(true);
        } else if (payload.event === 'data-updated') {
          onRefresh?.();
        }
      } catch { /* ignore */ }
    };
    return () => evtSource.close();
  }, [currentUser]);

  // Session management
  const [activeSessionId, setActiveSessionId] = useState<string | null>(chatSessions[0]?.id || null);
  const [showSessionList, setShowSessionList] = useState(false);

  const activeSession = chatSessions.find(s => s.id === activeSessionId);
  const [messages, setMessages] = useState<Message[]>(() => {
    if (activeSession) return activeSession.messages.map(toMessage);
    return [{ role: 'assistant', text: `Hi ${currentUserName}! I'm your FairShare AI assistant. Ask me anything about your finances, attach a receipt or bank statement, or click "Analyse Spending" for insights.` }];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File; base64: string; mimeType: string } | null>(null);
  const [showOwnerPicker, setShowOwnerPicker] = useState(false);
  const [pendingOwner, setPendingOwner] = useState<AccountType | null>(null);
  const [editingTxn, setEditingTxn] = useState<{ msgIdx: number; txnIdx: number } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const sessionListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when switching sessions
  useEffect(() => {
    const session = chatSessions.find(s => s.id === activeSessionId);
    if (session) {
      setMessages(session.messages.map(toMessage));
    }
  }, [activeSessionId]);

  // Persist messages to session on change
  useEffect(() => {
    if (!activeSessionId || messages.length <= 1) return;
    const timer = setTimeout(() => {
      onUpdateChatSessions(chatSessions.map(s =>
        s.id === activeSessionId
          ? { ...s, messages: messages.map(toChatMessage), updatedAt: Date.now() }
          : s
      ));
    }, 500);
    return () => clearTimeout(timer);
  }, [messages, activeSessionId]);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) setShowAttachMenu(false);
      if (sessionListRef.current && !sessionListRef.current.contains(e.target as Node)) setShowSessionList(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const createNewSession = () => {
    const id = generateId();
    const greeting: Message = { role: 'assistant', text: `Hi ${currentUserName}! New chat started. How can I help?` };
    const newSession: ChatSession = {
      id,
      name: `Chat ${chatSessions.length + 1}`,
      messages: [toChatMessage(greeting)],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    onUpdateChatSessions([newSession, ...chatSessions]);
    setActiveSessionId(id);
    setMessages([greeting]);
    setShowSessionList(false);
  };

  const deleteSession = (id: string) => {
    const remaining = chatSessions.filter(s => s.id !== id);
    onUpdateChatSessions(remaining);
    if (activeSessionId === id) {
      if (remaining.length > 0) {
        setActiveSessionId(remaining[0].id);
        setMessages(remaining[0].messages.map(toMessage));
      } else {
        createNewSession();
      }
    }
  };

  // Auto-create first session if none exist
  useEffect(() => {
    if (chatSessions.length === 0) {
      createNewSession();
    } else if (!activeSessionId) {
      setActiveSessionId(chatSessions[0].id);
    }
  }, []);

  const buildContext = () => ({
    currency,
    currentMonth: defaultMonth,
    currentUser: { id: currentUser, name: currentUserName },
    users: Object.fromEntries(Object.entries(users).map(([k, v]) => [k, { name: v.name }])),
    totalEntries: entries.length,
    totalExpenses: entries.reduce((s, e) => s + e.amount, 0),
    totalIncome: incomes.reduce((s, i) => s + i.amount, 0),
    recentEntries: entries
      .sort((a, b) => (b.date || b.monthId).localeCompare(a.date || a.monthId))
      .slice(0, 50)
      .map(e => ({
        amount: e.amount, monthId: e.monthId, date: e.date,
        category: categories.find(c => c.id === e.categoryId)?.name || e.categoryId,
        account: e.account, description: e.description,
      })),
    categoryTotals: categories.map(c => ({
      name: c.name,
      total: entries.filter(e => e.categoryId === c.id).reduce((s, e) => s + e.amount, 0)
    })).filter(c => c.total > 0).sort((a, b) => b.total - a.total),
    trips: trips.map(t => ({
      name: t.name, budget: t.budget,
      spent: entries.filter(e => Array.isArray(e.tripId) && e.tripId.includes(t.id)).reduce((s, e) => s + e.amount, 0)
    })),
    budgets: budgets.map(b => ({
      category: categories.find(c => c.id === b.categoryId)?.name || b.categoryId,
      limit: b.limit, account: b.account
    })),
    savings: savings.map(s => ({ name: s.name, target: s.targetAmount, type: s.targetType })),
    categories: categories.map(c => ({ id: c.id, name: c.name, group: c.group, defaultAccount: c.defaultAccount })),
    expenseContext: (currentUser as string) === 'shared' ? 'shared' : 'personal',
  });

  // Build conversation history for context window
  const buildConversationHistory = () => {
    const recent = messages.slice(-MAX_CONTEXT_MESSAGES);
    return recent
      .filter(m => !m.text.startsWith('__ACTION__'))
      .map(m => ({ role: m.role, content: m.text }));
  };

  const sendMessage = async () => {
    if ((!input.trim() && !pendingFile) || loading) return;
    const userMsg = input.trim();
    setInput('');

    const userMessage: Message = {
      role: 'user',
      text: userMsg || (pendingFile ? `Attached: ${pendingFile.file.name}` : ''),
      attachment: pendingFile ? { name: pendingFile.file.name, type: pendingFile.mimeType.startsWith('image/') ? 'image' : 'pdf' } : undefined,
    };
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);

    try {
      if (pendingFile) {
        const isPdf = pendingFile.mimeType === 'application/pdf';
        if (isPdf) {
          const owner = pendingOwner || (currentUser === 'user_1' ? 'USER_1' : 'USER_2');
          const expenseContext = (currentUser as string) === 'shared' ? 'shared' : 'personal';
          const res = await fetch('/api/ai/parse-statement', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              attachmentBase64: pendingFile.base64,
              mimeType: pendingFile.mimeType,
              owner,
              categories: categories.map(c => ({ id: c.id, name: c.name, group: c.group, defaultAccount: c.defaultAccount })),
              expenseContext,
            })
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || 'Parse failed');
          // Classify transactions: large credits = salary, small credits = possible deduction, positive = expense
          const SALARY_THRESHOLD = 500; // Credits above this are likely salary
          const transactions: ParsedTransaction[] = (data.transactions || []).map((t: ParsedTransaction) => {
            let txnType: ParsedTransaction['txnType'] = 'expense';
            if (t.amount < 0) {
              txnType = Math.abs(t.amount) >= SALARY_THRESHOLD ? 'salary' : 'deduction';
            }
            return { ...t, comment: '', txnType };
          });
          const ownerLabel = owner === 'SHARED' ? 'Shared' : users[owner === 'USER_1' ? 'user_1' : 'user_2']?.name || owner;
          const salaryCount = transactions.filter(t => t.txnType === 'salary').length;
          const deductionCount = transactions.filter(t => t.txnType === 'deduction').length;
          const expenseCount = transactions.filter(t => t.txnType === 'expense').length;
          let summary = `Found ${transactions.length} transactions (${ownerLabel} account):\n`;
          if (salaryCount > 0) summary += `• ${salaryCount} income/salary entries (will update income)\n`;
          if (deductionCount > 0) summary += `• ${deductionCount} small credits (marked as deductions — change to salary or expense if needed)\n`;
          if (expenseCount > 0) summary += `• ${expenseCount} expenses\n`;
          summary += `\nEdit types, categories, and amounts below. Then import:`;
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: transactions.length > 0 ? summary : 'Could not extract any transactions from this document.',
            transactions: transactions.length > 0 ? transactions : undefined,
            transactionOwner: owner,
            pendingQuestions: (data.pendingQuestions && data.pendingQuestions.length > 0) ? data.pendingQuestions : undefined,
          }]);
        } else {
          const expenseContext = (currentUser as string) === 'shared' ? 'shared' : 'personal';
          const res = await fetch('/api/ai/scan-receipt', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64: pendingFile.base64,
              mimeType: pendingFile.mimeType,
              categories: categories.map(c => ({ id: c.id, name: c.name, group: c.group, defaultAccount: c.defaultAccount })),
              expenseContext,
            })
          });
          const data = await res.json();
          if (!res.ok || data.error) throw new Error(data.error || 'Scan failed');
          setMessages(prev => [...prev, { role: 'assistant', text: 'Receipt scanned successfully:', receiptData: data }]);
        }
      } else {
        const ctx = buildContext();
        const conversationHistory = buildConversationHistory();
        const res = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMsg,
            context: ctx,
            conversationHistory,
            currentUser: { id: currentUser, name: currentUserName }
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'AI request failed');

        const reply: string = data.reply || '';
        // Handle pending clarification questions from the AI
        if (data.pendingQuestions && Array.isArray(data.pendingQuestions) && data.pendingQuestions.length > 0) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            text: reply || 'I need some clarification before I can continue:',
            pendingQuestions: data.pendingQuestions,
          }]);
          setLoading(false);
          setPendingFile(null); setPendingOwner(null); setShowOwnerPicker(false);
          return;
        }
        let displayReply = reply;
        try {
          // Strip markdown code fences if AI wrapped the JSON despite instructions
          const stripped = reply.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');
          const jsonMatch = stripped.match(/\{[^{}]*"action"[^{}]*(?:\{[^{}]*\}[^{}]*)?\}/s) ||
                            stripped.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
          if (jsonMatch) {
            const action = JSON.parse(jsonMatch[0]);
            const textPart = stripped.replace(jsonMatch[0], '').replace(/```(?:json)?|```/g, '').trim();
            if (action.action === 'delete_entries' && action.ids?.length && onDeleteEntries) {
              displayReply = textPart + `\n\n_Action: delete ${action.ids.length} entr${action.ids.length === 1 ? 'y' : 'ies'}. [Confirm below]_`;
              setMessages(prev => [...prev,
                { role: 'assistant', text: displayReply },
                { role: 'assistant', text: `__ACTION__${JSON.stringify(action)}` }
              ]);
              setLoading(false);
              setPendingFile(null); setPendingOwner(null); setShowOwnerPicker(false);
              return;
            }
            if (action.action === 'update_entries' && action.updates?.length && onUpdateEntries) {
              const count = action.updates.length;
              displayReply = textPart + `\n\n_Action: update ${count} entr${count === 1 ? 'y' : 'ies'}. [Confirm below]_`;
              setMessages(prev => [...prev,
                { role: 'assistant', text: displayReply },
                { role: 'assistant', text: `__ACTION__${JSON.stringify(action)}` }
              ]);
              setLoading(false);
              setPendingFile(null); setPendingOwner(null); setShowOwnerPicker(false);
              return;
            }
            if (action.action === 'add_entries' && action.entries?.length && onAddEntries) {
              const count = action.entries.length;
              displayReply = textPart + `\n\n_Action: add ${count} entr${count === 1 ? 'y' : 'ies'}. [Confirm below]_`;
              setMessages(prev => [...prev,
                { role: 'assistant', text: displayReply },
                { role: 'assistant', text: `__ACTION__${JSON.stringify(action)}` }
              ]);
              setLoading(false);
              setPendingFile(null); setPendingOwner(null); setShowOwnerPicker(false);
              return;
            }
          }
        } catch { /* not an action */ }
        setMessages(prev => [...prev, { role: 'assistant', text: displayReply }]);
      }
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${e.message}`, isError: true }]);
    } finally {
      setLoading(false);
      setPendingFile(null); setPendingOwner(null); setShowOwnerPicker(false);
    }
  };

  const handleFileSelect = (file: File) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      const mimeType = file.type || 'image/jpeg';
      setPendingFile({ file, base64, mimeType });
      setShowAttachMenu(false);
      if (mimeType === 'application/pdf') setShowOwnerPicker(true);
    };
    reader.readAsDataURL(file);
  };

  const loadInsights = async () => {
    setMessages(prev => [...prev, { role: 'user', text: 'Analyse my spending patterns' }]);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: buildContext() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Here are your spending insights:', insights: data.insights || [] }]);
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${e.message}`, isError: true }]);
    } finally { setLoading(false); }
  };

  const handleAddReceiptAsExpense = (receipt: ReceiptData) => {
    if (!onNavigateToExpense) return;
    let matchedCategoryId = categories[0]?.id;
    if (receipt.categoryId) {
      const match = categories.find(c =>
        c.name.toLowerCase().includes(receipt.categoryId!.toLowerCase()) ||
        receipt.categoryId!.toLowerCase().includes(c.name.toLowerCase())
      );
      if (match) matchedCategoryId = match.id;
    }
    onNavigateToExpense({
      amount: receipt.amount ?? undefined,
      description: receipt.description ?? undefined,
      date: receipt.date ?? undefined,
      categoryId: matchedCategoryId,
      account: currentUser === 'user_1' ? 'USER_1' : 'USER_2',
    });
  };

  // Update a transaction in-place
  const updateTransaction = (msgIdx: number, txnIdx: number, updates: Partial<ParsedTransaction>) => {
    setMessages(prev => prev.map((msg, i) => {
      if (i !== msgIdx || !msg.transactions) return msg;
      const newTxns = [...msg.transactions];
      newTxns[txnIdx] = { ...newTxns[txnIdx], ...updates };
      return { ...msg, transactions: newTxns };
    }));
  };

  // Update targetMonth on a specific message
  const updateMessageMonth = (msgIdx: number, month: string) => {
    setMessages(prev => prev.map((msg, i) => i === msgIdx ? { ...msg, targetMonth: month } : msg));
  };

  // Detect conflicting entries: same amount + similar description in the same month
  const findConflicts = (transactions: ParsedTransaction[], targetMonth: string): Set<number> => {
    const conflicts = new Set<number>();
    transactions.forEach((txn, idx) => {
      if (txn.txnType === 'salary') return; // Incomes don't conflict with expense entries
      const entryMonth = txn.date ? txn.date.slice(0, 7) : targetMonth;
      const amt = Math.abs(txn.amount);
      const descLower = txn.description.toLowerCase().slice(0, 20);
      const hasConflict = entries.some(e =>
        e.monthId === entryMonth &&
        Math.abs(e.amount - amt) < 0.01 &&
        (e.description || '').toLowerCase().slice(0, 20).includes(descLower.slice(0, 10))
      );
      if (hasConflict) conflicts.add(idx);
    });
    return conflicts;
  };

  // Match category by name (fuzzy)
  const matchCategory = (name: string): string => {
    const match = categories.find(c =>
      c.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(c.name.toLowerCase())
    );
    return match?.id || categories[0]?.id || '';
  };

  // Import transactions: expenses go to entries, salary/income goes to incomes, deductions reduce expenses
  const handleImportTransactions = (transactions: ParsedTransaction[], owner: AccountType, targetMonth?: string, skipIndices?: Set<number>) => {
    const importMonth = targetMonth || defaultMonth;
    const recipient = owner;

    // Filter out explicitly skipped indices or rows marked as skipped
    const filteredTxns = transactions.filter((t, idx) => !skipIndices?.has(idx) && !t.skipped);

    // Separate by type
    const expenseTxns = filteredTxns.filter(t => t.txnType === 'expense' || (!t.txnType && t.amount > 0));
    const salaryTxns = filteredTxns.filter(t => t.txnType === 'salary');
    const deductionTxns = filteredTxns.filter(t => t.txnType === 'deduction');

    // Build a map: batchIndex (string) -> deduction amount for linked deductions
    // linkedExpenseId on a ParsedTransaction stores the string index of the linked expense in the original array
    const deductionsByLinkedIdx = new Map<string, number>();
    const unlinkedDeductions: ParsedTransaction[] = [];
    for (const d of deductionTxns) {
      if (d.linkedExpenseId) {
        const prev = deductionsByLinkedIdx.get(d.linkedExpenseId) ?? 0;
        deductionsByLinkedIdx.set(d.linkedExpenseId, prev + Math.abs(d.amount));
      } else {
        unlinkedDeductions.push(d);
      }
    }

    // Import expenses (net of any linked deductions)
    if (onAddEntries && expenseTxns.length > 0) {
      const newEntries: Omit<ExpenseEntry, 'id'>[] = expenseTxns.map(t => {
        const categoryId = matchCategory(t.categoryId);
        const cat = categories.find(c => c.id === categoryId);
        const account = owner === 'SHARED' ? (cat?.defaultAccount || 'SHARED') : owner;
        const entryMonth = t.date ? t.date.slice(0, 7) : importMonth;
        const batchIdx = String(transactions.indexOf(t));
        const linkedDeduction = deductionsByLinkedIdx.get(batchIdx) ?? 0;
        const netAmount = Math.max(0, Math.abs(t.amount) - linkedDeduction);
        const desc = linkedDeduction > 0
          ? `${t.description} (net after ${sym}${linkedDeduction.toFixed(2)} refund)`
          : (t.comment ? `${t.description} — ${t.comment}` : t.description);
        return {
          monthId: entryMonth, categoryId, amount: netAmount, account,
          description: desc, date: t.date || undefined, entryType: 'single' as const,
        };
      });
      onAddEntries(newEntries);
    }

    // Import salary/income
    if (onAddIncome && salaryTxns.length > 0) {
      for (const t of salaryTxns) {
        const entryMonth = t.date ? t.date.slice(0, 7) : importMonth;
        const source = t.comment ? `${t.description} — ${t.comment}` : t.description;
        onAddIncome(source, Math.abs(t.amount), recipient, entryMonth);
      }
    }

    // Import unlinked deductions as standalone negative entries
    if (onAddEntries && unlinkedDeductions.length > 0) {
      const deductionEntries: Omit<ExpenseEntry, 'id'>[] = unlinkedDeductions.map(t => {
        const categoryId = matchCategory(t.categoryId);
        const cat = categories.find(c => c.id === categoryId);
        const account = owner === 'SHARED' ? (cat?.defaultAccount || 'SHARED') : owner;
        const entryMonth = t.date ? t.date.slice(0, 7) : importMonth;
        return {
          monthId: entryMonth, categoryId, amount: -Math.abs(t.amount), account,
          description: t.comment ? `${t.description} (refund) — ${t.comment}` : `${t.description} (refund)`,
          date: t.date || undefined, entryType: 'single' as const,
        };
      });
      onAddEntries(deductionEntries);
    }

    // Build summary
    const linkedCount = deductionTxns.length - unlinkedDeductions.length;
    const parts: string[] = [];
    if (expenseTxns.length > 0) parts.push(`${expenseTxns.length} expenses`);
    if (salaryTxns.length > 0) parts.push(`${salaryTxns.length} income/salary entries`);
    if (linkedCount > 0) parts.push(`${linkedCount} refund${linkedCount > 1 ? 's' : ''} applied to expenses`);
    if (unlinkedDeductions.length > 0) parts.push(`${unlinkedDeductions.length} standalone refund${unlinkedDeductions.length > 1 ? 's' : ''}`);

    setMessages(prev => [...prev, {
      role: 'assistant',
      text: `Imported ${parts.join(', ')}.\n\nWould you like to:\n• Add any **extra savings** contributions for this month?\n• Upload another **bank statement** or receipt?\n• Record any **additional expenses** not on the statement?\n• **Review your spending** with an analysis?\n\nJust let me know!`
    }]);
  };

  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const cardBg = isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200';
  const inputBg = isDark ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400';
  const CURRENCY_SYMBOL: Record<string, string> = { EUR: '€', GBP: '£', JPY: '¥', BRL: 'R$', USD: '$' };
  const sym = CURRENCY_SYMBOL[currency] ?? '$';

  const insightIcon = (type: string) => {
    if (type === 'warning') return <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />;
    if (type === 'tip') return <TrendingUp size={16} className="text-indigo-500 shrink-0 mt-0.5" />;
    return <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />;
  };
  const insightBg = (type: string) => {
    if (type === 'warning') return isDark ? 'bg-amber-950/50 border-amber-800/50' : 'bg-amber-50 border-amber-200';
    if (type === 'tip') return isDark ? 'bg-indigo-950/50 border-indigo-800/50' : 'bg-indigo-50 border-indigo-200';
    return isDark ? 'bg-blue-950/50 border-blue-800/50' : 'bg-blue-50 border-blue-200';
  };

  // Group transactions by matched category group for display
  const groupTransactions = (transactions: ParsedTransaction[]) => {
    const groups: Record<string, { label: string; txns: { txn: ParsedTransaction; idx: number }[] }> = {
      'INCOME': { label: 'Income / Salary', txns: [] },
      'SHARED': { label: 'Shared Household & Living', txns: [] },
      'PERSONAL': { label: 'Personal Expenses', txns: [] },
      'TRAVEL': { label: 'Travel & Adventures', txns: [] },
      'SAVINGS': { label: 'Wealth Building & Savings', txns: [] },
      'DEDUCTIONS': { label: 'Deductions / Refunds', txns: [] },
      'OTHER': { label: 'Other / Unmatched', txns: [] },
    };
    transactions.forEach((txn, idx) => {
      if (txn.txnType === 'salary') { groups['INCOME'].txns.push({ txn, idx }); return; }
      if (txn.txnType === 'deduction') { groups['DEDUCTIONS'].txns.push({ txn, idx }); return; }
      const catId = matchCategory(txn.categoryId);
      const cat = categories.find(c => c.id === catId);
      if (!cat) { groups['OTHER'].txns.push({ txn, idx }); return; }
      if (cat.group === 'TRAVEL') groups['TRAVEL'].txns.push({ txn, idx });
      else if (cat.group === 'SAVINGS') groups['SAVINGS'].txns.push({ txn, idx });
      else if (cat.defaultAccount === 'SHARED') groups['SHARED'].txns.push({ txn, idx });
      else groups['PERSONAL'].txns.push({ txn, idx });
    });
    return Object.entries(groups).filter(([, g]) => g.txns.length > 0);
  };

  const groupColors: Record<string, string> = {
    'INCOME': isDark ? 'border-l-green-500' : 'border-l-green-400',
    'SHARED': isDark ? 'border-l-purple-500' : 'border-l-purple-400',
    'PERSONAL': isDark ? 'border-l-blue-500' : 'border-l-blue-400',
    'TRAVEL': isDark ? 'border-l-amber-500' : 'border-l-amber-400',
    'SAVINGS': isDark ? 'border-l-emerald-500' : 'border-l-emerald-400',
    'DEDUCTIONS': isDark ? 'border-l-orange-500' : 'border-l-orange-400',
    'OTHER': isDark ? 'border-l-slate-500' : 'border-l-slate-400',
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Session displacement warning banner */}
      {isDisplaced && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border ${isDark ? 'bg-amber-950/50 border-amber-800/50 text-amber-300' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
          <div className="flex items-center gap-2">
            <WifiOff size={15} className="shrink-0" />
            <span className="text-sm font-medium">You've been signed in from another tab or device.</span>
          </div>
          <button
            onClick={() => { setIsDisplaced(false); sessionTokenRef.current = generateId(); }}
            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition shrink-0">
            <RefreshCw size={12} /> Reconnect
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h2 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-800'}`}>AI Assistant</h2>
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-slate-500'}`}>
              {activeSession ? activeSession.name : 'Chat, attach documents, or get spending insights'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings(s => !s)}
            className={`p-2 rounded-xl transition ${showSettings ? 'bg-indigo-100 text-indigo-600' : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
            title="API Key & Model Settings">
            <Settings size={16} />
          </button>
          <button onClick={loadInsights} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-50">
            <BarChart3 size={14} /> Analyse
          </button>
        </div>
      </div>

      {/* Per-user API key / model settings panel */}
      {showSettings && (
        <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
          <h3 className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>AI Settings — {currentUserName}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Provider</label>
              <select value={draftProvider || 'google'} onChange={e => setDraftProvider(e.target.value as UserSettings['provider'])}
                className={`w-full text-sm border rounded-lg px-2 py-1.5 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'}`}>
                <option value="google">Google (Gemini)</option>
                <option value="openai">OpenAI-compatible</option>
                <option value="anthropic">Anthropic (Claude)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>API Key</label>
              <input type="password" value={draftApiKey} onChange={e => setDraftApiKey(e.target.value)}
                placeholder="Paste your API key..."
                className={`w-full text-sm border rounded-lg px-2 py-1.5 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`} />
            </div>
            <div className="sm:col-span-3">
              <label className={`text-[10px] font-bold uppercase tracking-wider block mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Model (optional override)</label>
              <input type="text" value={draftModel} onChange={e => setDraftModel(e.target.value)}
                placeholder="e.g. gemini-2.0-flash, gpt-4o, claude-opus-4-6"
                className={`w-full text-sm border rounded-lg px-2 py-1.5 ${isDark ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-600' : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'}`} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={() => setShowSettings(false)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}>Cancel</button>
            <button onClick={() => {
              onUpdateUserSettings?.({ apiKey: draftApiKey || undefined, model: draftModel || undefined, provider: draftProvider });
              setShowSettings(false);
            }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition">Save</button>
          </div>
        </div>
      )}

      {/* Session Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {chatSessions.slice(0, 5).map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSessionId(s.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition shrink-0 ${
              s.id === activeSessionId
                ? 'bg-indigo-600 text-white'
                : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-500 hover:text-slate-700'
            }`}
          >
            {s.name}
            <span onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
              className="ml-1 opacity-50 hover:opacity-100">
              <X size={10} />
            </span>
          </button>
        ))}
        {chatSessions.length > 5 && (
          <div className="relative" ref={sessionListRef}>
            <button onClick={() => setShowSessionList(!showSessionList)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold transition ${isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
              <ChevronDown size={12} />
            </button>
            {showSessionList && (
              <div className={`absolute top-full right-0 mt-1 w-48 rounded-xl border shadow-xl p-1 z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                {chatSessions.slice(5).map(s => (
                  <button key={s.id} onClick={() => { setActiveSessionId(s.id); setShowSessionList(false); }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-slate-50 text-slate-600'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button onClick={createNewSession}
          className={`p-1.5 rounded-lg transition shrink-0 ${isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
          <MessageSquarePlus size={14} />
        </button>
      </div>

      {/* Chat Area */}
      <div className={`${cardBg} border rounded-xl flex flex-col`} style={{ height: '640px' }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, i) => {
            if (msg.text.startsWith('__ACTION__')) {
              const action = JSON.parse(msg.text.replace('__ACTION__', ''));
              const dismiss = () => setMessages(prev => prev.filter((_, j) => j !== i));

              if (action.action === 'delete_entries') {
                const count = action.ids.length;
                return (
                  <div key={i} className={`${isDark ? 'bg-red-950/50 border-red-800/50' : 'bg-red-50 border-red-200'} border rounded-xl p-3 flex items-center justify-between gap-3`}>
                    <p className={`text-xs font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>Delete {count} entr{count === 1 ? 'y' : 'ies'}?</p>
                    <div className="flex gap-2">
                      <button onClick={() => { onDeleteEntries?.(action.ids); setMessages(prev => prev.filter((_, j) => j !== i).concat({ role: 'assistant', text: `Deleted ${count} entr${count === 1 ? 'y' : 'ies'}.` })); }}
                        className="text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition">Confirm</button>
                      <button onClick={dismiss} className={`text-xs border px-3 py-1.5 rounded-lg transition ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>Dismiss</button>
                    </div>
                  </div>
                );
              }

              if (action.action === 'update_entries') {
                const count = action.updates.length;
                return (
                  <div key={i} className={`${isDark ? 'bg-amber-950/50 border-amber-800/50' : 'bg-amber-50 border-amber-200'} border rounded-xl p-3 flex items-center justify-between gap-3`}>
                    <p className={`text-xs font-medium ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>Update {count} entr{count === 1 ? 'y' : 'ies'}?</p>
                    <div className="flex gap-2">
                      <button onClick={() => { onUpdateEntries?.(action.updates); setMessages(prev => prev.filter((_, j) => j !== i).concat({ role: 'assistant', text: `Updated ${count} entr${count === 1 ? 'y' : 'ies'}.` })); }}
                        className="text-xs font-bold bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition">Confirm</button>
                      <button onClick={dismiss} className={`text-xs border px-3 py-1.5 rounded-lg transition ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>Dismiss</button>
                    </div>
                  </div>
                );
              }

              if (action.action === 'add_entries') {
                const count = action.entries.length;
                return (
                  <div key={i} className={`${isDark ? 'bg-green-950/50 border-green-800/50' : 'bg-green-50 border-green-200'} border rounded-xl p-3 flex items-center justify-between gap-3`}>
                    <p className={`text-xs font-medium ${isDark ? 'text-green-300' : 'text-green-800'}`}>Add {count} entr{count === 1 ? 'y' : 'ies'}?</p>
                    <div className="flex gap-2">
                      <button onClick={() => { onAddEntries?.(action.entries); setMessages(prev => prev.filter((_, j) => j !== i).concat({ role: 'assistant', text: `Added ${count} entr${count === 1 ? 'y' : 'ies'}.` })); }}
                        className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition">Confirm</button>
                      <button onClick={dismiss} className={`text-xs border px-3 py-1.5 rounded-lg transition ${isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-50'}`}>Dismiss</button>
                    </div>
                  </div>
                );
              }

              return null;
            }

            return (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] space-y-2">
                  {msg.attachment && (
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold ${
                      msg.attachment.type === 'pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {msg.attachment.type === 'pdf' ? <FileText size={11} /> : <Image size={11} />}
                      {msg.attachment.name}
                    </div>
                  )}

                  {msg.text && !msg.text.startsWith('__ACTION__') && (
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-sm'
                        : msg.isError
                          ? (isDark ? 'bg-red-950/50 border border-red-800/50 text-red-300' : 'bg-red-50 border border-red-200 text-red-700') + ' rounded-bl-sm'
                          : (isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-100 text-slate-800') + ' rounded-bl-sm'
                    }`}>
                      {msg.role === 'user'
                        ? msg.text.replace(/_Action available:.*_/, '')
                        : renderMarkdown(msg.text.replace(/_Action:.*_/, ''), isDark, onDeleteEntries ? (id) => onDeleteEntries([id]) : undefined)}
                    </div>
                  )}

                  {/* Receipt card */}
                  {msg.receiptData && (
                    <div className={`border rounded-xl p-4 space-y-3 ${isDark ? 'bg-emerald-950/50 border-emerald-800/50' : 'bg-emerald-50 border-emerald-200'}`}>
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          ['Amount', msg.receiptData.amount !== null ? `${msg.receiptData.currency || currency} ${msg.receiptData.amount}` : '—'],
                          ['Date', msg.receiptData.date || '—'],
                          ['Description', msg.receiptData.description || '—'],
                          ['Category', msg.receiptData.categoryId || '—'],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{label}</p>
                            <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                      {onNavigateToExpense && (
                        <button onClick={() => handleAddReceiptAsExpense(msg.receiptData!)}
                          className="text-xs font-bold bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                          Add as Expense
                        </button>
                      )}
                    </div>
                  )}

                  {/* Editable Transactions — grouped like expenses form */}
                  {msg.transactions && msg.transactions.length > 0 && (() => {
                    const txnTargetMonth = msg.targetMonth || defaultMonth;
                    const conflicts = findConflicts(msg.transactions, txnTargetMonth);
                    return (
                    <div className={`border rounded-xl overflow-hidden ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                      {/* Month + owner context header */}
                      <div className={`px-3 py-2 flex items-center gap-2 flex-wrap border-b ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'}`}>
                        {/* Owner badge */}
                        {msg.transactionOwner && (() => {
                          const ownerKey = msg.transactionOwner === 'USER_1' ? 'user_1' : msg.transactionOwner === 'USER_2' ? 'user_2' : null;
                          const ownerName = ownerKey ? (users[ownerKey]?.name || ownerKey) : 'Shared';
                          const ownerColor = ownerKey ? (users[ownerKey]?.color || '#6366f1') : '#8b5cf6';
                          return (
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                              style={{ backgroundColor: ownerColor }}>
                              {ownerName}
                            </span>
                          );
                        })()}
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Target month:</span>
                        <input
                          type="month"
                          value={txnTargetMonth}
                          onChange={e => updateMessageMonth(i, e.target.value)}
                          className={`text-xs border rounded px-2 py-0.5 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300 text-slate-700'}`}
                        />
                        {conflicts.size > 0 && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-amber-950/50 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                            {conflicts.size} possible duplicate{conflicts.size > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {groupTransactions(msg.transactions).map(([groupKey, group]) => (
                          <div key={groupKey}>
                            {/* Group header */}
                            <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border-l-4 ${groupColors[groupKey]} ${isDark ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-50 text-slate-500'}`}>
                              {group.label} ({group.txns.length})
                            </div>
                            <table className="w-full text-xs">
                              <tbody>
                                {group.txns.map(({ txn, idx: txnIdx }) => {
                                  const isEditing = editingTxn?.msgIdx === i && editingTxn?.txnIdx === txnIdx;
                                  const isSalary = txn.txnType === 'salary';
                                  const isDeduction = txn.txnType === 'deduction';
                                  const isConflict = conflicts.has(txnIdx);
                                  const isSkipped = txn.skipped;
                                  const rowBg = isSkipped
                                    ? (isDark ? 'bg-slate-900/50 opacity-40' : 'bg-slate-100/80 opacity-40')
                                    : isConflict
                                      ? (isDark ? 'bg-amber-950/40' : 'bg-amber-50')
                                      : isSalary
                                    ? (isDark ? 'bg-emerald-950/30' : 'bg-emerald-50/50')
                                    : isDeduction
                                      ? (isDark ? 'bg-amber-950/20' : 'bg-amber-50/50')
                                      : '';
                                  return (
                                    <tr key={txnIdx} className={`border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} group/row ${rowBg}`}>
                                      {/* Type badge / selector */}
                                      <td className="px-1.5 py-1.5 w-16">
                                        <select
                                          value={txn.txnType || 'expense'}
                                          onChange={e => updateTransaction(i, txnIdx, { txnType: e.target.value as ParsedTransaction['txnType'] })}
                                          className={`text-[9px] font-bold rounded px-1 py-0.5 border-none cursor-pointer ${
                                            isSalary ? 'bg-emerald-100 text-emerald-700'
                                            : isDeduction ? 'bg-amber-100 text-amber-700'
                                            : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
                                          }`}
                                        >
                                          <option value="expense">Expense</option>
                                          <option value="salary">Salary</option>
                                          <option value="deduction">Deduction</option>
                                        </select>
                                      </td>
                                      <td className="px-2 py-1.5 text-slate-500 w-20">
                                        {isEditing ? (
                                          <input type="date" value={txn.date}
                                            onChange={e => updateTransaction(i, txnIdx, { date: e.target.value })}
                                            className={`w-full text-xs border rounded px-1 py-0.5 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300'}`} />
                                        ) : txn.date}
                                      </td>
                                      <td className={`px-2 py-1.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                                        {isEditing ? (
                                          <input type="text" value={txn.description}
                                            onChange={e => updateTransaction(i, txnIdx, { description: e.target.value })}
                                            className={`w-full text-xs border rounded px-1 py-0.5 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300'}`} />
                                        ) : (
                                          <div>
                                            {txn.description}
                                            {txn.comment && <span className={`block text-[10px] italic ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{txn.comment}</span>}
                                          </div>
                                        )}
                                      </td>
                                      <td className={`px-2 py-1.5 text-right font-semibold w-20 ${(isSalary || isDeduction) ? 'text-emerald-500' : (isDark ? 'text-slate-200' : 'text-slate-800')}`}>
                                        {isEditing ? (
                                          <input type="number" step="0.01" value={Math.abs(txn.amount)}
                                            onChange={e => {
                                              const val = parseFloat(e.target.value) || 0;
                                              updateTransaction(i, txnIdx, { amount: (isSalary || isDeduction) ? -Math.abs(val) : Math.abs(val) });
                                            }}
                                            className={`w-full text-xs text-right border rounded px-1 py-0.5 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300'}`} />
                                        ) : (
                                          <>{(isSalary || isDeduction) ? '+' : ''}{sym}{Math.abs(txn.amount).toFixed(2)}</>
                                        )}
                                      </td>
                                      <td className="px-2 py-1.5 w-28">
                                        {isSalary ? (
                                          <span className={`text-[10px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Income</span>
                                        ) : isEditing ? (
                                          <select value={txn.categoryId}
                                            onChange={e => updateTransaction(i, txnIdx, { categoryId: e.target.value })}
                                            className={`w-full text-xs border rounded px-1 py-0.5 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300'}`}>
                                            {(['FIXED','VARIABLE','LIFESTYLE','SAVINGS','TRAVEL'] as const)
                                              .filter(g => categories.some(c => c.group === g))
                                              .map(g => (
                                                <optgroup key={g} label={g.charAt(0) + g.slice(1).toLowerCase()}>
                                                  {categories.filter(c => c.group === g).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                  ))}
                                                </optgroup>
                                              ))}
                                          </select>
                                        ) : (
                                          <span className="text-slate-500">{categories.find(c => c.id === txn.categoryId)?.name || txn.categoryId}</span>
                                        )}
                                        {isDeduction && (() => {
                                          // Expenses in the same import batch
                                          const batchExpenses = msg.transactions!
                                            .map((t, bIdx) => ({ t, bIdx }))
                                            .filter(({ t }) => t.txnType === 'expense' || (!t.txnType && t.amount > 0));
                                          // Also show existing entries in the target month
                                          const monthEntries = entries
                                            .filter(e => e.amount > 0 && e.entryType === 'single' && e.monthId === txnTargetMonth)
                                            .slice(0, 20);
                                          return (
                                            <select
                                              value={txn.linkedExpenseId || ''}
                                              onChange={e => updateTransaction(i, txnIdx, { linkedExpenseId: e.target.value || undefined })}
                                              title="Apply refund to this expense"
                                              className={`mt-1 w-full text-[9px] border rounded px-1 py-0.5 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-400' : 'bg-white border-slate-300 text-slate-500'}`}>
                                              <option value="">↩ apply to expense…</option>
                                              {batchExpenses.length > 0 && (
                                                <optgroup label="This import">
                                                  {batchExpenses.map(({ t: bt, bIdx }) => (
                                                    <option key={bIdx} value={String(bIdx)}>
                                                      {bt.description.slice(0, 24)} — {sym}{Math.abs(bt.amount).toFixed(2)}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              )}
                                              {monthEntries.length > 0 && (
                                                <optgroup label={`${txnTargetMonth} entries`}>
                                                  {monthEntries.map(e => (
                                                    <option key={e.id} value={e.id}>
                                                      {(e.description || categories.find(c => c.id === e.categoryId)?.name || '').slice(0, 24)} — {sym}{e.amount.toFixed(2)}
                                                    </option>
                                                  ))}
                                                </optgroup>
                                              )}
                                            </select>
                                          );
                                        })()}
                                      </td>
                                      <td className="px-1 py-1.5 w-20">
                                        {isEditing ? (
                                          <div className="flex gap-1">
                                            <input type="text" placeholder="Note" value={txn.comment || ''}
                                              onChange={e => updateTransaction(i, txnIdx, { comment: e.target.value })}
                                              className={`w-16 text-[10px] border rounded px-1 py-0.5 ${isDark ? 'bg-slate-700 border-slate-600 text-slate-200' : 'bg-white border-slate-300'}`} />
                                            <button onClick={() => setEditingTxn(null)}
                                              className="text-emerald-500 hover:text-emerald-600"><Check size={12} /></button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            {isConflict && !isSkipped && (
                                              <button
                                                onClick={() => updateTransaction(i, txnIdx, { skipped: true })}
                                                title="Skip — possible duplicate"
                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition ${isDark ? 'bg-amber-950/60 text-amber-400 hover:bg-amber-900/80' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}>
                                                Skip
                                              </button>
                                            )}
                                            {isSkipped && (
                                              <button
                                                onClick={() => updateTransaction(i, txnIdx, { skipped: false })}
                                                title="Include this transaction"
                                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded transition ${isDark ? 'bg-slate-700 text-slate-400 hover:bg-slate-600' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}>
                                                Keep
                                              </button>
                                            )}
                                            <button onClick={() => setEditingTxn({ msgIdx: i, txnIdx })}
                                              className={`opacity-0 group-hover/row:opacity-100 transition ${isDark ? 'text-slate-500 hover:text-slate-300' : 'text-slate-300 hover:text-slate-500'}`}>
                                              <Edit3 size={11} />
                                            </button>
                                            <button onClick={() => updateTransaction(i, txnIdx, { skipped: true })}
                                              title="Remove row"
                                              className={`opacity-0 group-hover/row:opacity-100 transition ${isDark ? 'text-slate-600 hover:text-red-400' : 'text-slate-300 hover:text-red-400'}`}>
                                              <X size={11} />
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ))}
                      </div>
                      {(onAddEntries || onAddIncome) && (() => {
                        const txns = msg.transactions!;
                        const activeTxns = txns.filter(t => !t.skipped);
                        const expCount = activeTxns.filter(t => t.txnType === 'expense' || (!t.txnType && t.amount > 0)).length;
                        const salCount = activeTxns.filter(t => t.txnType === 'salary').length;
                        const dedCount = activeTxns.filter(t => t.txnType === 'deduction').length;
                        const skipCount = txns.filter(t => t.skipped).length;
                        const parts = [];
                        if (expCount > 0) parts.push(`${expCount} expenses`);
                        if (salCount > 0) parts.push(`${salCount} salary`);
                        if (dedCount > 0) parts.push(`${dedCount} deductions`);
                        if (skipCount > 0) parts.push(`${skipCount} skipped`);
                        return (
                          <div className={`px-3 py-2 border-t ${isDark ? 'border-slate-700 bg-slate-800/50' : 'border-slate-200 bg-slate-50'} flex items-center justify-between`}>
                            <span className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                              {parts.join(' · ')}
                            </span>
                            <button
                              onClick={() => handleImportTransactions(txns, msg.transactionOwner || (currentUser === 'user_1' ? 'USER_1' : 'USER_2'), txnTargetMonth)}
                              className="text-xs font-bold bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 transition">
                              Import All
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                    );
                  })()}

                  {/* Insights */}
                  {msg.insights && msg.insights.length > 0 && (
                    <div className="space-y-2">
                      {msg.insights.map((ins, j) => (
                        <div key={j} className={`flex gap-3 border rounded-xl p-3 ${insightBg(ins.type)}`}>
                          {insightIcon(ins.type)}
                          <div>
                            <p className={`text-sm font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{ins.title}</p>
                            <p className={`text-xs mt-0.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{ins.body}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pending clarification questions from AI */}
                  {msg.pendingQuestions && msg.pendingQuestions.length > 0 && (
                    <div className={`border rounded-xl p-3 space-y-3 ${isDark ? 'bg-indigo-950/40 border-indigo-800/50' : 'bg-indigo-50 border-indigo-200'}`}>
                      <p className={`text-xs font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Clarification needed:</p>
                      {msg.pendingQuestions.map((q, qi) => (
                        <div key={qi} className="space-y-1.5">
                          {q.transactionDescription && (
                            <p className={`text-[10px] font-semibold uppercase tracking-wider ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{q.transactionDescription}</p>
                          )}
                          <p className={`text-sm ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{q.question}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {q.options.map((opt, oi) => (
                              <button key={oi}
                                onClick={() => {
                                  setInput(opt);
                                }}
                                className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition ${isDark ? 'border-indigo-700 text-indigo-300 hover:bg-indigo-900' : 'border-indigo-300 text-indigo-700 hover:bg-indigo-100'}`}>
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex justify-start">
              <div className={`px-4 py-2.5 rounded-2xl rounded-bl-sm ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                <Loader size={14} className="animate-spin text-indigo-500" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Pending file preview */}
        {pendingFile && (
          <div className={`px-3 py-2 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
            <div className="flex items-center gap-2 flex-wrap">
              <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold ${
                pendingFile.mimeType === 'application/pdf' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {pendingFile.mimeType === 'application/pdf' ? <FileText size={12} /> : <Image size={12} />}
                {pendingFile.file.name}
                <button onClick={() => { setPendingFile(null); setShowOwnerPicker(false); setPendingOwner(null); }} className="ml-1 hover:opacity-70"><X size={12} /></button>
              </div>
              {showOwnerPicker && (
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold uppercase ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Owner:</span>
                  {[
                    { key: 'SHARED' as AccountType, label: 'Shared' },
                    { key: 'USER_1' as AccountType, label: users.user_1?.name || 'User 1' },
                    { key: 'USER_2' as AccountType, label: users.user_2?.name || 'User 2' },
                  ].map(opt => (
                    <button key={opt.key} onClick={() => setPendingOwner(opt.key)}
                      className={`px-2 py-1 rounded-md text-[10px] font-bold transition ${
                        pendingOwner === opt.key ? 'bg-indigo-600 text-white'
                          : isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}>{opt.label}</button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Input bar */}
        <div className={`p-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-100'} flex gap-2`}>
          <div className="relative" ref={attachMenuRef}>
            <button onClick={() => setShowAttachMenu(!showAttachMenu)}
              className={`p-2.5 rounded-xl transition ${showAttachMenu ? 'bg-indigo-100 text-indigo-600'
                : isDark ? 'bg-slate-800 text-slate-400 hover:text-slate-200' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}>
              <Plus size={16} />
            </button>
            {showAttachMenu && (
              <div className={`absolute bottom-full left-0 mb-2 w-48 rounded-xl border shadow-xl p-1 z-50 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
                <label className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <Image size={16} className="text-blue-500" /> Receipt (Image)
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                </label>
                <label className={`w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-2 cursor-pointer transition ${isDark ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <FileText size={16} className="text-red-500" /> Bank Statement (PDF)
                  <input type="file" accept="application/pdf" className="hidden" onChange={e => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
                </label>
              </div>
            )}
          </div>
          <input
            className={`flex-1 border rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-200 transition ${inputBg}`}
            placeholder={pendingFile ? 'Add a message or press send...' : 'Ask about your finances...'}
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            disabled={loading}
          />
          <button onClick={sendMessage} disabled={loading || (!input.trim() && !pendingFile)}
            className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
