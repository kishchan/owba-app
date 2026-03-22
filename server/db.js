import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Use persistent disk path if available (Render), otherwise local
const dbPath = process.env.DB_PATH || join(__dirname, 'owba.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owba_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      classification TEXT DEFAULT 'C' CHECK(classification IN ('A', 'B', 'C')),
      password_hash TEXT NOT NULL,
      temp_password INTEGER DEFAULT 1,
      role TEXT DEFAULT 'player' CHECK(role IN ('super_admin', 'admin', 'player')),
      profile_picture TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tournaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      game_type TEXT DEFAULT '9-ball',
      max_players_per_team INTEGER DEFAULT 7,
      lineup_size INTEGER DEFAULT 3,
      race_to INTEGER DEFAULT 5,
      status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'active', 'completed')),
      champion_team_id INTEGER REFERENCES teams(id),
      runner_up_team_id INTEGER REFERENCES teams(id),
      champion_multiplier REAL DEFAULT 1.20,
      runner_up_multiplier REAL DEFAULT 1.10,
      semifinal_multiplier REAL DEFAULT 1.05,
      match_win_weight REAL DEFAULT 0.5,
      game_win_weight REAL DEFAULT 0.3,
      matches_played_points REAL DEFAULT 5,
      category TEXT DEFAULT 'regular' CHECK(category IN ('regular', 'ab', 'unique_c')),
      category_weight REAL DEFAULT 1.0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
      name TEXT NOT NULL,
      placement INTEGER,
      captain_id INTEGER REFERENCES players(id),
      designator_id INTEGER REFERENCES players(id)
    );

    CREATE TABLE IF NOT EXISTS team_players (
      team_id INTEGER NOT NULL REFERENCES teams(id),
      player_id INTEGER NOT NULL REFERENCES players(id),
      status TEXT DEFAULT 'accepted' CHECK(status IN ('pending', 'accepted', 'declined')),
      PRIMARY KEY (team_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL REFERENCES players(id),
      type TEXT NOT NULL DEFAULT 'general',
      message TEXT NOT NULL,
      data TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tournament_id INTEGER NOT NULL REFERENCES tournaments(id),
      team_a_id INTEGER NOT NULL REFERENCES teams(id),
      team_b_id INTEGER NOT NULL REFERENCES teams(id),
      match_date TEXT,
      round TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'in_progress', 'completed')),
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Migration: add profile_picture column if missing
    CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY);
  `);

  // Add profile_picture column to existing databases
  const hasMigration = db.prepare("SELECT name FROM _migrations WHERE name = 'add_profile_picture'").get();
  if (!hasMigration) {
    try {
      db.exec("ALTER TABLE players ADD COLUMN profile_picture TEXT");
    } catch {
      // Column already exists
    }
    db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES ('add_profile_picture')").run();
  }

  // Migration: add 3rd/4th place columns and split semifinal_multiplier
  const has3rdPlaceMigration = db.prepare("SELECT name FROM _migrations WHERE name = 'add_3rd_4th_place'").get();
  if (!has3rdPlaceMigration) {
    try { db.exec("ALTER TABLE tournaments ADD COLUMN third_place_team_id INTEGER REFERENCES teams(id)"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE tournaments ADD COLUMN fourth_place_team_id INTEGER REFERENCES teams(id)"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE tournaments ADD COLUMN third_place_multiplier REAL DEFAULT 1.05"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE tournaments ADD COLUMN fourth_place_multiplier REAL DEFAULT 1.00"); } catch { /* exists */ }
    // Copy existing semifinal_multiplier to third_place_multiplier for existing data
    try { db.exec("UPDATE tournaments SET third_place_multiplier = semifinal_multiplier WHERE semifinal_multiplier IS NOT NULL"); } catch { /* ok */ }
    db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES ('add_3rd_4th_place')").run();
  }

  // Migration: add team captain and designator
  const hasCaptainMigration = db.prepare("SELECT name FROM _migrations WHERE name = 'add_team_captain_designator'").get();
  if (!hasCaptainMigration) {
    try { db.exec("ALTER TABLE teams ADD COLUMN captain_id INTEGER REFERENCES players(id)"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE teams ADD COLUMN designator_id INTEGER REFERENCES players(id)"); } catch { /* exists */ }
    db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES ('add_team_captain_designator')").run();
  }

  // Migration: add tournament category columns
  const hasCategoryMigration = db.prepare("SELECT name FROM _migrations WHERE name = 'add_tournament_category'").get();
  if (!hasCategoryMigration) {
    try { db.exec("ALTER TABLE tournaments ADD COLUMN category TEXT DEFAULT 'regular'"); } catch { /* exists */ }
    try { db.exec("ALTER TABLE tournaments ADD COLUMN category_weight REAL DEFAULT 1.0"); } catch { /* exists */ }
    db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES ('add_tournament_category')").run();
  }

  // Migration: add image_url column to events table
  const hasImageUrlMigration = db.prepare("SELECT name FROM _migrations WHERE name = 'add_events_image_url'").get();
  if (!hasImageUrlMigration) {
    try { db.exec("ALTER TABLE events ADD COLUMN image_url TEXT"); } catch { /* exists */ }
    db.prepare("INSERT OR IGNORE INTO _migrations (name) VALUES ('add_events_image_url')").run();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS match_games (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id),
      player_a_id INTEGER NOT NULL REFERENCES players(id),
      player_b_id INTEGER NOT NULL REFERENCES players(id),
      player_a_score INTEGER,
      player_b_score INTEGER,
      submitted_by INTEGER REFERENCES players(id),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'awaiting_confirmation', 'confirmed', 'disputed')),
      confirmed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      date TEXT,
      status TEXT DEFAULT 'upcoming' CHECK(status IN ('upcoming', 'past')),
      tags TEXT,
      image_url TEXT,
      created_by INTEGER REFERENCES players(id),
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export default db;
