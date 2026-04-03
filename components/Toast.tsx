import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export const useToast = () => useContext(ToastContext);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  const remove = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const icon = (type: ToastType) => {
    if (type === 'success') return <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />;
    if (type === 'error') return <AlertTriangle size={16} className="text-red-400 shrink-0" />;
    return <Info size={16} className="text-blue-400 shrink-0" />;
  };

  const bg = (type: ToastType) => {
    if (type === 'success') return 'bg-slate-900 border-emerald-800/40';
    if (type === 'error') return 'bg-slate-900 border-red-800/40';
    return 'bg-slate-900 border-blue-800/40';
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-24 right-4 md:bottom-6 z-[300] flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-white text-sm font-medium animate-in slide-in-from-right-4 fade-in pointer-events-auto max-w-xs ${bg(t.type)}`}
          >
            {icon(t.type)}
            <span className="flex-1 text-slate-200">{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-slate-500 hover:text-slate-300 transition ml-1">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
