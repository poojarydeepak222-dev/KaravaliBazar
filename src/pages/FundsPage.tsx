import { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft, ArrowDown, ArrowUp, Copy, CheckCircle2,
  Loader2, AlertCircle, Clock, BarChart2, Smartphone,
  Upload, X, Building2, ExternalLink, IndianRupee, QrCode
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import BottomNav from '@/components/layout/BottomNav';

const statusColors: Record<string, string> = {
  approved: 'text-green-600 bg-green-50 border-green-200',
  pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  rejected: 'text-red-500 bg-red-50 border-red-200',
};

// UPI Deep Link builders
const buildUpiLink = (app: string, upiId: string, name: string, amount: string) => {
  const params = `pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=KaravaliBazar Deposit`;
  switch (app) {
    case 'gpay':    return `tez://upi/pay?${params}`;
    case 'phonepe': return `phonepe://pay?${params}`;
    case 'paytm':   return `paytmmp://pay?${params}`;
    default:        return `upi://pay?${params}`;
  }
};

const UPI_APPS = [
  {
    id: 'gpay',
    name: 'GPay',
    color: '#4285F4',
    bg: '#EEF3FF',
    logo: (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <path fill="#4285F4" d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"/>
        <path fill="#34A853" d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"/>
        <path fill="#FBBC05" d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24c0 3.55.85 6.91 2.34 9.88l7.35-5.7z"/>
        <path fill="#EA4335" d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"/>
      </svg>
    ),
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    color: '#5F259F',
    bg: '#F3EEFF',
    logo: (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <rect width="48" height="48" rx="10" fill="#5F259F"/>
        <path fill="white" d="M24 8C15.16 8 8 15.16 8 24s7.16 16 16 16 16-7.16 16-16S32.84 8 24 8zm6.5 14.5c0 3.04-2.46 5.5-5.5 5.5h-4v4h-3V18h7c3.04 0 5.5 2.46 5.5 5.5z"/>
        <path fill="#5F259F" d="M21 21v4h4c1.1 0 2-.9 2-2s-.9-2-2-2h-4z"/>
      </svg>
    ),
  },
  {
    id: 'paytm',
    name: 'Paytm',
    color: '#00BAF2',
    bg: '#E6F8FE',
    logo: (
      <svg viewBox="0 0 48 48" className="w-8 h-8">
        <rect width="48" height="48" rx="10" fill="#00BAF2"/>
        <text x="24" y="31" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold" fontFamily="Arial">P</text>
      </svg>
    ),
  },
  {
    id: 'upi',
    name: 'Any UPI',
    color: '#FF6B1A',
    bg: '#FFF0E8',
    logo: (
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#FF6B1A,#FF1D78)' }}>
        <IndianRupee size={16} className="text-white" />
      </div>
    ),
  },
];

const FundsPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user, updateBalance } = useAuth();
  const [tab, setTab] = useState<'deposit' | 'withdraw' | 'history'>(
    params.get('tab') === 'withdraw' ? 'withdraw' : params.get('tab') === 'history' ? 'history' : 'deposit'
  );

  // Deposit state
  const [amount, setAmount] = useState('');
  const [utrNumber, setUtrNumber] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'pay' | 'confirm'>('select');
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // App settings
  const [upiId, setUpiId] = useState('');
  const [upiName, setUpiName] = useState('Karavali Bazar');
  const [qrCodeUrl, setQrCodeUrl] = useState('');

  // Withdraw state
  const [wdAmount, setWdAmount] = useState('');
  const [bankDetails, setBankDetails] = useState<any>(null);
  const [wdLoading, setWdLoading] = useState(false);

  // History
  const [deposits, setDeposits] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTab, setHistoryTab] = useState<'deposits' | 'withdrawals'>('deposits');

  useEffect(() => {
    supabase.from('settings').select('key,value')
      .in('key', ['upi_id', 'upi_name', 'qr_code_url'])
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((s: any) => { map[s.key] = s.value; });
          if (map.upi_id) setUpiId(map.upi_id);
          if (map.upi_name) setUpiName(map.upi_name);
          if (map.qr_code_url) setQrCodeUrl(map.qr_code_url);
        }
      });
    if (user) {
      supabase.from('app_users')
        .select('account_number,ifsc_code,bank_name,account_holder')
        .eq('id', user.id).single()
        .then(({ data }) => { if (data) setBankDetails(data); });
    }
  }, [user]);

  useEffect(() => {
    if (tab === 'history' && user) fetchHistory();
  }, [tab, user]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const [dep, wd] = await Promise.all([
      supabase.from('deposits').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('withdrawals').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(50),
    ]);
    if (dep.data) setDeposits(dep.data);
    if (wd.data) setWithdrawals(wd.data);
    setHistoryLoading(false);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId).then(() => {
      setCopied(true);
      toast.success('UPI ID copied!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleOpenUpiApp = (appId: string) => {
    if (!upiId) return toast.error('UPI ID not configured');
    const link = buildUpiLink(appId, upiId, upiName, amount);
    window.location.href = link;
    // After app opens, move to confirm step after short delay
    setTimeout(() => setStep('confirm'), 1500);
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB');
    setScreenshot(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitDeposit = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt < 100) return toast.error('Minimum deposit is ₹100');
    if (!utrNumber.trim()) return toast.error('Enter UTR / Transaction ID');
    setLoading(true);

    let screenshotUrl = '';
    if (screenshot) {
      const fileName = `${user!.id}_${Date.now()}.${screenshot.name.split('.').pop()}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('payment-screenshots')
        .upload(fileName, screenshot, { contentType: screenshot.type, upsert: true });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('payment-screenshots').getPublicUrl(fileName);
        screenshotUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('deposits').insert({
      user_id: user!.id,
      user_name: user!.name,
      user_mobile: user!.mobile,
      amount: amt,
      upi_ref: utrNumber.trim(),
      upi_id: upiId,
      screenshot_url: screenshotUrl,
      status: 'pending',
    });

    setLoading(false);
    if (error) return toast.error('Failed to submit. Please try again.');

    toast.success('Deposit request submitted! Admin will approve shortly.');
    setAmount('');
    setUtrNumber('');
    setScreenshot(null);
    setScreenshotPreview('');
    setStep('select');
    if (tab === 'history') fetchHistory();
  };

  const handleWithdraw = async () => {
    const amt = parseFloat(wdAmount);
    if (!amt || amt < 500) return toast.error('Minimum withdrawal is ₹500');
    if (amt > (user?.balance || 0)) return toast.error('Insufficient balance');
    if (!bankDetails?.account_number || !bankDetails?.ifsc_code) {
      return toast.error('Please add your bank account in Profile first');
    }
    setWdLoading(true);
    const newBal = (user?.balance || 0) - amt;
    const [wdRes] = await Promise.all([
      supabase.from('withdrawals').insert({
        user_id: user!.id, user_name: user!.name, user_mobile: user!.mobile,
        amount: amt, upi_id: bankDetails.account_number, status: 'pending',
      }),
      supabase.from('app_users').update({ balance: newBal }).eq('id', user!.id),
    ]);
    updateBalance(newBal);
    setWdLoading(false);
    if (wdRes.error) return toast.error('Failed. Try again.');
    toast.success('Withdrawal request submitted! Admin will process within 24 hours.');
    setWdAmount('');
  };

  const quickAmounts = [100, 200, 500, 1000, 2000, 5000];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="text-white"><ArrowLeft size={24} /></button>
          <p className="text-white font-black text-xl">Funds</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="mx-4 mt-4 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
        <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10" />
        <p className="text-white/70 text-sm font-medium relative z-10">Available Balance</p>
        <p className="text-4xl font-black relative z-10 mt-1">
          ₹{(user?.balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </p>
        <p className="text-white/60 text-xs mt-1 relative z-10">Karavali Bazar Wallet</p>
      </div>

      {/* Tabs */}
      <div className="flex mx-4 mt-4 bg-white rounded-2xl shadow-sm border border-gray-100 p-1 gap-1">
        {[
          { id: 'deposit', icon: ArrowDown, label: 'Deposit' },
          { id: 'withdraw', icon: ArrowUp, label: 'Withdraw' },
          { id: 'history', icon: BarChart2, label: 'History' },
        ].map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => { setTab(id as typeof tab); setStep('select'); }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${tab === id ? 'text-white shadow' : 'text-gray-500'}`}
            style={tab === id ? { background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' } : {}}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="px-4 mt-4 space-y-4">

        {/* ───────────────── DEPOSIT TAB ───────────────── */}
        {tab === 'deposit' && (
          <>
            {/* Step 1: Amount Selection */}
            {step === 'select' && (
              <div className="space-y-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
                  <p className="font-black text-gray-800">Select Deposit Amount</p>
                  <div className="grid grid-cols-3 gap-2">
                    {quickAmounts.map(q => (
                      <button key={q} onClick={() => setAmount(String(q))}
                        className={`py-3 rounded-xl text-sm font-bold border-2 transition-all ${amount === String(q) ? 'border-orange-400 text-orange-500 bg-orange-50' : 'border-gray-200 text-gray-600 bg-gray-50'}`}>
                        ₹{q.toLocaleString('en-IN')}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Custom Amount</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="Enter amount (min ₹100)"
                      className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-gray-50 outline-none focus:border-orange-400 font-bold" />
                  </div>
                  <button
                    onClick={() => {
                      if (!amount || parseFloat(amount) < 100) return toast.error('Minimum deposit is ₹100');
                      setStep('pay');
                    }}
                    className="w-full py-4 rounded-xl text-white font-black text-base shadow active:scale-95 transition-transform"
                    style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
                    PROCEED TO PAY ₹{parseFloat(amount || '0').toLocaleString('en-IN') || '---'}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Choose payment app */}
            {step === 'pay' && (
              <div className="space-y-4">
                {/* Amount badge */}
                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
                  <div>
                    <p className="text-xs text-orange-600 font-semibold">Paying Amount</p>
                    <p className="text-2xl font-black text-orange-500">₹{parseFloat(amount).toLocaleString('en-IN')}</p>
                  </div>
                  <button onClick={() => setStep('select')} className="text-xs text-gray-400 underline">Change</button>
                </div>

                {/* UPI ID + Copy */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-2">Pay to UPI ID</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-3 border border-gray-200">
                    <IndianRupee size={16} className="text-orange-500 shrink-0" />
                    <span className="flex-1 font-bold text-gray-800 text-sm font-mono">{upiId || 'Loading...'}</span>
                    <button onClick={handleCopyUpi}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${copied ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                      {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  {qrCodeUrl && (
                    <div className="mt-3 flex justify-center">
                      <img src={qrCodeUrl} alt="UPI QR Code" className="w-36 h-36 rounded-xl border border-gray-200 object-cover" />
                    </div>
                  )}
                </div>

                {/* UPI App Buttons */}
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                  <p className="text-xs font-bold text-gray-500 mb-3">Pay using your UPI app</p>
                  <div className="grid grid-cols-4 gap-3">
                    {UPI_APPS.map(app => (
                      <button key={app.id} onClick={() => handleOpenUpiApp(app.id)}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-gray-100 active:scale-95 transition-transform hover:border-gray-300"
                        style={{ background: app.bg }}>
                        {app.logo}
                        <span className="text-[10px] font-bold text-gray-600">{app.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 bg-blue-50 rounded-xl px-3 py-2 flex items-start gap-2">
                    <AlertCircle size={13} className="text-blue-500 mt-0.5 shrink-0" />
                    <p className="text-[11px] text-blue-600 font-medium">After payment, tap below to submit your UTR/transaction ID for verification</p>
                  </div>
                </div>

                <button onClick={() => setStep('confirm')}
                  className="w-full py-4 rounded-xl text-white font-black text-sm shadow active:scale-95 transition-transform flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #22C55E, #16A34A)' }}>
                  <CheckCircle2 size={18} /> I HAVE PAID — SUBMIT UTR
                </button>

                <button onClick={() => setStep('select')} className="w-full py-2.5 text-gray-400 text-sm font-semibold">
                  ← Go Back
                </button>
              </div>
            )}

            {/* Step 3: Confirm with UTR */}
            {step === 'confirm' && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                  <p className="text-green-700 text-sm font-semibold">
                    Payment of ₹{parseFloat(amount).toLocaleString('en-IN')} done? Submit your UTR below
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">
                      UTR / Transaction ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={utrNumber}
                      onChange={e => setUtrNumber(e.target.value)}
                      placeholder="Enter 12-digit UTR or Transaction ID"
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-3 text-sm bg-gray-50 outline-none focus:border-orange-400 font-mono font-bold"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Find UTR in your payment app → Transaction details</p>
                  </div>

                  {/* Screenshot upload */}
                  <div>
                    <label className="text-xs font-bold text-gray-700 mb-1 block">
                      Payment Screenshot <span className="text-gray-400">(optional)</span>
                    </label>
                    {screenshotPreview ? (
                      <div className="relative">
                        <img src={screenshotPreview} alt="screenshot" className="w-full rounded-xl border border-gray-200 max-h-40 object-cover" />
                        <button onClick={() => { setScreenshot(null); setScreenshotPreview(''); }}
                          className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center">
                          <X size={14} className="text-white" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => fileRef.current?.click()}
                        className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 flex flex-col items-center gap-2 hover:border-orange-300 transition-colors">
                        <Upload size={22} className="text-gray-400" />
                        <span className="text-xs text-gray-400 font-semibold">Tap to upload screenshot</span>
                      </button>
                    )}
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleScreenshotChange} className="hidden" />
                  </div>

                  <button onClick={handleSubmitDeposit} disabled={loading}
                    className="w-full py-4 rounded-xl text-white font-black text-base shadow active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
                    {loading ? <><Loader2 size={18} className="animate-spin" /> Submitting...</> : <><ArrowDown size={18} /> SUBMIT DEPOSIT REQUEST</>}
                  </button>

                  <button onClick={() => setStep('pay')} className="w-full py-2 text-gray-400 text-sm font-semibold">
                    ← Back to Payment
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ───────────────── WITHDRAW TAB ───────────────── */}
        {tab === 'withdraw' && (
          <>
            {bankDetails?.account_number ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600 shrink-0" />
                <div className="flex-1">
                  <p className="text-green-700 text-sm font-semibold">Bank Account Linked</p>
                  <p className="text-green-500 text-xs">{bankDetails.bank_name || 'Bank'} — ****{bankDetails.account_number?.slice(-4)}</p>
                </div>
                <button onClick={() => navigate('/profile?tab=bank')} className="text-xs text-green-600 font-bold underline">Change</button>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-amber-700 text-sm font-semibold">Bank Account Required</p>
                  <p className="text-amber-500 text-xs mt-0.5">Add your bank account in Profile to enable withdrawals.</p>
                </div>
                <button onClick={() => navigate('/profile?tab=bank')}
                  className="text-xs text-white font-bold px-2.5 py-1.5 rounded-lg shrink-0"
                  style={{ background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' }}>
                  Add Bank
                </button>
              </div>
            )}

            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-4">
              <p className="font-black text-gray-800">Select Withdrawal Amount</p>
              <div className="grid grid-cols-3 gap-2">
                {[500, 1000, 2000, 5000, 10000, 25000].map(q => (
                  <button key={q} onClick={() => setWdAmount(String(q))}
                    className={`py-3 rounded-xl text-xs font-bold border-2 transition-all ${wdAmount === String(q) ? 'border-orange-400 text-orange-500 bg-orange-50' : 'border-gray-200 text-gray-600 bg-gray-50'}`}>
                    ₹{q.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <input type="number" value={wdAmount} onChange={e => setWdAmount(e.target.value)}
                placeholder="Or enter amount (min ₹500)"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 text-sm bg-gray-50 outline-none focus:border-orange-400 font-bold" />
              <p className="text-xs text-gray-400">
                Available: <span className="font-black text-gray-700">₹{(user?.balance || 0).toLocaleString('en-IN')}</span>
              </p>

              {bankDetails?.account_number && (
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 flex items-start gap-2">
                  <Building2 size={16} className="text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-gray-700">Payout To</p>
                    <p className="text-sm font-black text-gray-800">{bankDetails.account_holder || user?.name}</p>
                    <p className="text-xs text-gray-500">{bankDetails.bank_name} • ****{bankDetails.account_number?.slice(-4)}</p>
                    <p className="text-xs text-gray-400 font-mono">{bankDetails.ifsc_code}</p>
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2 flex items-start gap-2">
                <Clock size={13} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-[11px] text-blue-600 font-medium">Withdrawals are processed within 24 hours by admin</p>
              </div>

              <button onClick={handleWithdraw} disabled={wdLoading || !bankDetails?.account_number}
                className="w-full py-4 rounded-xl text-white font-black text-base shadow active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
                {wdLoading ? <><Loader2 size={18} className="animate-spin" /> Processing...</> : <><ArrowUp size={18} /> WITHDRAW ₹{parseFloat(wdAmount || '0').toLocaleString('en-IN') || '---'}</>}
              </button>
            </div>
          </>
        )}

        {/* ───────────────── HISTORY TAB ───────────────── */}
        {tab === 'history' && (
          <div className="space-y-3">
            <div className="flex bg-white rounded-2xl shadow-sm border border-gray-100 p-1 gap-1">
              {[
                { id: 'deposits', icon: ArrowDown, label: 'Deposits' },
                { id: 'withdrawals', icon: ArrowUp, label: 'Withdrawals' },
              ].map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setHistoryTab(id as typeof historyTab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${historyTab === id ? 'text-white shadow' : 'text-gray-500'}`}
                  style={historyTab === id ? { background: 'linear-gradient(135deg, #FF6B1A, #FF1D78)' } : {}}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            {historyLoading ? (
              <div className="flex justify-center py-12"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>
            ) : (
              <div className="space-y-2">
                {(historyTab === 'deposits' ? deposits : withdrawals).map((item: any) => (
                  <div key={item.id} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${historyTab === 'deposits' ? 'bg-green-50' : 'bg-red-50'}`}>
                        {historyTab === 'deposits' ? <ArrowDown size={18} className="text-green-600" /> : <ArrowUp size={18} className="text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800 text-sm">{historyTab === 'deposits' ? 'Deposit' : 'Withdrawal'}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${statusColors[item.status] || 'text-gray-500 bg-gray-50 border-gray-200'}`}>
                            {item.status.toUpperCase()}
                          </span>
                        </div>
                        {item.upi_ref && <p className="text-[10px] text-gray-400 mt-0.5 font-mono">Ref: {item.upi_ref}</p>}
                        <p className="text-[10px] text-gray-400 flex items-center gap-0.5 mt-0.5">
                          <Clock size={9} />
                          {new Date(item.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <p className={`font-black text-base shrink-0 ${historyTab === 'deposits' ? 'text-green-600' : 'text-red-500'}`}>
                        {historyTab === 'deposits' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
                {(historyTab === 'deposits' ? deposits : withdrawals).length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    <BarChart2 size={36} className="mx-auto mb-2 text-gray-200" />
                    <p className="font-semibold">No {historyTab} yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
      <BottomNav />
    </div>
  );
};

export default FundsPage;
