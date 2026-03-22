import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { uploadAvatar } from '../api';

function PlayerAvatar({ name, profilePicture, size = 'lg' }) {
  const sizes = { sm: 'w-10 h-10 text-sm', md: 'w-16 h-16 text-xl', lg: 'w-24 h-24 text-3xl' };
  if (profilePicture) {
    return <img src={profilePicture} alt={name} className={`${sizes[size]} rounded-full object-cover border-2 border-gold`} />;
  }
  const initials = (name || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className={`${sizes[size]} rounded-full bg-green/20 border-2 border-green flex items-center justify-center font-bold text-gold`}>
      {initials}
    </div>
  );
}

export default function ProfileSettings() {
  const { user, updateUser } = useAuth();
  const [preview, setPreview] = useState(user?.profile_picture || null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError('');
    setSuccess('');

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!preview) return;
    setError('');
    setSuccess('');
    try {
      setUploading(true);
      await uploadAvatar(user.id, preview);
      if (updateUser) updateUser({ ...user, profile_picture: preview });
      setSuccess('Profile picture updated!');
    } catch (err) {
      setError(err.message || 'Failed to upload.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setError('');
    setSuccess('');
    try {
      setUploading(true);
      await uploadAvatar(user.id, null);
      setPreview(null);
      if (updateUser) updateUser({ ...user, profile_picture: null });
      setSuccess('Profile picture removed.');
    } catch (err) {
      setError(err.message || 'Failed to remove.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="py-6 fade-in-up">
      <Link to="/my-stats" className="text-gold hover:text-light-gold text-sm mb-4 inline-block">
        &larr; Back to My Stats
      </Link>

      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6 text-light-gold">
          <span role="img" aria-label="settings">&#9881;</span> Profile Settings
        </h1>

        <div className="bg-felt-light rounded-lg p-6 border border-[#333]">
          {/* Current avatar */}
          <div className="flex flex-col items-center mb-6">
            <PlayerAvatar name={user?.name} profilePicture={preview} size="lg" />
            <h2 className="mt-3 text-lg font-bold text-light-gold">{user?.name}</h2>
            <p className="text-muted text-sm">{user?.owba_id}</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green/20 border border-green/50 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {/* File input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <div className="space-y-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-green hover:bg-dark-green text-light-gold font-medium py-2.5 px-4 rounded-lg transition-colors border border-gold/30"
            >
              Choose Photo
            </button>

            {preview && preview !== user?.profile_picture && (
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-gold hover:bg-light-gold text-dark font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {uploading ? 'Uploading...' : 'Save Profile Picture'}
              </button>
            )}

            {(preview || user?.profile_picture) && (
              <button
                onClick={handleRemove}
                disabled={uploading}
                className="w-full bg-felt-lighter hover:bg-light-gray text-muted font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                Remove Picture
              </button>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-6 space-y-3">
          <Link
            to="/change-password"
            className="block bg-felt-light rounded-lg p-4 border border-[#333] hover:border-gold/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-text font-medium">Change Password</span>
              <span className="text-muted">&rarr;</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export { PlayerAvatar };
