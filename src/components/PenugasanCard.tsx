import { isPeg } from '../lib/utils';
import { JENIS_ORDER } from '../lib/constants';

export default function PenugasanCard({ data, dateStr, isAll }: any) {
  const counts: Record<string, { peg: number, apr: number }> = {};
  JENIS_ORDER.forEach(j => { counts[j] = { peg: 0, apr: 0 }; });
  
  data.forEach((d: any) => { 
    let j = d.jenis || 'LAIN-LAIN TUGAS'; 
    if (!JENIS_ORDER.includes(j)) {
      j = 'LAIN-LAIN TUGAS';
    }
    if (!counts[j]) counts[j] = { peg: 0, apr: 0 }; 
    if (isPeg(d)) counts[j].peg++; else counts[j].apr++; 
  });

  let totalPeg = 0, totalApr = 0;
  JENIS_ORDER.forEach(j => { totalPeg += counts[j].peg; totalApr += counts[j].apr; });

  const cardTitle = isAll ? 'JUMLAH PENUGASAN HARIAN' : 'PENUGASAN HARIAN';

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm self-start w-full">
      <div className="bg-gradient-to-br from-[#001f5c] to-[#0a3fa8] p-3.5 px-4 w-full">
        <div className="font-bold text-[17px] text-yellow-400 tracking-wider uppercase leading-tight whitespace-nowrap overflow-hidden text-ellipsis">📋 {cardTitle}</div>
        <div className="text-[11px] text-white/75 mt-1">{dateStr}</div>
      </div>
      <table className="w-full border-collapse text-[13px] table-fixed">
        <colgroup><col className="w-auto" /><col className="w-16" /><col className="w-16" /></colgroup>
        <thead>
          <tr className="border-b-2 border-slate-300">
            <th className="p-2.5 px-3.5 text-left text-xs font-bold tracking-wider uppercase bg-[#c8c8c8] text-slate-800">PENUGASAN</th>
            <th className="p-2.5 px-0 text-center text-xs font-bold bg-[#f4a261] text-white">PEG</th>
            <th className="p-2.5 px-0 text-center text-xs font-bold bg-[#4a90d9] text-white">APR</th>
          </tr>
        </thead>
        <tbody>
          {JENIS_ORDER.map((j, i) => (
            <tr key={j} className={`border-b border-[#e8e8c8] ${i % 2 === 0 ? 'bg-[#fffde8]' : 'bg-[#fffbda]'}`}>
              <td className="p-2 px-3.5 font-semibold text-slate-800 text-left">{j}</td>
              <td className="p-2 px-0 text-center font-bold text-slate-700">{counts[j].peg}</td>
              <td className="p-2 px-0 text-center font-bold text-slate-700">{counts[j].apr}</td>
            </tr>
          ))}
          <tr>
            <td className="p-2.5 px-3.5 bg-[#d0d0d0] font-bold text-[13px] text-slate-900 text-left border-t-2 border-slate-400">JUMLAH KESELURUHAN</td>
            <td className="p-2.5 px-0 text-center font-bold text-xl bg-[#f4a261] text-white border-t-2 border-[#d98a4e]">{totalPeg}</td>
            <td className="p-2.5 px-0 text-center font-bold text-xl bg-[#4a90d9] text-white border-t-2 border-[#3b7ab8]">{totalApr}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
