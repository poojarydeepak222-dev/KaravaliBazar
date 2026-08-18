import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Trophy, MessageSquare, Wallet, BarChart2 } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/my-bids', icon: Trophy, label: 'My Bids' },
  { path: '/charts', icon: BarChart2, label: 'Charts' },
  { path: '/funds', icon: Wallet, label: 'Funds' },
  { path: '/forum', icon: MessageSquare, label: 'Forum' },
];

const BottomNav = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-xl z-40">
      <div className="flex items-stretch max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-h-[56px] transition-colors relative"
            >
              <Icon size={22} className={active ? 'text-orange-500' : 'text-gray-400'} />
              <span className={`text-[10px] font-medium ${active ? 'text-orange-500' : 'text-gray-400'}`}>{label}</span>
              {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: 'linear-gradient(90deg,#FF6B1A,#FF1D78)' }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomNav;
