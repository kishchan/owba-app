import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyMatches } from '../api';

const scoreStatusColors = {
  pending: 'bg-gray-600 text-text',
  awaiting_confirmation: 'bg-yellow-600 text-yellow-100',
  confirmed: 'bg-green-600 text-green-100',
  disputed: 'bg-red-600 text-red-100',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchMatches();
  }, []);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const data = await getMyMatches();
      setMatches(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const upcomingMatches = matches.filter(
    (m) => m.status === 'pending' || m.status === 'in_progress'
  );
  const completedMatches = matches.filter((m) => m.status === 'completed');

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="py-6 fade-in-up">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">
          Welcome, {user?.name || 'Player'}!
        </h1>
        <Link
          to="/add-game"
          className="bg-gold hover:bg-light-gold text-dark font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + Add Game
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Active / Upcoming Matches */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold text-gold mb-4">Active Matches</h2>
        {upcomingMatches.length === 0 ? (
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] text-center text-muted">
            No active matches. <Link to="/add-game" className="text-gold hover:text-light-gold">Add a game</Link> to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {upcomingMatches.map((match) => (
              <MatchCard key={match.id} match={match} userId={user?.id} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Results */}
      <section>
        <h2 className="text-xl font-semibold text-gold mb-4">Recent Results</h2>
        {completedMatches.length === 0 ? (
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] text-center text-muted">
            No completed matches yet.
          </div>
        ) : (
          <div className="space-y-4">
            {completedMatches.map((match) => (
              <MatchCard key={match.id} match={match} userId={user?.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MatchCard({ match, userId }) {
  return (
    <div className="bg-felt-light rounded-lg p-4 border border-[#333]">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="font-bold text-white">{match.team_a_name || 'Team A'}</span>
          <span className="text-muted text-sm">vs</span>
          <span className="font-bold text-white">{match.team_b_name || 'Team B'}</span>
        </div>
        <div className="flex items-center gap-2">
          {match.round && (
            <span className="text-xs text-muted bg-felt-lighter px-2 py-0.5 rounded">
              {match.round}
            </span>
          )}
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
            match.status === 'completed' ? 'bg-green-600 text-green-100' :
            match.status === 'in_progress' ? 'bg-yellow-600 text-yellow-100' :
            'bg-gray-600 text-text'
          }`}>
            {match.status ? match.status.replace('_', ' ') : 'pending'}
          </span>
        </div>
      </div>

      {match.tournament_name && (
        <div className="text-xs text-muted mb-3">{match.tournament_name}</div>
      )}

      {match.games && match.games.length > 0 && (
        <div className="space-y-2">
          {match.games.map((game, gi) => (
            <div
              key={game.id || gi}
              className="flex items-center justify-between text-sm py-2 px-3 rounded bg-dark/50 flex-wrap gap-2"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className={`truncate ${game.player_a_id === userId ? 'text-gold font-medium' : 'text-text'}`}>
                  {game.player_a_name || 'Player A'}
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`font-bold ${
                    game.player_a_score != null && game.player_b_score != null
                      ? game.player_a_score > game.player_b_score ? 'text-green-400' : 'text-muted'
                      : 'text-muted'
                  }`}>
                    {game.player_a_score ?? '-'}
                  </span>
                  <span className="text-muted">:</span>
                  <span className={`font-bold ${
                    game.player_a_score != null && game.player_b_score != null
                      ? game.player_b_score > game.player_a_score ? 'text-green-400' : 'text-muted'
                      : 'text-muted'
                  }`}>
                    {game.player_b_score ?? '-'}
                  </span>
                </div>
                <span className={`truncate ${game.player_b_id === userId ? 'text-gold font-medium' : 'text-text'}`}>
                  {game.player_b_name || 'Player B'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {game.status && (
                  <span className={`px-1.5 py-0.5 rounded text-xs ${scoreStatusColors[game.status] || ''}`}>
                    {game.status.replace(/_/g, ' ')}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
