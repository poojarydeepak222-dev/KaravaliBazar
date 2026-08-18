import { useState, useEffect } from 'react';
import { ArrowLeft, User, Phone, Lock, Eye, EyeOff, LogOut, Shield, Building2, CreditCard, CheckCircle2 } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import BottomNav from '@/components/layout/BottomNav';

const ProfilePage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, logout, login } = useAuth();
  const [oldMpin, setOldMpin] = useState('');
  const [newMpin, setNewMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'profile' | 'mpin' | 'password' | 'bank'>(
    searchParams.get('tab') === 'bank' ? 'bank' : 'profile'
  );

  // Bank details
  const [bankForm, setBankForm] = useState({
    account_number: '',
    ifsc_code: '',
    bank_name: '',
    account_holder: '',
  });
  const [bankSaved, setBankSaved] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('app_users').select('account_number,ifsc_code,bank_name,account_holder')
      .eq('id', user.id).single().then(({ data }) => {
        if (data) {
          setBankForm({
            account_number: data.account_number || '',
            ifsc_code: data.ifsc_code || '',
            bank_name: data.bank_name || '',
            account_holder: data.account_holder || '',
          });
          if (data.account_number) setBankSaved(true);
        }
      });
  }, [user]);

  const handleChangeMpin = async () => {
    if (!oldMpin || !newMpin || !confirmMpin) return toast.error('Fill all fields');
    if (oldMpin !== user?.mpin) return toast.error('Current MPIN is incorrect');
    if (newMpin.length !== 4) return toast.error('New MPIN must be 4 digits');
    if (newMpin !== confirmMpin) return toast.error('New MPINs do not match');
    setLoading(true);
    const { error } = await supabase.from('app_users').update({ mpin: newMpin }).eq('id', user!.id);
    setLoading(false);
    if (error) return toast.error('Failed to update MPIN');
    login({ ...user!, mpin: newMpin });
    setOldMpin(''); setNewMpin(''); setConfirmMpin('');
    toast.success('MPIN changed successfully!');
  };

  const handleChangePassword = async () => {
    if (!oldPass || !newPass) return toast.error('Fill all fields');
    if (oldPass !== user?.password) return toast.error('Current password is incorrect');
    if (newPass.length < 6) return toast.error('New password must be at least 6 characters');
    setLoading(true);
    const { error } = await supabase.from('app_users').update({ password: newPass }).eq('id', user!.id);
    setLoading(false);
    if (error) return toast.error('Failed to update password');
    login({ ...user!, password: newPass });
    setOldPass(''); setNewPass('');
    toast.success('Password changed successfully!');
  };

  const handleSaveBank = async () => {
    if (!bankForm.account_number.trim()) return toast.error('Enter account number');
    if (!bankForm.ifsc_code.trim()) return toast.error('Enter IFSC code');
    if (!bankForm.account_holder.trim()) return toast.error('Enter account holder name');
    if (bankForm.ifsc_code.length !== 11) return toast.error('IFSC code must be 11 characters');
    setLoading(true);
    const { error } = await supabase.from('app_users').update({
      account_number: bankForm.account_number.trim(),
      ifsc_code: bankForm.ifsc_code.trim().toUpperCase(),
      bank_name: bankForm.bank_name.trim(),
      account_holder: bankForm.account_holder.trim(),
    }).eq('id', user!.id);
    setLoading(false);
    if (error) return toast.error('Failed to save bank details');
    setBankSaved(true);
    toast.success('Bank account saved! Withdrawals will be processed to this account.');
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const TABS = [
    { id: 'profile', label: 'Info' },
    { id: 'bank', label: 'Bank' },
    { id: 'mpin', label: 'MPIN' },
    { id: 'password', label: 'Password' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <p className="text-white font-black text-xl">Profile</p>
        </div>
      </div>

      {/* User Header */}
      <div className="mx-4 mt-4 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-14 h-14 rounded-full bg-white/25 flex items-center justify-center font-black text-2xl text-white">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <p className="font-black text-xl">{user?.name}</p>
            <p className="text-white/70 text-sm">{user?.mobile}</p>
            <p className="text-white/60 text-xs mt-0.5">Balance: ₹{(user?.balance || 0).toLocaleString('en-IN')}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-1 gap-1 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label }) => (
          <button key={id} onClick={() => setTab(id as typeof tab)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap px-2 ${tab === id ? 'text-white shadow' : 'text-gray-500'}`}
            style={tab === id ? { background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' } : {}}>
            {label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4">
        {tab === 'profile' && (
          <div className="space-y-3">
            {[
              { icon: User, label: 'Full Name', value: user?.name },
              { icon: Phone, label: 'Mobile', value: user?.mobile },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                  <Icon size={18} className="text-orange-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-bold text-gray-700">{value}</p>
                </div>
              </div>
            ))}
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-500 font-bold mt-4">
              <LogOut size={18} /> Logout Account
            </button>
          </div>
        )}

        {tab === 'bank' && (
          <div className="space-y-4">
            {bankSaved && (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <p className="text-green-700 text-sm font-semibold">Bank account linked for auto-payout</p>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Building2 size={20} className="text-orange-500" />
                <span className="font-bold text-gray-700">Bank Account Details</span>
              </div>
              <p className="text-xs text-gray-400 bg-orange-50 p-2 rounded-lg border border-orange-100">
                Withdrawal amounts will be auto-transferred to this bank account via Cashfree Payouts.
              </p>

              {[
                { key: 'account_holder', label: 'Account Holder Name', placeholder: 'Name as on bank passbook' },
                { key: 'bank_name', label: 'Bank Name', placeholder: 'e.g. State Bank of India' },
                { key: 'account_number', label: 'Account Number', placeholder: 'Enter bank account number', type: 'number' },
                { key: 'ifsc_code', label: 'IFSC Code', placeholder: 'e.g. SBIN0001234 (11 chars)' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
                  <input
                    type={type || 'text'}
                    value={bankForm[key as keyof typeof bankForm]}
                    onChange={e => setBankForm(f => ({ ...f, [key]: type === 'text' && key === 'ifsc_code' ? e.target.value.toUpperCase() : e.target.value }))}
                    placeholder={placeholder}
                    maxLength={key === 'ifsc_code' ? 11 : undefined}
                    className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-gray-50 outline-none focus:border-orange-400 font-mono"
                  />
                </div>
              ))}

              <button onClick={handleSaveBank} disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                <CreditCard size={16} />
                {loading ? 'Saving...' : bankSaved ? 'Update Bank Account' : 'Save Bank Account'}
              </button>
            </div>
          </div>
        )}

        {tab === 'mpin' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Shield size={20} className="text-orange-500" />
              <span className="font-bold text-gray-700">Change M-PIN</span>
            </div>
            {[
              { label: 'Current MPIN', value: oldMpin, setter: setOldMpin },
              { label: 'New MPIN (4 digits)', value: newMpin, setter: setNewMpin },
              { label: 'Confirm New MPIN', value: confirmMpin, setter: setConfirmMpin },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
                <input type="password" maxLength={4} value={value}
                  onChange={e => setter(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 4-digit MPIN"
                  className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-gray-50 outline-none focus:border-orange-400 tracking-widest text-center" />
              </div>
            ))}
            <button onClick={handleChangeMpin} disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
              {loading ? 'Updating...' : 'Update MPIN'}
            </button>
          </div>
        )}

        {tab === 'password' && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Lock size={20} className="text-orange-500" />
              <span className="font-bold text-gray-700">Change Password</span>
            </div>
            {[
              { label: 'Current Password', value: oldPass, setter: setOldPass },
              { label: 'New Password', value: newPass, setter: setNewPass },
            ].map(({ label, value, setter }) => (
              <div key={label}>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{label}</label>
                <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 focus-within:border-orange-400">
                  <input type={showPass ? 'text' : 'password'} value={value} onChange={e => setter(e.target.value)}
                    placeholder={label} className="flex-1 bg-transparent outline-none text-sm" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={handleChangePassword} disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
