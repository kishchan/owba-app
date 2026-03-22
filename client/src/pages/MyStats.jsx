import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPlayer } from '../api';

export default function MyStats() {
  const { user } = useAuth();
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchPlayerData();
    }
  }, [user?.id]);

  const fetchPlayerData = async () => {
    try {
      setLoading(true);
      const data = await getPlayer(user.id);
      setPlayerData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  const player = playerData?.player || playerData || {};
  const stats = playerData?.stats || {};
  const tournaments = playerData?.tournaments || [];

  const totalMatches = stats.matches_played || ((stats.matches_won || 0) + (stats.matches_lost || 0));
  const winPct = totalMatches > 0 ? ((stats.matches_won || 0) / totalMatches) * 100 : 0;
  const gameWinPct = stats.game_win_pct || (stats.total_games > 0 ? ((stats.games_won || 0) / stats.total_games) * 100 : 0);

  return (
    <div className="py-6 fade-in-up">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6">
        <span role="img" aria-label="billiards">🎱</span> My Stats
      </h1>

      {/* Add Game CTA */}
      <Link
        to="/add-game"
        className="block mb-6 rounded-lg p-5 border border-gold/30 hover:opacity-90 transition-all duration-300 group"
        style={{ background: 'linear-gradient(90deg, #0f4225, #1a6b3a)' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Add a Game</h2>
            <p className="text-sm text-white/70">Record a new match result</p>
          </div>
          <div className="text-3xl text-white/80 group-hover:text-white transition-colors">+</div>
        </div>
      </Link>

      {/* Player card */}
      <div className="bg-felt-light rounded-lg p-6 border border-[#333] mb-6">
        <div className="flex items-center gap-4">
          {player.profile_picture ? (
            <img
              src={player.profile_picture}
              alt={player.name || 'Player'}
              className="w-16 h-16 rounded-full object-cover border-2 border-gold"
            />
          ) : (
            <div className="w-16 h-16 bg-green/20 border-2 border-green rounded-full flex items-center justify-center text-2xl font-bold text-gold">
              {(player.name || '?')[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{player.name || user?.name}</h2>
            <div className="text-sm text-muted space-y-0.5">
              <div>ID: <span className="text-text">{player.owba_id || user?.owba_id}</span></div>
              <div>Classification: <span className="text-text">{player.classification || 'Unclassified'}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Matches Played" value={totalMatches} />
        <StatCard label="Wins" value={stats.matches_won || 0} color="text-green-400" />
        <StatCard label="Losses" value={stats.matches_lost || 0} color="text-red-400" />
        <StatCard label="Match Win%" value={`${winPct.toFixed(1)}%`} color="text-gold" />
      </div>

      {/* Game stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Games Won" value={stats.games_won || 0} color="text-green-400" />
        <StatCard label="Total Games" value={stats.total_games || 0} />
        <StatCard label="Game Win%" value={`${(typeof gameWinPct === 'number' ? gameWinPct : 0).toFixed(1)}%`} color="text-gold" />
      </div>

      {/* Win rate bar */}
      <div className="bg-felt-light rounded-lg p-5 border border-[#333] mb-6">
        <h3 className="text-sm font-medium text-muted mb-3">Overall Match Win Rate</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 bg-dark rounded-full overflow-hidden">
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

      {/* Per-tournament breakdown */}
      {tournaments.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gold mb-4">Tournament History</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {tournaments.map((t, i) => {
              const tTotal = (t.matches_won || 0) + (t.matches_lost || 0);
              const tPct = tTotal > 0 ? ((t.matches_won || 0) / tTotal) * 100 : 0;
              const tGamePct = t.total_games > 0 ? ((t.games_won || 0) / t.total_games) * 100 : 0;
              return (
                <div key={t.tournament_id || i} className="bg-felt-light rounded-lg p-4 border border-[#333]">
                  <h3 className="font-bold text-white mb-2">{t.tournament_name || t.name}</h3>
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
        </section>
      )}

      {tournaments.length === 0 && (
        <div className="bg-felt-light rounded-lg p-6 border border-[#333] text-center text-muted">
          No tournament data available yet.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = 'text-white' }) {
  return (
    <div className="bg-felt-light rounded-lg p-4 border border-[#333] text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-1">{label}</div>
    </div>
  );
}
