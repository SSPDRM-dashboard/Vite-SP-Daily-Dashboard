import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normaliseDate(str: string) {
  if (!str) return '';
  str = str.trim();

  if (str.includes('T')) {
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const parts = new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d);
    const get = (t: string) => parts.find(p => p.type === t)?.value || '0';
    return parseInt(get('day')) + '/' + parseInt(get('month')) + '/' + get('year');
  }

  if (str.includes('-')) {
    const p = str.split('-');
    if (p.length === 3) {
      const d = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
      if (!isNaN(d.getTime())) return d.getDate() + '/' + (d.getMonth() + 1) + '/' + d.getFullYear();
    }
  }

  const p = str.split('/');
  if (p.length === 3) return parseInt(p[0]) + '/' + parseInt(p[1]) + '/' + p[2];

  return str;
}

export function normDaerah(s: string) {
  return String(s || '').toUpperCase().replace(/\s+/g, ' ').trim();
}

export function formatTimestamp(raw: string) {
  if (!raw || raw === '') return '—';
  const s = String(raw).trim();
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
    }
  }
  return s;
}

export function formatTime(val: string | number) {
  if (!val || val === '' || val === '0') return '—';
  const s = String(val).trim();
  if (/^\d{1,2}:\d{2}/.test(s)) { const p = s.split(':'); return p[0].padStart(2, '0') + ':' + p[1]; }
  const match = s.match(/(\d{1,2}):(\d{2}):\d{2}/);
  if (match) return match[1].padStart(2, '0') + ':' + match[2];
  if (s.includes('T')) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return new Intl.DateTimeFormat('ms-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: '2-digit', minute: '2-digit' }).format(d);
    }
  }
  const num = parseFloat(s);
  if (!isNaN(num) && num > 0 && num < 1) { const t = Math.round(num * 24 * 60); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  return s;
}

export function normalizeJenis(j: string) {
  if (!j) return 'LAIN-LAIN TUGAS';
  const u = j.toUpperCase().trim();
  const checks = [
    { keys: ['SJR'], val: 'SJR' },
    { keys: ['MPV'], val: 'MPV' },
    { keys: ['PERTANYAAN', 'PEJABAT PERTANYAAN'], val: 'PEJABAT PERTANYAAN' },
    { keys: ['DCC'], val: 'DCC' },
    { keys: ['SENTRI', 'PROWLER'], val: 'SENTRI / PROWLER' },
    { keys: ['BIT', 'RONDAAN'], val: 'BIT/RONDAAN' },
    { keys: ['PENTADBIRAN', 'ADMIN'], val: 'TUGAS PENTADBIRAN' },
    { keys: ['PERJUMPAAN/MESYUARAT', 'MESYUARAT / PERJUMPAAN', 'PERJUMPAAN', 'MESYUARAT'], val: 'MESYUARAT / PERJUMPAAN' },
  ];
  for (const c of checks) { if (c.keys.some(k => u.includes(k))) return c.val; }
  return 'LAIN-LAIN TUGAS';
}

export function badgeClass(j: string) {
  if (!j) return '';
  const u = j.toUpperCase();
  if (u.includes('LAIN')) return 'bg-green-100 text-green-800';
  if (u.includes('PERTANYAAN') || u.includes('PEJABAT')) return 'bg-yellow-100 text-yellow-800';
  if (u.includes('SJR')) return 'bg-pink-100 text-pink-800';
  if (u.includes('MPV')) return 'bg-pink-100 text-pink-800';
  if (u.includes('DCC')) return 'bg-green-100 text-green-800';
  if (u.includes('SENTRI') || u.includes('PROWLER')) return 'bg-yellow-100 text-yellow-800';
  if (u.includes('BIT') || u.includes('RONDAAN')) return 'bg-blue-100 text-blue-800';
  if (u.includes('PENTADBIRAN')) return 'bg-pink-100 text-pink-800';
  if (u.includes('PERJUMPAAN') || u.includes('MESYUARAT')) return 'bg-purple-100 text-purple-800';
  return 'bg-blue-100 text-blue-800';
}

export function isPeg(d: any) {
  const p = String(d.pejawatan || '').toUpperCase().trim();
  const pangkat = String(d.pangkat || '').toUpperCase().trim();
  if (p.includes('PEG') || p.includes('PEGAWAI')) return true;
  if (pangkat.includes('INSP') || pangkat.includes('DSP') || pangkat.includes('ASP') || pangkat.includes('SUPT') || pangkat.includes('DCP') || pangkat.includes('CP') || pangkat.includes('KPP') || pangkat.includes('KDSP') || pangkat.includes('ACP')) return true;
  return false;
}

export function countBy(data: any[], key: string) {
  const m: Record<string, number> = {};
  data.forEach(d => { const v = d[key] || 'Lain'; m[v] = (m[v] || 0) + 1; });
  return m;
}

export function calculateEndTime(startTime: string, durationHours: number): string {
  if (!startTime || startTime === '—' || !durationHours) return '—';
  
  const match = startTime.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    const match2 = startTime.match(/^(\d{2})(\d{2})$/);
    if (!match2) return '—';
    let h = parseInt(match2[1], 10);
    let m = parseInt(match2[2], 10);
    
    const extraMinutes = Math.round((durationHours % 1) * 60);
    const extraHours = Math.floor(durationHours);
    
    m += extraMinutes;
    if (m >= 60) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
    
    h = (h + extraHours) % 24;
    return `${String(h).padStart(2, '0')}${String(m).padStart(2, '0')}`;
  }
  
  let h = parseInt(match[1], 10);
  let m = parseInt(match[2], 10);
  
  const extraMinutes = Math.round((durationHours % 1) * 60);
  const extraHours = Math.floor(durationHours);
  
  m += extraMinutes;
  if (m >= 60) {
    h += Math.floor(m / 60);
    m = m % 60;
  }
  
  h = (h + extraHours) % 24;
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function expandRows(rows: any[]) {
  const out: any[] = [];
  let lastDaerah = '';
  
  rows.forEach((row, rowIdx) => {
    // Handle both array format (from Google Sheets) and object format (from Firestore)
    const isArray = Array.isArray(row);
    
    if (!isArray) {
      out.push(row);
      return;
    }

    const timestamp = String(row[0] || '');
    let daerah = normDaerah(row[1]);
    
    // Inherit daerah if empty (common in manual sheets)
    if (!daerah && lastDaerah) {
      daerah = lastDaerah;
    } else if (daerah) {
      lastDaerah = daerah;
    }

    if (!daerah) return;

    // Common fields for all people in this row
    const bertugas = String(row[10] || '').trim() || '—';
    const pejawatan = String(row[12] || '').trim();
    const jantina = String(row[13] || '').trim();
    const pangkat = String(row[14] || '').trim();
    
    let tarikh = String(row[15] || '').trim();
    if (tarikh) tarikh = normaliseDate(tarikh);
    else if (timestamp) tarikh = normaliseDate(timestamp);
    
    let jenis = normalizeJenis(String(row[16] || '').trim());
    let lain = String(row[19] || '').trim();
    let colY = String(row[24] || '').trim();
    
    if ((jenis.includes('MESYUARAT') || jenis.includes('PERJUMPAAN')) && colY) {
      jenis = `${jenis} / ${colY}`;
      colY = ''; // Clear it so it doesn't get printed again in the UI
    } else if ((lain.includes('MESYUARAT') || lain.includes('PERJUMPAAN')) && colY) {
      lain = `${lain} / ${colY}`;
      colY = '';
    }

    const masa = formatTime(row[17]);
    const jam = parseFloat(row[18]) || 0;
    
    let masaTamat = formatTime(row[23] || '');
    if (masa && masa !== '—' && jam > 0) {
      masaTamat = calculateEndTime(masa, jam);
    }

    // Check all 4 possible person slots in the row
    // Slot 1: [2, 3], Slot 2: [4, 5], Slot 3: [6, 7], Slot 4: [8, 9]
    const slots = [
      { b: 2, n: 3 },
      { b: 4, n: 5 },
      { b: 6, n: 7 },
      { b: 8, n: 9 }
    ];

    // Create a combined search text for the entire row to make searching easier
    const rowSearchText = slots.map(s => String(row[s.n] || '')).join(' ') + ' ' + String(row[11] || '');

    slots.forEach((slot, slotIdx) => {
      const balaiVal = String(row[slot.b] || '').trim();
      const namaVal = String(row[slot.n] || '').trim();

      // If there's a name or a balai in this slot, it's a valid assignment
      if (namaVal || (balaiVal && balaiVal !== '—')) {
        let noBadan = '';
        
        // Column 11 is the No Badan column. 
        const sharedNoBadan = String(row[11] || '').trim();
        
        // Extract noBadan from nama if it's there (e.g., "AHMAD (39824)")
        // More flexible regex to catch IDs like 39824, RF39824, G/39824 etc.
        if (namaVal) {
          const match = namaVal.match(/([A-Z0-9/]{2,10}\d{3,7}|\b\d{4,7}\b)/i);
          if (match) {
            noBadan = match[0];
          }
        }

        // If no ID found in name, use the shared No Badan column
        if (!noBadan) {
          noBadan = sharedNoBadan;
        }

        out.push({ 
          id: `${timestamp}-${rowIdx}-${slotIdx}`,
          sheetRow: rowIdx + 2, // Map to Google Sheet row (header is 1)
          timestamp, 
          daerah, 
          balai: balaiVal || '—', 
          nama: namaVal || balaiVal, 
          bertugas, 
          pejawatan, 
          jantina, 
          pangkat, 
          jenis, 
          jam, 
          masa, 
          masaTamat, 
          tarikh, 
          lain,
          colY,
          noBadan,
          rowSearchText // Add this for easier searching in CarianTab
        });
      }
    });
  });
  return out;
}
