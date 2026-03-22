import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getPlayer,
  getTournaments,
  getRankings,
  getNotifications,
  respondToTeamInvite,
  confirmGame,
  uploadAvatar,
} from '../api';
import { getPlayerPhotoOrPlaceholder } from '../playerPhotos';
import PlayerPhotoLightbox from '../components/PlayerPhotoLightbox';
import ImageCropper from '../components/ImageCropper';

const classificationColors = {
  A: 'bg-red-600/80 text-white',
  B: 'bg-yellow-600/80 text-white',
  C: 'bg-blue-600/80 text-white',
};

export default function MyPage() {
  const { user, updateUser } = useAuth();
  const [playerData, setPlayerData] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState({ type: '', text: '' });
  const [cropperSrc, setCropperSrc] = useState(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user?.id) fetchAll();
  }, [user?.id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [playerRes, tournamentsRes, rankingsRes, notifsRes] = await Promise.all([
        getPlayer(user.id),
        getTournaments().catch(() => []),
        getRankings().catch(() => []),
        getNotifications().catch(() => []),
      ]);
      setPlayerData(playerRes);
      setTournaments(tournamentsRes);
      setRankings(rankingsRes);
      setNotifications(notifsRes);
      setAvatarPreview(playerRes?.player?.profile_picture || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Active tournament check
  const activeTournaments = tournaments.filter((t) => t.status === 'active');
  const hasActiveTournament = activeTournaments.length > 0;

  // Player data
  const player = playerData?.player || playerData || {};
  const stats = playerData?.stats || {};
  const playerTournaments = playerData?.tournaments || [];

  // Stats calculations
  const totalMatches = stats.matches_played || ((stats.matches_won || 0) + (stats.matches_lost || 0));
  const winPct = totalMatches > 0 ? ((stats.matches_won || 0) / totalMatches) * 100 : 0;
  const gameWinPct = stats.game_win_pct || (stats.total_games > 0 ? ((stats.games_won || 0) / stats.total_games) * 100 : 0);

  // Ranking position
  const myRanking = rankings.find((r) => r.player_id === user?.id);
  const rankPosition = myRanking?.rank || null;
  const overallScore = myRanking?.score ?? null;

  // Avatar handlers
  // Resolve display avatar: uploaded > known player photo > null
  const displayAvatar = avatarPreview || getPlayerPhotoOrPlaceholder(player.name || user?.name, null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    setAvatarMsg({ type: '', text: '' });
    if (!file.type.startsWith('image/')) {
      setAvatarMsg({ type: 'error', text: 'Please select an image file.' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCropperSrc(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleCropConfirm = (croppedDataUrl) => {
    setCropperSrc(null);
    setAvatarPreview(croppedDataUrl);
    handleUpload(croppedDataUrl);
  };

  const handleCropCancel = () => {
    setCropperSrc(null);
  };

  const handleUpload = async (imageData) => {
    setAvatarMsg({ type: '', text: '' });
    try {
      setUploading(true);
      await uploadAvatar(user.id, imageData);
      if (updateUser) updateUser({ ...user, profile_picture: imageData });
      setAvatarMsg({ type: 'success', text: 'Profile picture updated!' });
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.message || 'Failed to upload.' });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePicture = async () => {
    setAvatarMsg({ type: '', text: '' });
    try {
      setUploading(true);
      await uploadAvatar(user.id, null);
      setAvatarPreview(null);
      if (updateUser) updateUser({ ...user, profile_picture: null });
      setAvatarMsg({ type: 'success', text: 'Profile picture removed.' });
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.message || 'Failed to remove.' });
    } finally {
      setUploading(false);
    }
  };

  // Notification handlers
  const actionableNotifications = notifications.filter(
    (n) => !n.read && (n.type === 'team_invite' || n.type === 'score_confirm')
  );

  const handleTeamResponse = async (notif, accept) => {
    try {
      const data = JSON.parse(notif.data || '{}');
      if (data.team_id) {
        await respondToTeamInvite(data.team_id, accept);
        const notifsRes = await getNotifications().catch(() => []);
        setNotifications(notifsRes);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleScoreResponse = async (notif, confirmed) => {
    try {
      const data = JSON.parse(notif.data || '{}');
      if (data.game_id) {
        await confirmGame(data.game_id, confirmed);
        const notifsRes = await getNotifications().catch(() => []);
        setNotifications(notifsRes);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="py-6 fade-in-up">
      {error && (
        <div className="mb-6 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ─── PROFILE SECTION ─── */}
      <div className="bg-felt-light rounded-lg p-6 border border-[#333] mb-6">
        <div className="flex items-center gap-5">
          {/* Clickable avatar */}
          <div className="relative group">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => {
                if (displayAvatar) setShowLightbox(true);
                else fileInputRef.current?.click();
              }}
              disabled={uploading}
              className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-gold"
              title={displayAvatar ? 'View photo' : 'Upload photo'}
            >
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={player.name || 'Player'}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover object-top border-2 border-gold"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green/20 border-2 border-green rounded-full flex items-center justify-center text-2xl sm:text-3xl font-bold text-gold">
                  {(player.name || user?.name || '?')[0].toUpperCase()}
                </div>
              )}
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                {displayAvatar ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-gold border-t-transparent"></div>
                </div>
              )}
            </button>
            {/* Camera button to change photo */}
            {displayAvatar && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -left-1 bg-felt-lighter border border-gold/40 rounded-full w-7 h-7 flex items-center justify-center text-gold hover:bg-green/30 transition-colors"
                title="Change picture"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            {avatarPreview && avatarPreview.startsWith('data:') && (
              <button
                onClick={handleRemovePicture}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 bg-felt-lighter border border-[#555] rounded-full w-6 h-6 flex items-center justify-center text-muted hover:text-red-400 hover:border-red-400 transition-colors text-xs"
                title="Remove picture"
              >
                &times;
              </button>
            )}
          </div>

          {/* Name + info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
              {player.name || user?.name}
            </h1>
            <div className="text-sm text-muted mt-0.5">
              ID: <span className="text-text">{player.owba_id || user?.owba_id}</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {player.classification && (
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${classificationColors[player.classification] || 'bg-gray-600 text-white'}`}>
                  Class {player.classification}
                </span>
              )}
              {rankPosition && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gold/20 text-gold border border-gold/30">
                  Rank #{rankPosition}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Avatar feedback message */}
        {avatarMsg.text && (
          <div className={`mt-3 p-2 rounded text-sm text-center ${
            avatarMsg.type === 'error' ? 'bg-red-600/20 text-red-400' : 'bg-green/20 text-green-400'
          }`}>
            {avatarMsg.text}
          </div>
        )}

        {/* Quick link: Change Password */}
        <div className="mt-4 pt-3 border-t border-[#333]">
          <Link
            to="/change-password"
            className="text-sm text-muted hover:text-gold transition-colors"
          >
            Change Password &rarr;
          </Link>
        </div>
      </div>

      {/* ─── ADD GAME BUTTON ─── */}
      {hasActiveTournament ? (
        <Link
          to="/add-game"
          className="block mb-6 rounded-lg p-5 border border-gold/30 hover:border-gold/60 hover:shadow-lg hover:shadow-gold/10 transition-all duration-300 group"
          style={{ background: 'linear-gradient(90deg, #0f4225, #1a6b3a)' }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">+ Add Game</h2>
              <p className="text-sm text-white/70">Record a new match result</p>
            </div>
            <div className="text-3xl text-white/60 group-hover:text-gold transition-colors">
              &#127921;
            </div>
          </div>
        </Link>
      ) : (
        <div className="mb-6 rounded-lg p-4 border border-[#333] bg-felt-light text-center">
          <span className="text-muted text-sm">No active tournaments</span>
        </div>
      )}

      {/* ─── NOTIFICATIONS (actionable only) ─── */}
      {actionableNotifications.length > 0 && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gold flex items-center gap-2">
              Notifications
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {actionableNotifications.length}
              </span>
            </h2>
          </div>
          <div className="space-y-2">
            {actionableNotifications.map((notif) => {
              const isTeamInvite = notif.type === 'team_invite';
              const isScoreConfirm = notif.type === 'score_confirm';

              return (
                <div
                  key={notif.id}
                  className="bg-felt-light rounded-lg p-4 border border-gold/30 bg-gold/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm text-text">{notif.message}</p>
                      <p className="text-xs text-muted mt-1">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-gold rounded-full shrink-0 mt-2"></div>
                  </div>

                  {isTeamInvite && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleTeamResponse(notif, true)}
                        className="text-xs px-3 py-1.5 bg-green hover:bg-dark-green text-white rounded transition-colors"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleTeamResponse(notif, false)}
                        className="text-xs px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                      >
                        Decline
                      </button>
                    </div>
                  )}

                  {isScoreConfirm && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleScoreResponse(notif, true)}
                        className="text-xs px-3 py-1.5 bg-green hover:bg-dark-green text-white rounded transition-colors"
                      >
                        Confirm Score
                      </button>
                      <button
                        onClick={() => handleScoreResponse(notif, false)}
                        className="text-xs px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                      >
                        Dispute
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── MY STATS ─── */}
      <section className="mb-6">
        <h2 className="text-lg font-semibold text-gold mb-3">My Stats</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="Matches Played" value={totalMatches} />
          <StatCard label="Wins" value={stats.matches_won || 0} color="text-green-400" />
          <StatCard label="Losses" value={stats.matches_lost || 0} color="text-red-400" />
          <StatCard label="Match Win%" value={`${winPct.toFixed(1)}%`} color="text-gold" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatCard label="Games Won" value={stats.games_won || 0} color="text-green-400" />
          <StatCard label="Total Games" value={stats.total_games || 0} />
          <StatCard
            label="Game Win%"
            value={`${(typeof gameWinPct === 'number' ? gameWinPct : 0).toFixed(1)}%`}
            color="text-gold"
          />
          {overallScore != null ? (
            <StatCard label="Overall Score" value={overallScore.toFixed(1)} color="text-light-gold" />
          ) : (
            <StatCard label="Overall Score" value="—" color="text-muted" />
          )}
        </div>

        {/* Win rate bar */}
        <div className="bg-felt-light rounded-lg p-4 border border-[#333]">
          <h3 className="text-sm font-medium text-muted mb-2">Overall Match Win Rate</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-3 bg-dark rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-dark-green to-green rounded-full transition-all duration-500"
                style={{ width: `${winPct}%` }}
              ></div>
            </div>
            <span className="text-sm font-bold text-gold min-w-[50px] text-right">
              {winPct.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between text-xs text-muted mt-1">
            <span>{stats.matches_won || 0}W - {stats.matches_lost || 0}L</span>
            <span>{totalMatches} played</span>
          </div>
        </div>
      </section>

      {/* ─── TOURNAMENT HISTORY ─── */}
      <section>
        <h2 className="text-lg font-semibold text-gold mb-3">Tournament History</h2>
        {playerTournaments.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {playerTournaments.map((t, i) => {
              const tTotal = (t.matches_won || 0) + (t.matches_lost || 0);
              const tPct = tTotal > 0 ? ((t.matches_won || 0) / tTotal) * 100 : 0;
              const tGamePct =
                t.total_games > 0 ? ((t.games_won || 0) / t.total_games) * 100 : 0;
              return (
                <div
                  key={t.tournament_id || i}
                  className="bg-felt-light rounded-lg p-4 border border-[#333]"
                >
                  <h3 className="font-bold text-white mb-2">
                    {t.tournament_name || t.name}
                  </h3>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm mb-3">
                    <div>
                      <div className="text-green-400 font-bold">{t.matches_won || 0}</div>
                      <div className="text-muted text-xs">Won</div>
                    </div>
                    <div>
                      <div className="text-red-400 font-bold">{t.matches_lost || 0}</div>
                      <div className="text-muted text-xs">Lost</div>
                    </div>
                    <div>
                      <div className="text-gold font-bold">{tPct.toFixed(0)}%</div>
                      <div className="text-muted text-xs">Match%</div>
                    </div>
                    <div>
                      <div className="text-light-gold font-bold">{tGamePct.toFixed(0)}%</div>
                      <div className="text-muted text-xs">Game%</div>
                    </div>
                  </div>
                  <div className="h-2 bg-dark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green rounded-full transition-all duration-500"
                      style={{ width: `${tPct}%` }}
                    ></div>
                  </div>
                  {t.score != null && (
                    <div className="text-right text-xs text-muted mt-1">
                      Score: <span className="text-gold font-bold">{t.score.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] text-center text-muted">
            No tournament data available yet.
          </div>
        )}
      </section>

      {showLightbox && displayAvatar && (
        <PlayerPhotoLightbox
          src={displayAvatar}
          alt={player.name || user?.name}
          onClose={() => setShowLightbox(false)}
        />
      )}

      {cropperSrc && (
        <ImageCropper
          imageSrc={cropperSrc}
          onConfirm={handleCropConfirm}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-felt-light rounded-lg p-3 border border-[#333] text-center">
      <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
