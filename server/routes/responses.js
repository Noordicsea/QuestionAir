import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';
import { createEvent } from './push.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const router = Router();

// Configure multer for voice uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, join(__dirname, '..', '..', 'data', 'voice'));
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.includes('webm') ? 'webm' : 
                file.mimetype.includes('mp4') ? 'm4a' : 'ogg';
    cb(null, `${uuidv4()}.${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files allowed'));
    }
  },
});

// Create response
router.post('/', requireAuth, (req, res) => {
  try {
    const { questionId, type, bodyText, templateName, templateData, isDraft, answerBudget } = req.body;
    
    if (!questionId) {
      return res.status(400).json({ error: 'Question ID required' });
    }
    
    // Verify question exists and user is target
    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ? AND target_user_id = ?
    `).get(questionId, req.session.userId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found or not authorized' });
    }
    
    const responseId = uuidv4();
    
    db.transaction(() => {
      db.prepare(`
        INSERT INTO responses (id, question_id, author_user_id, response_type, body_text, template_name, template_data, is_draft, answer_budget_minutes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        responseId,
        questionId,
        req.session.userId,
        type || 'text_short',
        bodyText?.trim() || null,
        templateName || null,
        templateData ? JSON.stringify(templateData) : null,
        isDraft ? 1 : 0,
        answerBudget || null
      );
      
      // Create initial version
      db.prepare(`
        INSERT INTO response_versions (id, response_id, body_text, template_data)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), responseId, bodyText?.trim() || null, templateData ? JSON.stringify(templateData) : null);
      
      // Update question status to active if not a draft
      if (!isDraft) {
        db.prepare(`
          UPDATE questions SET status = 'active', updated_at = datetime('now')
          WHERE id = ?
        `).run(questionId);
        
        // Create event for notification
        createEvent(db, question.author_user_id, 'new_response', { questionId, responseId });
      }
    })();
    
    res.status(201).json({ id: responseId });
  } catch (err) {
    console.error('Create response error:', err);
    res.status(500).json({ error: 'Failed to create response' });
  }
});

// Upload voice response
router.post('/voice', requireAuth, upload.single('audio'), (req, res) => {
  try {
    const { questionId, duration } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file required' });
    }
    
    if (!questionId) {
      return res.status(400).json({ error: 'Question ID required' });
    }
    
    // Verify question exists and user is target
    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ? AND target_user_id = ?
    `).get(questionId, req.session.userId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found or not authorized' });
    }
    
    const responseId = uuidv4();
    
    db.transaction(() => {
      db.prepare(`
        INSERT INTO responses (id, question_id, author_user_id, response_type, voice_file_path, voice_duration_seconds)
        VALUES (?, ?, ?, 'voice', ?, ?)
      `).run(
        responseId,
        questionId,
        req.session.userId,
        req.file.filename,
        parseInt(duration) || null
      );
      
      // Update question status to active
      db.prepare(`
        UPDATE questions SET status = 'active', updated_at = datetime('now')
        WHERE id = ?
      `).run(questionId);
      
      // Create event for notification
      createEvent(db, question.author_user_id, 'new_response', { questionId, responseId, isVoice: true });
    })();
    
    res.status(201).json({ 
      id: responseId,
      voiceFilePath: req.file.filename,
    });
  } catch (err) {
    console.error('Upload voice error:', err);
    res.status(500).json({ error: 'Failed to upload voice response' });
  }
});

// Update response
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const { bodyText, templateData, isDraft } = req.body;
    
    const response = db.prepare(`
      SELECT r.*, q.author_user_id as question_author_id
      FROM responses r
      JOIN questions q ON q.id = r.question_id
      WHERE r.id = ? AND r.author_user_id = ?
    `).get(req.params.id, req.session.userId);
    
    if (!response) {
      return res.status(404).json({ error: 'Response not found or not authorized' });
    }
    
    const updates = [];
    const params = [];
    
    if (bodyText !== undefined) {
      updates.push('body_text = ?');
      params.push(bodyText?.trim() || null);
    }
    if (templateData !== undefined) {
      updates.push('template_data = ?');
      params.push(templateData ? JSON.stringify(templateData) : null);
    }
    if (isDraft !== undefined) {
      updates.push('is_draft = ?');
      params.push(isDraft ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    
    db.transaction(() => {
      db.prepare(`
        UPDATE responses SET ${updates.join(', ')} WHERE id = ?
      `).run(...params);
      
      // Create version
      const updatedResponse = db.prepare('SELECT body_text, template_data FROM responses WHERE id = ?').get(req.params.id);
      db.prepare(`
        INSERT INTO response_versions (id, response_id, body_text, template_data)
        VALUES (?, ?, ?, ?)
      `).run(uuidv4(), req.params.id, updatedResponse.body_text, updatedResponse.template_data);
    })();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update response error:', err);
    res.status(500).json({ error: 'Failed to update response' });
  }
});

// Get quick reactions
router.get('/quick-reactions', requireAuth, (req, res) => {
  try {
    const reactions = db.prepare(`
      SELECT id, label, emoji, sort_order
      FROM quick_reactions
      ORDER BY sort_order ASC
    `).all();
    
    res.json({ reactions });
  } catch (err) {
    console.error('Get quick reactions error:', err);
    res.status(500).json({ error: 'Failed to get quick reactions' });
  }
});

export default router;

