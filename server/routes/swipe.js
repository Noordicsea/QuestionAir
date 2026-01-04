import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get swipe queue
router.get('/', requireAuth, (req, res) => {
  try {
    const { includeHeavy = 'false' } = req.query;
    
    // Get user's heavy mode setting
    const settings = db.prepare(`
      SELECT heavy_mode_enabled FROM user_settings WHERE user_id = ?
    `).get(req.session.userId);
    
    const showHeavy = includeHeavy === 'true' || settings?.heavy_mode_enabled;
    
    let whereClause = `
      WHERE sq.user_id = ?
      AND q.status IN ('new', 'holding')
      AND (q.cooldown_until IS NULL OR q.cooldown_until < datetime('now'))
    `;
    
    if (!showHeavy) {
      whereClause += ' AND q.is_heavy = 0';
    }
    
    const queue = db.prepare(`
      SELECT 
        sq.id as queue_id,
        sq.position,
        q.*,
        u.display_name as author_name
      FROM swipe_queue sq
      JOIN questions q ON q.id = sq.question_id
      JOIN users u ON u.id = q.author_user_id
      ${whereClause}
      ORDER BY sq.position ASC
    `).all(req.session.userId);
    
    res.json({
      queue: queue.map(item => ({
        queueId: item.queue_id,
        position: item.position,
        question: {
          id: item.id,
          title: item.title,
          body: item.body,
          depth: item.depth,
          isHeavy: !!item.is_heavy,
          cooldownUntil: item.cooldown_until,
          status: item.status,
          authorName: item.author_name,
          createdAt: item.created_at,
        },
      })),
      heavyModeEnabled: !!settings?.heavy_mode_enabled,
    });
  } catch (err) {
    console.error('Get swipe queue error:', err);
    res.status(500).json({ error: 'Failed to get swipe queue' });
  }
});

// Add question to swipe queue
router.post('/add', requireAuth, (req, res) => {
  try {
    const { questionId } = req.body;
    
    if (!questionId) {
      return res.status(400).json({ error: 'Question ID required' });
    }
    
    // Verify question exists and user is target
    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ? AND target_user_id = ?
    `).get(questionId, req.session.userId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Check if already in queue
    const existing = db.prepare(`
      SELECT id FROM swipe_queue WHERE user_id = ? AND question_id = ?
    `).get(req.session.userId, questionId);
    
    if (existing) {
      return res.status(400).json({ error: 'Question already in queue' });
    }
    
    // Get max position
    const maxPos = db.prepare(`
      SELECT MAX(position) as max_pos FROM swipe_queue WHERE user_id = ?
    `).get(req.session.userId);
    
    const newPosition = (maxPos.max_pos || 0) + 1;
    
    db.prepare(`
      INSERT INTO swipe_queue (id, user_id, question_id, position)
      VALUES (?, ?, ?, ?)
    `).run(uuidv4(), req.session.userId, questionId, newPosition);
    
    res.status(201).json({ position: newPosition });
  } catch (err) {
    console.error('Add to swipe queue error:', err);
    res.status(500).json({ error: 'Failed to add to queue' });
  }
});

// Add all unanswered questions to queue
router.post('/add-all', requireAuth, (req, res) => {
  try {
    const { includeHeavy = false, depthFilter } = req.body;
    
    let whereClause = `
      WHERE q.target_user_id = ?
      AND q.status IN ('new', 'holding')
      AND NOT EXISTS (SELECT 1 FROM swipe_queue sq WHERE sq.question_id = q.id AND sq.user_id = ?)
    `;
    const params = [req.session.userId, req.session.userId];
    
    if (!includeHeavy) {
      whereClause += ' AND q.is_heavy = 0';
    }
    
    if (depthFilter && ['quick', 'medium', 'deep'].includes(depthFilter)) {
      whereClause += ' AND q.depth = ?';
      params.push(depthFilter);
    }
    
    const questions = db.prepare(`
      SELECT id FROM questions q ${whereClause}
      ORDER BY q.created_at ASC
    `).all(...params);
    
    if (questions.length === 0) {
      return res.json({ added: 0 });
    }
    
    // Get current max position
    const maxPos = db.prepare(`
      SELECT MAX(position) as max_pos FROM swipe_queue WHERE user_id = ?
    `).get(req.session.userId);
    
    let position = (maxPos.max_pos || 0);
    
    const insert = db.prepare(`
      INSERT INTO swipe_queue (id, user_id, question_id, position)
      VALUES (?, ?, ?, ?)
    `);
    
    db.transaction(() => {
      for (const q of questions) {
        position++;
        insert.run(uuidv4(), req.session.userId, q.id, position);
      }
    })();
    
    res.json({ added: questions.length });
  } catch (err) {
    console.error('Add all to queue error:', err);
    res.status(500).json({ error: 'Failed to add questions to queue' });
  }
});

// Remove from swipe queue
router.delete('/:questionId', requireAuth, (req, res) => {
  try {
    db.prepare(`
      DELETE FROM swipe_queue 
      WHERE user_id = ? AND question_id = ?
    `).run(req.session.userId, req.params.questionId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Remove from queue error:', err);
    res.status(500).json({ error: 'Failed to remove from queue' });
  }
});

// Skip (move to end of queue)
router.post('/skip/:questionId', requireAuth, (req, res) => {
  try {
    const { questionId } = req.params;
    
    // Get current max position
    const maxPos = db.prepare(`
      SELECT MAX(position) as max_pos FROM swipe_queue WHERE user_id = ?
    `).get(req.session.userId);
    
    db.prepare(`
      UPDATE swipe_queue 
      SET position = ?
      WHERE user_id = ? AND question_id = ?
    `).run((maxPos.max_pos || 0) + 1, req.session.userId, questionId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Skip in queue error:', err);
    res.status(500).json({ error: 'Failed to skip question' });
  }
});

// Clear entire queue
router.delete('/', requireAuth, (req, res) => {
  try {
    db.prepare(`
      DELETE FROM swipe_queue WHERE user_id = ?
    `).run(req.session.userId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Clear queue error:', err);
    res.status(500).json({ error: 'Failed to clear queue' });
  }
});

export default router;

