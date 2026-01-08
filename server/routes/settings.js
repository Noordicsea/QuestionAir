import { Router } from 'express';
import db from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get settings
router.get('/', requireAuth, (req, res) => {
  try {
    const settings = db.prepare(`
      SELECT * FROM user_settings WHERE user_id = ?
    `).get(req.session.userId);
    
    if (!settings) {
      // Create default settings
      db.prepare(`
        INSERT INTO user_settings (user_id) VALUES (?)
      `).run(req.session.userId);
      
      return res.json({
        heavyModeEnabled: false,
        notificationsEnabled: true,
        quietHoursStart: null,
        quietHoursEnd: null,
        defaultDepth: 'medium',
        quickQuestionMaxLength: 280,
      });
    }
    
    res.json({
      heavyModeEnabled: !!settings.heavy_mode_enabled,
      notificationsEnabled: !!settings.notifications_enabled,
      quietHoursStart: settings.quiet_hours_start,
      quietHoursEnd: settings.quiet_hours_end,
      defaultDepth: settings.default_depth,
      quickQuestionMaxLength: settings.quick_question_max_length,
    });
  } catch (err) {
    console.error('Get settings error:', err);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

// Update settings
router.patch('/', requireAuth, (req, res) => {
  try {
    const {
      heavyModeEnabled,
      notificationsEnabled,
      quietHoursStart,
      quietHoursEnd,
      defaultDepth,
      quickQuestionMaxLength,
    } = req.body;
    
    const updates = [];
    const params = [];
    
    if (heavyModeEnabled !== undefined) {
      updates.push('heavy_mode_enabled = ?');
      params.push(heavyModeEnabled ? 1 : 0);
    }
    if (notificationsEnabled !== undefined) {
      updates.push('notifications_enabled = ?');
      params.push(notificationsEnabled ? 1 : 0);
    }
    if (quietHoursStart !== undefined) {
      updates.push('quiet_hours_start = ?');
      params.push(quietHoursStart || null);
    }
    if (quietHoursEnd !== undefined) {
      updates.push('quiet_hours_end = ?');
      params.push(quietHoursEnd || null);
    }
    if (defaultDepth !== undefined && ['quick', 'medium', 'deep'].includes(defaultDepth)) {
      updates.push('default_depth = ?');
      params.push(defaultDepth);
    }
    if (quickQuestionMaxLength !== undefined) {
      updates.push('quick_question_max_length = ?');
      params.push(parseInt(quickQuestionMaxLength) || 280);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    updates.push("updated_at = datetime('now')");
    params.push(req.session.userId);
    
    db.prepare(`
      UPDATE user_settings SET ${updates.join(', ')} WHERE user_id = ?
    `).run(...params);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update settings error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Toggle heavy mode quickly
router.post('/toggle-heavy', requireAuth, (req, res) => {
  try {
    const current = db.prepare(`
      SELECT heavy_mode_enabled FROM user_settings WHERE user_id = ?
    `).get(req.session.userId);
    
    const newValue = current ? (current.heavy_mode_enabled ? 0 : 1) : 1;
    
    db.prepare(`
      UPDATE user_settings 
      SET heavy_mode_enabled = ?, updated_at = datetime('now')
      WHERE user_id = ?
    `).run(newValue, req.session.userId);
    
    res.json({ heavyModeEnabled: !!newValue });
  } catch (err) {
    console.error('Toggle heavy mode error:', err);
    res.status(500).json({ error: 'Failed to toggle heavy mode' });
  }
});

export default router;



