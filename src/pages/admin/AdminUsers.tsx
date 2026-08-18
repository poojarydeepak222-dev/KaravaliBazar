import { useState, useEffect } from 'react';
import {
  Search, Plus, Minus, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, Building2, Edit3, ShieldOff, Shield, X, Save
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AppUser } from '@/types';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Fund modal
  const [fundModal, setFundModal] = useState<{ user: AppUser; mode: 'add' | 'deduct' } | null>(null);
  const [fundAmt, setFundAmt] = useState('');
  const [fundLoading, setFundLoading] = useState(false);

  // Edit balance directly
  const [editBalId, setEditBalId] = useState<string | null>(null);
  const [editBalVal, setEditBalVal] = useState('');

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.mobile.includes(search)
  );

  // Toggle active/blocked
  const toggleActive = async (u: AppUser) => {
    const newVal = !u.is_active;
    await supabase.from('app_users').update({ is_active: newVal }).eq('id', u.id);
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, is_active: newVal } : x));
    toast.success(`User ${newVal ? 'unblocked' : 'blocked/frozen'}`);
  };

  // Add / Deduct funds
  const handleFund = async () => {
    if (!fundModal) return;
    const amt = parseFloat(fundAmt);
    if (!amt || amt <= 0) return toast.error('Enter valid amount');
    setFundLoading(true);
    const { user, mode } = fundModal;
    const delta = mode === 'add' ? amt : -amt;
    const newBal = Math.max(0, user.balance + delta);
    const { error } = await supabase.from('app_users').update({ balance: newBal }).eq('id', user.id);
    if (error) { setFundLoading(false); return toast.error('Failed'); }
    setUsers(prev => prev.map(x => x.id === user.id ? { ...x, balance: newBal } : x));
    setFundModal(null);
    setFundAmt('');
    setFundLoading(false);
    toast.success(`₹${amt} ${mode === 'add' ? 'added to' : 'deducted from'} ${user.name}`);
  };

  // Direct balance edit
  const handleEditBalance = async (u: AppUser) => {
    const val = parseFloat(editBalVal);
    if (isNaN(val) || val < 0) return toast.error('Enter valid balance');
    const { error } = await supabase.from('app_users').update({ balance: val }).eq('id', u.id);
    if (error) return toast.error('Failed to update');
    setUsers(prev => prev.map(x => x.id === u.id ? { ...x, balance: val } : x));
    setEditBalId(null);
    setEditBalVal('');
    toast.success(`Balance updated to ₹${val.toLocaleString('en-IN')}`);
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-black text-gray-800">Users ({filtered.length})</h1>
      </div>

      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name or mobile..."
          className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-white outline-none focus:border-orange-400" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(u => {
            const isExpanded = expandedId === u.id;
            const bank = (u as any);
            return (
              <div key={u.id} className={`bg-white rounded-2xl shadow-sm border transition-all ${!u.is_active ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}>
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0 ${!u.is_active ? 'bg-gray-400' : ''}`}
                      style={u.is_active ? { background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' } : {}}>
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800 text-sm">{u.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${u.role === 'admin' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                          {u.role}
                        </span>
                        {!u.is_active && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-600">BLOCKED</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{u.mobile}</p>
                      <p className="text-xs text-gray-400">Joined: {new Date(u.created_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <button onClick={() => setExpandedId(isExpanded ? null : u.id)} className="text-gray-400 p-1">
                      {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                  </div>

                  {/* Balance row */}
                  <div className="mt-3 flex items-center gap-2">
                    {editBalId === u.id ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input type="number" value={editBalVal} onChange={e => setEditBalVal(e.target.value)}
                          placeholder="Set balance"
                          className="flex-1 border border-orange-300 rounded-xl px-3 py-2 text-sm bg-orange-50 outline-none focus:border-orange-400 font-bold" />
                        <button onClick={() => handleEditBalance(u)}
                          className="p-2 bg-green-500 rounded-xl text-white"><Save size={14} /></button>
                        <button onClick={() => { setEditBalId(null); setEditBalVal(''); }}
                          className="p-2 bg-gray-100 rounded-xl text-gray-500"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1">
                          <p className="text-xs text-gray-400">Balance</p>
                          <p className="font-black text-orange-500 text-lg">₹{u.balance.toLocaleString('en-IN')}</p>
                        </div>
                        <button onClick={() => { setEditBalId(u.id); setEditBalVal(String(u.balance)); }}
                          title="Edit balance directly"
                          className="p-2 bg-orange-50 rounded-xl border border-orange-200">
                          <Edit3 size={13} className="text-orange-500" />
                        </button>
                      </div>
                    )}

                    {/* Add / Deduct */}
                    <button onClick={() => { setFundModal({ user: u, mode: 'add' }); setFundAmt(''); }}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-white text-xs font-bold bg-green-500">
                      <Plus size={12} /> Add
                    </button>
                    <button onClick={() => { setFundModal({ user: u, mode: 'deduct' }); setFundAmt(''); }}
                      className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-white text-xs font-bold bg-red-500">
                      <Minus size={12} /> Deduct
                    </button>

                    {/* Block/Unblock */}
                    <button onClick={() => toggleActive(u)} title={u.is_active ? 'Block user' : 'Unblock user'}
                      className={`p-2 rounded-xl border ${u.is_active ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                      {u.is_active ? <ShieldOff size={14} className="text-red-500" /> : <Shield size={14} className="text-green-600" />}
                    </button>
                  </div>
                </div>

                {/* Expanded: Bank + Stats */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                    {/* Bank Details */}
                    <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Building2 size={14} className="text-blue-600" />
                        <p className="text-xs font-black text-blue-700">Bank Account Details</p>
                      </div>
                      {bank.account_number ? (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>
                            <p className="text-[10px] text-blue-400 font-semibold uppercase">Account Holder</p>
                            <p className="text-xs font-bold text-blue-800">{bank.account_holder || u.name}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-blue-400 font-semibold uppercase">Bank Name</p>
                            <p className="text-xs font-bold text-blue-800">{bank.bank_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-blue-400 font-semibold uppercase">Account Number</p>
                            <p className="text-xs font-black text-blue-800 font-mono">{bank.account_number}</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-blue-400 font-semibold uppercase">IFSC Code</p>
                            <p className="text-xs font-black text-blue-800 font-mono">{bank.ifsc_code}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-blue-400 font-semibold">No bank account linked yet</p>
                      )}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-green-50 rounded-xl p-2 border border-green-100">
                        <p className="text-[10px] text-green-500 font-semibold uppercase">Deposited</p>
                        <p className="text-sm font-black text-green-700">₹{(u.total_deposited || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-2 border border-red-100">
                        <p className="text-[10px] text-red-500 font-semibold uppercase">Withdrawn</p>
                        <p className="text-sm font-black text-red-600">₹{(u.total_withdrawn || 0).toLocaleString('en-IN')}</p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-2 border border-orange-100">
                        <p className="text-[10px] text-orange-500 font-semibold uppercase">Balance</p>
                        <p className="text-sm font-black text-orange-600">₹{u.balance.toLocaleString('en-IN')}</p>
                      </div>
                    </div>

                    {/* Status actions */}
                    <div className="flex gap-2">
                      <button onClick={() => toggleActive(u)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold ${u.is_active ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                        {u.is_active ? <><ShieldOff size={13} /> Block User</> : <><Shield size={13} /> Unblock User</>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">No users found</div>
          )}
        </div>
      )}

      {/* Fund Modal */}
      {fundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm shadow-2xl">
            <h3 className="font-black text-gray-800 text-lg mb-1">
              {fundModal.mode === 'add' ? '➕ Add Funds' : '➖ Deduct Funds'}
            </h3>
            <p className="text-sm text-gray-500 mb-1">
              User: <span className="font-bold text-orange-500">{fundModal.user.name}</span>
            </p>
            <p className="text-sm text-gray-400 mb-4">
              Current Balance: <span className="font-black text-gray-700">₹{fundModal.user.balance.toLocaleString('en-IN')}</span>
            </p>
            <input
              type="number"
              value={fundAmt}
              onChange={e => setFundAmt(e.target.value)}
              placeholder={`Enter amount to ${fundModal.mode === 'add' ? 'add' : 'deduct'}`}
              className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-gray-50 outline-none focus:border-orange-400 mb-3 font-bold text-lg"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setFundModal(null); setFundAmt(''); }}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold">
                Cancel
              </button>
              <button onClick={handleFund} disabled={fundLoading}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60 ${fundModal.mode === 'add' ? 'bg-green-500' : 'bg-red-500'}`}>
                {fundLoading ? 'Processing...' : fundModal.mode === 'add' ? 'Add Funds' : 'Deduct Funds'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
