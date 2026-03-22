import { Router } from 'express';
import db from '../db.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();

// GET / - Public. Return all events ordered by date DESC.
router.get('/', (req, res) => {
  try {
    const events = db.prepare('SELECT * FROM events ORDER BY date DESC').all();
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// POST / - Admin only. Create event.
router.post('/', authenticate, requireAdmin, (req, res) => {
  try {
    const { title, description, date, status, tags, image_url } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Event title is required' });
    }

    const result = db.prepare(`
      INSERT INTO events (title, description, date, status, tags, image_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      description || null,
      date || null,
      status || 'upcoming',
      tags || null,
      image_url || null,
      req.user.id
    );

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// PUT /:id - Admin only. Update event.
router.put('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const allowedFields = ['title', 'description', 'date', 'status', 'tags', 'image_url'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    db.prepare(`UPDATE events SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// DELETE /:id - Admin only. Delete event.
router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  try {
    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(req.params.id);

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

export default router;
