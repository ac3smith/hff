import React, { useState, useEffect } from 'react';
import { Lock, Clock, CheckCircle } from 'lucide-react';
import { TEAM_COLORS } from '../constants';

// 1. Individual Team Selection Button
export function TeamButton({ team, name, selected, isLocked, score, onClick }) {
  const teamColor = TEAM_COLORS[team] || '#1e293b';
  return (
    <button 
      onClick={onClick} 
      disabled={isLocked} 
      className={`flex-1 w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300 ${
        selected ? 'border-[#FFB81C] bg-[#FFB81C]/5 shadow-lg scale-[1.02]' : `border-transparent ${isLocked ? 'bg-slate-50' : 'bg-slate-50 hover:bg-slate-100'}`
      } text-slate-700`}
    >
      <div className="flex items-center gap-3 text-left">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg" 
          style={{ backgroundColor: isLocked && !selected ? '#cbd5e1' : teamColor }}
        >
          {team}
        </div>
        <div>
          <div className="font-black uppercase italic text-base sm:text-lg leading-tight text-slate-900">{name}</div>
          <div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{team}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {score !== undefined && score !== null && <div className="font-black text-xl text-slate-900 mr-2">{score}</div>}
        {selected && <CheckCircle className="w-6 h-6 text-[#FFB81C]" strokeWidth={3} />}
      </div>
    </button>
  );
}

// 2. Confidence Pool Game Card with Dynamic Filtering Dropdown
export function GameCard({ game, selectedPick, selectedRank, totalGames, usedRanks, isLocked, onPick, onRankChange }) {
  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col lg:flex-row ${selectedPick && selectedRank && !isLocked ? 'border-slate-900 shadow-md scale-[1.005]' : 'border-slate-100'}`}>
      <div className={`p-4 lg:w-48 flex flex-row lg:justify-center items-center lg:items-start border-b lg:border-b-0 lg:border-r-2 border-slate-50 ${isLocked ? 'bg-slate-100' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
          {isLocked ? <Lock className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-[#FFB81C]" />}
          {game.date}
        </div>
      </div>
      <div className={`p-4 flex-1 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full ${isLocked ? 'opacity-75' : ''}`}>
        <TeamButton team={game.away} name={game.awayName} selected={selectedPick === game.away} isLocked={isLocked} score={game.awayScore} onClick={() => onPick(game.away)} />
        <div className="text-sm font-black text-slate-200 uppercase italic tracking-widest hidden sm:block">VS</div>
        <TeamButton team={game.home} name={game.homeName} selected={selectedPick === game.home} isLocked={isLocked} score={game.homeScore} onClick={() => onPick(game.home)} />
      </div>
      <div className="p-4 lg:w-64 flex flex-row lg:flex-col justify-between items-center lg:justify-center border-t lg:border-t-0 lg:border-l-2 border-slate-50 bg-slate-50/50">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest lg:mb-2">Confidence Value</label>
        <select 
          value={selectedRank || ''} 
          onChange={(e) => onRankChange(e.target.value)} 
          disabled={isLocked} 
          className="bg-white border-2 border-slate-200 font-black italic rounded-xl w-36 px-3 py-2 outline-none focus:border-[#FFB81C] cursor-pointer"
        >
          <option value="">-- CHOOSE --</option>
          {Array.from({ length: totalGames }, (_, i) => i + 1).map(num => {
            const isUsed = usedRanks.includes(num) && num !== parseInt(selectedRank);
            if (isUsed) return null; 
            return <option key={num} value={num}>{num} PTS</option>;
          })}
        </select>
      </div>
    </div>
  );
}

// 3. Survivor (Knockout) Matchup Choice Component
export function KnockoutGameCard({ game, selectedTeam, usedTeams, onPick, isLocked }) {
  const isAwayUsed = usedTeams.includes(game.away) && selectedTeam !== game.away;
  const isHomeUsed = usedTeams.includes(game.home) && selectedTeam !== game.home;
  
  const Btn = ({ t, tn, used }) => (
    <button 
      onClick={() => onPick(t)} 
      disabled={used || isLocked} 
      className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border-2 transition-all ${
        selectedTeam === t ? 'bg-slate-900 border-[#FFB81C] text-[#FFB81C] scale-[1.02] shadow-xl' : 
        used ? 'opacity-20 grayscale bg-slate-50 cursor-not-allowed border-transparent' : 'bg-slate-50 border-transparent hover:bg-slate-100'
      } text-slate-800`}
    >
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white" style={{ backgroundColor: used ? '#cbd5e1' : TEAM_COLORS[t] }}>{t}</div>
        <span className="font-black italic uppercase text-lg">{tn}</span>
      </div>
      {selectedTeam === t && <CheckCircle className="w-6 h-6" />}
    </button>
  );

  return (
    <div className="bg-white rounded-3xl border-2 p-5 shadow-sm max-w-xl mx-auto border-slate-100">
      <div className="flex flex-col gap-2">
        <Btn t={game.away} tn={game.awayName} used={isAwayUsed} />
        <div className="text-center text-[10px] font-black text-slate-300 italic py-1">VS</div>
        <Btn t={game.home} tn={game.homeName} used={isHomeUsed} />
      </div>
    </div>
  );
}

// 4. Live Score Ticker Panel
export function LiveScoreTicker({ games }) {
  if (!games || games.length === 0) return null;
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 mb-4 scrollbar-hide snap-x relative z-10 w-full">
      {games.map(g => (
        <div key={g.id} className="min-w-[180px] flex-shrink-0 bg-slate-900 border-2 border-slate-700 rounded-2xl p-4 snap-start shadow-xl">
          <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-400 mb-3">
            <span>{g.time}</span>
            <span className={g.status === 'final' ? 'text-[#FFB81C]' : ''}>{g.status.toUpperCase()}</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center font-black text-white text-xl">
              <span>{g.away}</span><span>{g.awayScore ?? '-'}</span>
            </div>
            <div className="flex justify-between items-center font-black text-white text-xl">
              <span>{g.home}</span><span>{g.homeScore ?? '-'}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// 5. Total Monday/Last Game Points Tiebreaker Card
export function TiebreakerCard({ val, game, isLocked, onSave }) {
  const [localVal, setLocalVal] = useState(val);
  useEffect(() => setLocalVal(val), [val]);
  const isFilled = localVal.toString().trim() !== '';

  return (
    <div className={`rounded-3xl border-4 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-500 ${
      isFilled ? 'border-slate-900 bg-white shadow-2xl scale-[1.01]' : 'border-slate-100 bg-white hover:border-slate-200'
    }`}>
      <div className="flex items-center gap-5">
        <div className={`p-4 rounded-2xl transition-all shadow-xl ${isFilled ? 'bg-slate-900 text-[#FFB81C]' : 'bg-slate-50 text-slate-300'}`}>
          <Clock className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Tiebreaker</h3>
          <p className="text-[11px] text-slate-400 uppercase font-black tracking-widest">{game?.awayName} @ {game?.homeName} Combined Game Points</p>
        </div>
      </div>
      <input 
        type="number" 
        value={localVal} 
        onChange={(e) => setLocalVal(e.target.value)} 
        onBlur={() => onSave(localVal)} 
        disabled={isLocked} 
        placeholder="PTS" 
        className={`w-full sm:w-32 h-16 border-4 rounded-2xl px-4 py-2 text-center font-black italic text-3xl outline-none transition-all ${
          isFilled ? 'bg-slate-900 border-[#FFB81C] text-[#FFB81C]' : 'bg-slate-50 border-slate-100 text-slate-300'
        }`} 
      />
    </div>
  );
}