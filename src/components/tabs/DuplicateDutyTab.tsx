import React, { useState, useMemo } from 'react';
import { ShieldCheck, AlertTriangle } from 'lucide-react';
import { DAERAH_MAP } from '../../lib/constants';

interface Props {
  allData: any[];
}

export default function DuplicateDutyTab({ allData }: Props) {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const duplicates = useMemo(() => {
    if (!selectedMonth) return [];

    const [year, month] = selectedMonth.split('-');
    
    // Filter data for the selected month
    const monthlyData = allData.filter(item => {
      if (!item.tarikh) return false;
      // Tarikh format is DD/MM/YYYY
      const parts = item.tarikh.split('/');
      if (parts.length === 3) {
        const itemMonth = parseInt(parts[1], 10);
        const itemYear = parseInt(parts[2], 10);
        return itemMonth === parseInt(month, 10) && itemYear === parseInt(year, 10);
      }
      return false;
    });

    // Group by Date + Name + Jenis
    const duplicateGroups: Record<string, any[]> = {};
    monthlyData.forEach(item => {
      const key = `${item.tarikh}-${item.nama}-${item.jenis}`;
      if (!duplicateGroups[key]) duplicateGroups[key] = [];
      duplicateGroups[key].push(item);
    });

    return Object.entries(duplicateGroups)
      .filter(([_, group]) => group.length > 1)
      .map(([key, group]) => ({
         key,
         date: group[0].tarikh,
         name: group[0].nama,
         items: group
      }))
      .sort((a, b) => {
         // Sort by date (DD/MM/YYYY)
         const [d1, m1, y1] = a.date.split('/').map(Number);
         const [d2, m2, y2] = b.date.split('/').map(Number);
         const dateA = new Date(y1, m1 - 1, d1).getTime();
         const dateB = new Date(y2, m2 - 1, d2).getTime();
         return dateA - dateB;
      });
  }, [allData, selectedMonth]);

  return (
    <div className="p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center text-red-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-800">Senarai Tugas Bertindih</h2>
            <p className="text-slate-500 text-sm font-medium">Semak rekod bertindih mengikut bulan (Paparan Admin)</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-700">Pilih Bulan:</label>
          <input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="border-2 border-slate-200 rounded-lg px-4 py-2 font-bold focus:border-[#003087] outline-none cursor-pointer"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {duplicates.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <ShieldCheck size={48} className="mb-4 text-green-500" />
            <p className="text-lg font-bold text-slate-600">Terbaik!</p>
            <p className="text-sm text-slate-500">Tiada rekod bertindih dikesan pada bulan ini.</p>
          </div>
        ) : (
          <div className="p-4">
            <div className="mb-4 inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              {duplicates.reduce((acc, curr) => acc + curr.items.length, 0)} Rekod ({duplicates.length} Kumpulan) Bertindih
            </div>
            <div className="space-y-4">
              {duplicates.map((group) => (
                <div key={group.key} className="border border-red-200 rounded-lg overflow-hidden shrink-0">
                  <div className="bg-red-50 p-2.5 px-4 flex items-center justify-between border-b border-red-200 shrink-0">
                    <div className="flex items-center gap-3">
                      <span className="bg-white px-2.5 py-1 rounded-md text-red-800 font-bold text-xs border border-red-200 shadow-sm">{group.date}</span>
                      <span className="font-bold text-slate-800">{group.name}</span>
                    </div>
                    <span className="bg-red-600 text-white px-2 py-0.5 rounded text-[10px] font-bold tracking-wide">{group.items.length} REKOD</span>
                  </div>
                  <div className="bg-white overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 font-semibold text-[10px] uppercase tracking-wider text-slate-500">
                          <th className="p-2.5 px-4 font-semibold w-12 text-center">BIL</th>
                          <th className="p-2.5 px-4 font-semibold w-32 border-l border-slate-100">TIMESTAMP</th>
                          <th className="p-2.5 px-4 font-semibold border-l border-slate-100">DAERAH</th>
                          <th className="p-2.5 px-4 font-semibold border-l border-slate-100">LOKASI</th>
                          <th className="p-2.5 px-4 font-semibold border-l border-slate-100">JENIS TUGAS</th>
                          <th className="p-2.5 px-4 font-semibold w-24 text-center border-l border-slate-100">JAM</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {group.items.map((item, idx) => (
                          <tr key={idx} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="p-2.5 px-4 text-center text-slate-400 font-medium">{idx + 1}</td>
                            <td className="p-2.5 px-4 border-l border-slate-100 text-slate-500 whitespace-nowrap">{item.timestamp || '—'}</td>
                            <td className="p-2.5 px-4 border-l border-slate-100 font-bold text-slate-700 whitespace-nowrap">{item.daerah || '—'}</td>
                            <td className="p-2.5 px-4 border-l border-slate-100 text-slate-600 truncate max-w-[200px]">{item.bertugas || '—'}</td>
                            <td className="p-2.5 px-4 border-l border-slate-100 text-slate-600">{item.jenis || '—'} {item.lain ? `/ ${item.lain}` : ''} {item.colY ? `/ ${item.colY}` : ''}</td>
                            <td className="p-2.5 px-4 border-l border-slate-100 text-center font-bold text-slate-600">{item.jam || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
