import React, { useState, useEffect, useMemo } from 'react';
import { 
  Trophy, CalendarDays, CheckCircle, AlertCircle, TrendingUp, TrendingDown, Clock, Target, 
  Printer, X, XCircle, Users, Lock, Settings, UserCog, Edit, ShieldCheck, ShieldAlert, PieChart, 
  UserMinus, Play, DollarSign, Skull, HeartPulse, RefreshCw, Coins, ListChecks, Zap, 
  UserPlus, Trash2, Mail, LogOut, KeyRound, User, Home, Megaphone, ArrowRight, FileText, BarChart2,
  Award, Crown
} from 'lucide-react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, onSnapshot, updateDoc, writeBatch, deleteDoc, deleteField } from 'firebase/firestore';
import { StatsAndInsightsView } from './StatsAndInsightsView';
import { CloseWeekPreviewModal } from './CloseWeekPreviewModal';

// --- FIREBASE INITIALIZATION ---
const firebaseConfig = {
  apiKey: "AIzaSyBElbNciOXRwiFhbE6XBs-7QZU_BtI4ZXU",
  authDomain: "hanover-football-fanatics.firebaseapp.com",
  projectId: "hanover-football-fanatics",
  storageBucket: "hanover-football-fanatics.firebasestorage.app",
  messagingSenderId: "612826688555",
  appId: "1:612826688555:web:ffc96abfae827ffd770e6e"
};

function wkStrToInt(val: any): number {
  const parsed = parseInt(String(val || 0), 10);
  return isNaN(parsed) ? 0 : parsed;
}

// 🏈 CENTRAL NFL TEAM DIRECTORY & ALIAS MAPPER
const NFL_TEAMS: Record<string, { abbr: string; name: string; city: string; color: string; aliases: string[] }> = {
  ARI: { abbr: 'ARI', name: 'Cardinals', city: 'Arizona', color: '#97233F', aliases: ['ARI', 'ARIZONA'] },
  ATL: { abbr: 'ATL', name: 'Falcons', city: 'Atlanta', color: '#A71930', aliases: ['ATL', 'ATLANTA'] },
  BAL: { abbr: 'BAL', name: 'Ravens', city: 'Baltimore', color: '#241773', aliases: ['BAL', 'BALTIMORE'] },
  BUF: { abbr: 'BUF', name: 'Bills', city: 'Buffalo', color: '#00338D', aliases: ['BUF', 'BUFFALO'] },
  CAR: { abbr: 'CAR', name: 'Panthers', city: 'Carolina', color: '#0085CA', aliases: ['CAR', 'CAROLINA'] },
  CHI: { abbr: 'CHI', name: 'Bears', city: 'Chicago', color: '#0B162A', aliases: ['CHI', 'CHICAGO'] },
  CIN: { abbr: 'CIN', name: 'Bengals', city: 'Cincinnati', color: '#FB4F14', aliases: ['CIN', 'CINCINNATI'] },
  CLE: { abbr: 'CLE', name: 'Browns', city: 'Cleveland', color: '#311D00', aliases: ['CLE', 'CLEVELAND'] },
  DAL: { abbr: 'DAL', name: 'Cowboys', city: 'Dallas', color: '#003594', aliases: ['DAL', 'DALLAS'] },
  DEN: { abbr: 'DEN', name: 'Broncos', city: 'Denver', color: '#FB4F14', aliases: ['DEN', 'DENVER'] },
  DET: { abbr: 'DET', name: 'Lions', city: 'Detroit', color: '#0076B6', aliases: ['DET', 'DETROIT'] },
  GB:  { abbr: 'GB',  name: 'Packers', city: 'Green Bay', color: '#203731', aliases: ['GB', 'GNB', 'GRE', 'GREEN BAY', 'PACKERS'] },
  HOU: { abbr: 'HOU', name: 'Texans', city: 'Houston', color: '#03202F', aliases: ['HOU', 'HOUSTON'] },
  IND: { abbr: 'IND', name: 'Colts', city: 'Indianapolis', color: '#002C5F', aliases: ['IND', 'INDIANAPOLIS'] },
  JAX: { abbr: 'JAX', name: 'Jaguars', city: 'Jacksonville', color: '#006778', aliases: ['JAX', 'JAC', 'JACKSONVILLE', 'JAGS'] },
  KC:  { abbr: 'KC',  name: 'Chiefs', city: 'Kansas City', color: '#E31837', aliases: ['KC', 'KAN', 'KANSAS CITY'] },
  LV:  { abbr: 'LV',  name: 'Raiders', city: 'Las Vegas', color: '#000000', aliases: ['LV', 'LVR', 'OAK', 'LAS VEGAS', 'RAIDERS'] },
  LAC: { abbr: 'LAC', name: 'Chargers', city: 'LA Chargers', color: '#0080C6', aliases: ['LAC', 'CHARGERS', 'SAN DIEGO'] },
  LAR: { abbr: 'LAR', name: 'Rams', city: 'LA Rams', color: '#003594', aliases: ['LAR', 'LOS', 'LA', 'RAMS', 'ST. LOUIS'] },
  MIA: { abbr: 'MIA', name: 'Dolphins', city: 'Miami', color: '#008E97', aliases: ['MIA', 'MIAMI'] },
  MIN: { abbr: 'MIN', name: 'Vikings', city: 'Minnesota', color: '#4F2683', aliases: ['MIN', 'MINNESOTA'] },
  NE:  { abbr: 'NE',  name: 'Patriots', city: 'New England', color: '#002244', aliases: ['NE', 'NWE', 'NEW ENGLAND', 'PATRIOTS'] },
  NO:  { abbr: 'NO',  name: 'Saints', city: 'New Orleans', color: '#D3BC8D', aliases: ['NO', 'NOR', 'NEW ORLEANS', 'SAINTS'] },
  NYG: { abbr: 'NYG', name: 'Giants', city: 'NY Giants', color: '#0B2265', aliases: ['NYG', 'GIANTS', 'NEW YORK GIANTS'] },
  NYJ: { abbr: 'NYJ', name: 'Jets', city: 'NY Jets', color: '#125740', aliases: ['NYJ', 'JETS', 'NEW YORK JETS'] },
  PHI: { abbr: 'PHI', name: 'Eagles', city: 'Philadelphia', color: '#004C54', aliases: ['PHI', 'PHILADELPHIA', 'EAGLES'] },
  PIT: { abbr: 'PIT', name: 'Steelers', city: 'Pittsburgh', color: '#FFB81C', aliases: ['PIT', 'PITTSBURGH', 'STEELERS'] },
  SF:  { abbr: 'SF',  name: '49ers', city: 'San Francisco', color: '#AA0000', aliases: ['SF', 'SFO', 'SAN FRANCISCO', '49ERS', 'NINERS'] },
  SEA: { abbr: 'SEA', name: 'Seahawks', city: 'Seattle', color: '#002244', aliases: ['SEA', 'SEATTLE'] },
  TB:  { abbr: 'TB',  name: 'Buccaneers', city: 'Tampa Bay', color: '#D50A0A', aliases: ['TB', 'TAM', 'TAMPA BAY', 'BUCS', 'BUCCANEERS'] },
  TEN: { abbr: 'TEN', name: 'Titans', city: 'Tennessee', color: '#4B92DB', aliases: ['TEN', 'TENNESSEE'] },
  WAS: { abbr: 'WAS', name: 'Commanders', city: 'Washington', color: '#5A1414', aliases: ['WAS', 'WSH', 'WASHINGTON', 'COMMANDERS', 'REDSKINS'] }
};

// Global Central Resolver Function
export function getCanonicalTeamCode(rawInput: string): string {
  if (!rawInput) return '';
  const clean = String(rawInput).trim().toUpperCase();

  for (const [code, team] of Object.entries(NFL_TEAMS)) {
    if (code === clean || team.aliases.some(a => a === clean)) {
      return code;
    }
  }
  return clean;
}

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

const OFFICIAL_NFL_ABBR: Record<string, string> = {
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Los Angeles Rams': 'LAR',
  'Los Angeles Chargers': 'LAC',
  'San Francisco 49ers': 'SF',
  'Green Bay Packers': 'GB',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'Tampa Bay Buccaneers': 'TB',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Jacksonville Jaguars': 'JAX',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'Carolina Panthers': 'CAR',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'Seattle Seahawks': 'SEA',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS',
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Chicago Bears': 'CHI'
};

// Helper function to resolve team codes reliably
function getCleanTeamAbbr(rawCode: string, teamName: string): string {
  const nameLower = (teamName || '').toLowerCase();

  // Handle Packers variations
  if (nameLower.includes('packers') || rawCode === 'GRE' || rawCode === 'GNB') return 'GB';

  // Explicit city/multi-team matches
  if (nameLower.includes('giants')) return 'NYG';
  if (nameLower.includes('jets')) return 'NYJ';
  if (nameLower.includes('patriots')) return 'NE';
  if (nameLower.includes('saints')) return 'NO';
  if (nameLower.includes('rams')) return 'LAR';
  if (nameLower.includes('chargers')) return 'LAC';
  if (nameLower.includes('49ers') || nameLower.includes('niners')) return 'SF';
  if (nameLower.includes('buccaneers') || nameLower.includes('bucs')) return 'TB';
  if (nameLower.includes('chiefs')) return 'KC';
  if (nameLower.includes('raiders')) return 'LV';
  if (nameLower.includes('jaguars') || nameLower.includes('jags')) return 'JAX';

  if (teamName && OFFICIAL_NFL_ABBR[teamName]) {
    return OFFICIAL_NFL_ABBR[teamName];
  }

  // Raw code fallbacks
// Raw code fallbacks
if (rawCode === 'GRE' || rawCode === 'GNB') return 'GB';
if (rawCode === 'LOS' || rawCode === 'LA') return 'LAR';

  return rawCode || 'TBD';
}

const INITIAL_USERS = [
  { id: 'admin-1', firstName: 'Admin', lastName: 'Account', nickname: 'The Admin', username: 'admin', password: 'admin', requiresPasswordChange: true, email: '', role: 'admin', paymentStatus: 'paid', playsConfidence: true, playsKnockout: true, picks: {1:{},2:{},3:{},4:{}}, ranks: {1:{},2:{},3:{},4:{}}, tiebreakers: {1:'',2:'',3:'',4:''}, knockoutPicks: {}, knockoutStatuses: {}, weeklyFantasyHistory: {}, weeklyConfidenceHistory: {} },
];

// --- HELPER TO CONVERT NFL SYSTEM WEEKS TO DISPLAY WEEKS ---
function getDisplayWeekLabel(weekNum: number): string {
  return `Week ${weekNum}`;
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

function wasAlreadyOut(user: any, currentWeek: number, globalSettings: any) {
  if (!user || user.paymentStatus === 'disqualified') return true;
  
  const koStates = globalSettings?.koWeekStates || globalSettings?.weekStates || {};
  const startWeek = globalSettings?.knockoutStartWeek || 1;

  // Only evaluate weeks starting from when the Knockout session was reset
  for (let wk = startWeek; wk < currentWeek; wk++) {
    const wkState = koStates[wk];
    const wkStatus = user?.knockoutStatuses?.[wk];
    if (wkState === 'closed' && ['Loser', 'Loser (No Pick)', 'Knocked Out', 'No Pick'].includes(wkStatus)) {
      return true;
    }
  }
  return false;
}

function getLockdownTime(gamesList: any[]) {
  if (!gamesList || gamesList.length === 0) return null;
  
  const now = new Date().getTime();
  let earliest = Infinity;

  gamesList.forEach(g => {
    if (!g) return;

    // 1. Try apiDate first (e.g., "2026-08-20"), then fallback to g.date
    let dateStr = g.apiDate || g.date || '';
    if (dateStr.includes(',')) {
      dateStr = dateStr.split(', ')[1]; // Extract "Aug 20" from "Thu, Aug 20"
    }

    let timeStr = (g.time || '20:15').trim();

    // 2. Convert 12-hour AM/PM to 24-hour time string
    if (timeStr.toLowerCase().includes('pm') || timeStr.toLowerCase().includes('am')) {
      const isPM = timeStr.toLowerCase().includes('pm');
      let [hours, minutes] = timeStr.replace(/(am|pm)/i, '').trim().split(':');
      let h = parseInt(hours, 10);
      if (isPM && h < 12) h += 12;
      if (!isPM && h === 12) h = 0;
      timeStr = `${String(h).padStart(2, '0')}:${minutes || '00'}`;
    }

    // 3. Parse date safely
    const gameMs = new Date(`${dateStr} ${new Date().getFullYear()} ${timeStr}`).getTime() 
      || new Date(`${dateStr}T${timeStr}:00`).getTime();

    // 4. Only consider future kickoffs
    if (!isNaN(gameMs) && gameMs > now) {
      earliest = Math.min(earliest, gameMs);
    }
  });

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

    if (u && (u.isLocked || (u.failedLogins >= 5))) {
      return setError("Account is locked due to too many failed attempts. Contact an admin.");
    }

    if (u && u.password === password) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { lastLoginTime: new Date().toISOString(), failedLogins: 0, isLocked: false });
        if (u.requiresPasswordChange) { setMatchedUser(u); setNeedsPasswordChange(true); setError(''); } else onLogin(u.id);
    } else if (u) {
        const newFailedCount = (u.failedLogins || 0) + 1;
        const shouldLock = newFailedCount >= 5;
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { failedLogins: newFailedCount, isLocked: shouldLock });
        setError(shouldLock ? "Account locked due to 5 failed attempts. Contact an admin." : "Incorrect username or password.");
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
    <div className={`bg-white rounded-2xl border-2 transition-all duration-300 overflow-hidden flex flex-col sm:flex-row ${
      isFullyPicked && !isLocked 
        ? 'border-slate-900 shadow-md' 
        : selectedPick && !isLocked 
        ? 'border-[#FFB81C]/50' 
        : 'border-slate-100 hover:border-slate-200'
    }`}>
      {/* GAME INFO BAR */}
      <div className={`px-3 py-2 sm:p-4 sm:w-44 flex flex-row sm:flex-col justify-between items-center sm:justify-center border-b sm:border-b-0 sm:border-r-2 border-slate-100 ${
        isLocked ? 'bg-slate-100' : 'bg-slate-50'
      }`}>
        <div className="flex items-center gap-1.5 text-xs font-black text-slate-500 uppercase tracking-wider">
          {isLocked ? <Lock className="w-3.5 h-3.5 text-red-500 shrink-0" /> : <Clock className="w-3.5 h-3.5 text-[#FFB81C] shrink-0" />}
          <span className="truncate">{game?.date}</span>
          {game?.isTiebreaker && <span className="text-[#FFB81C] font-black text-sm leading-none" title="Tiebreaker Game">*</span>}
        </div>
        <div className="text-xs font-bold text-slate-400">{game?.time}</div>
      </div>

      {/* TEAM PICK SELECTION AREA */}
      <div className={`p-2.5 sm:p-4 flex-1 flex items-center justify-between gap-2 ${isLocked ? 'opacity-75' : ''}`}>
        {/* Away Team Button */}
        <button
          onClick={() => onPick(game?.away)}
          disabled={isLocked}
          className={`flex-1 flex items-center justify-between p-2 sm:p-3 rounded-xl border-2 transition-all ${
            selectedPick === game?.away
              ? 'border-[#FFB81C] bg-[#FFB81C]/10 text-slate-900 shadow-sm font-black'
              : 'border-transparent bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <div 
              className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-black text-[10px] sm:text-xs shrink-0 shadow-sm"
              style={{ backgroundColor: NFL_COLORS[game?.away] || '#1e293b' }}
            >
              {game?.awayAbbr || game?.away}
            </div>
            {/* Abbreviation shown on Mobile, Full Name shown on SM+ screens */}
            <span className="font-black uppercase italic text-xs sm:text-base truncate sm:hidden">
              {game?.awayAbbr || game?.away}
            </span>
            <span className="font-black uppercase italic text-xs sm:text-base truncate hidden sm:inline">
              {game?.awayName}
            </span>
          </div>
          {selectedPick === game?.away && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB81C] shrink-0 ml-1" strokeWidth={3} />}
        </button>

        <span className="text-[10px] sm:text-xs font-black text-slate-300 italic uppercase shrink-0">@</span>

        {/* Home Team Button */}
        <button
          onClick={() => onPick(game?.home)}
          disabled={isLocked}
          className={`flex-1 flex items-center justify-between p-2 sm:p-3 rounded-xl border-2 transition-all ${
            selectedPick === game?.home
              ? 'border-[#FFB81C] bg-[#FFB81C]/10 text-slate-900 shadow-sm font-black'
              : 'border-transparent bg-slate-50 hover:bg-slate-100 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            <div 
              className="w-7 h-7 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-black text-[10px] sm:text-xs shrink-0 shadow-sm"
              style={{ backgroundColor: NFL_COLORS[game?.home] || '#1e293b' }}
            >
              {game?.homeAbbr || game?.home}
            </div>
            {/* Abbreviation shown on Mobile, Full Name shown on SM+ screens */}
            <span className="font-black uppercase italic text-xs sm:text-base truncate sm:hidden">
              {game?.homeAbbr || game?.home}
            </span>
            <span className="font-black uppercase italic text-xs sm:text-base truncate hidden sm:inline">
              {game?.homeName}
            </span>
          </div>
          {selectedPick === game?.home && <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB81C] shrink-0 ml-1" strokeWidth={3} />}
        </button>
      </div>

      {/* RANK SELECTOR DROPDOWN */}
      <div className={`p-2.5 sm:p-4 sm:w-48 flex items-center justify-between sm:justify-center border-t sm:border-t-0 sm:border-l-2 border-slate-100 ${
        isLocked ? 'bg-slate-100' : 'bg-slate-50/50'
      }`}>
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest sm:hidden">Rank:</label>
        <select 
          value={selectedRank || ''} 
          onChange={(e) => onRankChange(e.target.value)} 
          disabled={isLocked} 
          className={`appearance-none bg-white border-2 ${
            selectedRank && !isLocked 
              ? 'border-[#FFB81C] text-[#FFB81C] bg-slate-900' 
              : 'border-slate-200 text-slate-500'
          } text-xs sm:text-base font-black italic uppercase rounded-xl block w-28 sm:w-36 px-2 py-2 sm:px-4 sm:py-3 text-center outline-none transition-all cursor-pointer`}
        >
          <option value="" disabled>-- PTS --</option>
          {selectedRank && <option value="">-- Clear --</option>}
          {Array.from({ length: totalGames }, (_, i) => i + 1)
            .filter(num => !(usedRanks || []).includes(num) || num === parseInt(selectedRank) || isLocked)
            .map(num => <option key={num} value={num}>{num} PTS</option>)}
        </select>
      </div>
    </div>
  );
}

function KnockoutGameCard({ game, selectedTeam, usedTeams, onPick, isLocked }: any) {
  if (!game) return null;

  const awayTeam = game.away || '';
  const homeTeam = game.home || '';
  const awayCanonical = getCanonicalTeamCode(awayTeam);
  const homeCanonical = getCanonicalTeamCode(homeTeam);
  const selectedCanonical = getCanonicalTeamCode(selectedTeam);

  const priorPicksList: string[] = Array.isArray(usedTeams) ? usedTeams : [];

  // Check if team was picked in a prior week using the central resolver
  const isTeamUsed = (targetCanonicalCode: string): boolean => {
    if (!priorPicksList || priorPicksList.length === 0) return false;
    return priorPicksList.some((p: any) => getCanonicalTeamCode(String(p)) === targetCanonicalCode);
  };

  const isAwayUsed = isTeamUsed(awayCanonical);
  const isHomeUsed = isTeamUsed(homeCanonical);

  const isAwaySelected = selectedCanonical !== '' && selectedCanonical === awayCanonical;
  const isHomeSelected = selectedCanonical !== '' && selectedCanonical === homeCanonical;

  return (
    <div className={`bg-white rounded-3xl border-4 p-4 shadow-sm transition-all ${
      isLocked ? 'border-slate-100 opacity-80 grayscale-[20%]' : 'border-slate-50 hover:border-[#FFB81C]/20'
    }`}>
      <div className="flex flex-col gap-3">
        {/* AWAY TEAM BUTTON */}
        <button 
          type="button"
          onClick={() => onPick(awayTeam)} 
          disabled={Boolean(isAwayUsed || isLocked)} 
          className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
            isAwaySelected 
              ? 'bg-slate-900 border-[#FFB81C] text-[#FFB81C] scale-[1.03] shadow-xl' 
              : isAwayUsed 
              ? 'opacity-30 bg-slate-100 border-slate-200 cursor-not-allowed grayscale' 
              : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0" 
              style={{ backgroundColor: NFL_TEAMS[awayCanonical]?.color || '#334155' }}
            >
              {awayCanonical}
            </div>
            <div className="text-left">
              <span className="font-black italic uppercase text-lg block leading-tight">{game.awayName || awayCanonical}</span>
              {isAwayUsed && <span className="text-[10px] font-black uppercase text-red-600 tracking-widest block mt-0.5">ALREADY USED</span>}
            </div>
          </div>
          {isAwaySelected && <CheckCircle className="w-6 h-6 text-[#FFB81C] shrink-0" />}
        </button>

        <div className="text-center text-[10px] font-black text-slate-300 italic uppercase">VS</div>

        {/* HOME TEAM BUTTON */}
        <button 
          type="button"
          onClick={() => onPick(homeTeam)} 
          disabled={Boolean(isHomeUsed || isLocked)} 
          className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
            isHomeSelected 
              ? 'bg-slate-900 border-[#FFB81C] text-[#FFB81C] scale-[1.03] shadow-xl' 
              : isHomeUsed 
              ? 'opacity-30 bg-slate-100 border-slate-200 cursor-not-allowed grayscale' 
              : 'bg-slate-50 border-transparent hover:bg-slate-100'
          }`}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm text-white shrink-0" 
              style={{ backgroundColor: NFL_TEAMS[homeCanonical]?.color || '#334155' }}
            >
              {homeCanonical}
            </div>
            <div className="text-left">
              <span className="font-black italic uppercase text-lg block leading-tight">{game.homeName || homeCanonical}</span>
              {isHomeUsed && <span className="text-[10px] font-black uppercase text-red-600 tracking-widest block mt-0.5">ALREADY USED</span>}
            </div>
          </div>
          {isHomeSelected && <CheckCircle className="w-6 h-6 text-[#FFB81C] shrink-0" />}
        </button>
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

  let bg = 'bg-slate-100 text-slate-900 border-slate-300';
  
  if (isWinner) {
    bg = inProgress && isProjection
      ? 'bg-emerald-600 text-white font-black border-emerald-400 animate-pulse'
      : 'bg-emerald-600 text-white font-black border-emerald-500';
  } else if (isLoser) {
    bg = inProgress && isProjection
      ? 'bg-rose-600 text-white font-black border-rose-500 animate-pulse'
      : 'bg-rose-600 text-white font-black border-rose-500';
  }

  const displayPick = pick === game?.away ? (game?.awayAbbr || pick) : (pick === game?.home ? (game?.homeAbbr || pick) : pick);

  return (
    <div className={`font-black uppercase text-center rounded py-1 px-0.5 border w-full flex flex-col items-center justify-center leading-none ${bg}`}>
      <span className="text-xs sm:text-sm font-black tracking-tighter">
        {String(displayPick)}
      </span>
      <span className={`text-[10px] sm:text-xs font-black italic mt-0.5 px-1 rounded ${isWinner ? 'bg-black/30 text-white' : inProgress && isLoser ? 'bg-rose-200 text-rose-900' : 'bg-slate-200 text-slate-900'}`}>
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
      {games.map((g: any) => {
        const isLive = ['in_progress', 'HALFTIME', '1Q', '2Q', '3Q', '4Q', 'OT', 'HT', 'LIVE', 'Q1', 'Q2', 'Q3', 'Q4'].includes(g.status);
        const hasPossessionAway = g.possession === g.away || g.possession === g.awayAbbr;
        const hasPossessionHome = g.possession === g.home || g.possession === g.homeAbbr;

        return (
          <div key={g.id} className="min-w-[150px] bg-slate-800 rounded-xl p-3 border border-slate-700 flex flex-col justify-between shrink-0 shadow-inner">
{/* STATUS / CLOCK BAR */}
<div className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2 flex justify-between items-center">
              {String(g?.status).toLowerCase() === 'final' ? (
                <span className="text-slate-400 font-black bg-slate-700/50 px-2 py-0.5 rounded">FINAL</span>
              ) : (isLive || g?.gameQuarter || g?.gameClock) ? (
                <div className="flex items-center gap-1.5 bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded-md font-mono text-[10px] w-full justify-between">
                  <span className="flex items-center gap-1 font-black animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    {g?.gameQuarter || g?.quarter || 'LIVE'}
                  </span>
                  {(g?.gameClock || g?.clock || g?.timer) && (
                    <span className="font-bold text-emerald-300">
                      {g?.gameClock || g?.clock || g?.timer}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-slate-300 font-bold tracking-tight">
                  {g?.date ? `${g.date} • ${g?.time}` : g?.time || 'UPCOMING'}
                </span>
              )}
            </div>

            {/* AWAY TEAM */}
            <div className="flex justify-between items-center mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className={`font-black text-sm ${g.winner === g.away ? 'text-[#FFB81C]' : 'text-slate-200'}`}>
                  {g.awayAbbr || g.away}
                </span>
                {hasPossessionAway && <span className="text-xs" title="In Possession">🏈</span>}
              </div>
              <span className={`font-bold font-mono text-sm ${g.awayScore !== undefined && g.awayScore !== null ? 'text-white' : 'text-slate-500'}`}>
                {g.awayScore !== undefined && g.awayScore !== null ? g.awayScore : '-'}
              </span>
            </div>

            {/* HOME TEAM */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <span className={`font-black text-sm ${g.winner === g.home ? 'text-[#FFB81C]' : 'text-slate-200'}`}>
                  {g.homeAbbr || g.home}
                </span>
                {hasPossessionHome && <span className="text-xs" title="In Possession">🏈</span>}
              </div>
              <span className={`font-bold font-mono text-sm ${g.homeScore !== undefined && g.homeScore !== null ? 'text-white' : 'text-slate-500'}`}>
                {g.homeScore !== undefined && g.homeScore !== null ? g.homeScore : '-'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getProjectedWinner(game: any) {
  if (!game) return null;
  
  if (game.status === 'final') return game.winner;
  
  const awayScore = parseInt(String(game.awayScore ?? 0), 10);
  const homeScore = parseInt(String(game.homeScore ?? 0), 10);

  if (awayScore > homeScore) return game.away;
  if (homeScore > awayScore) return game.home;
  
  return null;
}

function ConfidenceTrackerBoard({ data, games, week, isWeekComplete, currentUser, isWeekLocked, adminForceReveal, globalSettings }: any) {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isProjection, setIsProjection] = useState<boolean>(false); // Default to Official Results view

  // Calculate confidence points for each user based on games
  const processedData = useMemo(() => {
    if (!data) return [];
    
    // 1. Calculate max possible points (standard vs deadbeat)
    const standardMaxPossible = (games || []).reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);
    const hasActiveLiveGames = (games || []).some((g: any) => {
      const status = String(g.status || '').toLowerCase();
      const isLive = ['in_progress', 'ht', 'q1', 'q2', 'q3', 'q4', 'ot', 'live', 'halftime'].includes(status);
      const hasScores = (g.awayScore !== null && g.awayScore !== undefined) || (g.homeScore !== null && g.homeScore !== undefined);
      return isLive || (hasScores && g.status !== 'final');
    });
    // 2. Calculate score per user
    const calculated = data.map((user: any) => {
      const userPicks = user.picks?.[week] || {};
      const userRanks = user.ranks?.[week] || {};

      // Check if player is a deadbeat
      const isDeadbeat = user.tiebreakers?.[week] === '0' || 
        ((games || []).length > 0 && (games || []).every((g: any) => parseInt(userRanks[g.id] || 0, 10) === 5));

      const userMaxPossible = isDeadbeat ? (games || []).length * 5 : standardMaxPossible;

      const pointsLost = (games || []).reduce((lost: number, g: any) => {
        const pick = userPicks[g.id];
        const rank = parseInt(userRanks[g.id] || 0, 10);

        if (!pick || !rank) return lost;

        const projWinner = getProjectedWinner(g);
        const activeWinner = isProjection 
          ? (g.status === 'final' ? g.winner : projWinner) 
          : (g.status === 'final' ? g.winner : null);

        if (activeWinner && pick !== activeWinner) {
          return lost + rank;
        }

        return lost;
      }, 0);

      const activeScore = userMaxPossible - pointsLost;

      return {
        ...user,
        activeScore,
        confidenceScore: activeScore,
        projectedScore: activeScore
      };
    });

    // 3. Sort by Points descending
    calculated.sort((a: any, b: any) => {
      if (b.activeScore !== a.activeScore) return b.activeScore - a.activeScore;

      if (isWeekComplete && !isProjection && a.tbDiff !== undefined && b.tbDiff !== undefined && a.tbDiff !== b.tbDiff) {
        return a.tbDiff - b.tbDiff;
      }

      return String(a.lastName || '').localeCompare(String(b.lastName || ''));
    });

    // 4. Assign Rankings
    let currentRank = 1;
    calculated.forEach((u: any, i: number) => {
      const activeScore = u.activeScore;
      const prevScore = i > 0 ? calculated[i - 1].activeScore : null;

      if (i > 0 && activeScore < prevScore) {
        currentRank = i + 1;
      } else if (isWeekComplete && !isProjection && i > 0 && activeScore === prevScore && u.tbDiff !== calculated[i - 1].tbDiff) {
        currentRank = i + 1;
      }

      u.projectedRank = currentRank;
      u.displayRank = currentRank;
    });

    return calculated;
  }, [data, games, week, isProjection, isWeekComplete]);

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
      .filter((item: any) => item.myPick && item.myRank >= 8)
      .sort((a: any, b: any) => b.myRank - a.myRank)
      .slice(0, 3);
  }, [currentUser, games, week]);

  const actualTB = globalSettings?.actualTiebreakers?.[week] ?? undefined;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* PERSONAL HIGH-STAKES GAME IMPACT BAR */}
      {currentUser && highStakesGames.length > 0 && (
        <div className="bg-slate-900 rounded-2xl sm:rounded-3xl p-4 sm:p-6 text-white shadow-xl border-t-4 sm:border-t-8 border-[#FFB81C]">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h3 className="text-base sm:text-lg font-black italic uppercase text-[#FFB81C] flex items-center gap-1.5">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB81C]" /> High-Stakes Watch
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 font-bold mt-0.5">
                Top confidence picks live or upcoming
              </p>
            </div>
            <span className="text-[9px] sm:text-[10px] font-black uppercase bg-[#FFB81C]/20 text-[#FFB81C] px-2.5 py-1 rounded-full border border-[#FFB81C]/30">
              Watchlist
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
            {highStakesGames.map(({ game, myPick, myRank }: any) => {
              const projWinner = getProjectedWinner(game);
              const isWinning = projWinner === myPick;
              const displayPick = myPick === game.away ? (game.awayAbbr || myPick) : (game.homeAbbr || myPick);

              return (
                <div key={game.id} className="bg-slate-800/90 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-slate-700 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="text-[10px] font-black uppercase text-slate-400">
                      {game.awayAbbr} @ {game.homeAbbr}
                    </span>
                    <span className="text-[10px] sm:text-xs font-black italic text-[#FFB81C] bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      +{myRank} PTS
                    </span>
                  </div>

                  <div className="flex items-center justify-between my-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] sm:text-xs text-slate-400 font-bold">Pick:</span>
                      <span className="text-xs sm:text-sm font-black text-white">{displayPick}</span>
                    </div>

                    {game.status === 'in_progress' ? (
                      <span className={`text-[9px] sm:text-[10px] font-black uppercase px-2 py-0.5 rounded ${isWinning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                        {isWinning ? '▲ Winning' : '▼ Trailing'}
                      </span>
                    ) : (
                      <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 bg-slate-700/50 px-1.5 py-0.5 rounded">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <div className="text-[9px] sm:text-[10px] font-mono text-slate-400 mt-1.5 border-t border-slate-700/60 pt-1.5 flex justify-between">
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
      <div className={`rounded-3xl sm:rounded-[2rem] shadow-xl border overflow-hidden relative w-full transition-colors duration-300 ${
        isProjection 
          ? 'bg-amber-50/60 border-2 border-amber-200 border-t-6 sm:border-t-8 border-t-amber-500' 
          : 'bg-white border border-t-6 sm:border-t-8 border-slate-900'
      }`}>
        {/* HEADER & TOGGLE CONTROLS */}
        <div className={`p-3.5 sm:p-5 border-b flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 ${
          isProjection ? 'bg-amber-100/50 border-amber-200' : 'bg-slate-50 border-slate-200'
        }`}>
          <div>
            <h2 className="text-lg sm:text-2xl font-black italic uppercase text-slate-900 tracking-tight leading-tight flex items-center gap-2">
              {week <= 3 ? `Preseason W${week}` : `Week ${week - 3}`} {isProjection ? 'Live Projection' : 'Official Results'}
            </h2>
            <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-0.5">
              {isProjection ? 'Simulating live standings' : 'Official settled scores'}
            </p>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            {/* PROJECTION TOGGLE */}
            <div className="flex bg-slate-200 p-0.5 sm:p-1 rounded-xl border border-slate-300 flex-1 sm:flex-initial">
              <button
                onClick={() => setIsProjection(false)}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                  !isProjection ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Official
              </button>
              <button
                onClick={() => setIsProjection(true)}
                className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${
                  isProjection ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Zap className="w-3 h-3" /> Live
              </button>
            </div>

            {/* VIEW TOGGLE */}
            <div className="flex bg-slate-200 p-0.5 sm:p-1 rounded-xl border border-slate-300">
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'table' ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all ${
                  viewMode === 'cards' ? 'bg-slate-900 text-[#FFB81C] shadow-md' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cards
              </button>
            </div>
          </div>
        </div>

        {/* OFFICIAL TIEBREAKER BANNER */}
        {(() => {
          const tbGame = (games || []).find((g: any) => g.isTiebreaker) || games?.[games.length - 1];

          return (
            <div className="bg-slate-900 text-white p-3 sm:p-4 border-b-2 border-[#FFB81C] flex items-center justify-between px-4 sm:px-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <Target className="w-4 h-4 sm:w-5 sm:h-5 text-[#FFB81C]" />
                <div>
                  <h4 className="font-black uppercase italic text-xs sm:text-sm text-[#FFB81C] flex items-center gap-1.5">
                    Official Tiebreaker
                  </h4>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold truncate max-w-[180px] sm:max-w-none">
                    {tbGame ? `${tbGame.awayName || tbGame.away} @ ${tbGame.homeName || tbGame.home}` : 'Last Game'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 block">Total</span>
                <span className="text-sm sm:text-lg font-black italic text-[#FFB81C] font-mono">
                  {actualTB !== undefined && actualTB !== null && actualTB > 0 ? `${actualTB} PTS` : 'Pending'}
                </span>
              </div>
            </div>
          );
        })()}

        {/* COMPACT TABLE VIEW */}
        {viewMode === 'table' ? (
          <div className="overflow-x-auto scrollbar-hide relative z-0 overscroll-x-contain" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}>
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-slate-900 text-white uppercase border-b-4 border-[#FFB81C]">
                  <th className="p-1.5 sm:p-2 sticky left-0 bg-slate-900 z-30 w-32 sm:w-52 shadow-[3px_0_10px_rgba(0,0,0,0.3)] tracking-widest italic font-black text-[11px] sm:text-sm">
                    Player
                  </th>

                  {(games || []).map((g: any) => (
                    <th key={g.id} className={`p-0.5 text-center border-r border-slate-800 font-black italic leading-tight w-9 sm:w-11 ${g.isTiebreaker ? 'bg-amber-500/20' : ''}`}>
                      <div className="text-[#FFB81C] text-[10px] sm:text-xs truncate flex items-center justify-center gap-0.5">
                        <span>{String(g.awayAbbr || g.away)}</span>
                        {g.isTiebreaker && <span className="text-[#FFB81C] font-black text-xs leading-none">*</span>}
                      </div>
                      <div className="text-slate-500 text-[8px]">@</div>
                      <div className="text-white text-[10px] sm:text-xs truncate">{String(g.homeAbbr || g.home)}</div>
                    </th>
                  ))}

                  <th className="p-1 text-center border-l-2 border-r border-slate-800 w-12 sm:w-14 text-[#FFB81C] font-black italic text-[11px] sm:text-sm">
                    PTS
                  </th>
                  <th className="p-1 text-center border-r border-slate-800 w-12 sm:w-14 italic text-[10px] sm:text-xs">Behind</th>
                  <th className="p-1 text-center border-r border-slate-800 w-12 sm:w-16 italic text-[10px] sm:text-xs">TB</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {processedData.map((user: any, idx: number) => {
                  if (!user) return null;

                  const activeScore = user.activeScore ?? 0;
                  const activeRank = user.displayRank ?? 1;
                  const firstScore = processedData[0]?.activeScore ?? 0;

                  const behindFirst = firstScore - activeScore;
                  const behindNext = idx > 0 ? ((processedData[idx - 1]?.activeScore ?? 0) - activeScore) : 0;
                  const isMe = currentUser && user.id === currentUser.id;

                  return (
                    <tr key={user.id} className={`${isMe ? 'bg-[#FFB81C]/20 border-l-4 border-[#FFB81C] font-black' : isProjection ? 'hover:bg-amber-100/40' : 'hover:bg-slate-50'} transition-colors group relative`}>
                      {/* Sticky Name Column */}
                      <td className={`px-2 py-1 sticky left-0 z-20 ${isMe ? 'bg-[#F7D870] border-l-4 border-[#FFB81C]' : isProjection ? 'bg-amber-50' : 'bg-white'} border-r-2 border-slate-300 shadow-md`}>
  <div className="flex items-center gap-1.5">
    <span className="font-black italic text-xs sm:text-sm text-slate-900 w-5 text-right shrink-0">
      {activeRank}.
    </span>
    <div className="flex flex-col leading-none truncate">
      <span className="text-xs sm:text-sm font-black text-slate-900 tracking-tight truncate">
        {String(user.firstName)} {user.nickname ? `"${user.nickname}"` : ''}
      </span>
      <span className="text-[10px] sm:text-xs font-bold text-slate-700 tracking-tight truncate mt-0.5">
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
                          <td key={g.id} className={`p-0.5 border-r border-slate-100 text-center ${isMe ? 'bg-[#FFB81C]/10' : isProjection ? 'bg-amber-50/50' : 'bg-white'}`}>
                            {isHidden ? (
                              <div className="text-center text-[8px] font-black italic text-slate-300 bg-slate-50 py-1 rounded uppercase border border-slate-100">
                                Lock
                              </div>
                            ) : (
                              <LiveTrackerCell game={g} pick={pick} rank={rank} isProjection={isProjection} />
                            )}
                          </td>
                        );
                      })}

                      {/* Score & Standings Columns */}
                      <td className={`p-1 text-center font-black tabular-nums text-xs sm:text-base border-l-2 border-r border-slate-100 text-slate-900 ${isMe ? 'bg-[#FFB81C]/20' : isProjection ? 'bg-amber-50' : 'bg-white'}`}>
                        {activeScore}
                      </td>
                      <td className={`p-1 text-right font-black italic tabular-nums text-[10px] sm:text-xs border-r border-slate-100 ${isMe ? 'bg-[#FFB81C]/20' : isProjection ? 'bg-amber-50' : 'bg-white'}`}>
                        {idx === 0 ? (
                          <span className="text-slate-300 font-bold block text-center">-</span>
                        ) : (
                          <div className="flex flex-col items-end leading-tight pr-0.5">
                            <span className={behindFirst === 0 ? 'text-slate-400' : 'text-rose-600 font-black'}>
                              {behindFirst === 0 ? '0' : `-${behindFirst}`}
                            </span>
                            <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold">({behindNext === 0 ? '0' : `-${behindNext}`})</span>
                          </div>
                        )}
                      </td>
                      <td className={`p-1 text-center text-[10px] sm:text-xs font-bold text-slate-700 italic border-r border-slate-100 ${isMe ? 'bg-[#FFB81C]/20' : isProjection ? 'bg-amber-50' : 'bg-white'}`}>
                        {!isWeekLocked && !adminForceReveal && !isMe ? (
                          <span className="text-slate-300 text-[8px] font-black uppercase italic">LOCK</span>
                        ) : (isWeekComplete && !isProjection && user.wonTiebreaker) ? (
                          <span className="inline-flex items-center justify-center gap-0.5 bg-[#FFB81C] text-slate-900 px-1 py-0.5 rounded shadow-sm font-black text-[10px]">
                            <Target className="w-2.5 h-2.5" /> {String(user.tiebreakers?.[week] || '')}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">
                            {String(user.tiebreakers?.[week] || '-')}
                          </span>
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
          <div className="p-3 sm:p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {processedData.map((user: any) => {
              const isMe = currentUser && user.id === currentUser.id;
              const activeScore = user.activeScore ?? 0;
              const activeRank = user.displayRank ?? 1;

              return (
                <div
                  key={user.id}
                  className={`rounded-xl sm:rounded-2xl p-3 sm:p-4 border-2 transition-all ${
                    isMe ? 'bg-[#FFB81C]/20 border-[#FFB81C] ring-2 sm:ring-4 ring-[#FFB81C]/30 shadow-lg relative z-10' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2.5 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl sm:text-2xl font-black italic text-[#FFB81C]">#{activeRank}</span>
                      <div>
                        <h3 className="font-black uppercase text-sm sm:text-base text-slate-900 leading-tight">
                          {formatFullName(user)}
                        </h3>
                        <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                          TB: {user.tiebreakers?.[week] || '-'} PTS
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-900 text-[#FFB81C] px-2.5 sm:px-3.5 py-1 rounded-lg sm:rounded-xl font-black italic text-base sm:text-xl shadow-md">
                      {activeScore} <span className="text-[10px] sm:text-xs font-normal">PTS</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2">
                    {(games || []).map((g: any) => {
                      const pick = user.picks?.[week]?.[g.id];
                      const rank = user.ranks?.[week]?.[g.id];
                      const isHidden = !isWeekLocked && !adminForceReveal && !isMe;

                      return (
                        <div key={g.id} className="bg-white p-1 rounded-lg border border-slate-200 text-center shadow-sm flex flex-col items-center">
                          <div className="text-[9px] font-black uppercase text-slate-400 mb-0.5 truncate w-full">
                            {g.awayAbbr}@{g.homeAbbr}
                          </div>
                          {isHidden ? (
                            <span className="text-[9px] font-black uppercase text-slate-300 py-0.5">LOCK</span>
                          ) : (
                            <LiveTrackerCell game={g} pick={pick} rank={rank} isProjection={isProjection} />
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
function KnockoutTrackerBoard({ data, week, allGames, isLocked, adminForceReveal, currentUser, globalSettings }: any) {
  const maxWeeks = globalSettings?.maxActiveWeeks || 18;
  const startWeek = globalSettings?.knockoutStartWeek || 1;

  const activeWeeks = Array.from({ length: Math.max(1, maxWeeks - startWeek + 1) }, (_, i) => startWeek + i);

  const sortedGridData = useMemo(() => {
    if (!data || !Array.isArray(data)) return [];

    const startWk = globalSettings?.knockoutStartWeek || 1;

    return [...data].map((user: any) => {
      if (!user) return null;

      let eliminatedWeek: number | null = null;
      const statuses = user.knockoutStatuses || {};

      for (let wk = startWk; wk <= maxWeeks; wk++) {
        const wkStatus = statuses[wk];
        const wkState = globalSettings?.koWeekStates?.[wk] || globalSettings?.weekStates?.[wk];

        if (['Loser', 'Loser (No Pick)', 'Knocked Out'].includes(wkStatus)) {
          eliminatedWeek = wk;
          break;
        }

        if ((wkState === 'locked' || wkState === 'closed') && wk < week && (wkStatus === 'No Pick' || !user.knockoutPicks?.[wk])) {
          eliminatedWeek = wk;
          break;
        }
      }

      if (user.paymentStatus === 'disqualified') {
        eliminatedWeek = eliminatedWeek || 1;
      }

      return {
        ...user,
        isAlive: eliminatedWeek === null,
        eliminatedWeek
      };
    }).filter(Boolean).sort((a: any, b: any) => {
      if (a.isAlive && !b.isAlive) return -1;
      if (!a.isAlive && b.isAlive) return 1;
      if (b.eliminatedWeek !== a.eliminatedWeek) {
        return (b.eliminatedWeek || 0) - (a.eliminatedWeek || 0);
      }
      return String(a.lastName || '').localeCompare(String(b.lastName || ''));
    });
  }, [data, maxWeeks, globalSettings?.weekStates, week]);

  return (
    <div className="bg-white rounded-3xl sm:rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden border-t-8 border-red-600 max-w-full mx-auto">
      {/* HEADER */}
      <div className="p-4 sm:p-6 bg-slate-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight flex items-center gap-2 text-slate-900">
            <Skull className="w-6 h-6 text-red-600" /> Knockout Results
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-0.5">
            Full season ledger &bull; Longest survivors listed on top
          </p>
        </div>
      </div>

      {/* MATRIX TABLE */}
      <div className="w-full max-w-full overflow-x-auto scrollbar-hide relative z-0" style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}>
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-slate-900 text-white uppercase border-b-4 border-[#FFB81C]">
              <th className="p-3 sticky left-0 bg-slate-900 z-30 w-44 sm:w-56 shadow-[3px_0_10px_rgba(0,0,0,0.3)] tracking-widest italic font-black text-xs sm:text-sm rounded-tl-3xl">
                Player
              </th>

              <th className="p-2 text-center w-20 text-[10px] sm:text-xs font-black italic text-[#FFB81C] border-r border-slate-800">
                Status
              </th>

              {activeWeeks.map((wk) => (
                <th 
                  key={wk} 
                  className={`p-2 text-center font-black italic text-[10px] sm:text-xs border-r border-slate-800 min-w-[65px] ${
                    wk === week ? 'bg-amber-500/20 text-[#FFB81C]' : 'text-slate-300'
                  }`}
                >
                  Wk {wk}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {sortedGridData.map((user: any) => {
              const isMe = currentUser && user.id === currentUser.id;
              const isUnpaid = user.paymentStatus === 'unpaid' || user.paymentStatus === 'disqualified';

              return (
                <tr 
                  key={user.id} 
                  className={`${isMe ? 'bg-[#FFB81C]/20 font-black' : 'hover:bg-slate-50'} transition-colors group relative`}
                >
                  {/* Sticky Player Name */}
                  <td className={`p-2.5 sm:p-3 sticky left-0 z-20 ${
                    isMe ? 'bg-[#FFB81C]/30 border-l-4 border-[#FFB81C]' : 'bg-white group-hover:bg-slate-50'
                  } border-r-2 border-slate-200 shadow-[3px_0_10px_rgba(0,0,0,0.05)]`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs sm:text-sm font-black text-slate-900 truncate flex items-center gap-1">
                        {user.firstName || ''} {user.lastName || ''}
                      </span>
                      {isUnpaid && <DollarSign className="w-3.5 h-3.5 text-red-600 shrink-0" title="Unpaid / Disqualified" />}
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="p-2 text-center border-r border-slate-100">
                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                      user.isAlive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {user.isAlive ? 'Alive' : 'Out'}
                    </span>
                  </td>

                  {/* Week-by-Week Pick Cells */}
                  {activeWeeks.map((wk) => {
                    const rawPick = user.knockoutPicks?.[wk];
                    const wkState = globalSettings?.weekStates?.[wk];
                    const isCurrentWeek = wk === week;
                    const isFutureWeek = wk > week; // Checks if week is in the future

                    const weekGamesList = globalSettings?.games?.[wk] || [];
                    const canonicalPick = getCanonicalTeamCode(rawPick);
                    const game = weekGamesList.find((g: any) => 
                      getCanonicalTeamCode(g.away) === canonicalPick || 
                      getCanonicalTeamCode(g.home) === canonicalPick
                    );

                    let wkStatus = user.knockoutStatuses?.[wk] || 'Pending';
                    if (game && rawPick && (game.status === 'final' || game.winner)) {
                      const winnerCanonical = getCanonicalTeamCode(game.winner);
                      if (winnerCanonical && winnerCanonical === canonicalPick) {
                        wkStatus = 'Winner';
                      } else if (winnerCanonical && winnerCanonical !== 'TIE') {
                        wkStatus = 'Loser';
                      }
                    }

                    const wasOutBefore = user.eliminatedWeek !== null && wk > user.eliminatedWeek;
                    const wasEliminatedThisWeek = user.eliminatedWeek === wk || ['Loser', 'Loser (No Pick)', 'Knocked Out'].includes(wkStatus);

                    const isPastOrLockedWeek = wk < week || wkState === 'locked' || wkState === 'closed' || (wk === week && (isLocked || globalSettings?.isLocked));
                    const canRevealPick = isPastOrLockedWeek || adminForceReveal || isMe;
                    const isHidden = !canRevealPick;

                    const displayPick = canonicalPick || 'NO PICK';

                    let cellBg = 'bg-white text-slate-800';
                    const isWeekClosed = wkState === 'closed' || wk < week;

                    if (wasOutBefore) {
                      cellBg = 'bg-slate-100/60 text-slate-300';
                    } else if (wasEliminatedThisWeek) {
                      cellBg = 'bg-rose-600 text-white font-black';
                    } else if (rawPick && (wkStatus === 'Winner' || isWeekClosed)) {
                      cellBg = 'bg-emerald-600 text-white font-black shadow-sm';
                    } else if (rawPick && isPastOrLockedWeek) {
                      cellBg = 'bg-amber-500/20 text-slate-900 border-2 border-amber-400 font-black';
                    }

                    return (
                      <td 
                        key={wk} 
                        className={`p-1 text-center border-r border-slate-100 text-xs font-black ${
                          isCurrentWeek ? 'border-amber-300 bg-amber-50/30' : ''
                        }`}
                      >
                        {/* Render a clean dash for eliminated players or future weeks */}
                        {wasOutBefore || isFutureWeek ? (
                          <span className="text-[10px] font-bold text-slate-300 block text-center">
                            —
                          </span>
                        ) : isHidden ? (
                          <span className="text-[8px] font-black uppercase text-slate-300 bg-slate-50 py-1 px-1 rounded block border border-slate-100">
                            LOCK
                          </span>
                        ) : (
                          <div className={`py-1 px-1 rounded uppercase text-[10px] sm:text-xs truncate ${cellBg}`}>
                            {rawPick ? displayPick : 'NO PICK'}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SeasonTrackerBoard({ data, view, currentUser }: any) {
  const ptsKey = view === '1st Half' ? 'cpFirstHalf' : view === '2nd Half' ? 'cpSecondHalf' : 'cpOverall';
  const fpKey = view === '1st Half' ? 'fpFirstHalf' : view === '2nd Half' ? 'fpSecondHalf' : 'fpOverall';

  const firstPlacePTS = data?.[0]?.[ptsKey] || 0;

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl border overflow-hidden border-t-6 sm:border-t-8 border-[#FFB81C] max-w-4xl mx-auto">
      {/* HEADER */}
      <div className="p-4 sm:p-6 bg-slate-50 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2">
        <div>
          <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight flex items-center gap-2 text-slate-900">
            <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFB81C]" /> {view} Leaderboard
          </h2>
          <p className="text-[10px] sm:text-xs text-slate-500 font-bold mt-0.5">
            {view === '1st Half' 
              ? 'Weeks 1–9 Race' 
              : view === '2nd Half' 
              ? 'Weeks 10–18 Race' 
              : 'Full Season Race (Weeks 1–18)'}
          </p>
        </div>
      </div>

      {/* TABLE COLUMN DESCRIPTIONS HEADER BAR */}
      <div className="bg-slate-900 text-white px-3 sm:px-5 py-2.5 flex items-center justify-between text-[9px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest border-b-2 border-[#FFB81C]">
        <div className="w-5/12 sm:w-2/5 truncate">Player</div>
        <div className="flex items-center gap-2 sm:gap-6 justify-end w-7/12 sm:w-3/5 text-right">
          <div className="w-12 sm:w-16 text-center">PTS</div>
          <div className="w-16 sm:w-24 text-right">Behind</div>
          <div className="w-16 sm:w-20 text-right">Net $</div>
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
            <div key={user.id} className={`px-3 sm:px-5 py-2.5 sm:py-3.5 flex items-center justify-between transition-colors ${isMe ? 'bg-[#FFB81C]/20 font-black border-l-4 border-[#FFB81C]' : 'hover:bg-slate-50'}`}>
              {/* Player Info */}
              <div className="flex items-center gap-1.5 sm:gap-3 w-5/12 sm:w-2/5 min-w-0">
                <span className="font-black italic text-xs sm:text-lg text-slate-400 w-4 sm:w-6 text-right shrink-0">
                  #{user.displayRank}
                </span>
                <div className="truncate min-w-0">
                  <span className="font-black uppercase text-xs sm:text-sm text-slate-900 block leading-tight truncate">
                    {user.firstName} {user.nickname ? `"${user.nickname}"` : ''}
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-500 font-bold block truncate">
                    {user.lastName}
                  </span>
                </div>
              </div>

              {/* Numerical Metrics */}
              <div className="flex items-center gap-2 sm:gap-6 justify-end w-7/12 sm:w-3/5 text-right shrink-0">
                {/* Points Badge */}
                <div className="text-center font-mono font-black text-xs sm:text-sm text-slate-900 bg-slate-100 px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl w-12 sm:w-16 shrink-0">
                  {pts} <span className="text-[8px] sm:text-[9px] font-black uppercase text-slate-400 block -mt-0.5 sm:-mt-1">PTS</span>
                </div>

                {/* Behind Column */}
                <div className="text-right w-16 sm:w-24 shrink-0">
                  {idx === 0 ? (
                    <span className="text-slate-300 font-bold text-xs block text-right pr-2">-</span>
                  ) : (
                    <div className="flex flex-col items-end leading-tight">
                      <span className={behindLeader === 0 ? 'text-slate-400 font-bold text-[11px] sm:text-xs' : 'text-rose-600 font-black text-[11px] sm:text-sm'}>
                        {behindLeader === 0 ? '0' : `-${behindLeader}`}
                      </span>
                      <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-0.5">
                        ({behindNext === 0 ? '0' : `-${behindNext}`})
                      </span>
                    </div>
                  )}
                </div>

                {/* Net Winnings Badge */}
                <div className={`text-right font-mono font-black text-[11px] sm:text-sm px-1.5 sm:px-2.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border w-16 sm:w-20 shrink-0 ${
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

      // REPLACE WITH THIS FILTERED LOOP:
Object.keys(u.picks || {}).forEach((wkStr) => {
  const wk = Number(wkStr);
  const wkState = globalSettings?.weekStates?.[wk];

  // 🔒 ONLY count picks from closed (or locked) weeks
  if (wkState !== 'closed' && wkState !== 'locked') return;

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

function AdminLifecycleCard({ week, status, onLock, onClose, onOpen, onPreviewClose, onGenerateRecap }: any) {
  const label = week <= 3 ? `Preseason Week ${week}` : `Week ${week - 3}`;
  return (
    <div className="bg-white p-8 rounded-2xl border-2 border-slate-100 shadow-sm relative overflow-hidden group h-full flex flex-col justify-between">
      <div>
        <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4" /> {label} Lifecycle
        </h3>
        <div className={`p-6 rounded-2xl flex flex-col xl:flex-row items-center justify-between border-2 gap-4 ${
          status === 'closed' ? 'bg-slate-900 border-slate-700' : status === 'locked' ? 'bg-red-50 border-red-200' : 'bg-[#FFB81C]/5 border-[#FFB81C]/20'
        }`}>
          <div className={`text-2xl font-black italic uppercase tracking-tighter ${
            status === 'closed' ? 'text-white' : status === 'locked' ? 'text-red-700' : 'text-slate-900'
          }`}>
            Status: {(status || 'open').toUpperCase()}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {status === 'open' && (
              <button onClick={onLock} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black italic uppercase shadow-xl hover:bg-red-700 transition-all text-xs sm:text-sm">
                Lock Week & Apply Deadbeat
              </button>
            )}
            {status === 'locked' && (
              <>
                <button onClick={onOpen} className="px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-black italic uppercase hover:bg-slate-300 transition-all text-xs sm:text-sm">
                  Unlock
                </button>
                <button onClick={onPreviewClose} className="px-6 py-3 bg-slate-900 text-[#FFB81C] rounded-xl font-black italic uppercase shadow-xl hover:scale-105 transition-all text-xs sm:text-sm">
                  Close Week & Finalize
                </button>
              </>
            )}
            {status === 'closed' && (
              <button onClick={onOpen} className="px-4 py-3 bg-slate-800 text-slate-300 rounded-xl font-black italic uppercase hover:bg-slate-700 transition-all text-xs sm:text-sm">
                Re-Open (Edit)
              </button>
            )}
          </div>
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
            Week {w}
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

// RESTRICTED WEEK SELECTOR FOR ADVANCE PICK TABS (Hides past closed weeks)
function PickWeekSelector({ week, setWeek, currentActiveWeek, maxActiveWeeks = 18 }: any) { 
  return (
    <div className="w-full md:w-auto">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Select Week for Picks</label>
      <select 
        value={week} 
        onChange={(e) => setWeek(Number(e.target.value))} 
        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-black italic uppercase text-xl tracking-tighter outline-none focus:ring-4 focus:ring-[#FFB81C]/20 transition-all cursor-pointer"
      >
        {Array.from({ length: maxActiveWeeks }, (_, i) => i + 1)
          .filter(w => w >= currentActiveWeek)
          .map(w => (
            <option key={w} value={w}>
              Week {w} {w === currentActiveWeek ? '(Current)' : '(Advance Pick)'}
            </option>
          ))}
      </select>
    </div>
  ); 
}

function WeekSelector({ week, setWeek, maxActiveWeeks = 18 }: any) { 
  return (
    <div className="w-full md:w-auto">
      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Schedule</label>
      <select value={week} onChange={(e) => setWeek(Number(e.target.value))} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3 font-black italic uppercase text-xl tracking-tighter outline-none focus:ring-4 focus:ring-[#FFB81C]/20 transition-all cursor-pointer">
        {Array.from({ length: maxActiveWeeks }, (_, i) => i + 1).map(w => (
          <option key={w} value={w}>
            Week {w}
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
    <div className={`rounded-2xl sm:rounded-3xl border-2 sm:border-4 p-4 sm:p-6 flex items-center justify-between gap-3 transition-all duration-300 ${
      isFilled ? 'border-slate-900 bg-white shadow-lg' : 'border-slate-100 bg-white'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
          isFilled ? 'bg-slate-900 text-[#FFB81C]' : 'bg-slate-50 text-slate-300'
        }`}>
          <Target className="w-5 h-5 sm:w-8 sm:h-8" />
        </div>
        <div>
          <h3 className="text-base sm:text-2xl font-black italic uppercase tracking-tight text-slate-900">Tiebreaker</h3>
          <p className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider truncate max-w-[180px] sm:max-w-none">
            {game?.awayName} @ {game?.homeName} Points
          </p>
        </div>
      </div>
      <input 
        type="number" 
        value={localVal} 
        onChange={(e) => setLocalVal(e.target.value)} 
        onBlur={() => onSave(localVal)} 
        disabled={isLocked} 
        placeholder="PTS" 
        className={`w-20 sm:w-32 h-11 sm:h-16 border-2 sm:border-4 rounded-xl sm:rounded-2xl px-2 py-1 text-center font-black italic text-lg sm:text-3xl outline-none transition-all ${
          isFilled ? 'bg-slate-900 border-[#FFB81C] text-[#FFB81C]' : 'bg-slate-50 border-slate-100 text-slate-400 focus:border-[#FFB81C]'
        }`} 
      />
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

// --- DYNAMIC WHOLE-DOLLAR FANATICS PAYOUT ENGINE ---
function calculateFanaticsPayouts(numPlayers: number, totalWeeks = 18, half1Weeks = 9, half2Weeks = 9) {
  const percentages = [0.22, 0.19, 0.16, 0.13, 0.09, 0.08, 0.07, 0.06];

  // Helper to round whole dollars and balance remainders to match the exact pot sum
  const roundAndBalance = (pot: number) => {
    if (pot <= 0) return Array(8).fill(0);
    const raw = percentages.map(p => Math.round(pot * p));
    const currentSum = raw.reduce((sum, v) => sum + v, 0);
    const diff = Math.round(pot) - currentSum;
    if (diff !== 0) raw[0] += diff; // Balance $1 rounding variance to 1st place
    return raw;
  };

  // 1. Weekly Split ($12/player = $7 Weekly, $1.75 Half 1/2, $1.25 Season, $2 Expenses)
  const weeklyPot = numPlayers * 7.0;
  const weeklyGross = roundAndBalance(weeklyPot);
  const weeklyNet = weeklyGross.map(g => g - 12); // Gross minus $12 weekly dues

  // 2. 1st Half Pot ($1.75 * numPlayers * half1Weeks)
  const half1Pot = numPlayers * 1.75 * half1Weeks;
  const half1Payouts = roundAndBalance(half1Pot);

  // 3. 2nd Half Pot ($1.75 * numPlayers * half2Weeks)
  const half2Pot = numPlayers * 1.75 * half2Weeks;
  const half2Payouts = roundAndBalance(half2Pot);

  // 4. Overall Season Pot ($1.25 * numPlayers * totalWeeks)
  const seasonPot = numPlayers * 1.25 * totalWeeks;
  const seasonPayouts = roundAndBalance(seasonPot);

  return {
    weeklyPot,
    weeklyGross,
    weeklyNet,
    half1Pot,
    half1Payouts,
    half2Pot,
    half2Payouts,
    seasonPot,
    seasonPayouts
  };
}

// 🔒 EQUAL TIE-SPLIT PAYOUT CALCULATOR (Option A)
function calculateTiedPayouts(sortedUsers: any[], grossPayoutMatrix: number[]) {
  let i = 0;
  while (i < sortedUsers.length) {
    let j = i;
    // Find all users tied on BOTH confidence score AND tiebreaker difference
    while (
      j < sortedUsers.length &&
      sortedUsers[j].score === sortedUsers[i].score &&
      sortedUsers[j].tbDiff === sortedUsers[i].tbDiff
    ) {
      j++;
    }

    const tiedCount = j - i;
    const startRank = i + 1; // 1-indexed rank position

    // Sum up the combined payout pool for the tied rank positions
    let combinedPool = 0;
    for (let r = startRank; r < startRank + tiedCount; r++) {
      if (r <= 8) {
        combinedPool += grossPayoutMatrix[r - 1] || 0;
      }
    }

    // Split evenly among tied players (rounded to nearest whole dollar)
    const splitGross = tiedCount > 0 ? Math.round(combinedPool / tiedCount) : 0;

    for (let k = i; k < j; k++) {
      sortedUsers[k].rank = startRank;
      sortedUsers[k].grossPayout = splitGross;
      sortedUsers[k].netEarnings = splitGross > 0 ? splitGross - 12 : -12;
      sortedUsers[k].isTied = tiedCount > 1;
    }

    i = j; // Advance past the tied group
  }

  return sortedUsers;
}

function AutoSyncStatusBadge({ globalSettings }: { globalSettings: any }) {
  const syncStatus = globalSettings?.syncStatus;

  if (!syncStatus) {
    return (
      <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 font-bold uppercase tracking-wider">
        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
        Auto-Sync: Initializing
      </div>
    );
  }

  const { isActivePolling, activeGameCount, lastCheckedAt } = syncStatus;
  const formattedTime = lastCheckedAt 
    ? new Date(lastCheckedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    : 'Never';

  return (
    <div className={`flex items-center gap-2 text-[10px] px-3 py-1 rounded-full border font-bold uppercase tracking-wider transition-all ${
      isActivePolling 
        ? 'bg-emerald-50 text-emerald-700 border-emerald-300' 
        : 'bg-slate-100 text-slate-600 border-slate-200'
    }`}>
      {/* Pulsing Dot */}
      <span className="relative flex h-2 w-2">
        {isActivePolling && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${
          isActivePolling ? 'bg-emerald-500' : 'bg-slate-400'
        }`}></span>
      </span>

      <span>
        {isActivePolling ? `Live Sync (${activeGameCount} Active)` : 'Auto-Sync Standby'}
      </span>
      <span className="text-slate-300">|</span>
      <span className="text-slate-500">Checked {formattedTime}</span>
    </div>
  );
}

// Helper to automatically flag the last chronological game as the tiebreaker
function ensureAutoTiebreaker(gamesList: any[]) {
  if (!gamesList || gamesList.length === 0) return [];

  // Parse game date/time for sorting
  const sorted = [...gamesList].sort((a, b) => {
    const timeA = new Date(`${a.apiDate || a.date} ${a.time}`).getTime() || 0;
    const timeB = new Date(`${b.apiDate || b.date} ${b.time}`).getTime() || 0;
    return timeA - timeB;
  });

  const lastGameId = sorted[sorted.length - 1]?.id;

  return gamesList.map(g => ({
    ...g,
    isTiebreaker: g.id === lastGameId
  }));
}

function AvailableRanksBar({ totalGames, usedRanks }: { totalGames: number; usedRanks: number[] }) {
  const allRanks = Array.from({ length: totalGames }, (_, i) => i + 1);
  const remainingRanks = allRanks.filter((rank) => !(usedRanks || []).includes(rank));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
          Available Rank Points
        </div>
        <div className="text-xs font-bold text-slate-500">
          <span className={remainingRanks.length === 0 ? 'text-emerald-600 font-black' : 'text-slate-900 font-black'}>
            {remainingRanks.length}
          </span> / {totalGames} Remaining
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {allRanks.map((rank) => {
          const isUsed = (usedRanks || []).includes(rank);

          return (
            <div
              key={rank}
              className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-xs sm:text-sm font-black italic transition-all duration-300 ${
                isUsed
                  ? 'bg-slate-100 text-slate-300 border border-slate-200 line-through scale-90 opacity-40'
                  : 'bg-slate-900 text-[#FFB81C] border border-slate-800 shadow-sm scale-100 hover:scale-105'
              }`}
            >
              {rank}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeeklyRecapModal({ isOpen, onClose, week = 1, games, allUsers, globalSettings }: any) {
  const [includeGreat8, setIncludeGreat8] = useState(true);
  const [includeBasement, setIncludeBasement] = useState(true);
  const [includeMovers, setIncludeMovers] = useState(true);
  const [includeKnockout, setIncludeKnockout] = useState(true);
  const [adminNotes, setAdminNotes] = useState('[INSERT COMMISH UPDATE HERE]');
  const [copied, setCopied] = useState(false);

  // 🔒 Calculate the last closed week safely without hardcoding
  const effectiveWeek = useMemo(() => {
    const weekStates = globalSettings?.weekStates || {};
    const targetWk = Number(week || 1);
    if (weekStates[targetWk] === 'closed') return targetWk;
    
    const closedWeeks = Object.keys(weekStates)
      .map(Number)
      .filter(w => weekStates[w] === 'closed')
      .sort((a, b) => b - a);

    return closedWeeks[0] || Math.max(1, targetWk - 1);
  }, [week, globalSettings?.weekStates]);

  const recapData = useMemo(() => {
    if (!allUsers || !effectiveWeek) return null;

    const evalGames = globalSettings?.games?.[effectiveWeek] || games || [];
    const actualTB = globalSettings?.actualTiebreakers?.[effectiveWeek] ?? 0;
    const lastGame = evalGames.find((g: any) => g.isTiebreaker) || evalGames[evalGames.length - 1];
    const standardMaxPossible = evalGames.reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);

    const processedUsers = allUsers.filter((u: any) => u.playsConfidence).map((u: any) => {
      const userPicks = u.picks?.[effectiveWeek] || {};
      const userRanks = u.ranks?.[effectiveWeek] || {};
      const userTB = parseInt(u.tiebreakers?.[effectiveWeek] || '0', 10);
      const isDeadbeat = u.tiebreakers?.[effectiveWeek] === '0' || (evalGames.length > 0 && evalGames.every((g: any) => parseInt(userRanks[g.id] || 0, 10) === 5));

      const userMaxPossible = isDeadbeat ? evalGames.length * 5 : standardMaxPossible;
      const pointsLost = evalGames.reduce((lost: number, g: any) => {
        const pick = userPicks[g.id];
        const rank = parseInt(userRanks[g.id] || 0, 10);
        if (!pick || !rank) return lost;
        if (g.status === 'final' && g.winner && pick !== g.winner) return lost + rank;
        return lost;
      }, 0);

      const score = userMaxPossible - pointsLost;
      const tbDiff = Math.abs(userTB - actualTB);
      const lastPick = lastGame ? userPicks[lastGame.id] : null;
      const lastRank = lastGame ? parseInt(userRanks[lastGame.id] || 0, 10) : 0;

      return {
        ...u,
        name: formatFullName(u),
        score,
        tbDiff,
        userTB,
        lastPick,
        lastRank,
        isDeadbeat
      };
    });

    // 1. Sort by Points descending, then TB Diff ascending
    processedUsers.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tbDiff !== b.tbDiff) return a.tbDiff - b.tbDiff;
      return a.name.localeCompare(b.name);
    });

    const leaderScore = processedUsers[0]?.score || 0;
    const payouts = globalSettings?.fpPayouts || [77, 67, 56, 46, 31, 28, 25, 20];

    // 2. Apply dynamic equal tie-split payout calculation
    calculateTiedPayouts(processedUsers, payouts);

    processedUsers.forEach((u) => {
      u.moneyWon = u.grossPayout || 0;
      u.behind = leaderScore - u.score;
    });

    // 3. Define Great 8 (all players earning cash) and Basement
    const great8 = processedUsers.filter(u => u.grossPayout > 0);
    const basement = processedUsers.slice(-8).reverse();

    // 4. Movers & Shakers
    let biggestClimber: any = null;
    let biggestDrop: any = null;

    if (effectiveWeek > 1) {
      const prevWeek = effectiveWeek - 1;
      const currentStandings = [...allUsers].filter((u: any) => u.playsConfidence).map((u: any) => ({
        id: u.id,
        name: formatFullName(u),
        pts: parseFloat(u.weeklyConfidenceHistory?.[effectiveWeek] || 0)
      })).sort((a, b) => b.pts - a.pts);

      const prevStandings = [...allUsers].filter((u: any) => u.playsConfidence).map((u: any) => ({
        id: u.id,
        name: formatFullName(u),
        pts: parseFloat(u.weeklyConfidenceHistory?.[prevWeek] || 0)
      })).sort((a, b) => b.pts - a.pts);

      let maxClimb = -Infinity;
      let maxDrop = -Infinity;

      currentStandings.forEach((u, currIdx) => {
        const prevIdx = prevStandings.findIndex(p => p.id === u.id);
        if (prevIdx !== -1) {
          const shift = prevIdx - currIdx;
          if (shift > maxClimb && shift > 0) {
            maxClimb = shift;
            biggestClimber = { name: u.name, shift, newRank: currIdx + 1 };
          }
          if (-shift > maxDrop && shift < 0) {
            maxDrop = -shift;
            biggestDrop = { name: u.name, shift: -shift, newRank: currIdx + 1 };
          }
        }
      });
    }

    // 5. Knockout Pool Casualties
    const koCasualties = allUsers.filter((u: any) => u.playsKnockout && (u.knockoutStatuses?.[effectiveWeek] === 'Loser' || u.knockoutStatuses?.[effectiveWeek] === 'Loser (No Pick)')).map((u: any) => ({
      name: formatFullName(u),
      pick: u.knockoutPicks?.[effectiveWeek] || 'No Pick'
    }));

    return {
      great8,
      basement,
      actualTB,
      lastGame,
      biggestClimber,
      biggestDrop,
      koCasualties
    };
  }, [games, allUsers, effectiveWeek, globalSettings]);

  if (!isOpen || !recapData) return null;

  const handleCopyRichHtml = () => {
    const recapElement = document.getElementById('rich-email-recap-content');
    if (!recapElement) return;

    const range = document.createRange();
    range.selectNode(recapElement);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white max-w-4xl w-full rounded-3xl shadow-2xl overflow-hidden border-t-8 border-[#FFB81C] flex flex-col max-h-[90vh]">
        {/* MODAL HEADER */}
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
          <div>
            <h2 className="text-2xl font-black italic uppercase text-[#FFB81C] flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-[#FFB81C]" />
              {getDisplayWeekLabel(effectiveWeek)} Recap Generator
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Copy pre-formatted rich tables directly into your email client
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6 text-slate-400" />
          </button>
        </div>

        {/* WRITEUP COMMENTARY BOX */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
          <label className="block text-[10px] font-black uppercase text-[#FFB81C] tracking-widest mb-1">
            ✍️ Admin Weekly Writeup & Commentary
          </label>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Type your funny commentary, recap story, or league callouts here..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white outline-none focus:border-[#FFB81C] min-h-[60px]"
          />
        </div>

        {/* SECTION TOGGLE BAR */}
        <div className="p-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs font-bold shrink-0">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={includeGreat8} onChange={e => setIncludeGreat8(e.target.checked)} className="rounded text-[#FFB81C]" />
              <span>The Great 8 ({recapData.great8.length})</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={includeBasement} onChange={e => setIncludeBasement(e.target.checked)} className="rounded text-[#FFB81C]" />
              <span>The Basement</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={includeMovers} onChange={e => setIncludeMovers(e.target.checked)} className="rounded text-[#FFB81C]" />
              <span>Movers & Shakers</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={includeKnockout} onChange={e => setIncludeKnockout(e.target.checked)} className="rounded text-[#FFB81C]" />
              <span>Knockout Casualties</span>
            </label>
          </div>

          <button
            onClick={handleCopyRichHtml}
            className="bg-slate-900 text-[#FFB81C] hover:bg-slate-800 px-6 py-2.5 rounded-xl font-black uppercase tracking-wider text-xs shadow-md transition-all flex items-center gap-2"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Printer className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Rich Email HTML'}
          </button>
        </div>

        {/* RECAP PREVIEW CANVAS */}
        <div className="p-8 overflow-y-auto flex-1 bg-white text-slate-900 font-sans" id="rich-email-recap-content">
          <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', maxWidth: '650px', margin: '0 auto', color: '#1e293b' }}>
            
            {/* HEADER BANNER */}
            <div style={{ backgroundColor: '#0f172a', padding: '24px', borderRadius: '12px', textAlign: 'center', marginBottom: '20px', borderBottom: '6px solid #FFB81C' }}>
              <h1 style={{ color: '#ffffff', margin: 0, fontSize: '24px', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase' }}>
                Hanover Football Fanatics
              </h1>
              <p style={{ color: '#FFB81C', margin: '6px 0 0 0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                {getDisplayWeekLabel(effectiveWeek)} Official Recap
              </p>
            </div>

{/* ADMIN WRITEUP BOX IN EMAIL */}
{adminNotes.trim() && (
  <div style={{ backgroundColor: '#f8fafc', padding: '18px 20px', borderRadius: '10px', borderLeft: '6px solid #FFB81C', border: '1px solid #e2e8f0', borderLeftWidth: '6px', marginBottom: '24px' }}>
    <p style={{ margin: 0, fontSize: '16px', lineHeight: '1.6', color: '#0f172a', fontWeight: 'bold' }}>
      {adminNotes.trim()}
    </p>
  </div>
)}
            {/* THE GREAT 8 SECTION */}
            {includeGreat8 && (
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', color: '#0f172a', borderBottom: '2px solid #FFB81C', paddingBottom: '6px', marginBottom: '12px' }}>
                  🏆 The Great 8 (Payout Zone)
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff', textTransform: 'uppercase', fontSize: '10px' }}>
                      <th style={{ padding: '8px' }}>Rank</th>
                      <th style={{ padding: '8px' }}>Player</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>PTS</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Behind</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Final Pick</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>TB</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recapData.great8.map((u: any) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: u.rank % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '10px 8px', fontWeight: '900', fontStyle: 'italic', color: '#0f172a' }}>#{u.rank}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#0f172a' }}>{u.name}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: '900' }}>{u.score}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#64748b' }}>{u.behind === 0 ? '-' : `-${u.behind}`}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                          {u.lastPick ? `${u.lastPick} (${u.lastRank} PTS)` : '-'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11px' }}>
                          {u.userTB} <span style={{ color: '#94a3b8' }}>({u.tbDiff > 0 ? `-${u.tbDiff}` : 'Exact!'})</span>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: '900', fontStyle: 'italic', color: '#16a34a' }}>
                          +${u.moneyWon}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* THE BASEMENT SECTION */}
            {includeBasement && (
              <div style={{ marginBottom: '28px' }}>
                <h2 style={{ fontSize: '16px', fontWeight: '900', fontStyle: 'italic', textTransform: 'uppercase', color: '#dc2626', borderBottom: '2px solid #dc2626', paddingBottom: '6px', marginBottom: '12px' }}>
                  📉 The Basement (Bottom 8 Finishers)
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#475569', color: '#ffffff', textTransform: 'uppercase', fontSize: '10px' }}>
                      <th style={{ padding: '8px' }}>Rank</th>
                      <th style={{ padding: '8px' }}>Player</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>PTS</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Behind</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>Final Pick</th>
                      <th style={{ padding: '8px', textAlign: 'center' }}>TB</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>Payout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recapData.basement.map((u: any) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: u.rank % 2 === 0 ? '#f8fafc' : '#ffffff' }}>
                        <td style={{ padding: '10px 8px', fontWeight: '900', fontStyle: 'italic', color: '#64748b' }}>#{u.rank}</td>
                        <td style={{ padding: '10px 8px', fontWeight: 'bold', color: '#0f172a' }}>
                          {u.name} {u.isDeadbeat && <span style={{ color: '#dc2626', fontSize: '10px' }}>(Deadbeat)</span>}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 'bold' }}>{u.score}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', color: '#dc2626', fontWeight: 'bold' }}>-{u.behind}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11px', color: '#475569' }}>
                          {u.lastPick ? `${u.lastPick} (${u.lastRank} PTS)` : '-'}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'center', fontSize: '11px', color: '#64748b' }}>
                          {u.userTB}
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', color: '#94a3b8' }}>$0</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* MOVERS & SHAKERS */}
            {includeMovers && (recapData.biggestClimber || recapData.biggestDrop) && (
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '28px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', color: '#0f172a' }}>
                  🚀 Movers & Shakers (Season Standings Shift)
                </h3>
                {recapData.biggestClimber && (
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#16a34a', fontWeight: 'bold' }}>
                    ▲ Biggest Climber: {recapData.biggestClimber.name} (+{recapData.biggestClimber.shift} spots to #{recapData.biggestClimber.newRank} overall)
                  </p>
                )}
                {recapData.biggestDrop && (
                  <p style={{ margin: '4px 0', fontSize: '13px', color: '#dc2626', fontWeight: 'bold' }}>
                    ▼ Biggest Drop: {recapData.biggestDrop.name} (-{recapData.biggestDrop.shift} spots to #{recapData.biggestDrop.newRank} overall)
                  </p>
                )}
              </div>
            )}

            {/* KNOCKOUT CASUALTIES */}
            {includeKnockout && recapData.koCasualties.length > 0 && (
              <div style={{ backgroundColor: '#fef2f2', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca', marginBottom: '28px' }}>
                <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: '900', textTransform: 'uppercase', color: '#991b1b' }}>
                  ☠️ Knockout Pool Eliminations
                </h3>
                <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#7f1d1d' }}>
                  {recapData.koCasualties.map((k: any, idx: number) => (
                    <li key={idx} style={{ marginBottom: '4px', fontWeight: 'bold' }}>
                      {k.name} — <span style={{ fontStyle: 'italic' }}>Picked {k.pick} ❌</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '24px' }}>
              Official Hanover Football Fanatics Weekly Update
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- MAIN APP COMPONENT ---
function MainApp() {
  const [user, setUser] = useState<any>(null), [dbReady, setDbReady] = useState(false), [authLoaded, setAuthLoaded] = useState(false), [sessionLoaded, setSessionLoaded] = useState(false), [isLoggedIn, setIsLoggedIn] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [liveSeasonWeek, setLiveSeasonWeek] = useState(1);        // Fixed anchor for Dashboard & Standings
  const [picksSelectedWeek, setPicksSelectedWeek] = useState(1);   // Advance picks selector
  const [resultsSelectedWeek, setResultsSelectedWeek] = useState(1); // Historical results selector
  const [showMobileAccountDrawer, setShowMobileAccountDrawer] = useState(false);
  
  // Safety aliases for legacy handlers
  const currentActiveWeek = liveSeasonWeek;
  const setCurrentActiveWeek = setLiveSeasonWeek;
  const selectedWeek = resultsSelectedWeek;
  const setSelectedWeek = setResultsSelectedWeek;
  const [currentUserId, setCurrentUserId] = useState('');
  const [allUsers, setAllUsers] = useState<any[]>([]), [globalSettings, setGlobalSettings] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false), [hasSaved, setHasSaved] = useState(false), [showPrintModal, setShowPrintModal] = useState(false), [showChangePassword, setShowChangePassword] = useState(false), [adminTab, setAdminTab] = useState('status'); 
  const [isSyncing, setIsSyncing] = useState(false), [showFanaticsResetConfirm, setShowFanaticsResetConfirm] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null), [editUserForm, setEditUserForm] = useState<any>({}), [overrideUserId, setOverrideUserId] = useState<any>(null);
  const [seasonView, setSeasonView] = useState('Overall'), [seasonSortBy, setSeasonSortBy] = useState('points');
  const [showHardResetConfirm, setShowHardResetConfirm] = useState(false), [showResetConfirm, setShowResetConfirm] = useState(false), [adminForceReveal, setAdminForceReveal] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null), [deadbeatsToConfirm, setDeadbeatsToConfirm] = useState<any>(null), [newUserForm, setNewUserForm] = useState({ firstName: '', lastName: '', nickname: '', email: '', role: 'user' });
  const [imgErrors, setImgErrors] = useState<any>({ logo: false });
  const handleImgError = (key: string) => setImgErrors((prev: any) => ({ ...prev, [key]: true }));


  // 📍 PREVIEW CLOSE WEEK MODAL STATE & HANDLER 📍
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showWeeklyRecapModal, setShowWeeklyRecapModal] = useState(false);

// 📍 1. FINALIZE CLOSE WEEK (FROM PREVIEW MODAL) 📍
const handleFinalizeCloseWeek = async (finalData: any) => {
  setIsSaving(true);
  try {
    const { week, finalTiebreakerScore, winners } = finalData;
    const batch = writeBatch(db);

    // A. Lock/Close week state & save official tiebreaker
    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
      [`weekStates.${week}`]: 'closed',
      [`actualTiebreakers.${week}`]: finalTiebreakerScore,
      [`weeklyWinners.${week}`]: winners
    });

    // B. Map top 8 calculated gross payouts for quick lookup by user ID
    const payoutMap: { [userId: string]: number } = {};
    (winners || []).forEach((w: any) => {
      payoutMap[w.id] = w.calculatedPayout || 0;
    });

    // C. Compute points & record exact NET EARNINGS (-$12 for non-winners, Gross - $12 for winners)
    const standardMaxPossible = (games || []).reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);

    allUsers.forEach((u: any) => {
      if (!u.playsConfidence) return;

      const userPicks = u.picks?.[week] || {};
      const userRanks = u.ranks?.[week] || {};

      // Deadbeat check
      const isDeadbeat = u.tiebreakers?.[week] === '0' || 
        ((games || []).length > 0 && (games || []).every((g: any) => parseInt(userRanks[g.id] || 0, 10) === 5));

      const userMaxPossible = isDeadbeat ? (games || []).length * 5 : standardMaxPossible;

      // Calculate points lost on incorrect picks
      const pointsLost = (games || []).reduce((lost: number, g: any) => {
        const pick = userPicks[g.id];
        const rank = parseInt(userRanks[g.id] || 0, 10);
        if (!pick || !rank) return lost;

        if (g.status === 'final' && g.winner && pick !== g.winner) {
          return lost + rank;
        }
        return lost;
      }, 0);

      const earnedPoints = userMaxPossible - pointsLost;
      const grossPrize = payoutMap[u.id] || 0;
      
      // 🔒 NET CALCULATION: Gross Award minus $12 weekly dues (Ranks 9+ get -$12)
      const netFantasyEarnings = grossPrize > 0 ? grossPrize - 12 : -12;

      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id);
      batch.update(userRef, {
        [`weeklyConfidenceHistory.${week}`]: earnedPoints,
        [`weeklyFantasyHistory.${week}`]: netFantasyEarnings
      });
    });

    // D. Process Knockout Pool Statuses
    allUsers.forEach((u: any) => {
      if (u.playsKnockout) {
        const pick = u.knockoutPicks?.[week];
        let status = 'No Pick';
        if (pick) {
          const game = games.find((g: any) => g.away === pick || g.home === pick);
          if (game && game.status === 'final') {
            status = game.winner === 'TIE' ? 'Loser' : (game.winner === pick ? 'Winner' : 'Loser');
          } else {
            status = 'Undecided';
          }
        }
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), {
          [`knockoutStatuses.${week}`]: status
        });
      }
    });

    await batch.commit();

    // Automatically advance to the next week
    // 🔒 SAFE WEEK ADVANCE: Only advance if the next week actually has games populated
const nextWeek = Math.min(week + 1, maxActiveWeeks);
const nextWeekGames = globalSettings?.games?.[nextWeek] || [];

if (nextWeekGames && nextWeekGames.length > 0) {
  setSelectedWeek(nextWeek);
  setLiveSeasonWeek(nextWeek);
} else {
  // Stay on current week so the app never jumps into an empty week
  setSelectedWeek(week);
}

    alert(`Week ${week} finalized! All player scores and net balances (-$12 for non-payouts) saved.`);
  } catch (e) {
    console.error("Error finalizing week:", e);
    alert("Failed to finalize week. Check console logs.");
  } finally {
    setIsSaving(false);
  }
};

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
        // Force all views to default to Week 1 on load
        const defaultWeek = 1;
        
        setLiveSeasonWeek(defaultWeek);
        setPicksSelectedWeek(defaultWeek);
        setResultsSelectedWeek(defaultWeek);
        setSelectedWeek(defaultWeek);

        setDbReady(true); 
    } 
  }, [globalSettings, allUsers, dbReady]);

  useEffect(() => { setAdminForceReveal(false); }, [selectedWeek]);

  const sessionUser = allUsers.find(u => u.id === currentUserId);
  const currentUser = overrideUserId ? (allUsers.find(u => u.id === overrideUserId) || sessionUser) : sessionUser;
  const isAdmin = sessionUser?.role === 'admin';
// Games for Dashboard, Results, & Standings (Locked to current active week)
const games = useMemo(() => {
  const rawGames = globalSettings?.games?.[currentActiveWeek] || [];
  if (rawGames.length === 0) return [];
  const sorted = [...rawGames].sort((a: any, b: any) => {
    const timeA = new Date(`${a.apiDate || a.date} ${a.time}`).getTime() || 0;
    const timeB = new Date(`${b.apiDate || b.date} ${b.time}`).getTime() || 0;
    return timeA - timeB;
  });
  const lastGameId = sorted[sorted.length - 1]?.id;
  return sorted.map((g: any) => ({ ...g, isTiebreaker: g.id === lastGameId }));
}, [globalSettings?.games, currentActiveWeek]);

// Games for Fanatics & KnockOut Pick Screens (Allows viewing/picking future weeks)
const pickGames = useMemo(() => {
  const rawGames = globalSettings?.games?.[picksSelectedWeek] || [];
  if (rawGames.length === 0) return [];
  const sorted = [...rawGames].sort((a: any, b: any) => {
    const timeA = new Date(`${a.apiDate || a.date} ${a.time}`).getTime() || 0;
    const timeB = new Date(`${b.apiDate || b.date} ${b.time}`).getTime() || 0;
    return timeA - timeB;
  });
  const lastGameId = sorted[sorted.length - 1]?.id;
  return sorted.map((g: any) => ({ ...g, isTiebreaker: g.id === lastGameId }));
}, [globalSettings?.games, picksSelectedWeek]);

// Games for F-Results & KO-Results Tabs (Pulls schedule for resultsSelectedWeek)
const resultsGames = useMemo(() => {
  const rawGames = globalSettings?.games?.[resultsSelectedWeek] || [];
  if (rawGames.length === 0) return [];
  const sorted = [...rawGames].sort((a: any, b: any) => {
    const timeA = new Date(`${a.apiDate || a.date} ${a.time}`).getTime() || 0;
    const timeB = new Date(`${b.apiDate || b.date} ${b.time}`).getTime() || 0;
    return timeA - timeB;
  });
  const lastGameId = sorted[sorted.length - 1]?.id;
  return sorted.map((g: any) => ({ ...g, isTiebreaker: g.id === lastGameId }));
}, [globalSettings?.games, resultsSelectedWeek]);

const pickWeekState = globalSettings?.weekStates?.[picksSelectedWeek] || 'open';
const pickLockdownTime = getLockdownTime(pickGames);
const isPickWeekLocked = pickWeekState === 'locked' || pickWeekState === 'closed' || (pickWeekState === 'open' && pickLockdownTime && Date.now() >= pickLockdownTime);
  
const liveWeekState = globalSettings?.weekStates?.[liveSeasonWeek] || 'open';
const currentWeekState = liveWeekState; // 👈 PASTE THIS SAFETY ALIAS LINE
const lockdownTime = getLockdownTime(games);
const isPastLockdown = lockdownTime && Date.now() >= lockdownTime;
const isWeekLocked = liveWeekState === 'locked' || liveWeekState === 'closed' || (liveWeekState === 'open' && isPastLockdown);
const isLiveSeasonWeekLocked = isWeekLocked;
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
    if (!allUsers || !allUsers.length) return [];

    // Pull schedule explicitly for resultsSelectedWeek
    const targetGames = globalSettings?.games?.[resultsSelectedWeek] || resultsGames || [];
    const actualTB = globalSettings?.actualTiebreakers?.[resultsSelectedWeek] ?? 0;
    const standardMaxPossible = targetGames.reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);

    // 1. Process picks using flexible string/number ID key matching
    const processed = allUsers
      .filter((u: any) => u.playsConfidence)
      .map((u: any) => {
        const userPicks = u.picks?.[resultsSelectedWeek] || {};
        const userRanks = u.ranks?.[resultsSelectedWeek] || {};
        const userTBStr = String(u.tiebreakers?.[resultsSelectedWeek] || '').trim();
        const userTB = parseInt(userTBStr || '0', 10);

        // Count valid picks made for this week
        const validPickCount = targetGames.filter((g: any) => {
          const p = userPicks[g.id] || userPicks[String(g.id)];
          const r = userRanks[g.id] || userRanks[String(g.id)];
          return p && r;
        }).length;

        const isDeadbeat =
          userTBStr === '0' ||
          (targetGames.length > 0 &&
            targetGames.every((g: any) => {
              const r = parseInt(String(userRanks[g.id] || userRanks[String(g.id)] || 0), 10);
              return r === 5;
            }));

        const userMaxPossible = isDeadbeat ? targetGames.length * 5 : standardMaxPossible;

        const pointsLost = targetGames.reduce((lost: number, g: any) => {
          const pick = userPicks[g.id] || userPicks[String(g.id)];
          const rank = parseInt(String(userRanks[g.id] || userRanks[String(g.id)] || 0), 10);

          if (!pick || !rank) return lost;
          if (g.status === 'final' && g.winner && pick !== g.winner) {
            return lost + rank;
          }
          return lost;
        }, 0);

        const score = userMaxPossible - pointsLost;
        const tbDiff = Math.abs(userTB - actualTB);
        const savedNet = u.weeklyFantasyHistory?.[resultsSelectedWeek];

        return {
          ...u,
          score,
          confidenceScore: score,
          tbDiff,
          savedNet,
          validPickCount,
          firstName: u.firstName || '',
          lastName: u.lastName || ''
        };
      });

    // 2. Sort: Points (descending), Tiebreaker Diff (ascending)
    processed.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.tbDiff !== b.tbDiff) return a.tbDiff - b.tbDiff;
      return String(a.lastName).localeCompare(String(b.lastName));
    });

    // 3. Apply Equal Tie-Split Payout Engine
    const payouts = globalSettings?.fpPayouts || [77, 67, 56, 46, 31, 28, 25, 20];
    calculateTiedPayouts(processed, payouts);

    // 4. Return finalized user rows
    return processed.map((u) => {
      const grossVal = u.grossPayout || 0;
      const calculatedNet = grossVal > 0 ? grossVal - 12 : -12;
      const netVal = u.savedNet !== undefined ? u.savedNet : calculatedNet;

      return {
        ...u,
        weeklyFP: grossVal,
        netEarnings: netVal,
        weeklyPicks: u.picks?.[resultsSelectedWeek] || {}
      };
    });
  }, [allUsers, globalSettings, resultsSelectedWeek, resultsGames, games]);

  const knockoutTrackerData = useMemo(() => {
    if (!globalSettings || !allUsers.length) return [];
    
    const startWeek = globalSettings?.knockoutStartWeek || 1;

    return allUsers.filter(u => u.playsKnockout).map(u => {
        let status = 'Alive', eliminatedWeek = null;
        
        // Start loop strictly from startWeek (pre-reset weeks are ignored)
        for (let wk = startWeek; wk < liveSeasonWeek; wk++) {
          const wkState = globalSettings?.koWeekStates?.[wk] || globalSettings?.weekStates?.[wk];
          const wkStatus = u.knockoutStatuses?.[wk];

          if (wkState === 'closed' && ['Loser', 'Loser (No Pick)', 'Knocked Out', 'No Pick', undefined].includes(wkStatus)) { 
            eliminatedWeek = wk; 
            break; 
          }
        }

        if (u.paymentStatus === 'disqualified') {
          status = 'Knocked Out';
        } else if (eliminatedWeek !== null) {
          status = 'Knocked Out';
        } else if (!u.knockoutPicks?.[liveSeasonWeek]) {
          status = globalSettings?.weekStates?.[liveSeasonWeek] === 'closed' ? 'Knocked Out' : 'Alive';
        } else { 
          const game = games.find((g: any) => g.away === u.knockoutPicks[liveSeasonWeek] || g.home === u.knockoutPicks[liveSeasonWeek]); 
          if (globalSettings?.weekStates?.[liveSeasonWeek] === 'closed') {
            status = u.knockoutStatuses?.[liveSeasonWeek] === 'Winner' ? 'Alive' : 'Knocked Out'; 
          } else if (game?.status === 'final') {
            status = (game.winner === 'TIE' || game.winner !== u.knockoutPicks[liveSeasonWeek]) ? 'Knocked Out' : 'Alive'; 
          } else {
            status = 'Alive'; 
          }
        }

        return { ...u, currentStatus: status, pick: u.knockoutPicks?.[liveSeasonWeek], eliminatedWeek };
      }).sort((a, b) => {
        const order: any = { 'Alive': 1, 'Knocked Out': 2 };
        if ((order[a.currentStatus] || 99) !== (order[b.currentStatus] || 99)) return (order[a.currentStatus] || 99) - (order[b.currentStatus] || 99);
        return String(a.firstName || '').localeCompare(String(b.firstName || ''));
      });
  }, [allUsers, globalSettings, liveSeasonWeek, games]);

  const seasonStats = useMemo(() => {
    if (!globalSettings || !allUsers.length) return [];
    
    const activeCpField = seasonView === '1st Half' ? 'cpFirstHalf' : seasonView === '2nd Half' ? 'cpSecondHalf' : 'cpOverall';
    const activeFpField = seasonView === '1st Half' ? 'fpFirstHalf' : seasonView === '2nd Half' ? 'fpSecondHalf' : 'fpOverall';

    const baseStats = allUsers.filter(u => u.playsConfidence).map(user => {
      let cp1 = 0, cp2 = 0, cpo = 0;
      let fp1 = 0, fp2 = 0, fpo = 0;

      // Loop starting from Week 1 instead of Week 4
      const maxWeeks = globalSettings?.maxActiveWeeks || 18;
      const midPoint = Math.ceil(maxWeeks / 2); // Split 1st half and 2nd half dynamically

      for (let wk = 1; wk <= maxWeeks; wk++) {
        if (globalSettings.weekStates?.[wk] === 'closed') {
          const cp = parseFloat(user.weeklyConfidenceHistory?.[wk]) || 0;
          const fp = parseFloat(user.weeklyFantasyHistory?.[wk]) || -12;

          if (wk <= midPoint) {
            cp1 += cp;
            fp1 += fp;
          } else {
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
  }, [allUsers, globalSettings, seasonView, seasonSortBy]);

  const fullyPickedCount = currentUser ? games.filter((g: any) => currentUser?.picks?.[selectedWeek]?.[g.id] && currentUser?.ranks?.[selectedWeek]?.[g.id]).length : 0;
  const totalItemsRequired = totalGames > 0 ? totalGames + 1 : 0;
  const hasTiebreaker = (currentUser?.tiebreakers?.[selectedWeek] || '').toString().trim() !== '';
  const totalItemsCompleted = fullyPickedCount + (hasTiebreaker ? 1 : 0);
  const progressPercentage = totalItemsRequired > 0 ? (totalItemsCompleted / totalItemsRequired) * 100 : 0;

  const isCompleteFanatics = fullyPickedCount === totalGames && totalGames > 0 && hasTiebreaker;
  const isCompleteKnockout = !!currentUser?.knockoutPicks?.[selectedWeek];
  let isKnockedOut = wasAlreadyOut(currentUser, selectedWeek, globalSettings?.weekStates);

  const statusSummary = useMemo(() => {
    if (!allUsers || !allUsers.length) return { completed: [], inProgress: [], notStarted: [] };

    const targetWeek = selectedWeek || liveSeasonWeek;
    const weekGames = globalSettings?.games?.[targetWeek] || games || [];

    const statuses = allUsers
      .filter((u: any) => u.playsConfidence)
      .map((user: any) => {
        const userPicks = user.picks?.[targetWeek] || {};
        const userRanks = user.ranks?.[targetWeek] || {};
        const hasTB = String(user.tiebreakers?.[targetWeek] || '').trim() !== '';

        const picksCount = weekGames.filter((g: any) => {
          const p = userPicks[g.id] || userPicks[String(g.id)];
          const r = userRanks[g.id] || userRanks[String(g.id)];
          return p && r;
        }).length;

        const isComplete = weekGames.length > 0 && picksCount === weekGames.length && hasTB;

        return {
          ...user,
          status: isComplete ? 'Completed' : picksCount > 0 ? 'In Progress' : 'Not Started'
        };
      });

    return {
      notStarted: statuses.filter((u) => u.status === 'Not Started'),
      inProgress: statuses.filter((u) => u.status === 'In Progress'),
      completed: statuses.filter((u) => u.status === 'Completed')
    };
  }, [allUsers, globalSettings, selectedWeek, liveSeasonWeek, games]);

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
    
    // 🔒 FIX: Target picksSelectedWeek (the week in your active dropdown)
    const targetWeek = picksSelectedWeek; 
    const targetGames = pickGames.length > 0 ? pickGames : games;

    usersToUpdate.forEach(u => { 
      const newPicks = { ...(u.picks?.[targetWeek] || {}) };
      const newRanks = { ...(u.ranks?.[targetWeek] || {}) };
      const availableRanks = Array.from({ length: targetGames.length }, (_, i) => i + 1); 

      // Shuffle ranks 1 through N
      for (let i = availableRanks.length - 1; i > 0; i--) { 
        const j = Math.floor(Math.random() * (i + 1)); 
        [availableRanks[i], availableRanks[j]] = [availableRanks[j], availableRanks[i]]; 
      } 

      targetGames.forEach((g: any, idx: number) => { 
        const gameIdKey = g.id;
        newPicks[gameIdKey] = Math.random() > 0.5 ? g.away : g.home; 
        newRanks[gameIdKey] = availableRanks[idx]; 
      }); 

      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { 
        [`picks.${targetWeek}`]: newPicks, 
        [`ranks.${targetWeek}`]: newRanks, 
        [`tiebreakers.${targetWeek}`]: String(Math.floor(Math.random() * 30) + 30) 
      }); 
    }); 

    setIsSaving(true); 
    try { 
      await batch.commit(); 
    } catch (e) { 
      console.error("Quick Picks Error:", e); 
    } 
    setIsSaving(false); 
    setHasSaved(true); 
    setTimeout(() => setHasSaved(false), 2000); 
  };

  // 📥 EXPORT WEEKLY PICKS CSV BACKUP
// 📥 EXPORT WEEKLY PICKS CSV BACKUP (FANATICS + KNOCKOUT + GAME #s)
const handleExportPicksCSV = () => {
  if (!allUsers || allUsers.length === 0) return alert("No player data available to export.");

  const targetWeek = selectedWeek;
  const targetGames = globalSettings?.games?.[targetWeek] || games || [];
  
  // 1. Build Header Row
  // [Player Info, Knockout Pick, Fanatics Tiebreaker, Game 1 Pick/Rank, Game 2 Pick/Rank, ...]
  const headers = [
    'First Name', 
    'Last Name', 
    'Email', 
    'Payment Status', 
    `Week ${targetWeek} Knockout Pick`, 
    `Week ${targetWeek} Tiebreaker`
  ];

  targetGames.forEach((g: any, index: number) => {
    const gameNum = index + 1;
    const matchup = `${g.awayAbbr || g.away} @ ${g.homeAbbr || g.home}`;
    headers.push(`"Game ${gameNum}: ${matchup} (Pick)"`);
    headers.push(`"Game ${gameNum}: ${matchup} (Rank)"`);
  });

  const csvRows: string[] = [headers.join(',')];

  // 2. Build Data Rows for All Active Players
  allUsers.forEach((u: any) => {
    const userPicks = u.picks?.[targetWeek] || {};
    const userRanks = u.ranks?.[targetWeek] || {};
    const koPick = u.knockoutPicks?.[targetWeek] || 'NO PICK';
    const tbVal = u.tiebreakers?.[targetWeek] || '';

    const row = [
      `"${u.firstName || ''}"`,
      `"${u.lastName || ''}"`,
      `"${u.email || ''}"`,
      `"${u.paymentStatus || 'unpaid'}"`,
      `"${koPick}"`,
      `"${tbVal}"`
    ];

    // Add Game # Picks & Ranks
    targetGames.forEach((g: any) => {
      const p = userPicks[g.id] || userPicks[String(g.id)] || '';
      const r = userRanks[g.id] || userRanks[String(g.id)] || '';
      row.push(`"${p}"`);
      row.push(`"${r}"`);
    });

    csvRows.push(row.join(','));
  });

  // 3. Download Spreadsheet File
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `hff-week-${targetWeek}-full-picks-backup.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
        timeZone: 'America/New_York',
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });

      const timeStr = rawDate.toLocaleTimeString('en-US', { 
        timeZone: 'America/New_York',
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });

      // Force YYYY-MM-DD to lock to US Eastern Time instead of UTC ISO string
      const easternApiDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(rawDate);

      return { dateStr, timeStr, isoDate: easternApiDate };
    } catch (err) {
      console.error("Date Parsing Error:", err);
      const fallbackEastern = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date());
      return { dateStr: 'TBD', timeStr: 'TBD', isoDate: fallbackEastern };
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

      weekTitle = `Regular Season Week ${weekNum}`;
      targetGames = allGames.filter((g: any) => String(g.game?.week || '') === `Week ${weekNum}` && !isAugustGame(g));

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

      // Helper to automatically flag the last chronological game as the tiebreaker
function ensureAutoTiebreaker(gamesList: any[]) {
  if (!gamesList || gamesList.length === 0) return [];

  // Parse game date/time for sorting
  const sorted = [...gamesList].sort((a, b) => {
    const timeA = new Date(`${a.apiDate || a.date} ${a.time}`).getTime() || 0;
    const timeB = new Date(`${b.apiDate || b.date} ${b.time}`).getTime() || 0;
    return timeA - timeB;
  });

  const lastGameId = sorted[sorted.length - 1]?.id;

  return gamesList.map(g => ({
    ...g,
    isTiebreaker: g.id === lastGameId
  }));
}

      const newGames = cleanGames.map((match: any) => {
        const rawAwayCode = match.teams?.away?.code || '';
        const rawHomeCode = match.teams?.home?.code || '';
        const awayName = match.teams?.away?.name || 'Away';
        const homeName = match.teams?.home?.name || 'Home';
      
        // Apply clean NFL abbreviations
        const awayAbbr = getCleanTeamAbbr(rawAwayCode, awayName);
        const homeAbbr = getCleanTeamAbbr(rawHomeCode, homeName);
      
        const { dateStr, timeStr, isoDate } = parseApiGameTime(match.game);
      
        return {
          id: match.game?.id || Math.floor(Math.random() * 100000),
          away: awayAbbr,
          home: homeAbbr,
          awayAbbr: awayAbbr,
          homeAbbr: homeAbbr,
          awayName: awayName,
          homeName: homeName,
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

  // Prevent handleSyncScores from executing more than once every 30 seconds
  const lastSyncTimeRef = React.useRef<number>(0);

  const handleSyncScores = async () => {
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 30000) {
      return; // Skip execution if called within 30 seconds
    }
    lastSyncTimeRef.current = now;

    if (!globalSettings?.apiSportsKey?.trim()) {
      return alert("Please enter your API-Sports Key in the Admin Settings tab.");
    }
    if (!games || games.length === 0) return;

    setIsSyncing(true);
    try {
      const apiKey = globalSettings.apiSportsKey.trim();
      const headers = { 'x-apisports-key': apiKey };

      // Query Season 2026 directly (bypasses UTC date boundary issues completely)
      const res = await fetch(`https://v1.american-football.api-sports.io/games?league=1&season=2026`, { headers });
      if (!res.ok) {
        setIsSyncing(false);
        return;
      }

      const json = await res.json();
      const apiGames = json.response || [];

      if (apiGames.length === 0) {
        setIsSyncing(false);
        return;
      }

      // Flexible Team & Status Matcher
      let liveCount = 0;
      const updatedGames = games.map((g: any) => {
        // Shield finalized games from overwrites
        if (String(g.status).toLowerCase() === 'final') return g;

        const gAwayCanonical = getCanonicalTeamCode(g.away || g.awayAbbr || g.awayName);
        const gHomeCanonical = getCanonicalTeamCode(g.home || g.homeAbbr || g.homeName);

        const match = apiGames.find((ag: any) => {
          const agAwayCanonical = getCanonicalTeamCode(ag.teams?.away?.code || ag.teams?.away?.name);
          const agHomeCanonical = getCanonicalTeamCode(ag.teams?.home?.code || ag.teams?.home?.name);

          // 1. Primary check: Exact API Game ID match
          if (String(ag.game?.id) === String(g.id)) return true;

          // 2. Secondary check: Both Home AND Away teams must match
          const teamsMatchExact = (agAwayCanonical === gAwayCanonical && agHomeCanonical === gHomeCanonical);

          // 3. Safety Check: If target game is upcoming, do not match old finished games from different dates
          const isApiGameFinal = ['FT', 'AOT', 'POST', 'CANC', 'ABD', 'FINAL', 'FINISHED'].includes(
            String(ag.game?.status?.short || '').toUpperCase()
          );

          if (teamsMatchExact && (g.status === 'upcoming' || g.status === 'scheduled') && isApiGameFinal) {
            const apiGameDate = String(ag.game?.date?.date || ag.game?.date || '');
            if (g.apiDate && apiGameDate && !apiGameDate.includes(g.apiDate)) {
              return false; // Skip preseason/past games on different dates
            }
          }

          return teamsMatchExact;
        });

        if (match) {
          const shortStatus = String(match.game?.status?.short || '').toUpperCase();
          const isFinal = ['FT', 'AOT', 'POST', 'CANC', 'ABD', 'FINAL', 'FINISHED'].includes(shortStatus);
          const isLive = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'HT', 'LIVE', 'HALFTIME', '1Q', '2Q', '3Q', '4Q', 'IN_PROGRESS'].includes(shortStatus);

          if (isLive) liveCount++;

          const homeTotal = match.scores?.home?.total ?? null;
          const awayTotal = match.scores?.away?.total ?? null;

          let winner = g.winner || null;
          if (isFinal && homeTotal !== null && awayTotal !== null) {
            if (homeTotal > awayTotal) winner = g.home;
            else if (awayTotal > homeTotal) winner = g.away;
            else winner = 'TIE';
          }

          let statusText = g.status || 'upcoming';
          if (isFinal) {
            statusText = 'final';
          } else if (isLive) {
            statusText = 'in_progress';
          }

          const gameClock = match.game?.status?.timer || match.game?.clock || null;
          const possession = match.game?.possession || match.possession || null;

          return {
            ...g,
            status: statusText,
            gameQuarter: isLive ? shortStatus : (isFinal ? 'FINAL' : null),
            gameClock: isLive ? gameClock : null,
            possession: isLive ? possession : null,
            homeScore: homeTotal !== null ? homeTotal : (g.homeScore ?? null),
            awayScore: awayTotal !== null ? awayTotal : (g.awayScore ?? null),
            winner: winner ?? null,
            isTiebreaker: !!g.isTiebreaker
          };
        }

        return g;
      });

      // Write updated scores & syncStatus directly to Firestore
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
        [`games.${selectedWeek}`]: updatedGames,
        syncStatus: {
          isActivePolling: true,
          activeGameCount: liveCount,
          lastCheckedAt: new Date().toISOString()
        }
      });

    } catch (e: any) {
      console.error("Score Sync Error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const trackSaving = async (savePromise: any) => { setIsSaving(true); try { await savePromise; } catch (e) { console.error(e); } setIsSaving(false); setHasSaved(true); setTimeout(() => setHasSaved(false), 2000); };
  const handleChangePassword = async (userId: string, newPassword: string) => { setIsSaving(true); await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), { password: newPassword, requiresPasswordChange: false, lastPasswordReset: new Date().toISOString() }); setIsSaving(false); };
  const updateKnockoutPick = (userId: string, week: number, team: string) => {
    const targetUser = allUsers.find(u => u.id === userId);
    if (!targetUser) return;

    if (wasAlreadyOut(targetUser, week, globalSettings?.weekStates)) {
      return alert("This player has already been eliminated.");
    }

    const canonicalTarget = getCanonicalTeamCode(team);

    // Get all teams used by this player in previous weeks (resolved canonically)
    const pastPicks = Object.entries(targetUser.knockoutPicks || {})
      .filter(([wk]) => Number(wk) < week)
      .map(([_, teamPicked]) => getCanonicalTeamCode(String(teamPicked)));

    // Prevent duplicate selection
    if (pastPicks.includes(canonicalTarget)) {
      return alert(`You have already picked ${canonicalTarget} in a previous week! Please choose a different team.`);
    }

    trackSaving(
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), {
        [`knockoutPicks.${week}`]: team
      })
    );
  };
  const updateUserPicks = (userId: string, gameId: number | string, team: string) => {
    const targetUser = allUsers.find((u) => u.id === userId);
    const existingPicks = targetUser?.picks?.[picksSelectedWeek] || {};
  
    trackSaving(
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), {
        [`picks.${picksSelectedWeek}`]: {
          ...existingPicks,
          [gameId]: team
        }
      })
    );
  };
  const updateUserRank = (userId: string, gameId: number | string, rankValue: string) => {
    const targetUser = allUsers.find((u) => u.id === userId);
    const currentWeekRanks = { ...(targetUser?.ranks?.[picksSelectedWeek] || {}) };

    if (!rankValue || rankValue === '') {
      delete currentWeekRanks[gameId];
      delete currentWeekRanks[String(gameId)];
    } else {
      const newRank = parseInt(rankValue, 10);
      // Remove rank if assigned to another game
      Object.keys(currentWeekRanks).forEach((id) => {
        if (parseInt(String(currentWeekRanks[id]), 10) === newRank) {
          delete currentWeekRanks[id];
        }
      });
      currentWeekRanks[gameId] = newRank;
    }

    trackSaving(
      updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', userId), {
        [`ranks.${picksSelectedWeek}`]: currentWeekRanks
      })
    );
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
  
// Lock, Open, or Close Knockout weeks independently
const handleSetKnockoutWeekState = async (weekNum: number, state: 'open' | 'locked' | 'closed') => {
  setIsSaving(true);
  try {
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
      [`koWeekStates.${weekNum}`]: state
    });
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
  } catch (e) {
    console.error("Error updating Knockout week state:", e);
  } finally {
    setIsSaving(false);
  }
};

const handleResetKnockout = async () => { 
  setIsSaving(true);
  try {
    const batch = writeBatch(db); 

    // 1. Wipe Knockout Picks and Knockout Statuses ONLY for every user
    allUsers.forEach(u => {
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { 
        knockoutPicks: {}, 
        knockoutStatuses: {},
        paymentStatus: u.paymentStatus === 'disqualified' ? 'unpaid' : (u.paymentStatus || 'unpaid')
      });
    }); 

    // 2. Clear ONLY Knockout-specific week states
    const resetKoWeekStates: Record<string, string> = {};
    const maxWeeks = globalSettings?.maxActiveWeeks || 18;
    for (let w = 1; w <= maxWeeks; w++) {
      resetKoWeekStates[`koWeekStates.${w}`] = 'open';
    }

    // 3. Increment session counter AND set start week to the current active week
    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { 
      ...resetKoWeekStates,
      knockoutSession: (globalSettings?.knockoutSession || 1) + 1,
      knockoutStartWeek: liveSeasonWeek // <--- Anchors reset session to current week!
    }); 

    await batch.commit(); 
    alert(`Knockout pool reset! Session ${ (globalSettings?.knockoutSession || 1) + 1 } starts clean on Week ${liveSeasonWeek}.`);
  } catch (e) {
    console.error("Error resetting Knockout pool:", e);
    alert("Failed to reset Knockout pool.");
  } finally {
    setIsSaving(false); 
    setHasSaved(true); 
    setTimeout(() => setHasSaved(false), 2000); 
    setShowResetConfirm(false); 
  }
};

  const handleResetFanatics = async () => { setIsSaving(true); try { const batch = writeBatch(db); allUsers.forEach(u => { batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), { picks: {1:{},2:{},3:{},4:{}}, ranks: {1:{},2:{},3:{},4:{}}, tiebreakers: {1:'',2:'',3:'',4:''}, weeklyFantasyHistory: {}, weeklyConfidenceHistory: {} }); }); batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { weekStates: { 1: 'open', 2: 'open', 3: 'open', 4: 'open' }, actualTiebreakers: { 1: 0, 2: 0, 3: 0, 4: 0 }}); await batch.commit(); window.location.reload(); } catch (e) { console.error(e); setIsSaving(false); } };
  const updateGameResult = (gameId: number, resultType: string, teamId: string) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`games.${selectedWeek}`]: games.map((g: any) => g.id !== gameId ? g : (resultType === 'upcoming' ? { ...g, status: 'upcoming', winner: null } : { ...g, status: 'final', winner: resultType === 'TIE' ? 'TIE' : teamId })) }));
  const handleLockWeek = () => { const deadbeats: any[] = []; allUsers.forEach(u => { if (u.playsConfidence && (games.filter((g: any) => (u.picks?.[selectedWeek] || {})[g.id] && (u.ranks?.[selectedWeek] || {})[g.id]).length !== totalGames || String(u.tiebreakers?.[selectedWeek] || '').trim() === '')) deadbeats.push({ name: formatFullName(u), type: 'Fanatics' }); }); if (deadbeats.length > 0) setDeadbeatsToConfirm(deadbeats); else executeLockWeek(); };
  const executeLockWeek = async () => {
    const batch = writeBatch(db);

    // 1. Process Confidence deadbeats
    allUsers.forEach((u) => {
      if (!u.playsConfidence) return;
      const fullyPicked =
        games.filter((g: any) => (u.picks?.[selectedWeek] || {})[g.id] && (u.ranks?.[selectedWeek] || {})[g.id]).length === totalGames &&
        String(u.tiebreakers?.[selectedWeek] || '').trim() !== '';

      if (!fullyPicked) {
        const dp: any = {}, dr: any = {};
        games.forEach((g: any) => {
          dp[g.id] = g.home;
          dr[g.id] = 5;
        });
        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), {
          [`picks.${selectedWeek}`]: dp,
          [`ranks.${selectedWeek}`]: dr,
          [`tiebreakers.${selectedWeek}`]: '0'
        });
      }
    });

    // 2. Process Knockout statuses safely
    allUsers.forEach((u) => {
      if (u.playsKnockout) {
        const pick = u.knockoutPicks?.[selectedWeek];
        let status = 'Undecided';

        if (!pick) {
          status = 'No Pick';
        } else {
          const game = games.find((g: any) => g.away === pick || g.home === pick);
          if (game && game.status === 'final') {
            status = game.winner === 'TIE' ? 'Loser' : (game.winner === pick ? 'Winner' : 'Loser');
          } else {
            status = 'Alive';
          }
        }

        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), {
          [`knockoutStatuses.${selectedWeek}`]: status
        });
      }
    });

    // 3. Lock week state
    batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
      [`weekStates.${selectedWeek}`]: 'locked'
    });

    setIsSaving(true);
    try {
      await batch.commit();
    } catch (e) {
      console.error(e);
    }
    setIsSaving(false);
    setHasSaved(true);
    setTimeout(() => setHasSaved(false), 2000);
    setDeadbeatsToConfirm(null);
  };

  // 📍 2. DIRECT CLOSE WEEK (ADMIN ACTION) 📍
  const handleCloseWeek = async () => {
    setIsSaving(true);
    try {
      const batch = writeBatch(db);
      const actualTB = globalSettings?.actualTiebreakers?.[selectedWeek] ?? 0;
      const standardMaxPossible = (games || []).reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);

      // A. Process and sort scores
      const sortedTrackerData = [...weeklyTrackerData].map((u) => {
        const userPicks = u.picks?.[selectedWeek] || {};
        const userRanks = u.ranks?.[selectedWeek] || {};
        const userTB = parseInt(u.tiebreakers?.[selectedWeek] || '0', 10);

        const isDeadbeat =
          u.tiebreakers?.[selectedWeek] === '0' ||
          ((games || []).length > 0 && (games || []).every((g: any) => parseInt(userRanks[g.id] || 0, 10) === 5));

        const userMaxPossible = isDeadbeat ? (games || []).length * 5 : standardMaxPossible;

        const pointsLost = (games || []).reduce((lost: number, g: any) => {
          const pick = userPicks[g.id];
          const rank = parseInt(userRanks[g.id] || 0, 10);
          if (!pick || !rank) return lost;

          if (g.status === 'final' && g.winner && pick !== g.winner) {
            return lost + rank;
          }
          return lost;
        }, 0);

        const calculatedScore = userMaxPossible - pointsLost;
        const tbDiff = Math.abs(userTB - actualTB);

        return {
          ...u,
          score: calculatedScore,
          tbDiff
        };
      });

      // Sort: Points First (descending), Tiebreaker Difference Second (ascending)
      sortedTrackerData.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (a.tbDiff !== b.tbDiff) return a.tbDiff - b.tbDiff;
        return String(a.lastName || '').localeCompare(String(b.lastName || ''));
      });

      // Assign Rankings
      let currentRank = 1;
      sortedTrackerData.forEach((player, idx) => {
        if (idx > 0) {
          const prev = sortedTrackerData[idx - 1];
          if (player.score < prev.score || (player.score === prev.score && player.tbDiff > prev.tbDiff)) {
            currentRank = idx + 1;
          }
        }
        player.calculatedRank = currentRank;
      });

      // B. Fetch Gross Payout Matrix
      const activeCount = allUsers.filter((u) => u.playsConfidence).length;
      const matrix = calculateFanaticsPayouts(activeCount);
      const grossPayouts = globalSettings?.fpPayouts || matrix.weeklyGross;

      // C. Record Net Earnings to Firestore (-$12 for rank 9+, Gross - $12 for top 8)
      sortedTrackerData.forEach((u) => {
        const playerRank = u.calculatedRank || 99;
        const grossAward = playerRank <= 8 ? (grossPayouts[playerRank - 1] || 0) : 0;
        const netEarnings = grossAward > 0 ? grossAward - 12 : -12;

        batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), {
          [`weeklyFantasyHistory.${selectedWeek}`]: netEarnings,
          [`weeklyConfidenceHistory.${selectedWeek}`]: u.score
        });
      });

      // D. Process Knockout Pool Statuses
      allUsers.forEach((u) => {
        if (u.playsKnockout) {
          const pick = u.knockoutPicks?.[selectedWeek];
          let status = 'No Pick';
          if (pick) {
            const game = games.find((g: any) => g.away === pick || g.home === pick);
            if (game && game.status === 'final') {
              status = game.winner === 'TIE' ? 'Loser' : (game.winner === pick ? 'Winner' : 'Loser');
            } else {
              status = 'Undecided';
            }
          }
          batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'players', u.id), {
            [`knockoutStatuses.${selectedWeek}`]: status
          });
        }
      });

      // E. Lock/Close the week state
      batch.update(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), {
        [`weekStates.${selectedWeek}`]: 'closed'
      });

      await batch.commit();
      setHasSaved(true);
      setTimeout(() => setHasSaved(false), 2000);
    } catch (e) {
      console.error("Error closing week:", e);
    } finally {
      setIsSaving(false);
    }
  };
  const handleOpenWeek = () => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`weekStates.${selectedWeek}`]: 'open' }));
  const updateFpPayouts = (index: number, val: number) => { const newPayouts = [...globalSettings.fpPayouts]; newPayouts[index] = val; trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { fpPayouts: newPayouts })); };
  const updateSeasonBonuses = (key: string, index: number, val: number) => { const newBonuses = { ...globalSettings.seasonBonuses }; newBonuses[key] = [...newBonuses[key]]; newBonuses[key][index] = val; trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { seasonBonuses: newBonuses })); };

  if (!dbReady || !sessionLoaded) return <div className="min-h-screen flex flex-col items-center justify-center text-white" style={fieldBackgroundStyle}><RefreshCw className="w-12 h-12 text-[#FFB81C] animate-spin mb-4" /><h1 className="text-2xl font-black italic uppercase tracking-widest text-[#FFB81C]">Syncing Database...</h1><p className="text-slate-400 font-bold mt-2">Connecting to live servers</p></div>;
  if (!isLoggedIn) return <LoginView users={allUsers} onLogin={async (id: string) => { setCurrentUserId(id); setOverrideUserId(null); setIsLoggedIn(true); setActiveTab('dashboard'); if (user) await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current'), { currentUserId: id }); }} imgError={imgErrors.logo} handleImgError={handleImgError} onChangePassword={handleChangePassword} />;
  if (isLoggedIn && !currentUser) return <div className="min-h-screen flex flex-col items-center justify-center text-white" style={fieldBackgroundStyle}><RefreshCw className="w-12 h-12 text-[#FFB81C] animate-spin mb-4" /><h1 className="text-2xl font-black italic uppercase tracking-widest text-[#FFB81C]">Loading Account...</h1></div>;

  const userPaymentStatus = currentUser.paymentStatus || 'unpaid', 
  myStat = seasonStats.find(u => u.id === currentUser.id), 
  firstPlacePoints = seasonStats[0]?.[seasonView === '1st Half' ? 'cpFirstHalf' : seasonView === '2nd Half' ? 'cpSecondHalf' : 'cpOverall'] || 0, 
  liveKoStatus = knockoutTrackerData.find(u => u.id === currentUser.id)?.currentStatus, 
  myRank = myStat?.displayRank || '-', 
  myPoints = myStat?.cpOverall || 0, 
  pointsBehind = firstPlacePoints - myPoints, 
  rankChange = (myStat?.previousRank && myStat?.previousCpOverall > 0) ? (myStat.previousRank - myStat.displayRank) : 0;

// Remove 'const' here:
isKnockedOut = wasAlreadyOut(currentUser, liveSeasonWeek, globalSettings);
let displayKnockoutStatus = isKnockedOut ? 'Knocked Out' : 'Alive';

  return (
    <div className="min-h-screen w-full overflow-x-hidden font-sans text-slate-900 pb-24 md:pb-0 relative" style={fieldBackgroundStyle}>
      {showChangePassword && <ChangePasswordModal user={sessionUser} onClose={() => setShowChangePassword(false)} onSave={handleChangePassword} />}
      {deadbeatsToConfirm && (
          <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4"><div className="bg-white max-w-lg w-full rounded-3xl p-8 shadow-2xl animate-in zoom-in-95"><h2 className="text-2xl font-black italic uppercase text-red-600 mb-4 flex items-center gap-2"><AlertCircle /> Confirm Deadbeats</h2><p className="text-slate-600 font-bold mb-4">The following players have incomplete picks and will receive default deadbeat assignments:</p><div className="max-h-60 overflow-y-auto mb-6 bg-slate-50 rounded-xl p-4 border border-slate-200">{deadbeatsToConfirm.length === 0 ? <p className="text-slate-400 italic">None! All active players have fully submitted picks.</p> : <ul className="space-y-2">{deadbeatsToConfirm.map((u: any, i: number) => <li key={i} className="font-black text-slate-800 flex items-center">{String(u.name)} <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded ml-2 border uppercase tracking-widest">{String(u.type)}</span></li>)}</ul>}</div><div className="flex gap-4"><button onClick={() => setDeadbeatsToConfirm(null)} className="flex-1 px-6 py-4 bg-slate-100 text-slate-700 rounded-xl font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button><button onClick={executeLockWeek} className="flex-1 px-6 py-4 bg-red-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-red-700 transition-all">Lock & Apply</button></div></div></div>
      )}
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-xl print:hidden border-b-2 sm:border-b-4 border-[#FFB81C]">
      <div className="w-full max-w-[1600px] mx-auto px-3 sm:px-4 py-1.5 sm:py-3">
          
          {/* DESKTOP HEADER (UNCHANGED) */}
          <div className="hidden md:flex items-center justify-between gap-4 h-16">
            <div className="flex items-center gap-4 py-1 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="bg-white/5 p-2 rounded-2xl backdrop-blur-sm border border-white/10 flex items-center gap-3">
                {!imgErrors?.logo ? (
                  <img src="/hff-logo.png" alt="HFF Logo" className="h-12 w-auto object-contain drop-shadow-lg" onError={() => handleImgError('logo')} />
                ) : (
                  <h1 className="text-xl font-black italic uppercase tracking-tighter text-[#FFB81C]">Hanover Football Fanatics</h1>
                )}
              </div>
            </div>

            <div className="hidden lg:flex items-center gap-1 bg-white/10 rounded-full p-1 border border-white/10 backdrop-blur-md">
              <NavButton icon={Home} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
              {currentUser?.playsConfidence && (
  <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1">
    <NavButton icon={CalendarDays} label="Fanatics" active={activeTab === 'confidence'} onClick={() => setActiveTab('confidence')} />
    <NavButton icon={Users} label="F-Results" active={activeTab === 'c-tracker'} onClick={() => setActiveTab('c-tracker')} />
    <NavButton icon={BarChart2} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
    <NavButton icon={Trophy} label="Standings" active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} />
  </div>
)}
{currentUser?.playsKnockout && (
  <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1">
    <NavButton icon={Skull} label="KnockOut" active={activeTab === 'knockout'} onClick={() => setActiveTab('knockout')} className="text-red-300 hover:text-red-100" />
    <NavButton icon={HeartPulse} label="KO-Results" active={activeTab === 'k-tracker'} onClick={() => setActiveTab('k-tracker')} className="text-red-300 hover:text-red-100" />
  </div>
)}
              {isAdmin && (
                <div className="flex items-center gap-1 pl-2 border-l-2 border-white/10 ml-1">
                  <NavButton icon={ShieldCheck} label="Admin" active={activeTab === 'admin'} onClick={() => setActiveTab('admin')} className="text-[#FFB81C]" />
                </div>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end gap-1">
                {isAdmin ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Playing As</span>
                    <select
                      value={overrideUserId || currentUserId}
                      onChange={(e) => { setOverrideUserId(e.target.value); setActiveTab('dashboard'); }}
                      className="bg-slate-800 text-[#FFB81C] border border-white/20 text-xs font-black uppercase py-1 px-2 rounded outline-none shadow-lg cursor-pointer max-w-[150px] truncate"
                    >
                      <option value={currentUserId}>Yourself</option>
                      <option disabled>──────</option>
                      {allUsers.filter(u => u.id !== currentUserId).map(u => (
                        <option key={u.id} value={u.id}>{String(u.firstName)} {String(u.lastName)}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Logged In As</span>
                    <span className="text-sm font-black uppercase text-white tracking-tighter truncate max-w-[150px]">{formatFullName(currentUser)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <button onClick={() => setShowChangePassword(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-700">
                    <KeyRound className="w-3 h-3"/> Password
                  </button>
                  <button onClick={async () => { setIsLoggedIn(false); setCurrentUserId(''); setOverrideUserId(null); if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current')); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-[10px] font-black uppercase transition-all border border-slate-700">
                    <LogOut className="w-3 h-3"/> Logout
                  </button>
                </div>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#FFB81C] text-slate-900 flex items-center justify-center text-base font-black shadow-lg border-2 border-white/20 flex-shrink-0">
                {String(currentUser.firstName?.[0] || 'U')}
              </div>
            </div>
          </div>

          {/* MOBILE ONLY: OPTION 2 - ULTRA MINIMAL HEADER WITH AVATAR DRAWER TRIGGER */}
          <div className="flex md:hidden items-center justify-between gap-2 h-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <span className="text-sm font-black italic uppercase text-[#FFB81C] tracking-tight">HFF '26</span>
              {isAdmin && overrideUserId && (
                <span className="bg-amber-500/20 text-[#FFB81C] border border-[#FFB81C]/30 text-[9px] font-black uppercase px-2 py-0.5 rounded-full truncate max-w-[130px]">
                  As: {currentUser.firstName}
                </span>
              )}
            </div>

            {/* EXPANDABLE AVATAR PILL BUTTON */}
            <button
              onClick={() => setShowMobileAccountDrawer(!showMobileAccountDrawer)}
              className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-full pl-2.5 pr-1.5 py-0.5 shadow-md active:scale-95 transition-all"
            >
              <span className="text-[10px] font-black uppercase text-slate-200 truncate max-w-[90px]">
                {currentUser.firstName}
              </span>
              <div className="w-6 h-6 rounded-full bg-[#FFB81C] text-slate-900 flex items-center justify-center text-[10px] font-black shrink-0">
                {String(currentUser.firstName?.[0] || 'U')}
              </div>
            </button>
          </div>
        </div>

        {/* MOBILE SLIDE-DOWN ACCOUNT DRAWER OVERLAY */}
        {showMobileAccountDrawer && (
          <div className="md:hidden bg-slate-950 border-b-2 border-[#FFB81C] p-4 space-y-3 animate-in slide-in-from-top duration-200 shadow-2xl">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <div>
                <span className="text-[9px] font-black uppercase text-slate-400 block tracking-widest">Logged In Player</span>
                <span className="text-sm font-black text-white italic uppercase">{formatFullName(currentUser)}</span>
              </div>
              <button onClick={() => setShowMobileAccountDrawer(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ADMIN "PLAYING AS" OVERRIDE DROPDOWN */}
            {isAdmin && (
              <div className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 space-y-1">
                <label className="text-[9px] font-black uppercase text-[#FFB81C] tracking-wider block">Admin Override (Playing As)</label>
                <select
                  value={overrideUserId || currentUserId}
                  onChange={(e) => { 
                    setOverrideUserId(e.target.value); 
                    setActiveTab('dashboard'); 
                    setShowMobileAccountDrawer(false); 
                  }}
                  className="bg-slate-800 text-white border border-slate-700 text-xs font-black uppercase py-1.5 px-2 rounded-lg outline-none w-full"
                >
                  <option value={currentUserId}>Yourself ({sessionUser.firstName})</option>
                  <option disabled>──────</option>
                  {allUsers.filter(u => u.id !== currentUserId).map(u => (
                    <option key={u.id} value={u.id}>{String(u.firstName)} {String(u.lastName)}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ACCOUNT ACTION BUTTONS */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => { setShowChangePassword(true); setShowMobileAccountDrawer(false); }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-slate-800 text-slate-200 py-2.5 rounded-xl text-xs font-black uppercase border border-slate-700 shadow-sm"
              >
                <KeyRound className="w-4 h-4 text-[#FFB81C]" /> Change Password
              </button>
              <button
                onClick={async () => { 
                  setIsLoggedIn(false); 
                  setCurrentUserId(''); 
                  setOverrideUserId(null); 
                  setShowMobileAccountDrawer(false);
                  if (user) await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'session', 'current')); 
                }}
                className="flex-1 flex items-center justify-center gap-1.5 bg-rose-950/80 text-rose-300 py-2.5 rounded-xl text-xs font-black uppercase border border-rose-900 shadow-sm"
              >
                <LogOut className="w-4 h-4 text-rose-400" /> Log Out
              </button>
            </div>
          </div>
        )}
      </header>

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t-2 border-[#FFB81C] z-40 print:hidden overflow-x-auto scrollbar-hide">
  <div className="flex justify-start items-center p-2 gap-2 min-w-max">
    <MobileNavButton icon={Home} label="Home" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
    {currentUser?.playsConfidence && (
      <>
        <MobileNavButton icon={CalendarDays} label="Fanatics" active={activeTab === 'confidence'} onClick={() => setActiveTab('confidence')} />
        <MobileNavButton icon={Users} label="F-Results" active={activeTab === 'c-tracker'} onClick={() => setActiveTab('c-tracker')} />
        <MobileNavButton icon={BarChart2} label="Stats" active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} />
        <MobileNavButton icon={Trophy} label="Standings" active={activeTab === 'standings'} onClick={() => setActiveTab('standings')} />
      </>
    )}
    {currentUser?.playsKnockout && (
      <>
        <MobileNavButton icon={Skull} label="KnockOut" active={activeTab === 'knockout'} onClick={() => setActiveTab('knockout')} />
        <MobileNavButton icon={HeartPulse} label="KO-Results" active={activeTab === 'k-tracker'} onClick={() => setActiveTab('k-tracker')} />
      </>
    )}
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

                        // Pick first non-final game
                        const upcomingGames = (games || []).filter((g: any) => 
                          g.status !== 'final' && g.status !== 'CLOSED' && g.status !== 'closed'
                        );

                        if (upcomingGames.length > 0) {
                            const nextGame = upcomingGames[0];
                            const awayCode = getCanonicalTeamCode(nextGame.away);
                            const homeCode = getCanonicalTeamCode(nextGame.home);

                            return (
                                <div className="relative z-10 inline-flex items-center gap-2.5 bg-slate-800/90 border border-slate-700 text-slate-200 px-4 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider backdrop-blur-sm shadow-lg">
                                    <Clock className="w-4 h-4 text-[#FFB81C]" />
                                    <span>Next Kickoff:</span>
                                    <span className="font-black text-[#FFB81C]">{nextGame.date} at {nextGame.time}</span>
                                    <span className="text-slate-400 font-bold">({awayCode} @ {homeCode})</span>
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
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center items-center text-center">
  <CalendarDays className="w-10 h-10 text-indigo-500 mb-3" />
  <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Current Active Week</div>
  <div className="text-4xl font-black italic text-slate-900">
  Week {liveSeasonWeek}
  </div>
</div>
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
    {isPickWeekLocked && <LockBanner week={picksSelectedWeek} />}
    
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <PickWeekSelector 
        week={picksSelectedWeek} 
        setWeek={setPicksSelectedWeek} 
        currentActiveWeek={currentActiveWeek} 
        maxActiveWeeks={maxActiveWeeks} 
      />
      <div className="flex flex-col sm:flex-row items-center gap-6 flex-1 w-full md:w-auto">
        <ProgressBar current={totalItemsCompleted} total={totalItemsRequired} percentage={progressPercentage} />
      </div>
      <AutoSaveIndicator isSaving={isSaving} hasSaved={hasSaved} count={totalItemsCompleted} />
    </div>

    {/* AVAILABLE RANK POINTS TRACKER BAR */}
    <AvailableRanksBar 
      totalGames={pickGames.length} 
      usedRanks={Object.values(currentUser?.ranks?.[picksSelectedWeek] || {}).map(v => parseInt(String(v), 10))} 
    />
    <div className={`flex flex-col gap-3 ${!currentUser.playsConfidence ? 'opacity-25 grayscale pointer-events-none' : ''}`}>
      {pickGames.map((game: any) => (
        <GameCard 
          key={game.id} 
          game={game} 
          selectedPick={currentUser?.picks?.[picksSelectedWeek]?.[game.id]} 
          selectedRank={currentUser?.ranks?.[picksSelectedWeek]?.[game.id]} 
          totalGames={pickGames.length} 
          usedRanks={Object.values(currentUser?.ranks?.[picksSelectedWeek] || {})} 
          isLocked={isPickWeekLocked} 
          onPick={(team: string) => updateUserPicks(currentUser.id, game.id, team)} 
          onRankChange={(rank: string) => updateUserRank(currentUser.id, game.id, rank)} 
        />
      ))}
      <TiebreakerCard 
        val={currentUser?.tiebreakers?.[picksSelectedWeek] || ''} 
        game={pickGames[pickGames.length - 1]} 
        isLocked={isPickWeekLocked} 
        onSave={(val: any) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', currentUser.id), { [`tiebreakers.${picksSelectedWeek}`]: val }))} 
      />
    </div>
  </div>
)}

{activeTab === 'knockout' && (
  <div className="space-y-6 max-w-[1200px] mx-auto">
    {!currentUser?.playsKnockout && <ParticipationAlert game="KnockOut" />}
    
    {/* HEADER BANNER */}
    <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden border-b-8 border-[#FFB81C] shadow-2xl">
      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Skull className="w-10 h-10 text-[#FFB81C]" />
            <h2 className="text-4xl font-black italic uppercase tracking-tighter">
            KnockOut <span className="text-[#FFB81C]">Week {liveSeasonWeek}</span>
</h2>
          </div>
          <p className="text-slate-400 font-bold max-w-lg">One winner per week. Stay alive. No team reused.</p>
        </div>
      </div>
    </div>

    {/* GAME CARDS LOOP */}
    {wasAlreadyOut(currentUser, liveSeasonWeek, globalSettings) ? (
      <div className={`border-4 rounded-3xl p-12 text-center ${userPaymentStatus === 'disqualified' ? 'bg-red-600 border-red-800' : 'bg-red-50 border-red-500'}`}>
        <Skull className={`w-20 h-24 mx-auto mb-4 ${userPaymentStatus === 'disqualified' ? 'text-red-900' : 'text-red-500'}`} />
        <h3 className={`text-4xl font-black italic uppercase tracking-tighter ${userPaymentStatus === 'disqualified' ? 'text-white' : 'text-red-900'}`}>
          {userPaymentStatus === 'disqualified' ? 'DISQUALIFIED (UNPAID)' : 'Knocked Out'}
        </h3>
      </div>
    ) : (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 ${!currentUser?.playsKnockout ? 'opacity-25 grayscale pointer-events-none' : ''}`}>
        {(games || []).map((game: any) => {
          if (!game) return null;

          const picksMap = currentUser?.knockoutPicks || {};
          const priorTeamsUsed = Object.keys(picksMap)
            .filter((wkKey) => parseInt(String(wkKey || 0), 10) < Number(liveSeasonWeek))
            .map((wkKey) => picksMap[wkKey])
            .filter(Boolean);

          return (
            <KnockoutGameCard 
              key={game.id} 
              game={game} 
              selectedTeam={picksMap[liveSeasonWeek] || ''} 
              usedTeams={priorTeamsUsed} 
              onPick={(team: string) => updateKnockoutPick(currentUser?.id, liveSeasonWeek, team)} 
              isLocked={isWeekLocked} 
            />
          );
        })}
      </div>
    )}
  </div>
)}

{activeTab === 'c-tracker' && (
  <div className="space-y-6 max-w-[1400px] mx-auto">
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <WeekSelector week={resultsSelectedWeek} setWeek={setResultsSelectedWeek} maxActiveWeeks={maxActiveWeeks} />
        {resultsSelectedWeek < liveSeasonWeek && (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-xs sm:text-sm font-black uppercase italic px-4 py-2 rounded-xl">
            ⏮️ {getDisplayWeekLabel(resultsSelectedWeek)} Settled View
          </span>
        )}
      </div>

      {!isWeekLocked && isAdmin && !adminForceReveal && (
        <button 
          onClick={() => setAdminForceReveal(true)} 
          className="px-6 py-2.5 bg-slate-900 text-[#FFB81C] rounded-xl font-black italic uppercase tracking-widest shadow-xl hover:scale-105 transition-all text-xs"
        >
          Admin Peek
        </button>
      )}
    </div>

    <LiveScoreTicker games={resultsGames} />
    <ConfidenceTrackerBoard 
      data={weeklyTrackerData} 
      games={resultsGames} 
      week={resultsSelectedWeek} 
      isWeekComplete={globalSettings?.weekStates?.[resultsSelectedWeek] === 'closed'} 
      currentUser={currentUser} 
      isWeekLocked={globalSettings?.weekStates?.[resultsSelectedWeek] === 'locked' || globalSettings?.weekStates?.[resultsSelectedWeek] === 'closed'} 
      adminForceReveal={adminForceReveal} 
      globalSettings={globalSettings}
    />
  </div>
)}

{activeTab === 'k-tracker' && (
  <div className="space-y-6 max-w-[1200px] mx-auto">
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex items-center justify-between">
      <WeekSelector week={resultsSelectedWeek} setWeek={setResultsSelectedWeek} maxActiveWeeks={maxActiveWeeks} />
      {!isWeekLocked && isAdmin && !adminForceReveal && <button onClick={() => setAdminForceReveal(true)} className="px-6 py-2 bg-slate-900 text-[#FFB81C] rounded-xl font-black italic uppercase tracking-widest shadow-xl hover:scale-105 transition-all text-[10px]">Admin Peek</button>}
    </div>
    <LiveScoreTicker games={games} />
    <KnockoutTrackerBoard 
      data={knockoutTrackerData} 
      week={liveSeasonWeek} 
      allGames={globalSettings?.games} 
      isLocked={isWeekLocked} 
      adminForceReveal={adminForceReveal} 
      currentUser={currentUser} 
      globalSettings={globalSettings} 
    />
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
  <StatsAndInsightsView
    allUsers={allUsers}
    globalSettings={globalSettings}
    selectedWeek={selectedWeek}
    setSelectedWeek={setSelectedWeek}
    currentUser={currentUser}
    maxActiveWeeks={maxActiveWeeks}
  />
)}

{/* === ISOLATED ADMIN TAB === */}{/* === FULLY RESTORED ADMIN TAB === */}
{/* === ADMIN TAB === */}
{activeTab === 'admin' && isAdmin && (
          <div className="space-y-6 max-w-[1200px] mx-auto">
            {/* ADMIN SUB-NAV BAR */}
            <div className="flex bg-white rounded-2xl shadow-md border border-slate-200 p-1.5 mb-6 overflow-x-auto scrollbar-hide">
              <AdminNavButton icon={PieChart} label="Pick Status" active={adminTab === 'status'} onClick={() => setAdminTab('status')} />
              <AdminNavButton icon={Megaphone} label="Recap & Scenarios" active={adminTab === 'recap'} onClick={() => setAdminTab('recap')} />
              <AdminNavButton icon={UserCog} label="Manage Users" active={adminTab === 'users'} onClick={() => setAdminTab('users')} />
              <AdminNavButton icon={ListChecks} label="Manage Games" active={adminTab === 'games'} onClick={() => setAdminTab('games')} />
              <AdminNavButton icon={DollarSign} label="Financials" active={adminTab === 'financials'} onClick={() => setAdminTab('financials')} />
              <AdminNavButton icon={Settings} label="Site Settings" active={adminTab === 'settings'} onClick={() => setAdminTab('settings')} />
            </div>

            {/* 1. PICK STATUS SUB-TAB */}
            {adminTab === 'status' && (
              <div className="space-y-10 bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-slate-100 pb-6">
                  <WeekSelector week={selectedWeek} setWeek={setSelectedWeek} maxActiveWeeks={maxActiveWeeks} />
                  
                  <div className="flex flex-wrap gap-2">
{/* SAVE FOR TROUBLESHOOTING OUTSIDE NORMAL SEASON                   <button 
                      onClick={() => handleConfidenceQuickPicks(true)} 
                      disabled={isSaving}
                      className="px-5 py-3 bg-[#FFB81C] text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-amber-400 transition-all flex items-center gap-2"
                    >
                      <Zap className="w-4 h-4 text-slate-900" /> Auto-Fill Quick Picks (All)
                    </button>

                    <button 
                      onClick={() => handleKnockoutQuickPick(true)} 
                      disabled={isSaving}
                      className="px-5 py-3 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-red-700 transition-all flex items-center gap-2"
                    >
                      <Skull className="w-4 h-4 text-white" /> Quick Pick KnockOut (All)
                    </button>
            */}

                    <button 
                      onClick={handleCopyMissingEmails} 
                      className="px-5 py-3 bg-slate-900 text-[#FFB81C] rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" /> Copy Email List ({getMissingEmailsList().length})
                    </button>

                    <button 
  onClick={handleCopyMissingEmails} 
  className="px-5 py-3 bg-slate-900 text-[#FFB81C] rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-slate-800 transition-all flex items-center gap-2"
>
  <FileText className="w-4 h-4" /> Copy Email List ({getMissingEmailsList().length})
</button>

{/* 🟢 PASTE THE EXPORT BUTTON RIGHT HERE */}
<button 
  onClick={handleExportPicksCSV} 
  className="px-5 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-emerald-700 transition-all flex items-center gap-2"
>
  <Printer className="w-4 h-4 text-white" /> Export Week {selectedWeek} CSV Backup
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

                <div>
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-4 flex items-center gap-2">
                    <CalendarDays className="w-6 h-6 text-[#FFB81C]" /> Fanatics Pick Status
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <StatusColumn title="Not Started" count={(statusSummary?.notStarted || []).length} users={statusSummary?.notStarted || []} color="slate" icon={UserMinus} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} />
                    <StatusColumn title="In Progress" count={(statusSummary?.inProgress || []).length} users={statusSummary?.inProgress || []} color="blue" icon={Play} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} />
                    <StatusColumn title="Completed" count={(statusSummary?.completed || []).length} users={statusSummary?.completed || []} color="green" icon={CheckCircle} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('confidence'); }} />
                  </div>
                </div>

                <div className="pt-8 border-t-2 border-slate-100">
                  <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 mb-4 flex items-center gap-2">
                    <Skull className="w-6 h-6 text-[#FFB81C]" /> KnockOut Pick Status
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <StatusColumn title="Waiting on Pick" count={(knockoutStatusSummary?.waiting || []).length} users={knockoutStatusSummary?.waiting || []} color="slate" icon={Clock} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('knockout'); }} />
                    <StatusColumn title="Pick Submitted" count={(knockoutStatusSummary?.submitted || []).length} users={knockoutStatusSummary?.submitted || []} color="green" icon={CheckCircle} onOverride={(id: string) => { setOverrideUserId(id); setActiveTab('knockout'); }} />
                  </div>
                </div>
              </div>
            )}

            {/* 2. MANAGE USERS SUB-TAB */}
            {/* 2. MANAGE USERS SUB-TAB (FULLY RESTORED) */}
            {adminTab === 'users' && (
              <div className="space-y-6">
                {/* SINGLE USER REGISTRATION */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase italic text-slate-900 mb-4 flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-[#FFB81C]" /> Register Single Player
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">First Name</label>
                      <input value={newUserForm.firstName} onChange={e => setNewUserForm({...newUserForm, firstName: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" placeholder="First" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Name</label>
                      <input value={newUserForm.lastName} onChange={e => setNewUserForm({...newUserForm, lastName: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" placeholder="Last" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Email</label>
                      <input value={newUserForm.email} onChange={e => setNewUserForm({...newUserForm, email: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C]" placeholder="Email" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role</label>
                      <select value={newUserForm.role || 'user'} onChange={e => setNewUserForm({...newUserForm, role: e.target.value})} className="w-full border-2 border-slate-100 rounded-xl px-3 py-2 text-sm font-bold outline-none focus:border-[#FFB81C] bg-white">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button onClick={handleAddUser} className="w-full bg-slate-900 text-[#FFB81C] rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-all">Add Player</button>
                  </div>
                </div>

                {/* BULK CSV USER IMPORT TOOL */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                  <h3 className="text-lg font-black uppercase italic text-slate-900 mb-2 flex items-center gap-2">
                    <Users className="w-5 h-5 text-[#FFB81C]" /> Bulk Roster CSV Import
                  </h3>
                  <p className="text-xs text-slate-500 font-bold mb-3">Paste CSV lines formatted as: <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">FirstName, LastName, Nickname, Email, PaymentStatus</code></p>
                  <textarea id="bulkUserCsvInput" rows={3} className="w-full border-2 border-slate-100 rounded-2xl p-3 text-xs font-mono outline-none focus:border-[#FFB81C] mb-3" placeholder="John, Doe, Johnny, john@example.com, paid" />
                  <button onClick={() => { const el = document.getElementById('bulkUserCsvInput') as HTMLTextAreaElement; if (el) handleBulkImportUsers(el.value); }} className="bg-slate-900 text-[#FFB81C] rounded-xl px-5 py-2.5 text-xs font-black uppercase tracking-widest shadow-md">
                    Import Roster CSV
                  </button>
                </div>

                {/* FULL FEATURED ROSTER TABLE */}
                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-black italic uppercase text-slate-900">Registered Players ({allUsers.length})</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1100px]">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]">
                          <th className="p-4">Player Identity</th>
                          <th className="p-4">Login Details</th>
                          <th className="p-4 text-center">Payment</th>
                          <th className="p-4 text-center">Pool Access</th>
                          <th className="p-4 text-center">Security & Login</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(allUsers || []).map(user => {
                          const isEditing = editingUserId === user.id;

                          if (isEditing) {
                            return (
                              <EditUserRow
                                key={user.id}
                                user={user}
                                form={editUserForm}
                                setForm={setEditUserForm}
                                onCancel={() => setEditingUserId(null)}
                                onSave={saveInlineUserEdit}
                              />
                            );
                          }

                          return (
                            <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                              {/* Player Identity */}
                              <td className="p-4">
                                <div className="font-black text-slate-900 text-base">{formatFullName(user)}</div>
                                <div className="text-xs text-slate-500 font-bold">{user.email || 'No Email Set'}</div>
                              </td>

                              {/* Login Details */}
                              <td className="p-4 text-xs">
                                <div className="font-bold text-slate-700">Username: <span className="font-mono text-slate-900">{user.username || 'N/A'}</span></div>
                                <div className="text-slate-400">Role: <span className="font-black uppercase text-slate-700">{user.role || 'user'}</span></div>
                              </td>

                              {/* Payment Status Dropdown */}
                              <td className="p-4 text-center">
                                <select
                                  value={user.paymentStatus || 'unpaid'}
                                  onChange={(e) => handleEditUser(user.id, 'paymentStatus', e.target.value)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase outline-none cursor-pointer border-2 ${
                                    user.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-300' :
                                    user.paymentStatus === 'disqualified' ? 'bg-red-50 text-red-700 border-red-300' :
                                    'bg-amber-50 text-amber-800 border-amber-300'
                                  }`}
                                >
                                  <option value="paid">Paid</option>
                                  <option value="unpaid">Unpaid</option>
                                  <option value="disqualified">Disqualified</option>
                                </select>
                              </td>

                              {/* Pool Toggles */}
                              <td className="p-4 text-center">
                                <div className="flex items-center justify-center gap-4 text-xs font-bold">
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={user.playsConfidence} onChange={(e) => handleEditUser(user.id, 'playsConfidence', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                                    <span>Fanatics</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 cursor-pointer">
                                    <input type="checkbox" checked={user.playsKnockout} onChange={(e) => handleEditUser(user.id, 'playsKnockout', e.target.checked)} className="w-4 h-4 accent-[#FFB81C]" />
                                    <span>Knockout</span>
                                  </label>
                                </div>
                              </td>

                              {/* Security & Last Login */}
                              <td className="p-4 text-center text-xs">
                                {user.isLocked || (user.failedLogins >= 5) ? (
                                  <button
                                    onClick={() => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'players', user.id), { isLocked: false, failedLogins: 0 })}
                                    className="px-3 py-1 bg-red-600 text-white rounded-lg font-black uppercase text-[10px] shadow-sm hover:bg-red-700 transition-all"
                                  >
                                    Unlock Account
                                  </button>
                                ) : (
                                  <div>
                                    <span className="text-slate-400 font-bold block text-[10px] uppercase">Last Login:</span>
                                    <span className="font-mono font-bold text-slate-700">
                                      {user.lastLoginTime ? new Date(user.lastLoginTime).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="p-4 text-right">
                                <div className="flex justify-end gap-1">
                                  <button
                                    onClick={() => {
                                      setEditingUserId(user.id);
                                      setEditUserForm({
                                        firstName: user.firstName || '',
                                        lastName: user.lastName || '',
                                        username: user.username || '',
                                        nickname: user.nickname || '',
                                        email: user.email || '',
                                        password: user.password || '',
                                        role: user.role || 'user'
                                      });
                                    }}
                                    className="p-2 text-slate-400 hover:text-slate-900 transition-colors"
                                    title="Edit User"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(user.id)}
                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 3. MANAGE GAMES SUB-TAB */}
            {adminTab === 'games' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <AdminLifecycleCard 
                    week={selectedWeek} 
                    status={currentWeekState} 
                    onLock={handleLockWeek} 
                    onClose={handleCloseWeek} 
                    onOpen={handleOpenWeek}
                    onPreviewClose={() => setIsPreviewOpen(true)}
                  />
                  <AdminWeekCard week={selectedWeek} onChange={(e: any) => setSelectedWeek(Number(e.target.value))} maxActiveWeeks={maxActiveWeeks} />
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-[#FFB81C]" /> Live Scores Sync
                    </h3>
                    <p className="text-sm text-slate-500 font-bold mt-1">Pull live scores and updates for currently loaded games.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button onClick={handleForceFixGames} disabled={isSaving} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black uppercase text-xs shadow-md">Force-Fix Duplicates</button>
                    <button onClick={handleSyncScores} disabled={isSyncing} className="px-6 py-3 bg-slate-900 text-[#FFB81C] rounded-xl font-black uppercase text-xs shadow-md">{isSyncing ? 'Syncing...' : 'Sync Live Scores'}</button>
                  </div>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-black italic uppercase tracking-tighter text-slate-900 flex items-center gap-2">
                        <ListChecks className="w-5 h-5 text-[#FFB81C]" /> Manage {selectedWeek <= 3 ? `Preseason Week ${selectedWeek}` : `Week ${selectedWeek - 3}`} Games
                      </h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">Manually update game statuses, winners, and designated tiebreaker.</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]">
                          <th className="p-4 font-black tracking-widest">Matchup</th>
                          <th className="p-4 font-black tracking-widest text-center">Status</th>
                          <th className="p-4 font-black tracking-widest text-right">Game Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(resultsGames || games || []).map((game: any) => (
                          <tr key={game.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4 font-black text-slate-900 text-lg">
                              {String(game.awayName || game.away)} @ {String(game.homeName || game.home)}
                              <div className="text-xs text-slate-400 uppercase font-bold tracking-widest mt-1">{String(game.date)} • {String(game.time)}</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-200 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={!!game.isTiebreaker}
                                    onChange={async (e) => {
                                      const isChecked = e.target.checked;
                                      try {
                                        const updatedGames = (resultsGames || games).map((g: any) => 
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
                            <td className="p-4 text-right">
                              <select value={game.winner === 'TIE' ? 'TIE' : (game.winner ? game.winner : (game.status === 'final' ? 'final-no-winner' : 'upcoming'))} onChange={(e) => updateGameResult(game.id, e.target.value, e.target.value)} className="border-2 rounded-xl px-4 py-2 text-xs font-black uppercase italic tracking-tighter outline-none focus:border-[#FFB81C] bg-white w-full max-w-[200px] cursor-pointer">
                                <option value="upcoming">Upcoming</option>
                                <option value={game.away}>{String(game.awayName || game.away)} Won</option>
                                <option value={game.home}>{String(game.homeName || game.home)} Won</option>
                                <option value="TIE">Tie Game</option>
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-slate-900 uppercase italic">Actual Tiebreaker Points</h4>
                      <p className="text-xs text-slate-500 font-medium">Used to calculate closest tiebreaker</p>
                    </div>
                    <input type="number" className="border-2 border-slate-200 rounded-xl px-4 py-2 text-xl font-black text-center w-32 outline-none focus:border-[#FFB81C]" value={globalSettings?.actualTiebreakers?.[selectedWeek] || ''} onChange={(e) => { updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { [`actualTiebreakers.${selectedWeek}`]: parseInt(e.target.value) || 0 }); }} />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Manage Season Schedule & Weeks</h2>
                      <p className="text-sm text-slate-500">Import schedules week-by-week, flex kickoff times, or clear specific weeks.</p>
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
                  {Array.from({ length: 18 }, (_, i) => i + 1).map((wNum) => {
  const weekGames = globalSettings?.games?.[wNum] || [];
  const gameCount = weekGames.length;
  const isPopulated = gameCount > 0;
  const weekLabel = `Week ${wNum}`;

                      return (
                        <div 
                          key={wNum} 
                          className={`p-4 rounded-xl border transition-all ${
                            isPopulated ? 'bg-slate-50 border-slate-200 hover:border-slate-300' : 'bg-slate-50/50 border-slate-100 opacity-75'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-slate-900 text-base">{weekLabel}</span>
                            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${isPopulated ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-200 text-slate-500'}`}>
                              {gameCount} {gameCount === 1 ? 'Game' : 'Games'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mb-4 truncate">
                            {isPopulated ? `First Kickoff: ${weekGames[0]?.date || ''} @ ${weekGames[0]?.time || ''}` : 'No games imported'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button disabled={isSyncing} onClick={() => handleImportSingleWeek(wNum)} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50">
                              {isPopulated ? 'Re-Import' : 'Import'}
                            </button>
                            {isPopulated && (
                              <>
                                <button disabled={isSyncing} onClick={() => handleSyncWeekTimes(wNum)} className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-2 px-3 rounded-lg transition-colors disabled:opacity-50" title="Resync game times without resetting picks">
                                  Sync Times
                                </button>
                                <button disabled={isSyncing} onClick={() => handleClearSingleWeek(wNum)} className="bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs font-semibold py-2 px-3 rounded-lg transition-colors" title="Clear games for this week">
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
              </div>
            )}

            {/* 4. FINANCIALS SUB-TAB */}
            {/* 4. FINANCIALS SUB-TAB */}
{adminTab === 'financials' && (
  <div className="space-y-8 max-w-[1400px] mx-auto">
    {(() => {
      const fanaticsPlayers = allUsers.filter(u => u.playsConfidence);
      const activeCount = fanaticsPlayers.length;
      const maxWeeksVal = globalSettings?.maxActiveWeeks || 18;
      const half1Weeks = Math.ceil(maxWeeksVal / 2);
      const half2Weeks = Math.floor(maxWeeksVal / 2);

      let closedWeeksCount = 0;
      for (let wk = 1; wk <= maxWeeksVal; wk++) {
        if (globalSettings?.weekStates?.[wk] === 'closed') closedWeeksCount++;
      }

      const matrix = calculateFanaticsPayouts(activeCount, maxWeeksVal, half1Weeks, half2Weeks);
      const totalSeasonDues = activeCount * 12 * maxWeeksVal;
      const totalCollectedToDate = activeCount * 12 * closedWeeksCount;

      const weeklyPayouts = globalSettings?.fpPayouts || matrix.weeklyGross;
      const half1Payouts = globalSettings?.seasonBonuses?.firstHalf || matrix.half1Payouts;
      const half2Payouts = globalSettings?.seasonBonuses?.secondHalf || matrix.half2Payouts;
      const overallPayouts = globalSettings?.seasonBonuses?.overall || matrix.seasonPayouts;

      return (
        <div className="space-y-8">
          {/* HEADER SUMMARY BAR */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border-b-8 border-[#FFB81C]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-[#FFB81C]">
                  Fanatics Pool Financial Ledger
                </span>
                <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white flex items-center gap-2 mt-1">
                  <DollarSign className="w-7 h-7 sm:w-8 sm:h-8 text-[#FFB81C]" /> Prize Pool & Payout Calculator
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  {activeCount} Active Players &bull; $12/Week Dues &bull; {closedWeeksCount} / {maxWeeksVal} Weeks Closed
                </p>
              </div>
            </div>

            {/* HIGH LEVEL METRICS GRID */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Dues Collected</span>
                <span className="text-2xl font-black italic text-emerald-400 font-mono">${totalCollectedToDate}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">Projected: ${totalSeasonDues}</span>
              </div>
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Weekly Gross Pot</span>
                <span className="text-2xl font-black italic text-[#FFB81C] font-mono">${matrix.weeklyPot}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">$7.00/player/wk</span>
              </div>
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">1st & 2nd Half Pots</span>
                <span className="text-2xl font-black italic text-sky-400 font-mono">${Math.round(matrix.half1Pot)}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">$1.75/player/wk</span>
              </div>
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Overall Season Pot</span>
                <span className="text-2xl font-black italic text-purple-400 font-mono">${Math.round(matrix.seasonPot)}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">$1.25/player/wk</span>
              </div>
              <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 text-center col-span-2 sm:col-span-1">
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">Expense / Party Fund</span>
                <span className="text-2xl font-black italic text-indigo-400 font-mono">${Math.round(activeCount * 2.0 * maxWeeksVal)}</span>
                <span className="text-[9px] text-slate-500 block mt-0.5">$2.00/player/wk</span>
              </div>
            </div>
          </div>

          {/* SECTION 1: WEEKLY PAYOUT POSITION BREAKDOWN */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 sm:p-6 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-lg sm:text-xl font-black italic uppercase text-slate-900 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#FFB81C]" /> Weekly Payout Schedule (Ranks 1 – 8)
                </h3>
                <p className="text-xs text-slate-500 font-bold mt-0.5">
                  Calculated based on {activeCount} active players ($7.00/wk gross pool = ${matrix.weeklyPot})
                </p>
              </div>
            </div>

            <div className="w-full max-w-full overflow-x-auto">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase border-b-2 border-[#FFB81C]">
                    <th className="p-3.5 italic">Finish Position</th>
                    <th className="p-3.5 text-center">% Allocation</th>
                    <th className="p-3.5 text-center">Gross Payout Award</th>
                    <th className="p-3.5 text-center">Weekly Dues</th>
                    <th className="p-3.5 text-right pr-6">Net Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-bold">
                  {[
                    { pos: '1st Place', pct: '22%' },
                    { pos: '2nd Place', pct: '19%' },
                    { pos: '3rd Place', pct: '16%' },
                    { pos: '4th Place', pct: '13%' },
                    { pos: '5th Place', pct: '9%' },
                    { pos: '6th Place', pct: '8%' },
                    { pos: '7th Place', pct: '7%' },
                    { pos: '8th Place', pct: '6%' },
                  ].map((row, idx) => {
                    const gross = weeklyPayouts[idx] || 0;
                    const net = gross - 12;

                    return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3.5 font-black text-slate-900 italic flex items-center gap-2">
                          <span className="w-6 text-center text-[#FFB81C] font-black">#{idx + 1}</span> {row.pos}
                        </td>
                        <td className="p-3.5 text-center text-slate-500 font-mono">{row.pct}</td>
                        <td className="p-3.5 text-center font-mono font-black text-slate-900">${gross}</td>
                        <td className="p-3.5 text-center font-mono text-rose-600">-$12</td>
                        <td className="p-3.5 text-right pr-6 font-mono font-black italic text-emerald-600">
                          {net >= 0 ? `+$${net}` : `-$${Math.abs(net)}`}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="bg-slate-50 font-black">
                    <td className="p-3.5 italic text-slate-400">Ranks 9th through {activeCount}th</td>
                    <td className="p-3.5 text-center text-slate-400 font-mono">0%</td>
                    <td className="p-3.5 text-center font-mono text-slate-400">$0</td>
                    <td className="p-3.5 text-center font-mono text-rose-600">-$12</td>
                    <td className="p-3.5 text-right pr-6 font-mono text-rose-600">-$12</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: SEASON BONUS PAYOUT TABLES (1ST HALF, 2ND HALF, OVERALL) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 1ST HALF BONUS TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-900 text-white border-b-4 border-sky-400">
                <h4 className="font-black italic uppercase text-sm sm:text-base text-sky-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> 1st Half Bonus (Wks 1–{half1Weeks})
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Total Pool: ${Math.round(matrix.half1Pot)}
                </p>
              </div>
              <div className="p-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-100">
                      <th className="pb-2">Pos</th>
                      <th className="pb-2 text-center">%</th>
                      <th className="pb-2 text-right">Bonus Cash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {half1Payouts.slice(0, 8).map((amt: number, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 text-slate-900">#{i + 1} Finish</td>
                        <td className="py-2 text-center text-slate-400 font-mono">
                          {[22, 19, 16, 13, 9, 8, 7, 6][i]}%
                        </td>
                        <td className="py-2 text-right font-mono font-black text-sky-600">+${amt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2ND HALF BONUS TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-900 text-white border-b-4 border-purple-400">
                <h4 className="font-black italic uppercase text-sm sm:text-base text-purple-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> 2nd Half Bonus (Wks {half1Weeks + 1}–{maxWeeksVal})
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Total Pool: ${Math.round(matrix.half2Pot)}
                </p>
              </div>
              <div className="p-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-100">
                      <th className="pb-2">Pos</th>
                      <th className="pb-2 text-center">%</th>
                      <th className="pb-2 text-right">Bonus Cash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {half2Payouts.slice(0, 8).map((amt: number, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 text-slate-900">#{i + 1} Finish</td>
                        <td className="py-2 text-center text-slate-400 font-mono">
                          {[22, 19, 16, 13, 9, 8, 7, 6][i]}%
                        </td>
                        <td className="py-2 text-right font-mono font-black text-purple-600">+${amt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* OVERALL SEASON BONUS TABLE */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-900 text-white border-b-4 border-[#FFB81C]">
                <h4 className="font-black italic uppercase text-sm sm:text-base text-[#FFB81C] flex items-center gap-1.5">
                  <Crown className="w-4 h-4" /> Full Season Leaderboard
                </h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                  Total Pool: ${Math.round(matrix.seasonPot)}
                </p>
              </div>
              <div className="p-3">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[9px] uppercase text-slate-400 border-b border-slate-100">
                      <th className="pb-2">Pos</th>
                      <th className="pb-2 text-center">%</th>
                      <th className="pb-2 text-right">Grand Prize</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold">
                    {overallPayouts.slice(0, 8).map((amt: number, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="py-2 text-slate-900">#{i + 1} Overall</td>
                        <td className="py-2 text-center text-slate-400 font-mono">
                          {[22, 19, 16, 13, 9, 8, 7, 6][i]}%
                        </td>
                        <td className="py-2 text-right font-mono font-black text-emerald-600">+${amt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    })()}
  </div>
)}
{/* 6. ADMIN RECAP & MONDAY NIGHT SCENARIOS SUB-TAB */}
{adminTab === 'recap' && (
  <div className="space-y-8 max-w-[1400px] mx-auto">
    {(() => {
      const targetWk = selectedWeek || liveSeasonWeek;
      const weekGames = globalSettings?.games?.[targetWk] || games || [];
      const actualTB = globalSettings?.actualTiebreakers?.[targetWk] ?? 0;

      // 1. Email Roster Extraction
      const fanaticsEmails = allUsers.filter(u => u.playsConfidence && u.email?.trim()).map(u => u.email.trim());
      const knockoutEmails = allUsers.filter(u => u.playsKnockout && u.email?.trim()).map(u => u.email.trim());

      const copyToClipboard = (text: string, msg: string) => {
        navigator.clipboard.writeText(text);
        alert(msg);
      };

      // 2. Identify Monday Night / Final Games
      const mondayGames = weekGames.filter((g: any) => {
        const dateStr = String(g.date || '').toLowerCase();
        return dateStr.includes('mon') || g.isTiebreaker;
      });

      // 3. Process Weekly Standings for Great 8 & Basement
      const standardMaxPossible = weekGames.reduce((sum: number, _: any, idx: number) => sum + (idx + 1), 0);
      const processedUsers = allUsers.filter(u => u.playsConfidence).map((u: any) => {
        const userPicks = u.picks?.[targetWk] || {};
        const userRanks = u.ranks?.[targetWk] || {};
        const userTB = parseInt(u.tiebreakers?.[targetWk] || '0', 10);
        const isDeadbeat = u.tiebreakers?.[targetWk] === '0' || (weekGames.length > 0 && weekGames.every((g: any) => parseInt(userRanks[g.id] || 0, 10) === 5));

        const userMaxPossible = isDeadbeat ? weekGames.length * 5 : standardMaxPossible;
        const pointsLost = weekGames.reduce((lost: number, g: any) => {
          const pick = userPicks[g.id];
          const rank = parseInt(userRanks[g.id] || 0, 10);
          if (!pick || !rank) return lost;
          if (g.status === 'final' && g.winner && pick !== g.winner) return lost + rank;
          return lost;
        }, 0);

        const score = userMaxPossible - pointsLost;
        const tbDiff = Math.abs(userTB - actualTB);

        return { ...u, name: formatFullName(u), score, tbDiff, userTB, userPicks, userRanks, isDeadbeat };
      });

      processedUsers.sort((a, b) => b.score - a.score || a.tbDiff - b.tbDiff);
      const payouts = globalSettings?.fpPayouts || [77, 67, 56, 46, 31, 28, 25, 20];
      calculateTiedPayouts(processedUsers, payouts);

      const great8 = processedUsers.filter(u => u.grossPayout > 0);
      const basement = processedUsers.slice(-8).reverse();

      // 4. Knockout Casualties
      const koCasualties = allUsers.filter(u => u.playsKnockout && ['Loser', 'Loser (No Pick)'].includes(u.knockoutStatuses?.[targetWk])).map(u => ({
        name: formatFullName(u),
        pick: u.knockoutPicks?.[targetWk] || 'No Pick'
      }));

      return (
        <div className="space-y-8">
          {/* HEADER & ROSTER EMAIL EXPORTERS */}
          <div className="bg-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl border-b-8 border-[#FFB81C]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-[#FFB81C]">Admin Communications Center</span>
                <h2 className="text-2xl sm:text-3xl font-black italic uppercase text-white flex items-center gap-2 mt-1">
                  <Megaphone className="w-7 h-7 text-[#FFB81C]" /> Weekly Email Recap & Scenarios
                </h2>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
                  Week {targetWk} &bull; Separate copy blocks for Fanatics and Knockout updates
                </p>
              </div>

              {/* QUICK EMAIL ROSTER COPY BUTTONS */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copyToClipboard(fanaticsEmails.join(', '), `Copied ${fanaticsEmails.length} Fanatics emails!`)}
                  className="px-4 py-2.5 bg-amber-500/20 text-[#FFB81C] border border-[#FFB81C]/40 rounded-xl font-black text-xs uppercase hover:bg-amber-500/30 transition-all flex items-center gap-1.5"
                >
                  <Mail className="w-4 h-4" /> Copy Fanatics Emails ({fanaticsEmails.length})
                </button>
                <button
                  onClick={() => copyToClipboard(knockoutEmails.join(', '), `Copied ${knockoutEmails.length} Knockout emails!`)}
                  className="px-4 py-2.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-xl font-black text-xs uppercase hover:bg-rose-500/30 transition-all flex items-center gap-1.5"
                >
                  <Skull className="w-4 h-4 text-rose-400" /> Copy Knockout Emails ({knockoutEmails.length})
                </button>
                <button
  onClick={() => setShowWeeklyRecapModal(true)}
  className="px-4 py-2.5 bg-[#FFB81C] text-slate-900 rounded-xl font-black text-xs uppercase hover:bg-amber-400 transition-all flex items-center gap-1.5 shadow-md"
>
  <Megaphone className="w-4 h-4 text-slate-900" /> Launch Rich Email Recap Modal
</button>
              </div>
            </div>
          </div>

          {/* SECTION 1: MONDAY NIGHT WIN SCENARIOS */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b-4 border-[#FFB81C]">
              <div>
                <h3 className="text-lg font-black italic uppercase text-[#FFB81C] flex items-center gap-2">
                  <Zap className="w-5 h-5 text-[#FFB81C]" /> Monday Night Contenders & Path-To-Victory
                </h3>
                <p className="text-xs text-slate-400 font-bold">Live points gap heading into final game(s)</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {mondayGames.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No remaining Monday Night or tiebreaker games identified for Week {targetWk}.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {processedUsers.slice(0, 5).map((u: any, idx: number) => {
                    const topScore = processedUsers[0].score;
                    const gap = topScore - u.score;

                    return (
                      <div key={u.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                        <div>
                          <span className="text-xs font-black text-[#FFB81C] uppercase italic">#{idx + 1} Place</span>
                          <h4 className="font-black text-slate-900 text-sm">{u.name}</h4>
                          <span className="text-[10px] text-slate-500 font-bold">Score: {u.score} PTS | TB Pick: {u.userTB}</span>
                        </div>
                        <div className="text-right">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${gap === 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {gap === 0 ? 'Current Leader' : `-${gap} PTS Behind`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: THE GREAT 8 (FANATICS PAYOUT ZONE) */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b-4 border-[#FFB81C]">
              <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#FFB81C]" /> The Great 8 (Weekly Fanatics Winners)
              </h3>
              <button
                onClick={() => {
                  const html = great8.map((u: any) => `#${u.rank} ${u.name} - ${u.score} PTS (+$${u.grossPayout})`).join('\n');
                  copyToClipboard(html, "Great 8 summary copied to clipboard!");
                }}
                className="px-4 py-1.5 bg-[#FFB81C] text-slate-900 font-black text-xs uppercase rounded-lg shadow"
              >
                Copy Great 8
              </button>
            </div>
            <div className="p-4">
              <table className="w-full text-left text-xs font-bold">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] border-b pb-2">
                    <th className="p-2">Rank</th>
                    <th className="p-2">Player</th>
                    <th className="p-2 text-center">Score</th>
                    <th className="p-2 text-center">Tiebreaker</th>
                    <th className="p-2 text-right">Award</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {great8.map((u: any) => (
                    <tr key={u.id}>
                      <td className="p-2 font-black italic text-[#FFB81C]">#{u.rank}</td>
                      <td className="p-2 text-slate-900">{u.name}</td>
                      <td className="p-2 text-center font-mono">{u.score} PTS</td>
                      <td className="p-2 text-center font-mono">{u.userTB}</td>
                      <td className="p-2 text-right font-mono text-emerald-600 font-black">+${u.grossPayout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 3: THE BASEMENT */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b-4 border-rose-600">
              <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-rose-500" /> The Basement (Bottom 8 Finishers)
              </h3>
              <button
                onClick={() => {
                  const html = basement.map((u: any) => `#${u.rank} ${u.name} - ${u.score} PTS`).join('\n');
                  copyToClipboard(html, "Basement list copied!");
                }}
                className="px-4 py-1.5 bg-rose-600 text-white font-black text-xs uppercase rounded-lg shadow"
              >
                Copy Basement
              </button>
            </div>
            <div className="p-4">
              <table className="w-full text-left text-xs font-bold">
                <thead>
                  <tr className="text-slate-400 uppercase text-[10px] border-b pb-2">
                    <th className="p-2">Rank</th>
                    <th className="p-2">Player</th>
                    <th className="p-2 text-center">Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {basement.map((u: any) => (
                    <tr key={u.id}>
                      <td className="p-2 font-black italic text-rose-500">#{u.rank}</td>
                      <td className="p-2 text-slate-900">{u.name} {u.isDeadbeat && '(Deadbeat)'}</td>
                      <td className="p-2 text-center font-mono text-rose-600">{u.score} PTS</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: SEPARATE KNOCKOUT POOL RECAP */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center border-b-4 border-red-600">
              <h3 className="text-lg font-black italic uppercase text-white flex items-center gap-2">
                <Skull className="w-5 h-5 text-red-600" /> Separate Knockout Email Update
              </h3>
              <button
                onClick={() => {
                  const text = `KNOCKOUT WEEK ${targetWk} ELIMINATIONS:\n` + koCasualties.map((k: any) => `${k.name} - Picked ${k.pick} ❌`).join('\n');
                  copyToClipboard(text, "Knockout recap copied to clipboard!");
                }}
                className="px-4 py-1.5 bg-red-600 text-white font-black text-xs uppercase rounded-lg shadow"
              >
                Copy Knockout Email Content
              </button>
            </div>
            <div className="p-6">
              {koCasualties.length === 0 ? (
                <p className="text-xs text-emerald-600 font-black uppercase">No Knockout Eliminations in Week {targetWk}! All active players survived.</p>
              ) : (
                <ul className="space-y-2 text-xs font-bold text-slate-800">
                  {koCasualties.map((k: any, idx: number) => (
                    <li key={idx} className="flex items-center justify-between p-3 bg-rose-50 rounded-xl border border-rose-200">
                      <span>{k.name}</span>
                      <span className="text-rose-700 font-black italic">Picked {k.pick} ❌</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      );
    })()}
  </div>
)}

            {/* 5. SITE SETTINGS SUB-TAB */}
            {adminTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
                  <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-2 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-[#FFB81C]" /> Max Active Pool Weeks
                  </h3>
                  <p className="text-sm text-slate-500 font-bold mb-4">Controls how many weeks players can view and submit picks for in the week selector.</p>
                  <div className="flex items-center gap-4">
                    <input
                      type="number"
                      min="1"
                      max="22"
                      value={globalSettings?.maxActiveWeeks || 18}
                      onChange={async (e) => {
                        const val = parseInt(e.target.value) || 1;
                        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { maxActiveWeeks: val });
                      }}
                      className="w-24 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-2 font-black text-slate-900 text-lg outline-none focus:border-[#FFB81C]"
                    />
                    <span className="text-sm font-semibold text-slate-600">Weeks currently accessible to players (1 to {globalSettings?.maxActiveWeeks || 18})</span>
                  </div>
                </div>

                <div className="bg-white p-8 rounded-3xl border-2 border-slate-100 shadow-sm">
                  <h3 className="font-black uppercase tracking-widest text-slate-400 text-xs mb-6 flex items-center gap-2">
                    <Megaphone className="w-4 h-4" /> Global Announcement
                  </h3>
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
                  <input 
                    type="text" 
                    value={globalSettings?.apiSportsKey || ''} 
                    onChange={(e) => trackSaving(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pool_settings', 'global'), { apiSportsKey: e.target.value }))} 
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl p-4 font-bold text-slate-900 outline-none focus:border-[#FFB81C]" 
                    placeholder="Paste your API-Sports v1 Key here..." 
                  />
                </div>

                <div className="bg-white p-8 rounded-3xl border-4 border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-black italic uppercase text-slate-900">Reset Fanatics Pool</h3>
                    <p className="text-slate-500 font-medium">Wipes all picks, ranks, tiebreakers, and history for a new season.</p>
                  </div>
                  {!showFanaticsResetConfirm ? (
                    <button onClick={() => setShowFanaticsResetConfirm(true)} className="px-10 py-4 bg-slate-900 text-[#FFB81C] rounded-2xl font-black italic uppercase flex items-center gap-3 shadow-lg">
                      <RefreshCw className="w-6 h-6" /> Reset Fanatics
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => setShowFanaticsResetConfirm(false)} className="px-6 py-4 bg-white text-slate-700 rounded-2xl font-black border-2 border-slate-200">Cancel</button>
                      <button onClick={handleResetFanatics} className="px-6 py-4 bg-red-900 text-white rounded-2xl font-black shadow-xl animate-pulse">Confirm Reset</button>
                    </div>
                  )}
                </div>

                <div className="bg-white p-8 rounded-3xl border-4 border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
                  <div>
                    <h3 className="text-2xl font-black italic uppercase text-slate-900">Reset KnockOut Pool</h3>
                    <p className="text-slate-500 font-medium">Completely wipes all KnockOut picks and statuses to restart the pool.</p>
                  </div>
                  {!showResetConfirm ? (
                    <button onClick={() => setShowResetConfirm(true)} className="px-10 py-4 bg-slate-900 text-[#FFB81C] rounded-2xl font-black italic uppercase flex items-center gap-3 shadow-lg">
                      <RefreshCw className="w-6 h-6" /> Reset KnockOut
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button onClick={() => setShowResetConfirm(false)} className="px-6 py-4 bg-white text-slate-700 rounded-2xl font-black border-2 border-slate-200">Cancel</button>
                      <button onClick={handleResetKnockout} className="px-6 py-4 bg-red-900 text-white rounded-2xl font-black shadow-xl animate-pulse">Confirm Reset</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODAL DIALOGS INSIDE MAINAPP */}
      <CloseWeekPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        onConfirmCloseWeek={handleFinalizeCloseWeek}
        selectedWeek={selectedWeek}
        games={games}
        allUsers={allUsers}
        globalSettings={globalSettings}
      />
      <WeeklyRecapModal
        isOpen={showWeeklyRecapModal}
        onClose={() => setShowWeeklyRecapModal(false)}
        week={resultsSelectedWeek || liveSeasonWeek}
        games={games}
        allUsers={allUsers}
        globalSettings={globalSettings}
      />
      {showPrintModal && (
        <PrintModal 
          user={currentUser} 
          week={selectedWeek} 
          games={games} 
          onClose={() => setShowPrintModal(false)} 
          bannerImg={imgErrors.logo ? null : "/hff-logo.png"} 
        />
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
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>React Render Crash</h2>
          <pre>{this.state.error && this.state.error.toString()}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <MainApp />
    </AppErrorBoundary>
  );
}