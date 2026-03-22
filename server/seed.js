import db, { initializeDatabase } from './db.js';
import bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database tables
initializeDatabase();

console.log('Seeding OWBA database...');

// Clear all tables
db.pragma('foreign_keys = OFF');
db.exec(`
  DELETE FROM match_games;
  DELETE FROM matches;
  DELETE FROM team_players;
  DELETE FROM teams;
  DELETE FROM tournaments;
  DELETE FROM notifications;
  DELETE FROM events;
  DELETE FROM players;
`);
db.pragma('foreign_keys = ON');

console.log('Tables cleared.');

// Generate random 8-char password
function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Real 49 players from players_list.txt
const playersData = [
  { rank: 1, classification: 'B', name: 'Miguel Chata' },
  { rank: 2, classification: 'B', name: 'Daniel Chata' },
  { rank: 3, classification: 'A', name: 'Nain Rosado' },
  { rank: 4, classification: 'B', name: 'Zair Perera' },
  { rank: 5, classification: 'A', name: 'Ernest Arzu' },
  { rank: 6, classification: 'A', name: 'Javier Chata' },
  { rank: 7, classification: 'A', name: 'Jose Chata' },
  { rank: 8, classification: 'B', name: 'Argel Perera' },
  { rank: 9, classification: 'A', name: 'Heraldo Carballo' },
  { rank: 10, classification: 'B', name: 'Kenneth Dawson' },
  { rank: 11, classification: 'B', name: 'Ricardo Carcaño' },
  { rank: 12, classification: 'A', name: 'Cristian Novelo' },
  { rank: 13, classification: 'A', name: 'Leroy Jacobs' },
  { rank: 14, classification: 'B', name: 'Nazir Guerra' },
  { rank: 15, classification: 'B', name: 'Zair Montalvo' },
  { rank: 16, classification: 'A', name: 'Harrington Williams' },
  { rank: 17, classification: 'C', name: 'Saul Garcia' },
  { rank: 18, classification: 'A', name: 'Eder Bautista' },
  { rank: 19, classification: 'B', name: 'Edilberto Novelo' },
  { rank: 20, classification: 'B', name: 'Jair Pana' },
  { rank: 21, classification: 'B', name: 'Oscar Reyes' },
  { rank: 22, classification: 'B', name: 'Cesar Cal' },
  { rank: 23, classification: 'B', name: 'Moises Aguilar' },
  { rank: 24, classification: 'A', name: 'Hiram Canul' },
  { rank: 25, classification: 'B', name: 'Juan Reyes' },
  { rank: 26, classification: 'B', name: 'Henry Nuñez' },
  { rank: 27, classification: 'C', name: 'Francisco Chata' },
  { rank: 28, classification: 'B', name: 'Lorenzo Leonardo' },
  { rank: 29, classification: 'B', name: 'Michael Ash' },
  { rank: 30, classification: 'B', name: 'Rudolph Jacobs' },
  { rank: 31, classification: 'B', name: 'Kai Hua Yu' },
  { rank: 32, classification: 'B', name: 'Osmar Yam' },
  { rank: 33, classification: 'A', name: 'Ramon Moreno' },
  { rank: 34, classification: 'C', name: 'Romaldo' },
  { rank: 35, classification: 'B', name: 'Simon Montes' },
  { rank: 36, classification: 'B', name: 'Ines Duran' },
  { rank: 37, classification: 'A', name: 'Jose Noh' },
  { rank: 38, classification: 'B', name: 'Cristian Chan' },
  { rank: 39, classification: 'C', name: 'Adir Rosado' },
  { rank: 40, classification: 'C', name: 'Gaspar Osorio' },
  { rank: 41, classification: 'B', name: 'Lucas Titus Coc' },
  { rank: 42, classification: 'B', name: 'Richard Reid' },
  { rank: 43, classification: 'B', name: 'Emilio Martinez' },
  { rank: 44, classification: 'C', name: 'Jacob Wiebe' },
  { rank: 45, classification: 'C', name: 'Luis Caal' },
  { rank: 46, classification: 'C', name: 'Anthony Chen' },
  { rank: 47, classification: 'C', name: 'Lorenzo Jr' },
  { rank: 48, classification: 'C', name: 'Hector Talango' },
  { rank: 49, classification: 'B', name: 'Stephen Hall' },
];

// Generate random username from first name + random suffix
function generateUsername(name, index) {
  const firstName = name.split(' ')[0].toLowerCase();
  const suffixes = ['pool', 'cue', 'rack', 'break', 'shot', 'run', 'table', 'chalk', 'tip', 'spin'];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const num = Math.floor(Math.random() * 90) + 10; // 10-99
  const formats = [
    `${firstName}_${suffix}${num}`,
    `${suffix}_${firstName}${num}`,
    `player_${firstName}${num}`,
    `${firstName}${num}_${suffix}`,
  ];
  return formats[Math.floor(Math.random() * formats.length)];
}

// Generate passwords and insert players
const insertPlayer = db.prepare(`
  INSERT INTO players (owba_id, name, classification, password_hash, temp_password, role)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const passwordLines = [];
const playerIdMap = {}; // owba_id -> db id
const playerByName = {}; // lowercase name -> db id
const playerByOwbaId = {}; // owba_id -> { id, name }
const usedUsernames = new Set();

for (let i = 0; i < playersData.length; i++) {
  const p = playersData[i];
  const owbaId = `OWBA-${String(i + 1).padStart(3, '0')}`;
  // OWBA-038 (Cristian Chan) gets a fixed password; others are random
  const password = i === 37 ? 'OwbaAdmin2026!' : generatePassword();
  const passwordHash = bcrypt.hashSync(password, 10);

  // OWBA-038 (Cristian Chan) is super_admin — keeps OWBA-038 as username
  const role = i === 37 ? 'super_admin' : 'player';

  // Generate random username for all players except OWBA-038
  let username;
  if (i === 37) {
    username = 'OWBA-038';
  } else {
    do {
      username = generateUsername(p.name, i);
    } while (usedUsernames.has(username));
    usedUsernames.add(username);
  }

  const result = insertPlayer.run(owbaId, p.name, p.classification, passwordHash, 1, role);
  const dbId = Number(result.lastInsertRowid);
  playerIdMap[owbaId] = dbId;
  playerByName[p.name.toLowerCase()] = dbId;
  playerByOwbaId[owbaId] = { id: dbId, name: p.name };

  passwordLines.push(`${owbaId} | ${p.name} | ${password} | Username: ${username}`);
}

// Save passwords file
const passwordFileContent = `OWBA Player Passwords - Generated ${new Date().toISOString()}
==========================================================
OWBA ID | Player Name | Password | Username
----------------------------------------------------------
${passwordLines.join('\n')}
----------------------------------------------------------
All players must change their password on first login.
OWBA-038 (Cristian Chan) is the Super Admin.
`;

writeFileSync(join(__dirname, '..', 'player_passwords.txt'), passwordFileContent);
console.log(`Inserted ${playersData.length} players. Passwords saved to player_passwords.txt`);

// Name mapping for score data -> player DB IDs
// Key: score file first name -> { playerId, team context }
const nameMap = {
  // Chata's team
  'Miguel': { team: "Chata's", id: playerIdMap['OWBA-001'] },      // Miguel Chata
  'Daniel': { team: "Chata's", id: playerIdMap['OWBA-002'] },      // Daniel Chata
  'Javier': { team: "Chata's", id: playerIdMap['OWBA-006'] },      // Javier Chata
  'Saul': { team: "Chata's", id: playerIdMap['OWBA-017'] },        // Saul Garcia

  // Morning Star team
  'Nain': { team: 'Morning Star', id: playerIdMap['OWBA-003'] },    // Nain Rosado
  'Kenneth': { team: 'Morning Star', id: playerIdMap['OWBA-010'] }, // Kenneth Dawson
  'Nazir': { team: 'Morning Star', id: playerIdMap['OWBA-014'] },   // Nazir Guerra
  'Adir': { team: 'Morning Star', id: playerIdMap['OWBA-039'] },    // Adir Rosado

  // Pool Dawgs team
  'Cesar': { team: 'Pool Dawgs', id: playerIdMap['OWBA-022'] },      // Cesar Cal
  'Francisco': { team: 'Pool Dawgs', id: playerIdMap['OWBA-027'] },  // Francisco Chata
  'Emilio': { team: 'Pool Dawgs', id: playerIdMap['OWBA-043'] },     // Emilio Martinez
  'Hector': { team: 'Pool Dawgs', id: playerIdMap['OWBA-048'] },     // Hector Talango
  'Luis': { team: 'Pool Dawgs', id: playerIdMap['OWBA-045'] },       // Luis Caal

  // Snipers team
  'Henry': { team: 'Snipers', id: playerIdMap['OWBA-026'] },       // Henry Nuñez
  'Ramon': { team: 'Snipers', id: playerIdMap['OWBA-033'] },       // Ramon Moreno
  'Jair': { team: 'Snipers', id: playerIdMap['OWBA-020'] },        // Jair Pana
  'Titus': { team: 'Snipers', id: playerIdMap['OWBA-041'] },       // Lucas Titus Coc

  // Dados team
  'Eder': { team: 'Dados', id: playerIdMap['OWBA-018'] },          // Eder Bautista
  'Moises': { team: 'Dados', id: playerIdMap['OWBA-023'] },        // Moises Aguilar
  'Eddieberto': { team: 'Dados', id: playerIdMap['OWBA-019'] },    // Edilberto Novelo
  'Kai': { team: 'Dados', id: playerIdMap['OWBA-031'] },           // Kai Hua Yu
  'Stephen': { team: 'Dados', id: playerIdMap['OWBA-049'] },       // Stephen Hall

  // Hashtag team
  'Heraldo': { team: 'Hashtag', id: playerIdMap['OWBA-009'] },     // Heraldo Carballo
  'Lorenzo': { team: 'Hashtag', id: playerIdMap['OWBA-028'] },     // Lorenzo Leonardo
  'Romaldo': { team: 'Hashtag', id: playerIdMap['OWBA-034'] },     // Romaldo
  'Ines': { team: 'Hashtag', id: playerIdMap['OWBA-036'] },        // Ines Duran
  'Lorenzo Jr': { team: 'Hashtag', id: playerIdMap['OWBA-047'] },  // Lorenzo Jr

  // Emalee.1 team
  'Ash': { team: 'Emalee.1', id: playerIdMap['OWBA-029'] },        // Michael Ash
  'Osmar': { team: 'Emalee.1', id: playerIdMap['OWBA-032'] },      // Osmar Yam
  'Leroy': { team: 'Emalee.1', id: playerIdMap['OWBA-013'] },      // Leroy Jacobs
  'Anthony': { team: 'Emalee.1', id: playerIdMap['OWBA-046'] },    // Anthony Chen

  // Emalee.2 team
  'Hiram': { team: 'Emalee.2', id: playerIdMap['OWBA-024'] },      // Hiram Canul
  'Oscar': { team: 'Emalee.2', id: playerIdMap['OWBA-021'] },      // Oscar Reyes
  'Juan': { team: 'Emalee.2', id: playerIdMap['OWBA-025'] },       // Juan Reyes
  'Williams': { team: 'Emalee.2', id: playerIdMap['OWBA-016'] },   // Harrington Williams
  'Reid': { team: 'Emalee.2', id: playerIdMap['OWBA-042'] },       // Richard Reid

  // Stix & Shots team
  'Zair P.': { team: 'Stix & Shots', id: playerIdMap['OWBA-004'] },  // Zair Perera
  'Argel': { team: 'Stix & Shots', id: playerIdMap['OWBA-008'] },    // Argel Perera
  'Jacob': { team: 'Stix & Shots', id: playerIdMap['OWBA-044'] },    // Jacob Wiebe
  'Gaspar': { team: 'Stix & Shots', id: playerIdMap['OWBA-040'] },   // Gaspar Osorio

  // Stix & Shots.2 team
  'Ricardo': { team: 'Stix & Shots.2', id: playerIdMap['OWBA-011'] }, // Ricardo Carcaño
  'Ernest': { team: 'Stix & Shots.2', id: playerIdMap['OWBA-005'] },  // Ernest Arzu
  'Simon': { team: 'Stix & Shots.2', id: playerIdMap['OWBA-035'] },   // Simon Montes
  'Rudolph': { team: 'Stix & Shots.2', id: playerIdMap['OWBA-030'] }, // Rudolph Jacobs
  'Zair M.': { team: 'Stix & Shots.2', id: playerIdMap['OWBA-015'] }, // Zair Montalvo
};

// Context-dependent names (Jose, Cristian appear on multiple teams)
function resolvePlayer(firstName, teamName) {
  // Handle Jose - on Snipers vs on Emalee.1
  if (firstName === 'Jose') {
    if (teamName === 'Snipers') return playerIdMap['OWBA-007']; // Jose Chata
    if (teamName === 'Emalee.1') return playerIdMap['OWBA-037']; // Jose Noh
    // Default: check which team context
    return playerIdMap['OWBA-007']; // fallback to Jose Chata
  }
  // Handle Cristian - on Stix & Shots (Novelo) vs on Chata's (Chan)
  if (firstName === 'Cristian') {
    if (teamName === 'Stix & Shots') return playerIdMap['OWBA-012']; // Cristian Novelo
    if (teamName === "Chata's") return playerIdMap['OWBA-038'];      // Cristian Chan
    return playerIdMap['OWBA-012']; // fallback to Novelo
  }
  const mapped = nameMap[firstName];
  if (mapped) return mapped.id;

  console.warn(`WARNING: Could not resolve player "${firstName}" for team "${teamName}"`);
  return null;
}

// Create tournament
const tournamentResult = db.prepare(`
  INSERT INTO tournaments (name, game_type, max_players_per_team, lineup_size, race_to, status,
    champion_multiplier, runner_up_multiplier, third_place_multiplier, fourth_place_multiplier,
    match_win_weight, game_win_weight, matches_played_points)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run('Stix & Shots 9 Ball Tournament', '9-ball', 7, 3, 5, 'completed',
  1.20, 1.10, 1.05, 1.00, 0.5, 0.3, 5);

const tournamentId = Number(tournamentResult.lastInsertRowid);
console.log(`Created tournament: Stix & Shots 9 Ball Tournament (ID: ${tournamentId})`);

// Define teams with real players from score data
const teamsData = [
  {
    name: "Chata's", placement: null,
    players: ['OWBA-001', 'OWBA-002', 'OWBA-006', 'OWBA-017', 'OWBA-038'] // Miguel, Daniel, Javier, Saul, Cristian Chan
  },
  {
    name: 'Morning Star', placement: null,
    players: ['OWBA-003', 'OWBA-010', 'OWBA-014', 'OWBA-039'] // Nain, Kenneth, Nazir, Adir
  },
  {
    name: 'Pool Dawgs', placement: null,
    players: ['OWBA-022', 'OWBA-027', 'OWBA-043', 'OWBA-048', 'OWBA-045'] // Cesar, Francisco, Emilio, Hector, Luis
  },
  {
    name: 'Snipers', placement: null,
    players: ['OWBA-007', 'OWBA-020', 'OWBA-026', 'OWBA-033', 'OWBA-041'] // Jose Chata, Jair, Henry, Ramon, Titus
  },
  {
    name: 'Dados', placement: null,
    players: ['OWBA-018', 'OWBA-019', 'OWBA-023', 'OWBA-031', 'OWBA-049'] // Eder, Edilberto, Moises, Kai, Stephen
  },
  {
    name: 'Hashtag', placement: null,
    players: ['OWBA-009', 'OWBA-028', 'OWBA-034', 'OWBA-036', 'OWBA-047'] // Heraldo, Lorenzo, Romaldo, Ines, Lorenzo Jr
  },
  {
    name: 'Emalee.1', placement: null,
    players: ['OWBA-029', 'OWBA-032', 'OWBA-037', 'OWBA-013', 'OWBA-046'] // Ash, Osmar, Jose Noh, Leroy, Anthony
  },
  {
    name: 'Emalee.2', placement: null,
    players: ['OWBA-021', 'OWBA-024', 'OWBA-025', 'OWBA-016', 'OWBA-042'] // Oscar, Hiram, Juan, Williams, Reid
  },
  {
    name: 'Stix & Shots', placement: null,
    players: ['OWBA-004', 'OWBA-008', 'OWBA-012', 'OWBA-040', 'OWBA-044'] // Zair P., Argel, Cristian Novelo, Gaspar, Jacob
  },
  {
    name: 'Stix & Shots.2', placement: null,
    players: ['OWBA-005', 'OWBA-011', 'OWBA-015', 'OWBA-030', 'OWBA-035'] // Ernest, Ricardo, Zair M., Rudolph, Simon
  },
];

const insertTeam = db.prepare('INSERT INTO teams (tournament_id, name, placement) VALUES (?, ?, ?)');
const insertTeamPlayer = db.prepare("INSERT INTO team_players (team_id, player_id, status) VALUES (?, ?, 'accepted')");

const teamIdMap = {}; // team name -> db id

for (const t of teamsData) {
  const result = insertTeam.run(tournamentId, t.name, t.placement);
  const teamId = Number(result.lastInsertRowid);
  teamIdMap[t.name] = teamId;

  for (const owbaId of t.players) {
    const playerId = playerIdMap[owbaId];
    insertTeamPlayer.run(teamId, playerId);
  }
}
console.log(`Created ${teamsData.length} teams.`);

// Parse and insert all real match data from stix_and_shots_scores.txt
const matchDataRaw = [
  // ==================== 2026-02-09 ====================
  {
    teamA: "Chata's", teamB: 'Emalee.2', date: '2026-02-09',
    games: [
      { a: 'Cristian', b: 'Hiram', scoreA: 1, scoreB: 5 },
      { a: 'Miguel', b: 'Oscar', scoreA: 5, scoreB: 3 },
      { a: 'Javier', b: 'Juan', scoreA: 5, scoreB: 1 },
    ]
  },
  {
    teamA: "Chata's", teamB: 'Morning Star', date: '2026-02-09',
    games: [
      { a: 'Javier', b: 'Nazir', scoreA: 3, scoreB: 5 },
      { a: 'Miguel', b: 'Nain', scoreA: 2, scoreB: 5 },
      { a: 'Daniel', b: 'Kenneth', scoreA: 5, scoreB: 1 },
    ]
  },
  {
    teamA: "Chata's", teamB: 'Pool Dawgs', date: '2026-02-09',
    games: [
      { a: 'Miguel', b: 'Francisco', scoreA: 5, scoreB: 4 },
      { a: 'Saul', b: 'Emilio', scoreA: 5, scoreB: 1 },
      { a: 'Daniel', b: 'Hector', scoreA: 5, scoreB: 1 },
    ]
  },
  {
    teamA: "Chata's", teamB: 'Snipers', date: '2026-02-09',
    games: [
      { a: 'Saul', b: 'Henry', scoreA: 5, scoreB: 1 },
      { a: 'Javier', b: 'Ramon', scoreA: 5, scoreB: 3 },
      { a: 'Daniel', b: 'Jair', scoreA: 5, scoreB: 1 },
    ]
  },
  {
    teamA: 'Dados', teamB: "Chata's", date: '2026-02-09',
    games: [
      { a: 'Eder', b: 'Miguel', scoreA: 3, scoreB: 5 },
      { a: 'Moises', b: 'Javier', scoreA: 5, scoreB: 4 },
      { a: 'Eddieberto', b: 'Cristian', scoreA: 3, scoreB: 5 },
    ]
  },
  {
    teamA: 'Dados', teamB: 'Morning Star', date: '2026-02-09',
    games: [
      { a: 'Eddieberto', b: 'Kenneth', scoreA: 5, scoreB: 1 },
      { a: 'Eder', b: 'Nain', scoreA: 1, scoreB: 5 },
      { a: 'Kai', b: 'Nazir', scoreA: 5, scoreB: 0 },
    ]
  },
  {
    teamA: 'Dados', teamB: 'Pool Dawgs', date: '2026-02-09',
    games: [
      { a: 'Eder', b: 'Francisco', scoreA: 5, scoreB: 4 },
      { a: 'Kai', b: 'Emilio', scoreA: 5, scoreB: 2 },
      { a: 'Eddieberto', b: 'Luis', scoreA: 5, scoreB: 2 },
    ]
  },
  {
    teamA: 'Dados', teamB: 'Stix & Shots.2', date: '2026-02-09',
    games: [
      { a: 'Kai', b: 'Ricardo', scoreA: 3, scoreB: 5 },
      { a: 'Moises', b: 'Rudolph', scoreA: 5, scoreB: 4 },
      { a: 'Eder', b: 'Ernest', scoreA: 2, scoreB: 5 },
    ]
  },
  {
    teamA: 'Emalee.1', teamB: 'Emalee.2', date: '2026-02-09',
    games: [
      { a: 'Ash', b: 'Williams', scoreA: 2, scoreB: 5 },
      { a: 'Osmar', b: 'Juan', scoreA: 2, scoreB: 5 },
      { a: 'Jose', b: 'Oscar', scoreA: 5, scoreB: 1 },
    ]
  },
  {
    teamA: 'Emalee.1', teamB: 'Hashtag', date: '2026-02-09',
    games: [
      { a: 'Ash', b: 'Heraldo', scoreA: 1, scoreB: 5 },
      { a: 'Jose', b: 'Lorenzo', scoreA: 5, scoreB: 4 },
      { a: 'Osmar', b: 'Romaldo', scoreA: 0, scoreB: 5 },
    ]
  },
  {
    teamA: 'Emalee.2', teamB: 'Hashtag', date: '2026-02-09',
    games: [
      { a: 'Juan', b: 'Heraldo', scoreA: 2, scoreB: 5 },
      { a: 'Reid', b: 'Romaldo', scoreA: 5, scoreB: 4 },
      { a: 'Williams', b: 'Lorenzo', scoreA: 5, scoreB: 2 },
    ]
  },
  {
    teamA: 'Hashtag', teamB: "Chata's", date: '2026-02-09',
    games: [
      { a: 'Lorenzo', b: 'Miguel', scoreA: 2, scoreB: 5 },
      { a: 'Heraldo', b: 'Javier', scoreA: 5, scoreB: 2 },
      { a: 'Ines', b: 'Daniel', scoreA: 1, scoreB: 5 },
    ]
  },
  {
    teamA: 'Hashtag', teamB: 'Snipers', date: '2026-02-09',
    games: [
      { a: 'Heraldo', b: 'Henry', scoreA: 3, scoreB: 5 },
      { a: 'Lorenzo', b: 'Jair', scoreA: 3, scoreB: 5 },
      { a: 'Romaldo', b: 'Jose', scoreA: 4, scoreB: 5 },
    ]
  },
  {
    teamA: 'Morning Star', teamB: 'Emalee.1', date: '2026-02-09',
    games: [
      { a: 'Nazir', b: 'Jose', scoreA: 5, scoreB: 2 },
      { a: 'Nain', b: 'Ash', scoreA: 5, scoreB: 2 },
      { a: 'Kenneth', b: 'Osmar', scoreA: 5, scoreB: 4 },
    ]
  },
  {
    teamA: 'Morning Star', teamB: 'Emalee.2', date: '2026-02-09',
    games: [
      { a: 'Nain', b: 'Hiram', scoreA: 3, scoreB: 5 },
      { a: 'Kenneth', b: 'Juan', scoreA: 5, scoreB: 1 },
      { a: 'Adir', b: 'Oscar', scoreA: 2, scoreB: 5 },
    ]
  },
  {
    teamA: 'Morning Star', teamB: 'Hashtag', date: '2026-02-09',
    games: [
      { a: 'Kenneth', b: 'Lorenzo', scoreA: 5, scoreB: 4 },
      { a: 'Nain', b: 'Ines', scoreA: 5, scoreB: 1 },
      { a: 'Nazir', b: 'Heraldo', scoreA: 2, scoreB: 5 },
    ]
  },
  {
    teamA: 'Pool Dawgs', teamB: 'Stix & Shots', date: '2026-02-09',
    games: [
      { a: 'Cesar', b: 'Cristian', scoreA: 1, scoreB: 5 },
      { a: 'Luis', b: 'Zair P.', scoreA: 1, scoreB: 5 },
      { a: 'Francisco', b: 'Jacob', scoreA: 5, scoreB: 4 },
    ]
  },
  {
    teamA: 'Snipers', teamB: 'Emalee.1', date: '2026-02-09',
    games: [
      { a: 'Jose', b: 'Jose', scoreA: 5, scoreB: 3 },
      { a: 'Titus', b: 'Ash', scoreA: 4, scoreB: 5 },
      { a: 'Jair', b: 'Osmar', scoreA: 3, scoreB: 5 },
    ]
  },
  {
    teamA: 'Snipers', teamB: 'Emalee.2', date: '2026-02-09',
    games: [
      { a: 'Henry', b: 'Reid', scoreA: 5, scoreB: 4 },
      { a: 'Jair', b: 'Williams', scoreA: 5, scoreB: 0 },
      { a: 'Ramon', b: 'Oscar', scoreA: 5, scoreB: 2 },
    ]
  },
  {
    teamA: 'Stix & Shots.2', teamB: 'Hashtag', date: '2026-02-09',
    games: [
      { a: 'Ricardo', b: 'Romaldo', scoreA: 5, scoreB: 1 },
      { a: 'Ernest', b: 'Heraldo', scoreA: 5, scoreB: 3 },
      { a: 'Simon', b: 'Lorenzo', scoreA: 5, scoreB: 1 },
    ]
  },
  {
    teamA: 'Stix & Shots.2', teamB: 'Morning Star', date: '2026-02-09',
    games: [
      { a: 'Ernest', b: 'Nazir', scoreA: 5, scoreB: 1 },
      { a: 'Simon', b: 'Nain', scoreA: 1, scoreB: 5 },
      { a: 'Rudolph', b: 'Kenneth', scoreA: 4, scoreB: 5 },
    ]
  },
  {
    teamA: 'Stix & Shots', teamB: 'Emalee.1', date: '2026-02-09',
    games: [
      { a: 'Zair P.', b: 'Jose', scoreA: 5, scoreB: 2 },
      { a: 'Cristian', b: 'Ash', scoreA: 5, scoreB: 3 },
      { a: 'Argel', b: 'Osmar', scoreA: 5, scoreB: 3 },
    ]
  },
  {
    teamA: 'Stix & Shots', teamB: 'Emalee.2', date: '2026-02-09',
    games: [
      { a: 'Zair P.', b: 'Hiram', scoreA: 5, scoreB: 4 },
      { a: 'Cristian', b: 'Oscar', scoreA: 4, scoreB: 5 },
      { a: 'Argel', b: 'Juan', scoreA: 2, scoreB: 5 },
    ]
  },
  {
    teamA: 'Stix & Shots', teamB: 'Hashtag', date: '2026-02-09',
    games: [
      { a: 'Jacob', b: 'Lorenzo', scoreA: 4, scoreB: 5 },
      { a: 'Zair P.', b: 'Heraldo', scoreA: 5, scoreB: 3 },
      { a: 'Argel', b: 'Romaldo', scoreA: 2, scoreB: 5 },
    ]
  },
  // ==================== 2026-02-13 ====================
  {
    teamA: 'Dados', teamB: 'Emalee.2', date: '2026-02-13',
    games: [
      { a: 'Eddieberto', b: 'Juan', scoreA: 5, scoreB: 3 },
      { a: 'Moises', b: 'Williams', scoreA: 1, scoreB: 5 },
      { a: 'Eder', b: 'Oscar', scoreA: 5, scoreB: 4 },
    ]
  },
  {
    teamA: 'Stix & Shots', teamB: 'Stix & Shots.2', date: '2026-02-13',
    games: [
      { a: 'Zair P.', b: 'Ernest', scoreA: 2, scoreB: 5 },
      { a: 'Gaspar', b: 'Ricardo', scoreA: 1, scoreB: 5 },
      { a: 'Argel', b: 'Simon', scoreA: 5, scoreB: 1 },
    ]
  },
  // ==================== 2026-02-14 ====================
  {
    teamA: 'Dados', teamB: 'Emalee.1', date: '2026-02-14',
    games: [
      { a: 'Eddieberto', b: 'Osmar', scoreA: 3, scoreB: 5 },
      { a: 'Eder', b: 'Jose', scoreA: 5, scoreB: 0 },
      { a: 'Moises', b: 'Ash', scoreA: 5, scoreB: 2 },
    ]
  },
  {
    teamA: 'Hashtag', teamB: 'Pool Dawgs', date: '2026-02-14',
    games: [
      { a: 'Lorenzo', b: 'Cesar', scoreA: 2, scoreB: 5 },
      { a: 'Ines', b: 'Francisco', scoreA: 5, scoreB: 1 },
      { a: 'Heraldo', b: 'Emilio', scoreA: 5, scoreB: 0 },
    ]
  },
  // ==================== 2026-02-15 ====================
  {
    teamA: "Chata's", teamB: 'Stix & Shots.2', date: '2026-02-15',
    games: [
      { a: 'Javier', b: 'Ricardo', scoreA: 2, scoreB: 5 },
      { a: 'Miguel', b: 'Simon', scoreA: 4, scoreB: 5 },
      { a: 'Daniel', b: 'Rudolph', scoreA: 5, scoreB: 4 },
    ]
  },
  {
    teamA: 'Dados', teamB: 'Hashtag', date: '2026-02-15',
    games: [
      { a: 'Moises', b: 'Ines', scoreA: 2, scoreB: 5 },
      { a: 'Eder', b: 'Lorenzo Jr', scoreA: 5, scoreB: 2 },
      { a: 'Kai', b: 'Lorenzo', scoreA: 3, scoreB: 5 },
    ]
  },
  {
    teamA: 'Emalee.1', teamB: 'Pool Dawgs', date: '2026-02-15',
    games: [
      { a: 'Osmar', b: 'Cesar', scoreA: 3, scoreB: 5 },
      { a: 'Leroy', b: 'Francisco', scoreA: 5, scoreB: 2 },
      { a: 'Ash', b: 'Hector', scoreA: 5, scoreB: 0 },
    ]
  },
  {
    teamA: 'Pool Dawgs', teamB: 'Stix & Shots.2', date: '2026-02-15',
    games: [
      { a: 'Cesar', b: 'Rudolph', scoreA: 3, scoreB: 5 },
      { a: 'Francisco', b: 'Simon', scoreA: 5, scoreB: 0 },
      { a: 'Emilio', b: 'Ernest', scoreA: 0, scoreB: 5 },
    ]
  },
  {
    teamA: 'Snipers', teamB: 'Pool Dawgs', date: '2026-02-15',
    games: [
      { a: 'Ramon', b: 'Cesar', scoreA: 4, scoreB: 5 },
      { a: 'Jair', b: 'Francisco', scoreA: 5, scoreB: 3 },
      { a: 'Henry', b: 'Emilio', scoreA: 5, scoreB: 1 },
    ]
  },
  {
    teamA: 'Stix & Shots.2', teamB: 'Emalee.2', date: '2026-02-15',
    games: [
      { a: 'Simon', b: 'Hiram', scoreA: 2, scoreB: 5 },
      { a: 'Ernest', b: 'Reid', scoreA: 5, scoreB: 2 },
      { a: 'Rudolph', b: 'Oscar', scoreA: 4, scoreB: 5 },
    ]
  },
  {
    teamA: 'Stix & Shots', teamB: "Chata's", date: '2026-02-15',
    games: [
      { a: 'Jacob', b: 'Javier', scoreA: 3, scoreB: 5 },
      { a: 'Gaspar', b: 'Miguel', scoreA: 3, scoreB: 5 },
      { a: 'Argel', b: 'Daniel', scoreA: 5, scoreB: 2 },
    ]
  },
  {
    teamA: 'Stix & Shots', teamB: 'Snipers', date: '2026-02-15',
    games: [
      { a: 'Gaspar', b: 'Titus', scoreA: 5, scoreB: 2 },
      { a: 'Jacob', b: 'Ramon', scoreA: 3, scoreB: 5 },
      { a: 'Argel', b: 'Jair', scoreA: 5, scoreB: 1 },
    ]
  },
  // ==================== 2026-02-20 ====================
  {
    teamA: 'Dados', teamB: 'Snipers', date: '2026-02-20',
    games: [
      { a: 'Eddieberto', b: 'Henry', scoreA: 5, scoreB: 4 },
      { a: 'Eder', b: 'Jose', scoreA: 2, scoreB: 5 },
      { a: 'Moises', b: 'Jair', scoreA: 5, scoreB: 4 },
    ]
  },
  {
    teamA: 'Emalee.2', teamB: 'Pool Dawgs', date: '2026-02-20',
    games: [
      { a: 'Williams', b: 'Francisco', scoreA: 5, scoreB: 2 },
      { a: 'Juan', b: 'Luis', scoreA: 5, scoreB: 2 },
      { a: 'Oscar', b: 'Emilio', scoreA: 5, scoreB: 2 },
    ]
  },
  // ==================== 2026-02-21 ====================
  {
    teamA: 'Morning Star', teamB: 'Pool Dawgs', date: '2026-02-21',
    games: [
      { a: 'Kenneth', b: 'Cesar', scoreA: 2, scoreB: 5 },
      { a: 'Adir', b: 'Emilio', scoreA: 5, scoreB: 0 },
      { a: 'Nazir', b: 'Francisco', scoreA: 5, scoreB: 4 },
    ]
  },
  {
    teamA: 'Stix & Shots.2', teamB: 'Snipers', date: '2026-02-21',
    games: [
      { a: 'Ernest', b: 'Jose', scoreA: 2, scoreB: 5 },
      { a: 'Ricardo', b: 'Titus', scoreA: 3, scoreB: 5 },
      { a: 'Zair M.', b: 'Henry', scoreA: 5, scoreB: 1 },
    ]
  },
  // ==================== 2026-02-22 ====================
  {
    teamA: 'Emalee.1', teamB: "Chata's", date: '2026-02-22',
    games: [
      { a: 'Leroy', b: 'Saul', scoreA: 5, scoreB: 2 },
      { a: 'Ash', b: 'Javier', scoreA: 0, scoreB: 5 },
      { a: 'Anthony', b: 'Miguel', scoreA: 0, scoreB: 5 },
    ]
  },
  {
    teamA: 'Morning Star', teamB: 'Snipers', date: '2026-02-22',
    games: [
      { a: 'Nazir', b: 'Jose', scoreA: 2, scoreB: 5 },
      { a: 'Nain', b: 'Titus', scoreA: 5, scoreB: 3 },
      { a: 'Kenneth', b: 'Jair', scoreA: 4, scoreB: 5 },
    ]
  },
  {
    teamA: 'Stix & Shots.2', teamB: 'Emalee.1', date: '2026-02-22',
    games: [
      { a: 'Ernest', b: 'Leroy', scoreA: 1, scoreB: 5 },
      { a: 'Zair M.', b: 'Anthony', scoreA: 5, scoreB: 3 },
      { a: 'Rudolph', b: 'Ash', scoreA: 5, scoreB: 2 },
    ]
  },
  {
    teamA: 'Stix & Shots', teamB: 'Dados', date: '2026-02-22',
    games: [
      { a: 'Cristian', b: 'Eddieberto', scoreA: 5, scoreB: 3 },
      { a: 'Zair P.', b: 'Eder', scoreA: 5, scoreB: 0 },
      { a: 'Argel', b: 'Stephen', scoreA: 5, scoreB: 1 },
    ]
  },
  {
    teamA: 'Stix & Shots', teamB: 'Morning Star', date: '2026-02-22',
    games: [
      { a: 'Zair P.', b: 'Kenneth', scoreA: 5, scoreB: 4 },
      { a: 'Cristian', b: 'Adir', scoreA: 5, scoreB: 3 },
      { a: 'Argel', b: 'Nazir', scoreA: 4, scoreB: 5 },
    ]
  },
];

// Insert matches and games
const insertMatch = db.prepare(
  "INSERT INTO matches (tournament_id, team_a_id, team_b_id, match_date, round, status) VALUES (?, ?, ?, ?, ?, 'completed')"
);

const insertGame = db.prepare(`
  INSERT INTO match_games (match_id, player_a_id, player_b_id, player_a_score, player_b_score,
    submitted_by, status, confirmed_at)
  VALUES (?, ?, ?, ?, ?, NULL, 'confirmed', datetime('now'))
`);

let matchCount = 0;
let gameCount = 0;

for (const matchData of matchDataRaw) {
  const teamAId = teamIdMap[matchData.teamA];
  const teamBId = teamIdMap[matchData.teamB];

  if (!teamAId || !teamBId) {
    console.warn(`WARNING: Could not find team IDs for "${matchData.teamA}" vs "${matchData.teamB}"`);
    continue;
  }

  const matchResult = insertMatch.run(tournamentId, teamAId, teamBId, matchData.date, 'Round Robin');
  const matchId = Number(matchResult.lastInsertRowid);
  matchCount++;

  for (const game of matchData.games) {
    const playerAId = resolvePlayer(game.a, matchData.teamA);
    const playerBId = resolvePlayer(game.b, matchData.teamB);

    if (!playerAId || !playerBId) {
      console.warn(`WARNING: Could not resolve players "${game.a}" (${matchData.teamA}) vs "${game.b}" (${matchData.teamB})`);
      continue;
    }

    insertGame.run(matchId, playerAId, playerBId, game.scoreA, game.scoreB);
    gameCount++;
  }
}

console.log(`Created ${matchCount} matches with ${gameCount} games.`);

// Summary
const totalPlayers = db.prepare('SELECT COUNT(*) as count FROM players').get().count;
const totalTeams = db.prepare('SELECT COUNT(*) as count FROM teams').get().count;
const totalMatches = db.prepare('SELECT COUNT(*) as count FROM matches').get().count;
const totalGames = db.prepare('SELECT COUNT(*) as count FROM match_games').get().count;
const confirmedGames = db.prepare("SELECT COUNT(*) as count FROM match_games WHERE status = 'confirmed'").get().count;

console.log('\n=== SEED SUMMARY ===');
console.log(`Players: ${totalPlayers}`);
console.log(`Teams: ${totalTeams}`);
console.log(`Matches: ${totalMatches}`);
console.log(`Games: ${totalGames} (${confirmedGames} confirmed)`);
console.log(`Tournament: Stix & Shots 9 Ball Tournament (completed)`);
console.log(`\nSuper Admin: OWBA-038 (Cristian Chan)`);
console.log(`Passwords saved to: player_passwords.txt`);
// Seed events
const insertEvent = db.prepare(`
  INSERT INTO events (title, description, date, status, tags, created_by)
  VALUES (?, ?, ?, ?, ?, ?)
`);

const adminId = playerIdMap['OWBA-038'];

insertEvent.run(
  'King of the Table — Belize Open 8-Ball Championship',
  'The biggest singles tournament in Belize history! Sponsored by Mike\'s Cue Club. Limited to 24 players — register early.',
  '2026-04-15',
  'upcoming',
  'National,Upcoming',
  adminId
);

insertEvent.run(
  'King James Billiards Partners Tournament',
  'Teams must confirm names in advance to be verified. Food, cold beers and cocktails available.',
  '2026-04-01',
  'upcoming',
  'Upcoming',
  adminId
);

insertEvent.run(
  'Chill N\' Ice Pool Showdown',
  'District vs. district rivalry match. Next showdown scheduled March 28 at Castro\'s Cool Spot.',
  '2026-03-28',
  'upcoming',
  'Upcoming',
  adminId
);

insertEvent.run(
  'Belize Billiards Top Players Clash',
  'National-level invitational featuring Belize\'s top pool players. Sanctioned with WPA & CSI affiliation. Sponsors include Predator, Kamui, Aramith & more.',
  '2026-05-01',
  'upcoming',
  'National,Upcoming',
  adminId
);

insertEvent.run(
  'Partner Billiards Tournament 2026',
  '1st: $1,500 | 2nd: $1,000 | 3rd: $500. Organized by the Belize Billiards Sporting League (Est. 2023).',
  '2026-02-15',
  'past',
  'Past',
  adminId
);

console.log('Seeded 5 events.');

console.log('\nSeeding complete!');
