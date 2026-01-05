import { Link } from 'react-router-dom';
import { formatRelativeTime } from '../utils/api';

export default function QuestionCard({ question, showAuthor = true }) {
  const {
    id,
    title,
    body,
    depth,
    isHeavy,
    cooldownUntil,
    status,
    authorName,
    targetName,
    responseCount,
    hasVoice,
    hasTemplate,
    hasDraft,
    createdAt,
  } = question;

  const isOnCooldown = cooldownUntil && new Date(cooldownUntil) > new Date();
  
  return (
    <Link
      to={`/question/${id}`}
      className="block card p-4 hover:shadow-soft transition-shadow duration-150"
    >
      {/* Tags row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`tag tag-${depth}`}>
          {depth}
        </span>
        
        {isHeavy && (
          <span className="tag tag-heavy">
            heavy
          </span>
        )}
        
        {status !== 'new' && status !== 'active' && (
          <span className="tag tag-status">
            {status}
          </span>
        )}
        
        {hasDraft && (
          <span className="tag bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
            draft
          </span>
        )}
        
        {isOnCooldown && (
          <span className="tag bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
            cooldown
          </span>
        )}
        
        {hasVoice && (
          <VoiceIcon className="w-4 h-4 text-ink-400 dark:text-ink-500" />
        )}
        
        {hasTemplate && (
          <TemplateIcon className="w-4 h-4 text-ink-400 dark:text-ink-500" />
        )}
      </div>
      
      {/* Title/Body */}
      {title ? (
        <>
          <h3 className="font-medium text-ink-900 dark:text-sand-100 mb-1 line-clamp-2">
            {title}
          </h3>
          <p className="text-sm text-ink-600 dark:text-sand-400 line-clamp-2">
            {body}
          </p>
        </>
      ) : (
        <p className="text-ink-800 dark:text-sand-200 line-clamp-3">
          {body}
        </p>
      )}
      
      {/* Meta row */}
      <div className="flex items-center justify-between mt-3 text-xs text-ink-500 dark:text-ink-400">
        <span>
          {showAuthor 
            ? `from ${authorName}` 
            : `to ${targetName}`
          }
        </span>
        
        <div className="flex items-center gap-3">
          {responseCount > 0 && (
            <span className="flex items-center gap-1">
              <ResponseIcon className="w-3.5 h-3.5" />
              {responseCount}
            </span>
          )}
          <span>{formatRelativeTime(createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

function VoiceIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function TemplateIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

function ResponseIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}


