import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../db.js';
import { authenticate, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// POST /login
router.post('/login', (req, res) => {
  try {
    const { owba_id, password } = req.body;

    if (!owba_id || !password) {
      return res.status(400).json({ error: 'owba_id and password are required' });
    }

    const player = db.prepare('SELECT * FROM players WHERE UPPER(owba_id) = UPPER(?)').get(owba_id);

    if (!player) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = bcrypt.compareSync(password, player.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const payload = {
      id: player.id,
      owba_id: player.owba_id,
      name: player.name,
      role: player.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: player.id,
        owba_id: player.owba_id,
        name: player.name,
        classification: player.classification,
        role: player.role,
        temp_password: player.temp_password,
        profile_picture: player.profile_picture
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST /change-password
router.post('/change-password', authenticate, (req, res) => {
  try {
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ error: 'current_password and new_password are required' });
    }

    if (new_password.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.user.id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const validPassword = bcrypt.compareSync(current_password, player.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newHash = bcrypt.hashSync(new_password, 10);
    db.prepare('UPDATE players SET password_hash = ?, temp_password = 0 WHERE id = ?').run(newHash, req.user.id);

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
