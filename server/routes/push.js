import { Router } from 'express';
import webpush from 'web-push';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/connection.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Generate VAPID keys if not set (in production, use env vars)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls';

webpush.setVapidDetails(
  'mailto:admin@questionair.local',
  vapidPublicKey,
  vapidPrivateKey
);

// Get VAPID public key
router.get('/vapid-key', requireAuth, (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

// Subscribe to push notifications
router.post('/subscribe', requireAuth, (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }
    
    const { endpoint, keys } = subscription;
    
    if (!keys || !keys.p256dh || !keys.auth) {
      return res.status(400).json({ error: 'Invalid subscription keys' });
    }
    
    // Remove any existing subscription with same endpoint
    db.prepare(`
      DELETE FROM push_subscriptions WHERE endpoint = ?
    `).run(endpoint);
    
    // Add new subscription
    db.prepare(`
      INSERT INTO push_subscriptions (id, user_id, endpoint, p256dh, auth)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), req.session.userId, endpoint, keys.p256dh, keys.auth);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Failed to subscribe' });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', requireAuth, (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (endpoint) {
      db.prepare(`
        DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?
      `).run(req.session.userId, endpoint);
    } else {
      // Remove all subscriptions for user
      db.prepare(`
        DELETE FROM push_subscriptions WHERE user_id = ?
      `).run(req.session.userId);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Unsubscribe error:', err);
    res.status(500).json({ error: 'Failed to unsubscribe' });
  }
});

// Get unseen events/notifications
router.get('/events', requireAuth, (req, res) => {
  try {
    const events = db.prepare(`
      SELECT id, event_type, payload, created_at
      FROM events
      WHERE user_id = ? AND seen_at IS NULL
      ORDER BY created_at DESC
      LIMIT 50
    `).all(req.session.userId);
    
    res.json({
      events: events.map(e => ({
        id: e.id,
        type: e.event_type,
        payload: e.payload ? JSON.parse(e.payload) : null,
        createdAt: e.created_at,
      })),
    });
  } catch (err) {
    console.error('Get events error:', err);
    res.status(500).json({ error: 'Failed to get events' });
  }
});

// Mark events as seen
router.post('/events/seen', requireAuth, (req, res) => {
  try {
    const { eventIds } = req.body;
    
    if (!eventIds || !Array.isArray(eventIds)) {
      return res.status(400).json({ error: 'Event IDs required' });
    }
    
    const placeholders = eventIds.map(() => '?').join(',');
    db.prepare(`
      UPDATE events 
      SET seen_at = datetime('now')
      WHERE id IN (${placeholders}) AND user_id = ?
    `).run(...eventIds, req.session.userId);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Mark events seen error:', err);
    res.status(500).json({ error: 'Failed to mark events seen' });
  }
});

// Helper function to create event and send push notification
export function createEvent(db, userId, eventType, payload) {
  const eventId = uuidv4();
  
  db.prepare(`
    INSERT INTO events (id, user_id, event_type, payload)
    VALUES (?, ?, ?, ?)
  `).run(eventId, userId, eventType, JSON.stringify(payload));
  
  // Check quiet hours
  const settings = db.prepare(`
    SELECT quiet_hours_start, quiet_hours_end, notifications_enabled
    FROM user_settings WHERE user_id = ?
  `).get(userId);
  
  if (!settings?.notifications_enabled) {
    return;
  }
  
  // Simple quiet hours check
  if (settings.quiet_hours_start && settings.quiet_hours_end) {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    const start = settings.quiet_hours_start;
    const end = settings.quiet_hours_end;
    
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      if (currentTime >= start || currentTime < end) {
        return; // In quiet hours
      }
    } else {
      if (currentTime >= start && currentTime < end) {
        return; // In quiet hours
      }
    }
  }
  
  // Get all subscriptions for user
  const subscriptions = db.prepare(`
    SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = ?
  `).all(userId);
  
  // Build notification
  let title = 'Questionair';
  let body = 'You have a new notification';
  
  switch (eventType) {
    case 'new_question':
      title = payload.isHeavy ? 'New heavy question' : 'New question';
      body = 'Someone asked you something';
      break;
    case 'new_response':
      title = 'New response';
      body = payload.isVoice ? 'You received a voice note' : 'Your question was answered';
      break;
    case 'question_edited':
      title = 'Question edited';
      body = 'A question you answered was updated';
      break;
    case 'cooldown_expired':
      title = 'Ready to revisit';
      body = 'A held question is ready for you';
      break;
  }
  
  const pushPayload = JSON.stringify({
    title,
    body,
    icon: '/favicon.svg',
    badge: '/badge.png',
    data: { eventId, eventType, ...payload },
  });
  
  // Send to all subscriptions
  for (const sub of subscriptions) {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: {
        p256dh: sub.p256dh,
        auth: sub.auth,
      },
    };
    
    webpush.sendNotification(pushSubscription, pushPayload).catch((err) => {
      console.error('Push notification failed:', err);
      
      // Remove invalid subscriptions
      if (err.statusCode === 404 || err.statusCode === 410) {
        db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(sub.endpoint);
      }
    });
  }
}

export default router;


