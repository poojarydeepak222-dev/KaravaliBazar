import { useState, useEffect } from 'react';
import { Check, X, RefreshCw, Eye, Image } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Deposit } from '@/types';
import { toast } from 'sonner';

const statusStyle: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
};

const AdminDeposits = () => {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  const fetchDeposits = async () => {
    setLoading(true);
    let query = supabase.from('deposits').select('*').order('created_at', { ascending: false }).limit(100);
    if (filter !== 'all') query = query.eq('status', filter);
    const { data } = await query;
    if (data) setDeposits(data);
    setLoading(false);
  };

  useEffect(() => { fetchDeposits(); }, [filter]);

  const handleApprove = async (dep: Deposit) => {
    const { error } = await supabase.from('deposits').update({ status: 'approved' }).eq('id', dep.id);
    if (error) return toast.error('Failed');
    const { data: u } = await supabase.from('app_users').select('balance, total_deposited').eq('id', dep.user_id).single();
    if (u) {
      await supabase.from('app_users').update({
        balance: (u.balance || 0) + dep.amount,
        total_deposited: (u.total_deposited || 0) + dep.amount
      }).eq('id', dep.user_id);
    }
    fetchDeposits();
    toast.success(`₹${dep.amount} deposit approved for ${dep.user_name}`);
  };

  const handleReject = async (dep: Deposit) => {
    await supabase.from('deposits').update({ status: 'rejected' }).eq('id', dep.id);
    fetchDeposits();
    toast.success('Deposit rejected');
  };

  return (
    <div className="p-4">
      {/* Screenshot Preview Modal */}
      {previewImg && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreviewImg(null)}>
          <div className="relative max-w-sm w-full">
            <img src={previewImg} alt="Payment screenshot" className="w-full rounded-2xl shadow-2xl" />
            <button onClick={() => setPreviewImg(null)}
              className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow">
              <X size={16} className="text-gray-700" />
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-black text-gray-800">Deposits</h1>
        <button onClick={fetchDeposits} className="p-2 text-gray-500"><RefreshCw size={18} /></button>
      </div>

      {/* Filter Tabs */}
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
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-3">
          {deposits.map(dep => (
            <div key={dep.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-800">{dep.user_name}</p>
                  <p className="text-xs text-gray-400">{dep.user_mobile}</p>
                  {dep.upi_ref && (
                    <p className="text-xs mt-1 font-mono bg-gray-100 px-2 py-1 rounded-lg inline-block">
                      UTR: <span className="font-bold text-gray-800">{dep.upi_ref}</span>
                    </p>
                  )}
                  {dep.upi_id && dep.upi_id !== 'cashfree_pg' && (
                    <p className="text-xs text-gray-400 mt-0.5">UPI: {dep.upi_id}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(dep.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ml-2 shrink-0 ${statusStyle[dep.status]}`}>
                  {dep.status.toUpperCase()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-2xl font-black text-orange-500">₹{dep.amount.toLocaleString('en-IN')}</p>
                <div className="flex items-center gap-2">
                  {/* Screenshot preview button */}
                  {(dep as any).screenshot_url && (
                    <button
                      onClick={() => setPreviewImg((dep as any).screenshot_url)}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-blue-50 text-blue-500 text-xs font-bold border border-blue-200">
                      <Image size={13} /> Proof
                    </button>
                  )}
                  {dep.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(dep)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold">
                        <Check size={14} /> Approve
                      </button>
                      <button onClick={() => handleReject(dep)}
                        className="flex items-center gap-1 px-3 py-2 rounded-xl bg-red-500 text-white text-xs font-bold">
                        <X size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {deposits.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="font-semibold">No deposits found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDeposits;
