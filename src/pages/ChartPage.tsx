import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Game, ChartResult } from '@/types';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const formatDate = (d: string) => {
  const date = new Date(d);
  return date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
};

const ChartPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [charts, setCharts] = useState<ChartResult[]>([]);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (!id) return;
    supabase.from('games').select('*').eq('id', id).single().then(({ data }) => { if (data) setGame(data); });
    supabase.from('chart_results').select('*').eq('game_id', id).order('week_start', { ascending: true }).limit(104)
      .then(({ data }) => {
        if (data) {
          // Oldest week at top, newest at bottom
          const sorted = [...data].sort((a, b) => a.week_start.localeCompare(b.week_start));
          setCharts(sorted);
        }
      });
  }, [id]);

  const getDayData = (row: ChartResult, day: DayKey) => {
    const open = row[`${day}_open` as keyof ChartResult] as string | null;
    const jodi = row[`${day}_jodi` as keyof ChartResult] as string | null;
    const close = row[`${day}_close` as keyof ChartResult] as string | null;
    // Fallback to old mon_result style
    const legacy = row[`${day}_result` as keyof ChartResult] as string | null;
    return { open, jodi, close, legacy };
  };

  // Filter charts by selected year — show weeks that start in the selected year (oldest first)
  const filteredCharts = charts.filter(row => new Date(row.week_start).getFullYear() === year);

  const hasPanaData = filteredCharts.some(row =>
    DAY_KEYS.some(day => row[`${day}_open` as keyof ChartResult] || row[`${day}_jodi` as keyof ChartResult])
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <div className="flex-1">
            <p className="text-white font-black text-lg">{game?.name}</p>
            <p className="text-white/70 text-xs">Weekly Result Chart</p>
          </div>
        </div>
      </div>

      {/* Year Selector */}
      <div className="flex items-center justify-center gap-6 py-3 bg-gray-50 border-b border-gray-200">
        <button onClick={() => setYear(y => y - 1)} className="p-1 text-gray-600"><ChevronLeft size={20} /></button>
        <span className="font-black text-gray-700 text-lg">{year}</span>
        <button onClick={() => setYear(y => y + 1)} className="p-1 text-gray-600"><ChevronRight size={20} /></button>
      </div>

      {/* Legend */}
      {hasPanaData && (
        <div className="flex items-center gap-4 px-4 py-2 bg-orange-50 border-b border-orange-100 text-xs">
          <span className="text-orange-500 font-bold">● Open Pana</span>
          <span className="text-gray-800 font-bold">● Jodi</span>
          <span className="text-blue-500 font-bold">● Close Pana</span>
        </div>
      )}

      {/* Chart Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="text-left px-3 py-2 text-xs font-bold text-gray-600 border-r border-gray-200 whitespace-nowrap sticky left-0 bg-gray-100">Date</th>
              {DAYS.map(d => (
                <th key={d} className="text-center px-2 py-2 text-xs font-bold text-gray-600 border-r border-gray-200 min-w-[56px]">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredCharts.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-12 text-gray-400 text-sm">No chart data for {year}</td>
              </tr>
            )}
            {filteredCharts.map((row, idx) => (
              <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-3 py-3 border-r border-gray-100 text-xs text-gray-500 whitespace-nowrap font-medium leading-tight sticky left-0" style={{ background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                  <div>{formatDate(row.week_start)}</div>
                  <div className="text-gray-300 text-center">TO</div>
                  <div>{formatDate(row.week_end)}</div>
                </td>
                {DAY_KEYS.map((day) => {
                  const { open, jodi, close, legacy } = getDayData(row, day);
                  const hasPana = open || jodi || close;
                  return (
                    <td key={day} className="text-center px-1 py-2 border-r border-gray-100 min-w-[56px]">
                      {hasPana ? (
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-black text-orange-500 leading-none">{open || '**'}</span>
                          <span className="text-base font-black leading-none"
                            style={{ color: ((row as any).jodi_colors?.[day]) === 'red' ? '#EF4444' : '#111827' }}>
                            {jodi || '**'}
                          </span>
                          <span className="text-xs font-black text-blue-500 leading-none">{close || '**'}</span>
                        </div>
                      ) : legacy ? (
                        <span className="text-base font-black text-gray-800">{legacy}</span>
                      ) : (
                        <span className="text-gray-300 font-bold text-sm">**</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredCharts.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="text-5xl mb-3">📊</div>
          <p className="text-gray-700 font-bold text-lg">No Results Yet</p>
          <p className="text-gray-400 text-sm mt-1">Chart data will appear here once results are declared</p>
        </div>
      )}
    </div>
  );
};

export default ChartPage;
