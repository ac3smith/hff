import React from 'react';
import { Trophy, CalendarDays, HeartPulse, Megaphone, AlertCircle } from 'lucide-react';
import { formatFullName } from '../utils/helpers';

export function DashboardTab({ 
  currentUser, globalSettings, selectedWeek, fullyPickedCount, 
  totalGames, hasTiebreaker, currentUserRank, knockoutStatus, setActiveTab 
}) {
    const isCompleteFanatics = fullyPickedCount === totalGames && totalGames > 0 && hasTiebreaker;
    const isKnockedOut = !['Alive', 'Winner', 'Waiting...'].includes(knockoutStatus);

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="bg-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-2xl border-b-8 border-[#FFB81C] relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-4xl sm:text-5xl font-black italic uppercase tracking-tighter">
                        Welcome, <span className="text-[#FFB81C]">{currentUser.firstName}!</span>
                    </h2>
                    <p className="text-slate-400 font-bold text-lg uppercase tracking-widest mt-2">HFF Portal Session</p>
                </div>
                {globalSettings?.announcement && (
                    <div className="relative z-10 bg-white/10 border border-white/20 p-5 rounded-2xl mt-8 backdrop-blur-sm">
                        <h4 className="flex items-center gap-2 font-black uppercase text-[#FFB81C] text-sm mb-2"><Megaphone className="w-4 h-4" /> Announcement</h4>
                        <p className="text-slate-200 font-medium">{globalSettings.announcement}</p>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center text-center">
                    <CalendarDays className="w-10 h-10 text-indigo-500 mb-3" />
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Confidence Pool</div>
                    <div className={`text-xl font-black italic mt-2 ${isCompleteFanatics ? 'text-green-600' : 'text-slate-900'}`}>
                        {isCompleteFanatics ? 'PICKS COMPLETE' : `${fullyPickedCount}/${totalGames} COMPLETED`}
                    </div>
                    <button onClick={() => setActiveTab('confidence')} className="mt-4 text-xs font-black uppercase text-indigo-500 hover:underline">Manage Picks →</button>
                </div>
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center text-center">
                    <HeartPulse className={`w-10 h-10 mb-3 ${isKnockedOut ? 'text-red-500' : 'text-green-500'}`} />
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Survivor Status</div>
                    <div className="text-xl font-black italic mt-2 uppercase">{knockoutStatus}</div>
                </div>
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col items-center text-center">
                    <Trophy className="w-10 h-10 text-[#FFB81C] mb-3" />
                    <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Season Rank</div>
                    <div className="text-4xl font-black italic text-slate-900 mt-1">#{currentUserRank}</div>
                </div>
            </div>
        </div>
    );
}

export function ParticipationAlert({ game }) {
    return (
        <div className="bg-[#FFB81C]/10 border-4 border-[#FFB81C] rounded-3xl p-8 text-center flex flex-col items-center mb-6">
            <AlertCircle className="w-12 h-12 text-[#FFB81C] mb-4" />
            <h3 className="text-2xl font-black italic uppercase text-slate-900">Entry Required</h3>
            <p className="text-slate-600 font-bold max-w-sm mt-2">You aren't registered for the {game} Pool. Contact the Admin to play!</p>
        </div>
    );
}

export function LoginView({ users, onLogin }) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const handleSubmit = (e) => {
        e.preventDefault();
        const u = users.find(x => x.username === username.toLowerCase() && x.password === password);
        if (u) onLogin(u.id);
        else alert("Invalid credentials.");
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
            <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl">
                <h2 className="text-2xl font-black italic uppercase text-center mb-8">Secure Portal Access</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <input type="text" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} className="w-full border-2 p-4 rounded-xl font-bold outline-none focus:border-slate-900" />
                    <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full border-2 p-4 rounded-xl font-bold outline-none focus:border-slate-900" />
                    <button type="submit" className="w-full bg-slate-900 text-[#FFB81C] p-5 rounded-xl font-black uppercase italic tracking-widest shadow-xl hover:scale-105 transition-all">Log In</button>
                </form>
            </div>
        </div>
    );
}