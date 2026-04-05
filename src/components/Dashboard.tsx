import React, { useState, useEffect, useMemo } from 'react';
import { DAERAH_MAP } from '../lib/constants';
import { expandRows, normaliseDate } from '../lib/utils';
import Header from './Header';
import Tabs from './Tabs';
import SemuaDaerahTab from './tabs/SemuaDaerahTab';
import DistrictTab from './tabs/DistrictTab';
import LogTab from './tabs/LogTab';
import CarianTab from './tabs/CarianTab';
import RosterTab from './tabs/RosterTab';
import AdminTab from './tabs/AdminTab';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseUtils';
import Papa from 'papaparse';
import { Lock, ShieldCheck, Loader2 } from 'lucide-react';

export default function Dashboard({ currentUser, currentToken, onLogout }: any) {
  const [activeTab, setActiveTab] = useState('today');
  const [selectedDate, setSelectedDate] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  });
  const [allData, setAllData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastRefresh, setLastRefresh] = useState('');
  
  const [isCarianUnlocked, setIsCarianUnlocked] = useState(false);
  const [isRosterUnlocked, setIsRosterUnlocked] = useState(false);
  const [isSenaraiUnlocked, setIsSenaraiUnlocked] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [systemPasscode, setSystemPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.username === 'admin_emergency' || currentUser?.username === 'admin';
  const isSuperAdmin = isAdmin;

  const allowedDistricts = useMemo(() => {
    if (isAdmin) {
      return ['today', 'd1', 'd2', 'd3', 'd4', 'log', 'carian', 'roster', 'admin'];
    }
    
    const d = (currentUser?.district || '').trim().toLowerCase();
    
    if (d === 'all') {
      const tabs = ['today', 'd1', 'd2', 'd3', 'd4'];
      if (currentUser?.canSearch) {
        tabs.push('carian');
      }
      if (currentUser?.canAccessRoster) {
        tabs.push('roster');
      }
      return tabs;
    }
    
    const allowed = d.split('/').map((x: string) => x.trim()).filter((x: string) => ['d1', 'd2', 'd3', 'd4'].includes(x));
    
    const tabs = [...allowed];
    if (currentUser?.canSearch) {
      tabs.push('carian');
    }
    if (currentUser?.canAccessRoster) {
      tabs.push('roster');
    }
    
    // If user has specific districts, they should also see the 'today' tab 
    // but only filtered for their districts? 
    // Actually, the user wants 'Semua Daerah' to see everything.
    // If they have specific districts, they should probably see 'today' but it might be confusing if it shows everything.
    // Let's keep it simple: if they have 'all', they see everything.
    // If they have specific districts, they see those districts.
    
    return tabs.length > 0 ? tabs : ['today']; 
  }, [currentUser, isAdmin, isSuperAdmin]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const configDoc = await getDoc(doc(db, 'config', 'system'));
        if (configDoc.exists()) {
          setSystemPasscode(configDoc.data().passcode || '123456');
        }
      } catch (e) {
        handleFirestoreError(e, OperationType.GET, 'config/system');
      }
    };
    fetchConfig();
  }, []);

  useEffect(() => {
    if (!allowedDistricts.includes(activeTab)) {
      setActiveTab(allowedDistricts[0]);
    }
    // Reset unlock state when switching to non-locked tabs if needed
    // But usually we want to keep it unlocked for the session
  }, [allowedDistricts, activeTab]);

  const needsUnlock = useMemo(() => {
    if (isAdmin) return false; // All admins bypass passcode
    
    // Carian and Roster tabs need full unlock at dashboard level
    if (activeTab === 'carian') return !isCarianUnlocked;
    if (activeTab === 'roster') return !isRosterUnlocked;
    
    return false;
  }, [activeTab, isAdmin, isCarianUnlocked, isRosterUnlocked]);

  const handleUnlockCarian = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredPasscode = currentUser?.carianPassword || systemPasscode;
    if (passcodeInput === requiredPasscode) {
      setIsCarianUnlocked(true);
      setPasscodeError(false);
      setPasscodeInput('');
    } else {
      setPasscodeError(true);
      setPasscodeInput('');
    }
  };

  const handleUnlockRoster = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredPasscode = currentUser?.rosterPassword || systemPasscode;
    if (passcodeInput === requiredPasscode) {
      setIsRosterUnlocked(true);
      setPasscodeError(false);
      setPasscodeInput('');
    } else {
      setPasscodeError(true);
      setPasscodeInput('');
    }
  };

  const handleUnlockSenarai = (e: React.FormEvent) => {
    e.preventDefault();
    const requiredPasscode = currentUser?.senaraiPassword || systemPasscode;
    if (passcodeInput === requiredPasscode) {
      setIsSenaraiUnlocked(true);
      setPasscodeError(false);
      setPasscodeInput('');
    } else {
      setPasscodeError(true);
      setPasscodeInput('');
    }
  };

  useEffect(() => {
    setLoading(true);
    setError('');
    
    const fetchSheetData = async () => {
      try {
        const sheetUrl = import.meta.env.VITE_GOOGLE_SHEET_URL;
        if (!sheetUrl) {
          throw new Error('Pautan Google Sheet tidak dijumpai. Sila pastikan anda telah menetapkan VITE_GOOGLE_SHEET_URL di dalam "Secrets" (Settings > Secrets) dan mulakan semula pelayan.');
        }

        const response = await fetch(sheetUrl);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        let rows: any[] = [];
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          rows = Array.isArray(data) ? data : (data.data || []);
        } else {
          const text = await response.text();
          const parsed = Papa.parse(text, { skipEmptyLines: true });
          rows = parsed.data as any[];
          // Remove header row if it exists
          if (rows.length > 0 && isNaN(Date.parse(rows[0][0])) && !String(rows[0][0]).includes('/')) {
            rows.shift();
          }
        }

        const expanded = expandRows(rows);
        setAllData(expanded);
        setLastRefresh(new Date().toLocaleTimeString('ms-MY'));
        setError(''); // Clear error on success
      } catch (err: any) {
        console.error("Error fetching sheet data:", err);
        if (err.message.includes('500')) {
          setError(`❌ Ralat Pelayan (500): Terdapat masalah pada pautan Google Sheet atau Apps Script anda. Sila pastikan ia telah "Publish to the web" sebagai CSV.`);
        } else {
          setError(`❌ Ralat memuatkan data: ${err.message || 'Sila cuba lagi.'}`);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSheetData();
    const interval = setInterval(fetchSheetData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [selectedDate]);

  const currentDateData = useMemo(() => {
    const p = selectedDate.split('-');
    const selStr = `${parseInt(p[2])}/${parseInt(p[1])}/${p[0]}`;
    return allData.filter(r => normaliseDate(r.tarikh) === selStr);
  }, [allData, selectedDate]);

  const getSelectedDateFull = () => {
    const p = selectedDate.split('-');
    const d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
    const days = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans text-[13px] print:bg-white">
      <div className="print:hidden">
        <Header currentUser={currentUser} onLogout={onLogout} lastRefresh={lastRefresh} />
        <Tabs 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          allowedDistricts={allowedDistricts} 
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
        />
      </div>
      
      <main className="p-4 md:p-6 lg:p-8 max-w-[1400px] mx-auto print:p-0 print:m-0 print:max-w-none">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-6 shadow-sm animate-in slide-in-from-top duration-300">
            <div className="flex items-start gap-3">
              <div className="text-xl">⚠️</div>
              <div className="flex-1">
                <div className="font-bold text-sm mb-1">Ralat Memuatkan Data</div>
                <div className="text-xs leading-relaxed opacity-90">{error}</div>
                <div className="mt-3 flex gap-2">
                  <button 
                    onClick={() => window.location.reload()} 
                    className="text-[11px] bg-red-600 text-white px-3 py-1.5 rounded font-bold hover:bg-red-700 transition-colors uppercase tracking-wider"
                  >
                    Muat Semula Halaman
                  </button>
                  {isSuperAdmin && (
                    <button 
                      onClick={() => setActiveTab('admin')} 
                      className="text-[11px] bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded font-bold hover:bg-red-50 transition-colors uppercase tracking-wider"
                    >
                      Semak Tetapan
                    </button>
                  )}
                </div>
              </div>
            </div>
            {error.includes('500') && (
              <div className="mt-4 pt-3 border-t border-red-100 text-[11px] italic opacity-80">
                Nota: Ralat 500 biasanya bermaksud pautan Google Sheet anda tidak sah atau belum di-"Publish to the web" sebagai CSV.
              </div>
            )}
          </div>
        )}
        
        {loading && !error && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 mb-6 flex items-center gap-3 animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin" />
            <div className="text-sm font-medium">Sedang memuatkan data terkini dari Google Sheet...</div>
          </div>
        )}

        {needsUnlock ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border-2 border-dashed border-slate-200 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
              <Lock size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-1">Kandungan Dikunci</h2>
            <p className="text-slate-500 text-sm mb-6">Sila masukkan passcode sistem untuk melihat maklumat ini.</p>
            
            <form onSubmit={activeTab === 'carian' ? handleUnlockCarian : handleUnlockRoster} className="flex flex-col items-center gap-3 w-full max-w-xs">
              <input 
                type="password" 
                placeholder="Masukkan passcode..."
                value={passcodeInput}
                onChange={e => setPasscodeInput(e.target.value)}
                className={`w-full border-2 rounded-lg p-3 text-center text-lg font-bold tracking-widest outline-none transition-all ${
                  passcodeError ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-[#003087]'
                }`}
                autoFocus
              />
              {passcodeError && <p className="text-red-500 text-xs font-bold uppercase tracking-tighter">❌ Passcode Salah</p>}
              <button 
                type="submit"
                className="w-full bg-[#003087] text-white p-3 rounded-lg font-bold hover:bg-blue-800 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck size={18} />
                BUKA KUNCI
              </button>
            </form>
          </div>
        ) : (
          <>
            {activeTab === 'today' && <SemuaDaerahTab data={currentDateData} dateStr={getSelectedDateFull()} loading={loading} />}
            {['d1', 'd2', 'd3', 'd4'].includes(activeTab) && (
              <DistrictTab 
                districtKey={activeTab} 
                data={currentDateData.filter(r => r.daerah === DAERAH_MAP[activeTab])} 
                dateStr={getSelectedDateFull()} 
                loading={loading}
                isUnlocked={isSenaraiUnlocked || isAdmin}
                onUnlock={handleUnlockSenarai}
                passcodeInput={passcodeInput}
                setPasscodeInput={setPasscodeInput}
                passcodeError={passcodeError}
              />
            )}
            {activeTab === 'log' && <LogTab currentUser={currentUser} currentToken={currentToken} />}
            {activeTab === 'carian' && (
              <CarianTab 
                currentUser={currentUser} 
                currentToken={currentToken} 
                isFullAdmin={isAdmin}
              />
            )}
            {activeTab === 'roster' && (
              <RosterTab 
                currentUser={currentUser} 
                isFullAdmin={isAdmin}
              />
            )}
            {activeTab === 'admin' && (
              <AdminTab />
            )}
          </>
        )}
      </main>

      <footer className="text-center p-5 text-xs text-slate-500 border-t border-slate-200 mt-2 leading-relaxed print:hidden">
        Polis Diraja Malaysia &nbsp;·&nbsp; SSPDRM Melaka &nbsp;·&nbsp; Sistem Penugasan Anggota SSPDRM
        &nbsp;·&nbsp; <span>Terakhir dikemaskini: {lastRefresh || '—'}</span>
        &nbsp;·&nbsp; <span className="text-slate-400">Live (Real-time)</span>
      </footer>
    </div>
  );
}
