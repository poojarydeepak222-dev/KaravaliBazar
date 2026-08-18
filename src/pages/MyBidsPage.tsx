import { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Bid } from '@/types';
import BottomNav from '@/components/layout/BottomNav';

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
};

const MyBidsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchBids = async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from('bids').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) setBids(data);
    setLoading(false);
  };

  useEffect(() => { fetchBids(); }, [filter]);

  const totalBid = bids.reduce((s, b) => s + b.amount, 0);
  const totalWon = bids.filter(b => b.status === 'won').reduce((s, b) => s + b.won_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <p className="text-white font-black text-xl">My Bids</p>
          <button onClick={fetchBids} className="ml-auto text-white"><RefreshCw size={20} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 px-4 pt-4">
        <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-xl font-black text-gray-800">{bids.length}</p>
          <p className="text-xs text-gray-400">Total Bids</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-xl font-black text-orange-500">₹{totalBid.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400">Total Amount</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-gray-100 text-center">
          <p className="text-xl font-black text-green-600">₹{totalWon.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400">Total Won</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 px-4 mt-3 overflow-x-auto scrollbar-hide pb-1">
        {['all', 'pending', 'won', 'lost'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === f ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-500'}`}
            style={filter === f ? { background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' } : {}}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Bids List */}
      <div className="px-4 mt-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
        ) : bids.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🎯</p>
            <p className="text-gray-500 font-medium">No bids found</p>
          </div>
        ) : bids.map(bid => (
          <div key={bid.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-bold text-gray-800 text-sm">{bid.game_name}</p>
                <p className="text-xs text-gray-400">{bid.bid_type.replace('_', ' ').toUpperCase()} • {bid.session.toUpperCase()} • #{bid.number}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusStyle[bid.status]}`}>{bid.status.toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400">Bid Amount</p>
                <p className="font-black text-gray-700">₹{bid.amount.toLocaleString('en-IN')}</p>
              </div>
              {bid.status === 'won' && (
                <div className="text-right">
                  <p className="text-xs text-gray-400">Won Amount</p>
                  <p className="font-black text-green-600">+₹{bid.won_amount.toLocaleString('en-IN')}</p>
                </div>
              )}
              <p className="text-xs text-gray-400">{new Date(bid.created_at).toLocaleDateString('en-IN')}</p>
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default MyBidsPage;
