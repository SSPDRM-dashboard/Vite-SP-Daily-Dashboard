import React, { useState, useEffect, useMemo } from 'react';
import { normaliseDate, expandRows, normDaerah } from '../../lib/utils';
import { GOOGLE_SHEET_URL } from '../../lib/constants';
import Papa from 'papaparse';

export default function JadualTugasTab({ currentUser, isFullAdmin }: any) {
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [daerahFilter, setDaerahFilter] = useState('Semua Daerah');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowUsers, setSelectedRowUsers] = useState<string[]>(Array(10).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allData, setAllData] = useState<any[]>([]);
  const [hasAutoSelectedMonth, setHasAutoSelectedMonth] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + 1 - i);
  const months = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

  const dName: Record<string, string> = { d1: 'MELAKA TENGAH', d2: 'JASIN', d3: 'ALOR GAJAH', d4: 'IPK SSPDRM' };

  const allowedDaerahsList = useMemo(() => {
    if (isFullAdmin) return ['Semua Daerah', 'MELAKA TENGAH', 'JASIN', 'ALOR GAJAH', 'IPK SSPDRM'];
    if (!currentUser?.district) return [];
    
    const userDistricts = String(currentUser.district).toLowerCase().split('/')
      .map(d => d.trim())
      .filter(d => dName[d]);
    
    const allowed = userDistricts.map(d => dName[d]);
    if (allowed.length > 1) {
      return ['Semua Daerah', ...allowed];
    }
    return allowed;
  }, [isFullAdmin, currentUser]);

  useEffect(() => {
    if (allowedDaerahsList.length > 0 && !allowedDaerahsList.includes(daerahFilter)) {
      setDaerahFilter(allowedDaerahsList[0]);
    }
  }, [allowedDaerahsList, daerahFilter]);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [bulan, tahun, daerahFilter]);

  // Auto-select the most recent month with data on initial load
  useEffect(() => {
    if (allData.length > 0 && !hasAutoSelectedMonth) {
      // Find the most recent date in the data
      let latestDate = new Date(0);
      let foundValidDate = false;
      
      allData.forEach(r => {
        if (r.tarikh) {
          const parts = r.tarikh.split('/');
          if (parts.length === 3) {
            const d = parseInt(parts[0]);
            const m = parseInt(parts[1]) - 1;
            const y = parseInt(parts[2]);
            const dateObj = new Date(y, m, d);
            if (!isNaN(dateObj.getTime()) && dateObj > latestDate) {
               latestDate = dateObj;
               foundValidDate = true;
            }
          }
        }
      });

      if (foundValidDate) {
        setBulan(latestDate.getMonth() + 1);
        setTahun(latestDate.getFullYear());
      }
      setHasAutoSelectedMonth(true);
    }
  }, [allData, hasAutoSelectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (!GOOGLE_SHEET_URL) {
        throw new Error('Pautan Google Sheet tidak dijumpai. Sila pastikan anda telah menetapkan GOOGLE_SHEET_URL di dalam "src/lib/constants.ts".');
      }

      const response = await fetch(GOOGLE_SHEET_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let rawRows: any[] = [];
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        rawRows = Array.isArray(data) ? data : (data.data || []);
      } else {
        const text = await response.text();
        const parsed = Papa.parse(text, { skipEmptyLines: true });
        rawRows = parsed.data as any[];
        if (rawRows.length > 0 && isNaN(Date.parse(rawRows[0][0])) && !String(rawRows[0][0]).includes('/')) {
          rawRows.shift();
        }
      }

      const expanded = expandRows(rawRows);
      setAllData(expanded);
    } catch (e) {
      console.error("Error fetching data:", e);
      setError('❌ Ralat rangkaian. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    let filtered = allData.filter(r => {
      const tarikh = r.tarikh;
      if (tarikh) {
        const parts = tarikh.split('/');
        if (parts.length === 3) {
          const m = parseInt(parts[1]);
          const y = parseInt(parts[2]);
          return m === bulan && y === tahun;
        }
      }
      return false;
    });

    if (daerahFilter !== 'Semua Daerah') {
      filtered = filtered.filter(r => normDaerah(r.daerah) === daerahFilter);
    } else if (!isFullAdmin) {
      // If 'Semua Daerah' is selected but user is not admin, filter by their allowed districts
      const allowed = allowedDaerahsList.filter(d => d !== 'Semua Daerah');
      if (allowed.length > 0) {
        filtered = filtered.filter(r => allowed.includes(normDaerah(r.daerah)));
      } else {
        filtered = [];
      }
    }

    return filtered;
  }, [allData, bulan, tahun, daerahFilter, isFullAdmin, allowedDaerahsList]);

  const rosterData = useMemo(() => {
    const map: Record<string, any> = {};
    filteredData.forEach(r => {
      const nb = String(r.noBadan || '').trim() || String(r.nama || '').trim();
      if (!nb) return;
      
      if (!map[nb]) {
        map[nb] = {
          noBadan: String(r.noBadan || '').trim() || '-',
          nama: r.nama || '',
          pangkat: r.pangkat || '',
          days: {}
        };
      }
      
      const tarikh = r.tarikh;
      if (tarikh) {
        const parts = tarikh.split('/');
        if (parts.length === 3) {
          const day = parseInt(parts[0]);
          let finalJenis = r.jenis || '';
          if (finalJenis.toUpperCase().includes('LAIN-LAIN TUGAS') && r.lain) {
            finalJenis = r.lain;
          }

          map[nb].days[day] = {
            jenis: finalJenis,
            masa: r.masa || '',
            masaTamat: r.masaTamat || '',
            jam: r.jam || ''
          };
        }
      }
    });

    return Object.values(map).sort((a: any, b: any) => a.noBadan.localeCompare(b.noBadan));
  }, [filteredData]);

  const activeDaysArray = useMemo(() => {
    const active = new Set<number>();
    rosterData.forEach(user => {
      Object.keys(user.days).forEach(dayStr => {
        active.add(parseInt(dayStr, 10));
      });
    });
    return Array.from(active).sort((a, b) => a - b);
  }, [rosterData]);

  const getDayOfWeek = (day: number) => {
    return new Date(tahun, bulan - 1, day).getDay();
  };

  const isWeekend = (day: number) => {
    const dow = getDayOfWeek(day);
    return dow === 0 || dow === 6; // Sunday or Saturday
  };

  // Pagination logic
  const itemsPerPage = 10;
  const totalPages = Math.ceil(rosterData.length / itemsPerPage) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return rosterData.slice(start, start + itemsPerPage);
  }, [rosterData, currentPage]);

  // Sync paginated data to selected row users
  useEffect(() => {
    const newSelected = Array(10).fill('');
    paginatedData.forEach((u, i) => {
      newSelected[i] = u.noBadan;
    });
    setSelectedRowUsers(newSelected);
  }, [paginatedData]);

  // Make more space by dividing up available width roughly among active days
  // Standard wide layout
  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] rounded-2xl p-4 md:p-6 flex items-center justify-between mb-5 text-white shadow-md print:hidden">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-3xl md:text-4xl">📅</div>
          <div>
            <div className="font-bold text-xl md:text-2xl text-white tracking-wide">Jadual Tugas</div>
            <div className="text-[13px] text-white/80 mt-0.5">Jadual tugas dengan tarikh yang aktif sahaja</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 px-6 mb-5 shadow-sm print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">🏢 Daerah</label>
            <select 
              className="border-2 border-slate-200 rounded-lg p-2 px-2.5 text-sm outline-none bg-white cursor-pointer focus:border-[#003087] w-full"
              value={daerahFilter}
              onChange={e => {
                setDaerahFilter(e.target.value);
              }}
            >
              {allowedDaerahsList.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">📅 Bulan</label>
            <select 
              className="border-2 border-slate-200 rounded-lg p-2 px-2.5 text-sm outline-none bg-white cursor-pointer focus:border-[#003087] w-full"
              value={bulan}
              onChange={e => setBulan(parseInt(e.target.value))}
            >
              {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">📅 Tahun</label>
            <select 
              className="border-2 border-slate-200 rounded-lg p-2 px-2.5 text-sm outline-none bg-white cursor-pointer focus:border-[#003087] w-full"
              value={tahun}
              onChange={e => setTahun(parseInt(e.target.value))}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <button 
              onClick={fetchData}
              disabled={loading}
              className="w-full bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] text-white border-none rounded-lg p-2.5 px-7 text-sm font-bold cursor-pointer flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-70"
            >
              {loading ? '⏳ Memuatkan...' : '🔄 Segar Semula'}
            </button>
          </div>
          <div>
            <button 
              onClick={() => window.print()}
              disabled={loading || rosterData.length === 0}
              className="w-full bg-green-600 text-white border-none rounded-lg p-2.5 px-7 text-sm font-bold cursor-pointer flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-70"
            >
              🖨️ Cetak
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-center p-12 text-slate-500">
          <div className="text-4xl mb-3">⚠️</div>
          <div className="font-semibold text-red-600">{error}</div>
        </div>
      )}

      {loading && !error && (
        <div className="text-center p-12 text-slate-500">
          <div className="text-4xl mb-3 animate-spin">⏳</div>
          <div className="font-semibold">Sedang memuatkan data roster...</div>
        </div>
      )}

      {!loading && !error && rosterData.length === 0 && (
        <div className="text-center p-12 text-slate-500">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-[15px]">Tiada rekod penugasan untuk bulan {months[bulan - 1]} {tahun}.</div>
        </div>
      )}

      {!loading && !error && rosterData.length > 0 && (
        <div className="bg-white border border-slate-200 shadow-sm overflow-x-auto print:border-none print:shadow-none print:overflow-visible">
          <style type="text/css" media="print">
            {`
              @page { size: A4 landscape; margin: 5mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-container {
                page-break-inside: avoid;
                transform: scale(0.95);
                transform-origin: top left;
                width: 105%;
              }
            `}
          </style>
          <div className="min-w-[1000px] text-black font-sans text-xs print-container">
            <div className="text-center font-bold text-base mb-4 mt-2">
              PASUKAN SUKARELAWAN SIMPANAN POLIS<br/>
              JADUAL PENUGASAN PEGAWAI DAN ANGGOTA {months[bulan - 1].toUpperCase()} {tahun}<br/>
              {daerahFilter !== 'Semua Daerah' ? daerahFilter : 'SEMUA DAERAH'}
            </div>
            <table className="w-full border-collapse border border-black text-[10px] text-center table-fixed">
              <thead>
                <tr>
                  <th className="border border-black p-1 w-8" rowSpan={2}>Bil</th>
                  <th className="border border-black p-1 w-16" rowSpan={2}>NO BADAN</th>
                  <th className="border border-black p-1 w-48" rowSpan={2}>NAMA</th>
                  <th className="border border-black p-1" colSpan={activeDaysArray.length}>JUMLAH BERTUGAS PADA TARIKH TERSEBUT</th>
                </tr>
                <tr>
                  {activeDaysArray.map(day => (
                    <th 
                      key={day} 
                      className={`border border-black p-1 ${isWeekend(day) ? 'bg-blue-300' : ''}`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 10 }).map((_, idx) => {
                  if (idx > 0 && !selectedRowUsers[idx - 1]) return null;

                  const actualIdx = (currentPage - 1) * itemsPerPage + idx + 1;
                  const selectedNoBadan = selectedRowUsers[idx];
                  const user = rosterData.find(u => u.noBadan === selectedNoBadan) || { noBadan: '', nama: '', pangkat: '', days: {} };
                  
                  return (
                  <React.Fragment key={`row-${idx}`}>
                    {/* Upper row: Penugasan */}
                    <tr>
                      <td className="border border-black p-1 font-bold" rowSpan={2}>
                        <div className="flex flex-col items-center justify-center gap-1">
                          <span>{actualIdx}</span>
                          {selectedNoBadan && (
                            <button 
                              onClick={() => {
                                const newSelected = [...selectedRowUsers];
                                newSelected.splice(idx, 1);
                                newSelected.push('');
                                setSelectedRowUsers(newSelected);
                              }}
                              className="text-red-500 hover:text-red-700 print:hidden"
                              title="Padam"
                            >
                              ❌
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="border border-black p-1 font-bold" rowSpan={2}>
                        <select 
                          className="w-full bg-transparent outline-none text-center font-bold text-[9px] cursor-pointer print:appearance-none"
                          value={selectedNoBadan}
                          onChange={(e) => {
                            const newSelected = [...selectedRowUsers];
                            newSelected[idx] = e.target.value;
                            setSelectedRowUsers(newSelected);
                          }}
                        >
                          <option value=""></option>
                          {rosterData
                            .filter(u => u.noBadan === selectedNoBadan || !selectedRowUsers.includes(u.noBadan))
                            .map(u => (
                            <option key={u.noBadan} value={u.noBadan}>{u.noBadan}</option>
                          ))}
                        </select>
                      </td>
                      <td className="border border-black p-1 font-bold text-left px-2" rowSpan={2}>
                        <div className="line-clamp-3 text-[10px] leading-tight break-words whitespace-normal">
                          {user.pangkat} {user.nama.replace(/\d+/g, '').trim()}
                        </div>
                      </td>
                      {activeDaysArray.map(day => {
                        const dayData = user.days[day];
                        return (
                          <td 
                            key={`jenis-${day}`} 
                            className={`border border-black p-1 text-[9px] leading-[1.2] font-bold ${isWeekend(day) ? 'bg-blue-300' : ''}`}
                          >
                            <div className="break-all whitespace-normal">{dayData?.jenis ? dayData.jenis.toUpperCase() : ''}</div>
                          </td>
                        );
                      })}
                    </tr>
                    {/* Lower row: Masa */}
                    <tr>
                      {activeDaysArray.map(day => {
                        const dayData = user.days[day];
                        return (
                          <td 
                            key={`masa-${day}`} 
                            className={`border border-black p-1 text-[8px] leading-[1.2] font-bold ${isWeekend(day) ? 'bg-blue-300' : ''}`}
                          >
                            <div className="whitespace-normal">
                              {dayData?.masa && dayData?.masaTamat && dayData.masaTamat !== '—' ? (
                                <>
                                  <div>{dayData.masa} -</div>
                                  <div>{dayData.masaTamat}</div>
                                </>
                              ) : (
                                <div>{dayData?.masa || ''}</div>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </React.Fragment>
                )})}
              </tbody>
            </table>
            
            <div className="mt-4 text-[10px] font-bold text-left px-2">
              1. DISIPLIN SOP SSPDRM HENDAKLAH DIJAGA SEMASA MENJALANKAN TUGAS HARIAN<br/>
              2. KESELAMATAN PEGAWAI DAN ANGGOTA YANG BERTUGAS PERLU DIUTAMAKAN<br/>
              3. ANGGOTA FITIK HENDAKLAH MEMASTIKAN KEBERSIHAN SEKITAR PEJABAT SSPDRM DALAM KEADAAN BERSIH DAN SELAMAT
            </div>
            
            <div className="mt-12 text-right pr-24 text-[10px] font-bold">
              TANDATANGAN PELULUS<br/>
              <br/><br/><br/>
              ___________________________
            </div>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && rosterData.length > 0 && (
        <div className="flex items-center justify-between mt-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm print:hidden">
          <div className="text-sm text-slate-500 font-semibold">
            Memaparkan {((currentPage - 1) * itemsPerPage) + 1} hingga {Math.min(currentPage * itemsPerPage, rosterData.length)} daripada {rosterData.length} anggota
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-slate-700 transition-colors"
            >
              Sebelumnya
            </button>
            <div className="flex items-center px-4 font-bold text-sm text-[#003087]">
              Muka {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-bold text-slate-700 transition-colors"
            >
              Seterusnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
