import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, CalendarDays, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Clock, Target, 
  Printer, X, XCircle, Users, Lock, Settings, UserCog, Edit, ShieldCheck, ShieldAlert, PieChart, 
  UserMinus, Play, DollarSign, Skull, HeartPulse, RefreshCw, Coins, ListChecks, Zap, 
  UserPlus, Trash2, Mail, LogOut, KeyRound, User, Home, Megaphone, ArrowRight 
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';

// --- FIXED FIREBASE INITIALIZATION ---
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
const MOCK_WEEKS = Array.from({ length: 7 }, (_, i) => i + 1);
const INITIAL_GAMES = [
  { id: 1, away: 'BAL', home: 'KC', awayName: 'Ravens', homeName: 'Chiefs', date: 'Thu, Sep 5', time: '8:20 PM', status: 'upcoming' },
  { id: 2, away: 'GB', home: 'PHI', awayName: 'Packers', homeName: 'Eagles', date: 'Fri, Sep 6', time: '8:15 PM', status: 'upcoming' },
  { id: 3, away: 'PIT', home: 'ATL', awayName: 'Steelers', homeName: 'Falcons', date: 'Sun, Sep 8', time: '1:00 PM', status: 'upcoming' },
];
const initialGamesByWeek: any = {}; 
MOCK_WEEKS.forEach(w => { initialGamesByWeek[w] = INITIAL_GAMES.map(g => ({...g})); });

const NFL_COLORS: any = {
  ARI: '#97233F', ATL: '#A71930', BAL: '#241773', BUF: '#00338D', CAR: '#0085CA', CHI: '#0B162A', CIN: '#FB4F14', CLE: '#311D00',
  DAL: '#041E42', DEN: '#FB4F14', DET: '#0076B6', GB:  '#203731', HOU: '#03202F', IND: '#002C5F', JAX: '#006778', KC:  '#E31837',
  LV:  '#000000', LAC: '#0080C6', LAR: '#003594', MIA: '#008E97', MIN: '#4F2683', NE:  '#002244', NO:  '#101820', NYG: '#0B2265',
  NYJ: '#125740', PHI: '#004C54', PIT: '#101820', SF:  '#AA0000', SEA: '#002244', TB:  '#D50A0A', TEN: '#0C2340', WAS: '#5A1414'
};

const INITIAL_USERS = [
  { id: 'admin-1', firstName: 'Admin', lastName: 'Account', nickname: 'The Admin', username: 'admin', password: 'admin', requiresPasswordChange: true, email: '', role: 'admin', paymentStatus: 'paid', playsConfidence: true, playsKnockout: true, picks: {1:{},2:{},3:{},4:{}}, ranks: {1:{},2:{},3:{},4:{}}, tiebreakers: {1:'',2:'',3:'',4:''}, knockoutPicks: {}, knockoutStatuses: {}, weeklyFantasyHistory: {}, weeklyConfidenceHistory: {} },
];

// --- HELPERS ---
function formatFullName(user: any) { return !user ? "" : `${user.firstName}${user.nickname ? ` "${user.nickname}"` : ""} ${user.lastName}`; }
function calculatePoints(picks: any, ranks: any, games: any) { return (!picks || !ranks || !games) ? 0 : games.reduce((s: number, g: any) => (g.status === 'final' && g.winner && picks[g.id] === g.winner ? s + (parseInt(ranks[g.id], 10) || 0) : s), 0); }
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

// --- COMPONENTS ---
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

function TeamButton({ team, abbr, name, selected, isLocked, onClick }: any) { 
  const displayAbbr = abbr || team;
  return <button onClick={onClick} disabled={isLocked} className={`flex-1 w-full flex items-center justify-between p-3 sm:p-4 rounded-2xl border-2 transition-all duration-300 ${selected ? 'border-[#FFB81C] bg-[#FFB81C]/5 shadow-lg scale-[1.02]' : `border-transparent ${isLocked ? 'bg-slate-50' : 'bg-slate-50 hover:bg-slate-100 hover:scale-[1.01]'} text-slate-700`} ${isLocked && !selected ? 'grayscale' : ''}`}><div className="flex items-center gap-3 text-left"><div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-black text-xs shadow-lg ${isLocked ? 'bg-slate-300 shadow-none' : ''}`} style={!isLocked ? { backgroundColor: NFL_COLORS[team] || '#1e293b' } : {}}>{displayAbbr}</div><div><div className="font-black uppercase italic text-base sm:text-lg leading-tight text-slate-900">{name}</div><div className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">{displayAbbr}</div></div></div>{selected && <CheckCircle className="w-6 h-6 text-[#FFB81C]" strokeWidth={3} />}</button>; 
}

function GameCard({ game, selectedPick, selectedRank, totalGames, usedRanks, isLocked, onPick, onRankChange }) {
  const isFullyPicked = selectedPick && selectedRank;
  return (
    <div className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col lg:flex-row ${isFullyPicked && !isLocked ? 'border-slate-900 shadow-md scale-[1.005]' : selectedPick && !isLocked ? 'border-[#FFB81C]/40' : 'border-slate-100 hover:border-slate-200'}`}>
      <div className={`p-4 lg:w-48 flex flex-row lg:flex-col justify-between lg:justify-center items-center lg:items-start border-b lg:border-b-0 lg:border-r-2 border-slate-50 ${isLocked ? 'bg-slate-100' : 'bg-slate-50'}`}>
        <div className="flex items-center gap-2 text-sm font-black text-slate-400 uppercase tracking-widest">
          {isLocked ? <Lock className="w-4 h-4 text-red-500" /> : <Clock className="w-4 h-4 text-[#FFB81C]" />}
          {game?.date}
        </div>
        <div className="text-sm font-bold text-slate-300">{game?.time}</div>
      </div>
      <div className={`p-4 flex-1 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full ${isLocked ? 'opacity-75' : ''}`}>
        <TeamButton team={String(game?.away)} abbr={game?.awayAbbr} name={game?.awayName} selected={String(selectedPick) === String(game?.away)} isLocked={isLocked} onClick={() => onPick(String(game?.away))} />
        <div className="text-sm font-black text-slate-200 uppercase italic tracking-widest hidden sm:block">VS</div>
        <TeamButton team={String(game?.home)} abbr={game?.homeAbbr} name={game?.homeName} selected={String(selectedPick) === String(game?.home)} isLocked={isLocked} onClick={() => onPick(String(game?.home))} />
      </div>
      <div className={`p-4 lg:w-64 flex flex-row lg:flex-col justify-between items-center lg:justify-center border-t lg:border-t-0 lg:border-l-2 border-slate-50 ${isLocked ? 'bg-slate-100' : 'bg-slate-50/50'}`}>
        <label className="text-[10px] font-black text-slate-400 flex items-center gap-1.5 uppercase tracking-[0.2em] lg:mb-2">Fanatics Rank</label>
        <select 
          value={selectedRank || ''} 
          onChange={(e) => onRankChange(e.target.value)} 
          disabled={isLocked} 
          className={`appearance-none bg-white border-2 ${selectedRank && !isLocked ? 'border-[#FFB81C] text-slate-900' : 'border-slate-200 text-slate-400'} text-base font-black italic uppercase rounded-xl block w-36 px-4 py-3 text-center outline-none transition-all`}
        >
          <option value="" disabled>-- PTS --</option>
          {Array.from({ length: totalGames }, (_, i) => i + 1)
            .filter(num => !(usedRanks || []).map(r => parseInt(r, 10)).includes(num) || num === parseInt(selectedRank, 10) || isLocked)
            .map(num => (
              <option key={num} value={num}>{num} PTS</option>
            ))
          }
        </select>
      </div>
    </div>
  );
}

function KnockoutGameCard({ game, selectedTeam, usedTeams, onPick, isLocked }: any) {
  const isAwayUsed = (usedTeams || []).includes(game?.away) && selectedTeam !== game?.away;
  const isHomeUsed = (usedTeams || []).includes(game?.home) && selectedTeam !== game?.home;
  return (
    <div className={`p-4 flex-1 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 w-full ${isLocked ? 'opacity-75' : ''}`}>
      <TeamButton team={String(game?.away)} abbr={game?.awayAbbr} name={game?.awayName} selected={String(selectedPick) === String(game?.away)} isLocked={isLocked} onClick={() => onPick(String(game?.away))} />
     <div className="text-sm font-black text-slate-200 uppercase italic tracking-widest hidden sm:block">VS</div>
     <TeamButton team={String(game?.home)} abbr={game?.homeAbbr} name={game?.homeName} selected={String(selectedPick) === String(game?.home)} isLocked={isLocked} onClick={() => onPick(String(game?.home))} />
    </div>
  );
}

function LiveTrackerCell({ game, pick, rank }) {
  if (!pick || !rank) return <div className="text-center text-slate-200 py-1">-</div>;
  
  const isWinner = game?.status === 'final' && pick === game?.winner;
  const isLoser = game?.status === 'final' && pick !== game?.winner;
  
  // Clean color highlighting states
  const bg = isWinner 
    ? 'bg-green-500 text-white border-transparent shadow-sm' 
    : isLoser 
      ? 'bg-red-500 text-white border-transparent opacity-80' 
      : 'bg-white text-slate-700 border-slate-200';

  // FIX: Match the user's chosen ID string directly against the game objects to display the pretty abbreviation text
  let displayAbbr = '???';
  if (String(pick) === String(game?.away)) {
    displayAbbr = game?.awayAbbr || 'AWY';
  } else if (String(pick) === String(game?.home)) {
    displayAbbr = game?.homeAbbr || 'HME';
  }

  return (
    <div className={`font-black uppercase text-center px-1 py-1.5 rounded border transition-all duration-300 w-full h-full flex flex-col items-center justify-center leading-none tracking-tight ${bg}`}>
      <span className="text-[10px] sm:text-xs">{String(displayAbbr)}</span>
      <span className="text-[8px] sm:text-[9px] mt-0.5 bg-black/15 px-1 py-0.5 rounded shadow-inner italic opacity-80">{String(rank)}</span>
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
          <span>{g.status === 'final' ? 'FINAL' : (g.status && g.status !== 'upcoming' ? g.status.toUpperCase() : g.time)}</span>
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

function ConfidenceTrackerBoard({ data, games, week, isWeekComplete, currentUser, isWeekLocked, adminForceReveal }: any) {
  return (
    <div className="bg-white rounded-3xl shadow-xl border overflow-hidden border-t-8 border-slate-900 relative">
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
        <h2 className="text-xl sm:text-2xl font-black italic uppercase text-slate-900 leading-tight">Week {String(week)} {isWeekComplete ? 'Final' : 'Live'} Results</h2>
      </div>
      <div className="overflow-x-auto scrollbar-hide relative z-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] sm:text-xs uppercase border-b-4 border-[#FFB81C]">
              <th className="p-2 sm:p-3 sticky left-0 bg-slate-900 z-30 w-32 sm:w-48 shadow-[4px_0_15px_rgba(0,0,0,0.3)] tracking-widest italic">Identity</th>
              {(games || []).map((g: any) => (
                <th key={g.id} className="p-1 text-center border-r border-slate-700 w-auto min-w-[50px] font-black italic leading-tight relative z-10">
                  <div className="text-slate-400 text-[9px] sm:text-[10px]">{String(g.awayAbbr || g.away)} {g.awayScore !== undefined && g.awayScore !== null ? `(${g.awayScore})` : ''}</div>
                  <div className="text-white text-[9px] sm:text-[10px]">{String(g.homeAbbr || g.home)} {g.homeScore !== undefined && g.homeScore !== null ? `(${g.homeScore})` : ''}</div> </th>
              ))}
              <th className="p-2 text-center border-l border-r border-slate-700 w-12 sm:w-16 text-[#FFB81C] font-black italic relative z-10">Score</th>
              <th className="p-2 text-center border-r border-slate-700 w-12 sm:w-16 italic relative z-10">Behind</th>
              <th className="p-2 text-center border-r border-slate-700 w-12 sm:w-16 italic relative z-10">TieB</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-[10px] sm:text-sm">
            {(data || []).map((user: any, idx: number) => {
              if (!user) return null;
              const firstScore = data[0]?.confidenceScore || 0;
              const behindFirst = firstScore - user.confidenceScore;
              const behindNext = idx > 0 ? data[idx - 1]?.confidenceScore - user.confidenceScore : 0;
              const isMe = currentUser && user.id === currentUser.id;

              return (
                <tr key={user.id} className={`${isMe ? 'bg-[#FFB81C]/20 border-l-4 sm:border-l-8 border-[#FFB81C]' : 'hover:bg-slate-50'} transition-colors group relative`}>
                  <td className={`p-2 sm:p-3 sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100 shadow-[4px_0_15px_rgba(0,0,0,0.05)] ${isMe ? 'bg-[#FFB81C]/20 group-hover:bg-[#FFB81C]/30 border-l-4 sm:border-l-8 border-[#FFB81C]' : ''}`}>
                    <div className="flex items-center gap-1 sm:gap-2">
                       <span className="text-[#FFB81C] font-black italic text-xs sm:text-base w-4 sm:w-5 text-right">{String(user.displayRank)}.</span>
                       <div className={`flex flex-col leading-tight ${isMe ? 'font-black text-xs sm:text-lg' : 'font-bold text-[10px] sm:text-sm'}`}>
                          <span className="truncate max-w-[80px] sm:max-w-[120px]">{String(user.firstName)} {user.nickname ? `"${user.nickname}"` : ''}</span>
                          <span className="truncate max-w-[80px] sm:max-w-[120px]">{String(user.lastName)}</span>
                       </div>
                    </div>
                  </td>
                  {(games || []).map((g: any) => {
                    const pick = user.picks?.[week]?.[g.id];
                    const rank = user.ranks?.[week]?.[g.id];
                    const isHidden = !isWeekLocked && !adminForceReveal && !isMe;

                    return (
                      <td key={g.id} className="p-1 border-r border-slate-50 relative z-0">
                        {isHidden ? (
                          <div className="text-center text-[8px] font-black italic text-slate-300 bg-slate-100 py-2 rounded uppercase tracking-widest border border-slate-200">Hidden</div>
                        ) : (
                          <LiveTrackerCell game={g} pick={pick} rank={rank} />
                        )}
                      </td>
                    )
                  })}
<td className="p-1 sm:p-2 text-center font-black tabular-nums text-sm sm:text-xl border-l border-r border-slate-50 text-slate-900 relative z-0">
  {(() => {
    // 1. Calculate the maximum possible points for this week's number of games (Sum of 1 to totalGames)
    const maxPoints = (games.length * (games.length + 1)) / 2;

    // 2. Loop through all games to find where this user picked the wrong winner on a final game
    const lostPoints = games.reduce((acc, g) => {
      const pick = user.picks?.[week]?.[g.id];
      const rank = parseInt(user.ranks?.[week]?.[g.id], 10) || 0;
      
      // If the game is final, has a declared winner, and the user's pick is wrong, accumulate the dropped points
      if (g.status === 'final' && g.winner && pick !== g.winner) {
        return acc + rank;
      }
      return acc;
    }, 0);

    // 3. Display the remaining possible total
    return String(maxPoints - lostPoints);
  })()}
</td> 
                 <td className="p-1 sm:p-2 text-right font-black italic tabular-nums text-[9px] sm:text-xs border-r border-slate-50 relative z-0">
                    {idx === 0 ? <span className="text-slate-300">-</span> : (
                      <div className="flex flex-col items-end leading-tight">
                        <span className={behindFirst === 0 ? 'text-slate-400' : 'text-red-500'}>{behindFirst === 0 ? '0' : `-${behindFirst}`}</span>
                        <span className="text-[8px] sm:text-[9px] text-slate-400 mt-0.5">({behindNext === 0 ? '0' : `-${behindNext}`})</span>
                      </div>
                    )}
                  </td>
                  <td className="p-1 sm:p-2 text-center text-xs sm:text-sm font-bold text-slate-500 italic border-r border-slate-50 relative z-0">
                    {user.wonTiebreaker ? (
                      <span className="inline-flex items-center justify-center gap-0.5 sm:gap-1 bg-[#FFB81C] text-slate-900 px-1 sm:px-2 py-0.5 rounded shadow-sm font-black text-xs sm:text-base">
                        <Target className="w-3 h-3 sm:w-4 sm:h-4" /> {String(user.tiebreakers?.[week] || '')}
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
    </div>
  );
}

function KnockoutTrackerBoard({ data, week, allGames, globalSettings, adminForceReveal, currentUser }) {
  // We want to show all possible weeks in the season column headers
  const totalWeeks = Array.from({ length: 7 }, (_, i) => i + 1);

  return (
    <div className="bg-white rounded-3xl shadow-xl border overflow-hidden border-t-8 border-red-600 relative">
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50">
        <h2 className="text-xl sm:text-2xl font-black italic uppercase text-slate-900 leading-tight">
          Knockout Master Grid
        </h2>
        <p className="text-xs text-slate-400 font-bold uppercase mt-1 tracking-wider">
          Live Grid &bull; Current Tracking: Week {week}
        </p>
      </div>

      <div className="overflow-x-auto scrollbar-hide relative z-0">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-[10px] sm:text-xs uppercase border-b-4 border-red-600">
              <th className="p-3 sticky left-0 bg-slate-900 z-30 w-40 sm:w-48 shadow-[4px_0_15px_rgba(0,0,0,0.3)] tracking-widest italic">Identity</th>
              {totalWeeks.map(wk => (
                <th key={wk} className={`p-2 text-center border-r border-slate-700 min-w-[90px] font-black italic ${wk === week ? 'text-[#FFB81C] bg-slate-800' : ''}`}>
                  Week {wk}
                </th>
              ))}
              <th className="p-3 text-center border-l border-slate-700 w-24 text-red-500 font-black italic">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-[10px] sm:text-xs">
            {(data || []).map((user) => {
              if (!user) return null;
              const isMe = currentUser && user.id === currentUser.id;

              // Determine overall game status for this user relative to the tracking week
              const isDead = ['Loser', 'Loser (No Pick)', 'No Pick', 'Previously Out', 'Disqualified (Unpaid)'].includes(user.currentStatus);

              return (
                <tr key={user.id} className={`${isMe ? 'bg-red-50/50 border-l-4 sm:border-l-8 border-red-600' : 'hover:bg-slate-50'} transition-colors group`}>
                  
                  {/* Sticky Name Column */}
                  <td className={`p-3 sticky left-0 z-20 bg-white group-hover:bg-slate-50 border-r border-slate-100 shadow-[4px_0_15px_rgba(0,0,0,0.05)] ${isMe ? 'bg-red-50 group-hover:bg-red-100/60 border-l-4 sm:border-l-8 border-red-600' : ''}`}>
                    <div className="flex flex-col leading-tight font-black uppercase text-slate-800">
                      <span className="truncate max-w-[100px] sm:max-w-[140px]">{user.firstName} {user.nickname ? `"${user.nickname}"` : ''}</span>
                      <span className="truncate max-w-[100px] sm:max-w-[140px] text-[9px] text-slate-400 font-bold mt-0.5">{user.lastName}</span>
                    </div>
                  </td>

                  {/* Dynamic Weeks Columns */}
                  {totalWeeks.map(wk => {
                    const pick = user.knockoutPicks?.[wk];
                    const targetWeekState = globalSettings?.weekStates?.[wk] || 'open';
                    
                    // Safety check for lockdown calculation
                    const weekGames = allGames?.[wk] || [];
                    let earliestGameTime = Infinity;
                    weekGames.forEach((g) => {
                      if (g?.date && g?.time && g.date.split(', ')[1]) {
                        earliestGameTime = Math.min(earliestGameTime, new Date(`${g.date.split(', ')[1]}, ${new Date().getFullYear()} ${g.time}`).getTime());
                      }
                    });
                    const isTargetPastLockdown = earliestGameTime !== Infinity && Date.now() >= (earliestGameTime - 60 * 60 * 1000);
                    const isTargetWeekLocked = targetWeekState === 'locked' || targetWeekState === 'closed' || (targetWeekState === 'open' && isTargetPastLockdown);

                    // Reveal rules: Show if week is locked, if it's forced by admin, or if it belongs to the logged-in user
                    const showPick = isTargetWeekLocked || adminForceReveal || isMe;

                    // Match the short team abbreviation style if available
                    const targetGame = weekGames.find((g) => g.away === pick || g.home === pick);
                    const displayPick = targetGame ? (pick === targetGame.away ? (targetGame.awayAbbr || pick) : (targetGame.homeAbbr || pick)) : pick;

                    let badgeColor = 'bg-slate-100 text-slate-400';
                    if (pick && showPick) {
                      if (targetWeekState === 'closed') {
                        const statusAtThatWeek = user.knockoutStatuses?.[wk];
                        badgeColor = statusAtThatWeek === 'Winner' ? 'bg-green-500 text-white font-bold' : 'bg-red-500 text-white line-through opacity-70';
                      } else {
                        badgeColor = 'bg-slate-900 text-[#FFB81C] font-bold';
                      }
                    }

                    return (
                      <td key={wk} className={`p-2 border-r border-slate-50 text-center font-black uppercase tracking-tight ${wk === week ? 'bg-slate-50/60' : ''}`}>
                        {!pick ? (
                          <span className="text-slate-200">-</span>
                        ) : !showPick ? (
                          <span className="inline-block text-[8px] px-1.5 py-1 bg-slate-100 text-slate-300 rounded border border-slate-200 tracking-wider">HIDDEN</span>
                        ) : (
                          <span className={`inline-block text-[10px] px-2 py-1 rounded shadow-sm border border-transparent ${badgeColor}`}>
                            {String(displayPick)}
                          </span>
                        )}
                      </td>
                    );
                  })}

                  {/* Status Summary Column */}
                  <td className="p-3 text-center border-l border-slate-100 font-black uppercase text-[10px] tracking-tight">
                    <span className={isDead ? 'text-red-600' : 'text-green-600'}>
                      {user.currentStatus === 'Previously Out' ? `OUT (Wk ${user.eliminatedWeek})` : user.currentStatus}
                    </span>
                  </td>

                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeasonTrackerBoard({ data, view, bonuses, sortBy, onSortChange, currentUser, globalSettings }: any) {
  return (
    <div className="bg-white rounded-3xl shadow-xl border overflow-hidden border-t-8 border-[#FFB81C] max-w-4xl mx-auto">
      <div className="p-6 bg-slate-50 border-b flex justify-between items-center">
        <h2 className="text-2xl font-black italic uppercase tracking-tight flex items-center gap-2"><Trophy className="w-6 h-6 text-[#FFB81C]" /> {view} Standings</h2>
      </div>
      <div className="divide-y">
        {(data || []).map((user: any, index: number) => (
          <div key={user.id} className={`p-4 flex items-center justify-between ${user.id === currentUser?.id ? 'bg-[#FFB81C]/10 font-bold' : 'hover:bg-slate-50'}`}>
            <div className="flex items-center gap-4">
              <span className="font-black italic text-xl text-slate-300 w-8 text-center">#{user.displayRank}</span>
              <span className="font-black uppercase text-sm text-slate-800">{formatFullName(user)}</span>
            </div>
            <div className="flex gap-4">
               <div className="text-right font-mono font-black text-lg text-slate-900 bg-slate-100 px-4 py-1.5 rounded-xl">
                 {user[view === '1st Half' ? 'cpFirstHalf' : view === '2nd Half' ? 'cpSecondHalf' : 'cpOverall'] || 0} <span className="text-[10px] font-black uppercase text-slate-400 ml-0.5">CP</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdminLifecycleCard({ week, status, onLock, onClose, onOpen }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm relative overflow-hidden group h-full">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2"><Clock className="w-4 h-4" /> Week {week} Lifecycle</h3>
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

function AdminWeekCard({ week, onChange }: any) {
  return (
    <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm h-full">
      <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Season Schedule</h3>
      <select value={week} onChange={onChange} className="w-full bg-slate-100 border-none rounded-2xl p-4 font-black italic text-2xl uppercase tracking-tighter outline-none focus:ring-4 focus:ring-[#FFB81C]/20 cursor-pointer">{MOCK_WEEKS.map(w => <option key={w} value={w}>Week {w}</option>)}</select>
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
      <td className="p-4" colSpan={6}>
        <div className="flex flex-wrap gap-4 items-center">
          <input className="border p-2 rounded w-24 text-xs" value={form.firstName || ''} onChange={(e) => setForm({...form, firstName: e.target.value})} placeholder="First" />
          <input className="border p-2 rounded w-24 text-xs" value={form.lastName || ''} onChange={(e) => setForm({...form, lastName: e.target.value})} placeholder="Last" />
          <input className="border p-2 rounded w-24 text-xs" value={form.nickname || ''} onChange={(e) => setForm({...form, nickname: e.target.value})} placeholder="Nickname" />
          <input className="border p-2 rounded w-48 text-xs" value={form.email || ''} onChange={(e) => setForm({...form, email: e.target.value})} placeholder="Email" />
          <input className="border p-2 rounded w-24 text-xs" type="password" value={form.password || ''} onChange={(e) => setForm({...form, password: e.target.value})} placeholder="Reset Pass" />
          <button onClick={() => onSave(user.id)} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold">Save</button>
          <button onClick={onCancel} className="bg-slate-300 px-3 py-1 rounded text-xs font-bold">Cancel</button>
        </div>
      </td>
    </tr>
  );
}

function LockBanner({ week }: any) { return <div className="bg-red-50 border-l-8 border-red-500 p-5 rounded-2xl flex gap-4 shadow-xl mb-6"><Lock className="w-8 h-8 text-red-500 flex-shrink-0" /><div><p className="text-lg font-black italic uppercase text-red-800">Week {week} is Locked</p></div></div>; }
function WeekSelector({ week, setWeek }: any) { return <div className="w-full md:w-auto"><label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule</label><select value={week} onChange={(e) => setWeek(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-black italic uppercase text-xl tracking-tighter outline-none focus:ring-4 focus:ring-[#FFB81C]/20 transition-all cursor-pointer">{MOCK_WEEKS.map(w => <option key={w} value={w}>Week {w}</option>)}</select></div>; }
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

// --- ADMIN SPECIFIC COMPONENTS ---
function AdminNavButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${active ? 'bg-slate-900 text-[#FFB81C] shadow-lg scale-105 z-10' : 'text-slate-500 hover:bg-slate-50'}`}>
      <Icon className="w-5 h-5" />{label}
    </button>
  );
}
function FanaticsStatsView({ allUsers, games, week, currentUserId, globalSettings }) {
  // --- 1. LIVE PROJECTIONS ENGINE ---
  const projections = useMemo(() => {
    const maxPointsPossibleByWeek = (games.length * (games.length + 1)) / 2;
    
    // Compute current baseline scores and max potentials for all playing users
    const usersProjections = allUsers.filter(u => u.playsConfidence).map(user => {
      let currentScore = maxPointsPossibleByWeek;
      let maxPotential = maxPointsPossibleByWeek;

      games.forEach(g => {
        const pick = user.picks?.[week]?.[g.id];
        const rank = parseInt(user.ranks?.[week]?.[g.id], 10) || 0;

        if (g.status === 'final' && g.winner) {
          if (pick !== g.winner) {
            currentScore -= rank; // Lost game
            maxPotential -= rank; // Cannot reclaim these points
          }
        } else {
          // Game is upcoming/live: currentScore drops temporary points until won
          currentScore -= rank; 
        }
      });

      return {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        currentScore,
        maxPotential
      };
    });

    // Calculate Highest Possible Rank for the logged-in user
    const targetUser = usersProjections.find(u => u.id === currentUserId);
    let highestPossibleRank = 1;

    if (targetUser) {
      // Count how many opponents have a current score that is strictly higher than your absolute maximum ceiling
      const definitivelyAhead = usersProjections.filter(u => u.id !== currentUserId && u.currentScore > targetUser.maxPotential).length;
      highestPossibleRank = definitivelyAhead + 1;
    }

    return {
      list: usersProjections,
      myMax: targetUser?.maxPotential || 0,
      myRankCeiling: highestPossibleRank
    };
  }, [allUsers, games, week, currentUserId]);

  // --- 2. MATCHUP INSIGHTS ---
  const insights = useMemo(() => {
    if (!games.length || !allUsers.length) return null;
    const pool = allUsers.filter(u => u.playsConfidence);
    if (!pool.length) return null;

    const gameStats = games.map(g => {
      let totalRankPoints = 0;
      let awayVotes = 0;
      let homeVotes = 0;
      let voters = 0;

      pool.forEach(u => {
        const pick = u.picks?.[week]?.[g.id];
        const rank = parseInt(u.ranks?.[week]?.[g.id], 10) || 0;
        if (pick && rank) {
          voters++;
          totalRankPoints += rank;
          if (pick === g.away) awayVotes++;
          if (pick === g.home) homeVotes++;
        }
      });

      const avgRank = voters > 0 ? (totalRankPoints / voters) : 0;
      const consensusPct = voters > 0 ? (Math.max(awayVotes, homeVotes) / voters) * 100 : 0;

      return {
        game: g,
        avgRank,
        consensusPct,
        matchupStr: `${g.awayName} @ ${g.homeName}`
      };
    });

    // Sort to extract metrics
    const highestAvg = [...gameStats].sort((a, b) => b.avgRank - a.avgRank)[0];
    const lowestAvg = [...gameStats].sort((a, b) => a.avgRank - b.avgRank)[0];
    const highestConsensus = [...gameStats].sort((a, b) => b.consensusPct - a.consensusPct)[0];
    const lowestConsensus = [...gameStats].sort((a, b) => a.consensusPct - b.consensusPct)[0];

    return { highestAvg, lowestAvg, highestConsensus, lowestConsensus };
  }, [games, allUsers, week]);

  // --- 3. SEASON HALL OF FAME ---
  const hallOfFame = useMemo(() => {
    const winTally: Record<string, number> = {};
    allUsers.filter(u => u.playsConfidence).forEach(u => { winTally[u.id] = 0; });

    // Track historical top winners across all closed weeks
    const totalWeeks = Array.from({ length: 7 }, (_, i) => i + 1);
    
    totalWeeks.forEach(wk => {
      if (globalSettings?.weekStates?.[wk] !== 'closed') return;

      const wkGames = globalSettings?.games?.[wk] || [];
      const actualTotal = globalSettings?.actualTiebreakers?.[wk] || 0;
      const maxPts = (wkGames.length * (wkGames.length + 1)) / 2;

      let topScore = -1;
      let winnersThisWeek: string[] = [];
      let bestTbDiff = Infinity;

      const playersThisWeek = allUsers.filter(u => u.playsConfidence).map(u => {
        const lostPts = wkGames.reduce((acc: number, g: any) => {
          const pick = u.picks?.[wk]?.[g.id];
          const rank = parseInt(u.ranks?.[wk]?.[g.id], 10) || 0;
          return (g.status === 'final' && g.winner && pick !== g.winner) ? acc + rank : acc;
        }, 0);
        const score = maxPts - lostPts;
        const tbDiff = Math.abs(parseInt(u.tiebreakers?.[wk] || 0, 10) - actualTotal);
        return { id: u.id, score, tbDiff };
      });

      // Find highest score
      playersThisWeek.forEach(p => {
        if (p.score > topScore) { topScore = p.score; }
      });

      // Filter to top scorers and apply tiebreaker formula
      const tiedPlayers = playersThisWeek.filter(p => p.score === topScore);
      if (tiedPlayers.length === 1) {
        winnersThisWeek.push(tiedPlayers[0].id);
      } else {
        tiedPlayers.forEach(p => {
          if (p.tbDiff < bestTbDiff) bestTbDiff = p.tbDiff;
        });
        const tiebreakerWinners = tiedPlayers.filter(p => p.tbDiff === bestTbDiff);
        tiebreakerWinners.forEach(p => winnersThisWeek.push(p.id));
      }

      winnersThisWeek.forEach(id => {
        if (winTally[id] !== undefined) winTally[id]++;
      });
    });

    return allUsers.filter(u => u.playsConfidence).map(u => ({
      name: `${u.firstName} ${u.lastName}`,
      nickname: u.nickname,
      wins: winTally[u.id] || 0
    })).sort((a, b) => b.wins - a.wins);
  }, [allUsers, globalSettings]);

  const currentWeekState = globalSettings?.weekStates?.[week] || 'open';
  const isWeekLocked = currentWeekState === 'locked' || currentWeekState === 'closed';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* SECTION 1: PROJECTIONS ENGINE */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
        <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-indigo-600" /> Live Projections Engine (Week {week})
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-900 text-white p-5 rounded-2xl text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your Max Potential Ceiling</div>
            <div className="text-4xl font-black italic text-[#FFB81C] mt-1">{projections.myMax} <span className="text-xs font-bold text-white">PTS</span></div>
          </div>
          <div className="bg-slate-900 text-white p-5 rounded-2xl text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Highest Mathematical Placement</div>
            <div className="text-4xl font-black italic text-[#FFB81C] mt-1">#{projections.myRankCeiling}</div>
          </div>
        </div>
      </div>

      {/* SECTION 2: MATCHUP INSIGHTS */}
      <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
        <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-900 mb-2 flex items-center gap-2">
          <PieChart className="text-emerald-600" /> League Matchup Insights
        </h3>
        {!isWeekLocked && !adminForceReveal ? (
          <div className="p-8 text-center text-slate-400 font-bold bg-slate-50 border border-dashed rounded-2xl uppercase tracking-widest">
            Insights remain hidden until current week locks down.
          </div>
        ) : insights ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Highest Avg Weight (Easiest Matchup)</span>
              <h4 className="font-black text-slate-800 text-lg mt-1 truncate">{insights.highestAvg?.matchupStr}</h4>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Average: {insights.highestAvg?.avgRank.toFixed(1)} Confidence PTS</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Lowest Avg Weight (Hardest Matchup)</span>
              <h4 className="font-black text-slate-800 text-lg mt-1 truncate">{insights.lowestAvg?.matchupStr}</h4>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Average: {insights.lowestAvg?.avgRank.toFixed(1)} Confidence PTS</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Highest Consensus (Most Lopsided)</span>
              <h4 className="font-black text-slate-800 text-lg mt-1 truncate">{insights.highestConsensus?.matchupStr}</h4>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Consensus: {insights.highestConsensus?.consensusPct.toFixed(0)}% Backing Single Winner</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Lowest Consensus (Most Divisive Toss-Up)</span>
              <h4 className="font-black text-slate-800 text-lg mt-1 truncate">{insights.lowestConsensus?.matchupStr}</h4>
              <p className="text-xs font-bold text-slate-500 mt-0.5">Consensus Split: {insights.lowestConsensus?.consensusPct.toFixed(0)}% Pick Alignment</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* SECTION 3: SEASON HALL OF FAME */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-5 bg-slate-900 border-b-4 border-[#FFB81C]">
          <h3 className="text-xl font-black italic uppercase text-white flex items-center gap-2">
            <Trophy className="text-[#FFB81C]" /> Season Hall of Fame
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Outright & Tiebreaker Settled Weekly Victories Tally</p>
        </div>
        <div className="divide-y divide-slate-100">
          {hallOfFame.map((user, i) => (
            <div key={i} className="p-4 flex items-center justify-between hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <span className="font-mono text-slate-300 font-black text-lg w-6">#{i+1}</span>
                <span className="font-black text-slate-800 uppercase text-sm">{user.name} {user.nickname ? `"${user.nickname}"` : ''}</span>
              </div>
              <span className="font-black italic px-4 py-1.5 bg-[#FFB81C]/20 border border-[#FFB81C]/40 text-slate-900 rounded-xl text-sm">
                {user.wins} {user.wins === 1 ? 'WIN' : 'WINS'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null), [deadbeatsToConfirm, setDeadbeatsToConfirm] = useState<any>(null), [newUserForm, setNewUserForm] = useState({ firstName: '', lastName: '', nickname: '', email: '' });
  const [imgErrors, setImgErrors] = useState<any>({ logo: false });
  const handleImgError = (key: string) => setImgErrors((prev: any) => ({ ...prev, [key]: true }));

  useEffect(() => {
    const initAuth = async () => { try { if (typeof (window as any).__initial_auth_token !== 'undefined' && (window as any).__initial_auth_token) { await signInWithCustomToken(auth, (window as any).__initial_auth_token); } else { await signInAnonymously(auth); } } catch (err) { console.error(err); } };
    initAuth();
    return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoaded(true); });
  }, []);

  useEffect(() => {
    if (!authLoaded) return;
    if (!user) { setSessionLoaded(true); return; }
    return onSnapshot(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current'), (docSnap) => {
        if (docSnap.exists() && docSnap.data().currentUserId) { setCurrentUserId(docSnap.data().currentUserId); setIsLoggedIn(true); } 
        else { setIsLoggedIn(false); setCurrentUserId(''); }
        setSessionLoaded(true);
    });
  }, [user, authLoaded]);

  useEffect(() => {
    if (!user) return;
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setGlobalSettings({ ...data, fpPayouts: data.fpPayouts || [100, 80, 70, 60, 50, 40, 30, 20] });
      } else setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { weekStates: { 1: 'open', 2: 'open', 3: 'open', 4: 'open' }, actualTiebreakers: { 1: 0, 2: 0, 3: 0, 4: 0 }, games: initialGamesByWeek, fpPayouts: [100, 80, 70, 60, 50, 40, 30, 20], seasonBonuses: { firstHalf: [500, 400, 300, 200, 100, 50, 25, 10], secondHalf: [500, 400, 300, 200, 100, 50, 25, 10], overall: [1000, 800, 600, 400, 200, 100, 50, 25] }, knockoutSession: 1, announcement: "Welcome to Hanover Football Fanatics! Submit your picks before the first game kicks off." });
    });
    const unsubPlayers = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'players'), async (snapshot) => {
      if (snapshot.empty) { const batch = writeBatch(db); INITIAL_USERS.forEach(u => { batch.set(doc(collection(db, 'artifacts', appId, 'public', 'data', 'players'), u.id), u); }); await batch.commit(); } 
      else { const loadedUsers: any[] = []; snapshot.forEach(d => loadedUsers.push(d.data())); setAllUsers(loadedUsers); }
    });
    return () => { unsubSettings(); unsubPlayers(); };
  }, [user]);

  // FIX: DEFAULT WEEK NOW SETS TO FIRST NON-CLOSED WEEK
  useEffect(() => { 
    if (globalSettings && allUsers.length > 0 && !dbReady) { 
        setSelectedWeek(MOCK_WEEKS.find(w => globalSettings.weekStates?.[w] !== 'closed') || 1); 
        setDbReady(true); 
    } 
  }, [globalSettings, allUsers, dbReady]);

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
    const usersWithScores = allUsers.filter(u => u.playsConfidence).map(user => { return { ...user, confidenceScore: calculatePoints(user.picks?.[selectedWeek] || {}, user.ranks?.[selectedWeek] || {}, games), tbDiff: Math.abs(parseInt(user.tiebreakers?.[selectedWeek] || 0) - actualTotal) }; });
    usersWithScores.forEach(user => { const tiedUsers = usersWithScores.filter(u => u.confidenceScore === user.confidenceScore); if (tiedUsers.length > 1) { const minTbDiff = Math.min(...tiedUsers.map(u => u.tbDiff)); if (minTbDiff !== Math.max(...tiedUsers.map(u => u.tbDiff)) && user.tbDiff === minTbDiff) user.wonTiebreaker = true; } });
    usersWithScores.sort((a, b) => { if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore; if (isWeekClosed && a.tbDiff !== b.tbDiff) return a.tbDiff - b.tbDiff; return String(a.lastName || '').localeCompare(String(b.lastName || '')); });
    const finalData = usersWithScores.map(u => ({ ...u, weeklyRank: 0, weeklyFP: -12 }));
    const grouped: any[] = [];
    [...usersWithScores].sort((a, b) => { if (b.confidenceScore !== a.confidenceScore) return b.confidenceScore - a.confidenceScore; if (isWeekClosed) return a.tbDiff - b.tbDiff; return 0; }).forEach(u => { const key = isWeekClosed ? `${u.confidenceScore}-${u.tbDiff}` : `${u.confidenceScore}`; const group = grouped.find(g => g.key === key); if (group) group.members.push(u.id); else grouped.push({ key, members: [u.id] }); });
    let processedCount = 0;
    grouped.forEach((group) => {
        const startRank = isWeekClosed ? (processedCount + 1) : 1, endRank = processedCount + group.members.length;
        let pointsPool = 0; for (let r = startRank; r <= endRank; r++) if (r <= 8 && globalSettings?.fpPayouts) pointsPool += (globalSettings.fpPayouts[r - 1] || 0);
        const pointsPerMember = group.members.length > 0 ? (pointsPool / group.members.length) : 0;
        group.members.forEach((id: string) => { const ui = finalData.findIndex(d => d.id === id); if (ui === -1) return; finalData[ui].weeklyRank = startRank; finalData[ui].weeklyFP = (isWeekClosed && finalData[ui].weeklyFantasyHistory?.[selectedWeek] !== undefined) ? finalData[ui].weeklyFantasyHistory[selectedWeek] : (pointsPerMember > 0 ? pointsPerMember : -12); finalData[ui].displayRank = (!isWeekClosed && finalData[ui].confidenceScore === 0) ? 1 : startRank; });
        processedCount += group.members.length;
    });
    return finalData;
  }, [allUsers, globalSettings, selectedWeek, games, isWeekClosed]);

  const knockoutTrackerData = useMemo(() => {
    if (!globalSettings || !allUsers.length) return [];
    return allUsers.filter(u => u.playsKnockout).map(u => {
        let status = 'In Progress', eliminatedWeek = null;
        for (let wk = 1; wk < selectedWeek; wk++) if (globalSettings.weekStates?.[wk] === 'closed' && ['Loser', 'Loser (No Pick)', 'No Pick', undefined].includes(u.knockoutStatuses?.[wk])) { eliminatedWeek = wk; break; }
        if (u.paymentStatus === 'disqualified') status = 'Disqualified (Unpaid)';
        else if (eliminatedWeek !== null) status = 'Previously Out';
        else if (!isWeekLocked && !adminForceReveal) status = u.knockoutPicks?.[selectedWeek] ? 'Pick Hidden' : 'Waiting...';
        else if (!u.knockoutPicks?.[selectedWeek]) status = currentWeekState === 'closed' ? 'Loser (No Pick)' : 'No Pick';
        else { const game = games.find((g: any) => g.away === u.knockoutPicks[selectedWeek] || g.home === u.knockoutPicks[selectedWeek]); if (currentWeekState === 'closed') status = u.knockoutStatuses?.[selectedWeek] || 'Loser'; else if (game?.status === 'final') status = game.winner === 'TIE' ? 'Loser' : (game.winner === u.knockoutPicks[selectedWeek] ? 'Winner' : 'Loser'); else status = 'Undecided'; }
        return { ...u, currentStatus: status, pick: u.knockoutPicks?.[selectedWeek], eliminatedWeek };
      }).sort((a, b) => {
        const order: any = { 'Winner': 1, 'Undecided': 2, 'Pick Hidden': 3, 'Waiting...': 4, 'Loser': 5, 'No Pick': 6, 'Loser (No Pick)': 7, 'Previously Out': 8, 'Disqualified (Unpaid)': 9 };
        if ((order[a.currentStatus] || 99) !== (order[b.currentStatus] || 99)) return (order[a.currentStatus] || 99) - (order[b.currentStatus] || 99);
        if (a.currentStatus === 'Previously Out' && a.eliminatedWeek !== b.eliminatedWeek) return (b.eliminatedWeek || 0) - (a.eliminatedWeek || 0);
        return String(a.firstName || '').localeCompare(String(b.firstName || ''));
      });
  }, [allUsers, globalSettings, selectedWeek, currentWeekState, games, isWeekLocked, adminForceReveal]);

  const seasonStats = useMemo(() => {
    if (!globalSettings || !allUsers.length) return [];
    const activeFpField = seasonView === '1st Half' ? 'fpFirstHalf' : seasonView === '2nd Half' ? 'fpSecondHalf' : 'fpOverall', activeCpField = seasonView === '1st Half' ? 'cpFirstHalf' : seasonView === '2nd Half' ? 'cpSecondHalf' : 'cpOverall';
    let latestClosedWeek = 0; for (let wk = 1; wk <= 18; wk++) if (globalSettings.weekStates?.[wk] === 'closed') latestClosedWeek = wk;
    const baseStats = allUsers.filter(u => u.playsConfidence).map(user => {
      let fp1 = 0, fp2 = 0, fpo = 0, cp1 = 0, cp2 = 0, cpo = 0, prevCpo = 0;
      for(let wk=1; wk<=18; wk++) if (globalSettings.weekStates?.[wk] === 'closed') {
          const fp = parseFloat(user.weeklyFantasyHistory?.[wk]) || (user.playsConfidence ? -12 : 0), cp = parseFloat(user.weeklyConfidenceHistory?.[wk]) || 0;
          if (wk <= 9) { fp1 += fp; cp1 += cp; } else { fp2 += fp; cp2 += cp; } fpo += fp; cpo += cp; if (wk < latestClosedWeek) prevCpo += cp;
      }
      return { ...user, fpFirstHalf: fp1, fpSecondHalf: fp2, fpOverall: fpo, cpFirstHalf: cp1, cpSecondHalf: cp2, cpOverall: cpo, previousCpOverall: prevCpo };
    });
    [...baseStats].sort((a, b) => b.previousCpOverall - a.previousCpOverall).forEach((u, i) => { const ou = baseStats.find(b => b.id === u.id); if (ou) ou.previousRank = i + 1; });
    const sorted = baseStats.sort((a, b) => seasonSortBy === 'points' ? (b[activeCpField] !== a[activeCpField] ? b[activeCpField] - a[activeCpField] : b[activeFpField] - a[activeFpField]) : (b[activeFpField] !== a[activeFpField] ? b[activeFpField] - a[activeFpField] : b[activeCpField] - a[activeCpField]));
    let rank = 1;
    sorted.forEach((u, i) => {
      if (i > 0 && u[seasonSortBy === 'points' ? activeCpField : activeFpField] < sorted[i - 1][seasonSortBy === 'points' ? activeCpField : activeFpField]) rank = i + 1;
      u.displayRank = rank;
      const isPeriodComplete = (seasonView === '1st Half' && globalSettings?.weekStates?.[9] === 'closed') || (seasonView === '2nd Half' && globalSettings?.weekStates?.[18] === 'closed') || (seasonView === 'Overall' && globalSettings?.weekStates?.[18] === 'closed');
      
      const bonusesObj = globalSettings?.seasonBonuses || {};
      const bonusArray = Array.isArray(bonusesObj) ? bonusesObj : (bonusesObj[seasonView === '1st Half' ? 'firstHalf' : seasonView === '2nd Half' ? 'secondHalf' : 'overall'] || []);
      const safeBonusArray = bonusArray || [];
      
      u.bonusFp = isPeriodComplete ? (safeBonusArray[rank - 1] || 0) : 0;
      u.totalFp = u[activeFpField] + u.bonusFp;
    });
    return sorted;
  }, [allUsers, globalSettings, seasonView, seasonSortBy]);

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

  
// --- API SPORTS INTEGRATION ---
const handleFetchSchedule = async () => {
  if (!globalSettings?.apiSportsKey) return alert("Please enter your API-Sports Key in the Admin Settings tab.");
  const fetchDateStr = prompt(`Enter date to fetch MLB schedule for Week ${selectedWeek} (YYYY-MM-DD):`);
  if (!fetchDateStr) return;
  
  setIsSyncing(true);
  try {
      const season = fetchDateStr.split('-')[0]; 
      const res = await fetch(`https://v1.baseball.api-sports.io/games?date=${fetchDateStr}&league=1&season=${season}`, {
          headers: { 'x-apisports-key': globalSettings.apiSportsKey }
      });
      const json = await res.json();
      
      if (json.errors && Object.keys(json.errors).length > 0) {
          console.error("API Errors:", json.errors);
          alert("API Error: " + Object.values(json.errors)[0]);
          setIsSyncing(false);
          return;
      }
      
      if (!json.response || json.response.length === 0) {
          alert("0 games found. Ensure the date is during the MLB regular season (e.g., 2024-04-15).");
          setIsSyncing(false);
          return;
      }
      
      const getInitials = (name: string) => name.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase();

      const newGames = json.response.map((match: any) => {
          const awayName = match.teams?.away?.name || 'Away';
          const homeName = match.teams?.home?.name || 'Home';
          
          const rawDateString = match.date || `${fetchDateStr}T12:00:00Z`;
          const gameTime = new Date(rawDateString).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
          
          return {
              id: match.id || Math.floor(Math.random() * 100000), 
              away: String(match.teams.away.id), // DATABASE KEY
              home: String(match.teams.home.id), // DATABASE KEY
              awayAbbr: getInitials(awayName),   // UI VISUAL KEY
              homeAbbr: getInitials(homeName),   // UI VISUAL KEY
              awayName: awayName,
              homeName: homeName,
              date: fetchDateStr, 
              apiDate: fetchDateStr, 
              time: gameTime,
              status: 'upcoming'
          };
      });
      
      trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { 
        [`games.${selectedWeek}`]: newGames 
      }));
      alert(`Successfully loaded ${newGames.length} MLB games into Week ${selectedWeek}!`);
      
  } catch (e) {
      console.error("Schedule Fetch Error:", e);
      alert("Failed to fetch schedule. Check console for details.");
  } finally {
      setIsSyncing(false);
  }
};

const handleForceFixGames = async () => {
    setIsSaving(true);
    const fixedGames = games.map((g: any) => ({
        ...g,
        away: g.awayName + "-Away", 
        home: g.homeName + "-Home", 
        awayAbbr: g.awayAbbr || g.away.substring(0,3),
        homeAbbr: g.homeAbbr || g.home.substring(0,3)
    }));

    try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { 
            [`games.${selectedWeek}`]: fixedGames 
        });
        alert("SUCCESS! Database scrubbed. Duplicate teams have been forcefully separated.");
    } catch (e) {
        alert("Error fixing games.");
    }
    setIsSaving(false);
};

const handleSyncScores = async () => {
  if (!globalSettings?.apiSportsKey) return alert("Please enter your API-Sports Key in the Admin Settings tab.");
  setIsSyncing(true);
  try {
      const datesToFetch = [...new Set(games.map((g: any) => g.apiDate).filter(Boolean))];
      if(datesToFetch.length === 0) {
           alert("No API dates found on current games. Please import a schedule first.");
           setIsSyncing(false);
           return;
      }
      
      let apiGames: any[] = [];
      for (const date of datesToFetch) {
          const season = String(date).split('-')[0];
          const res = await fetch(`https://v1.baseball.api-sports.io/games?date=${date}&league=1&season=${season}`, {
              headers: { 'x-apisports-key': globalSettings.apiSportsKey }
          });
          const json = await res.json();
          if (json.response) apiGames = [...apiGames, ...json.response];
      }
      
      const updatedGames = games.map((g: any) => {
          const match = apiGames.find(ag => ag.teams.away.name.includes(g.awayName) && ag.teams.home.name.includes(g.homeName));
          if (match) {
              const isFinal = ['FT', 'AOT'].includes(match.status.short);
              let winner = g.winner;
              if (isFinal) winner = match.scores.home.total > match.scores.away.total ? g.home : g.away;
              return { 
                  ...g, 
                  status: isFinal ? 'final' : 'upcoming', 
                  homeScore: match.scores.home.total, 
                  awayScore: match.scores.away.total,
                  winner: winner
              };
          }
          return g;
      });
      
      trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { 
        [`games.${selectedWeek}`]: updatedGames 
      }));
      alert("Live scores synced successfully!");
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
  const saveInlineUserEdit = async (userId: string) => { setIsSaving(true); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), { firstName: editUserForm.firstName, lastName: editUserForm.lastName, nickname: editUserForm.nickname, email: editUserForm.email, password: editUserForm.password }); setEditingUserId(null); setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  const handleAddUser = async () => { if (!newUserForm.firstName || !newUserForm.lastName) return; const newId = `u-${Date.now()}`; const baseUsername = (newUserForm.firstName.charAt(0) + newUserForm.lastName).toLowerCase().replace(/[^a-z]/g, ''); setIsSaving(true); await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', newId), { id: newId, firstName: newUserForm.firstName, lastName: newUserForm.lastName, nickname: newUserForm.nickname, email: newUserForm.email, username: baseUsername, password: baseUsername, requiresPasswordChange: true, role: 'user', paymentStatus: 'unpaid', playsConfidence: true, playsKnockout: true, picks: {1:{},2:{},3:{},4:{}}, ranks: {1:{},2:{},3:{},4:{}}, tiebreakers: {1:'',2:'',3:'',4:''}, knockoutPicks: {}, knockoutStatuses: {}, weeklyFantasyHistory: {}, weeklyConfidenceHistory: {} }); setNewUserForm({ firstName: '', lastName: '', nickname: '', email: '' }); setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  const handleDeleteUser = async (id: string) => { setIsSaving(true); await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', id)); setConfirmDeleteId(null); setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  const handleResetKnockout = async () => { const batch = writeBatch(db); allUsers.forEach(u => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { knockoutPicks: {}, knockoutStatuses: {} })); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { knockoutSession: (globalSettings.knockoutSession || 1) + 1 }); setIsSaving(true); await batch.commit(); setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); setShowResetConfirm(false); };
  const handleResetFanatics = async () => { setIsSaving(true); try { const batch = writeBatch(db); allUsers.forEach(u => { batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { picks: {1:{},2:{},3:{},4:{}}, ranks: {1:{},2:{},3:{},4:{}}, tiebreakers: {1:'',2:'',3:'',4:''}, weeklyFantasyHistory: {}, weeklyConfidenceHistory: {} }); }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { weekStates: { 1: 'open', 2: 'open', 3: 'open', 4: 'open' }, actualTiebreakers: { 1: 0, 2: 0, 3: 0, 4: 0 }}); await batch.commit(); window.location.reload(); } catch (e) { console.error(e); setIsSaving(false); } };
  const updateGameResult = (gameId: number, resultType: string, teamId: string) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`games.${selectedWeek}`]: games.map((g: any) => g.id !== gameId ? g : (resultType === 'upcoming' ? { ...g, status: 'upcoming', winner: null } : { ...g, status: 'final', winner: resultType === 'TIE' ? 'TIE' : teamId })) }));
  const handleLockWeek = () => { const deadbeats: any[] = []; allUsers.forEach(u => { if (u.playsConfidence && (games.filter((g: any) => (u.picks?.[selectedWeek] || {})[g.id] && (u.ranks?.[selectedWeek] || {})[g.id]).length !== totalGames || String(u.tiebreakers?.[selectedWeek] || '').trim() === '')) deadbeats.push({ name: formatFullName(u), type: 'Fanatics' }); }); if (deadbeats.length > 0) setDeadbeatsToConfirm(deadbeats); else executeLockWeek(); };
  const executeLockWeek = async () => { const batch = writeBatch(db); allUsers.forEach(u => { if (!u.playsConfidence) return; const fullyPicked = games.filter((g: any) => (u.picks?.[selectedWeek]||{})[g.id] && (u.ranks?.[selectedWeek]||{})[g.id]).length === totalGames && String(u.tiebreakers?.[selectedWeek]||'').trim() !== ''; if (!fullyPicked) { const dp: any = {}, dr: any = {}; games.forEach((g: any) => { dp[g.id] = g.home; dr[g.id] = 5; }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { [`picks.${selectedWeek}`]: dp, [`ranks.${selectedWeek}`]: dr, [`tiebreakers.${selectedWeek}`]: '0' }); } }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`weekStates.${selectedWeek}`]: 'locked' }); setIsSaving(true); try { await batch.commit(); } catch (e) { console.error(e); } setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); setDeadbeatsToConfirm(null); };
  const handleCloseWeek = async () => { const batch = writeBatch(db); weeklyTrackerData.forEach(u => batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { [`weeklyFantasyHistory.${selectedWeek}`]: u.weeklyFP, [`weeklyConfidenceHistory.${selectedWeek}`]: u.confidenceScore })); allUsers.forEach(u => { if (u.playsKnockout) { const pick = u.knockoutPicks?.[selectedWeek]; let status = 'No Pick'; if (pick) { const game = games.find((g: any) => g.away === pick || g.home === pick); if (game && game.status === 'final') status = game.winner === 'TIE' ? 'Loser' : (game.winner === pick ? 'Winner' : 'Loser'); else status = 'Undecided'; } batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { [`knockoutStatuses.${selectedWeek}`]: status }); } }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`weekStates.${selectedWeek}`]: 'closed' }); setIsSaving(true); try { await batch.commit(); } catch (e) { console.error(e); } setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  const handleOpenWeek = () => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`weekStates.${selectedWeek}`]: 'open' }));
  const updateFpPayouts = (index: number, val: number) => { const newPayouts = [...globalSettings.fpPayouts]; newPayouts[index] = val; trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { fpPayouts: newPayouts })); };
  const updateSeasonBonuses = (key: string, index: number, val: number) => { const newBonuses = { ...globalSettings.seasonBonuses }; newBonuses[key] = [...newBonuses[key]]; newBonuses[key][index] = val; trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { seasonBonuses: newBonuses })); };
  const handleConfidenceQuickPicks = async (forAll = false) => { const usersToUpdate = forAll ? allUsers.filter(u => u.playsConfidence) : [currentUser]; const batch = writeBatch(db); usersToUpdate.forEach(u => { const newPicks = { ...(u.picks[selectedWeek] || {}) }, newRanks = { ...(u.ranks[selectedWeek] || {}) }, availableRanks = Array.from({ length: totalGames }, (_, i) => i + 1); for (let i = availableRanks.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [availableRanks[i], availableRanks[j]] = [availableRanks[j], availableRanks[i]]; } games.forEach((g: any, idx: number) => { newPicks[g.id] = Math.random() > 0.5 ? g.away : g.home; newRanks[g.id] = availableRanks[idx]; }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { [`picks.${selectedWeek}`]: newPicks, [`ranks.${selectedWeek}`]: newRanks, [`tiebreakers.${selectedWeek}`]: String(Math.floor(Math.random() * 30) + 30) }); }); setIsSaving(true); try { await batch.commit(); } catch (e) { console.error(e); } setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  const handleKnockoutQuickPick = async (forAll = false) => { const usersToUpdate = forAll ? allUsers.filter(u => u.playsKnockout) : [currentUser]; const batch = writeBatch(db); let hasUpdates = false; usersToUpdate.forEach(u => { if (wasAlreadyOut(u, selectedWeek, globalSettings.weekStates)) return; const usedTeams = Object.values(u.knockoutPicks || {}), availableTeams = games.flatMap((g: any) => [g.away, g.home]).filter((t: any) => !usedTeams.includes(t)); if (availableTeams.length > 0) { batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { [`knockoutPicks.${selectedWeek}`]: availableTeams[Math.floor(Math.random() * availableTeams.length)] }); hasUpdates = true; } }); if (hasUpdates) { setIsSaving(true); try { await batch.commit(); } catch (e) { console.error(e); } setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); } };
  const handleEmailReminders = () => { const emails = [...(statusSummary?.inProgress || []), ...(statusSummary?.notStarted || [])].map(u => u.email).filter(e => e && e.trim() !== '').join(','); if (emails) window.location.href = `mailto:?bcc=${emails}&subject=Hanover Fanatics - Missing Picks&body=Hey everyone,%0D%0A%0D%0APlease don't forget to submit your test picks for Week ${selectedWeek}!`; else alert("No email addresses found for missing users."); };

  if (!dbReady || !sessionLoaded) return <div className="min-h-screen flex flex-col items-center justify-center text-white" style={fieldBackgroundStyle}><RefreshCw className="w-12 h-12 text-[#FFB81C] animate-spin mb-4" /><h1 className="text-2xl font-black italic uppercase tracking-widest text-[#FFB81C]">Syncing Database...</h1><p className="text-slate-400 font-bold mt-2">Connecting to live servers</p></div>;
  if (!isLoggedIn) return <LoginView users={allUsers} onLogin={async (id: string) => { setCurrentUserId(id); setOverrideUserId(null); setIsLoggedIn(true); if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current'), { currentUserId: id }); }} imgError={imgErrors.logo} handleImgError={handleImgError} onChangePassword={handleChangePassword} />;
  if (isLoggedIn && !currentUser) return <div className="min-h-screen flex flex-col items-center justify-center text-white" style={fieldBackgroundStyle}><RefreshCw className="w-12 h-12 text-[#FFB81C] animate-spin mb-4" /><h1 className="text-2xl font-black italic uppercase tracking-widest text-[#FFB81C]">Loading Account...</h1></div>;

  const userPaymentStatus = currentUser.paymentStatus || 'unpaid', myStat = seasonStats.find(u => u.id === currentUser.id), firstPlacePoints = seasonStats[0]?.[seasonView === '1st Half' ? 'cpFirstHalf' : seasonView === '2nd Half' ? 'cpSecondHalf' : 'cpOverall'] || 0, knockoutStatus = knockoutTrackerData.find(u => u.id === currentUser.id)?.currentStatus, myRank = myStat?.displayRank || '-', myPoints = myStat?.cpOverall || 0, pointsBehind = firstPlacePoints - myPoints, rankChange = (myStat?.previousRank && myStat?.previousCpOverall > 0) ? (myStat.previousRank - myStat.displayRank) : 0;
  let displayKnockoutStatus = knockoutStatus || '-'; if (currentUser.playsKnockout && !['Alive', 'Winner', 'Waiting...', 'Pick Hidden', 'In Progress', 'Undecided'].includes(knockoutStatus)) { if (isWeekClosed && knockoutStatus === 'Winner') displayKnockoutStatus = 'Still Alive, waiting for pick'; else if (['Waiting...', 'Pick Hidden'].includes(knockoutStatus)) displayKnockoutStatus = 'Still Alive, Needs Pick'; else if (['In Progress', 'Undecided'].includes(knockoutStatus)) displayKnockoutStatus = 'Still Alive, Pick Locked'; else if (knockoutStatus === 'Winner') displayKnockoutStatus = 'Still Alive (Won)'; }

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
            {currentUser?.playsConfidence && <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1"><NavButton icon={CalendarDays} label="Fanatics" active={activeTab === 'confidence'} onClick={() => setActiveTab('confidence')} /><NavButton icon={Users} label="HFF-Results" active={activeTab === 'c-tracker'} onClick={() => setActiveTab('c-tracker')} /><NavButton icon={Trophy} label="Standings" active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} /><NavButton icon={TrendingUp} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} /></div>}
            {currentUser?.playsKnockout && <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1"><NavButton icon={Skull} label="Knockout" active={activeTab === 'knockout'} onClick={() => setActiveTab('knockout')} className="text-red-300 hover:text-red-100" /><NavButton icon={HeartPulse} label="KO-Results" active={activeTab === 'k-tracker'} onClick={() => setActiveTab('k-tracker')} className="text-red-300 hover:text-red-100" /></div>}
            {isAdmin && <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1"><NavButton icon={ShieldCheck} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} className="text-[#FFB81C]" /></div>}
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end gap-1">
                {isAdmin ? <div className="flex items-center gap-2"><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Playing As</span><select value={overrideUserId || currentUserId} onChange={(e) => setOverrideUserId(e.target.value)} className="bg-slate-800 text-[#FFB81C] border border-white/20 text-xs font-black uppercase py-1 px-2 rounded outline-none shadow-lg cursor-pointer max-w-[150px] truncate"><option value={currentUserId}>Yourself</option><option disabled>──────</option>{allUsers.filter(u => u.id !== currentUserId).map(u => <option key={u.id} value={u.id}>{String(u.firstName)} {String(u.lastName)}</option>)}</select></div> : <div className="flex items-center gap-2"><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Logged In As</span><span className="text-sm font-black uppercase text-white tracking-tighter truncate max-w-[150px]">{formatFullName(currentUser)}</span></div>}
                <div className="flex items-center gap-2 mt-1"><button onClick={() => setShowChangePassword(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-700"><KeyRound className="w-3 h-3"/> Password</button><button onClick={async () => { setIsLoggedIn(false); setCurrentUserId(''); setOverrideUserId(null); if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current')); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-700"><LogOut className="w-3 h-3"/> Logout</button></div>
            </div>
            <div className="w-12 h-12 rounded-full bg-[#FFB81C] text-slate-900 flex items-center justify-center text-lg font-black shadow-lg border-2 border-white/20 flex-shrink-0">{String(currentUser.firstName?.[0] || 'U')}</div>
          </div>
        </div>
      </header>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t-2 border-[#FFB81C] z-40 print:hidden overflow-x-auto scrollbar-hide">
        <div className="flex justify-start items-center p-2 gap-2 min-w-max">
            <MobileNavButton icon={Home} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            {currentUser?.playsConfidence && <><MobileNavButton icon={CalendarDays} label="Fanatics" active={activeTab === 'confidence'} onClick={() => setActiveTab('confidence')} /><MobileNavButton icon={Users} label="HFF-Results" active={activeTab === 'c-tracker'} onClick={() => setActiveTab('c-tracker')} /><MobileNavButton icon={Trophy} label="Standings" active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} /><NavButton icon={TrendingUp} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} /></>}
            {currentUser?.playsKnockout && <><MobileNavButton icon={Skull} label="Knockout" active={activeTab === 'knockout'} onClick={() => setActiveTab('knockout')} /><MobileNavButton icon={HeartPulse} label="KO-Results" active={activeTab === 'k-tracker'} onClick={() => setActiveTab('k-tracker')} /></>}
            {isAdmin && <MobileNavButton icon={ShieldCheck} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} />}
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-4 py-6 print:hidden">
        {activeTab === 'dashboard' && (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl border-b-8 border-[#FFB81C] relative overflow-hidden"><div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-20 hidden md:block">{!imgErrors?.logo ? <img src="/hff-logo.png" alt="" className="w-96 h-96 object-contain" onError={() => handleImgError('logo')} /> : <Trophy className="w-96 h-96" />}</div><div className="relative z-10 flex items-center gap-6 mb-8">{!imgErrors?.logo && <img src="/hff-logo.png" alt="Logo" className="w-24 h-24 object-contain drop-shadow-xl md:hidden" onError={() => handleImgError('logo')} />}<div><h2 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter mb-2">Welcome back,<br className="sm:hidden" /> <span className="text-[#FFB81C]">{String(currentUser.firstName)}!</span></h2><p className="text-slate-400 font-bold text-lg uppercase tracking-widest">Hanover Football Fanatics Portal</p></div></div>{globalSettings?.announcement && <div className="relative z-10 bg-white/10 border border-white/20 p-5 rounded-2xl max-w-3xl backdrop-blur-sm shadow-xl"><h4 className="flex items-center gap-2 font-black uppercase text-[#FFB81C] text-sm tracking-widest mb-2"><Megaphone className="w-5 h-5" /> Admin Announcement</h4><p className="text-slate-200 font-medium leading-relaxed">{String(globalSettings.announcement || '')}</p></div>}</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center"><CalendarDays className="w-10 h-10 text-indigo-500 mb-3" /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Current Active Week</div><div className="text-4xl font-black italic text-slate-900">Week {String(selectedWeek)}</div></div>
                    {currentUser.playsConfidence ? <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center cursor-pointer hover:border-[#FFB81C] transition-all" onClick={() => setActiveTab('standings')}><Trophy className="w-10 h-10 text-[#FFB81C] mb-3" /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fanatics Rank</div><div className="text-4xl font-black italic text-slate-900 mb-1">#{String(myRank)}</div>{pointsBehind > 0 && <div className="text-xs font-bold text-slate-500">{String(pointsBehind)} pts behind 1st</div>}{pointsBehind === 0 && myPoints > 0 && <div className="text-xs font-bold text-green-600">You are in 1st!</div>}{rankChange > 0 && <div className="text-xs font-bold text-green-500 mt-1 flex items-center justify-center gap-1"><TrendingUp className="w-3 h-3"/> Up {String(rankChange)} spots</div>}{rankChange < 0 && <div className="text-xs font-bold text-red-500 mt-1 flex items-center justify-center gap-1"><TrendingDown className="w-3 h-3"/> Down {String(Math.abs(rankChange))} spots</div>}</div> : <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200 flex flex-col justify-center items-center text-center opacity-50"><Trophy className="w-10 h-10 text-slate-400 mb-3" /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Fanatics Pool</div><div className="text-sm font-bold text-slate-500 uppercase">Not Registered</div></div>}
                    {currentUser.playsKnockout ? <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center cursor-pointer hover:border-[#FFB81C] transition-all" onClick={() => setActiveTab('k-tracker')}><HeartPulse className={`w-10 h-10 mb-3 ${isKnockedOut ? 'text-red-500' : 'text-green-500'}`} /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Knockout Status</div><div className="text-2xl font-black italic text-slate-900 uppercase">{String(displayKnockoutStatus)}</div></div> : <div className="bg-slate-100 rounded-3xl p-6 border border-slate-200 flex flex-col justify-center items-center text-center opacity-50"><Skull className="w-10 h-10 text-slate-400 mb-3" /><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Knockout Pool</div><div className="text-sm font-bold text-slate-500 uppercase">Not Registered</div></div>}
                </div>
                <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center"><div><h3 className="text-xl font-black italic uppercase text-slate-900">Action Required</h3><p className="text-sm text-slate-500 font-bold mt-1">Your Week {String(selectedWeek)} checklist</p></div>{lockdownTime && globalSettings?.weekStates?.[selectedWeek] === 'open' && <div className="hidden sm:block text-right"><div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Lockdown In</div><div className="text-sm font-bold text-slate-800 flex items-center gap-1.5 justify-end"><Clock className="w-4 h-4 text-orange-500"/><CountdownClock targetTime={lockdownTime} /></div></div>}</div>
                    <div className="p-6 space-y-4">
                        {currentUser.playsConfidence && <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${isCompleteFanatics ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}><div className="flex items-center gap-4">{isCompleteFanatics ? <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-8 h-8 text-orange-500 flex-shrink-0" />}<div><h4 className={`font-black uppercase text-lg ${isCompleteFanatics ? 'text-green-800' : 'text-orange-800'}`}>{isCompleteFanatics ? 'Fanatics Picks Complete' : 'Fanatics Picks Missing'}</h4><p className={`text-sm font-medium ${isCompleteFanatics ? 'text-green-700' : 'text-orange-700'}`}>{isCompleteFanatics ? 'You have ranked all games and set a tiebreaker.' : `You have ranked ${String(fullyPickedCount)} of ${String(totalGames)} games${hasTiebreaker ? '.' : ' and need a tiebreaker.'}`}</p></div></div>{!isCompleteFanatics && globalSettings?.weekStates?.[selectedWeek] === 'open' && <button onClick={() => setActiveTab('confidence')} className="px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-orange-600 transition-colors flex items-center gap-2">Finish <ArrowRight className="w-4 h-4"/></button>}</div>}
                        {currentUser.playsKnockout && !isKnockedOut && <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${isCompleteKnockout ? 'bg-green-50 border-green-200' : 'bg-indigo-50 border-indigo-200'}`}><div className="flex items-center gap-4">{isCompleteKnockout ? <CheckCircle className="w-8 h-8 text-green-500 flex-shrink-0" /> : <AlertCircle className="w-8 h-8 text-indigo-500 flex-shrink-0" />}<div><h4 className={`font-black uppercase text-lg ${isCompleteKnockout ? 'text-green-800' : 'text-indigo-800'}`}>{isCompleteKnockout ? 'Knockout Pick Locked In' : 'Knockout Pick Needed'}</h4><p className={`text-sm font-medium ${isCompleteKnockout ? 'text-green-700' : 'text-indigo-700'}`}>{isCompleteKnockout ? `You have selected ${String(currentUser.knockoutPicks?.[selectedWeek] || 'a team')} for Week ${String(selectedWeek)}.` : 'You still need to choose your knockout team for this week.'}</p></div></div>{!isCompleteKnockout && globalSettings?.weekStates?.[selectedWeek] === 'open' && <button onClick={() => setActiveTab('knockout')} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-indigo-700 transition-colors flex items-center gap-2">Pick <ArrowRight className="w-4 h-4"/></button>}</div>}
                        {currentUser.playsKnockout && isKnockedOut && <div className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all bg-red-50 border-red-200`}><div className="flex items-center gap-4"><Skull className="w-8 h-8 text-red-500 flex-shrink-0" /><div><h4 className="font-black uppercase text-lg text-red-800">Knocked Out</h4><p className="text-sm font-medium text-red-700">You have been eliminated from the Knockout pool for this session.</p></div></div></div>}
                    </div>
                </div>
            </div>
        )}

        {activeTab === 'confidence' && (
          <div className="space-y-6 max-w-[1200px] mx-auto">
            {!currentUser.playsConfidence && <ParticipationAlert game="Fanatics" />}
            {isWeekLocked && <LockBanner week={selectedWeek} />}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <WeekSelector week={selectedWeek} setWeek={setSelectedWeek} />
              <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 w-full md:w-auto"><ProgressBar current={totalItemsCompleted} total={totalItemsRequired} percentage={progressPercentage} />{!isWeekLocked && currentUser.playsConfidence && <div className="flex gap-2"><button onClick={() => handleConfidenceQuickPicks(false)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 whitespace-nowrap"><Zap className="w-3.5 h-3.5" /> Pick (Me)</button>{isAdmin && <button onClick={() => handleConfidenceQuickPicks(true)} className="px-4 py-2 bg-purple-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2 whitespace-nowrap"><Users className="w-3.5 h-3.5" /> Pick All</button>}</div>}</div>
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
            {!currentUser.playsKnockout && <ParticipationAlert game="Survivor" />}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden border-b-8 border-[#FFB81C] shadow-2xl">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div><div className="flex items-center gap-3 mb-4"><Skull className="w-10 h-10 text-[#FFB81C]" /><h2 className="text-4xl font-black italic uppercase tracking-tighter">Knockout <span className="text-[#FFB81C]">S{globalSettings?.knockoutSession || 1} &bull; WK {String(selectedWeek)}</span></h2></div><p className="text-slate-400 font-bold max-w-lg">One winner per week. Stay alive. No team reused.</p></div>
                <div className="flex flex-col sm:flex-row items-center gap-3">{!isWeekLocked && currentUser.playsKnockout && !wasAlreadyOut(currentUser, selectedWeek, globalSettings?.weekStates) && <div className="flex gap-2 w-full sm:w-auto"><button onClick={() => handleKnockoutQuickPick(false)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black italic uppercase shadow-xl flex items-center gap-2 hover:bg-indigo-500 transition-all text-sm w-full sm:w-auto"><Zap className="w-5 h-5" /> Pick (Me)</button>{isAdmin && <button onClick={() => handleKnockoutQuickPick(true)} className="bg-purple-600 text-white px-6 py-3 rounded-2xl font-black italic uppercase shadow-xl flex items-center gap-2 hover:bg-purple-500 transition-all text-sm w-full sm:w-auto"><Users className="w-5 h-5" /> Pick All</button>}</div>}{currentUser.playsKnockout && userPaymentStatus === 'paid' && <div className="bg-[#FFB81C] text-slate-900 px-6 py-3 rounded-2xl font-black italic uppercase shadow-xl flex items-center justify-center gap-2 w-full sm:w-auto"><DollarSign className="w-6 h-6" /> Eligible</div>}</div>
              </div>
            </div>
            {wasAlreadyOut(currentUser, selectedWeek, globalSettings?.weekStates) ? <div className={`border-4 rounded-3xl p-12 text-center ${userPaymentStatus === 'disqualified' ? 'bg-red-600 border-red-800' : 'bg-red-50 border-red-500'}`}><Skull className={`w-20 h-24 mx-auto mb-4 ${userPaymentStatus === 'disqualified' ? 'text-red-900' : 'text-red-500'}`} /><h3 className={`text-4xl font-black italic uppercase tracking-tighter ${userPaymentStatus === 'disqualified' ? 'text-white' : 'text-red-900'}`}>{userPaymentStatus === 'disqualified' ? 'DISQUALIFIED (UNPAID)' : 'Knocked Out'}</h3></div> : <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${!currentUser.playsKnockout ? 'opacity-25 grayscale pointer-events-none' : ''}`}>{games.map((game: any) => <KnockoutGameCard key={game.id} game={game} selectedTeam={currentUser.knockoutPicks?.[selectedWeek]} usedTeams={Object.values(currentUser.knockoutPicks || {})} onPick={(team: string) => updateKnockoutPick(currentUser.id, selectedWeek, team)} isLocked={isWeekLocked} />)}</div>}
          </div>
        )}

        {activeTab === 'c-tracker' && (
          <div className="space-y-6 max-w-[1400px] mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
              <WeekSelector week={selectedWeek} setWeek={setSelectedWeek} />
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
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between"><WeekSelector week={selectedWeek} setWeek={setSelectedWeek} />{!isWeekLocked && isAdmin && !adminForceReveal && <button onClick={() => setAdminForceReveal(true)} className="px-6 py-2 bg-slate-900 text-[#FFB81C] rounded-xl font-black italic uppercase tracking-widest shadow-xl hover:scale-105 transition-all text-[10px]">Admin Peek</button>}</div>
            <LiveScoreTicker games={games} />
            <KnockoutTrackerBoard data={knockoutTrackerData} week={selectedWeek} allGames={globalSettings?.games} globalSettings={globalSettings} adminForceReveal={adminForceReveal} currentUser={currentUser} />
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
  <div className="space-y-6 max-w-[1200px] mx-auto">
     <div className="bg-slate-900 rounded-3xl p-8 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-8 border-[#FFB81C] shadow-2xl">
        <div>
           <h2 className="text-4xl font-black italic uppercase tracking-tighter">Fanatics Dashboard Analytics</h2>
           <p className="text-slate-400 font-bold">Live Projections, Consensus Metrics & Hall of Fame Tallies</p>
        </div>
        <WeekSelector week={selectedWeek} setWeek={setSelectedWeek} />
     </div>
     <FanaticsStatsView 
        allUsers={allUsers} 
        games={games} 
        week={selectedWeek} 
        currentUserId={currentUserId} 
        globalSettings={globalSettings}
        adminForceReveal={adminForceReveal}
     />
  </div>
)}

        {activeTab === 'admin' && isAdmin && (
          <div className="space-y-6 max-w-[1200px] mx-auto">
            <div className="flex bg-white rounded-2xl shadow-md border border-slate-200 p-1.5 mb-6 overflow-x-auto scrollbar-hide">
              <AdminNavButton icon={PieChart} label="Pick Status" active={adminTab === 'status'} onClick={() => setAdminTab('status')} />
              <AdminNavButton icon={UserCog} label="Manage Users" active={adminTab === 'users'} onClick={() => setAdminTab('users')} />
              <AdminNavButton icon={ListChecks} label="Manage Games" active={adminTab === 'games'} onClick={() => setAdminTab('games')} />
              <AdminNavButton icon={Settings} label="Site Settings" active={adminTab === 'settings'} onClick={() => setAdminTab('settings')} />
            </div>
            
            {adminTab === 'status' && (
              <div className="space-y-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 border-b-2 border-slate-100 pb-6"><WeekSelector week={selectedWeek} setWeek={setSelectedWeek} /><button onClick={handleEmailReminders} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><Mail className="w-4 h-4" /> Email Missing Picks</button></div>
                <div><h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-4 flex items-center gap-2"><CalendarDays className="w-6 h-6 text-[#FFB81C]" /> Fanatics Pick Status</h3><div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><StatusColumn title="Not Started" count={(statusSummary?.notStarted || []).length} users={statusSummary?.notStarted || []} color="slate" icon={UserMinus} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} /><StatusColumn title="In Progress" count={(statusSummary?.inProgress || []).length} users={statusSummary?.inProgress || []} color="blue" icon={Play} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} /><StatusColumn title="Completed" count={(statusSummary?.completed || []).length} users={statusSummary?.completed || []} color="green" icon={CheckCircle} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} /></div></div>
                <div className="pt-8 border-t-2 border-slate-100"><h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-4 flex items-center gap-2"><Skull className="w-6 h-6 text-[#FFB81C]" /> Knockout Pick Status</h3><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><StatusColumn title="Waiting on Pick" count={(knockoutStatusSummary?.waiting || []).length} users={knockoutStatusSummary?.waiting || []} color="slate" icon={Clock} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('knockout'); }} /><StatusColumn title="Pick Submitted" count={(knockoutStatusSummary?.submitted || []).length} users={knockoutStatusSummary?.submitted || []} color="green" icon={CheckCircle} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('knockout'); }} /></div></div>
              </div>
            )}

            {adminTab === 'users' && (
              <div className="space-y-6">
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6"><h3 className="text-lg font-black uppercase italic text-slate-900 mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-[#FFB81C]" /> Register New Player</h3><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end"><div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">First Name</label><input value={newUserForm.firstName} onChange={e => setNewUserForm({...newUserForm, firstName: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" placeholder="Andy" /></div><div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Name</label><input value={newUserForm.lastName} onChange={e => setNewUserForm({...newUserForm, lastName: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" placeholder="Smith" /></div><div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nickname</label><input value={newUserForm.nickname} onChange={e => setNewUserForm({...newUserForm, nickname: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" placeholder="Big Boom" /></div><div><label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label><input value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" placeholder="andy@example.com" /></div><button onClick={handleAddUser} className="w-full bg-slate-900 text-[#FFB81C] rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Add Player</button></div></div>
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
                  <table className="w-full text-left min-w-[1000px]">
                    <thead><tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]"><th className="p-5">Player Identity</th><th className="p-5">Email Address</th><th className="p-5 text-center">Payment Status</th><th className="p-5 text-center">Fanatics</th><th className="p-5 text-center">Knockout</th><th className="p-5 text-right">Actions</th></tr></thead>
                    <tbody className="divide-y divide-slate-100">
                      {(allUsers || []).map(user => {
                        const isEditing = editingUserId === user.id;
                        if (isEditing) return <EditUserRow key={user.id} user={user} form={editUserForm} setForm={setEditUserForm} onCancel={() => setEditingUserId(null)} onSave={saveInlineUserEdit} />;
                        return (
                          <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-5 font-black text-slate-900 text-base">{formatFullName(user)}{user.role !== 'admin' && <span className="block text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">@{String(user.username || '')}</span>}</td>
                            <td className="p-5 font-medium text-slate-600 text-sm">{String(user.email || 'No Email')}</td>
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
                       <AdminWeekCard week={selectedWeek} onChange={(e: any) => setSelectedWeek(Number(e.target.value))} />
                   </div>
                   
                   <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                       <div>
                           <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                               <Zap className="w-5 h-5 text-[#FFB81C]" /> API Data Sync
                           </h3>
                           <p className="text-sm text-slate-500 font-bold mt-1">Pull live scores or import schedule data from API-Sports.</p>
                       </div>
                       <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                           <button onClick={handleFetchSchedule} disabled={isSyncing} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-indigo-700 disabled:opacity-50 transition-colors w-full sm:w-auto">
                               Import Schedule
                           </button>
                           <button onClick={handleForceFixGames} disabled={isSaving} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-red-700 disabled:opacity-50 transition-colors w-full sm:w-auto">
                               Force-Fix Duplicates
                           </button>
                           <button onClick={handleSyncScores} disabled={isSyncing} className="px-6 py-3 bg-slate-900 text-[#FFB81C] rounded-xl font-black uppercase text-xs tracking-widest shadow-md hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                               {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin"/> : 'Sync Live Scores'}
                           </button>
                       </div>
                   </div>

                   <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                       <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4"><div><h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2"><ListChecks className="w-5 h-5 text-[#FFB81C]" /> Manage Week {String(selectedWeek)} Games</h3><p className="text-sm text-slate-500 font-bold mt-1">Manually update game statuses and winners.</p></div></div>
                       <div className="overflow-x-auto">
                         <table className="w-full text-left min-w-[600px]">
                           <thead><tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]"><th className="p-4 font-black tracking-widest">Matchup</th><th className="p-4 font-black tracking-widest text-center">Status</th><th className="p-4 font-black tracking-widest text-right">Game Result</th></tr></thead>
                           <tbody className="divide-y divide-slate-100">
                             {(games || []).map((game: any) => (
                               <tr key={game.id} className="hover:bg-slate-50 transition-colors">
                                 <td className="p-4 font-black text-slate-900 text-lg">{String(game.awayName)} @ {String(game.homeName)}<div className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">{String(game.date)} • {String(game.time)}</div></td>
                                 <td className="p-4 text-center"><span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full ${game.status === 'final' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>{String(game.status)}</span></td>
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

            {adminTab === 'settings' && (
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm"><h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2"><Megaphone className="w-4 h-4" /> Global Announcement</h3><p className="text-xs text-slate-500 font-medium mb-3">This message will appear prominently on every player's Dashboard tab.</p><textarea value={globalSettings?.announcement || ''} onChange={(e) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { announcement: e.target.value }))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-medium text-slate-900 outline-none focus:border-[#FFB81C] min-h-[100px]" placeholder="Welcome to Hanover Football Fanatics!" /></div>
                    
                    <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm mt-6">
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

                    <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm"><h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2"><Coins className="w-4 h-4" /> Weekly FP Payouts (Top 1-8)</h3><div className="grid grid-cols-4 md:grid-cols-8 gap-4">{(globalSettings?.fpPayouts || Array(8).fill(0)).map((val: any, i: number) => <AdminNumberInput key={i} label={`Rank ${i+1}`} value={val} onSave={(newVal: any) => updateFpPayouts(i, newVal)} />)}</div></div>
                    
                    <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
                        <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2"><Trophy className="w-4 h-4" /> Season/Half Payouts (Top 1-8)</h3>
                        <div className="flex flex-col gap-8">
                            {(['firstHalf', 'secondHalf', 'overall']).map(key => {
                                const bonusesObj = globalSettings?.seasonBonuses || {};
                                const safeArray = Array.isArray(bonusesObj) ? bonusesObj : (bonusesObj[key === 'firstHalf' ? 'firstHalf' : key === 'secondHalf' ? 'secondHalf' : 'overall'] || Array(8).fill(0));
                                return (
                                    <div key={key}><label className="block text-[12px] font-black uppercase text-slate-900 border-b-2 border-slate-100 pb-2 mb-3">{key === 'firstHalf' ? 'First Half' : key === 'secondHalf' ? 'Second Half' : 'Overall Season'}</label><div className="grid grid-cols-4 md:grid-cols-8 gap-4">{(safeArray || Array(8).fill(0)).map((val: any, i: number) => <AdminNumberInput key={`${key}-${i}`} label={`Rank ${i+1}`} value={val} onSave={(newVal: any) => updateSeasonBonuses(key, i, newVal)} />)}</div></div>
                                );
                            })}
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

                    <div className="bg-white p-8 rounded-3xl border-4 border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 mt-6">
                        <div className="text-center md:text-left"><h3 className="text-2xl font-black italic uppercase text-slate-900">Reset Knockout Pool</h3><p className="text-slate-500 font-medium">Session {globalSettings?.knockoutSession || 1} ends, Session {(globalSettings?.knockoutSession || 1) + 1} begins.</p></div>
                        {!showResetConfirm ? <button onClick={() => setShowResetConfirm(true)} className="px-10 py-4 bg-slate-900 text-[#FFB81C] rounded-2xl font-black italic uppercase tracking-tighter flex items-center justify-center gap-3 hover:scale-105 transition-all w-full md:w-auto shadow-lg"><RefreshCw className="w-6 h-6" /> Reset Pool</button> : <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto"><button onClick={() => setShowResetConfirm(false)} className="px-6 py-4 bg-white text-slate-700 rounded-2xl font-black italic uppercase tracking-tighter hover:bg-slate-100 transition-all w-full sm:w-auto border-2 border-slate-200">Cancel</button><button onClick={handleResetKnockout} className="px-6 py-4 bg-red-900 text-white rounded-2xl font-black italic uppercase tracking-tighter shadow-xl hover:bg-red-800 transition-all flex items-center justify-center gap-2 w-full sm:w-auto animate-pulse">Confirm Reset</button></div>}
                    </div>
                </div>
            )}
          </div>
        )}
      </main>
      {showPrintModal && <PrintModal user={currentUser} week={selectedWeek} games={games} onClose={() => setShowPrintModal(false)} bannerImg={imgErrors.logo ? null : "/hff-logo.png"} />}
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