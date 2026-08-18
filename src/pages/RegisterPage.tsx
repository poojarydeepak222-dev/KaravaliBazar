import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Phone, Lock, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const RegisterPage = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [mpin, setMpin] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!mobile || mobile.length !== 10) return toast.error('Enter valid 10-digit mobile number');
    if (!name.trim()) return toast.error('Enter your name');
    if (!password || password.length < 6) return toast.error('Password must be at least 6 characters');
    if (!mpin || mpin.length !== 4) return toast.error('MPIN must be exactly 4 digits');
    setLoading(true);
    const { data: existing } = await supabase.from('app_users').select('id').eq('mobile', mobile).single();
    if (existing) { setLoading(false); return toast.error('Mobile number already registered'); }
    const { error } = await supabase.from('app_users').insert({ mobile, name: name.trim(), password, mpin, balance: 0, role: 'user' });
    setLoading(false);
    if (error) return toast.error('Registration failed. Try again.');
    toast.success('Account created successfully! Please login.');
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #FF6B1A 0%, #FF1D78 100%)' }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-8 pb-6">
        <div className="mb-5 flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mb-2 shadow-xl">
            <span className="text-white font-black text-2xl">KB</span>
          </div>
          <h1 className="text-white font-black text-2xl tracking-wide">KARAVALI BAZAR</h1>
        </div>

        <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-5 text-center">Create Account</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Full Name</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 focus-within:border-orange-400">
                <User size={18} className="text-orange-400 mr-2 shrink-0" />
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter your full name" className="flex-1 bg-transparent outline-none text-gray-800 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Phone Number</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 focus-within:border-orange-400">
                <Phone size={18} className="text-orange-400 mr-2 shrink-0" />
                <input type="tel" maxLength={10} value={mobile} onChange={e => setMobile(e.target.value.replace(/\D/g, ''))} placeholder="Enter 10-digit mobile number" className="flex-1 bg-transparent outline-none text-gray-800 text-sm" />
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">Password</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 focus-within:border-orange-400">
                <Lock size={18} className="text-orange-400 mr-2 shrink-0" />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" className="flex-1 bg-transparent outline-none text-gray-800 text-sm" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400 ml-2">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1 block">4-Digit M-PIN</label>
              <div className="flex items-center border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 focus-within:border-orange-400">
                <Lock size={18} className="text-orange-400 mr-2 shrink-0" />
                <input type="password" maxLength={4} value={mpin} onChange={e => setMpin(e.target.value.replace(/\D/g, ''))} placeholder="Create 4-digit MPIN" className="flex-1 bg-transparent outline-none text-gray-800 text-sm" />
              </div>
              <p className="text-xs text-gray-400 mt-1">This will be used every time you login</p>
            </div>
            <button
              onClick={handleRegister} disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm tracking-widest shadow-lg active:scale-95 transition-transform disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}
            >
              {loading ? 'Creating Account...' : 'CREATE ACCOUNT'}
            </button>
            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <Link to="/login" className="text-orange-500 font-semibold">Login Now</Link>
            </p>
          </div>
        </div>
      </div>
      <p className="text-white/60 text-xs text-center pb-6">By continuing you agree to our Terms & Conditions</p>
    </div>
  );
};

export default RegisterPage;
