import { Router } from 'express';
import db from '../db.js';

const router = Router();

function calculateTournamentRankings(tournamentId) {
  const tournament = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournamentId);
  if (!tournament) return [];

  const matchWinWeight = tournament.match_win_weight || 0.5;
  const gameWinWeight = tournament.game_win_weight || 0.3;
  const matchesPlayedPoints = tournament.matches_played_points || 5;

  // Get all confirmed games in this tournament
  const games = db.prepare(`
    SELECT mg.*
    FROM match_games mg
    JOIN matches m ON m.id = mg.match_id
    WHERE m.tournament_id = ? AND mg.status = 'confirmed'
  `).all(tournamentId);

  // Build player stats
  const playerStats = {};

  for (const game of games) {
    // Process player_a
    if (!playerStats[game.player_a_id]) {
      playerStats[game.player_a_id] = {
        matches_played: 0, matches_won: 0, matches_lost: 0,
        games_won: 0, total_games: 0
      };
    }
    const statsA = playerStats[game.player_a_id];
    statsA.matches_played++;
    statsA.games_won += game.player_a_score || 0;
    statsA.total_games += (game.player_a_score || 0) + (game.player_b_score || 0);
    if (game.player_a_score > game.player_b_score) {
      statsA.matches_won++;
    } else {
      statsA.matches_lost++;
    }

    // Process player_b
    if (!playerStats[game.player_b_id]) {
      playerStats[game.player_b_id] = {
        matches_played: 0, matches_won: 0, matches_lost: 0,
        games_won: 0, total_games: 0
      };
    }
    const statsB = playerStats[game.player_b_id];
    statsB.matches_played++;
    statsB.games_won += game.player_b_score || 0;
    statsB.total_games += (game.player_a_score || 0) + (game.player_b_score || 0);
    if (game.player_b_score > game.player_a_score) {
      statsB.matches_won++;
    } else {
      statsB.matches_lost++;
    }
  }

  // Get team placements and multipliers
  const teams = db.prepare('SELECT * FROM teams WHERE tournament_id = ?').all(tournamentId);

  const playerTeamPlacement = {};
  for (const team of teams) {
    const teamPlayers = db.prepare('SELECT player_id FROM team_players WHERE team_id = ?').all(team.id);
    for (const tp of teamPlayers) {
      playerTeamPlacement[tp.player_id] = team.placement;
    }
  }

  // Calculate scores
  const rankings = [];

  for (const [playerIdStr, stats] of Object.entries(playerStats)) {
    const playerId = parseInt(playerIdStr);
    const player = db.prepare('SELECT id, owba_id, name, classification, profile_picture FROM players WHERE id = ?').get(playerId);
    if (!player) continue;

    const matchWinPct = stats.matches_played > 0
      ? (stats.matches_won / stats.matches_played) * 100
      : 0;

    const gameWinPct = stats.total_games > 0
      ? (stats.games_won / stats.total_games) * 100
      : 0;

    const rawScore = (matchWinPct * matchWinWeight) + (gameWinPct * gameWinWeight) + (stats.matches_played * matchesPlayedPoints);

    // Determine multiplier based on placement
    const placement = playerTeamPlacement[playerId];
    let multiplier = 1.0;

    if (placement === 1) {
      multiplier = tournament.champion_multiplier || 1.20;
    } else if (placement === 2) {
      multiplier = tournament.runner_up_multiplier || 1.10;
    } else if (placement === 3) {
      multiplier = tournament.third_place_multiplier || 1.05;
    } else if (placement === 4) {
      multiplier = tournament.fourth_place_multiplier || 1.00;
    }

    const finalScore = rawScore * multiplier;

    rankings.push({
      player_id: player.id,
      owba_id: player.owba_id,
      name: player.name,
      classification: player.classification,
      profile_picture: player.profile_picture,
      matches_played: stats.matches_played,
      matches_won: stats.matches_won,
      matches_lost: stats.matches_lost,
      match_win_pct: Math.round(matchWinPct * 100) / 100,
      games_won: stats.games_won,
      total_games: stats.total_games,
      game_win_pct: Math.round(gameWinPct * 100) / 100,
      raw_score: Math.round(rawScore * 100) / 100,
      multiplier,
      score: Math.round(finalScore * 100) / 100,
      tournament_id: tournamentId,
      tournament_name: tournament.name
    });
  }

  rankings.sort((a, b) => b.score - a.score);
  rankings.forEach((r, i) => { r.rank = i + 1; });

  return rankings;
}

// GET / - Public. Overall rankings across all completed tournaments.
router.get('/', (req, res) => {
  try {
    const tournaments = db.prepare("SELECT id FROM tournaments WHERE status = 'completed'").all();

    const overallScores = {};

    for (const tournament of tournaments) {
      const tournamentData = db.prepare('SELECT * FROM tournaments WHERE id = ?').get(tournament.id);
      const categoryWeight = tournamentData?.category_weight || 1.0;
      const rankings = calculateTournamentRankings(tournament.id);

      for (const r of rankings) {
        if (!overallScores[r.player_id]) {
          overallScores[r.player_id] = {
            player_id: r.player_id,
            owba_id: r.owba_id,
            name: r.name,
            classification: r.classification,
            profile_picture: r.profile_picture,
            matches_played: 0,
            matches_won: 0,
            matches_lost: 0,
            total_games_won: 0,
            total_games_played: 0,
            score: 0,
            tournaments_played: 0
          };
        }

        const overall = overallScores[r.player_id];
        overall.matches_played += r.matches_played;
        overall.matches_won += r.matches_won;
        overall.matches_lost += r.matches_lost;
        overall.total_games_won += r.games_won;
        overall.total_games_played += r.total_games;
        overall.score += r.score * categoryWeight;
        overall.tournaments_played++;
      }
    }

    const rankings = Object.values(overallScores);

    for (const r of rankings) {
      r.match_win_pct = r.matches_played > 0
        ? Math.round((r.matches_won / r.matches_played) * 100 * 100) / 100
        : 0;
      r.game_win_pct = r.total_games_played > 0
        ? Math.round((r.total_games_won / r.total_games_played) * 100 * 100) / 100
        : 0;
      r.score = Math.round(r.score * 100) / 100;
    }

    rankings.sort((a, b) => b.score - a.score);
    rankings.forEach((r, i) => { r.rank = i + 1; });

    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /:tournamentId - Public. Rankings for a specific tournament.
router.get('/:tournamentId', (req, res) => {
  try {
    const tournament = db.prepare('SELECT id FROM tournaments WHERE id = ?').get(req.params.tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    const rankings = calculateTournamentRankings(req.params.tournamentId);
    res.json(rankings);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
