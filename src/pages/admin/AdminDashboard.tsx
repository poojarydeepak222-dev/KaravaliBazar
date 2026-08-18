import { useState, useEffect, useRef } from 'react';
import { Users, Trophy, ArrowDown, ArrowUp, TrendingUp, IndianRupee, Activity, Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0, totalBids: 0, pendingDeposits: 0, pendingWithdrawals: 0,
    totalDeposited: 0, totalBalance: 0, totalWinningsPaid: 0, totalBidAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStats = async () => {
    const [users, bids, pDep, pWith, depAmt, allUsers, wonBids, allBids] = await Promise.all([
      supabase.from('app_users').select('id', { count: 'exact' }).eq('role', 'user'),
      supabase.from('bids').select('id', { count: 'exact' }),
      supabase.from('deposits').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('withdrawals').select('id', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('deposits').select('amount').eq('status', 'approved'),
      supabase.from('app_users').select('balance').eq('role', 'user'),
      supabase.from('bids').select('won_amount').eq('status', 'won'),
      supabase.from('bids').select('amount'),
    ]);
    const totalDep = (depAmt.data || []).reduce((s: number, d: { amount: number }) => s + d.amount, 0);
    const totalBal = (allUsers.data || []).reduce((s: number, u: { balance: number }) => s + u.balance, 0);
    const totalWin = (wonBids.data || []).reduce((s: number, b: { won_amount: number }) => s + b.won_amount, 0);
    const totalBidAmt = (allBids.data || []).reduce((s: number, b: { amount: number }) => s + b.amount, 0);
    setStats({
      totalUsers: users.count || 0, totalBids: bids.count || 0,
      pendingDeposits: pDep.count || 0, pendingWithdrawals: pWith.count || 0,
      totalDeposited: totalDep, totalBalance: totalBal,
      totalWinningsPaid: totalWin, totalBidAmount: totalBidAmt,
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchStats();
    intervalRef.current = setInterval(fetchStats, 13000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const cards = [
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'bg-blue-500', format: 'num' },
    { icon: Trophy, label: 'Total Bids', value: stats.totalBids, color: 'bg-orange-500', format: 'num' },
    { icon: ArrowDown, label: 'Pending Deposits', value: stats.pendingDeposits, color: 'bg-yellow-500', format: 'num' },
    { icon: ArrowUp, label: 'Pending Withdrawals', value: stats.pendingWithdrawals, color: 'bg-red-500', format: 'num' },
    { icon: TrendingUp, label: 'Total Deposited', value: stats.totalDeposited, color: 'bg-green-500', format: 'inr' },
    { icon: IndianRupee, label: 'Total Balance', value: stats.totalBalance, color: 'bg-purple-500', format: 'inr' },
    { icon: Activity, label: 'Total Winnings Paid', value: stats.totalWinningsPaid, color: 'bg-pink-500', format: 'inr' },
    { icon: Trophy, label: 'Total Bid Amount', value: stats.totalBidAmount, color: 'bg-teal-500', format: 'inr' },
  ];

  const fmt = (v: number, f: string) => f === 'inr' ? `₹${v.toLocaleString('en-IN')}` : v.toLocaleString('en-IN');

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-black text-gray-800">Dashboard</h1>
        <div className="flex items-center gap-1 text-xs text-green-600 font-semibold">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          Live · 13s
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {cards.map(({ icon: Icon, label, value, color, format }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className={`w-10 h-10 rounded-full ${color} flex items-center justify-center mb-3`}>
                <Icon size={18} className="text-white" />
              </div>
              <p className="text-xl font-black text-gray-800">{fmt(value, format)}</p>
              <p className="text-xs text-gray-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Download Reports */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mt-4">
        <div className="flex items-center gap-2 mb-3">
          <Download size={16} className="text-gray-600" />
          <span className="font-bold text-gray-700 text-sm">Download Reports</span>
        </div>
        <div className="flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-semibold bg-teal-500 active:scale-95 transition-transform">
            <Download size={12} />Results Sheet
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-white text-xs font-semibold bg-blue-500 active:scale-95 transition-transform">
            <Download size={12} />All Bids
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
