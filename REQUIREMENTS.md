# OWBA - Orange Walk Billiards Association App

## Overview
Build a full-stack web application (PWA-ready) for the Orange Walk Billiards Association (OWBA) in Belize. This replaces a static site (https://owba-belize.surge.sh/) with a dynamic app where players log in and enter their own scores.

## Tech Stack
- **Frontend:** React + Tailwind CSS (dark theme matching existing site's billiards aesthetic)
- **Backend:** Node.js + Express
- **Database:** SQLite (simple, single-file, easy to deploy)
- **Auth:** JWT-based, OWBA IDs as login

## Design Guidelines
- Dark theme with green/teal accents (billiards table feel) — match the existing site's vibe
- Mobile-first (most users will be on phones)
- Clean, modern UI with card-based layouts
- Use pool/billiards emojis (🎱, 🏆) like the existing site
- Top 3 podium display for rankings (like the existing site shows)

## Current Website Structure (to replicate)
The existing site has these pages:
1. **Rankings** (index.html) — Overall season standings, top 10 spotlight, full player table with Rank/Class/Player/Played/Won/Lost/Match Win%/Game Win%/Score
2. **Classifications** (classifications.html) — Player classifications (A, B, C classes)
3. **Tournaments** (tournaments.html) — Individual tournament results, team standings
4. **Rules** (rules.html)
5. **Events** (events.html)
6. **Documents & Forms** (documents.html)
7. **Live Scores** (live.html)

## Data Model

### Players
- id (auto-increment)
- owba_id (unique, assigned by admin, e.g., "OWBA-001")
- name (full name)
- classification (A, B, C)
- password_hash
- temp_password (boolean - forces password change on first login)
- created_at

### Tournaments
- id
- name (e.g., "Stix & Shots 9 Ball Tournament")
- game_type (e.g., "9-ball", "8-ball", "10-ball")
- team_size (e.g., 3 for Stix & Shots, but 5 could play)
- race_to (e.g., race to 5, race to 7)
- status (upcoming, active, completed)
- champion_team_id (nullable)
- runner_up_team_id (nullable)
- champion_multiplier (default 1.20)
- runner_up_multiplier (default 1.10)
- semifinal_multiplier (default 1.05)
- created_at

### Teams
- id
- tournament_id
- name (e.g., "Chata's", "Morning Star")
- placement (1st, 2nd, 3rd, 4th, etc.)

### Team Players (join table)
- team_id
- player_id

### Matches
- id
- tournament_id
- team_a_id
- team_b_id
- round (optional, for bracket tracking)
- status (pending, in_progress, completed)
- created_at

### Match Games (individual player vs player within a match)
- id
- match_id
- player_a_id
- player_b_id
- player_a_score (games won, e.g., 5 in a race to 5)
- player_b_score
- player_a_confirmed (boolean)
- player_b_confirmed (boolean)
- status (pending, awaiting_confirmation, confirmed, disputed)
- confirmed_at

## Score Entry Flow

1. Admin creates tournament, teams, lineups, and match tiles
2. After playing, Player A logs in and finds their match
3. Player A enters: "I won 5, opponent won 3" (race to 5 example)
4. Player B logs in and enters their score
5. If scores match → auto-confirmed, locked
6. If scores DON'T match → error: "Scores don't match! Contact your opponent to resolve, or report to OWBA admin for corrections."
7. Admin can always override/correct scores from admin panel

## Scoring Formula

Base formula (from Stix & Shots):
```
Score = (Match Win% × 0.5) + (Game Win% × 0.3) + (Matches Played × 5)
```

Then placement multipliers are applied:
- Champion team players: × 1.20
- Runner-up team players: × 1.10  
- Semifinalists: × 1.05
- Others: × 1.00

The formula should be configurable per tournament by admin. For now, hardcode the above as default.

Overall rankings = sum of scores across all tournaments (before multipliers are applied per-tournament, then summed).

## Admin Panel Features

1. **Player Management**
   - Create player accounts (assign OWBA ID, set temp password)
   - Edit player info, classification
   - Reset passwords
   
2. **Tournament Management**
   - Create tournament (name, game type, team size, race-to)
   - Set tournament status (upcoming → active → completed)
   - Set placement multipliers
   
3. **Team Management**
   - Create teams within a tournament
   - Assign players to teams
   - Set team placements after tournament
   
4. **Match Management**
   - Create match tiles (Team A vs Team B)
   - Set player lineups for each match
   - Override/correct scores
   - View disputed scores

5. **Score Corrections**
   - Override any score
   - Resolve disputes

## Pages to Build

### Public (no login required)
1. **Home/Rankings** — Overall season standings (same as current site)
2. **Tournament View** — Select tournament, see player rankings + team standings
3. **Login page**

### Player (logged in)
4. **Dashboard** — My upcoming matches, recent results
5. **Enter Score** — Select match, enter score
6. **My Stats** — Personal statistics across tournaments
7. **Change Password**

### Admin
8. **Admin Dashboard** — Overview, pending disputes
9. **Manage Players** — CRUD players
10. **Manage Tournaments** — CRUD tournaments
11. **Manage Teams** — CRUD teams, assign players
12. **Manage Matches** — Create match tiles, set lineups, override scores

## API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/change-password

### Players
- GET /api/players (public - for rankings)
- GET /api/players/:id
- POST /api/players (admin)
- PUT /api/players/:id (admin)
- DELETE /api/players/:id (admin)

### Tournaments
- GET /api/tournaments (public)
- GET /api/tournaments/:id (public - with rankings)
- POST /api/tournaments (admin)
- PUT /api/tournaments/:id (admin)

### Teams
- GET /api/tournaments/:id/teams
- POST /api/tournaments/:id/teams (admin)
- PUT /api/teams/:id (admin)

### Matches
- GET /api/tournaments/:id/matches
- POST /api/tournaments/:id/matches (admin)
- PUT /api/matches/:id/lineup (admin)

### Scores
- POST /api/matches/:matchId/games/:gameId/score (player - enter score)
- PUT /api/matches/:matchId/games/:gameId/score (admin - override)

### Rankings
- GET /api/rankings (overall)
- GET /api/rankings/:tournamentId (per tournament)

## Seed Data
Pre-populate with the 49 players and Stix & Shots tournament data from the existing website. Include all match results so rankings calculate correctly from day one.

## Important Notes
- Mobile-first responsive design
- PWA manifest so it can be "installed" on Android
- The app should feel like a native app on mobile
- Default admin account: admin / admin123 (force password change)
- All times in Belize timezone (UTC-6, no DST)
