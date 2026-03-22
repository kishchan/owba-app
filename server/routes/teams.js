import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET /tournament/:tournamentId - Public. Return teams for a tournament with their players.
router.get('/tournament/:tournamentId', (req, res) => {
  try {
    const tournament = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(req.params.tournamentId);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const teams = db.prepare(
      'SELECT * FROM teams WHERE tournament_id = ? ORDER BY placement ASC, name ASC'
    ).all(req.params.tournamentId);

    for (const team of teams) {
      team.players = db.prepare(`
        SELECT p.id, p.owba_id, p.name, p.classification, tp.status as invite_status
        FROM players p
        JOIN team_players tp ON tp.player_id = p.id
        WHERE tp.team_id = ?
      `).all(team.id);
    }

    res.json(teams);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /tournament/:tournamentId - Admin only. Create team.
router.post('/tournament/:tournamentId', authenticate, requireAdmin, (req, res) => {
  try {
    const { name, player_ids } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Team name is required' });
    }

    const tournament = db.prepare('SELECT id, max_players_per_team FROM tournaments WHERE id = ?').get(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    if (player_ids && player_ids.length > tournament.max_players_per_team) {
      return res.status(400).json({
        error: `Cannot add more than ${tournament.max_players_per_team} players per team`
      });
    }

    // Check if any player already accepted another team in this tournament
    if (player_ids && player_ids.length > 0) {
      const alreadyAccepted = db.prepare(`
        SELECT p.name as player_name, t.name as team_name FROM team_players tp
        JOIN teams t ON t.id = tp.team_id
        JOIN players p ON p.id = tp.player_id
        WHERE tp.player_id IN (${player_ids.map(() => '?').join(',')})
          AND tp.status = 'accepted' AND t.tournament_id = ?
      `).get(...player_ids, req.params.tournamentId);
      if (alreadyAccepted) {
        return res.status(400).json({
          error: `${alreadyAccepted.player_name} has already accepted a spot on "${alreadyAccepted.team_name}" in this tournament`
        });
      }
    }

    const result = db.prepare(
      'INSERT INTO teams (tournament_id, name) VALUES (?, ?)'
    ).run(req.params.tournamentId, name);

    const teamId = result.lastInsertRowid;

    if (player_ids && Array.isArray(player_ids)) {
      const insertPlayerStmt = db.prepare(
        "INSERT INTO team_players (team_id, player_id, status) VALUES (?, ?, 'pending')"
      );
      const insertNotification = db.prepare(
        "INSERT INTO notifications (player_id, type, message, data) VALUES (?, 'team_invite', ?, ?)"
      );

      for (const playerId of player_ids) {
        insertPlayerStmt.run(teamId, playerId);
        const teamName = name;
        const tournamentName = db.prepare('SELECT name FROM tournaments WHERE id = ?').get(req.params.tournamentId)?.name || '';
        insertNotification.run(
          playerId,
          `You've been added to ${teamName} for ${tournamentName}`,
          JSON.stringify({ team_id: Number(teamId), tournament_id: Number(req.params.tournamentId) })
        );
      }
    }

    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
    team.players = db.prepare(`
      SELECT p.id, p.owba_id, p.name, p.classification, tp.status as invite_status
      FROM players p
      JOIN team_players tp ON tp.player_id = p.id
      WHERE tp.team_id = ?
    `).all(teamId);

    res.status(201).json(team);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /:id - Admin only. Update team.
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const { name, placement, player_ids } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (placement !== undefined) {
      updates.push('placement = ?');
      values.push(placement);
    }

    if (updates.length > 0) {
      values.push(req.params.id);
      db.prepare(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`).run(...values);
    }

    if (player_ids && Array.isArray(player_ids)) {
      const tournament = db.prepare('SELECT id, max_players_per_team, name as tournament_name FROM tournaments WHERE id = ?').get(team.tournament_id);
      if (player_ids.length > tournament.max_players_per_team) {
        return res.status(400).json({
          error: `Cannot add more than ${tournament.max_players_per_team} players per team`
        });
      }

      // Check if any player already accepted another team in this tournament
      if (player_ids.length > 0) {
        const alreadyAccepted = db.prepare(`
          SELECT p.name as player_name, t.name as team_name FROM team_players tp
          JOIN teams t ON t.id = tp.team_id
          JOIN players p ON p.id = tp.player_id
          WHERE tp.player_id IN (${player_ids.map(() => '?').join(',')})
            AND tp.status = 'accepted' AND t.tournament_id = ? AND tp.team_id != ?
        `).get(...player_ids, tournament.id, req.params.id);
        if (alreadyAccepted) {
          return res.status(400).json({
            error: `${alreadyAccepted.player_name} has already accepted a spot on "${alreadyAccepted.team_name}" in this tournament`
          });
        }
      }

      // Find newly added players
      const existingPlayerIds = db.prepare('SELECT player_id FROM team_players WHERE team_id = ?')
        .all(req.params.id).map(r => r.player_id);
      const newPlayerIds = player_ids.filter(id => !existingPlayerIds.includes(id));

      db.prepare('DELETE FROM team_players WHERE team_id = ?').run(req.params.id);
      const insertPlayerStmt = db.prepare(
        "INSERT INTO team_players (team_id, player_id, status) VALUES (?, ?, 'pending')"
      );
      const insertNotification = db.prepare(
        "INSERT INTO notifications (player_id, type, message, data) VALUES (?, 'team_invite', ?, ?)"
      );

      const teamName = name || team.name;
      for (const playerId of player_ids) {
        insertPlayerStmt.run(req.params.id, playerId);
        if (newPlayerIds.includes(playerId)) {
          insertNotification.run(
            playerId,
            `You've been added to ${teamName} for ${tournament.tournament_name}`,
            JSON.stringify({ team_id: Number(req.params.id), tournament_id: tournament.id })
          );
        }
      }
    }

    const updated = db.prepare('SELECT * FROM teams WHERE id = ?').get(req.params.id);
    updated.players = db.prepare(`
      SELECT p.id, p.owba_id, p.name, p.classification, tp.status as invite_status
      FROM players p
      JOIN team_players tp ON tp.player_id = p.id
      WHERE tp.team_id = ?
    `).all(req.params.id);

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /:id/respond - Authenticated. Accept or decline team invitation.
router.post('/:id/respond', authenticate, (req, res) => {
  try {
    const { accept } = req.body;
    const teamId = req.params.id;
    const playerId = req.user.id;

    const tp = db.prepare('SELECT * FROM team_players WHERE team_id = ? AND player_id = ?').get(teamId, playerId);
    if (!tp) {
      return res.status(404).json({ error: 'Team invitation not found' });
    }

    const team = db.prepare('SELECT tournament_id FROM teams WHERE id = ?').get(teamId);
    const tournamentId = team?.tournament_id;

    // Prevent accepting if player already accepted another team in the same tournament
    if (accept && tournamentId) {
      const existing = db.prepare(`
        SELECT t.name as team_name FROM team_players tp
        JOIN teams t ON t.id = tp.team_id
        WHERE tp.player_id = ? AND tp.status = 'accepted' AND t.tournament_id = ? AND tp.team_id != ?
      `).get(playerId, tournamentId, teamId);
      if (existing) {
        return res.status(400).json({
          error: `You have already accepted an invitation for team "${existing.team_name}" in this tournament`
        });
      }
    }

    if (accept) {

      // Accept this team
      db.prepare("UPDATE team_players SET status = 'accepted' WHERE team_id = ? AND player_id = ?")
        .run(teamId, playerId);

      // Auto-decline and remove player from all OTHER teams in the same tournament
      if (tournamentId) {
        const otherTeams = db.prepare(`
          SELECT tp.team_id FROM team_players tp
          JOIN teams t ON t.id = tp.team_id
          WHERE tp.player_id = ? AND t.tournament_id = ? AND tp.team_id != ? AND tp.status = 'pending'
        `).all(playerId, tournamentId, teamId);

        for (const ot of otherTeams) {
          db.prepare('DELETE FROM team_players WHERE team_id = ? AND player_id = ?')
            .run(ot.team_id, playerId);
        }

        // Delete ALL team_invite notifications for this player in this tournament
        db.prepare(`
          DELETE FROM notifications
          WHERE player_id = ? AND type = 'team_invite'
            AND json_extract(data, '$.tournament_id') = ?
        `).run(playerId, tournamentId);
      }

      res.json({ message: 'Invitation accepted' });
    } else {
      // Decline: remove the player from the team roster
      db.prepare('DELETE FROM team_players WHERE team_id = ? AND player_id = ?')
        .run(teamId, playerId);

      // Delete the team_invite notification for this specific team
      db.prepare(`
        DELETE FROM notifications
        WHERE player_id = ? AND type = 'team_invite'
          AND json_extract(data, '$.team_id') = ?
      `).run(playerId, Number(teamId));

      res.json({ message: 'Invitation declined' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// DELETE /:id - Admin only. Delete team.
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const team = db.prepare('SELECT id FROM teams WHERE id = ?').get(req.params.id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    db.prepare('DELETE FROM team_players WHERE team_id = ?').run(req.params.id);
    db.prepare('DELETE FROM teams WHERE id = ?').run(req.params.id);

    res.json({ message: 'Team deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
