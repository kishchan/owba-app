import { useState, useEffect } from 'react';
import { getRankings } from '../api';
import Podium from '../components/Podium';
import { getPlayerPhotoOrPlaceholder, getPlayerInitials } from '../playerPhotos';

function PlayerAvatar({ name, profilePicture }) {
  const src = getPlayerPhotoOrPlaceholder(name, profilePicture);
  if (src) {
    return <img src={src} alt={name} className="w-[34px] h-[34px] rounded-full object-cover object-top border-2 border-green" />;
  }
  const initials = getPlayerInitials(name);
  return (
    <div className="w-[34px] h-[34px] rounded-full bg-felt-lighter border-2 border-green flex items-center justify-center text-xs font-bold text-muted">
      {initials}
    </div>
  );
}

function ClassBadge({ classification }) {
  const cls = classification?.toUpperCase();
  const styles = {
    A: 'bg-gold/20 text-light-gold border border-gold/40',
    B: 'bg-green/25 text-green-400 border border-green/40',
    C: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold tracking-wide ${styles[cls] || styles.C}`}>
      {cls || '-'}
    </span>
  );
}

export default function Rankings() {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const data = await getRankings();
      setRankings(data);
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
        <button
          onClick={fetchRankings}
          className="mt-4 px-4 py-2 bg-green hover:bg-dark-green text-light-gold rounded-lg transition-colors border border-gold/30"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="py-6 fade-in-up">
      {/* Hero */}
      <div className="text-center mb-8 py-6 rounded-lg border-b border-[#333]"
           style={{ background: 'linear-gradient(180deg, #0f4225 0%, #0d0d0d 100%)' }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gold uppercase tracking-wider">
          &#127942; Season Rankings
        </h1>
        <p className="text-muted text-sm mt-1">{rankings.length} Ranked Players &nbsp;|&nbsp; Combined Tournament Rankings</p>
      </div>

      {/* Podium for top 3 */}
      {rankings.length >= 3 && <Podium players={rankings.slice(0, 3)} />}

      {/* Section title */}
      <div className="text-sm font-bold uppercase tracking-widest text-gold border-l-4 border-gold pl-3 mb-6">
        &#128203; Overall Player Rankings
      </div>

      {/* Full rankings table */}
      <div className="rounded-xl border border-[#333] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead style={{ background: 'linear-gradient(90deg, #0f4225, #1a6b3a)' }}>
              <tr className="text-light-gold text-xs uppercase tracking-wider">
                <th className="text-left py-3.5 px-2 sm:px-3">Rank</th>
                <th className="text-left py-3.5 px-2 sm:px-3">Player</th>
                <th className="text-left py-3.5 px-2 sm:px-3 hidden sm:table-cell">Class</th>
                <th className="text-center py-3.5 px-2 sm:px-3 hidden md:table-cell">P</th>
                <th className="text-center py-3.5 px-2 sm:px-3">W</th>
                <th className="text-center py-3.5 px-2 sm:px-3">L</th>
                <th className="text-center py-3.5 px-2 sm:px-3 hidden md:table-cell">M Win%</th>
                <th className="text-center py-3.5 px-2 sm:px-3 hidden lg:table-cell">G Win%</th>
                <th className="text-right py-3.5 px-2 sm:px-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {rankings.map((player, i) => {
                const rank = player.rank || i + 1;
                return (
                  <tr
                    key={player.player_id || i}
                    className={`border-b border-[#2a2a2a] hover:bg-white/[0.04] transition-colors ${
                      i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#2a2a2a]'
                    }`}
                  >
                    <td className="py-3 px-2 sm:px-3">
                      <span className={`font-extrabold ${
                        rank === 1 ? 'text-gold' : rank === 2 ? 'text-silver' : rank === 3 ? 'text-bronze' : 'text-gold'
                      }`}>
                        {rank}
                      </span>
                    </td>
                    <td className="py-3 px-2 sm:px-3">
                      <div className="flex items-center gap-3">
                        <PlayerAvatar name={player.name} profilePicture={player.profile_picture} />
                        <span className="font-semibold">{player.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 sm:px-3 hidden sm:table-cell">
                      <ClassBadge classification={player.classification} />
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center hidden md:table-cell text-muted">
                      {player.matches_played || 0}
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center text-green-400 font-semibold">
                      {player.matches_won || 0}
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center text-red-400 font-semibold">
                      {player.matches_lost || 0}
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center hidden md:table-cell text-muted">
                      {player.match_win_pct != null ? `${player.match_win_pct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-center hidden lg:table-cell text-muted">
                      {player.game_win_pct != null ? `${player.game_win_pct.toFixed(1)}%` : '-'}
                    </td>
                    <td className="py-3 px-2 sm:px-3 text-right font-bold text-light-gold">
                      {player.score != null ? player.score.toFixed(1) : '0'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rankings.length === 0 && (
          <div className="text-center py-12 text-muted">
            No rankings data available yet.
          </div>
        )}
      </div>
    </div>
  );
}
