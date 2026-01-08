import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import db from '../db/connection.js';
import { requireAuth, getOtherUserId } from '../middleware/auth.js';
import { createEvent } from './push.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = join(__dirname, '..', '..', 'data', 'uploads');

// Ensure uploads directory exists
try {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
} catch (e) {
  // Directory exists
}

const router = Router();

// Security: Allowed MIME types whitelist
const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/markdown',
  // Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/mp4',
  // Video
  'video/mp4',
  'video/webm',
  'video/quicktime',
];

// Map extensions to MIME types for validation
const EXTENSION_MIME_MAP = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.webp': ['image/webp'],
  '.svg': ['image/svg+xml'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv', 'text/plain'],
  '.md': ['text/markdown', 'text/plain'],
  '.zip': ['application/zip'],
  '.rar': ['application/x-rar-compressed'],
  '.7z': ['application/x-7z-compressed'],
  '.mp3': ['audio/mpeg'],
  '.wav': ['audio/wav'],
  '.ogg': ['audio/ogg'],
  '.m4a': ['audio/mp4'],
  '.mp4': ['video/mp4'],
  '.webm': ['video/webm'],
  '.mov': ['video/quicktime'],
};

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with uuid to prevent path traversal
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter for security
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error('File type not allowed'), false);
  }
  
  // Check extension matches MIME type
  const ext = path.extname(file.originalname).toLowerCase();
  const allowedMimes = EXTENSION_MIME_MAP[ext];
  
  if (!allowedMimes || !allowedMimes.includes(file.mimetype)) {
    return cb(new Error('File extension does not match content type'), false);
  }
  
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

// Video URL parsers
function parseYouTubeUrl(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseVimeoUrl(url) {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseTikTokUrl(url) {
  const patterns = [
    /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
    /tiktok\.com\/t\/(\w+)/,
    /vm\.tiktok\.com\/(\w+)/,
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  // Return the full URL for TikTok as we'll use oEmbed
  if (url.includes('tiktok.com')) {
    return url;
  }
  return null;
}

function detectVideoType(url) {
  if (parseYouTubeUrl(url)) return 'youtube';
  if (parseVimeoUrl(url)) return 'vimeo';
  if (parseTikTokUrl(url)) return 'tiktok';
  return null;
}

// Get recommendations for current user (received)
router.get('/', requireAuth, (req, res) => {
  try {
    const { status, type, sort = 'newest', limit = 50, offset = 0 } = req.query;
    
    let whereClause = 'WHERE r.target_user_id = ?';
    const params = [req.session.userId];
    
    if (status && ['new', 'viewed'].includes(status)) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }
    
    if (type && ['link', 'file', 'youtube', 'vimeo', 'tiktok'].includes(type)) {
      whereClause += ' AND r.type = ?';
      params.push(type);
    }
    
    let orderBy = 'ORDER BY r.created_at DESC';
    if (sort === 'oldest') {
      orderBy = 'ORDER BY r.created_at ASC';
    }
    
    const recommendations = db.prepare(`
      SELECT 
        r.*,
        u.display_name as author_name
      FROM recommendations r
      JOIN users u ON u.id = r.author_user_id
      ${whereClause}
      ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, parseInt(limit), parseInt(offset));
    
    const countResult = db.prepare(`
      SELECT COUNT(*) as total FROM recommendations r ${whereClause}
    `).get(...params);
    
    res.json({
      recommendations: recommendations.map(r => ({
        id: r.id,
        type: r.type,
        url: r.url,
        fileName: r.file_name,
        fileType: r.file_type,
        fileSize: r.file_size,
        title: r.title,
        note: r.note,
        status: r.status,
        authorId: r.author_user_id,
        authorName: r.author_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
      total: countResult.total,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (err) {
    console.error('Get recommendations error:', err);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Get recommendations I sent
router.get('/sent', requireAuth, (req, res) => {
  try {
    const recommendations = db.prepare(`
      SELECT 
        r.*,
        u.display_name as target_name
      FROM recommendations r
      JOIN users u ON u.id = r.target_user_id
      WHERE r.author_user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.session.userId);
    
    res.json({
      recommendations: recommendations.map(r => ({
        id: r.id,
        type: r.type,
        url: r.url,
        fileName: r.file_name,
        fileType: r.file_type,
        fileSize: r.file_size,
        title: r.title,
        note: r.note,
        status: r.status,
        targetName: r.target_name,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      })),
    });
  } catch (err) {
    console.error('Get sent recommendations error:', err);
    res.status(500).json({ error: 'Failed to get sent recommendations' });
  }
});

// Get single recommendation
router.get('/:id', requireAuth, (req, res) => {
  try {
    const recommendation = db.prepare(`
      SELECT r.*, u.display_name as author_name
      FROM recommendations r
      JOIN users u ON u.id = r.author_user_id
      WHERE r.id = ? AND (r.target_user_id = ? OR r.author_user_id = ?)
    `).get(req.params.id, req.session.userId, req.session.userId);
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    // Mark as viewed if target user is viewing
    if (recommendation.target_user_id === req.session.userId && recommendation.status === 'new') {
      db.prepare(`
        UPDATE recommendations SET status = 'viewed', updated_at = datetime('now') WHERE id = ?
      `).run(req.params.id);
      recommendation.status = 'viewed';
    }
    
    res.json({
      recommendation: {
        id: recommendation.id,
        type: recommendation.type,
        url: recommendation.url,
        filePath: recommendation.file_path,
        fileName: recommendation.file_name,
        fileType: recommendation.file_type,
        fileSize: recommendation.file_size,
        title: recommendation.title,
        note: recommendation.note,
        status: recommendation.status,
        authorId: recommendation.author_user_id,
        authorName: recommendation.author_name,
        targetUserId: recommendation.target_user_id,
        isOwner: recommendation.author_user_id === req.session.userId,
        isTarget: recommendation.target_user_id === req.session.userId,
        createdAt: recommendation.created_at,
        updatedAt: recommendation.updated_at,
      },
    });
  } catch (err) {
    console.error('Get recommendation error:', err);
    res.status(500).json({ error: 'Failed to get recommendation' });
  }
});

// Create recommendation (link or video)
router.post('/', requireAuth, (req, res) => {
  try {
    const { type, url, title, note } = req.body;
    
    if (!type || !['link', 'youtube', 'vimeo', 'tiktok'].includes(type)) {
      return res.status(400).json({ error: 'Invalid recommendation type' });
    }
    
    if (!url || typeof url !== 'string' || url.trim().length === 0) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({ error: 'Invalid URL format' });
    }
    
    // Validate video URLs
    if (type === 'youtube' && !parseYouTubeUrl(url)) {
      return res.status(400).json({ error: 'Invalid YouTube URL' });
    }
    if (type === 'vimeo' && !parseVimeoUrl(url)) {
      return res.status(400).json({ error: 'Invalid Vimeo URL' });
    }
    if (type === 'tiktok' && !parseTikTokUrl(url)) {
      return res.status(400).json({ error: 'Invalid TikTok URL' });
    }
    
    const targetUserId = getOtherUserId(db, req.session.userId);
    if (!targetUserId) {
      return res.status(400).json({ error: 'No recipient found' });
    }
    
    const recommendationId = uuidv4();
    
    db.transaction(() => {
      db.prepare(`
        INSERT INTO recommendations (id, author_user_id, target_user_id, type, url, title, note)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        recommendationId,
        req.session.userId,
        targetUserId,
        type,
        url.trim(),
        title?.trim() || null,
        note?.trim() || null
      );
      
      createEvent(db, targetUserId, 'new_recommendation', { recommendationId, type });
    })();
    
    res.status(201).json({ id: recommendationId });
  } catch (err) {
    console.error('Create recommendation error:', err);
    res.status(500).json({ error: 'Failed to create recommendation' });
  }
});

// Create recommendation with file upload
router.post('/upload', requireAuth, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { title, note } = req.body;
    
    const targetUserId = getOtherUserId(db, req.session.userId);
    if (!targetUserId) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'No recipient found' });
    }
    
    const recommendationId = uuidv4();
    
    db.transaction(() => {
      db.prepare(`
        INSERT INTO recommendations (id, author_user_id, target_user_id, type, file_path, file_name, file_type, file_size, title, note)
        VALUES (?, ?, ?, 'file', ?, ?, ?, ?, ?, ?)
      `).run(
        recommendationId,
        req.session.userId,
        targetUserId,
        req.file.filename, // UUID-based filename for security
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        title?.trim() || null,
        note?.trim() || null
      );
      
      createEvent(db, targetUserId, 'new_recommendation', { recommendationId, type: 'file' });
    })();
    
    res.status(201).json({ id: recommendationId });
  } catch (err) {
    console.error('Upload recommendation error:', err);
    // Clean up uploaded file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to clean up file:', e);
      }
    }
    res.status(500).json({ error: 'Failed to upload recommendation' });
  }
});

// Download file (authenticated)
router.get('/download/:id', requireAuth, (req, res) => {
  try {
    const recommendation = db.prepare(`
      SELECT * FROM recommendations
      WHERE id = ? AND type = 'file' AND (target_user_id = ? OR author_user_id = ?)
    `).get(req.params.id, req.session.userId, req.session.userId);
    
    if (!recommendation) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = join(UPLOADS_DIR, recommendation.file_path);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    // Set content disposition for download
    res.setHeader('Content-Disposition', `attachment; filename="${recommendation.file_name}"`);
    res.setHeader('Content-Type', recommendation.file_type);
    
    res.sendFile(filePath);
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Delete recommendation
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const recommendation = db.prepare(`
      SELECT * FROM recommendations WHERE id = ? AND author_user_id = ?
    `).get(req.params.id, req.session.userId);
    
    if (!recommendation) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    // Delete file if it exists
    if (recommendation.file_path) {
      const filePath = join(UPLOADS_DIR, recommendation.file_path);
      try {
        fs.unlinkSync(filePath);
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    }
    
    db.prepare('DELETE FROM recommendations WHERE id = ?').run(req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Delete recommendation error:', err);
    res.status(500).json({ error: 'Failed to delete recommendation' });
  }
});

// Stats for recommendations
router.get('/stats/summary', requireAuth, (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count
      FROM recommendations
      WHERE target_user_id = ?
    `).get(req.session.userId);
    
    res.json({
      total: stats.total,
      new: stats.new_count,
    });
  } catch (err) {
    console.error('Get recommendation stats error:', err);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Helper to detect video type from URL
router.post('/detect-video', requireAuth, (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const videoType = detectVideoType(url);
    
    res.json({
      type: videoType,
      videoId: videoType === 'youtube' ? parseYouTubeUrl(url)
             : videoType === 'vimeo' ? parseVimeoUrl(url)
             : videoType === 'tiktok' ? parseTikTokUrl(url)
             : null,
    });
  } catch (err) {
    console.error('Detect video error:', err);
    res.status(500).json({ error: 'Failed to detect video type' });
  }
});

// Error handler for multer
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err.message === 'File type not allowed' || err.message === 'File extension does not match content type') {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

export default router;

