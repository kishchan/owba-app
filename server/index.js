import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import playerRoutes from './routes/players.js';
import tournamentRoutes from './routes/tournaments.js';
import teamRoutes from './routes/teams.js';
import matchRoutes from './routes/matches.js';
import rankingRoutes from './routes/rankings.js';
import notificationRoutes from './routes/notifications.js';
import eventRoutes from './routes/events.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database tables
initializeDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: '5mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/rankings', rankingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/events', eventRoutes);

// Serve static files from client/dist in production
const clientDistPath = join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// Catch-all route for SPA
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(join(clientDistPath, 'index.html'), (err) => {
      if (err) {
        res.status(404).json({ error: 'Not found' });
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`OWBA Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
