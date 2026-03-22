import { Router } from 'express';
import db from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET / - Get notifications for the logged-in player.
router.get('/', authenticate, (req, res) => {
  try {
    const notifications = db.prepare(
      'SELECT * FROM notifications WHERE player_id = ? ORDER BY created_at DESC LIMIT 50'
    ).all(req.user.id);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// GET /unread-count - Get unread notification count.
router.get('/unread-count', authenticate, (req, res) => {
  try {
    const result = db.prepare(
      'SELECT COUNT(*) as count FROM notifications WHERE player_id = ? AND read = 0'
    ).get(req.user.id);
    res.json({ count: result.count });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /:id/read - Mark notification as read.
// Team invite and score confirm notifications cannot be marked as read directly — they must be acted on.
router.put('/:id/read', authenticate, (req, res) => {
  try {
    const notif = db.prepare('SELECT * FROM notifications WHERE id = ? AND player_id = ?').get(req.params.id, req.user.id);
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    if (notif.type === 'team_invite' || notif.type === 'score_confirm') {
      return res.status(400).json({ error: 'This notification requires an action (accept/decline). It cannot be dismissed.' });
    }
    db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND player_id = ?')
      .run(req.params.id, req.user.id);
    res.json({ message: 'Notification marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /read-all - Mark all non-actionable notifications as read.
// Skips team_invite and score_confirm — those require explicit accept/decline.
router.put('/read-all', authenticate, (req, res) => {
  try {
    db.prepare(
      "UPDATE notifications SET read = 1 WHERE player_id = ? AND type NOT IN ('team_invite', 'score_confirm')"
    ).run(req.user.id);
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
