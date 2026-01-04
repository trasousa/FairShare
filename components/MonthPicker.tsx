import React from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonthId: string; // "YYYY-MM"
  onSelect: (monthId: string) => void;
}

export const MonthPicker: React.FC<MonthPickerProps> = ({ isOpen, onClose, currentMonthId, onSelect }) => {
  const [year, monthStr] = (currentMonthId || new Date().toISOString().slice(0, 7)).split('-');
  const [selectedYear, setSelectedYear] = React.useState(parseInt(year) || new Date().getFullYear());

  if (!isOpen) return null;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleMonthClick = (index: number) => {
    const newMonth = String(index + 1).padStart(2, '0');
    onSelect(`${selectedYear}-${newMonth}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800">Select Period</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {/* Year Selector */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => setSelectedYear(y => y - 1)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="text-xl font-bold text-slate-800">{selectedYear}</span>
            <button 
              onClick={() => setSelectedYear(y => y + 1)}
              className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-3">
            {months.map((m, idx) => {
              const isSelected = selectedYear === parseInt(year) && (idx + 1) === parseInt(monthStr);
              return (
                <button
                  key={m}
                  onClick={() => handleMonthClick(idx)}
                  className={`py-2 px-1 text-sm rounded-lg font-medium transition ${
                    isSelected 
                      ? 'bg-indigo-600 text-white shadow-md' 
                      : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  {m.substring(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
        
        <div className="p-4 bg-slate-50 text-center">
            <button onClick={() => { 
                const now = new Date();
                onSelect(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
                onClose();
            }} className="text-sm text-indigo-600 font-medium hover:underline">
                Jump to Current Month
            </button>
        </div>
      </div>
    </div>
  );
};