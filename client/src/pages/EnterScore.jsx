import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyMatches, submitScore } from '../api';

export default function EnterScore() {
  const { matchId, gameId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [game, setGame] = useState(null);
  const [myScore, setMyScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resultStatus, setResultStatus] = useState('');

  useEffect(() => {
    fetchMatchData();
  }, [matchId, gameId]);

  const fetchMatchData = async () => {
    try {
      setLoading(true);
      const matches = await getMyMatches();
      const foundMatch = matches.find((m) => m.id === parseInt(matchId));
      if (!foundMatch) {
        setError('Match not found.');
        return;
      }
      setMatch(foundMatch);

      const foundGame = foundMatch.games?.find((g) => g.id === parseInt(gameId));
      if (!foundGame) {
        setError('Game not found.');
        return;
      }
      setGame(foundGame);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isPlayerA = game?.player_a_id === user?.id;
  const myName = isPlayerA ? game?.player_a_name : game?.player_b_name;
  const opponentName = isPlayerA ? game?.player_b_name : game?.player_a_name;
  const raceTo = match?.race_to || 7;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const myScoreNum = parseInt(myScore);
    const oppScoreNum = parseInt(opponentScore);

    if (isNaN(myScoreNum) || isNaN(oppScoreNum)) {
      setError('Please enter valid scores.');
      return;
    }

    if (myScoreNum < 0 || oppScoreNum < 0) {
      setError('Scores cannot be negative.');
      return;
    }

    if (myScoreNum !== raceTo && oppScoreNum !== raceTo) {
      setError(`One score must equal the race to value (${raceTo}) - someone must win.`);
      return;
    }

    if (myScoreNum === oppScoreNum) {
      setError('Scores cannot be tied - someone must win.');
      return;
    }

    try {
      setSubmitting(true);
      const scoreData = isPlayerA
        ? { player_a_score: myScoreNum, player_b_score: oppScoreNum }
        : { player_a_score: oppScoreNum, player_b_score: myScoreNum };

      const result = await submitScore(matchId, gameId, scoreData);
      setSuccess('Score submitted successfully!');
      setResultStatus(result.score_status || result.status || '');

      if (result.score_status === 'disputed' || result.status === 'disputed') {
        setError(
          "Scores don't match! Contact your opponent to resolve, or report to OWBA admin for corrections."
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  if (!match || !game) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-400 mb-4">{error || 'Match or game not found.'}</p>
        <Link to="/my-page" className="text-gold hover:text-light-gold">
          Back to My Page
        </Link>
      </div>
    );
  }

  return (
    <div className="py-6 fade-in-up">
      <Link to="/my-page" className="text-gold hover:text-light-gold text-sm mb-4 inline-block">
        &larr; Back to My Page
      </Link>

      <div className="max-w-md mx-auto">
        {/* Match context */}
        <div className="bg-felt-light rounded-lg p-5 border border-[#333] mb-6">
          <h2 className="text-lg font-bold text-light-gold text-center mb-2">Enter Score</h2>
          <div className="text-center text-muted text-sm mb-3">
            {match.tournament_name && <div className="mb-1">{match.tournament_name}</div>}
            {match.round && <div className="text-xs text-muted">{match.round}</div>}
          </div>
          <div className="flex items-center justify-center gap-3">
            <span className="font-medium text-gold">{myName || 'You'}</span>
            <span className="text-muted">vs</span>
            <span className="font-medium text-text">{opponentName || 'Opponent'}</span>
          </div>
          <div className="text-center text-xs text-muted mt-2">Race to {raceTo}</div>
        </div>

        {/* Success message */}
        {success && (
          <div className="mb-4 p-3 bg-green-600/20 border border-green-600/50 rounded-lg text-green-400 text-sm">
            {success}
            {resultStatus && (
              <div className="mt-1 text-xs">
                Status: <span className="capitalize">{resultStatus.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Score form */}
        {!success && (
          <form onSubmit={handleSubmit} className="bg-felt-light rounded-lg p-5 border border-[#333]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  My Score ({myName || 'You'})
                </label>
                <input
                  type="number"
                  min="0"
                  max={raceTo}
                  value={myScore}
                  onChange={(e) => setMyScore(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:border-gold transition-colors"
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1">
                  Opponent's Score ({opponentName || 'Opponent'})
                </label>
                <input
                  type="number"
                  min="0"
                  max={raceTo}
                  value={opponentScore}
                  onChange={(e) => setOpponentScore(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-3 text-center text-2xl font-bold focus:outline-none focus:border-gold transition-colors"
                  placeholder="0"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold hover:bg-light-gold text-dark font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-dark border-t-transparent"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit Score'
                )}
              </button>
            </div>
          </form>
        )}

        {success && (
          <div className="text-center">
            <Link
              to="/my-page"
              className="inline-block px-6 py-2 bg-green hover:bg-dark-green text-light-gold rounded-lg transition-colors border border-gold/30"
            >
              Back to Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
