import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Bid } from '@/types';

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  won: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-600',
};

const AdminBids = () => {
  const [bids, setBids] = useState<Bid[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchBids = async () => {
    let query = supabase.from('bids').select('*, app_users(name, mobile)').order('created_at', { ascending: false }).limit(200);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) setBids(data as Bid[]);
    setLoading(false);
  };

  useEffect(() => { fetchBids(); }, [filter]);

  const filtered = bids.filter(b =>
    b.game_name?.toLowerCase().includes(search.toLowerCase()) ||
    (b.app_users as unknown as { name: string })?.name?.toLowerCase().includes(search.toLowerCase()) ||
    b.number.includes(search)
  );

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-black text-gray-800">All Bids ({filtered.length})</h1>
      </div>
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search game, user, number..."
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-orange-400" />
      </div>
      <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide pb-1">
        {['all', 'pending', 'won', 'lost'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${filter === f ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-500'}`}
            style={filter === f ? { background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' } : {}}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div> : (
        <div className="space-y-2">
          {filtered.map(bid => (
            <div key={bid.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-1.5">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{bid.game_name}</p>
                  <p className="text-xs text-gray-400">{(bid.app_users as unknown as { name: string })?.name} • {(bid.app_users as unknown as { mobile: string })?.mobile}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-bold">{bid.bid_type.replace('_', ' ').toUpperCase()}</span> • {bid.session.toUpperCase()} •{' '}
                    <span className="font-bold text-orange-500">#{bid.number}</span>
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusStyle[bid.status]}`}>{bid.status.toUpperCase()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-400">Amount</p>
                  <p className="font-black text-gray-700">₹{bid.amount.toLocaleString('en-IN')}</p>
                </div>
                {bid.status === 'won' && <p className="font-black text-green-600 text-sm">+₹{bid.won_amount?.toLocaleString('en-IN')}</p>}
                {bid.status === 'pending' && <p className="text-xs text-yellow-600 font-semibold bg-yellow-50 px-2 py-1 rounded-lg">Auto-settle on declare</p>}
              </div>
              <p className="text-xs text-gray-400 mt-1">{new Date(bid.created_at).toLocaleString('en-IN')}</p>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-center py-12 text-gray-400">No bids found</div>}
        </div>
      )}
    </div>
  );
};

export default AdminBids;
