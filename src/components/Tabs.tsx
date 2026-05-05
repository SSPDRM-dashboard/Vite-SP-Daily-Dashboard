import { RefreshCw } from 'lucide-react';

export default function Tabs({ activeTab, setActiveTab, allowedDistricts, selectedDate, setSelectedDate, lastRefresh, onRefresh, isLoading }: any) {
  const adminTabIds = ['carian', 'roster', 'jadual', 'duplicate', 'admin', 'log'];
  const daerahTabIds = ['today', 'd1', 'd2', 'd3', 'd4'];

  const allTabs = [
    { id: 'today', label: '📅 Semua Daerah', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'd1', label: '🔴 Melaka Tengah', colorClass: 'hover:text-red-700 active-tab-d1' },
    { id: 'd2', label: '🟢 Jasin', colorClass: 'hover:text-green-700 active-tab-d2' },
    { id: 'd3', label: '🟡 Alor Gajah', colorClass: 'hover:text-amber-700 active-tab-d3' },
    { id: 'd4', label: '🟣 IPK SSPDRM', colorClass: 'hover:text-purple-700 active-tab-d4' },
    { id: 'carian', label: '🔍 Main Hour', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'roster', label: '📅 Roster', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'jadual', label: '🗓️ Jadual Tugas', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'duplicate', label: '⚠️ Bertindih', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'admin', label: '⚙️ Tetapan Admin', colorClass: 'hover:text-[#003087] active-tab-all' },
    { id: 'log', label: '📋 Log Masuk', colorClass: 'hover:text-[#003087] active-tab-all' },
  ];

  const visibleAdminTabs = allTabs.filter(t => adminTabIds.includes(t.id) && allowedDistricts.includes(t.id));
  const visibleDaerahTabs = allTabs.filter(t => daerahTabIds.includes(t.id) && allowedDistricts.includes(t.id));

  return (
    <div className="bg-white border-b-2 border-slate-200 flex flex-col">
      {/* Upper row for admin tabs */}
      {visibleAdminTabs.length > 0 && (
        <div className="px-4 md:px-8 border-b border-slate-100 flex overflow-x-auto items-center bg-slate-50 justify-between">
          <div className="flex gap-0 flex-1">
            {visibleAdminTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 md:px-5 py-3.5 text-[13px] font-semibold whitespace-nowrap border-b-[3px] transition-all -mb-[1px] cursor-pointer ${
                  activeTab === tab.id 
                    ? 'text-[#003087] border-[#003087]' 
                    : 'text-slate-500 border-transparent hover:text-[#003087]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex flex-col items-end justify-center ml-auto pl-4 pr-2 py-1">
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1.5 text-[11px] text-[#003087] bg-white border border-slate-200 hover:bg-slate-50 hover:text-blue-800 transition-colors cursor-pointer disabled:opacity-50 font-semibold rounded-full px-3 py-1 shadow-sm mb-1"
              title="Muat Semula Data"
            >
              <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <div className="text-[9px] text-slate-500 leading-none whitespace-nowrap mr-1">
              {isLoading ? 'Sedang mengemaskini...' : `Terakhir dikemaskini: ${lastRefresh || '—'}`}
            </div>
          </div>
        </div>
      )}

      {/* Lower row for daerah tabs */}
      {visibleDaerahTabs.length > 0 && (
        <div className="px-4 md:px-8 flex flex-col sm:flex-row sm:items-center overflow-x-auto">
          <div className="flex gap-0 flex-1 items-center">
            {visibleDaerahTabs.map(tab => (
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
          <div className="sm:ml-auto flex items-center gap-2 pl-4 py-2 sm:py-0 self-end sm:self-auto mb-2 sm:mb-0">
            <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">📆 Pilih Tarikh:</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border-2 border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none bg-white focus:border-[#003087] cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
