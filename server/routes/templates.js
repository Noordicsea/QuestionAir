import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Get all templates
router.get('/', requireAuth, (req, res) => {
  try {
    const templates = db.prepare(`
      SELECT id, name, description, fields, is_system, is_enabled
      FROM response_templates
      WHERE is_enabled = 1 OR created_by_user_id = ?
      ORDER BY is_system DESC, name ASC
    `).all(req.session.userId);
    
    res.json({
      templates: templates.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        fields: JSON.parse(t.fields),
        isSystem: !!t.is_system,
        isEnabled: !!t.is_enabled,
      })),
    });
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Create custom template
router.post('/', requireAuth, (req, res) => {
  try {
    const { name, description, fields } = req.body;
    
    if (!name || !fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({ error: 'Name and fields required' });
    }
    
    const templateId = uuidv4();
    
    db.prepare(`
      INSERT INTO response_templates (id, name, description, fields, is_system, created_by_user_id)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run(
      templateId,
      name.trim(),
      description?.trim() || null,
      JSON.stringify(fields),
      req.session.userId
    );
    
    res.status(201).json({ id: templateId });
  } catch (err) {
    console.error('Create template error:', err);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update template
router.patch('/:id', requireAuth, (req, res) => {
  try {
    const { name, description, fields, isEnabled } = req.body;
    
    const template = db.prepare(`
      SELECT * FROM response_templates WHERE id = ?
    `).get(req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Only creator can edit custom templates, anyone can enable/disable
    const isCreator = template.created_by_user_id === req.session.userId;
    
    const updates = [];
    const params = [];
    
    if (isEnabled !== undefined) {
      updates.push('is_enabled = ?');
      params.push(isEnabled ? 1 : 0);
    }
    
    // Only creator can update content of custom templates
    if (isCreator && !template.is_system) {
      if (name !== undefined) {
        updates.push('name = ?');
        params.push(name.trim());
      }
      if (description !== undefined) {
        updates.push('description = ?');
        params.push(description?.trim() || null);
      }
      if (fields !== undefined) {
        updates.push('fields = ?');
        params.push(JSON.stringify(fields));
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }
    
    params.push(req.params.id);
    
    db.prepare(`
      UPDATE response_templates SET ${updates.join(', ')} WHERE id = ?
    `).run(...params);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update template error:', err);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete custom template
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const template = db.prepare(`
      SELECT * FROM response_templates 
      WHERE id = ? AND is_system = 0 AND created_by_user_id = ?
    `).get(req.params.id, req.session.userId);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found or cannot be deleted' });
    }
    
    db.prepare('DELETE FROM response_templates WHERE id = ?').run(req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

export default router;

