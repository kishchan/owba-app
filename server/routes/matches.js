import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// Helper to enrich matches with team names, player names, and games
function enrichMatches(matches) {
  for (const match of matches) {
    const teamA = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(match.team_a_id);
    const teamB = db.prepare('SELECT id, name FROM teams WHERE id = ?').get(match.team_b_id);
    match.team_a = teamA;
    match.team_b = teamB;
    match.team_a_name = teamA?.name;
    match.team_b_name = teamB?.name;

    const tournament = db.prepare('SELECT name, race_to FROM tournaments WHERE id = ?').get(match.tournament_id);
    match.tournament_name = tournament?.name;
    match.race_to = tournament?.race_to;

    match.games = db.prepare(`
      SELECT mg.*,
        pa.name as player_a_name, pa.owba_id as player_a_owba_id,
        pb.name as player_b_name, pb.owba_id as player_b_owba_id
      FROM match_games mg
      JOIN players pa ON pa.id = mg.player_a_id
      JOIN players pb ON pb.id = mg.player_b_id
      WHERE mg.match_id = ?
    `).all(match.id);
  }
  return matches;
}

// Helper to check if all games in a match are confirmed, and update match status
function checkMatchCompletion(matchId) {
  const games = db.prepare('SELECT * FROM match_games WHERE match_id = ?').all(matchId);
  const allConfirmed = games.length > 0 && games.every(g => g.status === 'confirmed');

  if (allConfirmed) {
    db.prepare("UPDATE matches SET status = 'completed' WHERE id = ?").run(matchId);
  } else {
    const anyInProgress = games.some(g => g.status !== 'pending');
    if (anyInProgress) {
      db.prepare("UPDATE matches SET status = 'in_progress' WHERE id = ?").run(matchId);
    }
  }
}

// GET /tournament/:tournamentId - Public. Return matches for a tournament.
router.get('/tournament/:tournamentId', (req, res) => {
  try {
    const matches = db.prepare(
      'SELECT * FROM matches WHERE tournament_id = ? ORDER BY id ASC'
    ).all(req.params.tournamentId);

    res.json(enrichMatches(matches));
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /my-matches - Requires auth. Return matches for the logged-in player.
router.get('/my-matches', authenticate, (req, res) => {
  try {
    const playerId = req.user.id;

    const matches = db.prepare(`
      SELECT DISTINCT m.*
      FROM matches m
      JOIN match_games mg ON mg.match_id = m.id
      WHERE mg.player_a_id = ? OR mg.player_b_id = ?
      ORDER BY m.created_at DESC
    `).all(playerId, playerId);

    res.json(enrichMatches(matches));
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /tournament/:tournamentId/players - Get all players in a tournament (for opponent dropdown)
router.get('/tournament/:tournamentId/players', authenticate, (req, res) => {
  try {
    const players = db.prepare(`
      SELECT DISTINCT p.id, p.owba_id, p.name, p.classification, t.name as team_name, t.id as team_id
      FROM players p
      JOIN team_players tp ON tp.player_id = p.id
      JOIN teams t ON t.id = tp.team_id
      WHERE t.tournament_id = ? AND tp.status = 'accepted'
      ORDER BY t.name, p.name
    `).all(req.params.tournamentId);

    res.json(players);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Helper: check if user is captain or designator for a player's team in a tournament
function isCaptainOrDesignator(userId, teamId) {
  const team = db.prepare('SELECT captain_id, designator_id FROM teams WHERE id = ?').get(teamId);
  if (!team) return false;
  return team.captain_id === userId || team.designator_id === userId;
}

// POST /add-game - Authenticated. Simplified score entry.
// Player selects tournament, opponent, enters scores.
// Captains/designators can submit on behalf of their team members.
router.post('/add-game', authenticate, (req, res) => {
  try {
    const { tournament_id, opponent_id, my_score, opponent_score, player_id: onBehalfOf } = req.body;
    const userId = req.user.id;

    // If submitting on behalf of a team member
    const playerId = onBehalfOf || userId;

    if (!tournament_id || !opponent_id || my_score === undefined || opponent_score === undefined) {
      return res.status(400).json({ error: 'tournament_id, opponent_id, my_score, and opponent_score are required' });
    }

    if (playerId === opponent_id) {
      return res.status(400).json({ error: 'Cannot play against yourself' });
    }

    const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament_id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Only active tournaments allow score entry
    if (tournament.status !== 'active') {
      return res.status(400).json({ error: 'Can only add games to active tournaments' });
    }

    // Find which team the player belongs to
    const myTeam = db.prepare(`
      SELECT t.id, t.name FROM teams t
      JOIN team_players tp ON tp.team_id = t.id
      WHERE t.tournament_id = ? AND tp.player_id = ? AND tp.status = 'accepted'
    `).get(tournament_id, playerId);

    // If submitting on behalf, verify captain/designator role
    if (onBehalfOf && onBehalfOf !== userId) {
      if (!myTeam || !isCaptainOrDesignator(userId, myTeam.id)) {
        return res.status(403).json({ error: 'Only team captains or point designators can submit scores on behalf of team members' });
      }
    }

    if (!myTeam) {
      return res.status(400).json({ error: 'You are not on a team in this tournament' });
    }

    // Find which team the opponent belongs to
    const opponentTeam = db.prepare(`
      SELECT t.id, t.name FROM teams t
      JOIN team_players tp ON tp.team_id = t.id
      WHERE t.tournament_id = ? AND tp.player_id = ? AND tp.status = 'accepted'
    `).get(tournament_id, opponent_id);

    if (!opponentTeam) {
      return res.status(400).json({ error: 'Opponent is not on a team in this tournament' });
    }

    // Find or create a match between the two teams
    // Look for an existing match that's not completed
    let match = db.prepare(`
      SELECT * FROM matches
      WHERE tournament_id = ? AND status != 'completed'
      AND ((team_a_id = ? AND team_b_id = ?) OR (team_a_id = ? AND team_b_id = ?))
      ORDER BY created_at DESC LIMIT 1
    `).get(tournament_id, myTeam.id, opponentTeam.id, opponentTeam.id, myTeam.id);

    if (!match) {
      // Create a new match
      const matchResult = db.prepare(
        "INSERT INTO matches (tournament_id, team_a_id, team_b_id, match_date, status) VALUES (?, ?, ?, date('now'), 'in_progress')"
      ).run(tournament_id, myTeam.id, opponentTeam.id);
      match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchResult.lastInsertRowid);
    }

    // Determine player_a and player_b based on team order
    let player_a_id, player_b_id, player_a_score, player_b_score;
    if (myTeam.id === match.team_a_id) {
      player_a_id = playerId;
      player_b_id = opponent_id;
      player_a_score = my_score;
      player_b_score = opponent_score;
    } else {
      player_a_id = opponent_id;
      player_b_id = playerId;
      player_a_score = opponent_score;
      player_b_score = my_score;
    }

    // Create the game
    const gameResult = db.prepare(`
      INSERT INTO match_games (match_id, player_a_id, player_b_id, player_a_score, player_b_score,
        submitted_by, status)
      VALUES (?, ?, ?, ?, ?, ?, 'awaiting_confirmation')
    `).run(match.id, player_a_id, player_b_id, player_a_score, player_b_score, playerId);

    // Update match status
    db.prepare("UPDATE matches SET status = 'in_progress' WHERE id = ? AND status = 'pending'").run(match.id);

    // Notify opponent
    db.prepare(`
      INSERT INTO notifications (player_id, type, message, data)
      VALUES (?, 'score_confirm', ?, ?)
    `).run(
      opponent_id,
      `${req.user.name} submitted a score: ${my_score}-${opponent_score}. Please confirm.`,
      JSON.stringify({ game_id: Number(gameResult.lastInsertRowid), match_id: match.id })
    );

    const game = db.prepare(`
      SELECT mg.*,
        pa.name as player_a_name, pa.owba_id as player_a_owba_id,
        pb.name as player_b_name, pb.owba_id as player_b_owba_id
      FROM match_games mg
      JOIN players pa ON pa.id = mg.player_a_id
      JOIN players pb ON pb.id = mg.player_b_id
      WHERE mg.id = ?
    `).get(gameResult.lastInsertRowid);

    res.status(201).json({
      game,
      match_id: match.id,
      my_team: myTeam.name,
      opponent_team: opponentTeam.name
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /:gameId/confirm - Authenticated. Opponent confirms or disputes a game score.
router.post('/:gameId/confirm', authenticate, (req, res) => {
  try {
    const { confirmed } = req.body;
    const playerId = req.user.id;
    const gameId = req.params.gameId;

    const game = db.prepare('SELECT * FROM match_games WHERE id = ?').get(gameId);
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status === 'confirmed') {
      return res.status(400).json({ error: 'Game is already confirmed' });
    }

    // Only the non-submitter can confirm
    if (game.submitted_by === playerId) {
      return res.status(400).json({ error: 'You submitted this score. Waiting for opponent to confirm.' });
    }

    // Must be one of the players
    if (game.player_a_id !== playerId && game.player_b_id !== playerId) {
      return res.status(403).json({ error: 'You are not a player in this game' });
    }

    if (confirmed) {
      db.prepare(`
        UPDATE match_games SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?
      `).run(gameId);
    } else {
      db.prepare("UPDATE match_games SET status = 'disputed' WHERE id = ?").run(gameId);
    }

    // Delete the score_confirm notification for this game
    db.prepare(`
      DELETE FROM notifications
      WHERE player_id = ? AND type = 'score_confirm'
        AND json_extract(data, '$.game_id') = ?
    `).run(playerId, Number(gameId));

    checkMatchCompletion(game.match_id);

    const updatedGame = db.prepare(`
      SELECT mg.*,
        pa.name as player_a_name, pa.owba_id as player_a_owba_id,
        pb.name as player_b_name, pb.owba_id as player_b_owba_id
      FROM match_games mg
      JOIN players pa ON pa.id = mg.player_a_id
      JOIN players pb ON pb.id = mg.player_b_id
      WHERE mg.id = ?
    `).get(gameId);

    res.json(updatedGame);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /tournament/:tournamentId - Admin only. Create match with games.
router.post('/tournament/:tournamentId', authenticate, requireAdmin, (req, res) => {
  try {
    const { team_a_id, team_b_id, round, games } = req.body;

    if (!team_a_id || !team_b_id) {
      return res.status(400).json({ error: 'team_a_id and team_b_id are required' });
    }

    const tournament = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const matchResult = db.prepare(
      'INSERT INTO matches (tournament_id, team_a_id, team_b_id, round) VALUES (?, ?, ?, ?)'
    ).run(req.params.tournamentId, team_a_id, team_b_id, round || null);

    const matchId = matchResult.lastInsertRowid;

    if (games && Array.isArray(games)) {
      const insertGameStmt = db.prepare(
        'INSERT INTO match_games (match_id, player_a_id, player_b_id) VALUES (?, ?, ?)'
      );
      for (const game of games) {
        insertGameStmt.run(matchId, game.player_a_id, game.player_b_id);
      }
    }

    const match = db.prepare('SELECT * FROM matches WHERE id = ?').get(matchId);
    const enriched = enrichMatches([match]);

    res.status(201).json(enriched[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /:matchId/games/:gameId/score - Requires auth. Player enters score (legacy).
router.post('/:matchId/games/:gameId/score', authenticate, (req, res) => {
  try {
    const { my_score, opponent_score } = req.body;
    const playerId = req.user.id;

    if (my_score === undefined || opponent_score === undefined) {
      return res.status(400).json({ error: 'my_score and opponent_score are required' });
    }

    const game = db.prepare(
      'SELECT * FROM match_games WHERE id = ? AND match_id = ?'
    ).get(req.params.gameId, req.params.matchId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    if (game.status === 'confirmed') {
      return res.status(400).json({ error: 'Game is already confirmed' });
    }

    const isPlayerA = game.player_a_id === playerId;
    const isPlayerB = game.player_b_id === playerId;

    if (!isPlayerA && !isPlayerB) {
      return res.status(403).json({ error: 'You are not a player in this game' });
    }

    let player_a_score, player_b_score;
    if (isPlayerA) {
      player_a_score = my_score;
      player_b_score = opponent_score;
    } else {
      player_a_score = opponent_score;
      player_b_score = my_score;
    }

    if (!game.submitted_by) {
      // First submission
      db.prepare(`
        UPDATE match_games SET player_a_score = ?, player_b_score = ?, submitted_by = ?, status = 'awaiting_confirmation'
        WHERE id = ?
      `).run(player_a_score, player_b_score, playerId, game.id);
    } else if (game.submitted_by !== playerId) {
      // Second submission - check if scores match
      if (player_a_score === game.player_a_score && player_b_score === game.player_b_score) {
        db.prepare(`
          UPDATE match_games SET status = 'confirmed', confirmed_at = datetime('now') WHERE id = ?
        `).run(game.id);
      } else {
        db.prepare("UPDATE match_games SET status = 'disputed' WHERE id = ?").run(game.id);
      }
    }

    checkMatchCompletion(parseInt(req.params.matchId));

    const finalGame = db.prepare(`
      SELECT mg.*,
        pa.name as player_a_name, pa.owba_id as player_a_owba_id,
        pb.name as player_b_name, pb.owba_id as player_b_owba_id
      FROM match_games mg
      JOIN players pa ON pa.id = mg.player_a_id
      JOIN players pb ON pb.id = mg.player_b_id
      WHERE mg.id = ?
    `).get(game.id);

    res.json(finalGame);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /:matchId/games/:gameId/override - Admin only. Override score.
router.put('/:matchId/games/:gameId/override', authenticate, requireAdmin, (req, res) => {
  try {
    const { player_a_score, player_b_score } = req.body;

    if (player_a_score === undefined || player_b_score === undefined) {
      return res.status(400).json({ error: 'player_a_score and player_b_score are required' });
    }

    const game = db.prepare(
      'SELECT * FROM match_games WHERE id = ? AND match_id = ?'
    ).get(req.params.gameId, req.params.matchId);

    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }

    db.prepare(`
      UPDATE match_games
      SET player_a_score = ?, player_b_score = ?,
          status = 'confirmed', confirmed_at = datetime('now')
      WHERE id = ?
    `).run(player_a_score, player_b_score, game.id);

    checkMatchCompletion(parseInt(req.params.matchId));

    const finalGame = db.prepare(`
      SELECT mg.*,
        pa.name as player_a_name, pa.owba_id as player_a_owba_id,
        pb.name as player_b_name, pb.owba_id as player_b_owba_id
      FROM match_games mg
      JOIN players pa ON pa.id = mg.player_a_id
      JOIN players pb ON pb.id = mg.player_b_id
      WHERE mg.id = ?
    `).get(game.id);

    res.json(finalGame);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
