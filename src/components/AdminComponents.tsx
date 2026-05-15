import React from 'react';
import { 
  PieChart, ListChecks, Settings, Clock, CalendarDays, 
  RefreshCw, ShieldAlert, CheckCircle, AlertTriangle, User, KeyRound 
} from 'lucide-react';
import { formatFullName } from '../utils/helpers';

export function AdminNavButton({ icon: Icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-slate-900 text-[#FFB81C] shadow-lg scale-105 z-10' : 'text-slate-500 hover:bg-slate-50'}`}>
      <Icon className="w-5 h-5" />{label}
    </button>
  );
}

export function AdminLifecycleCard({ week, status, onLock, onOpen }) {
  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" /> Week {week} Lifecycle
      </h3>
      <div className={`p-4 rounded-xl flex items-center justify-between border-2 ${status === 'open' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
        <span className="font-black uppercase italic text-sm">Status: {status?.toUpperCase()}</span>
        <div className="flex gap-2">
          {status === 'open' ? (
            <button onClick={onLock} className="px-4 py-2 bg-red-600 text-white rounded-lg font-black text-xs uppercase">Lock Picks</button>
          ) : (
            <button onClick={onOpen} className="px-4 py-2 bg-slate-900 text-[#FFB81C] rounded-lg font-black text-xs uppercase">Unlock Week</button>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminWeekCard({ week, onChange, MOCK_WEEKS }) {
  return (
    <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 shadow-sm">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-4 flex items-center gap-2">
        <CalendarDays className="w-4 h-4" /> Schedule Control
      </h3>
      <select value={week} onChange={onChange} className="w-full bg-slate-100 rounded-xl p-3 font-black text-lg uppercase outline-none cursor-pointer border-2 border-transparent focus:border-[#FFB81C]">
        {MOCK_WEEKS.map(w => <option key={w} value={w}>Week {w}</option>)}
      </select>
    </div>
  );
}

export function StatusColumnWrapper({ title, count, users, color, icon: Icon, onOverride }) {
  const themes = {
    blue: 'border-blue-200 bg-blue-50/50 text-blue-700',
    green: 'border-green-200 bg-green-50/50 text-green-700',
    slate: 'border-slate-200 bg-slate-50/50 text-slate-700'
  };
  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col h-[350px]`}>
      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-slate-400" />
          <h3 className="font-black uppercase text-xs text-slate-700">{title}</h3>
        </div>
        <span className="font-black text-xs px-2 py-0.5 bg-slate-200 rounded-full text-slate-700">{count}</span>
      </div>
      <div className="p-3 overflow-y-auto space-y-2 flex-1">
        {users.length === 0 ? (
          <div className="text-center text-xs text-slate-300 font-bold py-8 uppercase tracking-widest">All Clear</div>
        ) : (
          users.map(u => (
            <div key={u.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group hover:border-slate-300 transition-all">
              <span className="font-bold text-xs truncate max-w-[150px]">{formatFullName(u)}</span>
              <button onClick={() => onOverride(u.id)} className="px-2 py-1 bg-slate-900 text-[#FFB81C] rounded-md font-black text-[9px] uppercase shadow-sm opacity-0 group-hover:opacity-100 transition-all">Override</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}