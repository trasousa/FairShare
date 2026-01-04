import React, { useEffect, useState, useRef } from 'react';
import { getInstances, createDemoInstance, deleteInstance, saveInstance } from '../services/storage';
import { Plus, Trash2, ArrowRight, Wallet, Layout, AlertTriangle, Upload, ServerCrash, RefreshCcw, FileJson } from 'lucide-react';
import { AppInstance } from '../types';

interface LandingPageProps {
  onSelectInstance: (id: string) => void;
  onCreateNew: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectInstance, onCreateNew }) => {
  const [instances, setInstances] = useState<{ id: string, name: string, lastAccessed: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteCandidate, setDeleteCandidate] = useState<string | null>(null);
  const [backendError, setBackendError] = useState(false);
  const [actionError, setActionError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadInstances();
  }, []);

  const loadInstances = async () => {
    setLoading(true);
    setBackendError(false);
    try {
        const list = await getInstances();
        setInstances(list);
    } catch (e) {
        console.error(e);
        setBackendError(true);
    }
    setLoading(false);
  };

  const handleCreateDemo = async () => {
    setActionError('');
    try {
        await createDemoInstance();
        const list = await getInstances();
        setInstances(list);
        onSelectInstance('demo');
    } catch (e) {
        console.error(e);
        setActionError('Failed to launch demo. Is the backend running?');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const content = e.target?.result as string;
              const data = JSON.parse(content) as AppInstance;
              
              // Basic validation
              if (!data.id || !data.users || !data.data) {
                  throw new Error("Invalid file format");
              }

              // Ensure ID is unique or allow overwrite? For now, we save as is.
              // If ID conflicts, it updates. 
              await saveInstance(data);
              await loadInstances();
              setActionError('');
          } catch (err) {
              console.error(err);
              setActionError('Failed to import file. Invalid JSON format.');
          }
      };
      reader.readAsText(file);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmDelete = async () => {
      if (deleteCandidate) {
          try {
            await deleteInstance(deleteCandidate);
            setDeleteCandidate(null);
            loadInstances();
          } catch (e) {
              setActionError('Failed to delete instance.');
          }
      }
  };

  if (loading) {
      return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading Database...</div>;
  }

  if (backendError) {
      return (
          <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-red-100">
                  <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                      <ServerCrash size={32} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-800 mb-2">Backend Disconnected</h2>
                  <p className="text-slate-500 mb-6">
                      Cannot connect to the database server. 
                      <br/><br/>
                      <span className="text-xs bg-slate-100 p-2 rounded block font-mono">
                          Error: Network request failed
                      </span>
                  </p>
                  <div className="text-sm text-left bg-blue-50 p-4 rounded-xl text-blue-800 mb-6">
                      <strong>How to fix:</strong>
                      <ul className="list-disc list-inside mt-2 space-y-1">
                          <li>Ensure <code>npm start</code> is running in a terminal.</li>
                          <li>If using Docker, check container logs.</li>
                          <li>Refresh this page after starting the server.</li>
                      </ul>
                  </div>
                  <button 
                    onClick={loadInstances}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800"
                  >
                      <RefreshCcw size={18}/> Retry Connection
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-dvh bg-slate-900 flex flex-col items-center p-6 sm:p-8 md:p-12">
        <div className="max-w-4xl w-full">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-2xl mb-6 shadow-lg shadow-indigo-500/30 transform rotate-3">
                    <span className="text-4xl font-bold text-white">FS</span>
                </div>
                <h1 className="text-5xl font-extrabold text-white mb-4 tracking-tight">FairShare</h1>
                <p className="text-xl text-slate-400 max-w-2xl mx-auto font-light">
                    The smart finance tracker for couples. Balance separate incomes, share expenses fairly, and build wealth together.
                </p>
            </div>
            
            {actionError && (
                <div className="max-w-md mx-auto mb-6 bg-red-900/50 text-red-200 px-4 py-3 rounded-xl flex items-center gap-3 border border-red-800">
                    <AlertTriangle size={18} /> {actionError}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Instance List */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-3xl shadow-xl border border-slate-700 p-8 flex flex-col">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
                        <Wallet className="text-indigo-400"/> Your Trackers
                    </h2>
                    
                    <div className="space-y-4 flex-1">
                        {instances.map(inst => (
                            <div 
                                key={inst.id}
                                onClick={() => onSelectInstance(inst.id)}
                                className="group flex items-center justify-between p-4 rounded-2xl border border-slate-700 bg-slate-800 hover:border-indigo-500/50 hover:bg-slate-700 transition cursor-pointer shadow-sm"
                            >
                                <div>
                                    <h3 className="font-bold text-slate-200 group-hover:text-white transition">{inst.name}</h3>
                                    <p className="text-xs text-slate-500 font-medium group-hover:text-slate-400">Last accessed: {new Date(inst.lastAccessed).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-700 p-2 rounded-full group-hover:bg-indigo-500/20 transition">
                                        <ArrowRight size={16} className="text-slate-400 group-hover:text-indigo-400 transition" />
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setDeleteCandidate(inst.id); }}
                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-900/20 rounded-full transition"
                                        title="Delete Instance"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                        
                        {instances.length === 0 && (
                            <div className="text-center py-12 text-slate-500 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700 h-full flex flex-col items-center justify-center">
                                <p>No active trackers found.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-6">
                    <div 
                        onClick={onCreateNew}
                        className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-slate-700 cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition group flex-1"
                    >
                        <div className="w-14 h-14 bg-emerald-900/30 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-900/50 transition-colors">
                            <Plus size={28} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Create New Tracker</h3>
                        <p className="text-slate-400 leading-relaxed">Start fresh with a new database. Set up generic profiles or customize names, currency, and split rules.</p>
                    </div>

                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="bg-slate-800/50 backdrop-blur-sm p-8 rounded-3xl shadow-xl border border-slate-700 cursor-pointer hover:bg-slate-800 hover:border-slate-600 transition group flex-1"
                    >
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                            accept=".json" 
                            className="hidden" 
                        />
                        <div className="w-14 h-14 bg-blue-900/30 text-blue-400 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-900/50 transition-colors">
                            <Upload size={28} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Upload Backup</h3>
                        <p className="text-slate-400 leading-relaxed">Restore a tracker from a <code>.json</code> backup file to pick up exactly where you left off.</p>
                    </div>

                    <div className="text-center mt-2">
                        <button 
                            onClick={handleCreateDemo}
                            className="text-slate-500 hover:text-indigo-400 text-sm font-semibold flex items-center justify-center gap-2 mx-auto transition"
                        >
                            <Layout size={16} /> Launch Demo Instance
                        </button>
                    </div>
                </div>
            </div>
            
            <div className="mt-16 text-center text-xs font-medium text-slate-600">
                Data is stored locally in <code>./data/fairshare.db</code>
            </div>
        </div>

        {/* Delete Confirmation Modal */}
        {deleteCandidate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200 border border-slate-700">
                    <div className="w-12 h-12 bg-red-900/30 text-red-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <AlertTriangle size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-center text-white mb-2">Delete Tracker?</h3>
                    <p className="text-center text-slate-400 mb-6">
                        This will permanently erase all data for this instance. This action cannot be undone.
                    </p>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setDeleteCandidate(null)}
                            className="flex-1 py-2.5 rounded-xl font-bold text-slate-300 bg-slate-700 hover:bg-slate-600 transition"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmDelete}
                            className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-lg shadow-red-900/20"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};