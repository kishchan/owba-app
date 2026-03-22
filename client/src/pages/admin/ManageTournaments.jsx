import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getTournaments, createTournament, updateTournament, deleteTournament, getTeams } from '../../api';

const statusColors = {
  upcoming: 'bg-blue-600 text-blue-100',
  active: 'bg-green-600 text-green-100',
  completed: 'bg-amber-600 text-amber-100',
};

export default function ManageTournaments() {
  const { isSuperAdmin } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTournament, setEditingTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formGameType, setFormGameType] = useState('9-ball');
  const [formMaxPlayers, setFormMaxPlayers] = useState(7);
  const [formLineupSize, setFormLineupSize] = useState(3);
  const [formRaceTo, setFormRaceTo] = useState(5);
  const [formStatus, setFormStatus] = useState('upcoming');
  const [formChampionMultiplier, setFormChampionMultiplier] = useState(1.20);
  const [formRunnerUpMultiplier, setFormRunnerUpMultiplier] = useState(1.10);
  const [formThirdPlaceMultiplier, setFormThirdPlaceMultiplier] = useState(1.05);
  const [formFourthPlaceMultiplier, setFormFourthPlaceMultiplier] = useState(1.00);
  const [formMatchWinWeight, setFormMatchWinWeight] = useState(0.5);
  const [formGameWinWeight, setFormGameWinWeight] = useState(0.3);
  const [formMatchesPlayedPoints, setFormMatchesPlayedPoints] = useState(5);
  const [formCategory, setFormCategory] = useState('regular');
  const [formChampionTeamId, setFormChampionTeamId] = useState('');
  const [formRunnerUpTeamId, setFormRunnerUpTeamId] = useState('');
  const [formThirdPlaceTeamId, setFormThirdPlaceTeamId] = useState('');
  const [formFourthPlaceTeamId, setFormFourthPlaceTeamId] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const data = await getTournaments();
      setTournaments(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingTournament(null);
    setFormName('');
    setFormGameType('9-ball');
    setFormMaxPlayers(7);
    setFormLineupSize(3);
    setFormRaceTo(5);
    setFormStatus('upcoming');
    setFormChampionMultiplier(1.20);
    setFormRunnerUpMultiplier(1.10);
    setFormThirdPlaceMultiplier(1.05);
    setFormFourthPlaceMultiplier(1.00);
    setFormMatchWinWeight(0.5);
    setFormGameWinWeight(0.3);
    setFormMatchesPlayedPoints(5);
    setFormCategory('regular');
    setFormChampionTeamId('');
    setFormRunnerUpTeamId('');
    setFormThirdPlaceTeamId('');
    setFormFourthPlaceTeamId('');
    setTeams([]);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = async (tournament) => {
    setEditingTournament(tournament);
    setFormName(tournament.name || '');
    setFormGameType(tournament.game_type || '9-ball');
    setFormMaxPlayers(tournament.max_players_per_team || 7);
    setFormLineupSize(tournament.lineup_size || 3);
    setFormRaceTo(tournament.race_to || 5);
    setFormStatus(tournament.status || 'upcoming');
    setFormChampionMultiplier(tournament.champion_multiplier || 1.20);
    setFormRunnerUpMultiplier(tournament.runner_up_multiplier || 1.10);
    setFormThirdPlaceMultiplier(tournament.third_place_multiplier || 1.05);
    setFormFourthPlaceMultiplier(tournament.fourth_place_multiplier || 1.00);
    setFormMatchWinWeight(tournament.match_win_weight || 0.5);
    setFormGameWinWeight(tournament.game_win_weight || 0.3);
    setFormMatchesPlayedPoints(tournament.matches_played_points || 5);
    setFormCategory(tournament.category || 'regular');
    setFormChampionTeamId(tournament.champion_team_id || '');
    setFormRunnerUpTeamId(tournament.runner_up_team_id || '');
    setFormThirdPlaceTeamId(tournament.third_place_team_id || '');
    setFormFourthPlaceTeamId(tournament.fourth_place_team_id || '');
    setFormError('');

    try {
      const teamsData = await getTeams(tournament.id);
      setTeams(teamsData);
    } catch {
      setTeams([]);
    }

    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Tournament name is required.');
      return;
    }

    try {
      setFormLoading(true);
      const data = {
        name: formName.trim(),
        game_type: formGameType,
        max_players_per_team: parseInt(formMaxPlayers),
        lineup_size: parseInt(formLineupSize),
        race_to: parseInt(formRaceTo),
        status: formStatus,
        champion_multiplier: parseFloat(formChampionMultiplier),
        runner_up_multiplier: parseFloat(formRunnerUpMultiplier),
        third_place_multiplier: parseFloat(formThirdPlaceMultiplier),
        fourth_place_multiplier: parseFloat(formFourthPlaceMultiplier),
        match_win_weight: parseFloat(formMatchWinWeight),
        game_win_weight: parseFloat(formGameWinWeight),
        matches_played_points: parseFloat(formMatchesPlayedPoints),
        category: formCategory,
      };

      if (formChampionTeamId) data.champion_team_id = parseInt(formChampionTeamId);
      if (formRunnerUpTeamId) data.runner_up_team_id = parseInt(formRunnerUpTeamId);
      if (formThirdPlaceTeamId) data.third_place_team_id = parseInt(formThirdPlaceTeamId);
      if (formFourthPlaceTeamId) data.fourth_place_team_id = parseInt(formFourthPlaceTeamId);

      if (editingTournament) {
        await updateTournament(editingTournament.id, data);
      } else {
        await createTournament(data);
      }

      setShowForm(false);
      fetchTournaments();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteTournament = async (id) => {
    try {
      await deleteTournament(id);
      setShowDeleteConfirm(null);
      fetchTournaments();
    } catch (err) {
      setError(err.message);
      setShowDeleteConfirm(null);
    }
  };

  if (loading && tournaments.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="py-6 fade-in-up">
      <Link to="/admin" className="text-gold hover:text-light-gold text-sm mb-4 inline-block">
        &larr; Back to Admin
      </Link>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-light-gold">Manage Tournaments</h1>
        <button
          onClick={openAddForm}
          className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + Create Tournament
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-felt-light rounded-lg p-5 border border-[#333] mb-6">
          <h2 className="text-lg font-bold text-light-gold mb-4">
            {editingTournament ? 'Edit Tournament' : 'Create Tournament'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                  placeholder="Tournament name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Game Type</label>
                <select value={formGameType} onChange={(e) => setFormGameType(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors">
                  <option value="9-ball">9-Ball</option>
                  <option value="8-ball">8-Ball</option>
                  <option value="10-ball">10-Ball</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Max Players Per Team</label>
                <input type="number" min="1" max="15" value={formMaxPlayers}
                  onChange={(e) => setFormMaxPlayers(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Lineup Size (per match night)</label>
                <input type="number" min="1" max="10" value={formLineupSize}
                  onChange={(e) => setFormLineupSize(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Race To</label>
                <input type="number" min="1" max="15" value={formRaceTo}
                  onChange={(e) => setFormRaceTo(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors">
                  <option value="upcoming">Upcoming</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Tournament Category</label>
                <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors">
                  <option value="regular">Regular (×1.0 weight)</option>
                  <option value="ab">A &amp; B Mixed (×0.8 weight)</option>
                  <option value="unique_c">Unique C (×0.6 weight)</option>
                </select>
                <p className="text-xs text-muted mt-1">Affects how this tournament's scores contribute to overall rankings</p>
              </div>
            </div>

            <div className="border-t border-[#333] pt-4">
              <h3 className="text-sm font-medium text-muted mb-3">Placement Multipliers</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Champion</label>
                  <input type="number" step="0.05" min="1" value={formChampionMultiplier}
                    onChange={(e) => setFormChampionMultiplier(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Runner-up</label>
                  <input type="number" step="0.05" min="1" value={formRunnerUpMultiplier}
                    onChange={(e) => setFormRunnerUpMultiplier(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">3rd Place</label>
                  <input type="number" step="0.05" min="1" value={formThirdPlaceMultiplier}
                    onChange={(e) => setFormThirdPlaceMultiplier(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">4th Place</label>
                  <input type="number" step="0.05" min="1" value={formFourthPlaceMultiplier}
                    onChange={(e) => setFormFourthPlaceMultiplier(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
                </div>
              </div>
            </div>

            <div className="border-t border-[#333] pt-4">
              <h3 className="text-sm font-medium text-muted mb-3">Scoring Formula: (Match Win% x W1) + (Game Win% x W2) + (Matches Played x P)</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Match Win% Weight (W1)</label>
                  <input type="number" step="0.1" min="0" value={formMatchWinWeight}
                    onChange={(e) => setFormMatchWinWeight(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Game Win% Weight (W2)</label>
                  <input type="number" step="0.1" min="0" value={formGameWinWeight}
                    onChange={(e) => setFormGameWinWeight(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Matches Played Points (P)</label>
                  <input type="number" step="1" min="0" value={formMatchesPlayedPoints}
                    onChange={(e) => setFormMatchesPlayedPoints(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors" />
                </div>
              </div>
            </div>

            {editingTournament && teams.length > 0 && (
              <div className="border-t border-[#333] pt-4">
                <h3 className="text-sm font-medium text-muted mb-3">Final Placements</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Champion Team</label>
                    <select value={formChampionTeamId} onChange={(e) => setFormChampionTeamId(e.target.value)}
                      className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors">
                      <option value="">-- Select --</option>
                      {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">Runner-up Team</label>
                    <select value={formRunnerUpTeamId} onChange={(e) => setFormRunnerUpTeamId(e.target.value)}
                      className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors">
                      <option value="">-- Select --</option>
                      {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">3rd Place Team</label>
                    <select value={formThirdPlaceTeamId} onChange={(e) => setFormThirdPlaceTeamId(e.target.value)}
                      className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors">
                      <option value="">-- Select --</option>
                      {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text mb-1">4th Place Team</label>
                    <select value={formFourthPlaceTeamId} onChange={(e) => setFormFourthPlaceTeamId(e.target.value)}
                      className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors">
                      <option value="">-- Select --</option>
                      {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={formLoading}
                className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50">
                {formLoading ? 'Saving...' : editingTournament ? 'Update Tournament' : 'Create Tournament'}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="bg-felt-lighter hover:bg-light-gray text-text font-medium py-2 px-4 rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tournament list */}
      <div className="space-y-4">
        {tournaments.length === 0 ? (
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] text-center text-muted">
            No tournaments yet. Create your first one!
          </div>
        ) : (
          tournaments.map((t) => (
            <div key={t.id} className="bg-felt-light rounded-lg p-5 border border-[#333]">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-light-gold">{t.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[t.status] || 'bg-gray-600 text-gray-200'}`}>
                      {t.status}
                    </span>
                  </div>
                  <div className="text-sm text-muted space-x-3">
                    <span>Game: <span className="text-text capitalize">{t.game_type}</span></span>
                    <span>Max: <span className="text-text">{t.max_players_per_team || 7}</span></span>
                    <span>Lineup: <span className="text-text">{t.lineup_size || 3}</span></span>
                    <span>Race To: <span className="text-text">{t.race_to}</span></span>
                    <span>Category: <span className="text-text">{t.category === 'ab' ? 'A&B' : t.category === 'unique_c' ? 'Unique C' : 'Regular'}</span></span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => openEditForm(t)}
                    className="text-sm px-3 py-1.5 bg-felt-lighter hover:bg-light-gray text-text rounded-lg transition-colors">
                    Edit
                  </button>
                  <Link to={`/admin/tournaments/${t.id}/teams`}
                    className="text-sm px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold rounded-lg transition-colors">
                    Teams
                  </Link>
                  <Link to={`/admin/tournaments/${t.id}/matches`}
                    className="text-sm px-3 py-1.5 bg-gold/20 hover:bg-gold/30 text-gold rounded-lg transition-colors">
                    Matches
                  </Link>
                  {isSuperAdmin && (
                    <button onClick={() => setShowDeleteConfirm(t)}
                      className="text-sm px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete tournament confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] w-full max-w-sm">
            <h3 className="text-lg font-bold text-red-400 mb-2">Delete Tournament</h3>
            <p className="text-muted mb-1">
              Are you sure you want to delete <span className="text-text font-medium">{showDeleteConfirm.name}</span>?
            </p>
            <p className="text-red-400/80 text-sm mb-4">
              This will permanently delete all teams, matches, and games in this tournament.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDeleteTournament(showDeleteConfirm.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Delete Tournament
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="bg-felt-lighter hover:bg-light-gray text-text font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
