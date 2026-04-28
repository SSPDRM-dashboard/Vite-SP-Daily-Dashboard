export default function Tabs({ activeTab, setActiveTab, allowedDistricts, selectedDate, setSelectedDate }: any) {
  const tabs = [
    { id: 'today', label: '📅 Semua Daerah', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'd1', label: '🔴 Melaka Tengah', colorClass: 'hover:text-red-700 active-tab-d1' },
    { id: 'd2', label: '🟢 Jasin', colorClass: 'hover:text-green-700 active-tab-d2' },
    { id: 'd3', label: '🟡 Alor Gajah', colorClass: 'hover:text-amber-700 active-tab-d3' },
    { id: 'd4', label: '🟣 IPK SSPDRM', colorClass: 'hover:text-purple-700 active-tab-d4' },
    { id: 'carian', label: '🔍 Main Hour', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'roster', label: '📅 Roster', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'duplicate', label: '⚠️ Bertindih', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'admin', label: '⚙️ Tetapan Admin', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'log', label: '📋 Log Masuk', colorClass: 'hover:text-[#003087] active-tab-all' },
  ];

  return (
    <div className="bg-white border-b-2 border-slate-200 px-4 md:px-8 flex overflow-x-auto items-center">
      <div className="flex gap-0 flex-1">
        {tabs.filter(t => allowedDistricts.includes(t.id)).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 md:px-5 py-3.5 text-[13px] font-semibold whitespace-nowrap border-b-[3px] transition-all -mb-[2px] cursor-pointer ${
              activeTab === tab.id 
                ? (tab.id === 'd1' ? 'text-red-700 border-red-700' : 
                   tab.id === 'd2' ? 'text-green-700 border-green-700' : 
                   tab.id === 'd3' ? 'text-amber-700 border-amber-700' : 
                   tab.id === 'd4' ? 'text-purple-700 border-purple-700' : 
                   'text-[#003087] border-[#003087]') 
                : 'text-slate-500 border-transparent hover:text-[#003087]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2 pl-4 py-2">
        <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">📆 Pilih Tarikh:</label>
        <input 
          type="date" 
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className="border-2 border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-[#003087] cursor-pointer"
        />
      </div>
    </div>
  );
}
