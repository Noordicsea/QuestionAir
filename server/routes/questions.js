import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { requireAuth, getOtherUserId } from '../middleware/auth.js';
import { createEvent } from './push.js';

const router = Router();

// Get questions for current user (inbox)
router.get('/', requireAuth, (req, res) => {
  try {
    const {
      filter = 'all',
      depth,
      status,
      showHeavy,
      hasVoice,
      hasTemplate,
      sort = 'newest',
      limit = 50,
      offset = 0,
    } = req.query;
    
    let whereClause = 'WHERE q.target_user_id = ?';
    const params = [req.session.userId];
    
    // Filter by depth
    if (depth && ['quick', 'medium', 'deep'].includes(depth)) {
      whereClause += ' AND q.depth = ?';
      params.push(depth);
    }
    
    // Filter by status
    if (status && ['new', 'holding', 'declined', 'active'].includes(status)) {
      whereClause += ' AND q.status = ?';
      params.push(status);
    }
    
    // Filter heavy questions
    if (showHeavy === 'false') {
      whereClause += ' AND q.is_heavy = 0';
    } else if (showHeavy === 'only') {
      whereClause += ' AND q.is_heavy = 1';
    }
    
    // Sort
    let orderBy = 'ORDER BY q.created_at DESC';
    switch (sort) {
      case 'oldest':
        orderBy = 'ORDER BY q.created_at ASC';
        break;
      case 'updated':
        orderBy = 'ORDER BY q.updated_at DESC';
        break;
      case 'needs_attention':
        orderBy = `ORDER BY 
          CASE WHEN q.status = 'new' THEN 0 
               WHEN q.status = 'holding' THEN 1 
               ELSE 2 END,
          q.created_at DESC`;
        break;
      case 'random':
        orderBy = 'ORDER BY RANDOM()';
        break;
    }
    
    const questions = db.prepare(`
      SELECT 
        q.*,
        u.display_name as author_name,
        (SELECT COUNT(*) FROM responses r WHERE r.question_id = q.id AND r.is_draft = 0) as response_count,
        (SELECT COUNT(*) FROM responses r WHERE r.question_id = q.id AND r.response_type = 'voice') as voice_count,
        (SELECT COUNT(*) FROM responses r WHERE r.question_id = q.id AND r.response_type = 'template') as template_count,
        (SELECT COUNT(*) FROM responses r WHERE r.question_id = q.id AND r.is_draft = 1) as draft_count
      FROM questions q
      JOIN users u ON u.id = q.author_user_id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));
    
    // Get total count for pagination
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM questions q ${whereClause}
    `).get(...params);
    
    res.json({
      questions: questions.map(q => ({
        id: q.id,
        title: q.title,
        body: q.body,
        depth: q.depth,
        isHeavy: !!q.is_heavy,
        cooldownUntil: q.cooldown_until,
        cooldownReason: q.cooldown_reason,
        status: q.status,
        authorId: q.author_user_id,
        authorName: q.author_name,
        responseCount: q.response_count,
        hasVoice: q.voice_count > 0,
        hasTemplate: q.template_count > 0,
        hasDraft: q.draft_count > 0,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      })),
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('Get questions error:', err);
    res.status(500).json({ error: 'Failed to get questions' });
  }
});

// Get questions I asked (sent)
router.get('/sent', requireAuth, (req, res) => {
  try {
    const questions = db.prepare(`
      SELECT 
        q.*,
        u.display_name as target_name,
        (SELECT COUNT(*) FROM responses r WHERE r.question_id = q.id AND r.is_draft = 0) as response_count
      FROM questions q
      JOIN users u ON u.id = q.target_user_id
      WHERE q.author_user_id = ?
      ORDER BY q.created_at DESC
    `).all(req.session.userId);
    
    res.json({
      questions: questions.map(q => ({
        id: q.id,
        title: q.title,
        body: q.body,
        depth: q.depth,
        isHeavy: !!q.is_heavy,
        cooldownUntil: q.cooldown_until,
        status: q.status,
        targetName: q.target_name,
        responseCount: q.response_count,
        createdAt: q.created_at,
        updatedAt: q.updated_at,
      })),
    });
  } catch (err) {
    console.error('Get sent questions error:', err);
    res.status(500).json({ error: 'Failed to get sent questions' });
  }
});

// Get single question with history
router.get('/:id', requireAuth, (req, res) => {
  try {
    const question = db.prepare(`
      SELECT q.*, u.display_name as author_name
      FROM questions q
      JOIN users u ON u.id = q.author_user_id
      WHERE q.id = ? AND (q.target_user_id = ? OR q.author_user_id = ?)
    `).get(req.params.id, req.session.userId, req.session.userId);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Get question versions (edit history)
    const versions = db.prepare(`
      SELECT qv.*, u.display_name as editor_name
      FROM question_versions qv
      JOIN users u ON u.id = qv.edited_by_user_id
      WHERE qv.question_id = ?
      ORDER BY qv.created_at ASC
    `).all(question.id);
    
    // Get responses with their versions
    const responses = db.prepare(`
      SELECT r.*, u.display_name as author_name
      FROM responses r
      JOIN users u ON u.id = r.author_user_id
      WHERE r.question_id = ?
      ORDER BY r.created_at ASC
    `).all(question.id);
    
    res.json({
      question: {
        id: question.id,
        title: question.title,
        body: question.body,
        depth: question.depth,
        isHeavy: !!question.is_heavy,
        cooldownUntil: question.cooldown_until,
        cooldownReason: question.cooldown_reason,
        status: question.status,
        authorId: question.author_user_id,
        authorName: question.author_name,
        targetUserId: question.target_user_id,
        createdAt: question.created_at,
        updatedAt: question.updated_at,
        isOwner: question.author_user_id === req.session.userId,
        isTarget: question.target_user_id === req.session.userId,
      },
      versions: versions.map(v => ({
        id: v.id,
        title: v.title,
        body: v.body,
        editorName: v.editor_name,
        createdAt: v.created_at,
      })),
      responses: responses.map(r => ({
        id: r.id,
        type: r.response_type,
        bodyText: r.body_text,
        templateName: r.template_name,
        templateData: r.template_data ? JSON.parse(r.template_data) : null,
        voiceFilePath: r.voice_file_path,
        voiceDuration: r.voice_duration_seconds,
        isDraft: !!r.is_draft,
        answerBudget: r.answer_budget_minutes,
        authorId: r.author_user_id,
        authorName: r.author_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error('Get question error:', err);
    res.status(500).json({ error: 'Failed to get question' });
  }
});

// Create question
router.post('/', requireAuth, (req, res) => {
  try {
    const { title, body, depth = 'medium', isHeavy = false, cooldownHours } = req.body;
    
    if (!body || body.trim().length === 0) {
      return res.status(400).json({ error: 'Question body required' });
    }
    
    const targetUserId = getOtherUserId(db, req.session.userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'No recipient found' });
    }
    
    const questionId = uuidv4();
    const cooldownUntil = cooldownHours 
      ? new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString()
      : null;
    
    db.transaction(() => {
      // Insert question
      db.prepare(`
        INSERT INTO questions (id, author_user_id, target_user_id, title, body, depth, is_heavy, cooldown_until)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        questionId,
        req.session.userId,
        targetUserId,
        title?.trim() || null,
        body.trim(),
        depth,
        isHeavy ? 1 : 0,
        cooldownUntil
      );
      
      // Create initial version
      db.prepare(`
        INSERT INTO question_versions (id, question_id, title, body, edited_by_user_id)
        VALUES (?, ?, ?, ?, ?)
      `).run(uuidv4(), questionId, title?.trim() || null, body.trim(), req.session.userId);
      
      // Create event for notification
      createEvent(db, targetUserId, 'new_question', { questionId, isHeavy });
    })();
    
    res.status(201).json({ id: questionId });
  } catch (err) {
    console.error('Create question error:', err);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// Update question
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const { title, body, depth, isHeavy, cooldownHours, cooldownReason, status } = req.body;
    
    const question = db.prepare(`
      SELECT * FROM questions WHERE id = ?
    `).get(req.params.id);
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found' });
    }
    
    // Only author can edit content, target can change status/cooldown
    const isAuthor = question.author_user_id === req.session.userId;
    const isTarget = question.target_user_id === req.session.userId;
    
    if (!isAuthor && !isTarget) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const updates = [];
    const params = [];
    
    // Author can update content
    if (isAuthor) {
      if (title !== undefined) {
        updates.push('title = ?');
        params.push(title?.trim() || null);
      }
      if (body !== undefined) {
        updates.push('body = ?');
        params.push(body.trim());
      }
      if (depth !== undefined) {
        updates.push('depth = ?');
        params.push(depth);
      }
      if (isHeavy !== undefined) {
        updates.push('is_heavy = ?');
        params.push(isHeavy ? 1 : 0);
      }
    }
    
    // Target can update status and cooldown
    if (isTarget) {
      if (status !== undefined && ['new', 'holding', 'declined', 'active'].includes(status)) {
        updates.push('status = ?');
        params.push(status);
      }
      if (cooldownHours !== undefined) {
        const cooldownUntil = cooldownHours > 0
          ? new Date(Date.now() + cooldownHours * 60 * 60 * 1000).toISOString()
          : null;
        updates.push('cooldown_until = ?');
        params.push(cooldownUntil);
      }
      if (cooldownReason !== undefined) {
        updates.push('cooldown_reason = ?');
        params.push(cooldownReason?.trim() || null);
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    
    db.transaction(() => {
      db.prepare(`
        UPDATE questions SET ${updates.join(', ')} WHERE id = ?
      `).run(...params);
      
      // Create version if content changed
      if (isAuthor && (body !== undefined || title !== undefined)) {
        const updatedQuestion = db.prepare('SELECT title, body FROM questions WHERE id = ?').get(req.params.id);
        db.prepare(`
          INSERT INTO question_versions (id, question_id, title, body, edited_by_user_id)
          VALUES (?, ?, ?, ?, ?)
        `).run(uuidv4(), req.params.id, updatedQuestion.title, updatedQuestion.body, req.session.userId);
        
        // Notify target of edit if there are responses
        const hasResponses = db.prepare('SELECT COUNT(*) as count FROM responses WHERE question_id = ?').get(req.params.id);
        if (hasResponses.count > 0) {
          createEvent(db, question.target_user_id, 'question_edited', { questionId: req.params.id });
        }
      }
    })();
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update question error:', err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// Get stats/counts
router.get('/stats/summary', requireAuth, (req, res) => {
  try {
    const stats = {
      inbox: {
        total: 0,
        new: 0,
        holding: 0,
        heavy: 0,
        quickAvailable: 0,
      },
      sent: {
        total: 0,
        answered: 0,
        unanswered: 0,
      },
    };
    
    // Inbox stats
    const inboxStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN status = 'holding' THEN 1 ELSE 0 END) as holding_count,
        SUM(CASE WHEN is_heavy = 1 THEN 1 ELSE 0 END) as heavy_count,
        SUM(CASE WHEN depth = 'quick' AND is_heavy = 0 AND status = 'new' THEN 1 ELSE 0 END) as quick_available
      FROM questions
      WHERE target_user_id = ?
    `).get(req.session.userId);
    
    stats.inbox = {
      total: inboxStats.total,
      new: inboxStats.new_count,
      holding: inboxStats.holding_count,
      heavy: inboxStats.heavy_count,
      quickAvailable: inboxStats.quick_available,
    };
    
    // Sent stats
    const sentStats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN (SELECT COUNT(*) FROM responses r WHERE r.question_id = q.id AND r.is_draft = 0) > 0 THEN 1 ELSE 0 END) as answered
      FROM questions q
      WHERE author_user_id = ?
    `).get(req.session.userId);
    
    stats.sent = {
      total: sentStats.total,
      answered: sentStats.answered,
      unanswered: sentStats.total - sentStats.answered,
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;


