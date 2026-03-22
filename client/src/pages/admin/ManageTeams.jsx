import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getTournament, getTeams, createTeam, updateTeam, deleteTeam, getPlayers } from '../../api';

export default function ManageTeams() {
  const { id: tournamentId } = useParams();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [allPlayers, setAllPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formPlacement, setFormPlacement] = useState('');
  const [formSelectedPlayers, setFormSelectedPlayers] = useState([]);
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tournamentData, teamsData, playersData] = await Promise.all([
        getTournament(tournamentId),
        getTeams(tournamentId),
        getPlayers(null, tournamentId),
      ]);
      setTournament(tournamentData);
      setTeams(teamsData);
      setAllPlayers(playersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingTeam(null);
    setFormName('');
    setFormPlacement('');
    setFormSelectedPlayers([]);
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (team) => {
    setEditingTeam(team);
    setFormName(team.name || '');
    setFormPlacement(team.placement || '');
    setFormSelectedPlayers(team.players ? team.players.map((p) => p.id) : []);
    setFormError('');
    setShowForm(true);
  };

  const togglePlayer = (playerId) => {
    setFormSelectedPlayers((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formName.trim()) {
      setFormError('Team name is required.');
      return;
    }

    try {
      setFormLoading(true);
      const data = {
        name: formName.trim(),
        player_ids: formSelectedPlayers,
      };
      if (formPlacement) data.placement = parseInt(formPlacement);

      if (editingTeam) {
        await updateTeam(editingTeam.id, data);
      } else {
        await createTeam(tournamentId, data);
      }

      setShowForm(false);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTeam(id);
      setShowDeleteConfirm(null);
      fetchData();
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
      <Link to="/admin/tournaments" className="text-gold hover:text-light-gold text-sm mb-4 inline-block">
        &larr; Back to Tournaments
      </Link>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-light-gold">Manage Teams</h1>
          {tournament && <p className="text-muted text-sm mt-1">{tournament.name}</p>}
        </div>
        <button
          onClick={openAddForm}
          className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + Add Team
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
            {editingTeam ? 'Edit Team' : 'Add Team'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text mb-1">Team Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                  placeholder="e.g. Team Alpha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Placement (optional)</label>
                <input
                  type="number"
                  min="1"
                  value={formPlacement}
                  onChange={(e) => setFormPlacement(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                  placeholder="Final placement number"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Select Players ({formSelectedPlayers.length} selected)
              </label>
              <div className="max-h-60 overflow-y-auto bg-dark rounded-lg border border-[#333] p-2 space-y-1">
                {allPlayers.map((player) => {
                  // Check if player already accepted on another team in this tournament
                  const acceptedOnOtherTeam = teams.some(
                    (t) =>
                      t.id !== editingTeam?.id &&
                      t.players?.some(
                        (p) => p.id === player.id && p.invite_status === 'accepted'
                      )
                  );
                  if (acceptedOnOtherTeam && !formSelectedPlayers.includes(player.id)) return null;
                  return (
                    <label
                      key={player.id}
                      className={`flex items-center gap-3 px-3 py-2 rounded transition-colors ${
                        acceptedOnOtherTeam
                          ? 'opacity-50 cursor-not-allowed'
                          : formSelectedPlayers.includes(player.id)
                          ? 'bg-gold/10 text-text cursor-pointer'
                          : 'text-muted hover:bg-felt-lighter cursor-pointer'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formSelectedPlayers.includes(player.id)}
                        onChange={() => !acceptedOnOtherTeam && togglePlayer(player.id)}
                        disabled={acceptedOnOtherTeam}
                        className="rounded border-[#333] text-gold focus:ring-gold"
                      />
                      <span className="flex-1">{player.name}</span>
                      {acceptedOnOtherTeam && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-600/20 text-red-400">
                          On another team
                        </span>
                      )}
                      <span className="text-xs text-muted">{player.owba_id}</span>
                      {player.classification && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-felt-lighter text-muted">
                          {player.classification}
                        </span>
                      )}
                    </label>
                  );
                })}
                {allPlayers.length === 0 && (
                  <div className="text-center py-4 text-muted text-sm">No players available.</div>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : editingTeam ? 'Update Team' : 'Add Team'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-felt-lighter hover:bg-light-gray text-text font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Teams list */}
      {teams.length === 0 ? (
        <div className="bg-felt-light rounded-lg p-6 border border-[#333] text-center text-muted">
          No teams yet. Add your first team!
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <div key={team.id} className="bg-felt-light rounded-lg p-4 border border-[#333]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-light-gold">{team.name}</h3>
                  {team.placement && (
                    <span className="text-xs text-muted">Placement: #{team.placement}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditForm(team)}
                    className="text-xs px-2 py-1 bg-felt-lighter hover:bg-light-gray text-text rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(team)}
                    className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {team.players && team.players.length > 0 ? (
                  team.players.map((player) => (
                    <div key={player.id} className="text-sm text-text flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-green rounded-full"></div>
                      {player.name}
                      {player.classification && (
                        <span className="text-xs text-muted">({player.classification})</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted">No players assigned</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] w-full max-w-sm">
            <h3 className="text-lg font-bold text-light-gold mb-2">Confirm Delete</h3>
            <p className="text-muted mb-4">
              Are you sure you want to delete team <span className="text-text font-medium">{showDeleteConfirm.name}</span>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(showDeleteConfirm.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Delete
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
