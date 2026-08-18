import { useState, useEffect } from 'react';
import { Save, X, Edit2, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Game, ChartResult } from '@/types';
import { toast } from 'sonner';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAY_KEYS: DayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const getWeekRange = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    week_start: mon.toISOString().split('T')[0],
    week_end: sun.toISOString().split('T')[0],
    monDate: mon,
  };
};

const formatDateShort = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }).toUpperCase();



const AdminChart = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [charts, setCharts] = useState<ChartResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRow, setEditRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, string>>({});
  const [saveLoading, setSaveLoading] = useState(false);

  // Per-cell jodi color: stored in DB per chart row (jodi_colors JSONB column)
  // { mon: 'red', tue: 'black', ... } per chart row
  const [jodiColors, setJodiColors] = useState<Record<string, Record<string, 'red' | 'black'>>>({});

  const [showAddWeek, setShowAddWeek] = useState(false);
  const [newWeekDate, setNewWeekDate] = useState(new Date().toISOString().split('T')[0]);

  const toggleCellColor = async (chartId: string, day: string) => {
    setJodiColors(prev => {
      const rowColors = { ...(prev[chartId] || {}) };
      rowColors[day] = rowColors[day] === 'red' ? 'black' : 'red';
      const updated = { ...prev, [chartId]: rowColors };
      // Persist to DB asynchronously
      supabase.from('chart_results')
        .update({ jodi_colors: updated[chartId] })
        .eq('id', chartId)
        .then(({ error }) => { if (error) console.error('Color save error:', error); });
      return updated;
    });
  };

  const getCellColor = (chartId: string, day: string): 'red' | 'black' =>
    (jodiColors[chartId]?.[day]) || 'black';

  useEffect(() => {
    supabase.from('games').select('id, name').eq('is_active', true).order('sort_order').then(({ data }) => {
      if (data) { setGames(data as Game[]); if (data.length > 0) setSelectedGame(data[0] as Game); }
    });
  }, []);

  useEffect(() => {
    if (selectedGame) fetchCharts();
  }, [selectedGame]);

  const fetchCharts = async () => {
    if (!selectedGame) return;
    setLoading(true);
    const { data } = await supabase
      .from('chart_results')
      .select('*')
      .eq('game_id', selectedGame.id)
      .order('week_start', { ascending: false })
      .limit(52);
    if (data) {
      setCharts(data as ChartResult[]);
      // Load per-row jodi colors from DB
      const colorMap: Record<string, Record<string, 'red' | 'black'>> = {};
      data.forEach((row: any) => {
        if (row.jodi_colors) colorMap[row.id] = row.jodi_colors;
      });
      setJodiColors(colorMap);
    }
    setLoading(false);
  };

  const startEdit = (row: ChartResult) => {
    setEditRow(row.id);
    const d: Record<string, string> = {};
    DAY_KEYS.forEach(day => {
      d[`${day}_open`] = (row as any)[`${day}_open`] || '';
      d[`${day}_jodi`] = (row as any)[`${day}_jodi`] || '';
      d[`${day}_close`] = (row as any)[`${day}_close`] || '';
    });
    setEditData(d);
  };

  const handleSave = async () => {
    if (!editRow) return;
    setSaveLoading(true);
    const { error } = await supabase.from('chart_results').update(editData).eq('id', editRow);
    setSaveLoading(false);
    if (error) return toast.error('Failed to save chart');
    toast.success('Chart updated!');
    setEditRow(null);
    setEditData({});
    fetchCharts();
  };

  const handleDeleteRow = async (id: string) => {
    if (!confirm('Delete this week row?')) return;
    await supabase.from('chart_results').delete().eq('id', id);
    toast.success('Row deleted');
    fetchCharts();
  };

  const handleAddWeek = async () => {
    if (!selectedGame || !newWeekDate) return;
    const { week_start, week_end } = getWeekRange(new Date(newWeekDate));
    const { data: existing } = await supabase.from('chart_results')
      .select('id').eq('game_id', selectedGame.id).eq('week_start', week_start).single();
    if (existing) return toast.error('Week already exists — click Edit to update it');
    const { error } = await supabase.from('chart_results').insert({ game_id: selectedGame.id, week_start, week_end });
    if (error) return toast.error('Failed to add week');
    toast.success('Week row added!');
    setShowAddWeek(false);
    fetchCharts();
  };

  return (
    <div className="p-4 pb-6">
      <h1 className="text-lg font-black text-gray-800 mb-4">Chart Editor</h1>

      {/* Game Selector */}
      <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 mb-4">
        <p className="text-xs font-bold text-gray-500 mb-2">Select Game</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {games.map(g => (
            <button key={g.id} onClick={() => setSelectedGame(g)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${selectedGame?.id === g.id ? 'border-orange-400 text-orange-500 bg-orange-50' : 'border-gray-200 text-gray-500'}`}>
              {g.name}
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-3 gap-2">
        <p className="text-xs text-gray-400 font-semibold italic">Tap any Jodi number to toggle its color</p>
        <button onClick={() => setShowAddWeek(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold shrink-0"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
          <Plus size={14} /> Add Week
        </button>
      </div>

      {/* Add Week Modal */}
      {showAddWeek && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-gray-800 mb-3">Add New Week</h3>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Pick any date in the week</label>
            <input type="date" value={newWeekDate} onChange={e => setNewWeekDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400 mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowAddWeek(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">Cancel</button>
              <button onClick={handleAddWeek} className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>Add Week</button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 mb-4 text-xs">
        <span className="text-orange-500 font-bold">OP = Open Pana</span>
        <span className="font-bold text-gray-700">J = Jodi <span className="text-red-400">(tap to color red)</span></span>
        <span className="text-blue-500 font-bold">CP = Close Pana</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-4">
          {charts.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="font-semibold">No chart data yet</p>
              <p className="text-sm">Add a week row to get started</p>
            </div>
          )}
          {charts.map(row => {
            const isEditing = editRow === row.id;
            return (
              <div key={row.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${isEditing ? 'border-orange-300' : 'border-gray-100'}`}>
                {/* Row Header */}
                <div className={`flex items-center justify-between px-4 py-2.5 ${isEditing ? 'bg-orange-50' : 'bg-gray-50'} border-b border-gray-100`}>
                  <p className="text-xs font-black text-gray-700">
                    {formatDateShort(row.week_start)} — {formatDateShort(row.week_end)}
                  </p>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <>
                        <button onClick={() => { setEditRow(null); setEditData({}); }}
                          className="p-1.5 bg-gray-100 rounded-lg"><X size={14} className="text-gray-500" /></button>
                        <button onClick={handleSave} disabled={saveLoading}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold bg-green-500 disabled:opacity-60">
                          <Save size={12} /> {saveLoading ? 'Saving...' : 'Save'}
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(row)} className="p-1.5 bg-orange-50 rounded-lg border border-orange-200">
                          <Edit2 size={14} className="text-orange-500" />
                        </button>
                        <button onClick={() => handleDeleteRow(row.id)} className="p-1.5 bg-red-50 rounded-lg border border-red-200">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Day Columns */}
                {isEditing ? (
                  <div className="p-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-gray-500 font-bold pb-2 text-center w-10">Day</th>
                          <th className="text-orange-500 font-bold pb-2 text-center">Open Pana</th>
                          <th className="text-gray-700 font-bold pb-2 text-center">Jodi</th>
                          <th className="text-blue-500 font-bold pb-2 text-center">Close Pana</th>
                        </tr>
                      </thead>
                      <tbody>
                        {DAY_KEYS.map((day, i) => {
                          const cellColor = getCellColor(row.id, day);
                          return (
                            <tr key={day} className={i % 2 === 0 ? '' : 'bg-gray-50/50'}>
                              <td className="py-1.5 text-center">
                                <span className="text-xs font-black text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{DAYS[i]}</span>
                              </td>
                              <td className="py-1.5 px-1">
                                <input type="text" maxLength={3} inputMode="numeric"
                                  value={editData[`${day}_open`] || ''}
                                  onChange={e => setEditData(d => ({ ...d, [`${day}_open`]: e.target.value.replace(/\D/g, '') }))}
                                  placeholder="---"
                                  className="w-full border border-orange-200 rounded-lg px-2 py-1.5 text-center text-sm font-black bg-orange-50 outline-none focus:border-orange-400 font-mono tracking-widest" />
                              </td>
                              <td className="py-1.5 px-1">
                                <div className="flex flex-col items-center gap-1">
                                  <input type="text" maxLength={2} inputMode="numeric"
                                    value={editData[`${day}_jodi`] || ''}
                                    onChange={e => setEditData(d => ({ ...d, [`${day}_jodi`]: e.target.value.replace(/\D/g, '') }))}
                                    placeholder="--"
                                    className={`w-full border rounded-lg px-2 py-1.5 text-center text-sm font-black outline-none font-mono tracking-widest ${cellColor === 'red' ? 'border-red-300 bg-red-50 text-red-500 focus:border-red-400' : 'border-gray-200 bg-gray-50 text-gray-900 focus:border-gray-400'}`} />
                                  {/* Color toggle button per cell */}
                                  <button
                                    type="button"
                                    onClick={() => toggleCellColor(row.id, day)}
                                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border transition-all ${cellColor === 'red' ? 'border-red-300 text-red-500 bg-red-50' : 'border-gray-300 text-gray-500 bg-gray-50'}`}>
                                    {cellColor === 'red' ? '🔴 Red' : '⚫ Black'}
                                  </button>
                                </div>
                              </td>
                              <td className="py-1.5 px-1">
                                <input type="text" maxLength={3} inputMode="numeric"
                                  value={editData[`${day}_close`] || ''}
                                  onChange={e => setEditData(d => ({ ...d, [`${day}_close`]: e.target.value.replace(/\D/g, '') }))}
                                  placeholder="---"
                                  className="w-full border border-blue-200 rounded-lg px-2 py-1.5 text-center text-sm font-black bg-blue-50 outline-none focus:border-blue-400 font-mono tracking-widest" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Read-only mode: tap jodi to toggle color */
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          {DAYS.map(d => (
                            <th key={d} className="text-center px-1 py-1.5 text-gray-500 font-bold border-r border-gray-100 last:border-r-0 min-w-[48px]">{d}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {DAY_KEYS.map(day => {
                            const open = (row as any)[`${day}_open`];
                            const jodi = (row as any)[`${day}_jodi`];
                            const close = (row as any)[`${day}_close`];
                            const hasData = open || jodi || close;
                            const cellColor = getCellColor(row.id, day);
                            return (
                              <td key={day} className="text-center px-1 py-2 border-r border-gray-100 last:border-r-0">
                                {hasData ? (
                                  <div className="flex flex-col items-center gap-0">
                                    <span className="text-orange-500 font-black text-[10px] leading-tight">{open || '**'}</span>
                                    {/* Tappable jodi — toggles color per cell */}
                                    <button
                                      onClick={() => toggleCellColor(row.id, day)}
                                      title="Tap to toggle jodi color"
                                      className={`font-black text-sm leading-tight hover:opacity-70 active:scale-95 transition-all ${cellColor === 'red' ? 'text-red-500' : 'text-gray-900'}`}>
                                      {jodi || '**'}
                                    </button>
                                    <span className="text-blue-500 font-black text-[10px] leading-tight">{close || '**'}</span>
                                  </div>
                                ) : (
                                  <span className="text-gray-200 font-bold">**</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminChart;
