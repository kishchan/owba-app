import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../api';

export default function ChangePassword() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isTempPassword = user?.temp_password;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!currentPassword.trim()) {
      setError('Please enter your current password.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await changePassword(currentPassword, newPassword);

      // Update user in localStorage to remove temp_password flag
      const storedUser = localStorage.getItem('owba_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        parsed.temp_password = false;
        localStorage.setItem('owba_user', JSON.stringify(parsed));
      }

      navigate('/my-page');
    } catch (err) {
      setError(err.message || 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-felt-light rounded-lg p-8 border border-[#333] shadow-xl">
          <h1 className="text-2xl font-bold text-light-gold text-center mb-2">Change Password</h1>

          {isTempPassword && (
            <div className="mb-6 p-3 bg-yellow-600/20 border border-yellow-600/50 rounded-lg text-yellow-400 text-sm text-center">
              You must change your temporary password before continuing.
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                placeholder="Minimum 6 characters"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                placeholder="Re-enter new password"
                autoComplete="new-password"
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
                  Changing...
                </span>
              ) : (
                'Change Password'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
