const API_BASE = '/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('owba_token');
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${url}`, { ...options, headers });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Auth
export const login = (owba_id, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ owba_id, password }),
  });

export const changePassword = (current_password, new_password) =>
  request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ current_password, new_password }),
  });

// Rankings
export const getRankings = () => request('/rankings');
export const getTournamentRankings = (id) => request(`/rankings/${id}`);

// Players
export const getPlayers = (search, excludeTournament) => {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (excludeTournament) params.set('exclude_tournament', excludeTournament);
  const qs = params.toString();
  return request(`/players${qs ? `?${qs}` : ''}`);
};
export const getPlayer = (id) => request(`/players/${id}`);
export const createPlayer = (data) =>
  request('/players', { method: 'POST', body: JSON.stringify(data) });
export const updatePlayer = (id, data) =>
  request(`/players/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deletePlayer = (id) =>
  request(`/players/${id}`, { method: 'DELETE' });
export const resetPassword = (id, password) =>
  request(`/players/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
export const setPlayerRole = (id, role) =>
  request(`/players/${id}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
export const uploadAvatar = (id, image) =>
  request(`/players/${id}/avatar`, {
    method: 'PUT',
    body: JSON.stringify({ image }),
  });

// Tournaments
export const getTournaments = () => request('/tournaments');
export const getTournament = (id) => request(`/tournaments/${id}`);
export const createTournament = (data) =>
  request('/tournaments', { method: 'POST', body: JSON.stringify(data) });
export const updateTournament = (id, data) =>
  request(`/tournaments/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTournament = (id) =>
  request(`/tournaments/${id}`, { method: 'DELETE' });

// Teams
export const getTeams = (tournamentId) =>
  request(`/teams/tournament/${tournamentId}`);
export const createTeam = (tournamentId, data) =>
  request(`/teams/tournament/${tournamentId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const updateTeam = (id, data) =>
  request(`/teams/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteTeam = (id) =>
  request(`/teams/${id}`, { method: 'DELETE' });
export const respondToTeamInvite = (teamId, accept) =>
  request(`/teams/${teamId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ accept }),
  });

// Matches
export const getMatches = (tournamentId) =>
  request(`/matches/tournament/${tournamentId}`);
export const getMyMatches = () => request('/matches/my-matches');
export const getTournamentPlayers = (tournamentId) =>
  request(`/matches/tournament/${tournamentId}/players`);
export const addGame = (data) =>
  request('/matches/add-game', { method: 'POST', body: JSON.stringify(data) });
export const confirmGame = (gameId, confirmed) =>
  request(`/matches/${gameId}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ confirmed }),
  });
export const createMatch = (tournamentId, data) =>
  request(`/matches/tournament/${tournamentId}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const submitScore = (matchId, gameId, data) =>
  request(`/matches/${matchId}/games/${gameId}/score`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
export const overrideScore = (matchId, gameId, data) =>
  request(`/matches/${matchId}/games/${gameId}/override`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// Notifications
export const getNotifications = () => request('/notifications');
export const getUnreadCount = () => request('/notifications/unread-count');
export const markNotificationRead = (id) =>
  request(`/notifications/${id}/read`, { method: 'PUT' });
export const markAllNotificationsRead = () =>
  request('/notifications/read-all', { method: 'PUT' });
