import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [owbaId, setOwbaId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!owbaId.trim() || !password.trim()) {
      setError('Please enter both OWBA ID and password.');
      return;
    }

    try {
      setLoading(true);
      const data = await login(owbaId.trim(), password);
      if (data.user && data.user.temp_password) {
        navigate('/change-password');
      } else {
        navigate('/my-page');
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-felt-light rounded-lg p-8 border border-[#333] shadow-xl border-gold/20">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">
              <span role="img" aria-label="billiards">🎱</span>
            </div>
            <h1 className="text-2xl font-bold text-light-gold">OWBA</h1>
            <p className="text-muted text-sm mt-1">Orange Walk Billiards Association</p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="owba_id" className="block text-sm font-medium text-text mb-1">
                OWBA ID
              </label>
              <input
                id="owba_id"
                type="text"
                value={owbaId}
                onChange={(e) => setOwbaId(e.target.value)}
                className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                placeholder="e.g. OWBA-001"
                autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold hover:bg-light-gold text-dark font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gold border-t-transparent"></div>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
