import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// GET / - Public. Return all players with basic info.
// Optional query param: exclude_tournament - exclude players who accepted a team in this tournament
router.get('/', (req, res) => {
  try {
    const { search, exclude_tournament } = req.query;
    let players;

    if (search) {
      players = db.prepare(
        "SELECT id, owba_id, name, classification, role, profile_picture FROM players WHERE (name LIKE ? OR owba_id LIKE ?)"
      ).all(`%${search}%`, `%${search}%`);
    } else {
      players = db.prepare(
        'SELECT id, owba_id, name, classification, role, profile_picture FROM players'
      ).all();
    }

    // Filter out players who have already accepted a team in the given tournament
    if (exclude_tournament) {
      const acceptedPlayerIds = db.prepare(`
        SELECT tp.player_id FROM team_players tp
        JOIN teams t ON t.id = tp.team_id
        WHERE t.tournament_id = ? AND tp.status = 'accepted'
      `).all(exclude_tournament).map(r => r.player_id);

      if (acceptedPlayerIds.length > 0) {
        players = players.filter(p => !acceptedPlayerIds.includes(p.id));
      }
    }

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /:id - Public. Return player details with full stats.
router.get('/:id', (req, res) => {
  try {
    const player = db.prepare(
      'SELECT id, owba_id, name, classification, role, profile_picture, created_at FROM players WHERE id = ?'
    ).get(req.params.id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get all confirmed games for this player
    const games = db.prepare(`
      SELECT mg.*, m.tournament_id
      FROM match_games mg
      JOIN matches m ON m.id = mg.match_id
      WHERE (mg.player_a_id = ? OR mg.player_b_id = ?) AND mg.status = 'confirmed'
    `).all(player.id, player.id);

    // Calculate overall and per-tournament stats
    let matchesWon = 0;
    let matchesLost = 0;
    let gamesWon = 0;
    let totalGames = 0;
    const tournamentStats = {};

    for (const game of games) {
      const isPlayerA = game.player_a_id === player.id;
      const myScore = isPlayerA ? game.player_a_score : game.player_b_score;
      const oppScore = isPlayerA ? game.player_b_score : game.player_a_score;
      const won = myScore > oppScore;

      if (won) matchesWon++; else matchesLost++;
      gamesWon += myScore || 0;
      totalGames += (myScore || 0) + (oppScore || 0);

      // Per-tournament
      const tid = game.tournament_id;
      if (!tournamentStats[tid]) {
        tournamentStats[tid] = { matches_won: 0, matches_lost: 0, games_won: 0, total_games: 0 };
      }
      const ts = tournamentStats[tid];
      if (won) ts.matches_won++; else ts.matches_lost++;
      ts.games_won += myScore || 0;
      ts.total_games += (myScore || 0) + (oppScore || 0);
    }

    // Build tournament breakdown with scores from rankings logic
    const tournaments = [];
    for (const [tidStr, ts] of Object.entries(tournamentStats)) {
      const tid = parseInt(tidStr);
      const tournament = db.prepare('SELECT id, name, match_win_weight, game_win_weight, matches_played_points, champion_multiplier, runner_up_multiplier, third_place_multiplier, fourth_place_multiplier FROM tournaments WHERE id = ?').get(tid);
      if (!tournament) continue;

      const matchesPlayed = ts.matches_won + ts.matches_lost;
      const matchWinPct = matchesPlayed > 0 ? (ts.matches_won / matchesPlayed) * 100 : 0;
      const gameWinPct = ts.total_games > 0 ? (ts.games_won / ts.total_games) * 100 : 0;
      const rawScore = (matchWinPct * (tournament.match_win_weight || 0.5)) +
                        (gameWinPct * (tournament.game_win_weight || 0.3)) +
                        (matchesPlayed * (tournament.matches_played_points || 5));

      // Get placement multiplier
      const teamPlacement = db.prepare(`
        SELECT t.placement FROM teams t
        JOIN team_players tp ON tp.team_id = t.id
        WHERE t.tournament_id = ? AND tp.player_id = ?
      `).get(tid, player.id);

      let multiplier = 1.0;
      if (teamPlacement?.placement === 1) multiplier = tournament.champion_multiplier || 1.20;
      else if (teamPlacement?.placement === 2) multiplier = tournament.runner_up_multiplier || 1.10;
      else if (teamPlacement?.placement === 3) multiplier = tournament.third_place_multiplier || 1.05;
      else if (teamPlacement?.placement === 4) multiplier = tournament.fourth_place_multiplier || 1.00;

      tournaments.push({
        tournament_id: tid,
        tournament_name: tournament.name,
        matches_won: ts.matches_won,
        matches_lost: ts.matches_lost,
        games_won: ts.games_won,
        total_games: ts.total_games,
        match_win_pct: Math.round(matchWinPct * 100) / 100,
        game_win_pct: Math.round(gameWinPct * 100) / 100,
        score: Math.round(rawScore * multiplier * 100) / 100,
      });
    }

    const totalMatches = matchesWon + matchesLost;
    const matchWinPct = totalMatches > 0 ? Math.round((matchesWon / totalMatches) * 100 * 100) / 100 : 0;
    const gameWinPct = totalGames > 0 ? Math.round((gamesWon / totalGames) * 100 * 100) / 100 : 0;

    res.json({
      player,
      stats: {
        matches_played: totalMatches,
        matches_won: matchesWon,
        matches_lost: matchesLost,
        games_won: gamesWon,
        total_games: totalGames,
        match_win_pct: matchWinPct,
        game_win_pct: gameWinPct,
      },
      tournaments,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST / - Admin only. Create player.
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { owba_id, name, classification, password } = req.body;

    if (!owba_id || !name || !password) {
      return res.status(400).json({ error: 'owba_id, name, and password are required' });
    }

    const existing = db.prepare('SELECT id FROM players WHERE owba_id = ?').get(owba_id);
    if (existing) {
      return res.status(409).json({ error: 'Player with this OWBA ID already exists' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const result = db.prepare(
      'INSERT INTO players (owba_id, name, classification, password_hash, temp_password, role) VALUES (?, ?, ?, ?, 1, ?)'
    ).run(owba_id, name, classification || 'C', passwordHash, 'player');

    const player = db.prepare(
      'SELECT id, owba_id, name, classification, role, profile_picture, created_at FROM players WHERE id = ?'
    ).get(result.lastInsertRowid);

    res.status(201).json(player);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /:id - Admin only. Update player info.
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, classification } = req.body;
    const player = db.prepare('SELECT id FROM players WHERE id = ?').get(req.params.id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (classification !== undefined) {
      updates.push('classification = ?');
      values.push(classification);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    db.prepare(`UPDATE players SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare(
      'SELECT id, owba_id, name, classification, role, profile_picture, created_at FROM players WHERE id = ?'
    ).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// DELETE /:id - Admin only. Delete player.
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const player = db.prepare('SELECT id, role FROM players WHERE id = ?').get(req.params.id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot delete super admin' });
    }

    db.prepare('DELETE FROM team_players WHERE player_id = ?').run(req.params.id);
    db.prepare('DELETE FROM notifications WHERE player_id = ?').run(req.params.id);
    db.prepare('DELETE FROM players WHERE id = ?').run(req.params.id);

    res.json({ message: 'Player deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /:id/reset-password - Admin only. Reset player password.
router.post('/:id/reset-password', authenticate, requireAdmin, (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'password is required' });
    }

    const player = db.prepare('SELECT id FROM players WHERE id = ?').get(req.params.id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE players SET password_hash = ?, temp_password = 1 WHERE id = ?').run(passwordHash, req.params.id);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /:id/role - Super admin only. Set player role.
router.put('/:id/role', authenticate, requireSuperAdmin, (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['admin', 'player'].includes(role)) {
      return res.status(400).json({ error: 'role must be "admin" or "player"' });
    }

    const player = db.prepare('SELECT id, role FROM players WHERE id = ?').get(req.params.id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (player.role === 'super_admin') {
      return res.status(403).json({ error: 'Cannot change super admin role' });
    }

    db.prepare('UPDATE players SET role = ? WHERE id = ?').run(role, req.params.id);

    const updated = db.prepare(
      'SELECT id, owba_id, name, classification, role, profile_picture, created_at FROM players WHERE id = ?'
    ).get(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /:id/avatar - Authenticated. Upload profile picture (base64).
router.put('/:id/avatar', authenticate, (req, res) => {
  try {
    const { image } = req.body;

    // Players can only update their own avatar; admins can update any
    const isOwnProfile = req.user.id === parseInt(req.params.id);
    const isAdmin = req.user.role === 'admin' || req.user.role === 'super_admin';
    if (!isOwnProfile && !isAdmin) {
      return res.status(403).json({ error: 'You can only update your own profile picture' });
    }

    const player = db.prepare('SELECT id FROM players WHERE id = ?').get(req.params.id);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    if (image && image.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image too large. Max 2MB.' });
    }

    db.prepare('UPDATE players SET profile_picture = ? WHERE id = ?').run(image || null, req.params.id);

    res.json({ message: 'Profile picture updated', profile_picture: image || null });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
