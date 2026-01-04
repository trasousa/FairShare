import React, { useState, useMemo } from 'react';
import { Trip, ExpenseEntry, CurrencyCode } from '../types';
import { formatCurrency } from '../services/financeService';
import { Plane, MapPin, Plus, Calendar, AlertCircle } from 'lucide-react';

interface TravelDashboardProps {
  trips: Trip[];
  entries: ExpenseEntry[];
  currency: CurrencyCode;
  onAddTrip: (trip: Omit<Trip, 'id'>) => void;
}

export const TravelDashboard: React.FC<TravelDashboardProps> = ({ trips, entries, currency, onAddTrip }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTrip, setNewTrip] = useState<Partial<Trip>>({ status: 'PLANNED' });
  const [selectedYear, setSelectedYear] = useState('All'); // State for selected year

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    trips.forEach(trip => years.add(new Date(trip.startDate).getFullYear().toString()));
    return ['All', ...Array.from(years).sort((a, b) => parseInt(b) - parseInt(a))];
  }, [trips]);

  const filteredTrips = useMemo(() => {
    if (selectedYear === 'All') {
      return trips;
    }
    return trips.filter(trip => new Date(trip.startDate).getFullYear().toString() === selectedYear);
  }, [trips, selectedYear]);


  const getTripExpenses = (tripId: string) => {
      return entries.filter(e => e.tripId === tripId);
  };

  const getTripTotal = (tripId: string) => {
      return getTripExpenses(tripId).reduce((sum, e) => sum + e.amount, 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(newTrip.name && newTrip.destination && newTrip.startDate && newTrip.budget) {
          onAddTrip(newTrip as Omit<Trip, 'id'>);
          setIsAdding(false);
          setNewTrip({ status: 'PLANNED' });
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Plane className="text-indigo-600" /> Travel & Adventures
            </h2>
            <div className="flex items-center gap-4">
                <select 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                    {availableYears.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                <button 
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition"
                >
                    <Plus size={16} /> Plan New Trip
                </button>
            </div>
        </div>

        {isAdding && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                <h3 className="font-bold text-slate-700 mb-4">New Adventure</h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Trip Name</label>
                        <input required type="text" placeholder="e.g. Eurotrip 2025" className="w-full border border-slate-300 rounded-lg p-2 text-sm" 
                            value={newTrip.name || ''} onChange={e => setNewTrip({...newTrip, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Destination</label>
                        <input required type="text" placeholder="e.g. Paris, France" className="w-full border border-slate-300 rounded-lg p-2 text-sm" 
                            value={newTrip.destination || ''} onChange={e => setNewTrip({...newTrip, destination: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Total Budget</label>
                        <input required type="number" placeholder="0.00" className="w-full border border-slate-300 rounded-lg p-2 text-sm" 
                            value={newTrip.budget || ''} onChange={e => setNewTrip({...newTrip, budget: parseFloat(e.target.value)})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">Start Date</label>
                        <input required type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm" 
                            value={newTrip.startDate || ''} onChange={e => setNewTrip({...newTrip, startDate: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">End Date (Optional)</label>
                        <input type="date" className="w-full border border-slate-300 rounded-lg p-2 text-sm" 
                            value={newTrip.endDate || ''} onChange={e => setNewTrip({...newTrip, endDate: e.target.value})}
                        />
                    </div>
                    <div className="col-span-1 md:col-span-2 flex gap-3 pt-2">
                        <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Create Trip</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="bg-white border border-slate-300 text-slate-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                    </div>
                </form>
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map(trip => {
                const totalSpent = getTripTotal(trip.id);
                const progress = Math.min((totalSpent / trip.budget) * 100, 100);
                const expenses = getTripExpenses(trip.id);
                const isOver = totalSpent > trip.budget;

                return (
                    <div key={trip.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition">
                        <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-800">{trip.name}</h3>
                                <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                                    <MapPin size={12}/> {trip.destination}
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${trip.status === 'COMPLETED' ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                                {trip.status}
                            </span>
                        </div>
                        
                        <div className="p-5 flex-1 space-y-4">
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-slate-500">Budget Used</span>
                                    <span className={`font-bold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>{formatCurrency(totalSpent, currency)} / {formatCurrency(trip.budget, currency)}</span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div className={`h-full ${isOver ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${progress}%` }}></div>
                                </div>
                                {isOver && <div className="flex items-center gap-1 text-xs text-red-500 mt-1"><AlertCircle size={10}/> Over Budget</div>}
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Breakdown</p>
                                {['FLIGHT', 'ACCOMMODATION', 'FOOD', 'ACTIVITY'].map(cat => {
                                    const catTotal = expenses.filter(e => e.tripCategory === cat).reduce((s, e) => s + e.amount, 0);
                                    if(catTotal === 0) return null;
                                    return (
                                        <div key={cat} className="flex justify-between text-xs text-slate-600 border-b border-slate-50 pb-1 last:border-0">
                                            <span className="capitalize">{cat.toLowerCase()}</span>
                                            <span className="font-medium">{formatCurrency(catTotal, currency)}</span>
                                        </div>
                                    )
                                })}
                                {expenses.length === 0 && <p className="text-xs text-slate-400 italic">No expenses recorded yet.</p>}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-3 text-center border-t border-slate-100">
                             <p className="text-xs text-slate-400">
                                 <Calendar size={10} className="inline mr-1"/>
                                 {new Date(trip.startDate).toLocaleDateString()}
                                 {trip.endDate ? ` - ${new Date(trip.endDate).toLocaleDateString()}` : ''}
                             </p>
                        </div>
                    </div>
                );
            })}
            <div className="bg-indigo-900 text-white rounded-xl shadow-lg p-6 flex flex-col justify-center">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-4 text-2xl">✈️</div>
                <h3 className="text-lg font-bold mb-2">Travel Smart</h3>
                <p className="text-indigo-200 text-sm leading-relaxed">
                    Create a trip to track expenses separate from your monthly budget. Assign expenses to categories like Flight or Food to see exactly where your vacation money goes.
                </p>
            </div>
        </div>
    </div>
  );
};