// Authentication middleware
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

export function getOtherUserId(db, currentUserId) {
  const otherUser = db.prepare(`
    SELECT id FROM users WHERE id != ?
  `).get(currentUserId);
  
  return otherUser?.id;
}



