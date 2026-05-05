import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { updatePassword } from 'firebase/auth';
import { Shield, Loader2, X } from 'lucide-react';
import { logoBase64 } from '../assets/logoBase64';

export default function Header({ currentUser, onLogout, lastRefresh, onRefresh, isLoading }: any) {
  const [time, setTime] = useState(new Date());
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        setSuccess('Kata laluan berjaya dikemaskini!');
        setNewPassword('');
        setTimeout(() => setIsChangingPassword(false), 2000);
      }
    } catch (err: any) {
      console.error("Error updating password:", err);
      if (err.code === 'auth/requires-recent-login') {
        setError('Sila log keluar dan log masuk semula untuk menukar kata laluan anda (faktor keselamatan).');
      } else {
        setError(`Gagal mengemaskini kata laluan: ${err.message || err.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
  const dateStr = `${days[time.getDay()]}, ${time.getDate()} ${months[time.getMonth()]} ${time.getFullYear()}`;
  const timeStr = time.toLocaleTimeString('ms-MY');

  return (
    <>
      <header className="bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] px-4 md:px-8 h-18 flex items-center justify-between sticky top-0 z-40 shadow-lg border-b-4 border-yellow-400">
        <div className="flex items-center gap-4">
          <img 
            src={logoBase64} 
            alt="PDRM Logo" 
            className="w-12 h-12 object-contain drop-shadow-md"
          />
          <div className="flex flex-col">
            <div className="font-bold text-lg md:text-xl text-white tracking-wider leading-tight">SSPDRM MELAKA</div>
            <div className="text-[10px] md:text-xs text-white/70 tracking-widest uppercase hidden sm:block">Sistem Penugasan Anggota SSPDRM · Dashboard</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex flex-col items-end">
            <div className="font-bold text-[15px] leading-none text-yellow-400 mt-0.5">{dateStr}</div>
            <div className="text-xs text-white/60 leading-tight mt-0.5">{timeStr}</div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/10 border border-white/20 rounded-full px-3 py-1.5 hidden sm:flex">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="text-[13px] text-white font-medium">Live</div>
          </div>
          <div 
            onClick={() => setIsChangingPassword(true)}
            className="flex items-center gap-1.5 bg-white/15 border border-white/25 rounded-full px-3 py-1.5 cursor-pointer hover:bg-white/25 transition-colors"
            title="Tukar Kata Laluan"
          >
            <span>👤</span>
            <span className="text-[13px] text-white font-semibold uppercase">{currentUser?.username}</span>
          </div>
          <button 
            onClick={onLogout}
            className="bg-white/15 border border-white/30 text-white rounded-lg px-3 py-1.5 text-[13px] font-semibold hover:bg-white/25 transition-colors cursor-pointer"
          >
            Log Keluar
          </button>
        </div>
      </header>

      {isChangingPassword && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => setIsChangingPassword(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-[#003087]">
                <Shield size={20} />
              </div>
              <h3 className="font-bold text-lg text-slate-900">Tukar Kata Laluan</h3>
            </div>
            
            <p className="text-xs text-slate-500 mb-4">
              Sila masukkan kata laluan baru untuk akaun <strong>{currentUser?.username}</strong>.
            </p>

            {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-4 text-[11px] font-medium border border-red-100">{error}</div>}
            {success && <div className="bg-green-50 text-green-700 p-3 rounded-lg mb-4 text-[11px] font-medium border border-green-100">{success}</div>}
            
            <form onSubmit={handleUpdatePassword}>
              <input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border-2 border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#003087] mb-4"
                placeholder="Minimum 6 aksara"
                required
                minLength={6}
                autoFocus
              />
              
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsChangingPassword(false)}
                  className="flex-1 border-2 border-slate-200 text-slate-600 p-2.5 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  BATAL
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#003087] text-white p-2.5 rounded-lg text-sm font-bold hover:bg-blue-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'SIMPAN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
