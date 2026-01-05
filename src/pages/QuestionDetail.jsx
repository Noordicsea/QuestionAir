import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatDateTime, formatRelativeTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import ResponseComposer from '../components/ResponseComposer';

export default function QuestionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [question, setQuestion] = useState(null);
  const [versions, setVersions] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showVersions, setShowVersions] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => {
    loadQuestion();
  }, [id]);

  const loadQuestion = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/questions/${id}`);
      setQuestion(data.question);
      setVersions(data.versions);
      setResponses(data.responses);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (status) => {
    setStatusLoading(true);
    try {
      await api.patch(`/questions/${id}`, { status });
      setQuestion(prev => ({ ...prev, status }));
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const setCooldown = async (hours, reason = '') => {
    setStatusLoading(true);
    try {
      await api.patch(`/questions/${id}`, { 
        cooldownHours: hours,
        cooldownReason: reason,
        status: 'holding',
      });
      setQuestion(prev => ({
        ...prev,
        status: 'holding',
        cooldownUntil: hours > 0 
          ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
          : null,
        cooldownReason: reason,
      }));
    } catch (err) {
      console.error('Failed to set cooldown:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  const addToSwipeQueue = async () => {
    try {
      await api.post('/swipe/add', { questionId: id });
      navigate('/swipe');
    } catch (err) {
      console.error('Failed to add to queue:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="card p-4 bg-rust-50 dark:bg-rust-950 text-rust-700 dark:text-rust-300">
          <p>{error}</p>
          <button onClick={() => navigate(-1)} className="text-sm underline mt-2">
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!question) return null;

  const isTarget = question.isTarget;
  const isOwner = question.isOwner;
  const canRespond = isTarget;
  const canEdit = isOwner;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-ink-500 dark:text-sand-400 hover:text-ink-700 dark:hover:text-sand-200 mb-4"
      >
        <BackIcon className="w-4 h-4" />
        Back
      </button>

      {/* Question card */}
      <div className="card p-5 mb-4">
        {/* Tags */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`tag tag-${question.depth}`}>
            {question.depth}
          </span>
          {question.isHeavy && (
            <span className="tag tag-heavy">heavy</span>
          )}
          <span className="tag tag-status">{question.status}</span>
          {question.cooldownUntil && new Date(question.cooldownUntil) > new Date() && (
            <span className="tag bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              cooldown until {formatDateTime(question.cooldownUntil)}
            </span>
          )}
        </div>

        {/* Title */}
        {question.title && (
          <h1 className="text-xl font-display font-medium text-ink-900 dark:text-sand-100 mb-2">
            {question.title}
          </h1>
        )}

        {/* Body */}
        <p className="text-ink-800 dark:text-sand-200 whitespace-pre-wrap">
          {question.body}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-sand-200 dark:border-ink-700 text-sm text-ink-500 dark:text-sand-400">
          <span>
            {isOwner ? 'You asked this' : `From ${question.authorName}`}
          </span>
          <span>{formatRelativeTime(question.createdAt)}</span>
        </div>

        {/* Version history toggle */}
        {versions.length > 1 && (
          <button
            onClick={() => setShowVersions(!showVersions)}
            className="text-xs text-ink-400 dark:text-sand-500 hover:text-ink-600 dark:hover:text-sand-300 mt-2"
          >
            {showVersions ? 'Hide' : 'Show'} edit history ({versions.length} versions)
          </button>
        )}

        {showVersions && (
          <div className="mt-3 space-y-2 animate-fade-in">
            {versions.map((v, i) => (
              <div key={v.id} className="p-3 bg-sand-50 dark:bg-ink-800 rounded text-sm">
                <div className="flex items-center justify-between text-xs text-ink-400 dark:text-sand-500 mb-1">
                  <span>Version {i + 1}</span>
                  <span>{formatDateTime(v.createdAt)}</span>
                </div>
                {v.title && (
                  <p className="font-medium text-ink-700 dark:text-sand-300 mb-1">{v.title}</p>
                )}
                <p className="text-ink-600 dark:text-sand-400 line-clamp-3">{v.body}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Target actions */}
      {isTarget && question.status !== 'declined' && (
        <div className="card p-4 mb-4">
          <p className="text-sm font-medium text-ink-700 dark:text-sand-300 mb-3">Actions</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => updateStatus('holding')}
              disabled={statusLoading || question.status === 'holding'}
              className="btn btn-ghost text-sm"
            >
              <HoldIcon className="w-4 h-4" />
              Hold
            </button>
            <button
              onClick={() => setCooldown(24, '')}
              disabled={statusLoading}
              className="btn btn-ghost text-sm"
            >
              <ClockIcon className="w-4 h-4" />
              Cooldown 24h
            </button>
            <button
              onClick={addToSwipeQueue}
              className="btn btn-ghost text-sm"
            >
              <SwipeIcon className="w-4 h-4" />
              Add to swipe
            </button>
            <button
              onClick={() => updateStatus('declined')}
              disabled={statusLoading}
              className="btn btn-ghost text-sm text-rust-600 dark:text-rust-400 hover:bg-rust-50 dark:hover:bg-rust-950"
            >
              <DeclineIcon className="w-4 h-4" />
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Responses */}
      {responses.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-medium text-ink-700 dark:text-sand-300 mb-3">
            Responses ({responses.length})
          </h2>
          <div className="space-y-3">
            {responses.map(r => (
              <ResponseCard key={r.id} response={r} currentUserId={user?.id} />
            ))}
          </div>
        </div>
      )}

      {/* Response composer */}
      {canRespond && question.status !== 'declined' && (
        <ResponseComposer
          questionId={id}
          onResponseCreated={loadQuestion}
          existingDraft={responses.find(r => r.isDraft && r.authorId === user?.id)}
        />
      )}

      {/* Declined state */}
      {question.status === 'declined' && isTarget && (
        <div className="card p-4 bg-sand-50 dark:bg-ink-800 text-center">
          <p className="text-ink-600 dark:text-sand-400 mb-2">You declined this question</p>
          <button
            onClick={() => updateStatus('active')}
            className="btn btn-secondary text-sm"
            disabled={statusLoading}
          >
            Reopen and answer
          </button>
        </div>
      )}
    </div>
  );
}

function ResponseCard({ response, currentUserId }) {
  const isOwn = response.authorId === currentUserId;
  
  return (
    <div className={`card p-4 ${response.isDraft ? 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950' : ''}`}>
      {response.isDraft && (
        <span className="tag bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 mb-2">Draft</span>
      )}
      
      <div className="flex items-center gap-2 text-xs text-ink-500 dark:text-sand-500 mb-2">
        <span className="font-medium text-ink-700 dark:text-sand-300">
          {isOwn ? 'You' : response.authorName}
        </span>
        <span>·</span>
        <span>{response.type.replace('_', ' ')}</span>
        <span>·</span>
        <span>{formatRelativeTime(response.createdAt)}</span>
      </div>
      
      {response.type === 'quick_reaction' && (
        <p className="text-ink-700 dark:text-sand-300 font-medium">{response.bodyText}</p>
      )}
      
      {(response.type === 'text_short' || response.type === 'text_long') && (
        <p className="text-ink-800 dark:text-sand-200 whitespace-pre-wrap">{response.bodyText}</p>
      )}
      
      {response.type === 'template' && response.templateData && (
        <div className="space-y-3">
          <p className="text-xs text-ink-500 dark:text-sand-500 font-medium">{response.templateName}</p>
          {Object.entries(response.templateData).map(([key, value]) => (
            <div key={key}>
              <p className="text-xs text-ink-500 dark:text-sand-500 mb-0.5">{key}</p>
              <p className="text-ink-800 dark:text-sand-200">{value}</p>
            </div>
          ))}
        </div>
      )}
      
      {response.type === 'voice' && response.voiceFilePath && (
        <audio
          controls
          src={`/api/voice/${response.voiceFilePath}`}
          className="w-full mt-2"
        />
      )}
    </div>
  );
}

// Icons
function BackIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
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

function ClockIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
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

function DeclineIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}


