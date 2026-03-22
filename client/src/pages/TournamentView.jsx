import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getTournaments, getTournament, getTeams, getMatches, getTournamentRankings } from '../api';
import Podium from '../components/Podium';

const statusColors = {
  upcoming: 'bg-blue-600 text-blue-100',
  active: 'bg-green-600 text-green-100',
  completed: 'bg-amber-600 text-amber-100',
};

function StatusBadge({ status }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColors[status] || 'bg-gray-600 text-gray-200'}`}>
      {status}
    </span>
  );
}

function ClassBadge({ classification }) {
  const cls = classification?.toUpperCase();
  const styles = {
    A: 'bg-gold/20 text-light-gold border border-gold/40',
    B: 'bg-green/25 text-green-400 border border-green/40',
    C: 'bg-blue-500/20 text-blue-300 border border-blue-500/30',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-extrabold tracking-wide ${styles[cls] || styles.C}`}>
      {cls || '-'}
    </span>
  );
}

function ChampionBanner({ tournament, teams }) {
  if (!tournament.champion_team_id) return null;

  const champion = teams.find(t => t.id === tournament.champion_team_id);
  const runnerUp = teams.find(t => t.id === tournament.runner_up_team_id);

  return (
    <div className="mb-6 rounded-xl overflow-hidden border border-gold/30"
         style={{ background: 'linear-gradient(135deg, #0f4225 0%, #1a6b3a 50%, #0f4225 100%)' }}>
      <div className="p-6 text-center">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-12">
          {champion && (
            <div className="flex flex-col items-center">
              <span className="text-3xl mb-1">&#127942;</span>
              <div className="text-xs uppercase tracking-widest text-gold/70 mb-1">Champion</div>
              <div className="text-xl font-extrabold text-gold">{champion.name}</div>
            </div>
          )}
          {runnerUp && (
            <div className="flex flex-col items-center">
              <span className="text-2xl mb-1">&#129352;</span>
              <div className="text-xs uppercase tracking-widest text-silver/70 mb-1">Runner-up</div>
              <div className="text-lg font-bold text-silver">{runnerUp.name}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TournamentCard({ tournament, isExpanded, onToggle }) {
  return (
    <div
      className={`bg-felt-light rounded-lg border transition-all cursor-pointer ${
        isExpanded ? 'border-gold/50 ring-1 ring-gold/20' : 'border-[#333] hover:border-gold/30'
      }`}
      onClick={onToggle}
    >
      <div className="p-5 flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-text">{tournament.name}</h3>
            <StatusBadge status={tournament.status} />
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
            <span>Game: <span className="text-text capitalize">{tournament.game_type}</span></span>
            <span>Race To: <span className="text-text">{tournament.race_to}</span></span>
            <span>Teams: <span className="text-text">{tournament.lineup_size || 3}-man</span></span>
          </div>
        </div>
        <div className={`text-gold transition-transform ml-3 mt-1 ${isExpanded ? 'rotate-180' : ''}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ExpandedTournament({ tournamentId }) {
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, [tournamentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tournamentData, teamsData, matchesData] = await Promise.all([
        getTournament(tournamentId),
        getTeams(tournamentId),
        getMatches(tournamentId),
      ]);
      setTournament(tournamentData);
      setTeams(teamsData);
      setMatches(matchesData);

      try {
        const rankingsData = await getTournamentRankings(tournamentId);
        setRankings(rankingsData);
      } catch {
        setRankings([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  if (error || !tournament) {
    return <div className="text-center py-6 text-red-400">{error || 'Failed to load'}</div>;
  }

  // Calculate team standings from rankings and match data
  const teamStandings = computeTeamStandings(teams, matches, tournament);

  return (
    <div className="mt-4 space-y-8 fade-in-up" onClick={e => e.stopPropagation()}>
      {/* Champion/Runner-up Banner */}
      <ChampionBanner tournament={tournament} teams={teams} />

      {/* Top 3 Podium */}
      {rankings.length >= 3 && <Podium players={rankings.slice(0, 3)} />}

      {/* Full Player Rankings Table */}
      {rankings.length > 0 && (
        <div>
          <div className="text-sm font-bold uppercase tracking-widest text-gold border-l-4 border-gold pl-3 mb-4">
            &#128203; Player Rankings
          </div>
          <div className="rounded-xl border border-[#333] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'linear-gradient(90deg, #0f4225, #1a6b3a)' }}>
                  <tr className="text-light-gold text-xs uppercase tracking-wider">
                    <th className="text-left py-3.5 px-2 sm:px-3">Rank</th>
                    <th className="text-left py-3.5 px-2 sm:px-3">Player</th>
                    <th className="text-left py-3.5 px-2 sm:px-3 hidden sm:table-cell">Team</th>
                    <th className="text-center py-3.5 px-2 sm:px-3 hidden md:table-cell">P</th>
                    <th className="text-center py-3.5 px-2 sm:px-3">W</th>
                    <th className="text-center py-3.5 px-2 sm:px-3">L</th>
                    <th className="text-center py-3.5 px-2 sm:px-3 hidden md:table-cell">M Win%</th>
                    <th className="text-center py-3.5 px-2 sm:px-3 hidden lg:table-cell">G Win%</th>
                    <th className="text-right py-3.5 px-2 sm:px-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {rankings.map((player, i) => {
                    const rank = player.rank || i + 1;
                    const playerTeam = findPlayerTeam(player.player_id, teams);
                    return (
                      <tr
                        key={player.player_id || i}
                        className={`border-b border-[#2a2a2a] hover:bg-white/[0.04] transition-colors ${
                          i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#2a2a2a]'
                        }`}
                      >
                        <td className="py-3 px-2 sm:px-3">
                          <span className={`font-extrabold ${
                            rank === 1 ? 'text-gold' : rank === 2 ? 'text-silver' : rank === 3 ? 'text-bronze' : 'text-gold'
                          }`}>
                            {rank}
                          </span>
                        </td>
                        <td className="py-3 px-2 sm:px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{player.name}</span>
                            <ClassBadge classification={player.classification} />
                          </div>
                        </td>
                        <td className="py-3 px-2 sm:px-3 hidden sm:table-cell text-muted text-xs">
                          {playerTeam || '-'}
                        </td>
                        <td className="py-3 px-2 sm:px-3 text-center hidden md:table-cell text-muted">
                          {player.matches_played || 0}
                        </td>
                        <td className="py-3 px-2 sm:px-3 text-center text-green-400 font-semibold">
                          {player.matches_won || 0}
                        </td>
                        <td className="py-3 px-2 sm:px-3 text-center text-red-400 font-semibold">
                          {player.matches_lost || 0}
                        </td>
                        <td className="py-3 px-2 sm:px-3 text-center hidden md:table-cell text-muted">
                          {player.match_win_pct != null ? `${player.match_win_pct.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-3 px-2 sm:px-3 text-center hidden lg:table-cell text-muted">
                          {player.game_win_pct != null ? `${player.game_win_pct.toFixed(1)}%` : '-'}
                        </td>
                        <td className="py-3 px-2 sm:px-3 text-right font-bold text-light-gold">
                          {player.score != null ? player.score.toFixed(1) : '0'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Team Standings */}
      {teamStandings.length > 0 && (
        <div>
          <div className="text-sm font-bold uppercase tracking-widest text-gold border-l-4 border-gold pl-3 mb-4">
            &#127941; Team Standings
          </div>
          <div className="rounded-xl border border-[#333] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: 'linear-gradient(90deg, #0f4225, #1a6b3a)' }}>
                  <tr className="text-light-gold text-xs uppercase tracking-wider">
                    <th className="text-left py-3.5 px-3">#</th>
                    <th className="text-left py-3.5 px-3">Team</th>
                    <th className="text-center py-3.5 px-3">P</th>
                    <th className="text-center py-3.5 px-3">W</th>
                    <th className="text-center py-3.5 px-3">L</th>
                    <th className="text-center py-3.5 px-3 hidden sm:table-cell">Win%</th>
                    <th className="text-right py-3.5 px-3">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStandings.map((team, i) => (
                    <tr
                      key={team.id}
                      className={`border-b border-[#2a2a2a] hover:bg-white/[0.04] transition-colors ${
                        i % 2 === 0 ? 'bg-[#1e1e1e]' : 'bg-[#2a2a2a]'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <span className={`font-extrabold ${
                          i === 0 ? 'text-gold' : i === 1 ? 'text-silver' : i === 2 ? 'text-bronze' : 'text-muted'
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold">
                        {team.name}
                        {team.isChampion && <span className="ml-2 text-xs text-gold">&#127942;</span>}
                        {team.isRunnerUp && <span className="ml-2 text-xs text-silver">&#129352;</span>}
                      </td>
                      <td className="py-3 px-3 text-center text-muted">{team.played}</td>
                      <td className="py-3 px-3 text-center text-green-400 font-semibold">{team.won}</td>
                      <td className="py-3 px-3 text-center text-red-400 font-semibold">{team.lost}</td>
                      <td className="py-3 px-3 text-center hidden sm:table-cell text-muted">
                        {team.played > 0 ? `${((team.won / team.played) * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-light-gold">{team.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function findPlayerTeam(playerId, teams) {
  for (const team of teams) {
    if (team.players?.some(p => p.id === playerId)) {
      return team.name;
    }
  }
  return null;
}

function computeTeamStandings(teams, matches, tournament) {
  const standings = {};
  for (const team of teams) {
    standings[team.id] = {
      id: team.id,
      name: team.name,
      played: 0,
      won: 0,
      lost: 0,
      points: 0,
      isChampion: team.id === tournament.champion_team_id,
      isRunnerUp: team.id === tournament.runner_up_team_id,
    };
  }

  for (const match of matches) {
    if (match.status !== 'completed') continue;
    const teamA = standings[match.team_a_id];
    const teamB = standings[match.team_b_id];
    if (!teamA || !teamB) continue;

    // Count game wins per team in this match
    let teamAWins = 0;
    let teamBWins = 0;
    if (match.games) {
      for (const game of match.games) {
        if (game.status === 'confirmed') {
          if ((game.player_a_score || 0) > (game.player_b_score || 0)) teamAWins++;
          else if ((game.player_b_score || 0) > (game.player_a_score || 0)) teamBWins++;
        }
      }
    }

    teamA.played++;
    teamB.played++;

    if (teamAWins > teamBWins) {
      teamA.won++;
      teamA.points += 2;
      teamB.lost++;
    } else if (teamBWins > teamAWins) {
      teamB.won++;
      teamB.points += 2;
      teamA.lost++;
    } else {
      teamA.points += 1;
      teamB.points += 1;
    }
  }

  return Object.values(standings).sort((a, b) => b.points - a.points || b.won - a.won);
}

export default function TournamentView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (id) setExpandedId(parseInt(id));
  }, [id]);

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

  const handleToggle = (tournamentId) => {
    if (expandedId === tournamentId) {
      setExpandedId(null);
      navigate('/tournaments', { replace: true });
    } else {
      setExpandedId(tournamentId);
      navigate(`/tournaments/${tournamentId}`, { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-gold border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="py-6 fade-in-up">
      {/* Hero */}
      <div className="text-center mb-8 py-6 rounded-lg border-b border-[#333]"
           style={{ background: 'linear-gradient(180deg, #0f4225 0%, #0d0d0d 100%)' }}>
        <h1 className="text-2xl sm:text-3xl font-bold text-gold uppercase tracking-wider">
          &#127921; Tournaments
        </h1>
        <p className="text-muted text-sm mt-1">{tournaments.length} Tournament{tournaments.length !== 1 ? 's' : ''} &nbsp;|&nbsp; Click to view details</p>
      </div>

      {tournaments.length === 0 ? (
        <div className="text-center py-12 text-muted">No tournaments yet.</div>
      ) : (
        <div className="space-y-4">
          {tournaments.map((t) => (
            <div key={t.id}>
              <TournamentCard
                tournament={t}
                isExpanded={expandedId === t.id}
                onToggle={() => handleToggle(t.id)}
              />
              {expandedId === t.id && (
                <div className="bg-felt-light rounded-b-lg border border-t-0 border-[#333] p-4 sm:p-6">
                  <ExpandedTournament tournamentId={t.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
