import { useState, useEffect } from 'react';
import KpiCard from '../KpiCard';
import { db } from '../../firebase';
import { collection, getDocs, query, orderBy, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { Trash2, Loader2 } from 'lucide-react';

export default function LogTab({ currentUser, currentToken }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'logs'));
      const querySnapshot = await getDocs(q);
      const fetchedLogs: any[] = [];
      querySnapshot.forEach((doc) => {
        fetchedLogs.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort on client side
      fetchedLogs.sort((a, b) => {
        // Parse DD/MM/YYYY
        const parseDate = (dateStr: string, timeStr: string) => {
          if (!dateStr) return 0;
          const [day, month, year] = dateStr.split('/');
          const [hours, minutes] = (timeStr || '00:00').split(':');
          return new Date(
            parseInt(year), 
            parseInt(month) - 1, 
            parseInt(day), 
            parseInt(hours), 
            parseInt(minutes)
          ).getTime();
        };
        
        const timeA = parseDate(a.loginDate, a.loginTime);
        const timeB = parseDate(b.loginDate, b.loginTime);
        
        return timeB - timeA;
      });
      
      setLogs(fetchedLogs);
    } catch (e) {
      console.error("Error fetching logs:", e);
      setError('Gagal memuat log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [currentUser, currentToken]);

  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Adakah anda pasti mahu memadam log ini?')) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, 'logs', id));
      setLogs(logs.filter(l => l.id !== id));
    } catch (e) {
      console.error("Error deleting log:", e);
      alert('Gagal memadam log');
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteAllLogs = async () => {
    if (!window.confirm('Adakah anda pasti mahu memadam SEMUA log? Tindakan ini tidak boleh diundur.')) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      logs.forEach((l) => {
        batch.delete(doc(db, 'logs', l.id));
      });
      await batch.commit();
      setLogs([]);
    } catch (e) {
      console.error("Error deleting all logs:", e);
      alert('Gagal memadam semua log');
    } finally {
      setLoading(false);
    }
  };

  const n = new Date();
  const td = String(n.getDate()).padStart(2, '0') + '/' + String(n.getMonth() + 1).padStart(2, '0') + '/' + n.getFullYear();
  const todayLogs = logs.filter(l => l.loginDate === td).length;
  const uniqueUsers = new Set(logs.map(l => l.username)).size;
  const adminLogs = logs.filter(l => l.role === 'admin').length;

  const extractTime = (t: string) => {
    if (!t || t === '—') return '—';
    const m = String(t).match(/(\d{1,2}:\d{2}(?::\d{2})?)/);
    return m ? m[1] : t;
  };

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-[#003087] to-[#0a3fa8] rounded-2xl p-4 md:p-6 flex items-center justify-between mb-5 text-white shadow-md">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-3xl md:text-4xl">📋</div>
          <div>
            <div className="font-bold text-xl md:text-2xl text-yellow-400 tracking-wide">Log Masuk Pengguna</div>
            <div className="text-[13px] text-white/70 mt-0.5">Rekod semua aktiviti log masuk dan log keluar</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-4xl md:text-5xl text-yellow-400 leading-none">{logs.length}</div>
          <div className="text-xs text-white/70 mt-1">Jumlah sesi</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <KpiCard icon="👤" label="Jumlah Sesi" value={logs.length} sub="Semua masa" colorClass="bg-[#003087]" />
        <KpiCard icon="📅" label="Sesi Hari Ini" value={todayLogs} sub="Login hari ini" colorClass="bg-yellow-500" />
        <KpiCard icon="👮" label="Pengguna Unik" value={uniqueUsers} sub="Nama berbeza" colorClass="bg-green-600" />
        <KpiCard icon="🔑" label="Admin Login" value={adminLogs} sub="Sesi admin" colorClass="bg-red-600" />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-5">
        <div className="flex items-center gap-3">
          <div className="font-bold text-lg text-slate-900">Rekod Log Masuk</div>
          {logs.length > 0 && (
            <button 
              onClick={handleDeleteAllLogs}
              className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded border border-red-100 hover:bg-red-100 transition-colors flex items-center gap-1 font-bold"
            >
              <Trash2 size={12} /> PADAM SEMUA
            </button>
          )}
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-y-2 border-slate-200">
                <th className="p-2.5 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama Pengguna</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Peranan</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tab Diakses</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Tarikh Login</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Masa Login</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Masa Logout</th>
                <th className="p-2.5 px-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center p-8 text-slate-500">Memuatkan data...</td></tr>
              ) : error ? (
                <tr><td colSpan={8} className="text-center p-8 text-red-500">{error}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="text-center p-8 text-slate-500">Tiada rekod log</td></tr>
              ) : (
                logs.map((l, i) => (
                  <tr key={l.id} className="border-b border-slate-200 hover:bg-slate-50">
                    <td className="p-2.5 px-3 text-center text-slate-500 text-[11px]">{i + 1}</td>
                    <td className="p-2.5 px-2.5 font-bold">{l.username}</td>
                    <td className="p-2.5 px-2.5">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${l.role === 'admin' ? 'bg-pink-100 text-pink-800' : 'bg-blue-100 text-blue-800'}`}>
                        {l.role === 'admin' ? 'Admin' : 'Daerah'}
                      </span>
                    </td>
                    <td className="p-2.5 px-2.5">{l.tab}</td>
                    <td className="p-2.5 px-2.5">{l.loginDate}</td>
                    <td className="p-2.5 px-2.5 font-bold">{extractTime(l.loginTime)}</td>
                    <td className="p-2.5 px-2.5">{extractTime(l.logoutTime)}</td>
                    <td className="p-2.5 px-2.5 text-center">
                      <button 
                        onClick={() => handleDeleteLog(l.id)}
                        disabled={deleting === l.id}
                        className="text-red-400 hover:text-red-600 p-1 transition-colors disabled:opacity-50"
                      >
                        {deleting === l.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
