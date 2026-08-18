import { useState, useEffect } from 'react';
import { Check, X, RefreshCw, Zap, Loader2, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Withdrawal } from '@/types';
import { toast } from 'sonner';
import { FunctionsHttpError } from '@supabase/supabase-js';

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

const AdminWithdrawals = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [payoutLoading, setPayoutLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    let q = supabase.from('withdrawals').select(`*, app_users(account_number, ifsc_code, bank_name, account_holder)`).order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    if (data) setWithdrawals(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filter]);

  // Manual approve (no cashfree — just mark approved and track total_withdrawn)
  const handleApprove = async (w: Withdrawal) => {
    const { error } = await supabase.from('withdrawals').update({ status: 'approved' }).eq('id', w.id);
    if (error) return toast.error('Failed');
    const { data: u } = await supabase.from('app_users').select('total_withdrawn').eq('id', w.user_id).single();
    if (u) await supabase.from('app_users').update({ total_withdrawn: (u.total_withdrawn || 0) + w.amount }).eq('id', w.user_id);
    fetchData();
    toast.success(`₹${w.amount} withdrawal approved manually`);
  };

  // Trigger Cashfree auto-payout
  const handleCashfreePayout = async (w: any) => {
    if (!w.app_users?.account_number || !w.app_users?.ifsc_code) {
      return toast.error('User has no bank account linked');
    }
    setPayoutLoading(w.id);
    const { data, error } = await supabase.functions.invoke('cashfree-payout', {
      body: {
        withdrawal_id: w.id,
        user_id: w.user_id,
        amount: w.amount,
        account_number: w.app_users.account_number,
        ifsc_code: w.app_users.ifsc_code,
        account_holder: w.app_users.account_holder || w.user_name,
        user_mobile: w.user_mobile,
      },
    });

    if (error) {
      let msg = error.message;
      if (error instanceof FunctionsHttpError) {
        try { msg = await error.context.text(); } catch { /* ignore */ }
      }
      setPayoutLoading(null);
      return toast.error(`Payout failed: ${msg}`);
    }

    setPayoutLoading(null);
    if (data?.success) {
      toast.success(`₹${w.amount} auto-transferred! UTR: ${data.utr || 'Processing'}`);
    } else {
      toast.warning(`Payout queued: ${data?.error || 'Manual review needed'}`);
    }
    fetchData();
  };

  const handleReject = async (w: Withdrawal) => {
    await supabase.from('withdrawals').update({ status: 'rejected' }).eq('id', w.id);
    // Refund balance
    const { data: u } = await supabase.from('app_users').select('balance').eq('id', w.user_id).single();
    if (u) await supabase.from('app_users').update({ balance: u.balance + w.amount }).eq('id', w.user_id);
    fetchData();
    toast.success('Withdrawal rejected — amount refunded to user wallet');
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-black text-gray-800">Withdrawals</h1>
        <button onClick={fetchData} className="p-2 text-gray-500"><RefreshCw size={18} /></button>
      </div>
      <div className="flex gap-2 mb-3">
        {['pending', 'approved', 'rejected', 'all'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${filter === f ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-500'}`}
            style={filter === f ? { background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' } : {}}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w: any) => (
            <div key={w.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-800">{w.user_name}</p>
                  <p className="text-xs text-gray-400">{w.user_mobile}</p>
                  {/* Bank details */}
                  {w.app_users?.account_number ? (
                    <div className="flex items-center gap-1 mt-1">
                      <Building2 size={11} className="text-blue-500" />
                      <span className="text-[10px] text-blue-600 font-semibold">{w.app_users?.bank_name || 'Bank'} — {w.app_users?.account_number?.slice(-4)?.padStart(w.app_users?.account_number?.length, '*')}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-red-400 font-semibold">No bank linked</span>
                  )}
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${statusStyle[w.status]}`}>{w.status.toUpperCase()}</span>
              </div>

              <div className="flex items-center justify-between mt-1">
                <p className="text-2xl font-black text-red-500">₹{w.amount.toLocaleString('en-IN')}</p>
                {w.status === 'pending' && (
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {/* Cashfree auto-payout */}
                    <button
                      onClick={() => handleCashfreePayout(w)}
                      disabled={payoutLoading === w.id}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold disabled:opacity-60">
                      {payoutLoading === w.id ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                      Auto Pay
                    </button>
                    {/* Manual approve */}
                    <button onClick={() => handleApprove(w)} className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-green-500 text-white text-xs font-bold">
                      <Check size={12} /> Approve
                    </button>
                    <button onClick={() => handleReject(w)} className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">
                      <X size={12} /> Reject
                    </button>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-400 mt-1">{new Date(w.created_at).toLocaleString('en-IN')}</p>
            </div>
          ))}
          {withdrawals.length === 0 && <div className="text-center py-12 text-gray-400">No withdrawals found</div>}
        </div>
      )}
    </div>
  );
};

export default AdminWithdrawals;
