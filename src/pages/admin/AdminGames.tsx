import { useState, useEffect } from 'react';
import { Plus, Edit2, Trophy, Save, X, Download, FileText, CheckCircle2, Loader2, Power, RotateCcw, EraserIcon, Eraser } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Game, Bid } from '@/types';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['upcoming', 'open', 'running_for_close', 'closed'];

// Admin manually force-open or force-close a market
const ADMIN_CONTROL_LABELS: Record<string, { label: string; next: string; color: string }> = {
  upcoming:          { label: 'Force Open',         next: 'open',             color: '#22C55E' },
  open:              { label: 'Close Open Bidding',  next: 'running_for_close', color: '#3B82F6' },
  running_for_close: { label: 'Close Market',        next: 'closed',           color: '#EF4444' },
  closed:            { label: 'Reopen (Upcoming)',   next: 'upcoming',         color: '#F59E0B' },
};

const STATUS_LABELS: Record<string, string> = {
  upcoming: 'Upcoming',
  open: 'Open',
  running_for_close: 'Running For Close',
  closed: 'Closed',
};

const getDayKey = (date: Date) => {
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  return days[date.getDay()];
};

const getWeekRange = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const mon = new Date(d);
  mon.setDate(d.getDate() + diffToMon);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    week_start: mon.toISOString().split('T')[0],
    week_end: sun.toISOString().split('T')[0],
  };
};

// Calculate single digit from pana
const panaToSingle = (pana: string): string => {
  if (!pana || pana.length < 2) return '?';
  const sum = pana.split('').reduce((acc, d) => acc + parseInt(d || '0', 10), 0);
  return String(sum % 10);
};

const AdminGames = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', market_open_time: '05:00 AM', open_time: '', close_time: '', status: 'upcoming' });
  const [showAdd, setShowAdd] = useState(false);
  const [declareGame, setDeclareGame] = useState<Game | null>(null);
  const [declareForm, setDeclareForm] = useState({ open_pana: '', jodi: '', single_override: '', close_pana: '', declare_type: 'open' as 'open' | 'full' });
  const [declareLoading, setDeclareLoading] = useState(false);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const [downloadGame, setDownloadGame] = useState<Game | null>(null);
  const [downloadBids, setDownloadBids] = useState<any[]>([]);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadDateFrom, setDownloadDateFrom] = useState('');
  const [downloadDateTo, setDownloadDateTo] = useState('');
  const [refundGame, setRefundGame] = useState<Game | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);
  const [resetResultGame, setResetResultGame] = useState<Game | null>(null);
  const [resetResultLoading, setResetResultLoading] = useState(false);

  // Reset declared result on user & public dashboards
  const handleResetResult = async () => {
    if (!resetResultGame) return;
    setResetResultLoading(true);
    const { error } = await supabase.from('games').update({
      open_pana: null,
      jodi: null,
      close_pana: null,
      current_result: '***_**_***',
    }).eq('id', resetResultGame.id);
    setResetResultLoading(false);
    if (error) return toast.error('Failed to reset result');
    toast.success(`Result cleared for ${resetResultGame.name} — dashboards updated`);
    setResetResultGame(null);
    fetchGames();
  };

  // Refund all pending bids for a game on current date
  const handleRefundAll = async () => {
    if (!refundGame) return;
    setRefundLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const { data: bids, error } = await supabase
      .from('bids')
      .select('*')
      .eq('game_id', refundGame.id)
      .eq('status', 'pending')
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString());

    if (error || !bids || bids.length === 0) {
      setRefundLoading(false);
      setRefundGame(null);
      return toast.info(bids?.length === 0 ? 'No pending bids to refund today' : 'Failed to fetch bids');
    }

    // Group refunds by user
    const refunds: Record<string, number> = {};
    for (const bid of bids) {
      refunds[bid.user_id] = (refunds[bid.user_id] || 0) + parseFloat(bid.amount);
    }

    // Mark bids as refunded
    const bidIds = bids.map(b => b.id);
    await supabase.from('bids').update({ status: 'refunded', won_amount: 0 }).in('id', bidIds);

    // Credit refund amounts back to users
    let refundedUsers = 0;
    for (const [userId, amount] of Object.entries(refunds)) {
      const { data: u } = await supabase.from('app_users').select('balance').eq('id', userId).single();
      if (u) {
        await supabase.from('app_users').update({ balance: parseFloat(String(u.balance || 0)) + amount }).eq('id', userId);
        refundedUsers++;
      }
    }

    setRefundLoading(false);
    setRefundGame(null);
    toast.success(`Refunded ${bids.length} bids to ${refundedUsers} users for ${refundGame.name}`);
    fetchGames();
  };

  const handleAdminControl = async (game: Game) => {
    const ctrl = ADMIN_CONTROL_LABELS[game.status];
    if (!ctrl) return;
    const { error } = await supabase.from('games').update({ status: ctrl.next }).eq('id', game.id);
    if (error) return toast.error('Failed to update status');
    toast.success(`Market ${ctrl.next.replace(/_/g, ' ')} — status updated`);
    fetchGames();
  };

  const fetchGames = async () => {
    const { data } = await supabase.from('games').select('*').order('sort_order');
    if (data) setGames(data);
    setLoading(false);
  };

  useEffect(() => { fetchGames(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.open_time || !form.close_time) return toast.error('Fill all required fields');
    if (!form.market_open_time) return toast.error('Set market open time');
    if (editId) {
      const { error } = await supabase.from('games').update({
        name: form.name,
        market_open_time: form.market_open_time,
        open_time: form.open_time,
        close_time: form.close_time,
        status: form.status,
      }).eq('id', editId);
      if (error) return toast.error('Update failed');
      setEditId(null);
    } else {
      const { error } = await supabase.from('games').insert({ ...form, current_result: '***_**_***', is_active: true, sort_order: games.length + 1 });
      if (error) return toast.error('Add failed');
      setShowAdd(false);
    }
    setForm({ name: '', market_open_time: '05:00 AM', open_time: '', close_time: '', status: 'upcoming' });
    fetchGames();
    toast.success('Game saved!');
  };

  // Win/Loss Auto Settlement for a declared result
  const runSettlement = async (
    gameId: string,
    open_pana: string,
    jodi: string,
    close_pana: string,
    singleOverride?: string // admin-set single digit for jodi (overrides last digit of jodi)
  ) => {
    setSettlementLoading(true);

    // Fetch ALL pending bids for this game (both open and close sessions)
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select('*')
      .eq('game_id', gameId)
      .eq('status', 'pending');

    if (bidsError) { console.error('Settlement fetch error:', bidsError); setSettlementLoading(false); return; }
    if (!bids || bids.length === 0) { setSettlementLoading(false); return; }

    // Fetch payout rates from settings
    const { data: settingsData } = await supabase.from('settings').select('key, value');
    const rates: Record<string, number> = {};
    (settingsData || []).forEach((s: any) => { rates[s.key] = parseFloat(s.value) || 0; });

    const singleRate     = rates.single_rate        || 7;
    const jodiRate       = rates.jodi_rate          || 70;
    const panaRate       = rates.panna_rate         || 120;
    const doublePanaRate = rates.double_panna_rate  || 270;
    const triplePanaRate = rates.triple_panna_rate  || 600;

    // Derive single digits
    const openDigit  = panaToSingle(open_pana);
    const closeDigit = panaToSingle(close_pana);
    // For jodi single, use admin override if provided, else last digit of jodi
    const jodiSingle = singleOverride || (jodi.length >= 1 ? jodi[jodi.length - 1] : closeDigit);

    // Classify pana type
    const getPanaType = (pana: string): 'single_panna' | 'double_panna' | 'triple_panna' => {
      const digits = pana.split('');
      const unique = new Set(digits).size;
      if (unique === 1) return 'triple_panna';
      if (unique === 2) return 'double_panna';
      return 'single_panna';
    };

    let wonCount = 0;
    let lostCount = 0;
    // Track balance credits: accumulate per user to minimize DB calls
    const balanceCredits: Record<string, number> = {};

    for (const bid of bids) {
      let won = false;
      let wonAmt = 0;
      const bidType = bid.bid_type;
      const bidNum  = bid.number;
      const bidSess = bid.session || 'open';

      if (bidType === 'single') {
        // Single digit: compare to open or close single digit based on session
        const targetDigit = bidSess === 'open' ? openDigit : closeDigit;
        if (bidNum === targetDigit) { won = true; wonAmt = bid.amount * singleRate; }

      } else if (bidType === 'jodi') {
        // Jodi: must match exact 2-digit jodi
        if (bidNum === jodi) { won = true; wonAmt = bid.amount * jodiRate; }

      } else if (bidType === 'single_panna') {
        const targetPana = bidSess === 'open' ? open_pana : close_pana;
        if (bidNum === targetPana && getPanaType(targetPana) === 'single_panna') {
          won = true; wonAmt = bid.amount * panaRate;
        }

      } else if (bidType === 'double_panna') {
        const targetPana = bidSess === 'open' ? open_pana : close_pana;
        if (bidNum === targetPana && getPanaType(targetPana) === 'double_panna') {
          won = true; wonAmt = bid.amount * doublePanaRate;
        }

      } else if (bidType === 'triple_panna') {
        const targetPana = bidSess === 'open' ? open_pana : close_pana;
        if (bidNum === targetPana && getPanaType(targetPana) === 'triple_panna') {
          won = true; wonAmt = bid.amount * triplePanaRate;
        }

      } else if (bidType === 'pana' || bidType === 'open_pana') {
        // Legacy bid_type fallback
        const targetPana = bidSess === 'open' ? open_pana : close_pana;
        if (bidNum === targetPana) { won = true; wonAmt = bid.amount * panaRate; }

      } else if (bidType === 'close_pana') {
        if (bidNum === close_pana) { won = true; wonAmt = bid.amount * panaRate; }
      }

      if (won && wonAmt > 0) {
        await supabase.from('bids').update({ status: 'won', won_amount: wonAmt }).eq('id', bid.id);
        balanceCredits[bid.user_id] = (balanceCredits[bid.user_id] || 0) + wonAmt;
        wonCount++;
      } else {
        await supabase.from('bids').update({ status: 'lost', won_amount: 0 }).eq('id', bid.id);
        lostCount++;
      }
    }

    // Credit all winners in batch (fetch once per user)
    for (const [userId, credit] of Object.entries(balanceCredits)) {
      const { data: u } = await supabase.from('app_users').select('balance').eq('id', userId).single();
      if (u) {
        const newBalance = parseFloat(String(u.balance || 0)) + credit;
        await supabase.from('app_users').update({ balance: newBalance }).eq('id', userId);
        console.log(`Credited ₹${credit} to user ${userId}, new balance: ${newBalance}`);
      }
    }

    setSettlementLoading(false);
    toast.success(`Settlement complete: ${wonCount} won, ${lostCount} lost`);
  };

  const handleDeclare = async () => {
    if (!declareGame) return;
    const { declare_type, open_pana, jodi, close_pana } = declareForm;
    setDeclareLoading(true);

    if (declare_type === 'open') {
      if (!open_pana.trim()) { setDeclareLoading(false); return toast.error('Enter Open Pana'); }
      await supabase.from('games').update({
        open_pana: open_pana.trim(),
        jodi: null,
        close_pana: null,
        current_result: `${open_pana.trim()}_**_***`,
        status: 'open',
      }).eq('id', declareGame.id);
      setDeclareLoading(false);
      toast.success('Open Pana declared! Close session open for play.');
    } else {
      if (!open_pana.trim() || !jodi.trim() || !close_pana.trim()) {
        setDeclareLoading(false);
        return toast.error('Fill Open Pana, Jodi, and Close Pana');
      }

      // Save full result to game
      await supabase.from('games').update({
        open_pana: open_pana.trim(),
        jodi: jodi.trim(),
        close_pana: close_pana.trim(),
        current_result: `${open_pana.trim()}_${jodi.trim()}_${close_pana.trim()}`,
        status: 'closed',
      }).eq('id', declareGame.id);

      // Auto-save to chart
      const today = new Date();
      const dayKey = getDayKey(today);
      const { week_start, week_end } = getWeekRange(today);

      const { data: existing } = await supabase.from('chart_results')
        .select('id')
        .eq('game_id', declareGame.id)
        .eq('week_start', week_start)
        .single();

      const chartData: Record<string, string> = {
        [`${dayKey}_open`]: open_pana.trim(),
        [`${dayKey}_jodi`]: jodi.trim(),
        [`${dayKey}_close`]: close_pana.trim(),
        [`${dayKey}_result`]: jodi.trim(),
      };

      if (existing) {
        await supabase.from('chart_results').update(chartData).eq('id', existing.id);
      } else {
        await supabase.from('chart_results').insert({
          game_id: declareGame.id,
          week_start,
          week_end,
          ...chartData,
        });
      }

      // Auto-run win/loss settlement with correct single override
      await runSettlement(declareGame.id, open_pana.trim(), jodi.trim(), close_pana.trim(), declareForm.single_override || undefined);

      setDeclareLoading(false);
      toast.success('Full result declared, chart updated, settlement done!');
    }

    setDeclareGame(null);
    setDeclareForm({ open_pana: '', jodi: '', single_override: '', close_pana: '', declare_type: 'open' });
    fetchGames();
  };

  const handleDownload = async (game: Game) => {
    setDownloadGame(game);
    setDownloadBids([]);
    // Default dates: today
    const today = new Date().toISOString().split('T')[0];
    setDownloadDateFrom(today);
    setDownloadDateTo(today);
  };

  const fetchDownloadBids = async () => {
    if (!downloadGame) return;
    setDownloadLoading(true);
    let query = supabase.from('bids').select('*, app_users(name, mobile)').eq('game_id', downloadGame.id).order('created_at', { ascending: false });
    if (downloadDateFrom) query = query.gte('created_at', downloadDateFrom + 'T00:00:00');
    if (downloadDateTo) query = query.lte('created_at', downloadDateTo + 'T23:59:59');
    const { data } = await query;
    if (data) setDownloadBids(data);
    setDownloadLoading(false);
  };

  const generatePDF = () => {
    if (!downloadGame) return;
    const rows = downloadBids.map((b: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${new Date(b.created_at).toLocaleDateString('en-IN')}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${downloadGame.name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${b.bid_type} #${b.number} (${b.session})</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;color:${b.status === 'won' ? 'green' : b.status === 'lost' ? 'red' : '#333'};">₹${b.amount} ${b.status === 'won' ? `[WON ₹${b.won_amount}]` : b.status === 'lost' ? '[LOST]' : '[PENDING]'}</td>
      </tr>
    `).join('');
    const total = downloadBids.reduce((s: number, b: any) => s + b.amount, 0);
    const totalWon = downloadBids.filter((b: any) => b.status === 'won').reduce((s: number, b: any) => s + b.won_amount, 0);
    const html = `<!DOCTYPE html><html><head><title>${downloadGame.name} - Bid History</title>
      <style>body{font-family:Arial,sans-serif;margin:20px;color:#333;}h1{color:#FF6B1A;font-size:20px;}h2{font-size:15px;color:#555;}
      table{width:100%;border-collapse:collapse;margin-top:15px;}th{background:#FF6B1A;color:white;padding:8px 10px;text-align:left;font-size:12px;}
      td{font-size:12px;}.total{text-align:right;margin-top:10px;font-weight:bold;font-size:14px;}</style></head><body>
      <h1>KARAVALI BAZAR</h1><h2>Market: ${downloadGame.name}</h2>
      <p style="font-size:12px;color:#888;">Generated: ${new Date().toLocaleString('en-IN')} | Total Bids: ${downloadBids.length}</p>
      <table><thead><tr><th>Date</th><th>Market</th><th>Bid</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <div class="total">Total Bid Amount: ₹${total.toLocaleString('en-IN')} | Total Payout: ₹${totalWon.toLocaleString('en-IN')}</div>
      </body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
    setDownloadGame(null);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-black text-gray-800">Games ({games.length})</h1>
        <button onClick={() => { setShowAdd(true); setEditId(null); setForm({ name: '', open_time: '', close_time: '', status: 'upcoming' }); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-bold"
          style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
          <Plus size={16} /> Add Game
        </button>
      </div>

      {(showAdd || editId) && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-orange-200 mb-4">
          <h3 className="font-bold text-gray-700 mb-3 text-sm">{editId ? 'Edit Game' : 'Add New Game'}</h3>
          <div className="space-y-2">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Game Name (e.g. KARAVALI MORNING)"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400 font-bold" />
            <div className="bg-green-50 border border-green-100 rounded-xl px-3 py-2 text-xs text-green-800 space-y-0.5">
              <p className="font-bold">Market Daily Time Cycle:</p>
              <p>🟢 <span className="font-semibold">Market Opens At</span> → bidding starts</p>
              <p>🟡 <span className="font-semibold">Open Bidding Closes At</span> → only close bids allowed</p>
              <p>🔴 <span className="font-semibold">Close Bidding Closes At</span> → market closed, awaits result</p>
            </div>
            <div>
              <label className="text-[10px] font-bold text-green-600 mb-0.5 block">MARKET OPENS AT (Daily bidding start)</label>
              <input value={form.market_open_time} onChange={e => setForm({ ...form, market_open_time: e.target.value })} placeholder="05:00 AM"
                className="w-full border border-green-200 rounded-xl px-3 py-2.5 text-sm bg-green-50 outline-none focus:border-green-400 font-semibold" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] font-bold text-orange-500 mb-0.5 block">OPEN BIDDING CLOSES AT</label>
                <input value={form.open_time} onChange={e => setForm({ ...form, open_time: e.target.value })} placeholder="10:00 AM"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400" />
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-bold text-blue-500 mb-0.5 block">CLOSE BIDDING CLOSES AT</label>
                <input value={form.close_time} onChange={e => setForm({ ...form, close_time: e.target.value })} placeholder="11:00 AM"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400" />
              </div>
            </div>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400">
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
            </select>
            <div className="flex gap-2">
              <button onClick={handleSave} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                <Save size={14} /> Save
              </button>
              <button onClick={() => { setShowAdd(false); setEditId(null); }} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">
                <X size={14} className="inline mr-1" />Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-3">
          {games.map(game => (
            <div key={game.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800">{game.name}</p>
                  <p className="text-xs text-gray-400">
                <span className="text-green-500">Opens:</span> {(game as any).market_open_time || '05:00 AM'} &nbsp;·&nbsp;
                <span className="text-orange-400">Open Close:</span> {game.open_time} &nbsp;·&nbsp;
                <span className="text-blue-400">Close:</span> {game.close_time}
              </p>
                  {(game.open_pana || game.jodi || game.close_pana) ? (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-bold">OP: {game.open_pana || '***'}</span>
                      <span className="text-xs bg-gray-50 text-gray-700 px-2 py-0.5 rounded font-black">J: {game.jodi || '**'}</span>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold">CP: {game.close_pana || '***'}</span>
                    </div>
                  ) : (
                    <p className="font-mono text-sm text-gray-600 mt-0.5">{game.current_result}</p>
                  )}
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${
                    game.status === 'open' ? 'bg-green-100 text-green-600' :
                    game.status === 'running_for_close' ? 'bg-blue-100 text-blue-600' :
                    game.status === 'closed' ? 'bg-red-100 text-red-500' : 'bg-yellow-100 text-yellow-700'}`}>
                    {STATUS_LABELS[game.status] || game.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 ml-2">
                  <button onClick={() => { setEditId(game.id); setForm({ name: game.name, market_open_time: (game as any).market_open_time || '05:00 AM', open_time: game.open_time, close_time: game.close_time, status: game.status }); setShowAdd(false); }}
                    className="p-2 bg-orange-50 rounded-lg" title="Edit Game"><Edit2 size={14} className="text-orange-500" /></button>
                  <button onClick={() => { setDeclareGame(game); setDeclareForm({ open_pana: game.open_pana || '', jodi: game.jodi || '', single_override: '', close_pana: game.close_pana || '', declare_type: game.open_pana && !game.jodi ? 'full' : 'open' }); }}
                    className="p-2 bg-green-50 rounded-lg" title="Declare Result"><Trophy size={14} className="text-green-500" /></button>
                  <button
                    onClick={() => handleAdminControl(game)}
                    title={ADMIN_CONTROL_LABELS[game.status]?.label || 'Control'}
                    className="p-2 rounded-lg"
                    style={{ background: `${ADMIN_CONTROL_LABELS[game.status]?.color}18` }}>
                    <Power size={14} style={{ color: ADMIN_CONTROL_LABELS[game.status]?.color }} />
                  </button>
                  <button onClick={() => setRefundGame(game)}
                    className="p-2 bg-red-50 rounded-lg" title="Refund All Today's Bids"><RotateCcw size={14} className="text-red-500" /></button>
                  <button onClick={() => setResetResultGame(game)}
                    className="p-2 bg-purple-50 rounded-lg" title="Reset Displayed Result"><Eraser size={14} className="text-purple-500" /></button>
                  <button onClick={() => handleDownload(game)}
                    className="p-2 bg-blue-50 rounded-lg" title="Download PDF"><Download size={14} className="text-blue-500" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Declare Result Modal */}
      {declareGame && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50">
          <div className="bg-white rounded-t-3xl p-5 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-black text-gray-800 mb-1">Declare Result</h3>
            <p className="text-sm font-bold mb-3" style={{ color: '#FF6B1A' }}>{declareGame.name}</p>

            <div className="flex gap-2 mb-4">
              <button onClick={() => setDeclareForm(f => ({ ...f, declare_type: 'open' }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${declareForm.declare_type === 'open' ? 'border-orange-400 text-orange-500 bg-orange-50' : 'border-gray-200 text-gray-400'}`}>
                Open Only
              </button>
              <button onClick={() => setDeclareForm(f => ({ ...f, declare_type: 'full' }))}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all ${declareForm.declare_type === 'full' ? 'border-green-400 text-green-600 bg-green-50' : 'border-gray-200 text-gray-400'}`}>
                Full Result
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-orange-500 mb-1 block">OPEN PANA (3 digits)</label>
                <input maxLength={3} value={declareForm.open_pana}
                  onChange={e => setDeclareForm(f => ({ ...f, open_pana: e.target.value.replace(/\D/g, '') }))}
                  placeholder="e.g. 234"
                  className="w-full border-2 border-orange-200 rounded-xl px-4 py-3 text-xl bg-orange-50 outline-none focus:border-orange-400 font-black text-center tracking-widest" />

              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">JODI (2 digits)</label>
                <input maxLength={2} value={declareForm.jodi}
                  onChange={e => {
                    const j = e.target.value.replace(/\D/g, '');
                    // Auto-fill single from last digit of jodi unless admin already overrode
                    setDeclareForm(f => ({ ...f, jodi: j, single_override: f.single_override === '' ? (j.length >= 1 ? j[j.length - 1] : '') : f.single_override }));
                  }}
                  placeholder="e.g. 56"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-xl bg-gray-50 outline-none focus:border-gray-400 font-black text-center tracking-widest" />
                {/* Single digit — admin can set it manually; auto-derived from last digit of jodi */}
                <div className="mt-2">
                  <label className="text-xs font-bold text-purple-500 mb-1 block">SINGLE DIGIT (shown to users)</label>
                  <div className="flex items-center gap-3">
                    <input
                      maxLength={1}
                      inputMode="numeric"
                      value={declareForm.single_override}
                      onChange={e => setDeclareForm(f => ({ ...f, single_override: e.target.value.replace(/\D/g, '') }))}
                      placeholder={declareForm.jodi.length >= 1 ? declareForm.jodi[declareForm.jodi.length - 1] : '?'}
                      className="w-20 border-2 border-purple-300 rounded-xl px-2 py-3 text-2xl bg-purple-50 outline-none focus:border-purple-500 font-black text-center tracking-widest"
                    />
                    <p className="text-xs text-gray-400 leading-relaxed">Auto-filled from last digit of Jodi.<br/>Override manually if needed.</p>
                  </div>
                </div>
              </div>

              {declareForm.declare_type === 'full' && (
                <div>
                  <label className="text-xs font-bold text-blue-500 mb-1 block">CLOSE PANA (3 digits)</label>
                  <input maxLength={3} value={declareForm.close_pana}
                    onChange={e => setDeclareForm(f => ({ ...f, close_pana: e.target.value.replace(/\D/g, '') }))}
                    placeholder="e.g. 789"
                    className="w-full border-2 border-blue-200 rounded-xl px-4 py-3 text-xl bg-blue-50 outline-none focus:border-blue-400 font-black text-center tracking-widest" />
                  {declareForm.close_pana.length === 3 && (
                    <p className="text-xs text-blue-500 text-center mt-1 font-semibold">Single Digit: {panaToSingle(declareForm.close_pana)}</p>
                  )}
                </div>
              )}

              {declareForm.declare_type === 'open' && (
                <div className="bg-yellow-50 rounded-xl px-3 py-2 border border-yellow-200">
                  <p className="text-xs text-yellow-700 font-semibold">⚠️ Open declared — users can only play Close session next.</p>
                </div>
              )}
              {declareForm.declare_type === 'full' && (
                <div className="bg-green-50 rounded-xl px-3 py-2 border border-green-200 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-green-600" />
                    <p className="text-xs text-green-700 font-semibold">Chart auto-updated for today</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-green-600" />
                    <p className="text-xs text-green-700 font-semibold">Win/loss settlement runs automatically</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <button onClick={() => setDeclareGame(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">Cancel</button>
              <button onClick={handleDeclare} disabled={declareLoading || settlementLoading}
                className="flex-1 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                {(declareLoading || settlementLoading) ? <><Loader2 size={14} className="animate-spin" /> Processing...</> : declareForm.declare_type === 'open' ? 'Declare Open' : 'Declare & Settle'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Result Modal */}
      {resetResultGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <Eraser size={20} className="text-purple-500" />
              <h3 className="font-black text-gray-800">Reset Displayed Result</h3>
            </div>
            <p className="text-sm font-bold mb-3" style={{ color: '#FF6B1A' }}>{resetResultGame.name}</p>
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-purple-700 font-semibold leading-relaxed">
                This will <strong>clear the declared result</strong> (Open Pana, Jodi, Close Pana) shown on both the{' '}
                <strong>User Dashboard</strong> and <strong>Public Landing Page</strong>,
                resetting them back to <span className="font-mono">*** | ** | ***</span>.
              </p>
              <p className="text-xs text-purple-500 mt-1.5 font-medium">⚠️ Bid history and settlement data remain unchanged.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setResetResultGame(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">Cancel</button>
              <button onClick={handleResetResult} disabled={resetResultLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                {resetResultLoading ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
                {resetResultLoading ? 'Resetting...' : 'Reset Result'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refundGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <RotateCcw size={20} className="text-red-500" />
              <h3 className="font-black text-gray-800">Refund All Today's Bids</h3>
            </div>
            <p className="text-sm font-bold mb-3" style={{ color: '#FF6B1A' }}>{refundGame.name}</p>
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
              <p className="text-sm text-red-700 font-semibold leading-relaxed">
                This will refund <strong>all pending bids</strong> placed today for this market back to each user's balance and mark them as <strong>refunded</strong>.
              </p>
              <p className="text-xs text-red-500 mt-1.5 font-medium">⚠️ This action cannot be undone.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRefundGame(null)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">Cancel</button>
              <button onClick={handleRefundAll} disabled={refundLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-white text-sm font-bold disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}>
                {refundLoading ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                {refundLoading ? 'Refunding...' : 'Refund All'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download PDF Modal */}
      {downloadGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={20} className="text-orange-500" />
              <h3 className="font-black text-gray-800">Download Bid History</h3>
            </div>
            <p className="text-sm text-orange-500 font-bold mb-3">{downloadGame.name}</p>
            <div className="space-y-2 mb-3">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">From Date</label>
                <input type="date" value={downloadDateFrom} onChange={e => setDownloadDateFrom(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">To Date</label>
                <input type="date" value={downloadDateTo} onChange={e => setDownloadDateTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400" />
              </div>
              <button onClick={fetchDownloadBids} className="w-full py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                Fetch Bids
              </button>
            </div>
            {downloadLoading ? (
              <div className="flex justify-center py-4"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
            ) : downloadBids.length > 0 ? (
              <>
                <p className="text-sm text-gray-500 mb-3">Found <span className="font-bold text-gray-800">{downloadBids.length}</span> bids</p>
                <div className="flex gap-2">
                  <button onClick={() => setDownloadGame(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">Cancel</button>
                  <button onClick={generatePDF} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-sm font-bold" style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                    <Download size={14} /> Print / PDF
                  </button>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setDownloadGame(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">Cancel</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminGames;
