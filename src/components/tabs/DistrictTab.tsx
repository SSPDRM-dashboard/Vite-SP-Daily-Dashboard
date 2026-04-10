import { useState } from 'react';
import KpiCard from '../KpiCard';
import PenugasanCard from '../PenugasanCard';
import { countBy, badgeClass } from '../../lib/utils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { COLORS } from '../../lib/constants';
import { Lock, ShieldCheck, AlertTriangle } from 'lucide-react';
import LainLainTable from '../LainLainTable';
import DuplicateAlert from '../DuplicateAlert';

const DISTRICT_CONFIG: Record<string, any> = {
  d1: { name: 'Melaka Tengah', icon: '🔴', color: 'red', bgClass: 'from-[#991b1b] to-[#dc2626]', kpi1: 'bg-red-600', kpi2: 'bg-yellow-500', kpi3: 'bg-green-600', kpi4: 'bg-amber-500' },
  d2: { name: 'Jasin', icon: '🟢', color: 'green', bgClass: 'from-[#14532d] to-[#16a34a]', kpi1: 'bg-green-600', kpi2: 'bg-yellow-500', kpi3: 'bg-[#003087]', kpi4: 'bg-amber-500' },
  d3: { name: 'Alor Gajah', icon: '🟡', color: 'amber', bgClass: 'from-[#78350f] to-[#d97706]', kpi1: 'bg-amber-500', kpi2: 'bg-yellow-500', kpi3: 'bg-[#003087]', kpi4: 'bg-green-600' },
  d4: { name: 'IPK SSPDRM', icon: '🟣', color: 'purple', bgClass: 'from-[#4c1d95] to-[#7c3aed]', kpi1: 'bg-[#003087]', kpi2: 'bg-yellow-500', kpi3: 'bg-green-600', kpi4: 'bg-red-600' },
};

export default function DistrictTab({ 
  districtKey, 
  data, 
  dateStr, 
  loading,
  isUnlocked,
  onUnlock,
  passcodeInput,
  setPasscodeInput,
  passcodeError
}: any) {
  const config = DISTRICT_CONFIG[districtKey];

  const totalJam = data.reduce((s: number, d: any) => s + (d.jam || 0), 0);
  const balaiCount = new Set(data.map((d: any) => d.bertugas).filter(Boolean)).size;
  const jenisCount = new Set(data.map((d: any) => d.jenis).filter(Boolean)).size;

  const byBalai = countBy(data, 'bertugas');
  const chartData = Object.keys(byBalai).map(k => ({ name: k.replace('BALAI POLIS ', ''), value: byBalai[k] }));

  return (
    <div className="animate-in fade-in duration-300">
      <div className={`bg-gradient-to-br ${config.bgClass} rounded-2xl p-4 md:p-6 flex items-center justify-between mb-5 text-white shadow-md`}>
        <div className="flex items-center gap-3 md:gap-4">
          <div className="text-3xl md:text-4xl">{config.icon}</div>
          <div>
            <div className="font-bold text-xl md:text-2xl text-yellow-400 tracking-wide">{config.name}</div>
            <div className="text-[13px] text-white/70 mt-0.5">{dateStr}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-4xl md:text-5xl text-yellow-400 leading-none">{data.length}</div>
          <div className="text-xs text-white/70 mt-1">Anggota bertugas</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-5">
        <KpiCard icon="👮" label="Jumlah Anggota" value={data.length} sub="Hari ini" colorClass={config.kpi1} />
        <KpiCard icon="⏱️" label="Jumlah Jam" value={totalJam} sub="Jam penugasan" colorClass={config.kpi2} />
        <KpiCard icon="🏫" label="Balai Terlibat" value={balaiCount} sub="Balai polis" colorClass={config.kpi3} />
        <KpiCard icon="📋" label="Jenis Tugas" value={jenisCount} sub="Kategori" colorClass={config.kpi4} />
      </div>

      <DuplicateAlert data={data} />

      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-4 md:gap-5 mb-5 items-start">
        <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 shadow-sm">
          <div className="font-bold text-lg text-slate-900 mb-4">Anggota Mengikut Balai</div>
          <div className="h-48">
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
          <PenugasanCard data={data} dateStr={dateStr} isAll={false} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm mb-5 animate-in fade-in slide-in-from-bottom-4">
        <div className="p-4 md:p-5 pb-0 flex items-center justify-between">
          <div className="font-bold text-lg text-slate-900">Senarai Anggota — {config.name}</div>
          <div className="text-xs bg-slate-100 border border-slate-200 rounded-md px-2 py-1 text-slate-500 font-semibold">{data.length} anggota</div>
        </div>
        
        {isUnlocked ? (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="bg-slate-50 border-y-2 border-slate-200">
                  <th className="p-2.5 px-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider w-10">#</th>
                  <th className="p-2.5 px-2.5 text-xs font-bold text-slate-500 uppercase tracking-wider">Timestamp</th>
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
                  <tr><td colSpan={10} className="text-center p-8 text-slate-500">Memuatkan data...</td></tr>
                ) : data.length === 0 ? (
                  <tr><td colSpan={10} className="text-center p-12 text-slate-500"><div className="text-4xl mb-3">📭</div><div className="font-medium">Tiada rekod penugasan untuk tarikh ini</div></td></tr>
                ) : (
                  data.map((r: any, i: number) => {
                    const isDuplicate = data.filter((d: any) => 
                      d.nama === r.nama && 
                      d.jenis === r.jenis
                    ).length > 1;

                    return (
                      <tr key={i} className={`border-b border-slate-200 hover:bg-slate-50 ${isDuplicate ? 'bg-red-50/50' : ''}`}>
                        <td className="p-2.5 px-3 text-center text-slate-500 text-[11px]">{i + 1}</td>
                        <td className="p-2.5 px-2.5 text-[11px]">{r.timestamp || '—'}</td>
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
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 flex flex-col items-center justify-center bg-slate-50/50">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-3">
              <Lock size={24} />
            </div>
            <h3 className="font-bold text-slate-800 mb-1">Senarai Anggota Dikunci</h3>
            <p className="text-slate-500 text-xs mb-5">Sila masukkan passcode untuk melihat senarai penuh.</p>
            
            <form onSubmit={onUnlock} className="flex items-center gap-2 w-full max-w-xs">
              <input 
                type="password" 
                placeholder="Passcode..."
                value={passcodeInput}
                onChange={e => setPasscodeInput(e.target.value)}
                className={`flex-1 border-2 rounded-lg p-2 text-center text-sm font-bold tracking-widest outline-none transition-all ${
                  passcodeError ? 'border-red-300 bg-red-50' : 'border-slate-200 focus:border-[#003087]'
                }`}
              />
              <button 
                type="submit"
                className="bg-[#003087] text-white p-2 px-4 rounded-lg text-xs font-bold hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                <ShieldCheck size={14} />
                BUKA
              </button>
            </form>
            {passcodeError && <p className="text-red-500 text-[10px] font-bold uppercase mt-2">❌ Passcode Salah</p>}
          </div>
        )}
      </div>
    </div>
  );
}
