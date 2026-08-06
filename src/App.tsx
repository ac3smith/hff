import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, CalendarDays, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Clock, Target, 
  Printer, X, XCircle, Users, Lock, Settings, UserCog, Edit, ShieldCheck, ShieldAlert, PieChart, 
  UserMinus, Play, DollarSign, Skull, HeartPulse, RefreshCw, Coins, ListChecks, Zap, 
  UserPlus, Trash2, Mail, LogOut, KeyRound, User, Home, Megaphone, ArrowRight, FileText, BarChart2
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, updateDoc, writeBatch, deleteDoc, deleteField } from 'firebase/firestore';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBElbNciOXRwiFhbE6XBs-7QZU_BtI4ZXU",
  authDomain: "hanover-football-fanatics.firebaseapp.com",
  projectId: "hanover-football-fanatics",
  storageBucket: "hanover-football-fanatics.firebasestorage.app",
  messagingSenderId: "612826688555",
  appId: "1:612826688555:web:ffc96abfae827ffd770e6e"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'hanover-test-season-11';

// --- CONSTANTS ---
const INITIAL_GAMES = [
  { id: 1, away: 'BAL', home: 'KC', awayName: 'Ravens', homeName: 'Chiefs', date: 'Thu, Sep 5', time: '8:20 PM', status: 'upcoming' },
  { id: 2, away: 'GB', home: 'PHI', awayName: 'Packers', homeName: 'Eagles', date: 'Fri, Sep 6', time: '8:15 PM', status: 'upcoming' },
  { id: 3, away: 'PIT', home: 'ATL', awayName: 'Steelers', homeName: 'Falcons', date: 'Sun, Sep 8', time: '1:00 PM', status: 'upcoming' },
];
const initialGamesByWeek: any = {}; 
Array.from({ length: 22 }, (_, i) => i + 1).forEach(w => { initialGamesByWeek[w] = INITIAL_GAMES.map(g => ({...g})); });

const NFL_COLORS: any = {
  ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D', CAR: '#0085CA', CHI: '#0B162A', CIN: '#FB4F14', CLE: '#311D00',
  DAL: '#041E42', DEN: '#FB4F14', DET: '#0076B6', GB:  '#203731', HOU: '#03202F', IND: '#002C5F', JAX: '#006778', KC:  '#E31837',
  LV:  '#000000', LAC: '#0080C6', LAR: '#003594', MIA: '#008E97', MIN: '#4F2683', NE:  '#002244', NO:  '#101820', NYG: '#0B2265',
  NYJ: '#125740', PHI: '#004C54', PIT: '#101820', SF:  '#AA0000', SEA: '#002244', TB:  '#D50A0A', TEN: '#0C2340', WAS: '#5A1414'
};

const INITIAL_USERS = [
  { id: 'admin-1', firstName: 'Admin', lastName: 'Account', nickname: 'The Admin', username: 'admin', password: 'admin', requiresPasswordChange: true, email: '', role: 'admin', paymentStatus: 'paid', playsConfidence: true, playsKnockout: true, picks: {1:{},2:{},3:{},4:{}}, ranks: {1:{},2:{},3:{},4:{}}, tiebreakers: {1:'',2:'',3:'',4:''}, knockoutPicks: {}, knockoutStatuses: {}, weeklyFantasyHistory: {}, weeklyConfidenceHistory: {} },
];

// --- HELPER TO CONVERT NFL SYSTEM WEEKS TO DISPLAY WEEKS ---
function getDisplayWeekLabel(weekNum: number): string {
  if (weekNum <= 3) {
    return `Preseason Week ${weekNum}`;
  }
  return `Week ${weekNum - 3}`;
}

// --- HELPERS ---
function formatFullName(user: any) { return !user ? "" : `${user.firstName}${user.nickname ? ` "${user.nickname}"` : ""} ${user.lastName}`; }

function calculatePoints(picks: any, ranks: any, games: any) {
  if (!picks || !ranks || !games || games.length === 0) return 0;
  const maxPossible = games.reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);
  const lostPoints = games.reduce((lost: number, g: any) => {
    const userPick = picks[g.id];
    const userRank = parseInt(ranks[g.id], 10) || 0;
    if (g.status === 'final' && g.winner && userPick && userPick !== g.winner) {
      return lost + userRank;
    }
    return lost;
  }, 0);
  return maxPossible - lostPoints;
}

function wasAlreadyOut(user: any, currentWeek: number, weekStates: any) {
  if (!user || user.paymentStatus === 'disqualified') return true;
  for (let wk = 1; wk < currentWeek; wk++) if (weekStates?.[wk] === 'closed' && ['Loser', 'Loser (No Pick)', 'No Pick', undefined].includes(user.knockoutStatuses?.[wk])) return true;
  return false;
}

function getLockdownTime(gamesList: any[]) {
    if (!gamesList || gamesList.length === 0) return null;
    let earliest = Infinity;
    gamesList.forEach(g => { if(g?.date && g?.time && g.date.split(', ')[1]) earliest = Math.min(earliest, new Date(`${g.date.split(', ')[1]}, ${new Date().getFullYear()} ${g.time}`).getTime()); });
    return earliest === Infinity ? null : earliest - (60 * 60 * 1000); 
}

const fieldBackgroundStyle = { backgroundColor: '#285233', backgroundImage: `repeating-linear-gradient(to bottom, transparent, transparent 80px, rgba(0, 0, 0, 0.1) 80px, rgba(0, 0, 0, 0.1) 160px), repeating-linear-gradient(to bottom, rgba(255, 255, 255, 0.4) 0px, rgba(255, 255, 255, 0.4) 3px, transparent 3px, transparent 160px)`, backgroundAttachment: 'fixed' as const };

// --- REUSABLE COMPONENTS ---
function CountdownClock({ targetTime }: { targetTime: number | null }) {
    const [timeLeft, setTimeLeft] = useState('');
    useEffect(() => {
        if (!targetTime) return;
        const timer = setInterval(() => {
            const diff = targetTime - Date.now();
            if (diff <= 0) { setTimeLeft('LOCKED'); clearInterval(timer); } 
            else {
                const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`${d > 0 ? d+'d ' : ''}${h}h ${m}m ${s}s`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [targetTime]);
    return <span>{timeLeft || 'Calculating...'}</span>;
}

function LoginView({ users, onLogin, imgError, handleImgError, onChangePassword }: any) {
  const [username, setUsername] = useState(''), [password, setPassword] = useState(''), [error, setError] = useState(''), [needsPasswordChange, setNeedsPasswordChange] = useState(false), [matchedUser, setMatchedUser] = useState<any>(null), [newPassword, setNewPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState(''), [isUpdating, setIsUpdating] = useState(false);
  const handleLoginSubmit = async (e: any) => {
      e.preventDefault();
      if (!username.trim() || !password) return setError("Please enter both your username and password.");
      const u = users.find((x: any) => x.username.toLowerCase() === username.trim().toLowerCase());
      if (u && u.password === password) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { lastLoginTime: new Date().toISOString(), failedLogins: 0 });
          if (u.requiresPasswordChange) { setMatchedUser(u); setNeedsPasswordChange(true); setError(''); } else onLogin(u.id);
      } else if (u) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { failedLogins: (u.failedLogins || 0) + 1 });
          setError("Incorrect username or password.");
      } else setError("Incorrect username or password.");
  };
  const handlePasswordChangeSubmit = async (e: any) => {
      e.preventDefault();
      if (newPassword.length < 8) return setError("Password must be at least 8 characters long.");
      if (newPassword !== confirmPassword) return setError("Passwords do not match.");
      setIsUpdating(true); await onChangePassword(matchedUser.id, newPassword); setIsUpdating(false); onLogin(matchedUser.id);
  };
  if (needsPasswordChange) return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={fieldBackgroundStyle}><div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border-t-8 border-[#FFB81C]"><div className="p-8 bg-slate-50 border-b border-slate-100 text-center"><div className="w-16 h-16 bg-[#FFB81C]/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#FFB81C]/30"><Lock className="w-8 h-8 text-slate-900" /></div><h2 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900">Security Update</h2><p className="text-slate-500 font-bold mt-2 text-sm leading-tight">Welcome, {matchedUser?.firstName}! Please set a new secure password.</p></div><form onSubmit={handlePasswordChangeSubmit} className="p-8 space-y-6">{error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}</div>}<div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">New Password (Min. 8 Chars)</label><div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" /><input autoFocus type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-[#FFB81C]" /></div></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confirm Password</label><div className="relative"><CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" /><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-[#FFB81C]" /></div></div><button disabled={isUpdating} type="submit" className="w-full bg-slate-900 text-[#FFB81C] rounded-xl px-4 py-4 font-black italic uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 flex items-center justify-center gap-2">{isUpdating ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Update & Continue'}</button></form></div></div>
  );
  return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4" style={fieldBackgroundStyle}><div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border-t-8 border-[#FFB81C]"><div className="p-8 bg-slate-50 border-b border-slate-100 flex flex-col items-center text-center">{!imgError ? <img src="/hff-logo.png" alt="Logo" className="h-48 md:h-56 w-auto max-w-[80vw] object-contain mb-6 drop-shadow-2xl hover:scale-105 transition-transform" onError={() => handleImgError('logo')} /> : <><div className="w-24 h-24 bg-[#FFB81C] rounded-3xl flex items-center justify-center mb-6 shadow-xl"><Trophy className="w-12 h-12 text-slate-900" /></div><h1 className="text-3xl font-black italic uppercase tracking-tighter text-slate-900 leading-tight mb-2">Hanover Football<br/>Fanatics</h1></>}<p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Secure Portal Access</p></div><form onSubmit={handleLoginSubmit} className="p-8 space-y-6">{error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}</div>}<div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Username</label><div className="relative"><User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" /><input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter your username" autoComplete="off" autoCapitalize="none" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-[#FFB81C]" /></div></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Password</label><div className="relative"><KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" /><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-bold text-slate-900 outline-none focus:border-[#FFB81C]" /></div></div><button type="submit" className="w-full bg-slate-900 text-[#FFB81C] rounded-xl px-4 py-4 font-black italic uppercase tracking-widest shadow-xl hover:scale-[1.02] transition-all">Log In</button></form></div></div>
  );
}

function ChangePasswordModal({ user, onClose, onSave }: any) {
    const [newPassword, setNewPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState(''), [error, setError] = useState(''), [isUpdating, setIsUpdating] = useState(false);
    const handleSubmit = async (e: any) => { e.preventDefault(); if (newPassword.length < 8) return setError("Password must be at least 8 characters long."); if (newPassword !== confirmPassword) return setError("Passwords do not match."); setIsUpdating(true); await onSave(user.id, newPassword); setIsUpdating(false); onClose(); };
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"><div className="flex justify-between items-center p-6 bg-slate-900 text-white border-b-4 border-[#FFB81C]"><h2 className="font-black italic uppercase tracking-tighter flex items-center gap-3"><KeyRound className="w-5 h-5 text-[#FFB81C]" /> Change Password</h2><button onClick={onClose} className="p-2 transition-colors hover:bg-white/10 rounded-full"><X className="w-5 h-5" /></button></div><form onSubmit={handleSubmit} className="p-8 space-y-6">{error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm font-bold flex items-center gap-2"><AlertCircle className="w-5 h-5 flex-shrink-0" /> {error}</div>}<div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">New Password</label><input autoFocus type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-[#FFB81C]" placeholder="Min. 8 chars" /></div><div className="space-y-2"><label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confirm Password</label><input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-900 outline-none focus:border-[#FFB81C]" placeholder="Confirm password" /></div><button disabled={isUpdating} type="submit" className="w-full bg-slate-900 text-[#FFB81C] rounded-xl px-4 py-4 font-black italic uppercase tracking-widest shadow-xl disabled:opacity-50 flex items-center justify-center gap-2">{isUpdating ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Save Password'}</button></form></div></div>
    );
}

function NavButton({ icon: Icon, label, active, onClick, className = "" }: any) { return <button onClick={onClick} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-black uppercase tracking-widest transition-all whitespace-nowrap ${active ? 'bg-[#FFB81C] text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/10'} ${className}`}><Icon className="w-4 h-4" />{label}</button>; }
function MobileNavButton({ icon: Icon, label, active, onClick }: any) { return <button onClick={onClick} className={`flex flex-col items-center justify-center min-w-[70px] py-2 space-y-1 flex-shrink-0 ${active ? 'text-[#FFB81C]' : 'text-slate-500'}`}><Icon className={`w-6 h-6 ${active ? 'fill-[#FFB81C]/20' : ''}`} /><span className="text-[10px] font-black uppercase tracking-tighter truncate w-full text-center">{label}</span></button>; }

function AdminNavButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-slate-900 text-[#FFB81C] shadow-lg scale-105 z-10' : 'text-slate-500 hover:bg-slate-50'}`}>
      <Icon className="w-5 h-5" />{label}
    </button>
  );
}

function TeamButton({ team, abbr, name, selected, isLocked, onClick }: any) { 
  const displayAbbr = abbr || team;
  return <button onClick={onClick} disabled={isLocked} className={`flex-1 w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300 ${selected ? 'border-[#FFB81C] bg-[#FFB81C]/5 shadow-lg scale-[1.02]' : `border-transparent ${isLocked ? 'bg-slate-50' : 'bg-slate-50 hover:bg-slate-100 hover:scale-[1.01]'} text-slate-700`} ${isLocked && !selected ? 'grayscale' : ''}`}><div className="flex items-center gap-3 text-left"><div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg ${isLocked ? 'bg-slate-300 shadow-none' : ''}`} style={!isLocked ? { backgroundColor: NFL_COLORS[team] || '#1e293b' } : {}}>{displayAbbr}</div><div><div className="font-black uppercase italic text-base sm:text-lg leading-tight text-slate-900">{name}</div><div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{displayAbbr}</div></div></div>{selected && <CheckCircle className="w-6 h-6 text-[#FFB81C]" strokeWidth={3} />}</button>; 
}

function GameCard({ game, selectedPick, selectedRank, totalGames, usedRanks, isLocked, onPick, onRankChange }: any) {
  const isFullyPicked = selectedPick && selectedRank;
  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col lg:flex-row ${isFullyPicked && !isLocked ? 'border-slate-900 shadow-md scale-[1.005]' : selectedPick && !isLocked ? 'border-[#FFB81C]/40' : 'border-slate-100 hover:border-slate-200'}`}>
      <div className={`p-4 lg:w-48 flex flex-row lg:flex-col justify-between lg:justify-center items-center lg:items-start border-b lg:border-b-0 lg:border-r-2 border-slate-50 ${isLocked ? 'bg-slate-100' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
          {isLocked ? <Lock className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-[#FFB81C]" />}
          {game?.date}
          {game?.isTiebreaker && <span className="text-[#FFB81C] font-black text-base leading-none" title="Official Tiebreaker Game">*</span>}
        </div>
        <div className="text-sm font-bold text-slate-300">{game?.time}</div>
      </div>
      <div className={`p-4 flex-1 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full ${isLocked ? 'opacity-75' : ''}`}><TeamButton team={game?.away} abbr={game?.awayAbbr} name={game?.awayName} selected={selectedPick === game?.away} isLocked={isLocked} onClick={() => onPick(game?.away)} /><div className="text-sm font-black text-slate-200 uppercase italic tracking-widest hidden sm:block">VS</div><TeamButton team={game?.home} abbr={game?.homeAbbr} name={game?.homeName} selected={selectedPick === game?.home} isLocked={isLocked} onClick={() => onPick(game?.home)} /></div>
      <div className={`p-4 lg:w-64 flex flex-row lg:flex-col justify-between items-center lg:justify-center border-t lg:border-t-0 lg:border-l-2 border-slate-50 ${isLocked ? 'bg-slate-100' : 'bg-slate-50/50'}`}>
        <label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-[0.2em] lg:mb-2">Fanatics Rank</label>
        <select 
          value={selectedRank || ''} 
          onChange={(e) => onRankChange(e.target.value)} 
          disabled={isLocked} 
          className={`appearance-none bg-white border-2 ${selectedRank && !isLocked ? 'border-[#FFB81C] text-[#FFB81C] bg-slate-900' : 'border-slate-200 text-slate-400'} text-base font-black italic uppercase rounded-xl block w-36 px-4 py-3 text-center outline-none transition-all cursor-pointer`}
        >
          <option value="" disabled>-- PTS --</option>
          {selectedRank && <option value="">-- Clear Rank --</option>}
          {Array.from({ length: totalGames }, (_, i) => i + 1)
            .filter(num => !(usedRanks || []).includes(num) || num === parseInt(selectedRank) || isLocked)
            .map(num => <option key={num} value={num}>{num} PTS</option>)}
        </select>
      </div>
    </div>
  );
}

function KnockoutGameCard({ game, selectedTeam, usedTeams, onPick, isLocked }: any) {
  const isAwayUsed = (usedTeams || []).includes(game?.away) && selectedTeam !== game?.away;
  const isHomeUsed = (usedTeams || []).includes(game?.home) && selectedTeam !== game?.home;
  return (
    <div className={`bg-white rounded-3xl border-4 p-4 shadow-sm transition-all ${isLocked ? 'border-slate-100 opacity-80 grayscale-[20%]' : 'border-slate-50 hover:border-[#FFB81C]/20'}`}>
      <div className="flex flex-col gap-3">
        <button onClick={() => onPick(game?.away)} disabled={isAwayUsed || isLocked} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${selectedTeam === game?.away ? 'bg-slate-900 border-[#FFB81C] text-[#FFB81C] scale-[1.03] shadow-xl' : isAwayUsed ? 'opacity-20 grayscale bg-slate-50 cursor-not-allowed' : 'bg-slate-50 border-transparent hover:bg-slate-100'} ${isLocked && selectedTeam !== game?.away ? 'cursor-not-allowed' : ''}`}><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white`} style={{ backgroundColor: NFL_COLORS[game?.away] || '#334155' }}>{game?.awayAbbr || game?.away}</div><span className="font-black italic uppercase text-lg">{game?.awayName}</span></div>{selectedTeam === game?.away && <CheckCircle className="w-6 h-6" />}</button>
        <div className="text-center text-[10px] font-black text-slate-200 italic uppercase">VS</div>
        <button onClick={() => onPick(game?.home)} disabled={isHomeUsed || isLocked} className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${selectedTeam === game?.home ? 'bg-slate-900 border-[#FFB81C] text-[#FFB81C] scale-[1.03] shadow-xl' : isHomeUsed ? 'opacity-20 grayscale bg-slate-50 cursor-not-allowed' : 'bg-slate-50 border-transparent hover:bg-slate-100'} ${isLocked && selectedTeam !== game?.home ? 'cursor-not-allowed' : ''}`}><div className="flex items-center gap-4"><div className={`w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white`} style={{ backgroundColor: NFL_COLORS[game?.home] || '#334155' }}>{game?.homeAbbr || game?.home}</div><span className="font-black italic uppercase text-lg">{game?.homeName}</span></div>{selectedTeam === game?.home && <CheckCircle className="w-6 h-6" />}</button>
      </div>
    </div>
  );
}

function LiveTrackerCell({ game, pick, rank, isProjection }: any) {
  if (!pick || !rank) return <div className="text-center text-slate-300 font-bold text-xs py-1">-</div>;
  
  const activeWinner = isProjection ? getProjectedWinner(game) : (game?.status === 'final' ? game?.winner : null);
  const isWinner = activeWinner && pick === activeWinner;
  const isLoser = activeWinner && pick !== activeWinner;
  const inProgress = game?.status === 'in_progress';

  let bg = 'bg-white text-slate-900 border-slate-300 shadow-sm';
  if (isWinner) {
    bg = inProgress && isProjection
      ? 'bg-emerald-500 text-white font-black shadow-sm border-emerald-400 animate-pulse'
      : 'bg-emerald-600 text-white font-black shadow-sm border-emerald-500';
  } else if (isLoser) {
    bg = 'bg-rose-50 text-rose-700 border-rose-200 line-through opacity-60';
  }

  const displayPick = pick === game?.away ? (game?.awayAbbr || pick) : (pick === game?.home ? (game?.homeAbbr || pick) : pick);

  return (
    <div className={`font-black uppercase text-center rounded-md py-0.5 border transition-all duration-200 w-full flex flex-col items-center justify-center leading-tight ${bg}`}>
      <span className="text-xs font-black tracking-tighter">
        {String(displayPick)}
      </span>
      <span className={`text-[10px] mt-0.5 px-1 py-0.2 rounded font-black italic ${isWinner ? 'bg-black/30 text-white' : 'bg-slate-100 text-slate-800'}`}>
        {String(rank)}
      </span>
    </div>
  );
}

function LiveScoreTicker({ games }: any) {
  if (!games || games.length === 0) return null;
  return (
    <div className="bg-slate-900 rounded-3xl p-4 shadow-xl border-b-4 border-[#FFB81C] mb-6 flex overflow-x-auto gap-4 scrollbar-hide items-center">
      <div className="flex items-center gap-2 pr-4 border-r border-slate-700 shrink-0">
        <Zap className="w-6 h-6 text-[#FFB81C]" />
        <div>
          <h3 className="text-white font-black italic uppercase text-sm leading-tight">Live<br/>Scores</h3>
        </div>
      </div>
      {games.map((g: any) => (
        <div key={g.id} className="min-w-[140px] bg-slate-800 rounded-xl p-3 border border-slate-700 flex flex-col justify-between shrink-0 shadow-inner">
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex justify-between items-center">
            <span>{g.status === 'final' ? 'FINAL' : g.time}</span>
          </div>
          <div className="flex justify-between items-center mb-1.5">
            <div className="flex items-center gap-2">
              <span className={`font-black text-sm ${g.winner === g.away ? 'text-[#FFB81C]' : 'text-slate-200'}`}>{g.awayAbbr || g.away}</span>
            </div>
            <span className={`font-bold font-mono text-sm ${g.awayScore !== undefined ? 'text-white' : 'text-slate-500'}`}>{g.awayScore !== undefined ? g.awayScore : '-'}</span>
          </div>
          <div className="flex justify-between items-center">
             <div className="flex items-center gap-2">
              <span className={`font-black text-sm ${g.winner === g.home ? 'text-[#FFB81C]' : 'text-slate-200'}`}>{g.homeAbbr || g.home}</span>
            </div>
            <span className={`font-bold font-mono text-sm ${g.homeScore !== undefined ? 'text-white' : 'text-slate-500'}`}>{g.homeScore !== undefined ? g.homeScore : '-'}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// --- HELPER TO CALCULATE LIVE PROJECTED GAME WINNERS ---
function getProjectedWinner(game: any) {
  if (!game) return null;
  if (game.status === 'final') return game.winner;
  if (game.status === 'in_progress') {
    const awayScore = parseInt(game.awayScore || 0);
    const homeScore = parseInt(game.homeScore || 0);
    if (awayScore > homeScore) return game.away;
    if (homeScore > awayScore) return game.home;
    return null; // Tie in progress
  }
  return null;
}

function ConfidenceTrackerBoard({ data, games, week, isWeekComplete, currentUser, isWeekLocked, adminForceReveal }: any) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isProjection, setIsProjection] = useState<boolean>(true); // Default to live projected view

  // Calculate live projected scores for every user
  const processedData = useMemo(() => {
    if (!data) return [];
    
    const calculated = data.map((user: any) => {
      let liveScore = 0;
      (games || []).forEach((g: any) => {
        const pick = user.picks?.[week]?.[g.id];
        const rank = parseInt(user.ranks?.[week]?.[g.id] || 0);
        
        if (pick && rank) {
          const winner = isProjection ? getProjectedWinner(g) : (g.status === 'final' ? g.winner : null);
          if (winner && pick === winner) {
            liveScore += rank;
          }
        }
      });
      return { ...user, projectedScore: liveScore };
    });

    // Sort by projected score
    calculated.sort((a: any, b: any) => b.projectedScore - a.projectedScore || a.tbDiff - b.tbDiff);

    let rank = 1;
    calculated.forEach((u: any, i: number) => {
      if (i > 0 && u.projectedScore < calculated[i - 1].projectedScore) {
        rank = i + 1;
      }
      u.projectedRank = rank;
    });

    return calculated;
  }, [data, games, week, isProjection]);

  // Find high stakes games for the logged in user
  const highStakesGames = useMemo(() => {
    if (!currentUser || !games) return [];
    
    const myPicks = currentUser.picks?.[week] || {};
    const myRanks = currentUser.ranks?.[week] || {};

    return games
      .filter((g: any) => g.status === 'in_progress' || g.status === 'scheduled')
      .map((g: any) => {
        const myPick = myPicks[g.id];
        const myRank = parseInt(myRanks[g.id] || 0);
        return { game: g, myPick, myRank };
      })
      .filter((item: any) => item.myPick && item.myRank >= 8) // Focus on high-confidence picks (8+ PTS)
      .sort((a: any, b: any) => b.myRank - a.myRank)
      .slice(0, 3); // Top 3 highest stakes games
  }, [currentUser, games, week]);

  return (
    <div className="space-y-6">
      {/* PERSONAL HIGH-STAKES GAME IMPACT BAR */}
      {currentUser && highStakesGames.length > 0 && (
        <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl border-t-8 border-[#FFB81C]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-black italic uppercase text-[#FFB81C] flex items-center gap-2">
                <Zap className="w-5 h-5 text-[#FFB81C]" /> High-Stakes Watch For {currentUser.firstName}
              </h3>
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                Your highest confidence picks currently live or upcoming
              </p>
            </div>
            <span className="text-[10px] font-black uppercase bg-[#FFB81C]/20 text-[#FFB81C] px-3 py-1 rounded-full border border-[#FFB81C]/30">
              Personalized Watchlist
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {highStakesGames.map(({ game, myPick, myRank }: any) => {
              const projWinner = getProjectedWinner(game);
              const isWinning = projWinner === myPick;
              const displayPick = myPick === game.away ? (game.awayAbbr || myPick) : (game.homeAbbr || myPick);

              return (
                <div key={game.id} className="bg-slate-800/90 rounded-2xl p-4 border border-slate-700 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {game.awayAbbr} @ {game.homeAbbr}
                    </span>
                    <span className="text-xs font-black italic text-[#FFB81C] bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-700">
                      +{myRank} PTS
                    </span>
                  </div>

                  <div className="flex items-center justify-between my-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">Your Pick:</span>
                      <span className="text-sm font-black text-white">{displayPick}</span>
                    </div>

                    {game.status === 'in_progress' ? (
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${isWinning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {isWinning ? '▲ Winning' : '▼ Trailing'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-slate-400 mt-2 border-t border-slate-700/60 pt-2 flex justify-between">
                    <span>Score: {game.awayScore ?? 0} - {game.homeScore ?? 0}</span>
                    <span className="text-slate-300 font-bold">{game.status === 'in_progress' ? 'In Progress' : 'Scheduled'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MAIN TRACKER BOARD */}
      <div className="bg-white rounded-3xl shadow-xl border overflow-hidden border-t-8 border-slate-900 relative w-full">
        {/* HEADER & TOGGLE CONTROLS */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black italic uppercase text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              {week <= 3 ? `Preseason Week ${week}` : `Week ${week - 3}`} {isProjection ? 'Live Projection' : 'Official Results'}
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-0.5">
              {isProjection ? 'Simulating standings if all active games ended right now' : 'Official settled scores for completed games'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* PROJECTION TOGGLE */}
            <div className="flex bg-slate-200 p-1 rounded-xl border border-slate-300">
              <button
                onClick={() => setIsProjection(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  isProjection ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3.5 h-3.5" /> If Ended Now
              </button>
              <button
                onClick={() => setIsProjection(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  !isProjection ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Official Only
              </button>
            </div>

            {/* VIEW TOGGLE */}
            <div className="flex bg-slate-200 p-1 rounded-xl border border-slate-300">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'table' ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'cards' ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* COMPACT TABLE VIEW */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto scrollbar-hide relative z-0">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-900 text-white uppercase border-b-4 border-[#FFB81C]">
                  <th className="p-2 sticky left-0 bg-slate-900 z-30 w-44 sm:w-52 shadow-[3px_0_10px_rgba(0,0,0,0.3)] tracking-widest italic font-black text-xs sm:text-sm">
                    Player
                  </th>

                  {(games || []).map((g: any) => (
                    <th key={g.id} className="p-0.5 text-center border-r border-slate-800 font-black italic leading-tight w-10 sm:w-11">
                      <div className="text-[#FFB81C] text-xs truncate flex items-center justify-center gap-0.5">
                        <span>{String(g.awayAbbr || g.away)}</span>
                        {g.isTiebreaker && <span className="text-[#FFB81C] font-black text-sm leading-none" title="Official Tiebreaker Game">*</span>}
                      </div>
                      <div className="text-slate-500 text-[9px]">@</div>
                      <div className="text-white text-xs truncate">{String(g.homeAbbr || g.home)}</div>
                    </th>
                  ))}

                  <th className="p-1 text-center border-l-2 border-r border-slate-800 w-14 text-[#FFB81C] font-black italic text-xs sm:text-sm">
                    {isProjection ? 'Proj PTS' : 'CP'}
                  </th>
                  <th className="p-1 text-center border-r border-slate-800 w-14 italic text-xs">Behind</th>
                  <th className="p-1 text-center border-r border-slate-800 w-16 italic text-xs">TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((user: any, idx: number) => {
                  if (!user) return null;
                  const activeScore = isProjection ? user.projectedScore : user.confidenceScore;
                  const activeRank = isProjection ? user.projectedRank : user.displayRank;
                  const firstScore = processedData[0]?.[isProjection ? 'projectedScore' : 'confidenceScore'] || 0;
                  
                  const behindFirst = firstScore - activeScore;
                  const behindNext = idx > 0 ? (processedData[idx - 1]?.[isProjection ? 'projectedScore' : 'confidenceScore'] - activeScore) : 0;
                  const isMe = currentUser && user.id === currentUser.id;

                  // Rank Shift Indicator
                  const rankShift = user.displayRank - activeRank;

                  return (
                    <tr key={user.id} className={`${isMe ? 'bg-[#FFB81C]/20 border-l-4 border-[#FFB81C]' : 'hover:bg-slate-50'} transition-colors group relative`}>
                      {/* Sticky Name Column */}
                      <td className={`p-2 sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r-2 border-slate-200 shadow-[3px_0_10px_rgba(0,0,0,0.05)] ${isMe ? 'bg-[#FFB81C]/20 group-hover:bg-[#FFB81C]/30 border-l-4 border-[#FFB81C]' : ''}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-end w-7 flex-shrink-0">
                            <span className="text-black font-semibold italic text-xs sm:text-sm">
                              {activeRank}.
                            </span>
                            {isProjection && rankShift !== 0 && (
                              <span className={`text-[9px] font-black ml-1 ${rankShift > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {rankShift > 0 ? `▲${rankShift}` : `▼${Math.abs(rankShift)}`}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col leading-tight truncate">
                            <span className="text-black font-normal text-xs sm:text-sm truncate">
                              {String(user.firstName)} {user.nickname ? `"${user.nickname}"` : ''}
                            </span>
                            <span className="text-slate-600 font-normal text-xs truncate">
                              {String(user.lastName)}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Game Cells */}
                      {(games || []).map((g: any) => {
                        const pick = user.picks?.[week]?.[g.id];
                        const rank = user.ranks?.[week]?.[g.id];
                        const isHidden = !isWeekLocked && !adminForceReveal && !isMe;

                        return (
                          <td key={g.id} className="p-0.5 border-r border-slate-100 text-center bg-white">
                            {isHidden ? (
                              <div className="text-center text-[8px] font-black italic text-slate-300 bg-slate-50 py-1.5 rounded uppercase border border-slate-100">
                                Lock
                              </div>
                            ) : (
                              <LiveTrackerCell game={g} pick={pick} rank={rank} isProjection={isProjection} />
                            )}
                          </td>
                        );
                      })}

                      {/* Score & Standings Columns */}
                      <td className="p-1 text-center font-black tabular-nums text-sm sm:text-base border-l-2 border-r border-slate-100 text-slate-900 bg-white">
                        {activeScore}
                      </td>
                      <td className="p-1 text-right font-black italic tabular-nums text-xs border-r border-slate-100 bg-white">
                        {idx === 0 ? (
                          <span className="text-slate-300 font-bold block text-center">-</span>
                        ) : (
                          <div className="flex flex-col items-end leading-tight pr-0.5">
                            <span className={behindFirst === 0 ? 'text-slate-400' : 'text-rose-600 font-black'}>
                              {behindFirst === 0 ? '0' : `-${behindFirst}`}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold">({behindNext === 0 ? '0' : `-${behindNext}`})</span>
                          </div>
                        )}
                      </td>
                      <td className="p-1 text-center text-xs font-bold text-slate-700 italic border-r border-slate-100 bg-white">
                        {!isWeekLocked && !adminForceReveal && !isMe ? (
                          <span className="text-slate-300 text-[9px] font-black uppercase italic">HIDDEN</span>
                        ) : user.wonTiebreaker ? (
                          <span className="inline-flex items-center justify-center gap-0.5 bg-[#FFB81C] text-slate-900 px-1.5 py-0.5 rounded shadow-sm font-black text-xs">
                            <Target className="w-3 h-3" /> {String(user.tiebreakers?.[week] || '')}
                          </span>
                        ) : (
                          String(user.tiebreakers?.[week] || '')
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* PLAYER CARDS VIEW */
          <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedData.map((user: any) => {
              const isMe = currentUser && user.id === currentUser.id;
              const activeScore = isProjection ? user.projectedScore : user.confidenceScore;
              const activeRank = isProjection ? user.projectedRank : user.displayRank;

              return (
                <div
                  key={user.id}
                  className={`rounded-2xl p-4 border-2 transition-all ${
                    isMe ? 'bg-[#FFB81C]/10 border-[#FFB81C] shadow-lg scale-[1.01]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-black italic text-[#FFB81C]">#{activeRank}</span>
                      <div>
                        <h3 className="font-black uppercase text-base text-slate-900 leading-tight">
                          {formatFullName(user)}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                          Tiebreaker: {user.tiebreakers?.[week] || '-'} PTS
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-900 text-[#FFB81C] px-3.5 py-1 rounded-xl font-black italic text-xl shadow-md">
                      {activeScore} <span className="text-xs font-normal">PTS</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {(games || []).map((g: any) => {
                      const pick = user.picks?.[week]?.[g.id];
                      const rank = user.ranks?.[week]?.[g.id];
                      const isHidden = !isWeekLocked && !adminForceReveal && !isMe;

                      return (
                        <div key={g.id} className="bg-white p-1.5 rounded-lg border border-slate-200 text-center shadow-sm">
                          <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5">
                            {g.awayAbbr}@{g.homeAbbr}
                          </div>
                          {isHidden ? (
                            <span className="text-xs font-black uppercase text-slate-300">LOCKED</span>
                          ) : pick && rank ? (
                            <div className="font-black uppercase text-xs text-slate-900">
                              <span className="text-[#FFB81C] bg-slate-900 px-1 py-0.5 rounded text-[9px] mr-1">{rank}</span>
                              {pick}
                            </div>
                          ) : (
                            <span className="text-slate-300 text-xs">-</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- UPDATED KNOCKOUT BOARD: SHOWS RED DOLLAR SIGN IF UNPAID/DISQUALIFIED ---
function KnockoutTrackerBoard({ data, week, allGames, isLocked, adminForceReveal, currentUser }: any) {
  return (
    <div className="bg-white rounded-3xl shadow-xl border overflow-hidden border-t-8 border-red-600 max-w-4xl mx-auto">
      <div className="p-6 bg-slate-50 border-b">
        <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2"><Skull className="w-6 h-6 text-red-600" /> KnockOut Battleground</h2>
      </div>
      <div className="divide-y">
        {(data || []).map((user: any) => {
          const status = user.currentStatus;
          const pick = user.pick;
          const isDead = ['Loser', 'Loser (No Pick)', 'No Pick', 'Previously Out', 'Disqualified (Unpaid)', 'Knocked Out'].includes(status);
          const isMe = user.id === currentUser?.id;
          const isUnpaid = user.paymentStatus === 'unpaid' || user.paymentStatus === 'disqualified';
          
          const game = (allGames?.[week] || []).find((g: any) => g.away === pick || g.home === pick);
          const displayPick = game ? (pick === game.away ? (game.awayAbbr || game.away) : (game.homeAbbr || game.home)) : pick;

          return (
            <div key={user.id} className={`p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isMe ? 'bg-[#FFB81C]/10' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${isDead ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{isDead ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}</div>
                <div>
                  <h4 className="font-black uppercase text-base text-slate-900 flex items-center gap-1.5">
                    {formatFullName(user)}
                    {isUnpaid && (
                      <span className="inline-flex items-center text-red-600" title="Unpaid Player">
                        <DollarSign className="w-4 h-4 stroke-[3]" />
                      </span>
                    )}
                  </h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-0.5">Status: <span className={isDead ? 'text-red-600' : 'text-green-600'}>{isDead ? 'Knocked Out' : 'Alive'}</span></p>
                </div>
              </div>
              <div className="text-right">
                <span className={`px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider ${pick && (isLocked || adminForceReveal || isMe) ? 'bg-slate-900 text-[#FFB81C]' : 'bg-slate-100 text-slate-300'}`}>
                  {(!isLocked && !adminForceReveal && pick && !isMe) ? "HIDDEN" : (displayPick || "NO PICK")}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SeasonTrackerBoard({ data, view, currentUser }: any) {
  const ptsKey = view === '1st Half' ? 'cpFirstHalf' : view === '2nd Half' ? 'cpSecondHalf' : 'cpOverall';
  const fpKey = view === '1st Half' ? 'fpFirstHalf' : view === '2nd Half' ? 'fpSecondHalf' : 'fpOverall';

  const firstPlacePTS = data?.[0]?.[ptsKey] || 0;

  return (
    <div className="bg-white rounded-3xl shadow-xl border overflow-hidden border-t-8 border-[#FFB81C] max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="p-6 bg-slate-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2">
            <Trophy className="w-6 h-6 text-[#FFB81C]" /> {view} Leaderboard
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            {view === '1st Half' 
              ? 'Weeks 1–9 Race' 
              : view === '2nd Half' 
              ? 'Weeks 10–18 Race' 
              : 'Full Season Race (Weeks 1–18)'}
          </p>
        </div>
      </div>

      {/* TABLE COLUMN DESCRIPTIONS HEADER BAR */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between text-[11px] font-black uppercase tracking-widest border-b-2 border-[#FFB81C]">
        <div className="w-1/2 sm:w-2/5">Player Identity</div>
        <div className="flex items-center gap-4 sm:gap-8 justify-end w-1/2 sm:w-3/5 text-right">
          <div className="w-16 text-center">Total PTS</div>
          <div className="w-24 text-right">Behind (Leader / Ahead)</div>
          <div className="w-20 text-right">Net Winnings</div>
        </div>
      </div>

      {/* STANDINGS TABLE ROWS */}
      <div className="divide-y divide-slate-100">
        {(data || []).map((user: any, idx: number) => {
          const isMe = user.id === currentUser?.id;
          const pts = user[ptsKey] || 0;
          const netDollars = user[fpKey] || 0;

          const behindLeader = firstPlacePTS - pts;
          const behindNext = idx > 0 ? (data[idx - 1]?.[ptsKey] || 0) - pts : 0;

          return (
            <div key={user.id} className={`px-4 py-3 flex items-center justify-between ${isMe ? 'bg-[#FFB81C]/15 font-black' : 'hover:bg-slate-50'}`}>
              <div className="flex items-center gap-3 w-1/2 sm:w-2/5">
                <span className="font-black italic text-lg text-slate-400 w-6 text-right flex-shrink-0">
                  #{user.displayRank}
                </span>
                <div className="truncate">
                  <span className="font-black uppercase text-sm text-slate-900 block leading-tight truncate">
                    {formatFullName(user)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 sm:gap-8 justify-end w-1/2 sm:w-3/5 text-right">
                <div className="text-center font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-1.5 rounded-xl w-16 flex-shrink-0">
                  {pts} <span className="text-[9px] font-black uppercase text-slate-400 block -mt-1">PTS</span>
                </div>

                <div className="text-right w-24 flex-shrink-0">
                  {idx === 0 ? (
                    <span className="text-slate-300 font-bold text-xs block text-right pr-2">-</span>
                  ) : (
                    <div className="flex flex-col items-end leading-tight">
                      <span className={behindLeader === 0 ? 'text-slate-400 font-bold text-xs' : 'text-rose-600 font-black text-xs sm:text-sm'}>
                        {behindLeader === 0 ? '0' : `-${behindLeader}`}
                      </span>
                      <span className="text-[9px] text-slate-400 font-bold mt-0.5">
                        ({behindNext === 0 ? '0' : `-${behindNext}`})
                      </span>
                    </div>
                  )}
                </div>

                <div className={`text-right font-mono font-black text-xs sm:text-sm px-2.5 py-1.5 rounded-xl border w-20 flex-shrink-0 ${
                  netDollars >= 0 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  {netDollars >= 0 ? `+$${netDollars}` : `-$${Math.abs(netDollars)}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsView({ allUsers, globalSettings }: any) {
  const fanaticsUsers = useMemo(() => {
    return (allUsers || []).filter((u: any) => u.playsConfidence);
  }, [allUsers]);

  const fanaticsAnalytics = useMemo(() => {
    let totalPicksMade = 0;
    let totalCorrectPicks = 0;
    let totalPointsPossible = 0;
    let totalPointsScored = 0;

    const rankStats: Record<number, { picked: number; won: number }> = {};
    for (let r = 1; r <= 16; r++) rankStats[r] = { picked: 0, won: 0 };

    const userStats = fanaticsUsers.map((u: any) => {
      let uPicks = 0;
      let uWins = 0;
      let uPtsScored = 0;
      let uPtsPossible = 0;

      Object.keys(u.picks || {}).forEach((wkStr) => {
        const wk = Number(wkStr);
        const games = globalSettings?.games?.[wk] || [];
        const userPicks = u.picks?.[wk] || {};
        const userRanks = u.ranks?.[wk] || {};

        games.forEach((g: any) => {
          const pick = userPicks[g.id];
          const rank = parseInt(userRanks[g.id], 10);

          if (pick && !isNaN(rank)) {
            uPicks++;
            totalPicksMade++;
            uPtsPossible += rank;
            totalPointsPossible += rank;

            if (g.status === 'final' && g.winner) {
              const isWin = g.winner === pick;
              
              if (!rankStats[rank]) rankStats[rank] = { picked: 0, won: 0 };
              rankStats[rank].picked++;

              if (isWin) {
                uWins++;
                totalCorrectPicks++;
                uPtsScored += rank;
                totalPointsScored += rank;
                rankStats[rank].won++;
              }
            }
          }
        });
      });

      const accuracy = uPicks > 0 ? (uWins / uPicks) * 100 : 0;
      const efficiency = uPtsPossible > 0 ? (uPtsScored / uPtsPossible) * 100 : 0;

      return {
        id: u.id,
        name: formatFullName(u),
        picksCount: uPicks,
        wins: uWins,
        accuracy: accuracy.toFixed(1),
        ptsScored: uPtsScored,
        ptsPossible: uPtsPossible,
        efficiency: efficiency.toFixed(1)
      };
    });

    userStats.sort((a, b) => parseFloat(b.efficiency) - parseFloat(a.efficiency));

    const overallAccuracy = totalPicksMade > 0 ? ((totalCorrectPicks / totalPicksMade) * 100).toFixed(1) : '0.0';
    const overallEfficiency = totalPointsPossible > 0 ? ((totalPointsScored / totalPointsPossible) * 100).toFixed(1) : '0.0';

    return {
      totalPicksMade,
      totalCorrectPicks,
      totalPointsScored,
      totalPointsPossible,
      overallAccuracy,
      overallEfficiency,
      rankStats,
      userStats
    };
  }, [fanaticsUsers, globalSettings]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl border-b-8 border-[#FFB81C]">
        <div className="flex items-center gap-3 mb-2">
          <BarChart2 className="w-8 h-8 text-[#FFB81C]" />
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">Fanatics Pool Analytics</h2>
        </div>
        <p className="text-slate-400 font-bold uppercase tracking-widest">Confidence Pick Efficiency & Accuracy Breakdown</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Overall Accuracy</div>
          <div className="text-3xl font-black italic text-slate-900">{fanaticsAnalytics.overallAccuracy}%</div>
          <p className="text-xs text-slate-400 mt-1 font-semibold">{fanaticsAnalytics.totalCorrectPicks} / {fanaticsAnalytics.totalPicksMade} Games Won</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Point Efficiency</div>
          <div className="text-3xl font-black italic text-[#FFB81C]">{fanaticsAnalytics.overallEfficiency}%</div>
          <p className="text-xs text-slate-400 mt-1 font-semibold">{fanaticsAnalytics.totalPointsScored} / {fanaticsAnalytics.totalPointsPossible} PTS Captured</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Active Fanatics Players</div>
          <div className="text-3xl font-black italic text-slate-900">{fanaticsUsers.length}</div>
          <p className="text-xs text-slate-400 mt-1 font-semibold">Registered Roster</p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center">
          <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Most Efficient Player</div>
          <div className="text-xl font-black italic text-slate-900 truncate">{fanaticsAnalytics.userStats[0]?.name || 'N/A'}</div>
          <p className="text-xs text-emerald-600 font-black mt-1">{fanaticsAnalytics.userStats[0]?.efficiency || '0.0'}% PTS Efficiency</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <h3 className="text-xl font-black italic uppercase text-slate-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#FFB81C]" /> Win Rate by Fanatics Point Rank
        </h3>
        <p className="text-xs text-slate-500 mb-6 font-semibold">
          Evaluates how accurately the league assigned point values. High ranks should ideally have higher win rates.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {Array.from({ length: 16 }, (_, i) => 16 - i).map((rank) => {
            const stat = fanaticsAnalytics.rankStats[rank] || { picked: 0, won: 0 };
            const pct = stat.picked > 0 ? Math.round((stat.won / stat.picked) * 100) : 0;

            return (
              <div key={rank} className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-center flex flex-col justify-between">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{rank} PTS</span>
                <div className="my-2">
                  <span className={`text-xl font-black italic ${pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-slate-900' : 'text-rose-600'}`}>
                    {stat.picked > 0 ? `${pct}%` : '-'}
                  </span>
                </div>
                <span className="text-[9px] font-bold text-slate-400">{stat.won}/{stat.picked} Win</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black italic uppercase text-slate-900">Player Accuracy & Efficiency Leaderboard</h3>
            <p className="text-xs text-slate-500 font-bold mt-0.5">Compares raw game win % against actual confidence point capture %</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]">
                <th className="p-4 italic">Rank</th>
                <th className="p-4">Player</th>
                <th className="p-4 text-center">Correct Picks</th>
                <th className="p-4 text-center">Game Accuracy</th>
                <th className="p-4 text-center">Points Earned / Possible</th>
                <th className="p-4 text-right">Point Efficiency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {fanaticsAnalytics.userStats.map((u, idx) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors font-bold">
                  <td className="p-4 font-black italic text-slate-400 text-base">#{idx + 1}</td>
                  <td className="p-4 font-black text-slate-900">{u.name}</td>
                  <td className="p-4 text-center text-slate-700">{u.wins} / {u.picksCount}</td>
                  <td className="p-4 text-center font-mono text-slate-800">{u.accuracy}%</td>
                  <td className="p-4 text-center text-slate-700">{u.ptsScored} / {u.ptsPossible}</td>
                  <td className="p-4 text-right font-black italic text-base text-[#FFB81C]">{u.efficiency}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminLifecycleCard({ week, status, onLock, onClose, onOpen }: any) {
  const label = week <= 3 ? `Preseason Week ${week}` : `Week ${week - 3}`;
  return (
    <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm relative overflow-hidden group h-full">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2"><Clock className="w-4 h-4" /> {label} Lifecycle</h3>
      <div className={`p-6 rounded-2xl flex flex-col xl:flex-row items-center justify-between border-2 gap-4 ${status === 'closed' ? 'bg-slate-900 border-slate-700' : status === 'locked' ? 'bg-red-50 border-red-200' : 'bg-[#FFB81C]/5 border-[#FFB81C]/20'}`}>
        <div className={`text-2xl font-black italic uppercase tracking-tighter ${status === 'closed' ? 'text-white' : status === 'locked' ? 'text-red-700' : 'text-slate-900'}`}>Status: {(status || 'open').toUpperCase()}</div>
        <div className="flex flex-wrap justify-center gap-2">
            {status === 'open' && <button onClick={onLock} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black italic uppercase shadow-xl hover:bg-red-700 transition-all text-xs sm:text-sm">Lock Week & Apply Deadbeat</button>}
            {status === 'locked' && <><button onClick={onOpen} className="px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-black italic uppercase hover:bg-slate-300 transition-all text-xs sm:text-sm">Unlock</button><button onClick={onClose} className="px-6 py-3 bg-slate-900 text-[#FFB81C] rounded-xl font-black italic uppercase shadow-xl hover:scale-105 transition-all text-xs sm:text-sm">Close Week & Finalize</button></>}
            {status === 'closed' && <button onClick={onOpen} className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl font-black italic uppercase hover:bg-slate-700 transition-all text-xs sm:text-sm">Re-Open (Edit)</button>}
        </div>
      </div>
    </div>
  );
}

function AdminWeekCard({ week, onChange, maxActiveWeeks = 18 }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm h-full">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Season Schedule</h3>
      <select value={week} onChange={onChange} className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black italic text-2xl uppercase tracking-tighter outline-none focus:ring-4 focus:ring-[#FFB81C]/20 cursor-pointer">
        {Array.from({ length: maxActiveWeeks }, (_, i) => i + 1).map(w => (
          <option key={w} value={w}>
            {w <= 3 ? `Preseason Week ${w}` : `Week ${w - 3}`}
          </option>
        ))}
      </select>
    </div>
  );
}

function AdminNumberInput({ value, onSave, label }: any) {
  const [localVal, setLocalVal] = useState(value);
  useEffect(() => setLocalVal(value), [value]);
  return (
    <div className="space-y-1"><label className="block text-[10px] font-bold text-slate-400 text-center">{label}</label><input type="number" value={localVal !== undefined && localVal !== null ? localVal : ''} onChange={(e) => setLocalVal(e.target.value)} onBlur={() => onSave(parseInt(localVal) || 0)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-2 text-center font-black outline-none focus:border-[#FFB81C]" /></div>
  );
}

function StatusColumn({ title, count, users, color, icon: Icon, onOverride }: any) {
  return (
    <div className={`bg-white rounded-2xl border-2 shadow-sm overflow-hidden flex flex-col h-[350px] ${color === 'green' ? 'border-green-200' : color === 'blue' ? 'border-blue-200' : 'border-slate-200'}`}>
      <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${color === 'green' ? 'text-green-500' : color === 'blue' ? 'text-blue-500' : 'text-slate-400'}`} />}
          <h3 className="font-black uppercase text-xs text-slate-700">{title}</h3>
        </div>
        <span className="font-black text-xs px-2 py-0.5 bg-slate-200 rounded-full text-slate-700">{count}</span>
      </div>
      <div className="p-3 overflow-y-auto space-y-2 flex-1">
        {(users || []).length === 0 ? (
          <div className="text-center text-xs text-slate-300 font-bold py-8 uppercase tracking-widest">All Clear</div>
        ) : (
          (users || []).map((u: any) => (
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

function EditUserRow({ user, form, setForm, onCancel, onSave }: any) {
  return (
    <tr className="bg-slate-100">
      <td className="p-4" colSpan={7}>
        <div className="flex flex-wrap gap-4 items-center">
          <input className="border p-2 rounded w-24 text-xs font-bold" value={form.firstName || ''} onChange={(e) => setForm({...form, firstName: e.target.value})} placeholder="First" />
          <input className="border p-2 rounded w-24 text-xs font-bold" value={form.lastName || ''} onChange={(e) => setForm({...form, lastName: e.target.value})} placeholder="Last" />
          <input className="border p-2 rounded w-28 text-xs font-bold" value={form.username || ''} onChange={(e) => setForm({...form, username: e.target.value.toLowerCase()})} placeholder="Username" />
          <input className="border p-2 rounded w-24 text-xs" value={form.nickname || ''} onChange={(e) => setForm({...form, nickname: e.target.value})} placeholder="Nickname" />
          <input className="border p-2 rounded w-48 text-xs" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Email" />
          <input className="border p-2 rounded w-24 text-xs" type="password" value={form.password || ''} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Reset Pass" />
          <select value={form.role || 'user'} onChange={(e) => setForm({...form, role: e.target.value})} className="border p-2 rounded text-xs font-bold uppercase bg-white">
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button onClick={() => onSave(user.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Save</button>
          <button onClick={onCancel} className="bg-slate-300 px-3 py-1 rounded text-xs font-bold">Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function LockBanner({ week }: any) { 
  const label = week <= 3 ? `Preseason Week ${week}` : `Week ${week - 3}`;
  return <div className="bg-red-50 border-l-8 border-red-500 p-5 rounded-2xl flex gap-4 shadow-xl mb-6"><Lock className="w-8 h-8 text-red-500 flex-shrink-0" /><div><p className="text-lg font-black italic uppercase text-red-800">{label} is Locked</p></div></div>; 
}

function WeekSelector({ week, setWeek, maxActiveWeeks = 18 }: any) { 
  return (
    <div className="w-full md:w-auto">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule</label>
      <select value={week} onChange={(e) => setWeek(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-black italic uppercase text-xl tracking-tighter outline-none focus:ring-4 focus:ring-[#FFB81C]/20 transition-all cursor-pointer">
        {Array.from({ length: maxActiveWeeks }, (_, i) => i + 1).map(w => (
          <option key={w} value={w}>
            {w <= 3 ? `Preseason W${w}` : `Week ${w - 3}`}
          </option>
        ))}
      </select>
    </div>
  ); 
}

function ProgressBar({ percentage, current, total }: any) { return <div className="flex-1 max-w-sm"><div className="flex justify-between text-[10px] font-black uppercase text-slate-500 mb-2 tracking-widest"><span>Pick Progress</span><span className={percentage === 100 ? 'text-green-600' : ''}>{current}/{total}</span></div><div className="bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-white shadow-inner"><div className={`h-full transition-all duration-1000 ease-out ${percentage === 100 ? 'bg-green-500' : 'bg-[#FFB81C]'}`} style={{ width: `${percentage}%` }}></div></div></div>; }
function AutoSaveIndicator({ isSaving, hasSaved, count }: any) { if (count === 0) return null; return <div className="text-[10px] font-black uppercase tracking-widest min-w-[120px] flex justify-center items-center h-8 px-4 rounded-full bg-slate-50 border border-slate-100">{isSaving ? (<span className="text-slate-400 flex items-center gap-2"><div className="w-3 h-3 border-2 border-slate-200 border-t-[#FFB81C] rounded-full animate-spin"></div>Syncing...</span>) : hasSaved ? (<span className="text-green-600 flex items-center gap-1.5 animate-in zoom-in-75 duration-300"><CheckCircle className="w-4 h-4" /> Saved</span>) : null}</div>; }

function TiebreakerCard({ val, game, isLocked, onSave }: any) {
  const [localVal, setLocalVal] = useState(val);
  useEffect(() => setLocalVal(val), [val]);
  const isFilled = localVal.toString().trim() !== '';
  return (
    <div className={`rounded-3xl border-4 p-6 flex flex-col sm:flex-row items-center justify-between gap-6 transition-all duration-500 relative overflow-hidden ${isFilled ? 'border-slate-900 bg-white shadow-2xl scale-[1.01]' : 'border-slate-100 bg-white hover:border-slate-200'}`}>
      <div className="flex items-center gap-5 relative z-10"><div className={`p-4 rounded-2xl transition-all duration-500 shadow-xl ${isFilled ? 'bg-slate-900 text-[#FFB81C] rotate-[5deg]' : 'bg-slate-50 text-slate-300'}`}><Target className="w-8 h-8" /></div><div><h3 className={`text-2xl font-black italic uppercase tracking-tighter transition-colors ${isFilled ? 'text-slate-900' : 'text-slate-800'}`}>Tiebreaker</h3><p className="text-[11px] text-slate-400 uppercase font-black tracking-widest">{game?.awayName} @ {game?.homeName} Total Pts</p></div></div>
      <input type="number" value={localVal} onChange={(e) => setLocalVal(e.target.value)} onBlur={() => onSave(localVal)} disabled={isLocked} placeholder="PTS" className={`w-full sm:w-32 h-16 border-4 rounded-2xl px-4 py-2 text-center font-black italic text-3xl tracking-tighter outline-none transition-all relative z-10 ${isFilled ? 'bg-slate-900 border-[#FFB81C] text-[#FFB81C] shadow-2xl' : 'bg-slate-50 border-slate-100 text-slate-300 focus:border-[#FFB81C]'}`} />
    </div>
  );
}

function PrintModal({ user, week, games, onClose, bannerImg }: any) {
  const sorted = [...(games || [])].filter(g => user?.picks?.[week]?.[g.id] && user?.ranks?.[week]?.[g.id]).sort((a, b) => user.ranks[week]?.[b.id] - user.ranks[week]?.[a.id]);
  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-start justify-center p-4 print:p-0 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl mt-10 print:mt-0 print:shadow-none overflow-hidden animate-in zoom-in-95 duration-500">
        <div className="flex justify-between items-center p-5 bg-slate-900 text-white border-b-4 border-[#FFB81C] print:hidden"><h2 className="font-black italic uppercase tracking-tighter flex items-center gap-3"><Printer className="w-6 h-6 text-[#FFB81C]" /> Transcript</h2><div className="flex gap-2"><button onClick={() => window.print()} className="bg-[#FFB81C] text-slate-900 px-6 py-2 rounded-xl font-black italic uppercase">Print</button><button onClick={onClose} className="p-2 transition-colors hover:bg-white/10 rounded-full"><X className="w-6 h-6" /></button></div></div>
        <div className="p-10 relative">
          <div className="text-center mb-8 border-b-4 border-slate-900 pb-6">{bannerImg ? <img src={bannerImg} alt="HFF" className="h-20 mx-auto mb-4 drop-shadow-md" /> : <h1 className="text-3xl font-black italic uppercase text-slate-900">Hanover Football Fanatics</h1>}<p className="text-[#FFB81C] font-black italic uppercase text-sm mt-1">Week {week} Picks • {formatFullName(user)}</p></div>
          <table className="w-full text-left text-sm"><thead><tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase text-slate-400"><th>Rank</th><th>Matchup</th><th className="text-right">Selection</th></tr></thead><tbody className="divide-y divide-slate-100">{sorted.map(g => (<tr key={g.id}><td className="py-4 font-black text-2xl italic text-slate-900">{user.ranks[week]?.[g.id]}</td><td className="py-4 text-slate-500 font-bold">{g.awayName} AT {g.homeName}</td><td className="py-4 text-right font-black italic uppercase text-lg text-slate-900">{user.picks[week]?.[g.id] === g.away ? g.awayName : g.homeName}</td></tr>))}</tbody></table><div className="mt-10 flex justify-between items-center font-black italic uppercase text-2xl border-t-4 border-slate-900 pt-6"><span>Tiebreaker:</span><span>{user?.tiebreakers?.[week]} PTS</span></div>
        </div>
      </div>
    </div>
  );
}

function ParticipationAlert({ game }: any) {
  return (
    <div className="bg-[#FFB81C]/10 border-4 border-[#FFB81C] rounded-3xl p-8 text-center flex flex-col items-center shadow-xl mb-6">
      <AlertCircle className="w-12 h-12 text-[#FFB81C] mb-4" /><h3 className="text-2xl font-black italic uppercase text-slate-900">Entry Required</h3>
      <p className="text-slate-600 font-bold max-w-sm mt-2">You aren't registered for the {game} Pool. Contact the Admin to play!</p>
    </div>
  );
}

// --- DYNAMIC WHOLE-DOLLAR FANATICS PAYOUT GENERATOR ---
function calculateFanaticsPayouts(numPlayers: number, totalWeeks = 18, half1Weeks = 9, half2Weeks = 9) {
  const percentages = [0.22, 0.19, 0.16, 0.13, 0.09, 0.08, 0.07, 0.06];
  
  const roundAndBalance = (pot: number) => {
    const raw = percentages.map(p => Math.round(pot * p));
    const currentSum = raw.reduce((sum, v) => sum + v, 0);
    const diff = Math.round(pot) - currentSum;
    if (diff !== 0) raw[0] += diff; // Adjust 1st place by the $1 remainder to balance the pot
    return raw;
  };

  const weeklyPot = numPlayers * 7.0;
  const weeklyGross = roundAndBalance(weeklyPot);
  const weeklyNet = weeklyGross.map(g => g - 12); // Gross minus $12 weekly fee

  const half1Pot = half1Weeks * numPlayers * 1.75;
  const half1Payouts = roundAndBalance(half1Pot);

  const half2Pot = half2Weeks * numPlayers * 1.75;
  const half2Payouts = roundAndBalance(half2Pot);

  const seasonPot = totalWeeks * numPlayers * 1.25;
  const seasonPayouts = roundAndBalance(seasonPot);

  return {
    weeklyGross,
    weeklyNet,
    half1Payouts,
    half2Payouts,
    seasonPayouts
  };
}

// --- MAIN APP COMPONENT ---
function MainApp() {
  const [user, setUser] = useState<any>(null), [dbReady, setDbReady] = useState(false), [authLoaded, setAuthLoaded] = useState(false), [sessionLoaded, setSessionLoaded] = useState(false), [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard'), [selectedWeek, setSelectedWeek] = useState(1), [currentUserId, setCurrentUserId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]), [globalSettings, setGlobalSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false), [hasSaved, setHasSaved] = useState(false), [showPrintModal, setShowPrintModal] = useState(false), [showChangePassword, setShowChangePassword] = useState(false), [adminTab, setAdminTab] = useState('status'); 
  const [isSyncing, setIsSyncing] = useState(false), [showFanaticsResetConfirm, setShowFanaticsResetConfirm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null), [editUserForm, setEditUserForm] = useState<any>({}), [overrideUserId, setOverrideUserId] = useState<any>(null);
  const [seasonView, setSeasonView] = useState('Overall'), [seasonSortBy, setSeasonSortBy] = useState('points');
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false), [showResetConfirm, setShowResetConfirm] = useState(false), [adminForceReveal, setAdminForceReveal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null), [deadbeatsToConfirm, setDeadbeatsToConfirm] = useState<any>(null), [newUserForm, setNewUserForm] = useState({ firstName: '', lastName: '', nickname: '', email: '', role: 'user' });
  const [imgErrors, setImgErrors] = useState<any>({ logo: false });
  const handleImgError = (key: string) => setImgErrors((prev: any) => ({ ...prev, [key]: true }));

  const maxActiveWeeks = globalSettings?.maxActiveWeeks || 18;
  const [settlementPreview, setSettlementPreview] = useState<{
    type: string;
    title: string;
    payouts: number[];
    winners: any[];
  } | null>(null);

  const handlePrepareSettlement = (type: 'firstHalf' | 'secondHalf' | 'overall') => {
    const activeCount = allUsers.filter(u => u.playsConfidence).length;
    const matrix = calculateFanaticsPayouts(activeCount);
  
    let title = '';
    let payouts: number[] = [];
    let sortedUsers: any[] = [];
  
    const cpField = type === 'firstHalf' ? 'cpFirstHalf' : type === 'secondHalf' ? 'cpSecondHalf' : 'cpOverall';
    const fpField = type === 'firstHalf' ? 'fpFirstHalf' : type === 'secondHalf' ? 'fpSecondHalf' : 'fpOverall';
  
    if (type === 'firstHalf') {
      title = '1st Half Settlement (Weeks 4–12)';
      payouts = globalSettings?.seasonBonuses?.firstHalf || matrix.half1Payouts;
    } else if (type === 'secondHalf') {
      title = '2nd Half Settlement (Weeks 13–21)';
      payouts = globalSettings?.seasonBonuses?.secondHalf || matrix.half2Payouts;
    } else {
      title = 'Overall Season Settlement (Full Season)';
      payouts = globalSettings?.seasonBonuses?.overall || matrix.seasonPayouts;
    }
  
    sortedUsers = [...seasonStats].sort((a, b) => b[cpField] - a[cpField] || b[fpField] - a[fpField]).slice(0, 8);
  
    const winners = sortedUsers.map((u, idx) => ({
      rank: idx + 1,
      name: formatFullName(u),
      points: u[cpField] || 0,
      bonusAmount: payouts[idx] || 0
    }));
  
    setSettlementPreview({ type, title, payouts, winners });
  };
  
  const handleConfirmSettlement = async () => {
    if (!settlementPreview) return;
    setIsSaving(true);
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
      [`settlements.${settlementPreview.type}`]: {
        finalizedAt: new Date().toISOString(),
        winners: settlementPreview.winners
      }
    });
  
    setIsSaving(false);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
    alert(`${settlementPreview.title} finalized and awarded successfully!`);
    setSettlementPreview(null);
  };

  useEffect(() => {
    const initAuth = async () => { try { if (typeof (window as any).__initial_auth_token !== 'undefined' && (window as any).__initial_auth_token) { await signInWithCustomToken(auth, (window as any).__initial_auth_token); } else { await signInAnonymously(auth); } } catch (err) { console.error(err); } };
    initAuth();
    return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoaded(true); });
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (!user) { setSessionLoaded(true); return; }
    return onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().currentUserId) { 
          setCurrentUserId(docSnap.data().currentUserId); 
          setIsLoggedIn(true); 
          setActiveTab('dashboard');
        } 
        else { setIsLoggedIn(false); setCurrentUserId(''); }
        setSessionLoaded(true);
    });
  }, [user, authLoaded]);

  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalSettings({ ...data, maxActiveWeeks: data.maxActiveWeeks || 18, fpPayouts: data.fpPayouts || [100, 80, 70, 60, 50, 40, 30, 20] });
      } else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { maxActiveWeeks: 18, weekStates: { 1: 'open', 2: 'open', 3: 'open', 4: 'open' }, actualTiebreakers: { 1: 0, 2: 0, 3: 0, 4: 0 }, games: initialGamesByWeek, fpPayouts: [100, 80, 70, 60, 50, 40, 30, 20], seasonBonuses: { firstHalf: [500, 400, 300, 200, 100, 50, 25, 10], secondHalf: [500, 400, 300, 200, 100, 50, 25, 10], overall: [1000, 800, 600, 400, 200, 100, 50, 25] }, knockoutSession: 1, announcement: "Welcome to Hanover Football Fanatics! Submit your picks before the first game kicks off." });
    });
    const unsubPlayers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'players'), async (snapshot) => {
      if (snapshot.empty) { const batch = writeBatch(db); INITIAL_USERS.forEach(u => { batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'players'), u.id), u); }); await batch.commit(); } 
      else { const loadedUsers: any[] = []; snapshot.forEach(d => loadedUsers.push(d.data())); setAllUsers(loadedUsers); }
    });
    return () => { unsubSettings(); unsubPlayers(); };
  }, [user]);

  useEffect(() => { 
    if (globalSettings && allUsers.length > 0 && !dbReady) { 
        const availableWeeks = Array.from({ length: maxActiveWeeks }, (_, i) => i + 1);
        setSelectedWeek(availableWeeks.find(w => globalSettings.weekStates?.[w] !== 'closed') || 1); 
        setDbReady(true); 
    } 
  }, [globalSettings, allUsers, dbReady, maxActiveWeeks]);

  useEffect(() => { setAdminForceReveal(false); }, [selectedWeek]);

  const sessionUser = allUsers.find(u => u.id === currentUserId);
  const currentUser = overrideUserId ? (allUsers.find(u => u.id === overrideUserId) || sessionUser) : sessionUser;
  const isAdmin = sessionUser?.role === 'admin';
  const games = useMemo(() => {
    const rawGames = globalSettings?.games?.[selectedWeek] || [];
    return [...rawGames].sort((a: any, b: any) => {
      const parseTime = (t: string) => {
        if (!t) return 0;
        const match = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (!match) return 0;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        if (match[3].toUpperCase() === 'PM' && h !== 12) h += 12;
        if (match[3].toUpperCase() === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };
      
      const timeA = parseTime(a.time);
      const timeB = parseTime(b.time);
      if (a.date === b.date) return timeA - timeB;
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      
      if (!isNaN(dateA) && !isNaN(dateB)) return (dateA + timeA * 60000) - (dateB + timeB * 60000);
      return 0;
    });
  }, [globalSettings?.games, selectedWeek]);
  
  const currentWeekState = globalSettings?.weekStates?.[selectedWeek] || 'open';
  const lockdownTime = getLockdownTime(games);
  const isPastLockdown = lockdownTime && Date.now() >= lockdownTime;
  const isWeekLocked = currentWeekState === 'locked' || currentWeekState === 'closed' || (currentWeekState === 'open' && isPastLockdown);
  const isWeekClosed = currentWeekState === 'closed';

  useEffect(() => {
    if (dbReady && currentUser && activeTab !== 'dashboard') {
      if (activeTab === 'confidence' && !currentUser.playsConfidence) setActiveTab(currentUser.playsKnockout ? 'knockout' : 'standings');
      else if (activeTab === 'knockout' && !currentUser.playsKnockout) setActiveTab(currentUser.playsConfidence ? 'confidence' : 'standings');
      else if (activeTab === 'c-tracker' && !currentUser.playsConfidence) setActiveTab(currentUser.playsKnockout ? 'k-tracker' : 'standings');
      else if (activeTab === 'k-tracker' && !currentUser.playsKnockout) setActiveTab(currentUser.playsConfidence ? 'c-tracker' : 'standings');
    }
  }, [dbReady, currentUser, activeTab]);

  const totalGames = games.length;
  const currentUserPicks = currentUser?.picks?.[selectedWeek] || {};
  const currentUserRanks = currentUser?.ranks?.[selectedWeek] || {};

  const weeklyTrackerData = useMemo(() => {
    if (!globalSettings || !allUsers.length) return [];
    const actualTotal = globalSettings?.actualTiebreakers?.[selectedWeek] || 0;
    
    const usersWithScores = allUsers.filter(u => u.playsConfidence).map(user => { 
      return { 
        ...user, 
        confidenceScore: calculatePoints(user.picks?.[selectedWeek] || {}, user.ranks?.[selectedWeek] || {}, games), 
        tbDiff: Math.abs(parseInt(user.tiebreakers?.[selectedWeek] || 0) - actualTotal) 
      }; 
    });

    usersWithScores.forEach(user => { 
      const tiedUsers = usersWithScores.filter(u => u.confidenceScore === user.confidenceScore); 
      if (tiedUsers.length > 1) { 
        const minTbDiff = Math.min(...tiedUsers.map(u => u.tbDiff)); 
        if (minTbDiff !== Math.max(...tiedUsers.map(u => u.tbDiff)) && user.tbDiff === minTbDiff) {
          user.wonTiebreaker = true; 
        }
      } 
    });

    usersWithScores.sort((a, b) => { 
      if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore; 
      if (a.tbDiff !== b.tbDiff) return a.tbDiff - b.tbDiff; 
      return String(a.lastName || '').localeCompare(String(b.lastName || '')); 
    });

    const finalData = usersWithScores.map(u => ({ ...u, weeklyRank: 0, weeklyFP: -12 }));
    const grouped: any[] = [];

    usersWithScores.forEach(u => { 
      const key = `${u.confidenceScore}-${u.tbDiff}`; 
      const group = grouped.find(g => g.key === key); 
      if (group) group.members.push(u.id); 
      else grouped.push({ key, members: [u.id] }); 
    });

    let processedCount = 0;
    let totalRoundingDollarsLost = 0;

    grouped.forEach((group) => {
        const startRank = processedCount + 1;
        const endRank = processedCount + group.members.length;
        
        let pointsPool = 0; 
        for (let r = startRank; r <= endRank; r++) {
          if (r <= 8 && globalSettings?.fpPayouts) {
            pointsPool += (globalSettings.fpPayouts[r - 1] || 0);
          }
        }

        const rawShare = group.members.length > 0 ? (pointsPool / group.members.length) : 0;
        
        const grossPayout = rawShare > 0 ? Math.ceil(rawShare) : 0;
        const netFP = grossPayout - 12;

        const totalPaidOutForGroup = grossPayout * group.members.length;
        if (totalPaidOutForGroup > pointsPool) {
          totalRoundingDollarsLost += (totalPaidOutForGroup - pointsPool);
        }

        group.members.forEach((id: string) => { 
          const ui = finalData.findIndex(d => d.id === id); 
          if (ui === -1) return; 
          finalData[ui].weeklyRank = startRank; 
          
          finalData[ui].weeklyFP = (isWeekClosed && finalData[ui].weeklyFantasyHistory?.[selectedWeek] !== undefined) 
            ? finalData[ui].weeklyFantasyHistory[selectedWeek] 
            : netFP; 

          finalData[ui].displayRank = (!isWeekClosed && finalData[ui].confidenceScore === 0) ? 1 : startRank; 
        });

        processedCount += group.members.length;
    });

    return finalData;
  }, [allUsers, globalSettings, selectedWeek, games, isWeekClosed]);

  const knockoutTrackerData = useMemo(() => {
    if (!globalSettings || !allUsers.length) return [];
    return allUsers.filter(u => u.playsKnockout).map(u => {
        let status = 'Alive', eliminatedWeek = null;
        for (let wk = 1; wk < selectedWeek; wk++) if (globalSettings.weekStates?.[wk] === 'closed' && ['Loser', 'Loser (No Pick)', 'No Pick', undefined].includes(u.knockoutStatuses?.[wk])) { eliminatedWeek = wk; break; }
        if (u.paymentStatus === 'disqualified') status = 'Knocked Out';
        else if (eliminatedWeek !== null) status = 'Knocked Out';
        else if (!u.knockoutPicks?.[selectedWeek]) status = currentWeekState === 'closed' ? 'Knocked Out' : 'Alive';
        else { const game = games.find((g: any) => g.away === u.knockoutPicks[selectedWeek] || g.home === u.knockoutPicks[selectedWeek]); if (currentWeekState === 'closed') status = u.knockoutStatuses?.[selectedWeek] === 'Winner' ? 'Alive' : 'Knocked Out'; else if (game?.status === 'final') status = (game.winner === 'TIE' || game.winner !== u.knockoutPicks[selectedWeek]) ? 'Knocked Out' : 'Alive'; else status = 'Alive'; }
        return { ...u, currentStatus: status, pick: u.knockoutPicks?.[selectedWeek], eliminatedWeek };
      }).sort((a, b) => {
        const order: any = { 'Alive': 1, 'Knocked Out': 2 };
        if ((order[a.currentStatus] || 99) !== (order[b.currentStatus] || 99)) return (order[a.currentStatus] || 99) - (order[b.currentStatus] || 99);
        return String(a.firstName || '').localeCompare(String(b.firstName || ''));
      });
  }, [allUsers, globalSettings, selectedWeek, currentWeekState, games]);

  const seasonStats = useMemo(() => {
    if (!globalSettings || !allUsers.length) return [];
    
    const activeCpField = seasonView === '1st Half' ? 'cpFirstHalf' : seasonView === '2nd Half' ? 'cpSecondHalf' : 'cpOverall';
    const activeFpField = seasonView === '1st Half' ? 'fpFirstHalf' : seasonView === '2nd Half' ? 'fpSecondHalf' : 'fpOverall';

    const baseStats = allUsers.filter(u => u.playsConfidence).map(user => {
      let cp1 = 0, cp2 = 0, cpo = 0;
      let fp1 = 0, fp2 = 0, fpo = 0;

      for (let wk = 4; wk <= 21; wk++) {
        if (globalSettings.weekStates?.[wk] === 'closed') {
          const cp = parseFloat(user.weeklyConfidenceHistory?.[wk]) || 0;
          const fp = parseFloat(user.weeklyFantasyHistory?.[wk]) || -12;

          if (wk <= 12) {
            cp1 += cp;
            fp1 += fp;
          } 
          else {
            cp2 += cp;
            fp2 += fp;
          }

          cpo += cp;
          fpo += fp;
        }
      }

      return {
        ...user,
        cpFirstHalf: cp1,
        cpSecondHalf: cp2,
        cpOverall: cpo,
        fpFirstHalf: fp1,
        fpSecondHalf: fp2,
        fpOverall: fpo
      };
    });

    const sorted = baseStats.sort((a, b) => {
      if (seasonSortBy === 'points') {
        return b[activeCpField] !== a[activeCpField] 
          ? b[activeCpField] - a[activeCpField] 
          : b[activeFpField] - a[activeFpField];
      } else {
        return b[activeFpField] !== a[activeFpField] 
          ? b[activeFpField] - a[activeFpField] 
          : b[activeCpField] - a[activeCpField];
      }
    });

    let rank = 1;
    sorted.forEach((u, i) => {
      if (i > 0 && u[seasonSortBy === 'points' ? activeCpField : activeFpField] < sorted[i - 1][seasonSortBy === 'points' ? activeCpField : activeFpField]) {
        rank = i + 1;
      }
      u.displayRank = rank;
    });

    return sorted;
  }, [allUsers, globalSettings, seasonView, seasonSortBy, maxActiveWeeks]);

  const fullyPickedCount = currentUser ? games.filter((g: any) => currentUser?.picks?.[selectedWeek]?.[g.id] && currentUser?.ranks?.[selectedWeek]?.[g.id]).length : 0;
  const totalItemsRequired = totalGames > 0 ? totalGames + 1 : 0;
  const hasTiebreaker = (currentUser?.tiebreakers?.[selectedWeek] || '').toString().trim() !== '';
  const totalItemsCompleted = fullyPickedCount + (hasTiebreaker ? 1 : 0);
  const progressPercentage = totalItemsRequired > 0 ? (totalItemsCompleted / totalItemsRequired) * 100 : 0;

  const isCompleteFanatics = fullyPickedCount === totalGames && totalGames > 0 && hasTiebreaker;
  const isCompleteKnockout = !!currentUser?.knockoutPicks?.[selectedWeek];
  const isKnockedOut = wasAlreadyOut(currentUser, selectedWeek, globalSettings?.weekStates);

  const statusSummary = useMemo(() => {
    if (!allUsers || !allUsers.length) return { completed: [], inProgress: [], notStarted: [] };
    const statuses = allUsers.filter(u => u.playsConfidence).map(user => {
      const picksCount = (games || []).filter((g: any) => user.picks?.[selectedWeek]?.[g.id] && user.ranks?.[selectedWeek]?.[g.id]).length;
      return { ...user, status: (picksCount === totalGames && totalGames > 0 && (user.tiebreakers?.[selectedWeek] || '').toString().trim() !== '') ? 'Completed' : (picksCount > 0 ? 'In Progress' : 'Not Started') };
    });
    return { notStarted: statuses.filter(u => u.status === 'Not Started'), inProgress: statuses.filter(u => u.status === 'In Progress'), completed: statuses.filter(u => u.status === 'Completed') };
  }, [allUsers, totalGames, selectedWeek, games]);

  const knockoutStatusSummary = useMemo(() => {
    if (!globalSettings || !allUsers || !allUsers.length) return { submitted: [], waiting: [] };
    const activePlayers = allUsers.filter(u => u.playsKnockout && !wasAlreadyOut(u, selectedWeek, globalSettings.weekStates));
    return { waiting: activePlayers.filter(u => !u.knockoutPicks?.[selectedWeek]), submitted: activePlayers.filter(u => !!u.knockoutPicks?.[selectedWeek]) };
  }, [allUsers, globalSettings, selectedWeek]);

  // --- MISSING EMAIL HELPERS ---
  const getMissingEmailsList = () => {
    const missingUsers = [...(statusSummary?.inProgress || []), ...(statusSummary?.notStarted || [])];
    return missingUsers.map(u => u.email).filter(e => e && e.trim() !== '');
  };

  const handleCopyMissingEmails = () => {
    const emails = getMissingEmailsList();
    if (emails.length === 0) return alert("All active players have submitted their picks!");
    const formattedString = emails.join(', ');
    navigator.clipboard.writeText(formattedString);
    alert(`Copied ${emails.length} email addresses to your clipboard!`);
  };

  const handleEmailReminders = () => {
    const emails = getMissingEmailsList();
    if (emails.length > 0) {
      window.location.href = `mailto:?bcc=${emails.join(',')}&subject=Hanover Fanatics - Missing Picks&body=Hey everyone,%0D%0A%0D%0APlease don't forget to submit your picks for Week ${selectedWeek}!`;
    } else {
      alert("All active players have submitted their picks!");
    }
  };

  // --- QUICK PICKS AUTO-FILL HELPERS ---
  const handleConfidenceQuickPicks = async (forAll = false) => { 
    const usersToUpdate = forAll ? allUsers.filter(u => u.playsConfidence) : [currentUser]; 
    const batch = writeBatch(db); 
    usersToUpdate.forEach(u => { 
      const newPicks = { ...(u.picks[selectedWeek] || {}) }, newRanks = { ...(u.ranks[selectedWeek] || {}) }, availableRanks = Array.from({ length: totalGames }, (_, i) => i + 1); 
      for (let i = availableRanks.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [availableRanks[i], availableRanks[j]] = [availableRanks[j], availableRanks[i]]; 
      } 
      games.forEach((g: any, idx: number) => { 
        newPicks[g.id] = Math.random() > 0.5 ? g.away : g.home; 
        newRanks[g.id] = availableRanks[idx]; 
      }); 
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { 
        [`picks.${selectedWeek}`]: newPicks, 
        [`ranks.${selectedWeek}`]: newRanks, 
        [`tiebreakers.${selectedWeek}`]: String(Math.floor(Math.random() * 30) + 30) 
      }); 
    }); 
    setIsSaving(true); 
    try { await batch.commit(); } catch (e) { console.error(e); } 
    setIsSaving(false); 
    setHasSaved(true); 
    setTimeout(() => setHasSaved(false), 2000); 
  };

  const handleKnockoutQuickPick = async (forAll = false) => { 
    const usersToUpdate = forAll ? allUsers.filter(u => u.playsKnockout) : [currentUser]; 
    const batch = writeBatch(db); 
    let hasUpdates = false; 
    usersToUpdate.forEach(u => { 
      if (wasAlreadyOut(u, selectedWeek, globalSettings.weekStates)) return; 
      const usedTeams = Object.values(u.knockoutPicks || {}), availableTeams = games.flatMap((g: any) => [g.away, g.home]).filter((t: any) => !usedTeams.includes(t)); 
      if (availableTeams.length > 0) { 
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { 
          [`knockoutPicks.${selectedWeek}`]: availableTeams[Math.floor(Math.random() * availableTeams.length)] 
        }); 
        hasUpdates = true; 
      } 
    }); 
    if (hasUpdates) { 
      setIsSaving(true); 
      try { await batch.commit(); } catch (e) { console.error(e); } 
      setIsSaving(false); 
      setHasSaved(true); 
      setTimeout(() => setHasSaved(false), 2000); 
    } 
  };

  // --- API SPORTS MANAGE WEEKS INTEGRATION ---
  const handleForceFixGames = async () => {
    setIsSaving(true);
    try {
        const fixedGames = games.map((g: any) => ({
            ...g,
            awayAbbr: g.awayAbbr || g.away,
            homeAbbr: g.homeAbbr || g.home
        }));
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { 
            [`games.${selectedWeek}`]: fixedGames 
        });
        alert("Games scrubbed and formatted successfully.");
    } catch (e) {
        console.error("Force fix error:", e);
        alert("Error fixing games.");
    } finally {
        setIsSaving(false);
    }
  };

  const parseApiGameTime = (gameObj: any) => {
    try {
      const datePart = gameObj?.date?.date || (typeof gameObj?.date === 'string' ? gameObj.date : '') || gameObj?.apiDate || '';
      const timePart = gameObj?.date?.time || gameObj?.time || '';

      let rawDate: Date;

      if (datePart && timePart && !datePart.includes('T')) {
        const isoCombined = `${datePart.trim()}T${timePart.trim()}:00Z`;
        rawDate = new Date(isoCombined);
      } else if (datePart) {
        const formattedIso = datePart.includes('T') ? datePart : `${datePart}T12:00:00Z`;
        rawDate = new Date(formattedIso);
      } else if (typeof gameObj?.timestamp === 'number') {
        rawDate = new Date(gameObj.timestamp < 10000000000 ? gameObj.timestamp * 1000 : gameObj.timestamp);
      } else {
        rawDate = new Date();
      }

      if (isNaN(rawDate.getTime())) {
        rawDate = new Date();
      }

      const dateStr = rawDate.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });

      const timeStr = rawDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });

      return { dateStr, timeStr, isoDate: rawDate.toISOString() };
    } catch (err) {
      console.error("Date Parsing Error:", err);
      return { dateStr: 'TBD', timeStr: 'TBD', isoDate: new Date().toISOString() };
    }
  };

  const handleImportSingleWeek = async (weekNum: number) => {
    if (!globalSettings?.apiSportsKey) return alert("Please set your API-Sports Key in settings.");

    setIsSyncing(true);
    try {
      const apiKey = globalSettings.apiSportsKey.trim();
      const headers = { 'x-apisports-key': apiKey };
      const seasonYear = "2026";

      const seasonGamesUrl = `https://v1.american-football.api-sports.io/games?league=1&season=${seasonYear}`;
      const res = await fetch(seasonGamesUrl, { headers });
      const json = await res.json();
      const allGames = json.response || [];

      if (allGames.length === 0) {
        alert(`No games returned from API-Sports for season ${seasonYear}.`);
        setIsSyncing(false);
        return;
      }

      let targetGames: any[] = [];
      let weekTitle = "";

      const isAugustGame = (g: any) => {
        const dateVal = g.game?.date?.date || g.game?.date || '';
        const month = new Date(dateVal).getMonth() + 1;
        return month === 8;
      };

      if (weekNum === 1) {
        weekTitle = "Preseason Week 1";
        const hofGame = allGames.filter((g: any) => String(g.game?.week || '').includes("Hall of Fame"));
        const week1PreGames = allGames.filter((g: any) => String(g.game?.week || '') === "Week 1" && isAugustGame(g));
        targetGames = [...hofGame, ...week1PreGames];

      } else if (weekNum === 2) {
        weekTitle = "Preseason Week 2";
        targetGames = allGames.filter((g: any) => String(g.game?.week || '') === "Week 2" && isAugustGame(g));

      } else if (weekNum === 3) {
        weekTitle = "Preseason Week 3";
        targetGames = allGames.filter((g: any) => String(g.game?.week || '') === "Week 3" && isAugustGame(g));

      } else if (weekNum === 4) {
        weekTitle = "Regular Season Week 1";
        targetGames = allGames.filter((g: any) => String(g.game?.week || '') === "Week 1" && !isAugustGame(g));

      } else if (weekNum === 5) {
        weekTitle = "Regular Season Week 2";
        targetGames = allGames.filter((g: any) => String(g.game?.week || '') === "Week 2" && !isAugustGame(g));

      } else if (weekNum === 6) {
        weekTitle = "Regular Season Week 3";
        targetGames = allGames.filter((g: any) => String(g.game?.week || '') === "Week 3" && !isAugustGame(g));

      } else {
        const regWeekNum = weekNum - 3;
        weekTitle = `Regular Season Week ${regWeekNum}`;
        targetGames = allGames.filter((g: any) => String(g.game?.week || '') === `Week ${regWeekNum}`);
      }

      if (targetGames.length === 0) {
        alert(`No games found for ${weekTitle} (Slot ${weekNum}).`);
        setIsSyncing(false);
        return;
      }

      const uniqueMap = new Map();
      targetGames.forEach((match: any) => {
        if (match.game?.id) uniqueMap.set(match.game.id, match);
      });
      const cleanGames = Array.from(uniqueMap.values());

      const newGames = cleanGames.map((match: any) => {
        const awayCode = match.teams?.away?.code || match.teams?.away?.name?.substring(0, 3).toUpperCase() || 'AWY';
        const homeCode = match.teams?.home?.code || match.teams?.home?.name?.substring(0, 3).toUpperCase() || 'HME';
        
        const { dateStr, timeStr, isoDate } = parseApiGameTime(match.game);

        return {
          id: match.game?.id || Math.floor(Math.random() * 100000),
          away: awayCode,
          home: homeCode,
          awayAbbr: awayCode,
          homeAbbr: homeCode,
          awayName: match.teams?.away?.name || 'Away',
          homeName: match.teams?.home?.name || 'Home',
          date: dateStr,
          apiDate: isoDate.split('T')[0],
          time: timeStr,
          status: match.game?.status?.short || 'upcoming'
        };
      });

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
        [`games.${weekNum}`]: newGames
      });

      alert(`Successfully loaded ${newGames.length} games into ${weekTitle}!`);

    } catch (e) {
      console.error("Error importing week:", e);
      alert(`Failed to import Week ${weekNum}.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncWeekTimes = async (weekNum: number) => {
    if (!globalSettings?.apiSportsKey) return alert("Please set your API-Sports Key in settings.");

    setIsSyncing(true);
    try {
      const apiKey = globalSettings.apiSportsKey.trim();
      const headers = { 'x-apisports-key': apiKey };
      const seasonYear = "2026";

      const existingWeekGames = globalSettings?.games?.[weekNum] || [];
      if (existingWeekGames.length === 0) {
        alert(`Slot ${weekNum} has no existing games loaded to update.`);
        setIsSyncing(false);
        return;
      }

      const url = `https://v1.american-football.api-sports.io/games?league=1&season=${seasonYear}`;
      const res = await fetch(url, { headers });
      const json = await res.json();
      const freshGames = json.response || [];

      if (freshGames.length === 0) {
        alert(`Could not retrieve fresh schedule for season ${seasonYear}.`);
        setIsSyncing(false);
        return;
      }

      let updatedCount = 0;
      const updatedGames = existingWeekGames.map((game: any) => {
        const match = freshGames.find((fg: any) => 
          String(fg.game?.id) === String(game.id) ||
          (fg.teams?.away?.code === game.away && fg.teams?.home?.code === game.home)
        );

        if (match) {
          const { dateStr, timeStr, isoDate } = parseApiGameTime(match.game);
          if (game.time !== timeStr || game.date !== dateStr) updatedCount++;
          return {
            ...game,
            date: dateStr,
            time: timeStr,
            apiDate: isoDate.split('T')[0],
            status: match.game?.status?.short || game.status
          };
        }
        return game;
      });

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
        [`games.${weekNum}`]: updatedGames
      });

      const displayTitle = weekNum <= 3 ? `Preseason W${weekNum}` : `Week ${weekNum - 3}`;
      alert(`Updated ${displayTitle}! ${updatedCount} game kickoff time(s) adjusted.`);

    } catch (e) {
      console.error("Error syncing times:", e);
      alert(`Failed to sync game times for slot ${weekNum}.`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSyncAllWeekTimes = async () => {
    if (!globalSettings?.apiSportsKey) return alert("Please set your API-Sports Key in settings.");

    setIsSyncing(true);
    try {
      const apiKey = globalSettings.apiSportsKey.trim();
      const headers = { 'x-apisports-key': apiKey };
      const seasonYear = "2026";

      const url = `https://v1.american-football.api-sports.io/games?league=1&season=${seasonYear}`;
      const res = await fetch(url, { headers });
      const json = await res.json();
      const freshGames = json.response || [];

      if (freshGames.length === 0) {
        alert(`Could not retrieve schedule data for ${seasonYear}.`);
        setIsSyncing(false);
        return;
      }

      const updates: Record<string, any> = {};
      let totalAdjustedGames = 0;
      let totalUpdatedWeeks = 0;

      for (let wNum = 1; wNum <= 21; wNum++) {
        const existingWeekGames = globalSettings?.games?.[wNum] || [];
        if (existingWeekGames.length > 0) {
          let weekAdjustedCount = 0;
          const updatedGames = existingWeekGames.map((game: any) => {
            const match = freshGames.find((fg: any) => 
              String(fg.game?.id) === String(game.id) ||
              (fg.teams?.away?.code === game.away && fg.teams?.home?.code === game.home)
            );

            if (match) {
              const { dateStr, timeStr, isoDate } = parseApiGameTime(match.game);
              if (game.time !== timeStr || game.date !== dateStr) {
                weekAdjustedCount++;
              }
              return {
                ...game,
                date: dateStr,
                time: timeStr,
                apiDate: isoDate.split('T')[0],
                status: match.game?.status?.short || game.status
              };
            }
            return game;
          });

          updates[`games.${wNum}`] = updatedGames;
          totalAdjustedGames += weekAdjustedCount;
          totalUpdatedWeeks++;
        }
      }

      if (Object.keys(updates).length === 0) {
        alert("No populated weeks were found to sync.");
        setIsSyncing(false);
        return;
      }

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), updates);
      alert(`Successfully synced all ${totalUpdatedWeeks} loaded weeks! (${totalAdjustedGames} game kickoffs adjusted).`);

    } catch (e) {
      console.error("Bulk Sync Error:", e);
      alert("Failed to bulk sync season times.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearSingleWeek = async (weekNum: number) => {
    if (!confirm(`Are you sure you want to delete all games in Week ${weekNum}?`)) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
        [`games.${weekNum}`]: deleteField()
      });
      alert(`Week ${weekNum} cleared.`);
    } catch (e) {
      console.error("Error clearing week:", e);
    }
  };

  const handleSyncScores = async () => {
    if (!globalSettings?.apiSportsKey) return alert("Please enter your API-Sports Key in the Admin Settings tab.");
    if (globalSettings?.blockLiveSync) return alert("Sync is locked by Admin Site Settings.");

    setIsSyncing(true);
    try {
        const datesToFetch = [...new Set(games.map((g: any) => g.apiDate).filter(Boolean))];
        if (datesToFetch.length === 0) {
             alert("No games found to sync. Import a schedule first.");
             setIsSyncing(false);
             return;
        }
        
        let apiGames: any[] = [];
        for (const date of datesToFetch) {
            const season = String(date).split('-')[0];
            const res = await fetch(`https://v1.american-football.api-sports.io/games?league=1&season=${season}&date=${date}`, {
                headers: { 'x-apisports-key': globalSettings.apiSportsKey }
            });
            const json = await res.json();
            if (json.response) apiGames = [...apiGames, ...json.response];
        }
        
        const updatedGames = games.map((g: any) => {
            const match = apiGames.find(ag => String(ag.game?.id) === String(g.id) || (ag.teams?.away?.code === g.away && ag.teams?.home?.code === g.home));

            if (match) {
                const shortStatus = match.game?.status?.short || '';
                const isFinal = ['FT', 'AOT'].includes(shortStatus);
                const isLive = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'LIVE'].includes(shortStatus);
                
                const homeTotal = match.scores?.home?.total;
                const awayTotal = match.scores?.away?.total;
                
                let winner = g.winner;
                if (isFinal && homeTotal !== null && awayTotal !== null) {
                    if (homeTotal > awayTotal) winner = g.home;
                    else if (awayTotal > homeTotal) winner = g.away;
                    else winner = 'TIE';
                }
                
                let statusText = 'upcoming';
                if (isFinal) {
                    statusText = 'final';
                } else if (isLive) {
                    statusText = shortStatus === 'HT' ? 'HALFTIME' : (match.game?.status?.long || shortStatus);
                }

                return { 
                    ...g, 
                    status: statusText, 
                    homeScore: homeTotal !== undefined ? homeTotal : null, 
                    awayScore: awayTotal !== undefined ? awayTotal : null,
                    winner: winner
                };
            }
            return g;
        });
        
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { 
          [`games.${selectedWeek}`]: updatedGames 
        });
        alert("NFL scores synced successfully!");
    } catch (e) {
        console.error("Score Sync Error:", e);
        alert("Failed to sync live scores.");
    } finally {
        setIsSyncing(false);
    }
  };

  const trackSaving = async (savePromise: any) => { setIsSaving(true); try { await savePromise; } catch (e) { console.error(e); } setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  const handleChangePassword = async (userId: string, newPassword: string) => { setIsSaving(true); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), { password: newPassword, requiresPasswordChange: false, lastPasswordReset: new Date().toISOString() }); setIsSaving(false); };
  const updateKnockoutPick = (userId: string, week: number, team: string) => { if (!wasAlreadyOut(allUsers.find(u => u.id === userId), week, globalSettings.weekStates)) trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), { [`knockoutPicks.${week}`]: team })); };
  const updateUserPicks = (userId: string, gameId: number, team: string) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), { [`picks.${selectedWeek}`]: { ...(allUsers.find(u => u.id === userId)?.picks?.[selectedWeek] || {}), [gameId]: team } }));
  const updateUserRank = (userId: string, gameId: number, rankValue: string) => {
    const currentWeekRanks = { ...(allUsers.find(u => u.id === userId)?.ranks?.[selectedWeek] || {}) };
    if (!rankValue || rankValue === "") delete currentWeekRanks[gameId];
    else { const newRank = parseInt(rankValue, 10); const existingGameId = Object.keys(currentWeekRanks).find(id => currentWeekRanks[id] === newRank); if (existingGameId) delete currentWeekRanks[existingGameId]; currentWeekRanks[gameId] = newRank; }
    trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), { [`ranks.${selectedWeek}`]: currentWeekRanks }));
  };
  const handleEditUser = (userId: string, field: string, val: any) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), { [field]: val }));
  
  const saveInlineUserEdit = async (userId: string) => { 
    setIsSaving(true); 
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), { 
      firstName: editUserForm.firstName, 
      lastName: editUserForm.lastName, 
      username: (editUserForm.username || '').toLowerCase().trim(),
      nickname: editUserForm.nickname, 
      email: editUserForm.email, 
      password: editUserForm.password, 
      role: editUserForm.role || 'user' 
    }); 
    setEditingUserId(null); 
    setIsSaving(false); 
    setHasSaved(true); 
    setTimeout(() => setHasSaved(false), 2000); 
  };
  
  const handleAddUser = async () => { 
    if (!newUserForm.firstName || !newUserForm.lastName) return; 
    const newId = `u-${Date.now()}`; 
    const customUsername = (newUserForm as any).username?.trim() || 
      (newUserForm.firstName.charAt(0) + newUserForm.lastName).toLowerCase().replace(/[^a-z0-9]/g, ''); 
    
    setIsSaving(true); 
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', newId), { 
      id: newId, 
      firstName: newUserForm.firstName, 
      lastName: newUserForm.lastName, 
      nickname: newUserForm.nickname || '', 
      email: newUserForm.email || '', 
      username: customUsername.toLowerCase(), 
      password: customUsername.toLowerCase(), 
      requiresPasswordChange: true, 
      role: newUserForm.role || 'user', 
      paymentStatus: 'unpaid', 
      playsConfidence: true, 
      playsKnockout: true, 
      picks: {1:{},2:{},3:{},4:{}}, 
      ranks: {1:{},2:{},3:{},4:{}}, 
      tiebreakers: {1:'',2:'',3:'',4:''}, 
      knockoutPicks: {}, 
      knockoutStatuses: {}, 
      weeklyFantasyHistory: {}, 
      weeklyConfidenceHistory: {} 
    }); 
    setNewUserForm({ firstName: '', lastName: '', nickname: '', email: '', role: 'user' }); 
    setIsSaving(false); 
    setHasSaved(true); 
    setTimeout(() => setHasSaved(false), 2000); 
  };

  const handleBulkImportUsers = async (csvText: string) => {
    if (!csvText.trim()) return alert("Please paste valid user CSV data.");

    setIsSaving(true);
    try {
      const lines = csvText.split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length === 0) return alert("No valid lines found.");

      const startIdx = lines[0].toLowerCase().includes("first") ? 1 : 0;
      const batch = writeBatch(db);
      let count = 0;

      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(",").map(p => p.trim());
        if (parts.length < 2) continue;

        const firstName = parts[0];
        const lastName = parts[1];
        const nickname = parts[2] || "";
        const email = parts[3] || "";
        const paymentStatus = (parts[4] || "unpaid").toLowerCase();

        const newId = `u-${Date.now()}-${i}`;
        const baseUsername = (firstName.charAt(0) + lastName).toLowerCase().replace(/[^a-z0-9]/g, '');

        batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'players', newId), {
          id: newId,
          firstName,
          lastName,
          nickname,
          email,
          username: baseUsername,
          password: baseUsername,
          requiresPasswordChange: true,
          role: 'user',
          paymentStatus: ['paid', 'unpaid', 'disqualified'].includes(paymentStatus) ? paymentStatus : 'unpaid',
          playsConfidence: true,
          playsKnockout: true,
          picks: {1:{},2:{},3:{},4:{}},
          ranks: {1:{},2:{},3:{},4:{}},
          tiebreakers: {1:'',2:'',3:'',4:''},
          knockoutPicks: {},
          knockoutStatuses: {},
          weeklyFantasyHistory: {},
          weeklyConfidenceHistory: {}
        });
        count++;
      }

      if (count === 0) {
        alert("No valid users could be parsed from the input.");
        setIsSaving(false);
        return;
      }

      await batch.commit();
      alert(`Successfully imported ${count} users into Firestore with correct (First Initial + Last Name) usernames!`);
      const textarea = document.getElementById('bulkUserCsvInput') as HTMLTextAreaElement;
      if (textarea) textarea.value = "";
    } catch (e) {
      console.error("User import error:", e);
      alert("Failed to import users. Check console logs.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async (id: string) => { setIsSaving(true); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', id)); setConfirmDeleteId(null); setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  
  const handleResetKnockout = async () => { 
    const batch = writeBatch(db); 
    allUsers.forEach(u => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { knockoutPicks: {}, knockoutStatuses: {} })); 
    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { knockoutSession: (globalSettings.knockoutSession || 1) + 1 }); 
    setIsSaving(true); 
    await batch.commit(); 
    setIsSaving(false); 
    setHasSaved(true); 
    setTimeout(() => setHasSaved(false), 2000); 
    setShowResetConfirm(false); 
  };

  const handleResetFanatics = async () => { setIsSaving(true); try { const batch = writeBatch(db); allUsers.forEach(u => { batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { picks: {1:{},2:{},3:{},4:{}}, ranks: {1:{},2:{},3:{},4:{}}, tiebreakers: {1:'',2:'',3:'',4:''}, weeklyFantasyHistory: {}, weeklyConfidenceHistory: {} }); }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { weekStates: { 1: 'open', 2: 'open', 3: 'open', 4: 'open' }, actualTiebreakers: { 1: 0, 2: 0, 3: 0, 4: 0 }}); await batch.commit(); window.location.reload(); } catch (e) { console.error(e); setIsSaving(false); } };
  const updateGameResult = (gameId: number, resultType: string, teamId: string) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`games.${selectedWeek}`]: games.map((g: any) => g.id !== gameId ? g : (resultType === 'upcoming' ? { ...g, status: 'upcoming', winner: null } : { ...g, status: 'final', winner: resultType === 'TIE' ? 'TIE' : teamId })) }));
  const handleLockWeek = () => { const deadbeats: any[] = []; allUsers.forEach(u => { if (u.playsConfidence && (games.filter((g: any) => (u.picks?.[selectedWeek] || {})[g.id] && (u.ranks?.[selectedWeek] || {})[g.id]).length !== totalGames || String(u.tiebreakers?.[selectedWeek] || '').trim() === '')) deadbeats.push({ name: formatFullName(u), type: 'Fanatics' }); }); if (deadbeats.length > 0) setDeadbeatsToConfirm(deadbeats); else executeLockWeek(); };
  const executeLockWeek = async () => { const batch = writeBatch(db); allUsers.forEach(u => { if (!u.playsConfidence) return; const fullyPicked = games.filter((g: any) => (u.picks?.[selectedWeek]||{})[g.id] && (u.ranks?.[selectedWeek]||{})[g.id]).length === totalGames && String(u.tiebreakers?.[selectedWeek]||'').trim() !== ''; if (!fullyPicked) { const dp: any = {}, dr: any = {}; games.forEach((g: any) => { dp[g.id] = g.home; dr[g.id] = 5; }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { [`picks.${selectedWeek}`]: dp, [`ranks.${selectedWeek}`]: dr, [`tiebreakers.${selectedWeek}`]: '0' }); } }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`weekStates.${selectedWeek}`]: 'locked' }); setIsSaving(true); try { await batch.commit(); } catch (e) { console.error(e); } setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); setDeadbeatsToConfirm(null); };
  const handleCloseWeek = async () => { const batch = writeBatch(db); weeklyTrackerData.forEach(u => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { [`weeklyFantasyHistory.${selectedWeek}`]: u.weeklyFP, [`weeklyConfidenceHistory.${selectedWeek}`]: u.confidenceScore })); allUsers.forEach(u => { if (u.playsKnockout) { const pick = u.knockoutPicks?.[selectedWeek]; let status = 'No Pick'; if (pick) { const game = games.find((g: any) => g.away === pick || g.home === pick); if (game && game.status === 'final') status = game.winner === 'TIE' ? 'Loser' : (game.winner === pick ? 'Winner' : 'Loser'); else status = 'Undecided'; } batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { [`knockoutStatuses.${selectedWeek}`]: status }); } }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`weekStates.${selectedWeek}`]: 'closed' }); setIsSaving(true); try { await batch.commit(); } catch (e) { console.error(e); } setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  const handleOpenWeek = () => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`weekStates.${selectedWeek}`]: 'open' }));
  const updateFpPayouts = (index: number, val: number) => { const newPayouts = [...globalSettings.fpPayouts]; newPayouts[index] = val; trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { fpPayouts: newPayouts })); };
  const updateSeasonBonuses = (key: string, index: number, val: number) => { const newBonuses = { ...globalSettings.seasonBonuses }; newBonuses[key] = [...newBonuses[key]]; newBonuses[key][index] = val; trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { seasonBonuses: newBonuses })); };

  if (!dbReady || !sessionLoaded) return <div className="min-h-screen flex flex-col items-center justify-center text-white" style={fieldBackgroundStyle}><RefreshCw className="w-12 h-12 text-[#FFB81C] animate-spin mb-4" /><h1 className="text-2xl font-black italic uppercase tracking-widest text-[#FFB81C]">Syncing Database...</h1><p className="text-slate-400 font-bold mt-2">Connecting to live servers</p></div>;
  if (!isLoggedIn) return <LoginView users={allUsers} onLogin={async (id: string) => { setCurrentUserId(id); setOverrideUserId(null); setIsLoggedIn(true); setActiveTab('dashboard'); if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current'), { currentUserId: id }); }} imgError={imgErrors.logo} handleImgError={handleImgError} onChangePassword={handleChangePassword} />;
  if (isLoggedIn && !currentUser) return <div className="min-h-screen flex flex-col items-center justify-center text-white" style={fieldBackgroundStyle}><RefreshCw className="w-12 h-12 text-[#FFB81C] animate-spin mb-4" /><h1 className="text-2xl font-black italic uppercase tracking-widest text-[#FFB81C]">Loading Account...</h1></div>;

  const userPaymentStatus = currentUser.paymentStatus || 'unpaid', myStat = seasonStats.find(u => u.id === currentUser.id), firstPlacePoints = seasonStats[0]?.[seasonView === '1st Half' ? 'cpFirstHalf' : seasonView === '2nd Half' ? 'cpSecondHalf' : 'cpOverall'] || 0, knockoutStatus = knockoutTrackerData.find(u => u.id === currentUser.id)?.currentStatus, myRank = myStat?.displayRank || '-', myPoints = myStat?.cpOverall || 0, pointsBehind = firstPlacePoints - myPoints, rankChange = (myStat?.previousRank && myStat?.previousCpOverall > 0) ? (myStat.previousRank - myStat.displayRank) : 0;
  let displayKnockoutStatus = isKnockedOut ? 'Knocked Out' : 'Alive';

  return (
    <div className="min-h-screen font-sans text-slate-900 pb-24 md:pb-0 relative" style={fieldBackgroundStyle}>
      {showChangePassword && <ChangePasswordModal user={sessionUser} onClose={() => setShowChangePassword(false)} onSave={handleChangePassword} />}
      {deadbeatsToConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-white max-w-lg w-full rounded-3xl p-8 shadow-2xl animate-in zoom-in-95"><h2 className="text-2xl font-black italic uppercase text-red-600 mb-4 flex items-center gap-2"><AlertCircle /> Confirm Deadbeats</h2><p className="text-slate-600 font-bold mb-4">The following players have incomplete picks and will receive default deadbeat assignments:</p><div className="max-h-60 overflow-y-auto mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200">{deadbeatsToConfirm.length === 0 ? <p className="text-slate-400 italic">None! All active players have fully submitted picks.</p> : <ul className="space-y-2">{deadbeatsToConfirm.map((u: any, i: number) => <li key={i} className="font-black text-slate-800 flex items-center">{String(u.name)} <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded ml-2 border uppercase tracking-widest">{String(u.type)}</span></li>)}</ul>}</div><div className="flex gap-4"><button onClick={() => setDeadbeatsToConfirm(null)} className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button><button onClick={executeLockWeek} className="flex-1 px-6 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all">Lock & Apply</button></div></div></div>
      )}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-xl print:hidden border-b-4 border-[#FFB81C]">
        <div className="max-w-[1600px] mx-auto px-4 h-24 flex items-center justify-between overflow-hidden">
          <div className="flex items-center gap-4 h-full py-2"><div className="bg-white/5 p-2 rounded-2xl backdrop-blur-sm border border-white/10 flex items-center h-full gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>{!imgErrors.logo ? <img src="/hff-logo.png" alt="HFF Logo" className="h-14 md:h-16 w-auto object-contain drop-shadow-lg" onError={() => handleImgError('logo')} /> : <h1 className="text-xl md:text-2xl font-black italic uppercase tracking-tighter text-[#FFB81C]">Hanover Football Fanatics</h1>}</div></div>
          <div className="hidden lg:flex items-center gap-1 bg-white/10 rounded-full p-1 border border-white/10 backdrop-blur-md">
            <NavButton icon={Home} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            {currentUser?.playsConfidence && <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1"><NavButton icon={CalendarDays} label="Fanatics" active={activeTab === 'confidence'} onClick={() => setActiveTab('confidence')} /><NavButton icon={Users} label="F-Results" active={activeTab === 'c-tracker'} onClick={() => setActiveTab('c-tracker')} /><NavButton icon={Trophy} label="Standings" active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} /></div>}
            {currentUser?.playsKnockout && <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1"><NavButton icon={Skull} label="KnockOut" active={activeTab === 'knockout'} onClick={() => setActiveTab('knockout')} className="text-red-300 hover:text-red-100" /><NavButton icon={HeartPulse} label="KO-Results" active={activeTab === 'k-tracker'} onClick={() => setActiveTab('k-tracker')} className="text-red-300 hover:text-red-100" /></div>}
            <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1">
              <NavButton icon={BarChart2} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
            </div>
            {isAdmin && <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1"><NavButton icon={ShieldCheck} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} className="text-[#FFB81C]" /></div>}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end gap-1">
                {isAdmin ? <div className="flex items-center gap-2"><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Playing As</span><select value={overrideUserId || currentUserId} onChange={(e) => { setOverrideUserId(e.target.value); setActiveTab('dashboard'); }} className="bg-slate-800 text-[#FFB81C] border border-white/20 text-xs font-black uppercase py-1 px-2 rounded outline-none shadow-lg cursor-pointer max-w-[150px] truncate"><option value={currentUserId}>Yourself</option><option disabled>──────</option>{allUsers.filter(u => u.id !== currentUserId).map(u => <option key={u.id} value={u.id}>{String(u.firstName)} {String(u.lastName)}</option>)}</select></div> : <div className="flex items-center gap-2"><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Logged In As</span><span className="text-sm font-black uppercase text-white tracking-tighter truncate max-w-[150px]">{formatFullName(currentUser)}</span></div>}
                <div className="flex items-center gap-2 mt-1"><button onClick={() => setShowChangePassword(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-700"><KeyRound className="w-3 h-3"/> Password</button><button onClick={async () => { setIsLoggedIn(false); setCurrentUserId(''); setOverrideUserId(null); if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current')); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-700"><LogOut className="w-3 h-3"/> Logout</button></div>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#FFB81C] text-slate-900 flex items-center justify-center text-lg font-black shadow-lg border-2 border-white/20 flex-shrink-0">{String(currentUser.firstName?.[0] || 'U')}</div>
          </div>
        </div>
      </header>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t-2 border-[#FFB81C] z-40 print:hidden overflow-x-auto scrollbar-hide">
        <div className="flex justify-start items-center p-2 gap-2 min-w-max">
            <MobileNavButton icon={Home} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            {currentUser?.playsConfidence && <><MobileNavButton icon={CalendarDays} label="Fanatics" active={activeTab === 'confidence'} onClick={() => setActiveTab('confidence')} /><MobileNavButton icon={Users} label="F-Results" active={activeTab === 'c-tracker'} onClick={() => setActiveTab('c-tracker')} /><MobileNavButton icon={Trophy} label="Standings" active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} /></>}
            {currentUser?.playsKnockout && <><MobileNavButton icon={Skull} label="KnockOut" active={activeTab === 'knockout'} onClick={() => setActiveTab('knockout')} /><MobileNavButton icon={HeartPulse} label="KO-Results" active={activeTab === 'k-tracker'} onClick={() => setActiveTab('k-tracker')} /></>}
            <MobileNavButton icon={BarChart2} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
            {isAdmin && <MobileNavButton icon={ShieldCheck} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 py-6 print:hidden">
      {activeTab === 'dashboard' && (
            
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl border-b-8 border-[#FFB81C] relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20 hidden md:block">
                        {!imgErrors?.logo ? <img src="/hff-logo.png" alt="" className="w-96 h-96 object-contain" onError={() => handleImgError('logo')} /> : <Trophy className="w-96 h-96" />}
                    </div>
                    <div className="relative z-10 flex items-center gap-6 mb-8">
                        {!imgErrors?.logo && <img src="/hff-logo.png" alt="Logo" className="w-24 h-24 object-contain drop-shadow-xl md:hidden" onError={() => handleImgError('logo')} />}
                        <div>
                            <h2 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter mb-2">Welcome back,<br className="sm:hidden" /> <span className="text-[#FFB81C]">{String(currentUser.firstName)}!</span></h2>
                            <p className="text-slate-400 font-bold text-lg uppercase tracking-widest">Hanover Football Fanatics Portal</p>
                        </div>
                    </div>
                    
                    {globalSettings?.announcement && (
                        <div className="relative z-10 bg-white/10 border border-white/20 p-5 rounded-2xl max-w-3xl backdrop-blur-sm shadow-xl mb-4">
                            <h4 className="flex items-center gap-2 font-black uppercase text-[#FFB81C] text-sm tracking-widest mb-2"><Megaphone className="w-5 h-5" /> Admin Announcement</h4>
                            <p className="text-slate-200 font-medium leading-relaxed">{String(globalSettings.announcement || '')}</p>
                        </div>
                    )}

                    {/* 📍 MANUAL TIMEZONE-INDEPENDENT DATE & TIME FORMATTER 📍 */}
                    {(() => {
                        const isLiveNow = (games || []).some((g: any) => g.status === 'in_progress');
                        if (isLiveNow) {
                            return (
                                <div className="relative z-10 inline-flex items-center gap-2 bg-rose-600 text-white px-4 py-2 rounded-2xl font-black text-xs uppercase tracking-wider shadow-md animate-pulse">
                                    <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                                    GAMES LIVE NOW
                                </div>
                            );
                        }

                        const formatExactKickoff = (g: any) => {
                            if (!g) return 'Thu, Aug 6 at 8:00 PM';

                            const rawDate = String(g.kickoff || g.date || g.gameDate || '').trim();
                            const rawTime = String(g.gameTime || g.statusDetail || g.time || '8:00 PM').trim();

                            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

                            if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
                                const [y, m, d] = rawDate.split('-').map(Number);
                                const dateObj = new Date(y, m - 1, d);
                                const dayName = days[dateObj.getDay()];
                                const monthName = months[dateObj.getMonth()];
                                return `${dayName}, ${monthName} ${d} at ${rawTime}`;
                            }

                            if (rawDate && !rawDate.includes('12:00 AM')) {
                                return `${rawDate} at ${rawTime}`;
                            }

                            return `Thu, Aug 6 at ${rawTime}`;
                        };

                        const nonFinalGames = (games || []).filter((g: any) => g.status !== 'final');

                        if (nonFinalGames.length > 0) {
                            const nextGame = nonFinalGames[0];
                            const formattedDateTime = formatExactKickoff(nextGame);

                            return (
                                <div className="relative z-10 inline-flex items-center gap-2.5 bg-slate-800/90 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider backdrop-blur-sm shadow-lg">
                                    <Clock className="w-4 h-4 text-[#FFB81C]" />
                                    <span>Next Kickoff:</span>
                                    <span className="font-black text-[#FFB81C]">{formattedDateTime}</span>
                                    <span className="text-slate-400 font-bold">({nextGame.awayAbbr || nextGame.away} @ {nextGame.homeAbbr || nextGame.home})</span>
                                </div>
                            );
                        }

                        return (
                            <div className="relative z-10 inline-flex items-center gap-2 bg-slate-800/80 border border-slate-700 text-slate-400 px-4 py-2 rounded-2xl font-bold text-xs uppercase tracking-wider">
                                All Scheduled Games Complete
                            </div>
                        );
                    })()}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center"><CalendarDays className="w-10 h-10 text-indigo-500 mb-3" /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Current Active Week</div><div className="text-4xl font-black italic text-slate-900">{selectedWeek <= 3 ? `Preseason W${selectedWeek}` : `Week ${selectedWeek - 3}`}</div></div>
                    {currentUser.playsConfidence ? <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center cursor-pointer hover:border-[#FFB81C] transition-all" onClick={() => setActiveTab('standings')}><Trophy className="w-10 h-10 text-[#FFB81C]" /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fanatics Rank</div><div className="text-4xl font-black italic text-slate-900 mb-1">#{String(myRank)}</div>{pointsBehind > 0 && <div className="text-xs font-bold text-slate-500">{String(pointsBehind)} pts behind 1st</div>}{pointsBehind === 0 && myPoints > 0 && <div className="text-xs font-bold text-green-600">You are in 1st!</div>}{rankChange > 0 && <div className="text-xs font-bold text-green-500 mt-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3"/> Up {String(rankChange)} spots</div>}{rankChange < 0 && <div className="text-xs font-bold text-red-500 mt-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3"/> Down {String(Math.abs(rankChange))} spots</div>}</div> : <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200 flex flex-col justify-center items-center text-center opacity-50"><Trophy className="w-10 h-10 text-slate-400 mb-3" /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fanatics Pool</div><div className="text-sm font-bold text-slate-500 uppercase">Not Registered</div></div>}
                    {currentUser.playsKnockout ? <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center cursor-pointer hover:border-[#FFB81C] transition-all" onClick={() => setActiveTab('k-tracker')}><HeartPulse className={`w-10 h-10 mb-3 ${isKnockedOut ? 'text-red-500' : 'text-green-500'}`} /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">KnockOut Status</div><div className="text-2xl font-black italic text-slate-900 uppercase">{String(displayKnockoutStatus)}</div></div> : <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200 flex flex-col justify-center items-center text-center opacity-50"><Skull className="w-10 h-10 text-slate-400 mb-3" /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">KnockOut Pool</div><div className="text-sm font-bold text-slate-500 uppercase">Not Registered</div></div>}
                </div>
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center"><div><h3 className="text-xl font-black italic uppercase text-slate-900">Action Required</h3><p className="text-sm text-slate-500 font-bold mt-1">Your {selectedWeek <= 3 ? `Preseason Week ${selectedWeek}` : `Week ${selectedWeek - 3}`} checklist</p></div>{lockdownTime && globalSettings?.weekStates?.[selectedWeek] === 'open' && <div className="hidden sm:block text-right"><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Lockdown In</div><div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 justify-end"><Clock className="w-4 h-4 text-orange-500"/><CountdownClock targetTime={lockdownTime} /></div></div>}</div>
                    <div className="p-6 space-y-4">
                        {currentUser.playsConfidence && <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${isCompleteFanatics ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}><div className="flex items-center gap-4">{isCompleteFanatics ? <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-8 h-8 text-orange-500 flex-shrink-0" />}<div><h4 className={`font-black uppercase text-lg ${isCompleteFanatics ? 'text-green-800' : 'text-orange-800'}`}>{isCompleteFanatics ? 'Fanatics Picks Complete' : 'Fanatics Picks Missing'}</h4><p className={`text-sm font-medium ${isCompleteFanatics ? 'text-green-700' : 'text-orange-700'}`}>{isCompleteFanatics ? 'You have ranked all games and set a tiebreaker.' : `You have ranked ${String(fullyPickedCount)} of ${String(totalGames)} games${hasTiebreaker ? '.' : ' and need a tiebreaker.'}`}</p></div></div>{!isCompleteFanatics && globalSettings?.weekStates?.[selectedWeek] === 'open' && <button onClick={() => setActiveTab('confidence')} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-orange-600 transition-colors flex items-center gap-2">Finish <ArrowRight className="w-4 h-4"/></button>}</div>}
                        {currentUser.playsKnockout && !isKnockedOut && <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${isCompleteKnockout ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-200'}`}><div className="flex items-center gap-4">{isCompleteKnockout ? <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-8 h-8 text-indigo-500 flex-shrink-0" />}<div><h4 className={`font-black uppercase text-lg ${isCompleteKnockout ? 'text-green-800' : 'text-indigo-800'}`}>{isCompleteKnockout ? 'KnockOut Pick Locked In' : 'KnockOut Pick Needed'}</h4><p className={`text-sm font-medium ${isCompleteKnockout ? 'text-green-700' : 'text-indigo-700'}`}>{isCompleteKnockout ? `You have selected ${String(currentUser.knockoutPicks?.[selectedWeek] || 'a team')} for Week ${String(selectedWeek)}.` : 'You still need to choose your knockout team for this week.'}</p></div></div>{!isCompleteKnockout && globalSettings?.weekStates?.[selectedWeek] === 'open' && <button onClick={() => setActiveTab('knockout')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2">Pick <ArrowRight className="w-4 h-4"/></button>}</div>}
                        {currentUser.playsKnockout && isKnockedOut && <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all bg-red-50 border-red-200`}><div className="flex items-center gap-4"><Skull className="w-8 h-8 text-red-500 flex-shrink-0" /><div><h4 className="font-black uppercase text-lg text-red-800">Knocked Out</h4><p className="text-sm font-medium text-red-700">You have been eliminated from the KnockOut pool for this session.</p></div></div></div>}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'confidence' && (
          <div className="space-y-6 max-w-[1200px] mx-auto">
            {!currentUser.playsConfidence && <ParticipationAlert game="Fanatics" />}
            {isWeekLocked && <LockBanner week={selectedWeek} />}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <WeekSelector week={selectedWeek} setWeek={setSelectedWeek} maxActiveWeeks={maxActiveWeeks} />
              <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 w-full md:w-auto">
                <ProgressBar current={totalItemsCompleted} total={totalItemsRequired} percentage={progressPercentage} />
                {!isWeekLocked && currentUser.playsConfidence && (
                  <div className="flex gap-2">
                    <button onClick={() => handleConfidenceQuickPicks(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 whitespace-nowrap">
                      <Zap className="w-3.5 h-3.5" /> Pick (Me)
                    </button>
                    {isAdmin && (
                      <button onClick={() => handleConfidenceQuickPicks(true)} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2 whitespace-nowrap">
                        <Users className="w-3.5 h-3.5" /> Pick All
                      </button>
                    )}
                  </div>
                )}
              </div>
              <AutoSaveIndicator isSaving={isSaving} hasSaved={hasSaved} count={totalItemsCompleted} />
            </div>
            <div className={`flex flex-col gap-3 ${!currentUser.playsConfidence ? 'opacity-25 grayscale pointer-events-none' : ''}`}>
              {games.map((game: any) => (<GameCard key={game.id} game={game} selectedPick={currentUserPicks[game.id]} selectedRank={currentUserRanks[game.id]} totalGames={totalGames} usedRanks={Object.values(currentUserRanks)} isLocked={isWeekLocked} onPick={(team: string) => updateUserPicks(currentUser.id, game.id, team)} onRankChange={(rank: string) => updateUserRank(currentUser.id, game.id, rank)} />))}
              <TiebreakerCard val={currentUser.tiebreakers?.[selectedWeek] || ''} game={games[games.length - 1]} isLocked={isWeekLocked} onSave={(val: any) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', currentUser.id), { [`tiebreakers.${selectedWeek}`]: val }))} />
            </div>
          </div>
        )}

        {activeTab === 'knockout' && (
          <div className="space-y-6 max-w-[1200px] mx-auto">
            {!currentUser.playsKnockout && <ParticipationAlert game="KnockOut" />}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden border-b-8 border-[#FFB81C] shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div><div className="flex items-center gap-3 mb-4"><Skull className="w-10 h-10 text-[#FFB81C]" /><h2 className="text-4xl font-black italic uppercase tracking-tighter">KnockOut <span className="text-[#FFB81C]">S{globalSettings?.knockoutSession || 1} &bull; {selectedWeek <= 3 ? `PRE W${selectedWeek}` : `WK ${selectedWeek - 3}`}</span></h2></div><p className="text-slate-400 font-bold max-w-lg">One winner per week. Stay alive. No team reused.</p></div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  {!isWeekLocked && currentUser.playsKnockout && !wasAlreadyOut(currentUser, selectedWeek, globalSettings?.weekStates) && (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button onClick={() => handleKnockoutQuickPick(false)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black italic uppercase shadow-xl flex items-center gap-2 hover:bg-indigo-500 transition-all text-sm w-full sm:w-auto">
                        <Zap className="w-5 h-5" /> Pick (Me)
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleKnockoutQuickPick(true)} className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black italic uppercase shadow-xl flex items-center gap-2 hover:bg-purple-500 transition-all text-sm w-full sm:w-auto">
                          <Users className="w-5 h-5" /> Pick All
                        </button>
                      )}
                    </div>
                  )}
                  {currentUser.playsKnockout && userPaymentStatus === 'paid' && <div className="bg-[#FFB81C] text-slate-900 px-6 py-3 rounded-2xl font-black italic uppercase shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto"><DollarSign className="w-6 h-6" /> Eligible</div>}
                </div>
              </div>
            </div>
            {wasAlreadyOut(currentUser, selectedWeek, globalSettings?.weekStates) ? <div className={`border-4 rounded-3xl p-12 text-center ${userPaymentStatus === 'disqualified' ? 'bg-red-600 border-red-800' : 'bg-red-50 border-red-500'}`}><Skull className={`w-20 h-24 mx-auto mb-4 ${userPaymentStatus === 'disqualified' ? 'text-red-900' : 'text-red-500'}`} /><h3 className={`text-4xl font-black italic uppercase tracking-tighter ${userPaymentStatus === 'disqualified' ? 'text-white' : 'text-red-900'}`}>{userPaymentStatus === 'disqualified' ? 'DISQUALIFIED (UNPAID)' : 'Knocked Out'}</h3></div> : <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${!currentUser.playsKnockout ? 'opacity-25 grayscale pointer-events-none' : ''}`}>{games.map((game: any) => <KnockoutGameCard key={game.id} game={game} selectedTeam={currentUser.knockoutPicks?.[selectedWeek]} usedTeams={Object.values(currentUser.knockoutPicks || {})} onPick={(team: string) => updateKnockoutPick(currentUser.id, selectedWeek, team)} isLocked={isWeekLocked} />)}</div>}
          </div>
        )}

        {activeTab === 'c-tracker' && (
          <div className="space-y-6 max-w-[1400px] mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
              <WeekSelector week={selectedWeek} setWeek={setSelectedWeek} maxActiveWeeks={maxActiveWeeks} />
              {!isWeekLocked && isAdmin && !adminForceReveal && <button onClick={() => setAdminForceReveal(true)} className="px-6 py-2 bg-slate-900 text-[#FFB81C] rounded-xl font-black italic uppercase tracking-widest shadow-xl hover:scale-105 transition-all text-[10px]">Admin Peek</button>}
            </div>
            <LiveScoreTicker games={games} />
            <ConfidenceTrackerBoard 
                data={weeklyTrackerData} 
                games={games} 
                week={selectedWeek} 
                isWeekComplete={isWeekClosed} 
                currentUser={currentUser} 
                isWeekLocked={isWeekLocked} 
                adminForceReveal={adminForceReveal} 
            />
          </div>
        )}

        {activeTab === 'k-tracker' && (
          <div className="space-y-6 max-w-[1200px] mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between"><WeekSelector week={selectedWeek} setWeek={setSelectedWeek} maxActiveWeeks={maxActiveWeeks} />{!isWeekLocked && isAdmin && !adminForceReveal && <button onClick={() => setAdminForceReveal(true)} className="px-6 py-2 bg-slate-900 text-[#FFB81C] rounded-xl font-black italic uppercase tracking-widest shadow-xl hover:scale-105 transition-all text-[10px]">Admin Peek</button>}</div>
            <LiveScoreTicker games={games} />
            <KnockoutTrackerBoard data={knockoutTrackerData} week={selectedWeek} allGames={globalSettings?.games} isLocked={isWeekLocked} adminForceReveal={adminForceReveal} currentUser={currentUser} />
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="space-y-6 max-w-[1200px] mx-auto">
             <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-8 border-[#FFB81C] shadow-2xl">
                <div><h2 className="text-4xl font-black italic uppercase tracking-tighter">Season Standings</h2><p className="text-slate-400 font-bold">Fanatics Points vs Fantasy Breakdown</p></div>
                <div className="flex bg-white/10 p-1.5 rounded-2xl backdrop-blur-md">{['Overall', '1st Half', '2nd Half'].map(v => <button key={v} onClick={() => setSeasonView(v)} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all ${seasonView === v ? 'bg-[#FFB81C] text-slate-900 shadow-lg scale-105' : 'text-slate-400 hover:text-white'}`}>{String(v)}</button>)}</div>
             </div>
             <SeasonTrackerBoard data={seasonStats} view={seasonView} bonuses={globalSettings?.seasonBonuses || {}} sortBy={seasonSortBy} onSortChange={setSeasonSortBy} currentUser={currentUser} globalSettings={globalSettings} />
          </div>
        )}

        {activeTab === 'stats' && (
          <StatsView allUsers={allUsers} globalSettings={globalSettings} />
        )}

        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6 max-w-[1200px] mx-auto">
            <div className="flex bg-white rounded-2xl shadow-md border border-slate-200 p-1.5 mb-6 overflow-x-auto scrollbar-hide">
              <AdminNavButton icon={PieChart} label="Pick Status" active={adminTab === 'status'} onClick={() => setAdminTab('status')} />
              <AdminNavButton icon={UserCog} label="Manage Users" active={adminTab === 'users'} onClick={() => setAdminTab('users')} />
              <AdminNavButton icon={ListChecks} label="Manage Games" active={adminTab === 'games'} onClick={() => setAdminTab('games')} />
              <AdminNavButton icon={DollarSign} label="Financials" active={adminTab === 'financials'} onClick={() => setAdminTab('financials')} />
              <AdminNavButton icon={Settings} label="Site Settings" active={adminTab === 'settings'} onClick={() => setAdminTab('settings')} />
          </div>
            
            {adminTab === 'status' && (
              <div className="space-y-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-100 pb-6">
                  <WeekSelector week={selectedWeek} setWeek={setSelectedWeek} maxActiveWeeks={maxActiveWeeks} />
                  
                  <div className="flex flex-wrap gap-2">
                    <button 
                      onClick={handleCopyMissingEmails} 
                      className="px-5 py-3 bg-slate-900 text-[#FFB81C] rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Copy Email List ({getMissingEmailsList().length})
                    </button>
                    <button 
                      onClick={handleEmailReminders} 
                      className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all flex items-center gap-2"
                    >
                      <Mail className="w-4 h-4" /> Open Email Client
                    </button>
                  </div>
                </div>

                {getMissingEmailsList().length > 0 && (
                  <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-black uppercase text-xs text-slate-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-orange-500" /> Missing Pick Email Roster ({getMissingEmailsList().length} Players)
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Paste into To / BCC Field
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-700 select-all break-all max-h-24 overflow-y-auto">
                      {getMissingEmailsList().join(', ')}
                    </div>
                  </div>
                )}

                <div><h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-4 flex items-center gap-2"><CalendarDays className="w-6 h-6 text-[#FFB81C]" /> Fanatics Pick Status</h3><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><StatusColumn title="Not Started" count={(statusSummary?.notStarted || []).length} users={statusSummary?.notStarted || []} color="slate" icon={UserMinus} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} /><StatusColumn title="In Progress" count={(statusSummary?.inProgress || []).length} users={statusSummary?.inProgress || []} color="blue" icon={Play} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} /><StatusColumn title="Completed" count={(statusSummary?.completed || []).length} users={statusSummary?.completed || []} color="green" icon={CheckCircle} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} /></div></div>
                <div className="pt-8 border-t-2 border-slate-100"><h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-4 flex items-center gap-2"><Skull className="w-6 h-6 text-[#FFB81C]" /> KnockOut Pick Status</h3><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><StatusColumn title="Waiting on Pick" count={(knockoutStatusSummary?.waiting || []).length} users={knockoutStatusSummary?.waiting || []} color="slate" icon={Clock} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('knockout'); }} /><StatusColumn title="Pick Submitted" count={(knockoutStatusSummary?.submitted || []).length} users={knockoutStatusSummary?.submitted || []} color="green" icon={CheckCircle} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('knockout'); }} /></div></div>
              </div>
            )}

            {adminTab === 'users' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase italic text-slate-900 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#FFB81C]" /> Register Single Player
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">First Name</label>
                      <input 
                        value={newUserForm.firstName} 
                        onChange={e => {
                          const fn = e.target.value;
                          const autoUser = (fn.charAt(0) + newUserForm.lastName).toLowerCase().replace(/[^a-z0-9]/g, '');
                          setNewUserForm({...newUserForm, firstName: fn, username: autoUser} as any);
                        }} 
                        className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" 
                        placeholder="Andy" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Name</label>
                      <input 
                        value={newUserForm.lastName} 
                        onChange={e => {
                          const ln = e.target.value;
                          const autoUser = (newUserForm.firstName.charAt(0) + ln).toLowerCase().replace(/[^a-z0-9]/g, '');
                          setNewUserForm({...newUserForm, lastName: ln, username: autoUser} as any);
                        }} 
                        className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" 
                        placeholder="Smith" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Username</label>
                      <input 
                        value={(newUserForm as any).username || ''} 
                        onChange={e => setNewUserForm({...newUserForm, username: e.target.value.toLowerCase()} as any)} 
                        className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" 
                        placeholder="asmith" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                      <input value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" placeholder="andy@example.com" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">System Role</label>
                      <select 
                        value={newUserForm.role || 'user'} 
                        onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} 
                        className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C] bg-white cursor-pointer"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button onClick={handleAddUser} className="w-full bg-slate-900 text-[#FFB81C] rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Add Player</button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-black uppercase italic text-slate-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-[#FFB81C]" /> Bulk Player Importer (CSV / Text)
                      </h3>
                      <p className="text-xs text-slate-500 font-bold mt-1">
                        Paste comma-separated entries in format: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">FirstName, LastName, Nickname, Email, PaymentStatus</code>
                      </p>
                    </div>
                  </div>

                  <textarea
                    id="bulkUserCsvInput"
                    placeholder={`John, Smith, Big John, john@example.com, paid\nJane, Doe, Queen, jane@example.com, unpaid`}
                    className="w-full h-32 bg-slate-50 border-2 border-slate-200 rounded-xl p-3 text-xs font-mono text-slate-800 outline-none focus:border-[#FFB81C] mb-3"
                  />

                  <div className="flex justify-end gap-3">
                    <button
                      disabled={isSaving}
                      onClick={() => {
                        const el = document.getElementById('bulkUserCsvInput') as HTMLTextAreaElement;
                        if (el) handleBulkImportUsers(el.value);
                      }}
                      className="bg-slate-900 text-[#FFB81C] hover:bg-slate-800 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" /> Import Player Roster
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                  <table className="w-full text-left min-w-[1000px]">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]">
                        <th className="p-5">Player Identity</th>
                        <th className="p-5">Email Address</th>
                        <th className="p-5 text-center">System Role</th>
                        <th className="p-5 text-center">Payment Status</th>
                        <th className="p-5 text-center">Fanatics</th>
                        <th className="p-5 text-center">KnockOut</th>
                        <th className="p-5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(allUsers || []).map(user => {
                        const isEditing = editingUserId === user.id;
                        if (isEditing) return <EditUserRow key={user.id} user={user} form={editUserForm} setForm={setEditUserForm} onCancel={() => setEditingUserId(null)} onSave={saveInlineUserEdit} />;
                        return (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5 font-black text-slate-900 text-base">
                              {formatFullName(user)}
                              <span className="block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">@{String(user.username || '')}</span>
                            </td>
                            <td className="p-5 font-medium text-slate-600 text-sm">{String(user.email || 'No Email')}</td>
                            <td className="p-5 text-center">
                              <select
                                value={user.role || 'user'}
                                onChange={(e) => handleEditUser(user.id, 'role', e.target.value)}
                                className={`border rounded-xl px-2.5 py-1 text-xs font-black uppercase tracking-wider outline-none cursor-pointer ${
                                  user.role === 'admin' ? 'bg-purple-100 text-purple-800 border-purple-300' : 'bg-slate-50 text-slate-600 border-slate-200'
                                }`}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                            </td>
                            <td className="p-5 text-center"><select value={user.paymentStatus || 'unpaid'} onChange={(e) => handleEditUser(user.id, 'paymentStatus', e.target.value)} className={`border border-slate-200 rounded p-1 text-xs font-bold uppercase tracking-wider outline-none cursor-pointer ${(user.paymentStatus || 'unpaid') === 'paid' ? 'bg-green-50 text-green-700' : (user.paymentStatus || 'unpaid') === 'unpaid' ? 'bg-orange-50 text-orange-700' : 'bg-red-600 text-white'}`}><option value="paid">Paid</option><option value="unpaid">Unpaid</option><option value="disqualified">Disqualified</option></select></td>
                            <td className="p-5 text-center"><input type="checkbox" checked={user.playsConfidence} onChange={(e) => handleEditUser(user.id, 'playsConfidence', e.target.checked)} className="w-5 h-5 accent-blue-600 cursor-pointer" /></td>
                            <td className="p-5 text-center"><input type="checkbox" checked={user.playsKnockout} onChange={(e) => handleEditUser(user.id, 'playsKnockout', e.target.checked)} className="w-5 h-5 accent-[#FFB81C] cursor-pointer" /></td>
                            <td className="p-5 text-right flex justify-end gap-2"><button onClick={() => { setEditingUserId(user.id); setEditUserForm(user); }} className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white transition-all">Edit</button>{confirmDeleteId === user.id ? <button onClick={() => handleDeleteUser(user.id)} className="text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl bg-red-600 text-white shadow-lg animate-pulse transition-all">Sure?</button> : <button onClick={() => setConfirmDeleteId(user.id)} className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminTab === 'games' && (
                <div className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                       <AdminLifecycleCard week={selectedWeek} status={currentWeekState} onLock={handleLockWeek} onClose={handleCloseWeek} onOpen={handleOpenWeek} />
                       <AdminWeekCard week={selectedWeek} onChange={(e: any) => setSelectedWeek(Number(e.target.value))} maxActiveWeeks={maxActiveWeeks} />
                   </div>

                   <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 mt-6">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                       <div>
                         <h2 className="text-xl font-bold text-slate-900">Manage Season Schedule & Weeks</h2>
                         <p className="text-sm text-slate-500">
                           Import schedules week-by-week, flex kickoff times, or clear specific weeks.
                         </p>
                       </div>
                       <button
                         disabled={isSyncing}
                         onClick={handleSyncAllWeekTimes}
                         className="bg-slate-900 hover:bg-slate-800 text-[#FFB81C] text-xs font-black uppercase tracking-widest px-5 py-3 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                       >
                         {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 text-[#FFB81C]" />}
                         Sync All Week Times
                       </button>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                       {Array.from({ length: 21 }, (_, i) => i + 1).map((wNum) => {
                         const weekGames = globalSettings?.games?.[wNum] || [];
                         const gameCount = weekGames.length;
                         const isPopulated = gameCount > 0;
                         const weekLabel = wNum <= 3 ? `Preseason W${wNum}` : `Week ${wNum - 3}`;

                         return (
                           <div 
                             key={wNum} 
                             className={`p-4 rounded-xl border transition-all ${
                               isPopulated 
                                 ? 'bg-slate-50 border-slate-200 hover:border-slate-300' 
                                 : 'bg-slate-50/50 border-slate-100 opacity-75'
                             }`}
                           >
                             <div className="flex items-center justify-between mb-2">
                               <span className="font-bold text-slate-900 text-base">
                                 {weekLabel}
                               </span>
                               <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                                 isPopulated ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-200 text-slate-500'
                               }`}>
                                 {gameCount} {gameCount === 1 ? 'Game' : 'Games'}
                               </span>
                             </div>

                             <p className="text-xs text-slate-400 mb-4 truncate">
                               {isPopulated ? `First Kickoff: ${weekGames[0]?.date || ''} @ ${weekGames[0]?.time || ''}` : 'No games imported'}
                             </p>

                             <div className="flex flex-wrap gap-2">
                               <button
                                 disabled={isSyncing}
                                 onClick={() => handleImportSingleWeek(wNum)}
                                 className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                               >
                                 {isPopulated ? 'Re-Import' : 'Import'}
                               </button>

                               {isPopulated && (
                                 <>
                                   <button
                                     disabled={isSyncing}
                                     onClick={() => handleSyncWeekTimes(wNum)}
                                     className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50"
                                     title="Resync game times without resetting picks"
                                   >
                                     Sync Times
                                   </button>
                                   <button
                                     disabled={isSyncing}
                                     onClick={() => handleClearSingleWeek(wNum)}
                                     className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold py-2 px-3 rounded-lg transition-colors"
                                     title="Clear games for this week"
                                   >
                                     Clear
                                   </button>
                                 </>
                               )}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   </div>
                   
                   <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                       <div>
                           <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                               <Zap className="w-5 h-5 text-[#FFB81C]" /> Live Scores Sync
                           </h3>
                           <p className="text-sm text-slate-500 font-bold mt-1">Pull live scores and updates for currently loaded games.</p>
                       </div>
                       <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                           <button onClick={handleForceFixGames} disabled={isSaving} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-red-700 disabled:opacity-50 transition-colors w-full sm:w-auto">
                               Force-Fix Duplicates
                           </button>
                           <button onClick={handleSyncScores} disabled={isSyncing} className="px-6 py-3 bg-slate-900 text-[#FFB81C] rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                               {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Sync Live Scores'}
                           </button>
                       </div>
                   </div>

                   <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                       <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4"><div><h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2"><ListChecks className="w-5 h-5 text-[#FFB81C]" /> Manage {selectedWeek <= 3 ? `Preseason Week ${selectedWeek}` : `Week ${selectedWeek - 3}`} Games</h3><p className="text-sm text-slate-500 font-bold mt-1">Manually update game statuses, winners, and designated tiebreaker.</p></div></div>
                       <div className="overflow-x-auto">
                         <table className="w-full text-left min-w-[600px]">
                           <thead><tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]"><th className="p-4 font-black tracking-widest">Matchup</th><th className="p-4 font-black tracking-widest text-center">Status</th><th className="p-4 font-black tracking-widest text-right">Game Result</th></tr></thead>
                           <tbody className="divide-y divide-slate-100">
                             {(games || []).map((game: any) => (
                               <tr key={game.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="p-4 font-black text-slate-900 text-lg">{String(game.awayName)} @ {String(game.homeName)}<div className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">{String(game.date)} • {String(game.time)}</div></td>
                                 <td className="p-4 text-center">
                                   <div className="flex items-center justify-center gap-3">
                                     <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
                                       <input
                                         type="checkbox"
                                         checked={!!game.isTiebreaker}
                                         onChange={async (e) => {
                                           const isChecked = e.target.checked;
                                           try {
                                             const updatedGames = games.map((g: any) => 
                                               g.id === game.id ? { ...g, isTiebreaker: isChecked } : g
                                             );
                                             await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
                                               [`games.${selectedWeek}`]: updatedGames
                                             });
                                           } catch (err) {
                                             console.error("Error updating tiebreaker flag:", err);
                                           }
                                         }}
                                         className="rounded border-slate-300 text-[#FFB81C] focus:ring-[#FFB81C]"
                                       />
                                       <span>Tiebreaker (*)</span>
                                     </label>
                                     <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${game.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{String(game.status)}</span>
                                   </div>
                                 </td>
                                 <td className="p-4 text-right"><select value={game.winner === 'TIE' ? 'TIE' : (game.winner ? game.winner : (game.status === 'final' ? 'final-no-winner' : 'upcoming'))} onChange={(e) => updateGameResult(game.id, e.target.value, e.target.value)} className="border-2 rounded-xl px-4 py-2 text-xs font-black uppercase italic tracking-tighter outline-none focus:border-[#FFB81C] bg-white w-full max-w-[200px] cursor-pointer"><option value="upcoming">Upcoming</option><option value={game.away}>{String(game.awayName)} Won</option><option value={game.home}>{String(game.homeName)} Won</option><option value="TIE">Tie Game</option></select></td>
                               </tr>
                             ))}
                           </tbody>
                         </table>
                       </div>
                       <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between"><div><h4 className="font-black text-slate-900 uppercase italic">Actual Tiebreaker Points</h4><p className="text-xs text-slate-500 font-medium">Used to calculate closest tiebreaker</p></div><input type="number" className="border-2 border-slate-200 rounded-xl px-4 py-2 text-xl font-black text-center w-32 outline-none focus:border-[#FFB81C]" value={globalSettings?.actualTiebreakers?.[selectedWeek] || ''} onChange={(e) => { updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`actualTiebreakers.${selectedWeek}`]: parseInt(e.target.value) || 0 }); }} /></div>
                   </div>
                </div>
            )}
            {adminTab === 'financials' && (
              <div className="space-y-6">
                {(() => {
                  const activePlayers = allUsers.filter(u => u.playsConfidence).length;
                  let closedWeeksCount = 0;
                  for (let wk = 4; wk <= 21; wk++) {
                    if (globalSettings?.weekStates?.[wk] === 'closed') closedWeeksCount++;
                  }

                  const totalDuesCollected = activePlayers * 12 * closedWeeksCount;
                  const weeklyPotPerWeek = activePlayers * 7;
                  const totalWeeklyPotsPaid = weeklyPotPerWeek * closedWeeksCount;
                  const halfPotAccumulated = activePlayers * 1.75 * closedWeeksCount;
                  const seasonPotAccumulated = activePlayers * 1.25 * closedWeeksCount;
                  const partyFundAccumulated = activePlayers * 2.0 * closedWeeksCount;

                  return (
                    <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl border-b-8 border-[#FFB81C]">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h2 className="text-3xl font-black italic uppercase text-[#FFB81C] flex items-center gap-2">
                            <DollarSign className="w-8 h-8" /> League Financial Accounting Ledger
                          </h2>
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">
                            Calculated across {activePlayers} Active Players &bull; {closedWeeksCount} Finalized Regular Season Weeks
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-center">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Total Dues Collected</span>
                          <span className="text-2xl font-black italic text-emerald-400 font-mono">${totalDuesCollected}</span>
                        </div>

                        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-center">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Weekly Pots Paid</span>
                          <span className="text-2xl font-black italic text-[#FFB81C] font-mono">${totalWeeklyPotsPaid}</span>
                        </div>

                        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-center">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Half Pots Accrued</span>
                          <span className="text-2xl font-black italic text-sky-400 font-mono">${Math.round(halfPotAccumulated)}</span>
                        </div>

                        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-center">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Season Pot Accrued</span>
                          <span className="text-2xl font-black italic text-purple-400 font-mono">${Math.round(seasonPotAccumulated)}</span>
                        </div>

                        <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700 text-center col-span-2 sm:col-span-1">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Party / Misc Fund</span>
                          <span className="text-2xl font-black italic text-indigo-400 font-mono">${Math.round(partyFundAccumulated)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-black uppercase text-sm text-slate-900 flex items-center gap-2">
                        <Coins className="w-5 h-5 text-amber-500" /> Rounding & Tie Variance Tracker
                      </h4>
                      <p className="text-xs text-slate-500 font-bold mt-1">
                        Tracks extra dollars absorbed by the house when true ties round up payouts.
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase text-slate-400 block">Rounding Variance (This Week)</span>
                      <span className="text-2xl font-black italic text-rose-600 font-mono">
                        -${weeklyTrackerData.roundingDollarsLost || 0}.00
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-[#FFB81C]/10 p-8 rounded-3xl border-2 border-[#FFB81C]/30 shadow-sm">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm flex items-center gap-2">
                        <Coins className="w-4 h-4 text-[#FFB81C]" /> Whole-Dollar Payout Auto-Generator
                      </h3>
                      <p className="text-xs text-slate-600 font-medium mt-1">
                        Calculates rounded whole-dollar payouts based on your spreadsheet matrix for the {allUsers.filter(u => u.playsConfidence).length} active Fanatics players.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const activeCount = allUsers.filter(u => u.playsConfidence).length;
                        if (activeCount === 0) return alert("No active Fanatics players found!");
                        
                        const payouts = calculateFanaticsPayouts(activeCount);
                        
                        updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
                          fpPayouts: payouts.weeklyGross,
                          seasonBonuses: {
                            firstHalf: payouts.half1Payouts,
                            secondHalf: payouts.half2Payouts,
                            overall: payouts.seasonPayouts
                          }
                        });
                        alert(`Generated whole-dollar payouts for ${activeCount} active players!`);
                      }}
                      className="bg-slate-900 text-[#FFB81C] px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-slate-800 transition-all whitespace-nowrap"
                    >
                      Recalculate Matrix ({allUsers.filter(u => u.playsConfidence).length} Players)
                    </button>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
                  <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2">
                    <Coins className="w-4 h-4" /> Weekly FP Gross Payouts (Top 1-8)
                  </h3>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                    {(globalSettings?.fpPayouts || Array(8).fill(0)).map((val: any, i: number) => (
                      <AdminNumberInput key={i} label={`Rank ${i+1}`} value={val} onSave={(newVal: any) => updateFpPayouts(i, newVal)} />
                    ))}
                  </div>
                </div>
                
                <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
                    <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> Season/Half Payouts (Top 1-8)
                    </h3>
                    <div className="flex flex-col gap-8">
                        {(['firstHalf', 'secondHalf', 'overall']).map(key => {
                            const bonusesObj = globalSettings?.seasonBonuses || {};
                            const safeArray = Array.isArray(bonusesObj) ? bonusesObj : (bonusesObj[key === 'firstHalf' ? 'firstHalf' : key === 'secondHalf' ? 'secondHalf' : 'overall'] || Array(8).fill(0));
                            return (
                                <div key={key}>
                                  <label className="block text-[12px] font-black uppercase text-slate-900 border-b-2 border-slate-100 pb-2 mb-3">
                                    {key === 'firstHalf' ? 'First Half (Weeks 4-12)' : key === 'secondHalf' ? 'Second Half (Weeks 13-21)' : 'Overall Season (Weeks 4-21)'}
                                  </label>
                                  <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                                    {(safeArray || Array(8).fill(0)).map((val: any, i: number) => (
                                      <AdminNumberInput key={`${key}-${i}`} label={`Rank ${i+1}`} value={val} onSave={(newVal: any) => updateSeasonBonuses(key, i, newVal)} />
                                    ))}
                                  </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
                  <h3 className="font-black uppercase tracking-widest text-slate-900 text-sm mb-2">
                    Period Settlement & Bonus Payout Actions
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mb-6">
                    Click any period to preview the top 8 standings and dollar awards before finalizing.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <button
                      onClick={() => handlePrepareSettlement('firstHalf')}
                      className="bg-indigo-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-md hover:bg-indigo-700 transition-all text-center flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-4 h-4 text-[#FFB81C]" /> Award 1st Half Pot
                    </button>

                    <button
                      onClick={() => handlePrepareSettlement('secondHalf')}
                      className="bg-indigo-600 text-white p-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-md hover:bg-indigo-700 transition-all text-center flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-4 h-4 text-[#FFB81C]" /> Award 2nd Half Pot
                    </button>

                    <button
                      onClick={() => handlePrepareSettlement('overall')}
                      className="bg-amber-500 text-slate-900 p-4 rounded-2xl font-black uppercase text-xs tracking-wider shadow-md hover:bg-amber-400 transition-all text-center flex items-center justify-center gap-2"
                    >
                      <Trophy className="w-4 h-4 text-slate-900" /> Award Overall Season Pot
                    </button>
                  </div>
                </div>
              </div>
            )}

{adminTab === 'settings' && (
  <div className="space-y-6">
    <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-2 flex items-center gap-2">
        <CalendarDays className="w-4 h-4 text-[#FFB81C]" /> Max Active Pool Weeks
      </h3>
      <p className="text-sm text-slate-500 font-bold mb-4">
        Controls how many weeks players can view and submit picks for in the week selector.
      </p>
      <div className="flex items-center gap-4">
        <input
          type="number"
          min="1"
          max="22"
          value={globalSettings?.maxActiveWeeks || 18}
          onChange={async (e) => {
            const val = parseInt(e.target.value) || 1;
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
              maxActiveWeeks: val
            });
          }}
          className="w-24 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 font-black text-slate-900 text-lg outline-none focus:border-[#FFB81C]"
        />
        <span className="text-sm font-semibold text-slate-600">
          Weeks currently accessible to players (1 to {globalSettings?.maxActiveWeeks || 18})
        </span>
      </div>
    </div>

    <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2">
        <Megaphone className="w-4 h-4" /> Global Announcement
      </h3>
      <p className="text-xs text-slate-500 font-medium mb-3">
        This message will appear prominently on every player's Dashboard tab.
      </p>
      <textarea 
        value={globalSettings?.announcement || ''} 
        onChange={(e) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { announcement: e.target.value }))} 
        className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-medium text-slate-900 outline-none focus:border-[#FFB81C] min-h-[100px]" 
        placeholder="Welcome to Hanover Football Fanatics!" 
      />
    </div>
    
    <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-[#FFB81C]" /> API-Sports Integration Configuration
      </h3>
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Secret API Key</label>
        <input 
          type="text" 
          value={globalSettings?.apiSportsKey || ''} 
          onChange={(e) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { apiSportsKey: e.target.value }))} 
          className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-[#FFB81C]" 
          placeholder="Paste your API-Sports v1 Key here..." 
        />
      </div>
    </div>

    <div className="bg-white p-8 rounded-3xl border-4 border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 mt-12">
      <div className="text-center md:text-left">
        <h3 className="text-2xl font-black italic uppercase text-slate-900">Reset Fanatics Pool</h3>
        <p className="text-slate-500 font-medium">Wipes all picks, ranks, tiebreakers, and history for a new season.</p>
      </div>
      {!showFanaticsResetConfirm ? (
        <button onClick={() => setShowFanaticsResetConfirm(true)} className="px-10 py-4 bg-slate-900 text-[#FFB81C] rounded-2xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-3 hover:scale-105 transition-all w-full md:w-auto shadow-lg">
          <RefreshCw className="w-6 h-6" /> Reset Fanatics
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button onClick={() => setShowFanaticsResetConfirm(false)} className="px-6 py-4 bg-white text-slate-700 rounded-2xl font-black italic uppercase tracking-tighter hover:bg-slate-100 transition-all w-full sm:w-auto border-2 border-slate-200">
            Cancel
          </button>
          <button onClick={handleResetFanatics} className="px-6 py-4 bg-red-900 text-white rounded-2xl font-black italic uppercase tracking-tighter shadow-xl hover:bg-red-800 transition-all flex items-center justify-center gap-2 w-full sm:w-auto animate-pulse">
            Confirm Reset
          </button>
        </div>
      )}
    </div>

    <div className="bg-white p-8 rounded-3xl border-4 border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="text-center md:text-left">
        <h3 className="text-2xl font-black italic uppercase text-slate-900">Reset KnockOut Pool</h3>
        <p className="text-slate-500 font-medium">Completely wipes all KnockOut picks and statuses to restart the pool for the season.</p>
      </div>
      {!showResetConfirm ? (
        <button onClick={() => setShowResetConfirm(true)} className="px-10 py-4 bg-slate-900 text-[#FFB81C] rounded-2xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-3 hover:scale-105 transition-all w-full md:w-auto shadow-lg">
          <RefreshCw className="w-6 h-6" /> Reset KnockOut Season
        </button>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          <button onClick={() => setShowResetConfirm(false)} className="px-6 py-4 bg-white text-slate-700 rounded-2xl font-black italic uppercase tracking-tighter hover:bg-slate-100 transition-all w-full sm:w-auto border-2 border-slate-200">
            Cancel
          </button>
          <button onClick={handleResetKnockout} className="px-6 py-4 bg-red-900 text-white rounded-2xl font-black italic uppercase tracking-tighter shadow-xl hover:bg-red-800 transition-all flex items-center justify-center gap-2 w-full sm:w-auto animate-pulse">
            Confirm Reset
          </button>
        </div>
      )}
    </div>
  </div>
)}
          </div>
        )}
      </main>
      {showPrintModal && <PrintModal user={currentUser} week={selectedWeek} games={games} onClose={() => setShowPrintModal(false)} bannerImg={imgErrors.logo ? null : "/hff-logo.png"} />}
{settlementPreview && (
  <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
    <div className="bg-white max-w-2xl w-full rounded-3xl shadow-2xl overflow-hidden border-t-8 border-[#FFB81C]">
      <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black italic uppercase text-[#FFB81C] flex items-center gap-2">
            <Trophy className="w-6 h-6" /> Settlement Preview
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">
            {settlementPreview.title}
          </p>
        </div>
        <button onClick={() => setSettlementPreview(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <X className="w-6 h-6 text-slate-400" />
        </button>
      </div>

      <div className="p-6 max-h-[60vh] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 text-[10px] font-black uppercase text-slate-400">
              <th className="pb-3 italic">Rank</th>
              <th className="pb-3">Player Name</th>
              <th className="pb-3 text-center">Period CP</th>
              <th className="pb-3 text-right">Award Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {settlementPreview.winners.map((w) => (
              <tr key={w.rank} className="font-bold">
                <td className="py-3 font-black italic text-slate-400">#{w.rank}</td>
                <td className="py-3 text-slate-900 font-black">{w.name}</td>
                <td className="py-3 text-center font-mono text-slate-600">{w.points} CP</td>
                <td className="py-3 text-right font-black italic text-emerald-600 text-base">
                  +${w.bonusAmount}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-end gap-3">
        <button
          onClick={() => setSettlementPreview(null)}
          className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-slate-300 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirmSettlement}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
        >
          <CheckCircle className="w-4 h-4" /> Confirm & Apply Payouts
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

// --- APP WRAPPER FOR CRASH DETECTION ---
class AppErrorBoundary extends React.Component<any, any> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, info: any) { this.setState({ info }); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', backgroundColor: '#450a0a', color: 'white', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem', color: '#fca5a5' }}>React Render Crash</h2>
          <p style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>The app hit a fatal error. Please copy this entire stack trace and send it to your assistant:</p>
          <div style={{ backgroundColor: 'rgba(0,0,0,0.5)', padding: '1rem', borderRadius: '0.5rem', overflowX: 'auto' }}>
            <p style={{ fontWeight: 'bold', color: '#fca5a5', fontSize: '1.2rem' }}>{this.state.error && this.state.error.toString()}</p>
            <pre style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#fecaca' }}>{this.state.info && this.state.info.componentStack}</pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() { return <AppErrorBoundary><MainApp /></AppErrorBoundary>; }