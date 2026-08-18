import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(160deg, #fff5f0 0%, #fff0f5 100%)' }}>
      <div className="text-center px-6">
        <div className="text-6xl mb-4">🎯</div>
        <h1 className="text-4xl font-black text-gray-800 mb-2">404</h1>
        <p className="text-gray-500 text-lg mb-6">Page not found</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-2xl text-white font-bold shadow-lg"
          style={{ background: 'linear-gradient(135deg, #FF6B1A 0%, #FF1D78 100%)' }}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default NotFound;
