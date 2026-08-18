import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setTempUser } = useAuth();
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!mobile || mobile.length !== 10) return toast.error('Enter valid 10-digit mobile number');
    if (!password) return toast.error('Enter password');
    setLoading(true);
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('mobile', mobile)
      .eq('password', password)
      .single();
    setLoading(false);
    if (error || !data) return toast.error('Invalid mobile number or password');
    if (!data.is_active) return toast.error('Account is disabled. Contact admin.');
    setTempUser(data);
    navigate('/mpin');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #FF6B1A 0%, #FF1D78 100%)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-3 shadow-xl">
            <span className="text-white font-black text-3xl">KB</span>
          </div>
          <h1 className="text-white font-black text-3xl tracking-wide">KARAVALI BAZAR</h1>
          <p className="text-white/80 text-sm mt-1">India's Most Trusted Matka Platform</p>
        </div>

        {/* Form Card */}
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5 text-center">Login to Your Account</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Phone Number</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                <Phone size={18} className="text-orange-400 mr-2 shrink-0" />
                <input
                  type="tel" maxLength={10} value={mobile}
                  onChange={e => setMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter 10-digit mobile number"
                  className="flex-1 bg-transparent outline-none text-gray-800 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Password</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                <Lock size={18} className="text-orange-400 mr-2 shrink-0" />
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="flex-1 bg-transparent outline-none text-gray-800 text-sm"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 ml-2">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4 accent-orange-500" />
              <span className="text-sm text-gray-600">Remember me on this device</span>
            </label>
            <button
              onClick={handleLogin} disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-widest shadow-lg active:scale-95 transition-transform disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}
            >
              {loading ? 'Verifying...' : 'LOGIN'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Don't have an account?{' '}
              <Link to="/register" className="text-orange-500 font-semibold">Register Now</Link>
            </p>
          </div>
        </div>
      </div>
      <p className="text-white/60 text-xs text-center pb-6">By continuing you agree to our Terms & Conditions</p>
    </div>
  );
};

export default LoginPage;
