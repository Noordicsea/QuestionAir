import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function SwipeMode() {
  const navigate = useNavigate();
  const { settings, toggleHeavyMode } = useAuth();
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showQuickAnswer, setShowQuickAnswer] = useState(false);
  const [quickAnswer, setQuickAnswer] = useState('');

  useEffect(() => {
    loadQueue();
  }, [settings?.heavyModeEnabled]);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const data = await api.get('/swipe', {
        includeHeavy: settings?.heavyModeEnabled ? 'true' : 'false',
      });
      setQueue(data.queue);
      setCurrentIndex(0);
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const addAllToQueue = async () => {
    setActionLoading(true);
    try {
      await api.post('/swipe/add-all', {
        includeHeavy: settings?.heavyModeEnabled,
      });
      await loadQueue();
    } catch (err) {
      console.error('Failed to add all:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSkip = async () => {
    if (!currentQuestion) return;
    setActionLoading(true);
    try {
      await api.post(`/swipe/skip/${currentQuestion.id}`);
      moveToNext();
    } catch (err) {
      console.error('Failed to skip:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHold = async () => {
    if (!currentQuestion) return;
    setActionLoading(true);
    try {
      await api.patch(`/questions/${currentQuestion.id}`, { status: 'holding' });
      await api.delete(`/swipe/${currentQuestion.id}`);
      removeFromQueue();
    } catch (err) {
      console.error('Failed to hold:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!currentQuestion) return;
    setActionLoading(true);
    try {
      await api.patch(`/questions/${currentQuestion.id}`, { status: 'declined' });
      await api.delete(`/swipe/${currentQuestion.id}`);
      removeFromQueue();
    } catch (err) {
      console.error('Failed to decline:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickAnswer = async () => {
    if (!currentQuestion || !quickAnswer.trim()) return;
    setActionLoading(true);
    try {
      await api.post('/responses', {
        questionId: currentQuestion.id,
        type: 'text_short',
        bodyText: quickAnswer.trim(),
      });
      await api.delete(`/swipe/${currentQuestion.id}`);
      setQuickAnswer('');
      setShowQuickAnswer(false);
      removeFromQueue();
    } catch (err) {
      console.error('Failed to answer:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const moveToNext = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadQueue();
    }
  };

  const removeFromQueue = () => {
    const newQueue = queue.filter((_, i) => i !== currentIndex);
    setQueue(newQueue);
    if (currentIndex >= newQueue.length && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentItem = queue[currentIndex];
  const currentQuestion = currentItem?.question;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sand-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-sand-200 safe-top">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link
            to="/"
            className="text-sm text-ink-600 hover:text-ink-800 flex items-center gap-1"
          >
            <ExitIcon className="w-4 h-4" />
            Exit
          </Link>
          
          <div className="text-center">
            <p className="text-sm font-medium text-ink-800">
              Swipe Mode
            </p>
            {queue.length > 0 && (
              <p className="text-xs text-ink-500">
                {currentIndex + 1} of {queue.length}
              </p>
            )}
          </div>
          
          <button
            onClick={toggleHeavyMode}
            className={`
              flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
              ${settings?.heavyModeEnabled
                ? 'bg-rust-100 text-rust-700'
                : 'bg-sand-200 text-ink-500'
              }
            `}
          >
            <HeavyIcon className="w-3.5 h-3.5" />
            Heavy
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {queue.length === 0 ? (
          <EmptyState
            icon={QueueEmptyIcon}
            title="Queue is empty"
            description="Add questions to your swipe queue to process them one at a time"
            action={
              <button
                onClick={addAllToQueue}
                disabled={actionLoading}
                className="btn btn-primary"
              >
                {actionLoading ? <Spinner size="sm" /> : 'Add all questions'}
              </button>
            }
          />
        ) : currentQuestion ? (
          <div className="w-full max-w-md">
            {/* Question card */}
            <div className="card p-5 mb-6">
              {/* Tags */}
              <div className="flex items-center gap-2 mb-3">
                <span className={`tag tag-${currentQuestion.depth}`}>
                  {currentQuestion.depth}
                </span>
                {currentQuestion.isHeavy && (
                  <span className="tag tag-heavy">heavy</span>
                )}
              </div>

              {/* Title */}
              {currentQuestion.title && (
                <h2 className="text-lg font-display font-medium text-ink-900 mb-2">
                  {currentQuestion.title}
                </h2>
              )}

              {/* Body */}
              <p className="text-ink-800 whitespace-pre-wrap">
                {currentQuestion.body}
              </p>

              {/* From */}
              <p className="text-xs text-ink-500 mt-4 pt-3 border-t border-sand-200">
                From {currentQuestion.authorName}
              </p>
            </div>

            {/* Quick answer input */}
            {showQuickAnswer && (
              <div className="card p-4 mb-4 animate-fade-in">
                <textarea
                  value={quickAnswer}
                  onChange={(e) => setQuickAnswer(e.target.value)}
                  placeholder="Quick answer..."
                  className="input min-h-[80px] resize-none mb-3"
                  autoFocus
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowQuickAnswer(false);
                      setQuickAnswer('');
                    }}
                    className="btn btn-ghost text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleQuickAnswer}
                    disabled={actionLoading || !quickAnswer.trim()}
                    className="btn btn-primary flex-1"
                  >
                    {actionLoading ? <Spinner size="sm" /> : 'Send'}
                  </button>
                </div>
              </div>
            )}

            {/* Actions */}
            {!showQuickAnswer && (
              <div className="grid grid-cols-4 gap-3">
                <button
                  onClick={handleDecline}
                  disabled={actionLoading}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white border border-sand-200 hover:border-rust-300 hover:bg-rust-50 transition-colors"
                >
                  <DeclineIcon className="w-5 h-5 text-rust-500" />
                  <span className="text-xs text-ink-600">Decline</span>
                </button>
                
                <button
                  onClick={handleHold}
                  disabled={actionLoading}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white border border-sand-200 hover:border-amber-300 hover:bg-amber-50 transition-colors"
                >
                  <HoldIcon className="w-5 h-5 text-amber-500" />
                  <span className="text-xs text-ink-600">Hold</span>
                </button>
                
                <button
                  onClick={handleSkip}
                  disabled={actionLoading}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-white border border-sand-200 hover:border-ink-300 hover:bg-sand-50 transition-colors"
                >
                  <SkipIcon className="w-5 h-5 text-ink-500" />
                  <span className="text-xs text-ink-600">Skip</span>
                </button>
                
                <button
                  onClick={() => setShowQuickAnswer(true)}
                  disabled={actionLoading}
                  className="flex flex-col items-center gap-1 p-3 rounded-lg bg-sage-500 text-white hover:bg-sage-600 transition-colors"
                >
                  <AnswerIcon className="w-5 h-5" />
                  <span className="text-xs">Answer</span>
                </button>
              </div>
            )}

            {/* Full answer link */}
            <Link
              to={`/question/${currentQuestion.id}`}
              className="block text-center text-sm text-ink-500 hover:text-ink-700 mt-4"
            >
              Open full view
            </Link>
          </div>
        ) : null}
      </main>

      {/* Progress bar */}
      {queue.length > 0 && (
        <div className="h-1 bg-sand-200 safe-bottom">
          <div
            className="h-full bg-sage-500 transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / queue.length) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Icons
function ExitIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
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

function DeclineIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function HoldIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function SkipIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" y1="5" x2="19" y2="19" />
    </svg>
  );
}

function AnswerIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function QueueEmptyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

