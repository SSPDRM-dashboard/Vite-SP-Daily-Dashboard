import { AlertTriangle } from 'lucide-react';

interface Props {
  data: any[];
}

export default function DuplicateAlert({ data }: Props) {
  // Find members with duplicate entries (same name, same duty)
  const duplicateGroups: Record<string, any[]> = {};
  
  data.forEach(item => {
    const key = `${item.nama}-${item.jenis}`;
    if (!duplicateGroups[key]) duplicateGroups[key] = [];
    duplicateGroups[key].push(item);
  });

  const actualDuplicates = Object.values(duplicateGroups).filter(group => group.length > 1);

  if (actualDuplicates.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-200 rounded-xl overflow-hidden mb-4 shadow-sm animate-in fade-in slide-in-from-top-2">
      <div className="bg-red-600 p-2 px-3 flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
        <AlertTriangle size={14} />
        <span>Rekod Bertindih Dikesan ({actualDuplicates.length} Anggota)</span>
      </div>
      <div className="p-3 max-h-60 overflow-y-auto">
        <p className="text-[10px] text-red-500 font-bold uppercase mb-2">Sila semak kemasukan data berikut:</p>
        {actualDuplicates.map((group, idx) => (
          <div key={idx} className="mb-1.5 last:mb-0 p-2 bg-white rounded border border-red-100 text-[10px] shadow-sm flex items-center justify-between gap-3 whitespace-nowrap overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-red-700">👤 {group[0].nama}</span>
              <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded-full text-[8px] font-bold">{group.length}X</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <span className="flex items-center gap-1"><span className="opacity-70 text-[9px]">🏢</span> {group[0].daerah}</span>
              <span className="flex items-center gap-1"><span className="opacity-70 text-[9px]">📋</span> {group[0].jenis}</span>
              <span className="flex items-center gap-1"><span className="opacity-70 text-[9px]">⏱️</span> {group[0].jam}J</span>
              <span className="flex items-center gap-1"><span className="opacity-70 text-[9px]">📍</span> {group[0].bertugas.replace('BALAI POLIS ', '')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
