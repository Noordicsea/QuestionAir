// Service Worker for Questionair Push Notifications

const CACHE_NAME = 'questionair-v1';

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Push event - handle incoming push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/favicon.svg',
      badge: data.badge || '/badge.png',
      vibrate: [100, 50, 100],
      data: data.data || {},
      actions: getActionsForType(data.data?.eventType),
      tag: data.data?.eventType || 'default',
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Questionair', options)
    );
  } catch (err) {
    console.error('Push event error:', err);
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let url = '/';

  // Navigate based on notification type
  if (data.questionId) {
    url = `/question/${data.questionId}`;
  } else if (data.eventType === 'new_question') {
    url = '/';
  }

  // Handle action clicks
  if (event.action === 'view') {
    url = data.questionId ? `/question/${data.questionId}` : '/';
  } else if (event.action === 'swipe') {
    url = '/swipe';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If there's an open window, focus it and navigate
        for (const client of clientList) {
          if ('focus' in client) {
            client.focus();
            client.postMessage({ type: 'navigate', url });
            return;
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Get notification actions based on event type
function getActionsForType(eventType) {
  switch (eventType) {
    case 'new_question':
      return [
        { action: 'view', title: 'View' },
        { action: 'swipe', title: 'Swipe mode' },
      ];
    case 'new_response':
      return [
        { action: 'view', title: 'View' },
      ];
    default:
      return [
        { action: 'view', title: 'Open' },
      ];
  }
}


