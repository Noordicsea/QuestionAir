import { useState, useEffect } from 'react';
import {
  isPushSupported,
  getNotificationPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
} from '../utils/push';
import Spinner from './Spinner';

export default function PushNotificationToggle({ enabled, onToggle }) {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setSupported(isPushSupported());
    setPermission(getNotificationPermission());
    setSubscribed(await isSubscribed());
  };

  const handleToggle = async () => {
    setLoading(true);
    setError(null);

    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
        onToggle?.(false);
      } else {
        await subscribeToPush();
        setSubscribed(true);
        onToggle?.(true);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setPermission(getNotificationPermission());
    }
  };

  if (!supported) {
    return (
      <div className="flex items-center justify-between opacity-60">
        <div>
          <span className="text-sm font-medium text-ink-800">Push notifications</span>
          <p className="text-xs text-ink-500">Not supported in this browser</p>
        </div>
        <input
          type="checkbox"
          disabled
          className="w-5 h-5 rounded border-sand-300 text-sage-600"
        />
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-ink-800">Push notifications</span>
          <p className="text-xs text-rust-600">
            Blocked - enable in browser settings
          </p>
        </div>
        <input
          type="checkbox"
          disabled
          className="w-5 h-5 rounded border-sand-300 text-sage-600"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center justify-between cursor-pointer">
        <div>
          <span className="text-sm font-medium text-ink-800">Push notifications</span>
          <p className="text-xs text-ink-500">
            {subscribed 
              ? 'You will receive push notifications' 
              : 'Get notified about new questions and responses'
            }
          </p>
        </div>
        {loading ? (
          <Spinner size="sm" />
        ) : (
          <input
            type="checkbox"
            checked={subscribed}
            onChange={handleToggle}
            className="w-5 h-5 rounded border-sand-300 text-sage-600 focus:ring-sage-500 cursor-pointer"
          />
        )}
      </label>
      
      {error && (
        <p className="text-xs text-rust-600 bg-rust-50 px-2 py-1 rounded">
          {error}
        </p>
      )}
    </div>
  );
}


