import { useState } from 'react';
import { normaliseDate, expandRows, normDaerah } from '../../lib/utils';
import { GOOGLE_SHEET_URL } from '../../lib/constants';
import Papa from 'papaparse';

export default function CarianTab({ currentUser, currentToken, isFullAdmin }: any) {
  const [noBadan, setNoBadan] = useState('');
  const [bulan, setBulan] = useState(new Date().getMonth() + 1);
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [multipleResults, setMultipleResults] = useState<{ id: string, nama: string, pangkat: string, noBadan: string, rows: any[] }[] | null>(null);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + 1 - i);
  const months = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

  const doSearch = async () => {
    const searchNoBadan = noBadan.trim();
    if (!searchNoBadan) {
      setError('⚠️ Sila masukkan nombor badan anggota atau nama');
      setResult(null);
      setMultipleResults(null);
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setMultipleResults(null);

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

      const allData = expandRows(rawRows);
      const searchStr = searchNoBadan.toUpperCase();
      
      const filteredBySearch = allData.filter(r => {
        // Search by noBadan, nama, or the combined rowSearchText (partial or full, case-insensitive)
        const nama = String(r.nama || '').toUpperCase();
        const noBadanStr = String(r.noBadan || '').toUpperCase();
        const rowSearchText = String(r.rowSearchText || '').toUpperCase();
        
        const matchSearch = nama.includes(searchStr) || 
                           noBadanStr.includes(searchStr) || 
                           rowSearchText.includes(searchStr);
        
        if (!matchSearch) return false;

        // Filter by month/year
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

      if (filteredBySearch.length === 0) {
        setError(`❌ Tiada rekod ditemui untuk "${noBadan}" bagi ${months[bulan - 1]} ${tahun}.`);
      } else {
        // Filter by unlocked district if not full admin
        let filteredRows = filteredBySearch;
        if (!isFullAdmin && currentUser?.district) {
          const dName: Record<string, string> = { d1: 'MELAKA TENGAH', d2: 'JASIN', d3: 'ALOR GAJAH', d4: 'IPK SSPDRM' };
          
          const userDistricts = String(currentUser.district).toLowerCase().split('/')
            .map(d => d.trim())
            .filter(d => dName[d]);
          
          const allowedDaerahs = userDistricts.map(d => dName[d]);
          
          if (allowedDaerahs.length > 0) {
            filteredRows = filteredBySearch.filter((r: any) => {
              const rowDaerah = normDaerah(r.daerah);
              return allowedDaerahs.includes(rowDaerah);
            });
          } else {
            filteredRows = []; 
          }
        } else if (!isFullAdmin) {
          filteredRows = []; 
        }

        if (filteredRows.length === 0) {
          setError(`❌ Tiada rekod ditemui untuk "${noBadan}" dalam daerah anda bagi ${months[bulan - 1]} ${tahun}.`);
        } else {
          // Group by unique person (No. Badan or Name)
          const groupedData: Record<string, any[]> = {};
          filteredRows.forEach((r: any) => {
            const rawFoundNama = String(r.nama || '');
            const cleanNama = rawFoundNama.replace(/[0-9()]/g, '').trim();
            const foundNoBadan = String(r.noBadan || '').trim() || rawFoundNama.match(/([A-Z0-9/]{2,10}\d{3,7}|\b\d{4,7}\b)/i)?.[0] || '';
            
            const key = foundNoBadan ? foundNoBadan : cleanNama;
            if (!groupedData[key]) groupedData[key] = [];
            groupedData[key].push(r);
          });
          
          const distinctKeys = Object.keys(groupedData);
          
          if (distinctKeys.length > 1) {
            // We have multiple people!
            const options = distinctKeys.map(k => {
              const firstRow = groupedData[k][0];
              const rawRowNama = String(firstRow.nama || '');
              return {
                id: k,
                nama: rawRowNama.replace(/[0-9()]/g, '').trim() || k,
                pangkat: firstRow.pangkat || '',
                noBadan: String(firstRow.noBadan || '').trim() || rawRowNama.match(/([A-Z0-9/]{2,10}\d{3,7}|\b\d{4,7}\b)/i)?.[0] || k,
                rows: groupedData[k]
              };
            });
            setMultipleResults(options);
          } else {
            // Only 1 person found, load directly
            await loadProfileAndSetResult(groupedData[distinctKeys[0]], searchNoBadan);
          }
        }
      }
    } catch (e) {
      console.error("Error searching:", e);
      setError('❌ Ralat rangkaian. Sila cuba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const loadProfileAndSetResult = async (userRows: any[], originalSearchText: string) => {
    setLoading(true);
    try {
      const firstRow = userRows[0];
      const rawFoundNama = String(firstRow.nama || '');
      const foundNoBadan = String(firstRow.noBadan || '').trim() || rawFoundNama.match(/([A-Z0-9/]{2,10}\d{3,7}|\b\d{4,7}\b)/i)?.[0] || '';
      
      let actualSearchNoBadan = originalSearchText;
      if (foundNoBadan) {
        actualSearchNoBadan = foundNoBadan;
        const numMatch = foundNoBadan.match(/\b\d+\b/);
        if (numMatch) {
          actualSearchNoBadan = numMatch[0];
        }
      } else {
        const numMatch = originalSearchText.match(/\b\d+\b/);
        if (numMatch) {
          actualSearchNoBadan = numMatch[0];
        }
      }

      // Fetch SD CSV
      let sdMap: Record<string, any> = {};
      try {
        const sdUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSF_znGU2n1ZszDgqtgsSe2VNVq9jYtQ4PjH1XUCJhUJafbhWKx_sWd_1NarbFlmW10qHs6wa-4h4qZ/pub?gid=1807711765&single=true&output=csv';
        const sdResponse = await fetch(sdUrl);
        if (sdResponse.ok) {
          const sdText = await sdResponse.text();
          const sdParsed = Papa.parse(sdText, { skipEmptyLines: true });
          const sdRows = sdParsed.data as any[];
          if (sdRows.length > 0) sdRows.shift(); 

          for (const row of sdRows) {
            const match = [3, 5, 7, 9].some(idx => {
              const cellStr = String(row[idx] || '').trim().toUpperCase();
              if (!cellStr) return false;
              const cellNumMatch = cellStr.match(/\b\d+\b/g);
              if (cellNumMatch) {
                return cellNumMatch.some(n => n === actualSearchNoBadan);
              }
              return cellStr.includes(actualSearchNoBadan.toUpperCase());
            });
            
            if (match) {
              for (let i = 0; i < 6; i++) {
                const tIdx = 10 + i * 3;
                const mIdx = 11 + i * 3;
                const kIdx = 12 + i * 3;
                let tarikh = String(row[tIdx] || '').trim();
                if (tarikh) {
                  tarikh = normaliseDate(tarikh);
                  let masuk = String(row[mIdx] || '').trim();
                  let keluar = String(row[kIdx] || '').trim();
                  if (/^\d+$/.test(masuk)) masuk = masuk.padStart(4, '0');
                  if (/^\d+$/.test(keluar)) keluar = keluar.padStart(4, '0');
                  sdMap[tarikh] = { masuk, keluar };
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error fetching SD data:", err);
      }

      // Fetch Bank/IC Info
      let bankInfo = { ic: '', bankName: '', bankAccount: '' };
      try {
        const bankUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRk4XOvTBYKRNQn07ca_x6dGIqc6do04w28q9Okzcr2VdFv3UZl5q-_awQ88HhFp1Glm8yWhIKA-3Hp/pub?gid=761351772&single=true&output=csv';
        const bankResponse = await fetch(bankUrl);
        if (bankResponse.ok) {
          const bankText = await bankResponse.text();
          const bankParsed = Papa.parse(bankText, { skipEmptyLines: true });
          const bankRows = bankParsed.data as any[];
          if (bankRows.length > 0) bankRows.shift();

          for (const row of bankRows) {
            const match = [3, 5, 7, 9].some(idx => {
              const cellStr = String(row[idx] || '').trim().toUpperCase();
              if (!cellStr) return false;
              const cellNumMatch = cellStr.match(/\b\d+\b/g);
              if (cellNumMatch) {
                return cellNumMatch.some(n => n === actualSearchNoBadan);
              }
              return cellStr.includes(actualSearchNoBadan.toUpperCase());
            });

            if (match) {
              bankInfo.ic = String(row[15] || '').trim();
              bankInfo.bankName = String(row[21] || '').trim();
              bankInfo.bankAccount = String(row[22] || '').trim();
              break;
            }
          }
        }
      } catch (err) {
        console.error("Error fetching Bank/IC data:", err);
      }

      const profile = {
        nama: rawFoundNama || '',
        pangkat: firstRow.pangkat || '',
        daerah: firstRow.daerah || '',
        balai: firstRow.balai || '',
        jantina: firstRow.jantina || '',
        ic: bankInfo.ic,
        bankName: bankInfo.bankName,
        bankAccount: bankInfo.bankAccount
      };
      
      setMultipleResults(null);
      setResult({ rows: userRows, profile, sdMap });
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    const { rows, profile, sdMap } = result;
    const rawNama = profile.nama || rows.map((r: any) => r.nama).find((v: any) => v) || '—';
    const nama = rawNama.replace(/[0-9()]/g, '').trim();
    const pangkat = profile.pangkat || rows.map((r: any) => r.pangkat).find((v: any) => v) || '—';
    const daerah = profile.daerah || rows.map((r: any) => r.daerah).find((v: any) => v) || '—';
    const balai = profile.balai || rows.map((r: any) => r.balai).find((v: any) => v) || '—';
    const jantina = profile.jantina || rows.map((r: any) => r.jantina).find((v: any) => v) || '—';
    
    // Attempt to extract the actual noBadan from the data row, falling back to a regex match on rawNama if undefined, ignoring the original search input state
    const actualPrintNoBadan = rows.map((r: any) => r.noBadan).find((v: any) => v) || rawNama.match(/([A-Z0-9/]{2,10}\d{3,7}|\b\d{4,7}\b)/i)?.[0] || '';

    const daysInMonth = new Date(tahun, bulan, 0).getDate();
    const dayMap: Record<number, any[]> = {};
    for (let d = 1; d <= daysInMonth; d++) dayMap[d] = [];

    rows.forEach((r: any) => {
      let tarikh = String(r.tarikh || '').trim();
      if (!tarikh) return;
      const parts = tarikh.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        if (day >= 1 && day <= daysInMonth) dayMap[day].push(r);
      }
    });

    const activeDays = Object.values(dayMap).filter(v => v.length > 0).length;
    const totalJam = rows.reduce((s: number, r: any) => s + (parseFloat(r.jam) || 0), 0);

    const isPegawai = (p: string) => {
      const upper = String(p).toUpperCase();
      return ['INSP', 'ASP', 'DSP', 'SUPT', 'ACP', 'SAC', 'DCP', 'CP', 'PEG'].some(rank => upper.includes(rank));
    };
    const kadarElaun = isPegawai(pangkat) ? 9.80 : 8.00;

    const sortedRows = [...rows].sort((a: any, b: any) => {
      const pA = String(a.tarikh || '').split('/');
      const pB = String(b.tarikh || '').split('/');
      if (pA.length === 3 && pB.length === 3) {
        return parseInt(pA[0]) - parseInt(pB[0]);
      }
      return 0;
    });

    return (
      <>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-5 print:hidden">
          <div className="bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] p-3 px-5 flex items-center justify-between">
            <div className="font-bold text-lg text-yellow-400 tracking-wider uppercase">📋 MAKLUMAT ANGGOTA</div>
            <button 
              onClick={() => window.print()}
              className="bg-white text-[#001f5c] px-4 py-1.5 rounded-md text-sm font-bold shadow-sm hover:bg-slate-100 transition-colors flex items-center gap-2"
            >
              🖨️ Cetak Borang
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4">
            <div className="p-4 border-r border-b border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nombor Badan</div>
              <div className="font-bold text-xl text-[#003087]">{actualPrintNoBadan || '—'}</div>
            </div>
            <div className="p-4 border-r border-b border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama</div>
              <div className="font-bold text-[15px] text-slate-900">{nama}</div>
            </div>
            <div className="p-4 border-r border-b border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pangkat</div>
              <div className="font-semibold text-sm text-slate-900">{pangkat}</div>
            </div>
            <div className="p-4 border-b border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jantina</div>
              <div className="font-semibold text-sm text-slate-900">{jantina}</div>
            </div>
            <div className="p-4 border-r border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Daerah</div>
              <div className="font-semibold text-sm text-slate-900">{daerah}</div>
            </div>
            <div className="p-4 border-r border-slate-200">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kekerapan Bertugas</div>
              <div className="font-bold text-2xl text-green-600">{activeDays} KALI</div>
            </div>
            <div className="p-4">
              <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">Jumlah Jam Bertugas</div>
              <div className="font-bold text-2xl text-[#003087]">{totalJam} JAM</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-8 border border-slate-200 shadow-sm overflow-x-auto mt-6 print:p-0 print:border-none print:shadow-none print:mt-0 print:overflow-visible">
          <style type="text/css" media="print">
            {`
              @page { size: A4 portrait; margin: 5mm; }
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .print-container {
                page-break-inside: avoid;
                transform: scale(0.95);
                transform-origin: top left;
                width: 105%;
              }
            `}
          </style>
          <div className="min-w-[800px] text-black font-serif text-[11px] print-container print:min-w-full" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            {/* Header */}
            <div className="text-right text-[10px] font-bold mb-2 print:mb-1">
              Lampiran "A"<br/>
              BORANG JPJKK/KSS001/22
            </div>
            <div className="text-center font-bold text-sm mb-4 print:mb-1">
              <br/>
              SUKARELAWAN SIMPANAN POLIS DIRAJA MALAYSIA (SSPDRM)<br/>
              KONTINJEN : MELAKA<br/>
              TUNTUTAN ELAUN PENUGASAN / LATIHAN BAGI BULAN : &nbsp;&nbsp;&nbsp;{months[bulan - 1].toUpperCase()}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{tahun}<br/><br/>
            </div>

            {/* Info */}
            <div className="grid grid-cols-2 gap-4 mb-[24px] print:mb-[24px] font-bold text-[13px]">
              <div>
                <div className="grid grid-cols-[120px_auto] mb-0.5">
                  <div>PANGKAT / NO</div><div>: {pangkat} {actualPrintNoBadan}</div>
                </div>
                <div className="grid grid-cols-[120px_auto] mb-0.5">
                  <div>NAMA</div><div>: {nama}</div>
                </div>
                <div className="grid grid-cols-[120px_auto] mb-2">
                  <div>DAERAH</div><div>: {daerah}</div>
                </div>
              </div>
              <div>
                <div className="grid grid-cols-[180px_auto] mb-0.5">
                  <div>NO. KAD PENGENALAN</div><div>: {profile?.ic || ''}</div>
                </div>
                <div className="grid grid-cols-[180px_auto]">
                  <div>NAMA DAN NO.AKAUN BANK</div><div>: {profile?.bankName ? `${profile.bankName} ${profile.bankAccount}` : ''}</div>
                </div>
              </div>
            </div>

            {/* Table */}
            <table className="w-full table-fixed border-collapse border border-black text-[10px] text-center">
              <thead className="text-[9px]">
                <tr>
                  <th className="border border-black p-0.5 w-[30px]" rowSpan={2}>BIL</th>
                  <th className="border border-black p-0.5 w-[80px]" rowSpan={2}>TARIKH</th>
                  <th className="border border-black p-0.5 w-[150px]" colSpan={2}>MASA</th>
                  <th className="border border-black p-0.5 whitespace-nowrap w-[210px]" rowSpan={2}>JENIS TUGAS</th>
                  <th className="border border-black p-0.5 w-[60px]" rowSpan={2}>SD<br/>MASUK</th>
                  <th className="border border-black p-0.5 w-[60px]" rowSpan={2}>SD<br/>KELUAR</th>
                  <th className="border border-black p-0.5 w-[70px]" rowSpan={2}>JUMLAH<br/>JAM<br/>BERTUGAS</th>
                  <th className="border border-black p-0.5 w-[70px]" rowSpan={2}>KADAR ELAUN<br/>SEJAM</th>
                  <th className="border border-black p-0.5 w-[70px]" rowSpan={2}>ELAUN<br/>PENUGASAN</th>
                </tr>
                <tr>
                  <th className="border border-black p-0.5 w-[75px]">MULA</th>
                  <th className="border border-black p-0.5 w-[75px]">TAMAT</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.max(15, sortedRows.length) }).map((_, idx) => {
                  const r = sortedRows[idx];
                  
                  if (!r) {
                    return (
                      <tr key={idx} className="h-[24px] print:h-[24px] text-[11px]">
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                        <td className="border border-black p-0.5"></td>
                      </tr>
                    );
                  }

                  const tarikh = r.tarikh;
                  const masaMula = r.masa;
                  const jam = r.jam || 0;
                  let jenisTugas = r.jenis;
                  if (jenisTugas && jenisTugas.toUpperCase().includes('TUGAS PENTADBIRAN') && r.colY) {
                    jenisTugas = `${jenisTugas} / ${r.colY}`;
                  } else if (jenisTugas && jenisTugas.toUpperCase().includes('LAIN-LAIN TUGAS') && r.lain) {
                    jenisTugas = r.lain;
                  }
                  
                  let masaTamat = '';
                  if (masaMula && masaMula !== '—' && jam) {
                    const match = String(masaMula).match(/^(\d{1,2}):(\d{2})$/);
                    if (match) {
                      const totalMins = parseInt(match[1]) * 60 + parseInt(match[2]) + Math.round(jam * 60);
                      const h = Math.floor(totalMins / 60) % 24;
                      const m = totalMins % 60;
                      masaTamat = String(h).padStart(2, '0') + String(m).padStart(2, '0');
                    }
                  }

                  const elaun = jam * kadarElaun;
                  const normTarikh = normaliseDate(tarikh);
                  const sdData = sdMap?.[normTarikh] || { masuk: '', keluar: '' };

                  return (
                    <tr key={idx} className="h-[24px] print:h-[24px] text-[11px]">
                      <td className="border border-black p-0.5">{idx + 1}</td>
                      <td className="border border-black p-0.5 font-bold">&nbsp;{tarikh}&nbsp;</td>
                      <td className="border border-black p-0.5 font-bold">{masaMula ? String(masaMula).replace(':', '') : ''}</td>
                      <td className="border border-black p-0.5 font-bold">{masaTamat}</td>
                      <td className="border border-black p-0.5 font-bold uppercase text-[9px] break-words whitespace-pre-line px-1 leading-tight">
                        {jenisTugas ? jenisTugas.replace('TUGAS PENTADBIRAN', 'TUGAS\nPENTADBIRAN') : ''}
                      </td>
                      <td className="border border-black p-0.5 font-bold">{sdData.masuk}</td>
                      <td className="border border-black p-0.5 font-bold">{sdData.keluar}</td>
                      <td className="border border-black p-0.5 font-bold">{jam}</td>
                      <td className="border border-black p-0.5">RM &nbsp;&nbsp;&nbsp;{kadarElaun.toFixed(2)}</td>
                      <td className="border border-black p-0.5 font-bold">{elaun.toFixed(2)}</td>
                    </tr>
                  );
                })}
                {/* Totals */}
                <tr>
                  <td className="border border-black p-0.5" colSpan={6} rowSpan={2}></td>
                  <td className="border border-black p-0.5 font-bold text-right px-1 text-[9px]">JUMLAH JAM<br/>PENUGASAN</td>
                  <td className="border border-black p-0.5 font-bold text-sm">{totalJam}</td>
                  <td className="border border-black p-0.5 font-bold text-right px-1 text-[9px]">JUMLAH ELAUN<br/>RM</td>
                  <td className="border border-black p-0.5 font-bold text-sm">{(totalJam * kadarElaun).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-black p-0.5 font-bold text-right px-1 text-[9px]">JUMLAH JAM<br/>DITUNTUT</td>
                  <td className="border border-black p-0.5 font-bold text-sm">{Math.min(totalJam, 48)}</td>
                  <td className="border border-black p-0.5 font-bold text-right px-1 text-[9px]">JUMLAH ELAUN<br/>DITUNTUT RM</td>
                  <td className="border border-black p-0.5 font-bold text-sm">{(Math.min(totalJam, 48) * kadarElaun).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-2 mt-[120px] print:mt-[120px] text-[10px]">
              <div>
                <br/>
                Saya mengaku menjalankan penugasan/latihan<br/>
                pada bulan tersebut adalah benar<br/>
                <br/><br/>
                <div className="h-8 print:h-4"></div>
                .......................................................................<br/>
                Tandatangan yang menuntut<br/>
                Tarikh :
              </div>
              <div>
                <br/>
                Saya telah menyemak pemeriksaan dan dapati tuntutan<br/>
                jam penugasan / latihan tersebut adalah <strong>BENAR</strong><br/>
                <br/><br/>
                <div className="h-8 print:h-4"></div>
                .......................................................................<br/>
                Nama :<br/>
                Jawatan :<br/>
                Tarikh :
              </div>
              <div>
                <br/>
                Saya mengesahkan tuntutan penugasan<br/>
                latihan tersebut adalah <strong>BENAR</strong><br/>
                <br/><br/>
                <div className="h-8 print:h-4"></div>
                .......................................................................<br/>
                Nama :<br/>
                Jawatan :<br/>
                Tarikh :
              </div>
            </div>
          </div>
        </div>
      </>
    );
  };

  const dName: Record<string, string> = { d1: 'Melaka Tengah', d2: 'Jasin', d3: 'Alor Gajah', d4: 'IPK SSPDRM' };

  return (
    <div className="animate-in fade-in duration-300" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
      <div className="bg-gradient-to-br from-[#064e3b] to-[#059669] rounded-2xl p-4 md:p-6 flex items-center justify-between mb-5 text-white shadow-md print:hidden">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-3xl md:text-4xl">🔍</div>
          <div className="flex items-center gap-4">
            <div>
              <div className="font-bold text-xl md:text-2xl text-white tracking-wide">Sistem Pencarian Data Penugasan Anggota</div>
              <div className="text-[13px] text-white/80 mt-0.5">Semak rekod penugasan bulanan mengikut Nombor Badan</div>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-4xl md:text-5xl text-white leading-none">
            {result ? result.rows.reduce((s: number, r: any) => s + (parseFloat(Array.isArray(r) ? r[18] : (r.jam || r.kekuatan)) || 0), 0) : '—'}
          </div>
          <div className="text-xs text-white/80 mt-1">Jumlah Jam Bertugas</div>
        </div>
      </div>

      {!isFullAdmin && currentUser?.district && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-3 px-4 mb-4 text-[13px] font-semibold text-green-800 print:hidden">
          🔓 Akses terhad: {dName[currentUser.district] || currentUser.district}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5 px-6 mb-5 shadow-sm print:hidden">
        <form 
          onSubmit={(e) => { e.preventDefault(); doSearch(); }}
          className="grid grid-cols-1 md:grid-cols-[auto_160px_160px_1fr_auto] gap-4 items-end"
        >
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">No. Badan / Nama</label>
                <input 
                  type="text" 
                  className="border-2 border-red-600 rounded-lg p-2.5 px-3.5 text-sm font-bold outline-none w-full md:w-56 text-slate-900 bg-red-50 focus:border-red-700 placeholder:font-normal placeholder:text-red-300"
                  value={noBadan}
                  onChange={e => setNoBadan(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">📅 Bulan</label>
                <div className="flex items-center gap-1.5">
                  <div className="bg-yellow-400 rounded-md p-1.5 px-3 font-bold text-[13px] text-[#001f5c]">BULAN</div>
                  <select 
                    className="border-2 border-slate-200 rounded-lg p-2 px-2.5 text-sm outline-none bg-white cursor-pointer focus:border-[#003087] flex-1"
                    value={bulan}
                    onChange={e => setBulan(parseInt(e.target.value))}
                  >
                    {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">📅 Tahun</label>
                <div className="flex items-center gap-1.5">
                  <div className="bg-yellow-400 rounded-md p-1.5 px-3 font-bold text-[13px] text-[#001f5c]">TAHUN</div>
                  <select 
                    className="border-2 border-slate-200 rounded-lg p-2 px-2.5 text-sm outline-none bg-white cursor-pointer focus:border-[#003087] flex-1"
                    value={tahun}
                    onChange={e => setTahun(parseInt(e.target.value))}
                  >
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div className="hidden md:block"></div>
              <div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] text-white border-none rounded-lg p-2.5 px-7 text-sm font-bold cursor-pointer flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-70"
                >
                  {loading ? '⏳ Mencari...' : '🔍 SEMAK'}
                </button>
              </div>
            </form>
          </div>

          {error && (
            <div className="text-center p-12 text-slate-500">
              <div className="text-4xl mb-3">🔍</div>
              <div className="font-semibold text-red-600">{error}</div>
            </div>
          )}

          {multipleResults && multipleResults.length > 0 && !loading && (
            <div className="bg-white rounded-xl border border-blue-200 p-6 shadow-sm print:hidden">
              <h3 className="font-bold text-lg text-[#001f5c] mb-4 flex items-center gap-2">
                👥 Terdapat lebih daripada satu anggota dijumpai
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                Sila pilih anggota yang betul dari senarai di bawah untuk paparan borang:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {multipleResults.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => loadProfileAndSetResult(opt.rows, noBadan)}
                    className="flex flex-col text-left p-4 rounded-xl border-2 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer bg-white group"
                  >
                    <div className="font-bold text-[#001f5c] group-hover:text-blue-700 text-[15px] mb-1">
                      {opt.nama}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">ID: {opt.noBadan}</span>
                      {opt.pangkat && <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded">{opt.pangkat}</span>}
                      <span className="text-slate-400">({opt.rows.length} rekod)</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!result && !error && !loading && !multipleResults && (
            <div className="text-center p-12 text-slate-500">
              <div className="text-4xl mb-3">🔍</div>
              <div className="font-semibold text-[15px]">Masukkan Nombor Badan atau Nama untuk mencari rekod penugasan.</div>
            </div>
          )}

          {renderResult()}
    </div>
  );
}
