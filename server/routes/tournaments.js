import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireAdmin, requireSuperAdmin } from '../middleware/auth.js';

const router = Router();

// GET / - Public. Return all tournaments.
router.get('/', (req, res) => {
  try {
    const tournaments = db.prepare('SELECT * FROM tournaments ORDER BY created_at DESC').all();
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /:id - Public. Return tournament with teams and standings.
router.get('/:id', (req, res) => {
  try {
    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get teams with players
    const teams = db.prepare('SELECT * FROM teams WHERE tournament_id = ? ORDER BY placement ASC, name ASC').all(req.params.id);

    for (const team of teams) {
      team.players = db.prepare(`
        SELECT p.id, p.owba_id, p.name, p.classification, tp.status as invite_status
        FROM players p
        JOIN team_players tp ON tp.player_id = p.id
        WHERE tp.team_id = ?
      `).all(team.id);
    }

    // Get placement team names
    let champion_team = null;
    let runner_up_team = null;
    let third_place_team = null;
    let fourth_place_team = null;

    if (tournament.champion_team_id) {
      champion_team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(tournament.champion_team_id);
    }
    if (tournament.runner_up_team_id) {
      runner_up_team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(tournament.runner_up_team_id);
    }
    if (tournament.third_place_team_id) {
      third_place_team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(tournament.third_place_team_id);
    }
    if (tournament.fourth_place_team_id) {
      fourth_place_team = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(tournament.fourth_place_team_id);
    }

    res.json({
      ...tournament,
      champion_team,
      runner_up_team,
      third_place_team,
      fourth_place_team,
      teams
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST / - Admin only. Create tournament.
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const {
      name,
      game_type,
      max_players_per_team,
      lineup_size,
      race_to,
      champion_multiplier,
      runner_up_multiplier,
      third_place_multiplier,
      fourth_place_multiplier,
      match_win_weight,
      game_win_weight,
      matches_played_points
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Tournament name is required' });
    }

    const result = db.prepare(`
      INSERT INTO tournaments (name, game_type, max_players_per_team, lineup_size, race_to,
        champion_multiplier, runner_up_multiplier, third_place_multiplier, fourth_place_multiplier,
        match_win_weight, game_win_weight, matches_played_points)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name,
      game_type || '9-ball',
      max_players_per_team || 7,
      lineup_size || 3,
      race_to || 5,
      champion_multiplier || 1.20,
      runner_up_multiplier || 1.10,
      third_place_multiplier || 1.05,
      fourth_place_multiplier || 1.00,
      match_win_weight || 0.5,
      game_win_weight || 0.3,
      matches_played_points || 5
    );

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /:id - Admin only. Update tournament.
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const tournament = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const allowedFields = [
      'name', 'game_type', 'max_players_per_team', 'lineup_size', 'race_to', 'status',
      'champion_team_id', 'runner_up_team_id', 'third_place_team_id', 'fourth_place_team_id',
      'champion_multiplier', 'runner_up_multiplier', 'third_place_multiplier', 'fourth_place_multiplier',
      'match_win_weight', 'game_win_weight', 'matches_played_points'
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    db.prepare(`UPDATE tournaments SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Sync team placements when placement team IDs are updated
    const updated = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(req.params.id);

    // Reset all team placements for this tournament first
    db.prepare('UPDATE teams SET placement = NULL WHERE tournament_id = ?').run(req.params.id);

    // Set placements based on the tournament's placement team IDs
    if (updated.champion_team_id) {
      db.prepare('UPDATE teams SET placement = 1 WHERE id = ? AND tournament_id = ?').run(updated.champion_team_id, req.params.id);
    }
    if (updated.runner_up_team_id) {
      db.prepare('UPDATE teams SET placement = 2 WHERE id = ? AND tournament_id = ?').run(updated.runner_up_team_id, req.params.id);
    }
    if (updated.third_place_team_id) {
      db.prepare('UPDATE teams SET placement = 3 WHERE id = ? AND tournament_id = ?').run(updated.third_place_team_id, req.params.id);
    }
    if (updated.fourth_place_team_id) {
      db.prepare('UPDATE teams SET placement = 4 WHERE id = ? AND tournament_id = ?').run(updated.fourth_place_team_id, req.params.id);
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// DELETE /:id - Super admin only. Delete tournament with cascade.
router.delete('/:id', authenticate, requireSuperAdmin, (req, res) => {
  try {
    const tournament = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(req.params.id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Get all team IDs for this tournament
    const teamIds = db.prepare('SELECT id FROM teams WHERE tournament_id = ?')
      .all(req.params.id).map(t => t.id);

    // Get all match IDs for this tournament
    const matchIds = db.prepare('SELECT id FROM matches WHERE tournament_id = ?')
      .all(req.params.id).map(m => m.id);

    // Cascade delete in order
    if (matchIds.length > 0) {
      db.prepare(`DELETE FROM match_games WHERE match_id IN (${matchIds.map(() => '?').join(',')})`).run(...matchIds);
    }
    db.prepare('DELETE FROM matches WHERE tournament_id = ?').run(req.params.id);

    if (teamIds.length > 0) {
      db.prepare(`DELETE FROM team_players WHERE team_id IN (${teamIds.map(() => '?').join(',')})`).run(...teamIds);
    }
    db.prepare('DELETE FROM teams WHERE tournament_id = ?').run(req.params.id);

    // Delete related notifications (team_invite for this tournament)
    db.prepare(`
      DELETE FROM notifications WHERE type = 'team_invite'
        AND json_extract(data, '$.tournament_id') = ?
    `).run(req.params.id);

    db.prepare('DELETE FROM tournaments WHERE id = ?').run(req.params.id);

    res.json({ message: 'Tournament deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
