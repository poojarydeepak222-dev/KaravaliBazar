import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Trophy, ArrowDown, ArrowUp, Gamepad2, Settings, LogOut, RefreshCw, BarChart2, Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AdminLayout = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [now, setNow] = useState(new Date());
  const [pendingDeposits, setPendingDeposits] = useState(0);
  const [pendingWithdrawals, setPendingWithdrawals] = useState(0);
  const [pendingBids, setPendingBids] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchPendingCounts = async () => {
    const [dep, wd, bids] = await Promise.all([
      supabase.from('deposits').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bids').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setPendingDeposits(dep.count || 0);
    setPendingWithdrawals(wd.count || 0);
    setPendingBids(bids.count || 0);
  };

  useEffect(() => {
    fetchPendingCounts();
    const t = setInterval(fetchPendingCounts, 20_000);
    return () => clearInterval(t);
  }, []);

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Dashboard', badge: 0 },
    { path: '/admin/users', icon: Users, label: 'Users', badge: 0 },
    { path: '/admin/bids', icon: Trophy, label: 'Bids', badge: pendingBids },
    { path: '/admin/deposits', icon: ArrowDown, label: 'Deposits', badge: pendingDeposits },
    { path: '/admin/withdrawals', icon: ArrowUp, label: 'Withdraw', badge: pendingWithdrawals },
    { path: '/admin/games', icon: Gamepad2, label: 'Games', badge: 0 },
    { path: '/admin/chart', icon: BarChart2, label: 'Chart', badge: 0 },
    { path: '/admin/notifications', icon: Bell, label: 'Notify', badge: 0 },
    { path: '/admin/settings', icon: Settings, label: 'Settings', badge: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white">
        <div className="flex items-center px-4 py-2.5 gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>KB</div>
          <div>
            <p className="font-black text-sm">KARAVALI BAZAR</p>
            <p className="text-gray-400 text-xs">Admin Panel</p>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <RefreshCw size={12} className="text-green-400" />
              <span className="text-green-400">Live</span>
              <span>· {now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>
            <button onClick={() => { logout(); navigate('/login'); }} className="flex items-center gap-1 text-xs text-red-400 border border-red-400/30 px-2 py-1 rounded-lg">
              <LogOut size={12} /> Logout
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-700">
        <div className="flex overflow-x-auto scrollbar-hide">
          {navItems.map(({ path, icon: Icon, label, badge }) => {
            const active = pathname === path;
            return (
              <button key={path} onClick={() => navigate(path)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 min-w-[52px] transition-colors relative ${active ? 'text-orange-500' : 'text-gray-500'}`}>
                <div className="relative">
                  <Icon size={18} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white leading-none">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-medium whitespace-nowrap">{label}</span>
                {active && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-orange-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="pt-14 pb-16 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
};

export default AdminLayout;
