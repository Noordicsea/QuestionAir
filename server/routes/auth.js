import { Router } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Login
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const user = db.prepare(`
      SELECT id, username, password_hash, display_name
      FROM users WHERE username = ?
    `).get(username.trim());
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.userId = user.id;
    
    // Get settings
    const settings = db.prepare(`
      SELECT * FROM user_settings WHERE user_id = ?
    `).get(user.id);
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
      },
      settings: settings ? {
        heavyModeEnabled: !!settings.heavy_mode_enabled,
        notificationsEnabled: !!settings.notifications_enabled,
        quietHoursStart: settings.quiet_hours_start,
        quietHoursEnd: settings.quiet_hours_end,
        defaultDepth: settings.default_depth,
        quickQuestionMaxLength: settings.quick_question_max_length,
      } : null,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  try {
    const user = db.prepare(`
      SELECT id, username, display_name FROM users WHERE id = ?
    `).get(req.session.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const settings = db.prepare(`
      SELECT * FROM user_settings WHERE user_id = ?
    `).get(user.id);
    
    // Get partner info
    const partner = db.prepare(`
      SELECT id, display_name FROM users WHERE id != ?
    `).get(user.id);
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
      },
      partner: partner ? {
        id: partner.id,
        displayName: partner.display_name,
      } : null,
      settings: settings ? {
        heavyModeEnabled: !!settings.heavy_mode_enabled,
        notificationsEnabled: !!settings.notifications_enabled,
        quietHoursStart: settings.quiet_hours_start,
        quietHoursEnd: settings.quiet_hours_end,
        defaultDepth: settings.default_depth,
        quickQuestionMaxLength: settings.quick_question_max_length,
      } : null,
    });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Change password
router.post('/change-password', requireAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    const user = db.prepare(`
      SELECT password_hash FROM users WHERE id = ?
    `).get(req.session.userId);
    
    const validPassword = bcrypt.compareSync(currentPassword, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const newHash = bcrypt.hashSync(newPassword, 10);
    db.prepare(`
      UPDATE users SET password_hash = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newHash, req.session.userId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update display name
router.patch('/profile', requireAuth, (req, res) => {
  try {
    const { displayName } = req.body;
    
    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name required' });
    }
    
    db.prepare(`
      UPDATE users SET display_name = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(displayName.trim(), req.session.userId);
    
    res.json({ success: true, displayName: displayName.trim() });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

