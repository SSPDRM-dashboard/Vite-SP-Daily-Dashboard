import React, { useMemo } from 'react';
import KpiCard from '../KpiCard';
import PenugasanCard from '../PenugasanCard';
import { countBy, badgeClass } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COLORS, JENIS_ORDER } from '../../lib/constants';
import LainLainTable from '../LainLainTable';
import DuplicateAlert from '../DuplicateAlert';

export default function SemuaDaerahTab({ data, dateStr, loading }: any) {
  const totalJam = data.reduce((s: number, d: any) => s + (d.jam || 0), 0);
  const daerahCount = new Set(data.map((d: any) => d.daerah).filter(Boolean)).size;
  const balaiCount = new Set(data.map((d: any) => d.bertugas).filter(Boolean)).size;
  const jenisCount = new Set(data.map((d: any) => d.jenis).filter(Boolean)).size;

  const byDaerah = countBy(data, 'daerah');
  const chartData1 = Object.keys(byDaerah).map(k => ({ name: k, value: byDaerah[k] }));

  const districtCharts = [
    { daerah: 'MELAKA TENGAH', title: '🔴 Melaka Tengah — Mengikut Balai Bertugas', color: 'text-red-700' },
    { daerah: 'JASIN', title: '🟢 Jasin — Mengikut Balai Bertugas', color: 'text-green-700' },
    { daerah: 'ALOR GAJAH', title: '🟡 Alor Gajah — Mengikut Balai Bertugas', color: 'text-amber-700' },
    { daerah: 'IPK SSPDRM', title: '🟣 IPK SSPDRM — Mengikut Balai Bertugas', color: 'text-purple-700' },
  ];

  const groupedByDistrict = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    data.forEach((item: any) => {
      const district = item.daerah || 'LAIN';
      if (!grouped[district]) grouped[district] = [];
      grouped[district].push(item);
    });
    return grouped;
  }, [data]);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-[#003087] to-[#0a3fa8] rounded-2xl p-4 md:p-6 flex items-center justify-between mb-5 text-white shadow-md">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-3xl md:text-4xl">📅</div>
          <div>
            <div className="font-bold text-xl md:text-2xl text-yellow-400 tracking-wide">{dateStr}</div>
            <div className="text-[13px] text-white/70 mt-0.5">Semua daerah · Tarikh penugasan dipilih</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-4xl md:text-5xl text-yellow-400 leading-none">{data.length}</div>
          <div className="text-xs text-white/70 mt-1">Jumlah anggota bertugas</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-5">
        <KpiCard icon="👮" label="Jumlah Anggota" value={data.length} sub="Semua daerah" colorClass="bg-[#003087]" />
        <KpiCard icon="🏢" label="Daerah Aktif" value={daerahCount} sub="Hari ini" colorClass="bg-yellow-500" />
        <KpiCard icon="⏱️" label="Jumlah Jam" value={totalJam} sub="Jam penugasan" colorClass="bg-green-600" />
        <KpiCard icon="🏫" label="Balai Terlibat" value={balaiCount} sub="Balai polis" colorClass="bg-amber-500" />
        <KpiCard icon="📋" label="Jenis Tugas" value={jenisCount} sub="Kategori" colorClass="bg-red-600" />
      </div>

      <DuplicateAlert data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 md:gap-5 mb-5 items-start">
        <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-lg text-slate-900">Anggota Mengikut Daerah</div>
            <div className="text-xs bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-slate-500 font-semibold">{data.length} rekod</div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData1}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value">
                  {chartData1.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mt-6">
            <LainLainTable 
              data={data} 
              categories={['JAGA AMAN / OP SEPADU', 'MESYUARAT / PERJUMPAAN', 'TUGAS TRAFIK', 'PERHIMPUNAN']} 
              minRows={4}
            />
            <LainLainTable 
              data={data} 
              categories={['LDP / KURSUS', 'BILIK KAWALAN (DCC)', 'RCJ (MPV)']} 
              minRows={4}
            />
          </div>
        </div>
        <div className="flex flex-col gap-4 w-full">
          <PenugasanCard data={data} dateStr={dateStr} isAll={true} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 mb-5">
        {districtCharts.map(dc => {
          const distData = data.filter((d: any) => d.daerah === dc.daerah);
          const byB = countBy(distData, 'bertugas');
          const chartData = Object.keys(byB).map(k => ({ name: k.replace('BALAI POLIS ', ''), value: byB[k] }));
          
          return (
            <div key={dc.daerah} className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className={`font-bold text-base ${dc.color}`}>{dc.title}</div>
                <div className="text-xs bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-slate-500 font-semibold">{distData.length} anggota</div>
              </div>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="value">
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-5">
        <div className="p-4 md:p-5 pb-0 flex items-center justify-between">
          <div className="font-bold text-lg text-slate-900">Senarai Anggota Bertugas Hari Ini</div>
          <div className="text-xs bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-slate-500 font-semibold">{data.length} anggota</div>
        </div>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead>
              <tr className="bg-slate-50 border-y-2 border-slate-200">
                <th className="p-2.5 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-10">#</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Daerah</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Pangkat</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Nama & No. Badan</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Balai Berdaftar</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Balai Bertugas</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Jenis Tugasan</th>
                <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Lain-lain Tugas</th>
                <th className="p-2.5 px-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Jam</th>
                <th className="p-2.5 px-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Masa Mula</th>
                <th className="p-2.5 px-2.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Masa Tamat</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={12} className="text-center p-8 text-slate-500">Memuatkan data...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={12} className="text-center p-12 text-slate-500"><div className="text-4xl mb-3">📭</div><div className="font-medium">Tiada rekod penugasan untuk tarikh ini</div></td></tr>
              ) : (
                Object.keys(groupedByDistrict).sort().map(district => (
                  <React.Fragment key={district}>
                    <tr className="bg-[#0a3fa8]">
                      <td colSpan={12} className="p-2 px-3.5 text-yellow-400 font-bold text-sm tracking-wide">📍 {district} ({groupedByDistrict[district].length} anggota)</td>
                    </tr>
                    {groupedByDistrict[district].map((r, i) => {
                      const isDuplicate = data.filter((d: any) => 
                        d.nama === r.nama && 
                        d.jenis === r.jenis
                      ).length > 1;

                      return (
                        <tr key={i} className={`border-b border-slate-200 hover:bg-slate-50 ${isDuplicate ? 'bg-red-50/50' : ''}`}>
                          <td className="p-2.5 px-3 text-center text-slate-500 text-[11px]">{i + 1}</td>
                          <td className="p-2.5 px-2.5 text-[11px]">{r.timestamp}</td>
                          <td className="p-2.5 px-2.5 font-bold text-[#003087]">{r.daerah}</td>
                          <td className="p-2.5 px-2.5">{r.pangkat || '—'}</td>
                          <td className="p-2.5 px-2.5 font-bold">
                            {r.nama} {r.noBadan && !r.nama.includes(r.noBadan) ? `(${r.noBadan})` : ''}
                            {isDuplicate && <span className="ml-2 text-[9px] bg-red-600 text-white px-1 rounded font-bold uppercase">Bertindih</span>}
                          </td>
                          <td className="p-2.5 px-2.5">{r.balai.replace('BALAI POLIS ', '')}</td>
                          <td className="p-2.5 px-2.5">{r.bertugas.replace('BALAI POLIS ', '')}</td>
                          <td className="p-2.5 px-2.5"><span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${badgeClass(r.jenis)}`}>{r.jenis || '—'}</span></td>
                          <td className="p-2.5 px-2.5 max-w-[200px] break-words">{r.lain || '—'}</td>
                          <td className="p-2.5 px-2.5 text-center font-semibold">{r.jam || '—'}</td>
                          <td className="p-2.5 px-2.5 text-center">{r.masa || '—'}</td>
                          <td className="p-2.5 px-2.5 text-center">{r.masaTamat || '—'}</td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
