import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const MpinPage = () => {
  const navigate = useNavigate();
  const { tempUser, login } = useAuth();
  const [pins, setPins] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const refs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    if (!tempUser) navigate('/login');
    refs[0].current?.focus();
  }, [tempUser]);

  const handleChange = (idx: number, val: string) => {
    const v = val.replace(/\D/g, '').slice(-1);
    const newPins = [...pins];
    newPins[idx] = v;
    setPins(newPins);
    if (v && idx < 3) refs[idx + 1].current?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pins[idx] && idx > 0) refs[idx - 1].current?.focus();
  };

  const handleVerify = async () => {
    const enteredPin = pins.join('');
    if (enteredPin.length !== 4) return toast.error('Enter 4-digit MPIN');
    if (!tempUser) return navigate('/login');
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    if (enteredPin === tempUser.mpin) {
      login(tempUser);
      toast.success(`Welcome back, ${tempUser.name}!`);
      if (tempUser.role === 'admin') navigate('/admin');
      else navigate('/');
    } else {
      toast.error('Incorrect MPIN');
      setPins(['', '', '', '']);
      refs[0].current?.focus();
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: 'linear-gradient(160deg, #fff5f0 0%, #fff0f5 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-[28px] flex items-center justify-center shadow-xl mb-4" style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}>
            <Shield size={36} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-800 tracking-wide">M-PIN VERIFICATION</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back, <span className="text-orange-500 font-semibold">{tempUser?.name}</span></p>
          <p className="text-gray-400 text-xs mt-1">Verify 4-digit M-PIN to access your account</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-bold text-gray-700 tracking-wider">ENTER MPIN</label>
            <button type="button" onClick={() => setShowPin(!showPin)} className="text-gray-400">
              {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div className="flex gap-3 justify-center mb-4">
            {pins.map((p, i) => (
              <input
                key={i} ref={refs[i]}
                type={showPin ? 'text' : 'password'}
                maxLength={1} value={p}
                onChange={e => handleChange(i, e.target.value)}
                onKeyDown={e => handleKeyDown(i, e)}
                className={`w-14 h-14 text-center text-xl font-bold border-2 rounded-2xl outline-none transition-all ${p ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-gray-50'}`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-400 mb-4">
            Forgot MPIN?{' '}
            <button className="text-orange-500 font-semibold" onClick={() => { toast.info('Contact admin to reset MPIN'); }}>Reset Now</button>
          </p>
          <button
            onClick={handleVerify} disabled={loading}
            className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-widest shadow-lg active:scale-95 transition-transform disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}
          >
            {loading ? 'Verifying...' : 'VERIFY'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MpinPage;
