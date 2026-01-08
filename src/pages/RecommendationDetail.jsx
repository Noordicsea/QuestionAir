import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, formatDateTime, formatRelativeTime } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

// Video URL parsers (same as backend)
function parseYouTubeUrl(url) {
  if (!url) return null;
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
  if (!url) return null;
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

const TYPE_CONFIG = {
  link: { label: 'Link', color: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' },
  file: { label: 'File', color: 'bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300' },
  youtube: { label: 'YouTube', color: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300' },
  vimeo: { label: 'Vimeo', color: 'bg-cyan-100 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300' },
  tiktok: { label: 'TikTok', color: 'bg-pink-100 dark:bg-pink-900 text-pink-700 dark:text-pink-300' },
};

export default function RecommendationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [tiktokEmbed, setTiktokEmbed] = useState(null);

  useEffect(() => {
    loadRecommendation();
  }, [id]);

  const loadRecommendation = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/recommendations/${id}`);
      setRecommendation(data.recommendation);
      
      // Load TikTok embed if needed
      if (data.recommendation.type === 'tiktok' && data.recommendation.url) {
        loadTikTokEmbed(data.recommendation.url);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTikTokEmbed = async (url) => {
    try {
      // Use TikTok's oEmbed API via our proxy (if available)
      // For now, we'll display a link to open in TikTok
      // In production, you'd want to use TikTok's embed API
      setTiktokEmbed({ url });
    } catch (err) {
      console.error('Failed to load TikTok embed:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this recommendation?')) return;
    
    setDeleting(true);
    try {
      await api.delete(`/recommendations/${id}`);
      navigate('/');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

  if (!recommendation) return null;

  const config = TYPE_CONFIG[recommendation.type] || TYPE_CONFIG.link;
  const isOwner = recommendation.isOwner;
  const youtubeId = parseYouTubeUrl(recommendation.url);
  const vimeoId = parseVimeoUrl(recommendation.url);

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

      {/* Recommendation card */}
      <div className="card p-5 mb-4">
        {/* Tags */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`tag ${config.color}`}>
            {config.label}
          </span>
          {recommendation.status === 'new' && (
            <span className="tag bg-sage-100 dark:bg-sage-900 text-sage-700 dark:text-sage-300">
              new
            </span>
          )}
          {recommendation.type === 'file' && recommendation.fileSize && (
            <span className="text-xs text-ink-400 dark:text-ink-500">
              {formatFileSize(recommendation.fileSize)}
            </span>
          )}
        </div>

        {/* Title */}
        {recommendation.title && (
          <h1 className="text-xl font-display font-medium text-ink-900 dark:text-sand-100 mb-2">
            {recommendation.title}
          </h1>
        )}

        {/* Video embeds */}
        {recommendation.type === 'youtube' && youtubeId && (
          <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${youtubeId}`}
              title="YouTube video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {recommendation.type === 'vimeo' && vimeoId && (
          <div className="aspect-video mb-4 rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}?dnt=1`}
              title="Vimeo video"
              className="w-full h-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        {recommendation.type === 'tiktok' && recommendation.url && (
          <div className="mb-4">
            <div className="bg-sand-100 dark:bg-ink-800 rounded-lg p-6 text-center">
              <TikTokIcon className="w-12 h-12 mx-auto mb-3 text-ink-400 dark:text-ink-500" />
              <p className="text-sm text-ink-600 dark:text-sand-400 mb-4">
                TikTok videos open in a new tab for the best viewing experience
              </p>
              <a
                href={recommendation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                <ExternalIcon className="w-4 h-4" />
                Open in TikTok
              </a>
            </div>
          </div>
        )}

        {/* Link display */}
        {recommendation.type === 'link' && recommendation.url && (
          <div className="mb-4">
            <a
              href={recommendation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-sand-100 dark:bg-ink-800 rounded-lg hover:bg-sand-200 dark:hover:bg-ink-700 transition-colors group"
            >
              <LinkIcon className="w-8 h-8 text-ink-400 dark:text-ink-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-ink-800 dark:text-sand-200 font-medium truncate group-hover:text-sage-600 dark:group-hover:text-sage-400">
                  {recommendation.url}
                </p>
                <p className="text-xs text-ink-500 dark:text-sand-400 mt-0.5">
                  Click to open in new tab
                </p>
              </div>
              <ExternalIcon className="w-5 h-5 text-ink-400 dark:text-ink-500 flex-shrink-0" />
            </a>
          </div>
        )}

        {/* File download */}
        {recommendation.type === 'file' && (
          <div className="mb-4">
            <div className="flex items-center gap-3 p-4 bg-sand-100 dark:bg-ink-800 rounded-lg">
              <FileIcon className="w-8 h-8 text-ink-400 dark:text-ink-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-ink-800 dark:text-sand-200 font-medium truncate">
                  {recommendation.fileName}
                </p>
                <p className="text-xs text-ink-500 dark:text-sand-400 mt-0.5">
                  {recommendation.fileType} · {formatFileSize(recommendation.fileSize)}
                </p>
              </div>
              <a
                href={`/api/recommendations/download/${id}`}
                download={recommendation.fileName}
                className="btn btn-primary text-sm"
              >
                <DownloadIcon className="w-4 h-4" />
                Download
              </a>
            </div>
          </div>
        )}

        {/* Note */}
        {recommendation.note && (
          <div className="mt-4 pt-4 border-t border-sand-200 dark:border-ink-700">
            <p className="text-xs font-medium text-ink-500 dark:text-sand-500 mb-2">Note</p>
            <p className="text-ink-800 dark:text-sand-200 whitespace-pre-wrap">
              {recommendation.note}
            </p>
          </div>
        )}

        {/* Meta */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-sand-200 dark:border-ink-700 text-sm text-ink-500 dark:text-sand-400">
          <span>
            {isOwner ? 'You shared this' : `From ${recommendation.authorName}`}
          </span>
          <span>{formatRelativeTime(recommendation.createdAt)}</span>
        </div>
      </div>

      {/* Owner actions */}
      {isOwner && (
        <div className="card p-4">
          <p className="text-sm font-medium text-ink-700 dark:text-sand-300 mb-3">Actions</p>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="btn btn-ghost text-sm text-rust-600 dark:text-rust-400 hover:bg-rust-50 dark:hover:bg-rust-950"
          >
            {deleting ? <Spinner size="sm" /> : <DeleteIcon className="w-4 h-4" />}
            Delete recommendation
          </button>
        </div>
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

function ExternalIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function DownloadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function DeleteIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
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

