import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPlayers, createPlayer, updatePlayer, deletePlayer, resetPassword, setPlayerRole } from '../../api';

export default function ManagePlayers() {
  const { isSuperAdmin } = useAuth();
  const [players, setPlayers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [showResetModal, setShowResetModal] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Form fields
  const [formOwbaId, setFormOwbaId] = useState('');
  const [formName, setFormName] = useState('');
  const [formClassification, setFormClassification] = useState('C');
  const [formPassword, setFormPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Reset password fields
  const [resetPwd, setResetPwd] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);
      const data = await getPlayers();
      setPlayers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      setLoading(true);
      const data = await getPlayers(search);
      setPlayers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingPlayer(null);
    setFormOwbaId('');
    setFormName('');
    setFormClassification('C');
    setFormPassword('');
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (player) => {
    setEditingPlayer(player);
    setFormOwbaId(player.owba_id || '');
    setFormName(player.name || '');
    setFormClassification(player.classification || 'C');
    setFormPassword('');
    setFormError('');
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formOwbaId.trim() || !formName.trim()) {
      setFormError('OWBA ID and Name are required.');
      return;
    }

    if (!editingPlayer && !formPassword.trim()) {
      setFormError('Password is required for new players.');
      return;
    }

    try {
      setFormLoading(true);
      const data = {
        owba_id: formOwbaId.trim(),
        name: formName.trim(),
        classification: formClassification,
      };

      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, data);
      } else {
        data.password = formPassword;
        await createPlayer(data);
      }

      setShowForm(false);
      fetchPlayers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deletePlayer(id);
      setShowDeleteConfirm(null);
      fetchPlayers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPwd.trim()) {
      setResetError('Please enter a new password.');
      return;
    }
    if (resetPwd.length < 6) {
      setResetError('Password must be at least 6 characters.');
      return;
    }
    try {
      setResetLoading(true);
      setResetError('');
      await resetPassword(showResetModal.id, resetPwd);
      setResetSuccess('Password reset successfully!');
      setTimeout(() => {
        setShowResetModal(null);
        setResetPwd('');
        setResetSuccess('');
      }, 1500);
    } catch (err) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleRoleChange = async (player, newRole) => {
    try {
      await setPlayerRole(player.id, newRole);
      fetchPlayers();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredPlayers = search.trim()
    ? players.filter(
        (p) =>
          p.name?.toLowerCase().includes(search.toLowerCase()) ||
          p.owba_id?.toLowerCase().includes(search.toLowerCase())
      )
    : players;

  if (loading && players.length === 0) {
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
        <h1 className="text-2xl font-bold text-light-gold">Manage Players</h1>
        <button
          onClick={openAddForm}
          className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          + Add Player
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by name or OWBA ID..."
          className="flex-1 bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
        />
        <button
          onClick={handleSearch}
          className="bg-felt-lighter hover:bg-light-gray text-text font-medium py-2 px-4 rounded-lg transition-colors"
        >
          Search
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="bg-felt-light rounded-lg p-5 border border-[#333] mb-6">
          <h2 className="text-lg font-bold text-light-gold mb-4">
            {editingPlayer ? 'Edit Player' : 'Add New Player'}
          </h2>
          {formError && (
            <div className="mb-4 p-3 bg-red-600/20 border border-red-600/50 rounded-lg text-red-400 text-sm">
              {formError}
            </div>
          )}
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-text mb-1">OWBA ID</label>
                <input
                  type="text"
                  value={formOwbaId}
                  onChange={(e) => setFormOwbaId(e.target.value)}
                  disabled={!!editingPlayer}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors disabled:opacity-50"
                  placeholder="e.g. OWBA-050"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                  placeholder="Player name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text mb-1">Classification</label>
                <select
                  value={formClassification}
                  onChange={(e) => setFormClassification(e.target.value)}
                  className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                >
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="C">C</option>
                </select>
              </div>
              {!editingPlayer && (
                <div>
                  <label className="block text-sm font-medium text-text mb-1">Password</label>
                  <input
                    type="password"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold transition-colors"
                    placeholder="Temporary password"
                  />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={formLoading}
                className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : editingPlayer ? 'Update Player' : 'Add Player'}
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

      {/* Players table */}
      <div className="bg-felt-light rounded-lg border border-[#333] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#333]/50 text-light-gold text-sm" style={{ background: 'linear-gradient(90deg, #0f4225, #1a6b3a)' }}>
                <th className="text-left py-3 px-3">OWBA ID</th>
                <th className="text-left py-3 px-3">Name</th>
                <th className="text-left py-3 px-3 hidden sm:table-cell">Class</th>
                <th className="text-left py-3 px-3 hidden md:table-cell">Role</th>
                <th className="text-right py-3 px-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPlayers.map((player, i) => (
                <tr
                  key={player.id}
                  className={`border-b border-[#333]/50 ${i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#2a2a2a]'}`}
                >
                  <td className="py-3 px-3 font-mono text-sm text-text">{player.owba_id}</td>
                  <td className="py-3 px-3 font-medium">{player.name}</td>
                  <td className="py-3 px-3 hidden sm:table-cell">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-felt-lighter text-text">
                      {player.classification || '-'}
                    </span>
                  </td>
                  <td className="py-3 px-3 hidden md:table-cell">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      player.role === 'super_admin' ? 'bg-purple-600/20 text-purple-400' :
                      player.role === 'admin' ? 'bg-amber-600/20 text-amber-400' :
                      'bg-felt-lighter text-muted'
                    }`}>
                      {player.role === 'super_admin' ? 'Super Admin' :
                       player.role === 'admin' ? 'Admin' : 'Player'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      <button
                        onClick={() => openEditForm(player)}
                        className="text-xs px-2 py-1 bg-felt-lighter hover:bg-light-gray text-text rounded transition-colors"
                      >
                        Edit
                      </button>
                      {isSuperAdmin && player.role !== 'super_admin' && (
                        <button
                          onClick={() => handleRoleChange(player, player.role === 'admin' ? 'player' : 'admin')}
                          className={`text-xs px-2 py-1 rounded transition-colors ${
                            player.role === 'admin'
                              ? 'bg-amber-600/20 hover:bg-amber-600/40 text-amber-400'
                              : 'bg-purple-600/20 hover:bg-purple-600/40 text-purple-400'
                          }`}
                        >
                          {player.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setShowResetModal(player);
                          setResetPwd('');
                          setResetError('');
                          setResetSuccess('');
                        }}
                        className="text-xs px-2 py-1 bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-400 rounded transition-colors"
                      >
                        Reset Pwd
                      </button>
                      {player.role !== 'super_admin' && (
                        <button
                          onClick={() => setShowDeleteConfirm(player)}
                          className="text-xs px-2 py-1 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPlayers.length === 0 && (
          <div className="text-center py-8 text-muted">No players found.</div>
        )}
      </div>

      {/* Reset password modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] w-full max-w-sm">
            <h3 className="text-lg font-bold text-light-gold mb-4">
              Reset Password for {showResetModal.name}
            </h3>
            {resetError && (
              <div className="mb-3 p-2 bg-red-600/20 border border-red-600/50 rounded text-red-400 text-sm">
                {resetError}
              </div>
            )}
            {resetSuccess && (
              <div className="mb-3 p-2 bg-green-600/20 border border-green-600/50 rounded text-green-400 text-sm">
                {resetSuccess}
              </div>
            )}
            <input
              type="password"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              placeholder="New password (min 6 chars)"
              className="w-full bg-dark border border-[#333] text-text rounded-lg px-4 py-2 focus:outline-none focus:border-gold mb-4 transition-colors"
            />
            <div className="flex gap-2">
              <button
                onClick={handleResetPassword}
                disabled={resetLoading}
                className="bg-green hover:bg-dark-green text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
              >
                {resetLoading ? 'Resetting...' : 'Reset'}
              </button>
              <button
                onClick={() => setShowResetModal(null)}
                className="bg-felt-lighter hover:bg-light-gray text-text font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-felt-light rounded-lg p-6 border border-[#333] w-full max-w-sm">
            <h3 className="text-lg font-bold text-light-gold mb-2">Confirm Delete</h3>
            <p className="text-muted mb-4">
              Are you sure you want to delete <span className="text-light-gold font-medium">{showDeleteConfirm.name}</span>?
              This action cannot be undone.
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
