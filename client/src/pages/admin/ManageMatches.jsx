import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournament, getTeams, getMatches, createMatch, overrideScore } from '../../api';

const scoreStatusColors = {
  pending: 'bg-gray-600 text-gray-200',
  awaiting_confirmation: 'bg-yellow-600 text-yellow-100',
  confirmed: 'bg-green-600 text-green-100',
  disputed: 'bg-red-600 text-red-100',
};

export default function ManageMatches() {
  const { id: tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Create match form
  const [formTeamA, setFormTeamA] = useState('');
  const [formTeamB, setFormTeamB] = useState('');
  const [formRound, setFormRound] = useState('');
  const [formNumGames, setFormNumGames] = useState(5);
  const [formGames, setFormGames] = useState([]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Override score
  const [overrideTarget, setOverrideTarget] = useState(null);
  const [overrideScoreA, setOverrideScoreA] = useState('');
  const [overrideScoreB, setOverrideScoreB] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tournamentData, teamsData, matchesData] = await Promise.all([
        getTournament(tournamentId),
        getTeams(tournamentId),
        getMatches(tournamentId),
      ]);
      setTournament(tournamentData);
      setTeams(teamsData);
      setMatches(matchesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const teamAPlayers = teams.find((t) => t.id === parseInt(formTeamA))?.players || [];
  const teamBPlayers = teams.find((t) => t.id === parseInt(formTeamB))?.players || [];

  const openCreateForm = () => {
    setFormTeamA('');
    setFormTeamB('');
    setFormRound('');
    setFormNumGames(tournament?.team_size || 5);
    setFormGames([]);
    setFormError('');
    setShowCreateForm(true);
  };

  useEffect(() => {
    const numGames = parseInt(formNumGames) || 0;
    setFormGames((prev) => {
      const newGames = [];
      for (let i = 0; i < numGames; i++) {
        newGames.push({
          player_a_id: prev[i]?.player_a_id || '',
          player_b_id: prev[i]?.player_b_id || '',
        });
      }
      return newGames;
    });
  }, [formNumGames]);

  const updateGamePlayer = (index, side, value) => {
    setFormGames((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [side]: value };
      return updated;
    });
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formTeamA || !formTeamB) {
      setFormError('Please select both teams.');
      return;
    }

    if (formTeamA === formTeamB) {
      setFormError('Teams must be different.');
      return;
    }

    const games = formGames.map((g) => ({
      player_a_id: g.player_a_id ? parseInt(g.player_a_id) : null,
      player_b_id: g.player_b_id ? parseInt(g.player_b_id) : null,
    }));

    const hasAllPlayers = games.every((g) => g.player_a_id && g.player_b_id);
    if (!hasAllPlayers) {
      setFormError('Please assign players for all games.');
      return;
    }

    try {
      setFormLoading(true);
      await createMatch(tournamentId, {
        team_a_id: parseInt(formTeamA),
        team_b_id: parseInt(formTeamB),
        round: formRound || undefined,
        games,
      });
      setShowCreateForm(false);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const openOverride = (matchId, game) => {
    setOverrideTarget({ matchId, gameId: game.id });
    setOverrideScoreA(game.player_a_score ?? '');
    setOverrideScoreB(game.player_b_score ?? '');
    setOverrideError('');
  };

  const handleOverride = async () => {
    if (overrideScoreA === '' || overrideScoreB === '') {
      setOverrideError('Please enter both scores.');
      return;
    }

    try {
      setOverrideLoading(true);
      setOverrideError('');
      await overrideScore(overrideTarget.matchId, overrideTarget.gameId, {
        player_a_score: parseInt(overrideScoreA),
        player_b_score: parseInt(overrideScoreB),
      });
      setOverrideTarget(null);
      fetchData();
    } catch (err) {
      setOverrideError(err.message);
    } finally {
      setOverrideLoading(false);
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
      <Link to="/admin/tournaments" className="text-gold hover:text-light-gold text-sm mb-4 inline-block">
        &larr; Back to Tournaments
      </Link>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-light-gold">Manage Matches</h1>
          {tournament && <p className="text-muted text-sm mt-1">{tournament.name}</p>}
        </div>
        <button
          onClick={openCreateForm}
          className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + Create Match
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Create match form */}
      {showCreateForm && (
        <div className="bg-felt-light rounded-lg p-5 border border-[#333] mb-6">
          <h2 className="text-lg font-bold text-light-gold mb-4">Create Match</h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleCreateMatch} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Team A</label>
                <select
                  value={formTeamA}
                  onChange={(e) => setFormTeamA(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="">-- Select Team --</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Team B</label>
                <select
                  value={formTeamB}
                  onChange={(e) => setFormTeamB(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="">-- Select Team --</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Round</label>
                <input
                  type="text"
                  value={formRound}
                  onChange={(e) => setFormRound(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                  placeholder="e.g. Group A, Semi-final, Final"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Number of Games</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formNumGames}
                  onChange={(e) => setFormNumGames(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                />
              </div>
            </div>

            {/* Game lineup */}
            {formTeamA && formTeamB && formGames.length > 0 && (
              <div className="border-t border-[#333] pt-4">
                <h3 className="text-sm font-medium text-muted mb-3">Game Lineup</h3>
                <div className="space-y-3">
                  {formGames.map((game, i) => (
                    <div key={i} className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <span className="text-xs text-muted w-12 shrink-0">Game {i + 1}</span>
                      <select
                        value={game.player_a_id}
                        onChange={(e) => updateGamePlayer(i, 'player_a_id', e.target.value)}
                        className="flex-1 min-w-0 bg-dark border border-[#333] text-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold transition-colors"
                      >
                        <option value="">Team A player</option>
                        {teamAPlayers.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <span className="text-muted text-sm shrink-0">vs</span>
                      <select
                        value={game.player_b_id}
                        onChange={(e) => updateGamePlayer(i, 'player_b_id', e.target.value)}
                        className="flex-1 min-w-0 bg-dark border border-[#333] text-text rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-gold transition-colors"
                      >
                        <option value="">Team B player</option>
                        {teamBPlayers.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Creating...' : 'Create Match'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="bg-felt-lighter hover:bg-light-gray text-text font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Matches list */}
      {matches.length === 0 ? (
        <div className="bg-felt-light rounded-lg p-6 border border-[#333] text-center text-muted">
          No matches created yet.
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="bg-felt-light rounded-lg p-4 border border-[#333]">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-light-gold">{match.team_a_name || 'Team A'}</span>
                  <span className="text-muted text-sm">vs</span>
                  <span className="font-bold text-light-gold">{match.team_b_name || 'Team B'}</span>
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
                    'bg-gray-600 text-gray-200'
                  }`}>
                    {match.status ? match.status.replace('_', ' ') : 'pending'}
                  </span>
                </div>
              </div>

              {match.games && match.games.length > 0 && (
                <div className="space-y-2">
                  {match.games.map((game, gi) => (
                    <div key={game.id || gi} className="bg-dark/50 rounded p-2">
                      <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                        <span className="text-text">{game.player_a_name || 'Player A'}</span>
                        <div className="flex items-center gap-2">
                          {overrideTarget?.gameId === game.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={overrideScoreA}
                                onChange={(e) => setOverrideScoreA(e.target.value)}
                                className="w-12 bg-dark border border-[#333] text-text rounded px-2 py-1 text-center text-sm focus:outline-none focus:border-gold"
                              />
                              <span className="text-muted">:</span>
                              <input
                                type="number"
                                min="0"
                                value={overrideScoreB}
                                onChange={(e) => setOverrideScoreB(e.target.value)}
                                className="w-12 bg-dark border border-[#333] text-text rounded px-2 py-1 text-center text-sm focus:outline-none focus:border-gold"
                              />
                              <button
                                onClick={handleOverride}
                                disabled={overrideLoading}
                                className="text-xs px-2 py-1 bg-green hover:bg-dark-green text-white rounded transition-colors disabled:opacity-50"
                              >
                                {overrideLoading ? '...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setOverrideTarget(null)}
                                className="text-xs px-2 py-1 bg-felt-lighter hover:bg-light-gray text-text rounded transition-colors"
                              >
                                X
                              </button>
                            </div>
                          ) : (
                            <>
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
                              {game.score_status && (
                                <span className={`px-1.5 py-0.5 rounded text-xs ${scoreStatusColors[game.score_status] || ''}`}>
                                  {game.score_status.replace(/_/g, ' ')}
                                </span>
                              )}
                              <button
                                onClick={() => openOverride(match.id, game)}
                                className="text-xs px-2 py-1 bg-felt-lighter hover:bg-light-gray text-text rounded transition-colors"
                              >
                                Override
                              </button>
                            </>
                          )}
                        </div>
                        <span className="text-text">{game.player_b_name || 'Player B'}</span>
                      </div>
                      {overrideTarget?.gameId === game.id && overrideError && (
                        <div className="mt-1 text-xs text-red-400">{overrideError}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
