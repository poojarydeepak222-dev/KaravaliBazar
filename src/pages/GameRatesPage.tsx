import { useState, useEffect } from 'react';
import { ArrowLeft, Info, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import BottomNav from '@/components/layout/BottomNav';

interface RateRow {
  type: string;
  key: string;
  description: string;
  digits: string;
  color: string;
  bg: string;
  border: string;
  defaultRate: number;
}

const RATE_META: RateRow[] = [
  {
    type: 'Single Digit', key: 'single_rate',
    description: 'Pick one digit (0–9). If the open/close digit matches, you win!',
    digits: '1 digit (0–9)', color: '#FF6B1A', bg: '#FFF0E8', border: '#FFD5B8', defaultRate: 7,
  },
  {
    type: 'Jodi', key: 'jodi_rate',
    description: 'Pick a 2-digit pair (00–99) matching the final jodi result.',
    digits: '2 digits (00–99)', color: '#8B5CF6', bg: '#F3EEFF', border: '#DDD0FF', defaultRate: 70,
  },
  {
    type: 'Single Panna', key: 'panna_rate',
    description: '3-digit number. All digits different (non-repeating), in ascending order.',
    digits: '3 digits (e.g. 123)', color: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0', defaultRate: 120,
  },
  {
    type: 'Double Panna', key: 'double_panna_rate',
    description: '3-digit number where exactly two digits are the same.',
    digits: '3 digits (e.g. 224)', color: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC', defaultRate: 270,
  },
  {
    type: 'Triple Panna', key: 'triple_panna_rate',
    description: '3-digit number where all three digits are the same.',
    digits: '3 digits (e.g. 555)', color: '#F43F5E', bg: '#FFF1F2', border: '#FECDD3', defaultRate: 600,
  },
];

const EXAMPLE_BETS = [10, 50, 100, 500];

const GameRatesPage = () => {
  const navigate = useNavigate();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('settings').select('key, value')
      .in('key', RATE_META.map(r => r.key))
      .then(({ data }) => {
        const map: Record<string, number> = {};
        (data || []).forEach((s: any) => { map[s.key] = parseFloat(s.value) || 0; });
        setRates(map);
        setLoading(false);
      });
  }, []);

  const getRate = (meta: RateRow) => rates[meta.key] || meta.defaultRate;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-4">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <div>
            <p className="text-white font-black text-xl">Game Rates</p>
            <p className="text-white/70 text-xs">Karavali Bazar Payout Chart</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Banner */}
        <div className="rounded-2xl p-4 text-white relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
          <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/10" />
          <Zap size={28} className="text-white/80 mb-2" />
          <p className="font-black text-xl relative z-10">Win Big Every Day!</p>
          <p className="text-white/80 text-sm relative z-10 mt-1">
            Place bids on any market — up to{' '}
            <span className="font-black text-yellow-300">
              {loading ? '...' : `${Math.max(...RATE_META.map(r => getRate(r)))}x`}
            </span>{' '}
            returns
          </p>
        </div>

        {/* Bid Type Cards */}
        <p className="text-sm font-black text-gray-700 uppercase tracking-wider px-1">Bid Types & Rates</p>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          RATE_META.map(meta => {
            const rate = getRate(meta);
            const exampleWin = (100 * rate).toLocaleString('en-IN');
            return (
              <div key={meta.type} className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: meta.border }}>
                <div className="flex items-center gap-3 px-4 py-3" style={{ background: meta.bg }}>
                  <div className="flex-1">
                    <p className="font-black text-gray-800 text-base">{meta.type}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: meta.color }}>{meta.digits}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black" style={{ color: meta.color }}>{rate}x</p>
                    <p className="text-xs text-gray-400 font-semibold">payout</p>
                  </div>
                </div>
                <div className="px-4 py-3 border-t" style={{ borderColor: meta.border }}>
                  <p className="text-xs text-gray-500 leading-relaxed mb-2">{meta.description}</p>
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ background: meta.bg }}>
                    <Info size={13} style={{ color: meta.color }} className="shrink-0" />
                    <p className="text-xs font-bold" style={{ color: meta.color }}>
                      Bet ₹100 → Win ₹{exampleWin}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Dynamic Payout Table */}
        {!loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
              <p className="text-white font-black text-sm">Quick Payout Reference Table</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2.5 text-left font-bold text-gray-600">Bet ₹</th>
                    <th className="px-3 py-2.5 text-right font-bold text-orange-500">
                      Single ({rates.single_rate || 7}x)
                    </th>
                    <th className="px-3 py-2.5 text-right font-bold text-purple-500">
                      Jodi ({rates.jodi_rate || 70}x)
                    </th>
                    <th className="px-3 py-2.5 text-right font-bold text-green-600">
                      Panna ({rates.panna_rate || 120}x)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_BETS.map((bet, i) => (
                    <tr key={bet} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="px-3 py-2.5 font-black text-gray-800">₹{bet.toLocaleString('en-IN')}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-orange-500">
                        ₹{(bet * (rates.single_rate || 7)).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-purple-500">
                        ₹{(bet * (rates.jodi_rate || 70)).toLocaleString('en-IN')}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold text-green-600">
                        ₹{(bet * (rates.panna_rate || 120)).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-black text-amber-700 mb-1">Important Note</p>
          <ul className="text-xs text-amber-600 space-y-1 list-disc list-inside">
            <li>Minimum bid amount is ₹10 per entry</li>
            <li>Winnings are auto-credited after result declaration</li>
            <li>Open pana declared = only close session bids accepted</li>
            <li>18+ only. Play responsibly.</li>
          </ul>
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default GameRatesPage;
