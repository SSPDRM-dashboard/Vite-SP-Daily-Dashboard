export default function KpiCard({ icon, label, value, sub, colorClass }: any) {
  return (
    <div className="bg-white rounded-xl p-4 md:p-5 border border-slate-200 relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg">
      <div className="text-xl mb-2">{icon}</div>
      <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">{label}</div>
      <div className="font-bold text-3xl text-slate-900 leading-none">{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{sub}</div>
      <div className={`absolute bottom-0 left-0 right-0 h-1 ${colorClass}`}></div>
    </div>
  );
}
