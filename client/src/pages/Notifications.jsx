import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, respondToTeamInvite, confirmGame } from '../api';

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data.filter(n => !n.read));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamResponse = async (notif, accept) => {
    try {
      const data = JSON.parse(notif.data || '{}');
      if (data.team_id) {
        await respondToTeamInvite(data.team_id, accept);
        fetchNotifications();
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
        fetchNotifications();
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-text">Notifications</h1>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="bg-felt-light rounded-lg p-8 border border-[#333] text-center text-muted">
          No pending notifications.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map(notif => {
            const isTeamInvite = notif.type === 'team_invite';
            const isScoreConfirm = notif.type === 'score_confirm';

            return (
              <div
                key={notif.id}
                className="bg-felt-light rounded-lg p-4 border border-gold/30 bg-gold/5 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-text">
                      {notif.message}
                    </p>
                    <p className="text-xs text-muted mt-1">
                      {new Date(notif.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="w-2 h-2 bg-gold rounded-full shrink-0 mt-2"></div>
                </div>

                {/* Action buttons for team invites */}
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

                {/* Action buttons for score confirmations */}
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
      )}
    </div>
  );
}
