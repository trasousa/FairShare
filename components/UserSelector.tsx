import React, { useState, useEffect } from 'react';
import { User, CurrentUserId } from '../types';
import { getInstance } from '../services/storage';

interface UserSelectorProps {
  instanceId: string;
  onSelect: (userId: CurrentUserId) => void;
  onBack: () => void;
}

export const UserSelector: React.FC<UserSelectorProps> = ({ instanceId, onSelect, onBack }) => {
  const [users, setUsers] = useState<Record<string, User> | null>(null);
  const [instanceName, setInstanceName] = useState('');

  useEffect(() => {
    const load = async () => {
      const data = await getInstance(instanceId);
      if (data) {
        setUsers(data.users);
        setInstanceName(data.name);
      }
    };
    load();
  }, [instanceId]);

  if (!users || !users.user_1 || !users.user_2) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg animate-pulse" />
      </div>
    );
  }

  const userOptions: { id: CurrentUserId; user: User }[] = [
    { id: 'user_1', user: users.user_1 },
    { id: 'user_2', user: users.user_2 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center font-bold text-white text-2xl mx-auto shadow-lg shadow-indigo-500/30">
            FS
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{instanceName}</h1>
            <p className="text-sm text-slate-500 mt-1">Who are you?</p>
          </div>
        </div>

        {/* User buttons */}
        <div className="space-y-3">
          {userOptions.map(({ id, user }) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className="w-full flex items-center gap-4 p-5 bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10 transition-all active:scale-[0.98] group"
            >
              {user.avatar ? (
                <img src={user.avatar} className="w-14 h-14 rounded-xl object-cover shrink-0" alt={user.name} />
              ) : (
                <div
                  className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ backgroundColor: (user.color || '#6366f1') + '20', color: user.color || '#6366f1' }}
                >
                  {user.name[0]}
                </div>
              )}
              <div className="text-left flex-1">
                <p className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition-colors">{user.name}</p>
                <p className="text-xs text-slate-400">Continue as {user.name}</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 group-hover:text-indigo-600 transition-colors">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Back link */}
        <button
          onClick={onBack}
          className="w-full text-center text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
        >
          Back to instances
        </button>
      </div>
    </div>
  );
};
