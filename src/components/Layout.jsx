import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { api } from '../utils/api';

const navItems = [
  { path: '/', label: 'Inbox', icon: InboxIcon },
  { path: '/sent', label: 'Sent', icon: SentIcon },
  { path: '/ask', label: 'Share', icon: ShareIcon },
  { path: '/swipe', label: 'Swipe', icon: SwipeIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function Layout() {
  const { user, settings, toggleHeavyMode } = useAuth();
  const location = useLocation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, [location.pathname]);

  const loadStats = async () => {
    try {
      const data = await api.get('/questions/stats/summary');
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const isSwipeMode = location.pathname === '/swipe';

  return (
    <div className="min-h-screen bg-sand-100 dark:bg-ink-950 flex flex-col">
      {/* Header - hidden in swipe mode */}
      {!isSwipeMode && (
        <header className="bg-white dark:bg-ink-900 border-b border-sand-200 dark:border-ink-800 safe-top sticky top-0 z-40">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
            <h1 className="font-display text-xl font-medium text-ink-900 dark:text-sand-100">
              Questionair
            </h1>
            
            <div className="flex items-center gap-3">
              {/* Heavy mode toggle */}
              <button
                onClick={toggleHeavyMode}
                className={`
                  flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium
                  transition-colors duration-150
                  ${settings?.heavyModeEnabled 
                    ? 'bg-rust-100 dark:bg-rust-900 text-rust-700 dark:text-rust-300' 
                    : 'bg-sand-200 dark:bg-ink-800 text-ink-500 dark:text-ink-400 hover:bg-sand-300 dark:hover:bg-ink-700'
                  }
                `}
                title={settings?.heavyModeEnabled ? 'Heavy mode on' : 'Heavy mode off'}
              >
                <HeavyIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Heavy</span>
              </button>
              
              {/* User indicator */}
              <div className="w-8 h-8 rounded-full bg-sage-100 dark:bg-sage-900 flex items-center justify-center">
                <span className="text-sm font-medium text-sage-700 dark:text-sage-300">
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
            </div>
          </div>
        </header>
      )}
      
      {/* Main content */}
      <main className="flex-1 pb-20">
        <Outlet context={{ stats, refreshStats: loadStats }} />
      </main>
      
      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-ink-900 border-t border-sand-200 dark:border-ink-800 safe-bottom z-40">
        <div className="max-w-2xl mx-auto px-2">
          <div className="flex items-center justify-around h-16">
            {navItems.map(({ path, label, icon: Icon }) => {
              const isActive = path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(path);
              
              const badge = path === '/' && stats?.inbox?.new > 0 
                ? stats.inbox.new 
                : null;
              
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={`
                    flex flex-col items-center justify-center gap-0.5 
                    w-16 h-12 rounded-lg transition-colors duration-150
                    ${isActive 
                      ? 'text-ink-900 dark:text-sand-100' 
                      : 'text-ink-400 dark:text-ink-500 hover:text-ink-600 dark:hover:text-sand-300'
                    }
                  `}
                >
                  <div className="relative">
                    <Icon className="w-5 h-5" />
                    {badge && (
                      <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 flex items-center justify-center rounded-full bg-rust-500 text-white text-[10px] font-medium">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium">{label}</span>
                </NavLink>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}

// Icons - clean, simple SVGs
function InboxIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

function SentIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ShareIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Combined question mark and plus icon */}
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 1.5-2 2.5-3 2.5" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
      {/* Small plus indicator */}
      <circle cx="18" cy="6" r="4" fill="currentColor" stroke="none" />
      <line x1="18" y1="4" x2="18" y2="8" stroke="white" strokeWidth="1.5" />
      <line x1="16" y1="6" x2="20" y2="6" stroke="white" strokeWidth="1.5" />
    </svg>
  );
}

function SwipeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function SettingsIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function HeavyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}


