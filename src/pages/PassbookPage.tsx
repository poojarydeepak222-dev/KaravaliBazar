import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowDownCircle, ArrowUpCircle, Gamepad2, Trophy, Filter, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import BottomNav from '@/components/layout/BottomNav';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bid' | 'win';
  description: string;
  amount: number;
  status: string;
  created_at: string;
  credit: boolean;
}

const PassbookPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'bid' | 'win'>('all');

  useEffect(() => {
    if (!user) return;
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    setLoading(true);
    const [deps, wds, bids] = await Promise.all([
      supabase.from('deposits').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('withdrawals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('bids').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
    ]);

    const all: Transaction[] = [];

    (deps.data || []).forEach((d: any) => all.push({
      id: d.id, type: 'deposit',
      description: `Deposit via Cashfree`,
      amount: d.amount, status: d.status, created_at: d.created_at, credit: true,
    }));

    (wds.data || []).forEach((w: any) => all.push({
      id: w.id, type: 'withdrawal',
      description: `Withdrawal to ${w.upi_id?.slice(0, 12) || 'bank'}`,
      amount: w.amount, status: w.status, created_at: w.created_at, credit: false,
    }));

    (bids.data || []).forEach((b: any) => {
      all.push({
        id: b.id + '_bid', type: 'bid',
        description: `${b.game_name} — ${b.bid_type} #${b.number} (${b.session})`,
        amount: b.amount, status: b.status, created_at: b.created_at, credit: false,
      });
      if (b.won_amount > 0) {
        all.push({
          id: b.id + '_win', type: 'win',
          description: `Win: ${b.game_name} — ${b.bid_type} #${b.number}`,
          amount: b.won_amount, status: 'won', created_at: b.created_at, credit: true,
        });
      }
    });

    // Sort all by date desc
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setTransactions(all);
    setLoading(false);
  };

  const filtered = filter === 'all' ? transactions : transactions.filter(t => t.type === filter);

  // Running balance calculation (simplified — show total credits vs debits)
  const totalCredit = transactions.filter(t => t.credit && t.status === 'approved').reduce((s, t) => s + t.amount, 0);
  const totalDebit = transactions.filter(t => !t.credit && t.status !== 'rejected').reduce((s, t) => s + t.amount, 0);

  const typeConfig = {
    deposit: { icon: ArrowDownCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Deposit' },
    withdrawal: { icon: ArrowUpCircle, color: 'text-red-500', bg: 'bg-red-50', label: 'Withdrawal' },
    bid: { icon: Gamepad2, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Bid' },
    win: { icon: Trophy, color: 'text-yellow-500', bg: 'bg-yellow-50', label: 'Win' },
  };

  const statusColors: Record<string, string> = {
    approved: 'text-green-600 bg-green-50',
    pending: 'text-yellow-600 bg-yellow-50',
    rejected: 'text-red-500 bg-red-50',
    won: 'text-yellow-600 bg-yellow-50',
    lost: 'text-gray-500 bg-gray-50',
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-white" />
            <p className="text-white font-black text-xl">Passbook</p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <div className="mx-4 mt-4 rounded-2xl shadow-lg overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="px-5 py-4 relative">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <p className="text-white/70 text-xs font-semibold mb-1 relative z-10">Current Balance</p>
          <p className="text-4xl font-black text-white relative z-10">₹{(user?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <div className="flex gap-6 mt-3 relative z-10">
            <div>
              <p className="text-white/60 text-[10px] font-semibold tracking-wide">TOTAL IN</p>
              <p className="text-green-300 font-black text-base">+₹{totalCredit.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <p className="text-white/60 text-[10px] font-semibold tracking-wide">TOTAL OUT</p>
              <p className="text-red-300 font-black text-base">-₹{totalDebit.toLocaleString('en-IN')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 mt-4">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {(['all', 'deposit', 'withdrawal', 'bid', 'win'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${filter === f ? 'text-white border-transparent shadow' : 'bg-white border-gray-200 text-gray-500'}`}
              style={filter === f ? { background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' } : {}}>
              {f === 'all' && <Filter size={11} />}
              {f !== 'all' && (() => { const cfg = typeConfig[f]; return <cfg.icon size={11} />; })()}
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 mt-3">
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="font-bold text-gray-500">No transactions found</p>
            <p className="text-gray-400 text-sm mt-1">Your transaction history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((txn) => {
              const cfg = typeConfig[txn.type];
              const Icon = cfg.icon;
              return (
                <div key={txn.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100 flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <Icon size={20} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate">{txn.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${statusColors[txn.status] || 'text-gray-500 bg-gray-50'}`}>
                        {txn.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-gray-400">{new Date(txn.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-black text-base ${txn.credit ? 'text-green-600' : 'text-red-500'}`}>
                      {txn.credit ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default PassbookPage;
