import { isPeg } from '../lib/utils';

interface Props {
  categories: string[];
  data: any[];
  minRows?: number;
}

export default function LainLainTable({ categories, data, minRows = 0 }: Props) {
  const counts: Record<string, { peg: number, apr: number }> = {};
  categories.forEach(c => { counts[c] = { peg: 0, apr: 0 }; });

  data.forEach(d => {
    const j = String(d.jenis || '').toUpperCase();
    for (const cat of categories) {
      if (j.includes(cat.toUpperCase()) || 
          (cat.includes('(') && j.includes(cat.split('(')[1].replace(')', '').trim()))) {
        if (isPeg(d)) counts[cat].peg++; else counts[cat].apr++;
        break;
      }
    }
  });

  const totalPeg = categories.reduce((sum, cat) => sum + counts[cat].peg, 0);
  const totalApr = categories.reduce((sum, cat) => sum + counts[cat].apr, 0);

  const emptyRowsCount = Math.max(0, minRows - categories.length);

  return (
    <div className="border border-black overflow-hidden flex-1">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-black">
            <th className="bg-[#bfbfbf] border-r border-black p-1 text-left uppercase font-bold">LAIN-LAIN TUGAS</th>
            <th className="bg-[#ffc000] border-r border-black p-1 w-12 text-center font-bold">PEG</th>
            <th className="bg-[#00b0f0] p-1 w-12 text-center font-bold text-white">APR</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, idx) => (
            <tr key={idx} className="border-b border-black bg-[#fff2cc] h-7">
              <td className="border-r border-black p-1 text-left font-semibold uppercase">{cat}</td>
              <td className="border-r border-black p-1 text-center font-bold">{counts[cat].peg || ''}</td>
              <td className="p-1 text-center font-bold">{counts[cat].apr || ''}</td>
            </tr>
          ))}
          {Array.from({ length: emptyRowsCount }).map((_, idx) => (
            <tr key={`empty-${idx}`} className="border-b border-black bg-[#fff2cc] h-7">
              <td className="border-r border-black p-1"></td>
              <td className="border-r border-black p-1"></td>
              <td className="p-1"></td>
            </tr>
          ))}
          <tr className="bg-[#fff2cc] h-7">
            <td className="border-r border-black p-1 text-right font-bold uppercase pr-2">TOTAL</td>
            <td className="border-r border-black p-1 text-center font-bold">{totalPeg || ''}</td>
            <td className="p-1 text-center font-bold">{totalApr || ''}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
