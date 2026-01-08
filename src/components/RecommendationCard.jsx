import { Link } from 'react-router-dom';
import { formatRelativeTime } from '../utils/api';

const TYPE_CONFIG = {
  link: { label: 'Link', icon: LinkIcon, color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  file: { label: 'File', icon: FileIcon, color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  youtube: { label: 'YouTube', icon: YouTubeIcon, color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  vimeo: { label: 'Vimeo', icon: VimeoIcon, color: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300' },
  tiktok: { label: 'TikTok', icon: TikTokIcon, color: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300' },
};

export default function RecommendationCard({ recommendation, showAuthor = true }) {
  const {
    id,
    type,
    url,
    fileName,
    fileType,
    fileSize,
    title,
    note,
    status,
    authorName,
    targetName,
    createdAt,
  } = recommendation;

  const config = TYPE_CONFIG[type] || TYPE_CONFIG.link;
  const TypeIcon = config.icon;
  
  // Generate display title
  const displayTitle = title || (type === 'file' ? fileName : url);
  
  // Format file size
  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  return (
    <Link
      to={`/recommendation/${id}`}
      className="block card p-4 hover:shadow-soft transition-shadow duration-150"
    >
      {/* Tags row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`tag ${config.color} flex items-center gap-1`}>
          <TypeIcon className="w-3 h-3" />
          {config.label}
        </span>
        
        {status === 'new' && (
          <span className="tag bg-sage-100 dark:bg-sage-900 text-sage-700 dark:text-sage-300">
            new
          </span>
        )}
        
        {type === 'file' && fileSize && (
          <span className="text-xs text-ink-400 dark:text-ink-500">
            {formatSize(fileSize)}
          </span>
        )}
      </div>
      
      {/* Title */}
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-ink-900 dark:text-sand-100 mb-1 truncate">
            {displayTitle}
          </h3>
          {note && (
            <p className="text-sm text-ink-600 dark:text-sand-400 line-clamp-2">
              {note}
            </p>
          )}
        </div>
        
        {/* Thumbnail for videos */}
        {(type === 'youtube' || type === 'vimeo') && (
          <div className="w-16 h-12 bg-sand-200 dark:bg-ink-700 rounded flex items-center justify-center flex-shrink-0">
            <PlayIcon className="w-6 h-6 text-ink-400 dark:text-ink-500" />
          </div>
        )}
      </div>
      
      {/* Meta row */}
      <div className="flex items-center justify-between mt-3 text-xs text-ink-500 dark:text-ink-400">
        <span>
          {showAuthor 
            ? `from ${authorName}` 
            : `to ${targetName}`
          }
        </span>
        <span>{formatRelativeTime(createdAt)}</span>
      </div>
    </Link>
  );
}

// Icons
function LinkIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function FileIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function YouTubeIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  );
}

function VimeoIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797l-.013.01z"/>
    </svg>
  );
}

function TikTokIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

function PlayIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

