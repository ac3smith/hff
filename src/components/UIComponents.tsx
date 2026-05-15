import React from 'react';
import { LucideIcon, CheckCircle, Clock, Lock, RefreshCw } from 'lucide-react';

// 1. Navigation Button (Desktop)
export function NavButton({ icon: Icon, label, active, onClick, className = "" }: { icon: any, label: string, active: boolean, onClick: () => void, className?: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-[#FFB81C] text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'} ${className}`}>
      <Icon className="w-4 h-4" />{label}
    </button>
  );
}

// 2. Navigation Button (Mobile)
export function MobileNavButton({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center min-w-[70px] py-2 space-y-1 flex-shrink-0 ${active ? 'text-[#FFB81C]' : 'text-slate-500'}`}>
      <Icon className={`w-6 h-6 ${active ? 'fill-[#FFB81C]/20' : ''}`} />
      <span className="text-[10px] font-black uppercase tracking-tighter truncate w-full text-center">{label}</span>
    </button>
  );
}

// 3. Pick Progress Bar
export function ProgressBar({ percentage, current, total }: { percentage: number, current: number, total: number }) {
  return (
    <div className="flex-1 max-w-sm">
      <div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest">
        <span>Pick Progress</span>
        <span className={percentage === 100 ? 'text-green-600' : ''}>{current}/{total}</span>
      </div>
      <div className="bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-white shadow-inner">
        <div className={`h-full transition-all duration-1000 ease-out ${percentage === 100 ? 'bg-green-500' : 'bg-[#FFB81C]'}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );
}

// 4. Auto-Save Status Indicator
export function AutoSaveIndicator({ isSaving, hasSaved, count }: { isSaving: boolean, hasSaved: boolean, count: number }) {
  if (count === 0) return null;
  return (
    <div className="text-[10px] font-black uppercase tracking-widest min-w-[120px] flex justify-center items-center h-8 px-4 rounded-full bg-slate-50 border border-slate-100">
      {isSaving ? (
        <span className="text-slate-400 flex items-center gap-2">
          <RefreshCw className="w-3 h-3 animate-spin" /> Syncing...
        </span>
      ) : hasSaved ? (
        <span className="text-green-600 flex items-center gap-1.5 animate-in zoom-in-75 duration-300">
          <CheckCircle className="w-4 h-4" /> Saved
        </span>
      ) : null}
    </div>
  );
}

// 5. Week Locked Banner
export function LockBanner({ week }: { week: number }) {
  return (
    <div className="bg-red-50 border-l-8 border-red-500 p-5 rounded-2xl flex gap-4 shadow-xl mb-6">
      <Lock className="w-8 h-8 text-red-500 flex-shrink-0" />
      <div>
        <p className="text-lg font-black italic uppercase text-red-800">Week {week} is Locked</p>
        <p className="text-xs font-bold text-red-600 uppercase tracking-widest">Submissions are no longer permitted.</p>
      </div>
    </div>
  );
}

// 6. Week/Schedule Selector
export function WeekSelector({ week, setWeek, MOCK_WEEKS }: { week: number, setWeek: (w: number) => void, MOCK_WEEKS: number[] }) {
  return (
    <div className="w-full md:w-auto">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule</label>
      <select 
        value={week} 
        onChange={(e) => setWeek(Number(e.target.value))} 
        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-black italic uppercase text-xl tracking-tighter outline-none focus:ring-4 focus:ring-[#FFB81C]/20 transition-all cursor-pointer"
      >
        {MOCK_WEEKS.map(w => <option key={w} value={w}>Week {w}</option>)}
      </select>
    </div>
  );
}