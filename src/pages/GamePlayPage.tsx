import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Send, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Game } from '@/types';
import { toast } from 'sonner';

const BID_TYPES = [
  { id: 'single', label: 'Single Digit', rate: '7x', digits: 1 },
  { id: 'jodi', label: 'Jodi', rate: '90x', digits: 2 },
  { id: 'single_panna', label: 'Single Panna', rate: '150x', digits: 3 },
  { id: 'double_panna', label: 'Double Panna', rate: '300x', digits: 3 },
  { id: 'triple_panna', label: 'Triple Panna', rate: '700x', digits: 3 },
];

/**
 * Canonical pana form:
 * Sort digits ascending. If sorted form starts with 0, move zeros to the end.
 * e.g. digits 1,2,0 → sorted 012 → has leading 0 → canonical = 120 ✓
 *      digits 3,2,1 → sorted 123 → no leading 0  → canonical = 123 ✗ (input was 321)
 */
const getCanonicalPana = (num: string): string => {
  const sorted = num.split('').sort().join('');
  const nonZeros = sorted.replace(/^0+/, '');
  const zeroCount = sorted.length - nonZeros.length;
  return nonZeros + '0'.repeat(zeroCount);
};

// Validation: returns error string or null
const validateNumber = (type: string, num: string): string | null => {
  if (!num) return 'Enter a number';
  if (!/^\d+$/.test(num)) return 'Digits only';
  if (type === 'single') {
    if (num.length !== 1) return 'Single: exactly 1 digit (0–9)';
  } else if (type === 'jodi') {
    if (num.length !== 2) return 'Jodi: exactly 2 digits (00–99)';
  } else if (type === 'single_panna') {
    if (num.length !== 3) return 'Single Panna: exactly 3 digits';
    const digits = num.split('').map(Number);
    const unique = new Set(digits);
    if (unique.size < 3) return 'Single Panna: all 3 digits must be different';
    const canonical = getCanonicalPana(num);
    if (num !== canonical) return `Enter in order: ${canonical} (not ${num})`;
  } else if (type === 'double_panna') {
    if (num.length !== 3) return 'Double Panna: exactly 3 digits';
    const counts = num.split('').reduce((acc: Record<string,number>, d) => { acc[d] = (acc[d]||0)+1; return acc; }, {});
    const vals = Object.values(counts);
    if (!vals.includes(2)) return 'Double Panna: exactly 2 digits must be the same';
    const canonical = getCanonicalPana(num);
    if (num !== canonical) return `Enter in order: ${canonical} (not ${num})`;
  } else if (type === 'triple_panna') {
    if (num.length !== 3) return 'Triple Panna: exactly 3 digits';
    if (num[0] !== num[1] || num[1] !== num[2]) return 'Triple Panna: all 3 digits must be the same (e.g. 555)';
  }
  return null;
};

interface BidEntry { type: string; number: string; amount: string; }

const GamePlayPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, updateBalance } = useAuth();
  const [game, setGame] = useState<Game | null>(null);
  const [selectedType, setSelectedType] = useState('single');
  const [session, setSession] = useState('open');
  const [bids, setBids] = useState<BidEntry[]>([{ type: 'single', number: '', amount: '' }]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      supabase.from('games').select('*').eq('id', id).single().then(({ data }) => {
        if (data) {
          setGame(data);
          // If open pana already declared, force close session
          if (data.open_pana && !data.close_pana) {
            setSession('close');
          }
        }
      });
    }
  }, [id]);

  // Open session is locked when:
  // 1. Admin has declared open pana result (partial result declared)
  // 2. Game status is running_for_close (past open_time)
  const openLocked = !!game?.open_pana || game?.status === 'running_for_close';
  const availableSessions = openLocked ? ['close'] : ['open', 'close'];

  const currentType = BID_TYPES.find(t => t.id === selectedType) ?? BID_TYPES[0];

  const addBid = () => setBids([...bids, { type: selectedType, number: '', amount: '' }]);
  const removeBid = (i: number) => setBids(bids.filter((_, idx) => idx !== i));
  const updateBid = (i: number, field: keyof BidEntry, val: string) => {
    const updated = [...bids];
    updated[i] = { ...updated[i], [field]: val };
    setBids(updated);
  };

  const totalAmount = bids.reduce((s, b) => s + (parseFloat(b.amount) || 0), 0);

  const handleSubmit = async () => {
    if (!user || !game) return;
    if (game.status === 'closed') return toast.error('This game is closed');
    if (game.status !== 'open' && game.status !== 'running_for_close') return toast.error('Bidding is not open right now');
    // Strictly block open session bids when running_for_close or open pana declared
    if (session === 'open' && openLocked) return toast.error('Open session is closed. Only close bids accepted now.');
    const validBids = bids.filter(b => b.number || b.amount);
    if (validBids.length === 0) return toast.error('Add at least one bid');
    // Strict validation
    for (const b of validBids) {
      const numErr = validateNumber(b.type || selectedType, b.number);
      if (numErr) { toast.error(numErr); return; }
      if (!b.amount || parseFloat(b.amount) < 10) { toast.error('Minimum bid amount is ₹10'); return; }
    }
    const allValid = validBids.filter(b => b.number && b.amount && parseFloat(b.amount) >= 10);
    if (allValid.length === 0) return toast.error('No valid bids to submit');
    if (totalAmount > user.balance) return toast.error('Insufficient balance');
    setLoading(true);
    const inserts = allValid.map(b => ({
      user_id: user.id, game_id: game.id, game_name: game.name,
      bid_type: b.type, number: b.number, amount: parseFloat(b.amount), session, status: 'pending'
    }));
    const { error } = await supabase.from('bids').insert(inserts);
    if (error) { setLoading(false); return toast.error('Failed to place bid'); }
    const newBalance = user.balance - totalAmount;
    await supabase.from('app_users').update({ balance: newBalance }).eq('id', user.id);
    updateBalance(newBalance);
    setLoading(false);
    toast.success(`₹${totalAmount} bid placed successfully!`);
    navigate('/my-bids');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <div className="flex-1">
            <p className="text-white font-black text-lg">{game?.name || 'Play Game'}</p>
            <p className="text-white/70 text-xs">{game?.open_time} - {game?.close_time}</p>
          </div>
          <div className="text-right">
            <p className="text-white/70 text-xs">Balance</p>
            <p className="text-white font-bold">₹{(user?.balance || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Open pana declared notice */}
      {openLocked && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 flex items-center gap-2">
          <AlertCircle size={16} className="text-yellow-600 shrink-0" />
          <p className="text-yellow-700 text-sm font-semibold">
            Open Pana <span className="font-black text-orange-500">{game?.open_pana}</span> declared — only <strong>Close session</strong> bids are accepted
          </p>
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        {/* Session */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-600 mb-2">Select Session</p>
          <div className="flex gap-3">
            {['open', 'close'].map(s => {
              const isLocked = s === 'open' && openLocked;
              return (
                <button key={s} onClick={() => !isLocked && setSession(s)}
                  disabled={isLocked}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    session === s ? 'border-orange-400 text-orange-500 bg-orange-50' : 'border-gray-200 text-gray-400'
                  } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}>
                  {s.toUpperCase()}
                  {isLocked && <span className="ml-1 text-xs">(Closed)</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bid Type */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm font-bold text-gray-600 mb-2">Bid Type</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {BID_TYPES.map(t => (
              <button key={t.id} onClick={() => { setSelectedType(t.id); setBids([{ type: t.id, number: '', amount: '' }]); }}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold border-2 transition-all ${selectedType === t.id ? 'border-orange-400 text-orange-500 bg-orange-50' : 'border-gray-200 text-gray-500'}`}>
                <div>{t.label}</div>
                <div className="text-orange-500">{t.rate}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Bids */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-gray-700">Enter Bids</p>
            <button onClick={addBid} className="flex items-center gap-1 text-orange-500 text-sm font-semibold">
              <Plus size={16} /> Add
            </button>
          </div>
          {/* Number format hint */}
          <div className="mb-2 bg-orange-50 rounded-xl px-3 py-2 text-xs text-orange-600 font-semibold">
            {currentType.id === 'single' && 'Enter single digit: 0 – 9'}
            {currentType.id === 'jodi' && 'Enter 2-digit jodi: e.g. 05, 47, 99'}
            {currentType.id === 'single_panna' && 'Enter pana in order: e.g. 123 ✓, 235 ✓, 120 ✓ | 321 ✗, 532 ✗, 021 ✗'}
            {currentType.id === 'double_panna' && 'Digits in order: e.g. 112 ✓, 233 ✓ | 211 ✗, 332 ✗'}
            {currentType.id === 'triple_panna' && 'Enter 3-digit triple pana: e.g. 555'}
          </div>
          <div className="space-y-3">
            {bids.map((bid, i) => (
              <div key={i} className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder={currentType.id === 'single' ? '0–9' : currentType.id === 'jodi' ? 'e.g. 47' : 'e.g. 234'}
                    value={bid.number}
                    maxLength={currentType.digits}
                    onChange={e => updateBid(i, 'number', e.target.value.replace(/\D/g, ''))}
                    className={`w-full border-2 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none font-black text-center tracking-widest text-lg transition-colors ${
                      bid.number && validateNumber(selectedType, bid.number)
                        ? 'border-red-400 bg-red-50'
                        : bid.number && !validateNumber(selectedType, bid.number)
                        ? 'border-green-400 bg-green-50'
                        : 'border-gray-200 focus:border-orange-400'
                    }`}
                  />
                  {bid.number && validateNumber(selectedType, bid.number) && (
                    <p className="text-[10px] text-red-500 font-semibold mt-0.5 text-center">
                      {validateNumber(selectedType, bid.number)}
                    </p>
                  )}
                </div>
                <input type="number" placeholder="₹ Amount" value={bid.amount} onChange={e => updateBid(i, 'amount', e.target.value)}
                  className="w-28 border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 outline-none focus:border-orange-400" />
                {bids.length > 1 && (
                  <button onClick={() => removeBid(i)} className="text-red-400 p-1"><Trash2 size={18} /></button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Total */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Total Bid Amount</p>
            <p className="text-2xl font-black text-gray-800">₹{totalAmount.toLocaleString('en-IN')}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Available</p>
            <p className="text-sm font-bold text-green-600">₹{(user?.balance || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading || (game?.status !== 'open' && game?.status !== 'running_for_close')}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-black text-lg shadow-lg active:scale-95 transition-transform disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
          <Send size={20} />
          {loading ? 'Placing Bid...' : (game?.status === 'closed' || game?.status === 'upcoming') ? 'GAME CLOSED' : 'PLACE BID'}
        </button>
      </div>
    </div>
  );
};

export default GamePlayPage;
