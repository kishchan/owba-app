import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getTournaments, getTournamentPlayers, addGame } from '../api';

export default function AddGame() {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [players, setPlayers] = useState([]);
  const [selectedOpponent, setSelectedOpponent] = useState('');
  const [myScore, setMyScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      fetchPlayers();
    } else {
      setPlayers([]);
    }
    setSelectedOpponent('');
  }, [selectedTournament]);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await getTournaments();
      // Show active tournaments first, then upcoming
      const activeTournaments = data.filter(t => t.status === 'active' || t.status === 'upcoming');
      setTournaments(activeTournaments.length > 0 ? activeTournaments : data);
      // Auto-select if only one active
      const active = data.filter(t => t.status === 'active');
      if (active.length === 1) {
        setSelectedTournament(String(active[0].id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    try {
      const data = await getTournamentPlayers(selectedTournament);
      // Filter out self
      setPlayers(data.filter(p => p.id !== user?.id));
    } catch (err) {
      setError(err.message);
    }
  };

  const selectedTournamentData = tournaments.find(t => String(t.id) === selectedTournament);
  const raceTo = selectedTournamentData?.race_to || 5;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    const myScoreNum = parseInt(myScore);
    const oppScoreNum = parseInt(opponentScore);

    if (!selectedTournament) {
      setError('Please select a tournament.');
      return;
    }
    if (!selectedOpponent) {
      setError('Please select an opponent.');
      return;
    }
    if (isNaN(myScoreNum) || isNaN(oppScoreNum)) {
      setError('Please enter valid scores.');
      return;
    }
    if (myScoreNum < 0 || oppScoreNum < 0) {
      setError('Scores cannot be negative.');
      return;
    }
    if (myScoreNum !== raceTo && oppScoreNum !== raceTo) {
      setError(`One score must equal the race to value (${raceTo}) — someone must win.`);
      return;
    }
    if (myScoreNum === oppScoreNum) {
      setError('Scores cannot be tied — someone must win.');
      return;
    }

    try {
      setSubmitting(true);
      const result = await addGame({
        tournament_id: parseInt(selectedTournament),
        opponent_id: parseInt(selectedOpponent),
        my_score: myScoreNum,
        opponent_score: oppScoreNum,
      });

      const opponentPlayer = players.find(p => String(p.id) === selectedOpponent);
      setSuccess({
        myTeam: result.my_team,
        opponentTeam: result.opponent_team,
        opponentName: opponentPlayer?.name || 'Opponent',
        myScore: myScoreNum,
        opponentScore: oppScoreNum,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedOpponent('');
    setMyScore('');
    setOpponentScore('');
    setSuccess(null);
    setError('');
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
      <Link to="/my-page" className="text-gold hover:text-light-gold text-sm mb-4 inline-block">
        &larr; Back to My Page
      </Link>

      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">
          <span role="img" aria-label="billiards">🎱</span> Add Game
        </h1>

        {/* Success */}
        {success && (
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] mb-6">
            <div className="text-center">
              <div className="text-3xl mb-3">
                {success.myScore > success.opponentScore ? '🏆' : '😤'}
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Score Submitted!</h2>
              <p className="text-text mb-1">
                {user?.name} <span className="text-gold font-bold">{success.myScore}</span>
                {' - '}
                <span className="text-gold font-bold">{success.opponentScore}</span> {success.opponentName}
              </p>
              <p className="text-muted text-sm mb-1">
                {success.myTeam} vs {success.opponentTeam}
              </p>
              <p className="text-gold text-sm mt-3">
                Waiting for opponent to confirm...
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 bg-gold hover:bg-light-gold text-dark rounded-lg transition-colors"
                >
                  Add Another
                </button>
                <Link
                  to="/my-page"
                  className="px-4 py-2 bg-felt-lighter hover:bg-light-gray text-text rounded-lg transition-colors"
                >
                  My Page
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        {!success && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Tournament selection */}
            <div className="bg-felt-light rounded-lg p-5 border border-[#333]">
              <label className="block text-sm font-medium text-text mb-2">Tournament</label>
              <select
                value={selectedTournament}
                onChange={(e) => setSelectedTournament(e.target.value)}
                className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
              >
                <option value="">-- Select Tournament --</option>
                {tournaments.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.status})
                  </option>
                ))}
              </select>
            </div>

            {/* Opponent selection */}
            {selectedTournament && (
              <div className="bg-felt-light rounded-lg p-5 border border-[#333]">
                <label className="block text-sm font-medium text-text mb-2">Opponent</label>
                {players.length === 0 ? (
                  <p className="text-muted text-sm">No opponents available. You may not be on a team in this tournament.</p>
                ) : (
                  <select
                    value={selectedOpponent}
                    onChange={(e) => setSelectedOpponent(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                  >
                    <option value="">-- Select Opponent --</option>
                    {players.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.team_name})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Score entry */}
            {selectedOpponent && (
              <div className="bg-felt-light rounded-lg p-5 border border-[#333]">
                <div className="text-center text-xs text-muted mb-4">Race to {raceTo}</div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      My Score ({user?.name})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={raceTo}
                      value={myScore}
                      onChange={(e) => setMyScore(e.target.value)}
                      className="w-full bg-dark border border-[#333] text-white rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:border-gold transition-colors"
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text mb-1">
                      Opponent's Score ({players.find(p => String(p.id) === selectedOpponent)?.name})
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={raceTo}
                      value={opponentScore}
                      onChange={(e) => setOpponentScore(e.target.value)}
                      className="w-full bg-dark border border-[#333] text-white rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:border-gold transition-colors"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Submit */}
            {selectedOpponent && (
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold hover:bg-light-gold text-dark font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Score'
                )}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
