import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, ChevronRight, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Game } from '@/types';
import BottomNav from '@/components/layout/BottomNav';

const ChartsListPage = () => {
  const navigate = useNavigate();
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('games').select('*').eq('is_active', true).order('sort_order')
      .then(({ data }) => { if (data) setGames(data); setLoading(false); });
  }, []);

  const filtered = games.filter(g => g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <div className="flex-1">
            <p className="text-white font-black text-xl">Market Charts</p>
            <p className="text-white/70 text-xs">View weekly results for all markets</p>
          </div>
          <BarChart2 size={22} className="text-white/70" />
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search market..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-orange-400"
          />
        </div>
      </div>

      {/* Markets List */}
      <div className="px-4 pt-3 space-y-3">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No markets found</div>
        ) : (
          filtered.map(game => (
            <button
              key={game.id}
              onClick={() => navigate(`/game/${game.id}/chart`)}
              className="w-full bg-white rounded-2xl shadow-sm border border-orange-100 p-4 flex items-center gap-3 active:scale-95 transition-transform text-left"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #fff5f0, #fff0f8)', border: '1px solid #ffe0d0' }}>
                <BarChart2 size={22} className="text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-gray-800 truncate">{game.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Open: <span className="font-semibold text-gray-600">{game.open_time}</span>
                  {' '}| Close: <span className="font-semibold text-gray-600">{game.close_time}</span>
                </p>
                {(game.jodi) && (
                  <p className="text-xs font-black text-orange-500 mt-0.5">Latest: {game.jodi}</p>
                )}
              </div>
              <ChevronRight size={18} className="text-gray-300 shrink-0" />
            </button>
          ))
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default ChartsListPage;
