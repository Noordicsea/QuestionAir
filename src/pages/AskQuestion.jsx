import { useState, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

const RECOMMENDATION_TYPES = [
  { value: 'link', label: 'Link', icon: LinkIcon, desc: 'Website or article' },
  { value: 'file', label: 'File', icon: FileIcon, desc: 'Upload any file' },
  { value: 'youtube', label: 'YouTube', icon: YouTubeIcon, desc: 'YouTube video' },
  { value: 'vimeo', label: 'Vimeo', icon: VimeoIcon, desc: 'Vimeo video' },
  { value: 'tiktok', label: 'TikTok', icon: TikTokIcon, desc: 'TikTok video' },
];

export default function AskQuestion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { partner, settings } = useAuth();
  
  // Tab state - default to 'question' unless URL has ?tab=recommend
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') === 'recommend' ? 'recommend' : 'question');
  
  // Question form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [depth, setDepth] = useState(settings?.defaultDepth || 'medium');
  const [isHeavy, setIsHeavy] = useState(false);
  const [cooldownHours, setCooldownHours] = useState(0);
  
  // Recommendation form state
  const [recType, setRecType] = useState('link');
  const [recUrl, setRecUrl] = useState('');
  const [recTitle, setRecTitle] = useState('');
  const [recNote, setRecNote] = useState('');
  const [recFile, setRecFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const maxLength = depth === 'quick' && settings?.quickQuestionMaxLength 
    ? settings.quickQuestionMaxLength 
    : null;

  // Question submission
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    if (!body.trim()) {
      setError('Please write your question');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.post('/questions', {
        title: title.trim() || undefined,
        body: body.trim(),
        depth,
        isHeavy,
        cooldownHours: cooldownHours > 0 ? cooldownHours : undefined,
      });
      
      navigate(`/question/${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Recommendation submission
  const handleRecommendationSubmit = async (e) => {
    e.preventDefault();
    
    if (recType === 'file') {
      if (!recFile) {
        setError('Please select a file to upload');
        return;
      }
    } else {
      if (!recUrl.trim()) {
        setError('Please enter a URL');
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    
    try {
      let data;
      
      if (recType === 'file') {
        // File upload
        const formData = new FormData();
        formData.append('file', recFile);
        if (recTitle.trim()) formData.append('title', recTitle.trim());
        if (recNote.trim()) formData.append('note', recNote.trim());
        
        data = await api.upload('/recommendations/upload', formData, (progress) => {
          setUploadProgress(progress);
        });
      } else {
        // URL-based recommendation
        data = await api.post('/recommendations', {
          type: recType,
          url: recUrl.trim(),
          title: recTitle.trim() || undefined,
          note: recNote.trim() || undefined,
        });
      }
      
      navigate(`/recommendation/${data.id}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // File handling
  const handleFileSelect = useCallback((file) => {
    if (file) {
      // 50MB limit
      if (file.size > 50 * 1024 * 1024) {
        setError('File too large. Maximum size is 50MB.');
        return;
      }
      setRecFile(file);
      setError(null);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Reset form when switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setError(null);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Tab selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleTabChange('question')}
          className={`
            flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors
            ${activeTab === 'question'
              ? 'bg-sage-600 text-white'
              : 'bg-sand-200 dark:bg-ink-800 text-ink-600 dark:text-sand-300 hover:bg-sand-300 dark:hover:bg-ink-700'
            }
          `}
        >
          <QuestionIcon className="w-4 h-4 inline-block mr-2" />
          Ask a Question
        </button>
        <button
          onClick={() => handleTabChange('recommend')}
          className={`
            flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-colors
            ${activeTab === 'recommend'
              ? 'bg-sage-600 text-white'
              : 'bg-sand-200 dark:bg-ink-800 text-ink-600 dark:text-sand-300 hover:bg-sand-300 dark:hover:bg-ink-700'
            }
          `}
        >
          <GiftIcon className="w-4 h-4 inline-block mr-2" />
          Recommend
        </button>
      </div>

      {/* Subtitle */}
      <p className="text-sm text-ink-500 dark:text-sand-400 mb-6">
        to {partner?.displayName || 'your partner'}
      </p>

      {activeTab === 'question' ? (
        // Question Form
        <form onSubmit={handleQuestionSubmit} className="space-y-6">
          {/* Question settings panel */}
          <div className="card p-4">
            <p className="text-sm font-medium text-ink-700 dark:text-sand-300 mb-3">
              What kind of question is this?
            </p>
            
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { value: 'quick', label: 'Quick', desc: 'Fast response' },
                { value: 'medium', label: 'Medium', desc: 'Some thought' },
                { value: 'deep', label: 'Deep', desc: 'Needs time' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDepth(opt.value)}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-colors
                    ${depth === opt.value 
                      ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/50' 
                      : 'border-sand-200 dark:border-ink-700 hover:border-sand-300 dark:hover:border-ink-600'
                    }
                  `}
                >
                  <span className="block text-sm font-medium text-ink-800 dark:text-sand-200">
                    {opt.label}
                  </span>
                  <span className="block text-xs text-ink-500 dark:text-sand-400">
                    {opt.desc}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Heavy toggle */}
            <label className="flex items-start gap-3 p-3 rounded-lg border border-sand-200 dark:border-ink-700 cursor-pointer hover:bg-sand-50 dark:hover:bg-ink-800">
              <input
                type="checkbox"
                checked={isHeavy}
                onChange={(e) => setIsHeavy(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-sand-300 dark:border-ink-600 text-rust-600 focus:ring-rust-500"
              />
              <div>
                <span className="block text-sm font-medium text-ink-800 dark:text-sand-200">
                  Mark as heavy
                </span>
                <span className="block text-xs text-ink-500 dark:text-sand-400">
                  Will be hidden unless Heavy Mode is on
                </span>
              </div>
            </label>
            
            {/* Cooldown suggestion */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-ink-600 dark:text-sand-400 mb-1">
                Suggest cooldown (optional)
              </label>
              <select
                value={cooldownHours}
                onChange={(e) => setCooldownHours(Number(e.target.value))}
                className="input text-sm"
              >
                <option value={0}>No cooldown</option>
                <option value={2}>2 hours</option>
                <option value={12}>12 hours</option>
                <option value={24}>24 hours</option>
                <option value={48}>2 days</option>
              </select>
            </div>
          </div>
          
          {/* Title (optional) */}
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              Title <span className="text-ink-400 dark:text-ink-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
              placeholder="A short summary..."
              maxLength={200}
            />
          </div>
          
          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-ink-700 dark:text-sand-300">
                Your question
              </label>
              {maxLength && (
                <span className={`text-xs ${body.length > maxLength ? 'text-rust-600 dark:text-rust-400' : 'text-ink-400 dark:text-ink-500'}`}>
                  {body.length}/{maxLength}
                </span>
              )}
            </div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className={`input min-h-[160px] resize-y ${maxLength && body.length > maxLength ? 'input-error' : ''}`}
              placeholder="What would you like to ask?"
              maxLength={maxLength || undefined}
            />
            {depth === 'quick' && (
              <p className="text-xs text-ink-400 dark:text-sand-500 mt-1">
                Quick questions work best when they're focused and specific
              </p>
            )}
          </div>
          
          {error && (
            <p className="text-sm text-rust-600 dark:text-rust-400 bg-rust-50 dark:bg-rust-950 px-3 py-2 rounded">
              {error}
            </p>
          )}
          
          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !body.trim() || (maxLength && body.length > maxLength)}
              className="btn btn-primary flex-1"
            >
              {loading ? <Spinner size="sm" /> : 'Send question'}
            </button>
          </div>
        </form>
      ) : (
        // Recommendation Form
        <form onSubmit={handleRecommendationSubmit} className="space-y-6">
          {/* Type selector */}
          <div className="card p-4">
            <p className="text-sm font-medium text-ink-700 dark:text-sand-300 mb-3">
              What are you recommending?
            </p>
            
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {RECOMMENDATION_TYPES.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => {
                    setRecType(type.value);
                    setRecUrl('');
                    setRecFile(null);
                    setError(null);
                  }}
                  className={`
                    p-3 rounded-lg border-2 text-center transition-colors
                    ${recType === type.value 
                      ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/50' 
                      : 'border-sand-200 dark:border-ink-700 hover:border-sand-300 dark:hover:border-ink-600'
                    }
                  `}
                >
                  <type.icon className={`w-5 h-5 mx-auto mb-1 ${recType === type.value ? 'text-sage-600 dark:text-sage-400' : 'text-ink-500 dark:text-sand-400'}`} />
                  <span className="block text-xs font-medium text-ink-800 dark:text-sand-200">
                    {type.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Content input based on type */}
          {recType === 'file' ? (
            // File upload zone
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-2">
                Upload file
              </label>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragging 
                    ? 'border-sage-500 bg-sage-50 dark:bg-sage-900/30' 
                    : 'border-sand-300 dark:border-ink-600 hover:border-sage-400 dark:hover:border-sage-600'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
                {recFile ? (
                  <div className="space-y-2">
                    <FileIcon className="w-10 h-10 mx-auto text-sage-600 dark:text-sage-400" />
                    <p className="text-sm font-medium text-ink-800 dark:text-sand-200">
                      {recFile.name}
                    </p>
                    <p className="text-xs text-ink-500 dark:text-sand-400">
                      {formatFileSize(recFile.size)}
                    </p>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRecFile(null);
                      }}
                      className="text-xs text-rust-600 dark:text-rust-400 hover:underline"
                    >
                      Remove file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <UploadIcon className="w-10 h-10 mx-auto text-ink-400 dark:text-ink-500" />
                    <p className="text-sm text-ink-600 dark:text-sand-300">
                      Drop a file here or click to browse
                    </p>
                    <p className="text-xs text-ink-400 dark:text-ink-500">
                      Max file size: 50MB
                    </p>
                  </div>
                )}
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mt-2">
                  <div className="h-2 bg-sand-200 dark:bg-ink-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-sage-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-ink-500 dark:text-sand-400 mt-1">
                    Uploading... {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
          ) : (
            // URL input
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
                {recType === 'link' ? 'URL' : `${RECOMMENDATION_TYPES.find(t => t.value === recType)?.label} URL`}
              </label>
              <input
                type="url"
                value={recUrl}
                onChange={(e) => setRecUrl(e.target.value)}
                className="input"
                placeholder={
                  recType === 'youtube' ? 'https://youtube.com/watch?v=...' :
                  recType === 'vimeo' ? 'https://vimeo.com/...' :
                  recType === 'tiktok' ? 'https://tiktok.com/@user/video/...' :
                  'https://...'
                }
              />
              {recType === 'youtube' && (
                <p className="text-xs text-ink-400 dark:text-sand-500 mt-1">
                  Supports youtube.com, youtu.be, and YouTube Shorts links
                </p>
              )}
            </div>
          )}

          {/* Title (optional) */}
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              Title <span className="text-ink-400 dark:text-ink-500 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={recTitle}
              onChange={(e) => setRecTitle(e.target.value)}
              className="input"
              placeholder="Give it a name..."
              maxLength={200}
            />
          </div>

          {/* Note (optional) */}
          <div>
            <label className="block text-sm font-medium text-ink-700 dark:text-sand-300 mb-1">
              Note <span className="text-ink-400 dark:text-ink-500 font-normal">(optional)</span>
            </label>
            <textarea
              value={recNote}
              onChange={(e) => setRecNote(e.target.value)}
              className="input min-h-[100px] resize-y"
              placeholder="Why are you recommending this?"
              maxLength={1000}
            />
          </div>

          {error && (
            <p className="text-sm text-rust-600 dark:text-rust-400 bg-rust-50 dark:bg-rust-950 px-3 py-2 rounded">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-ghost"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || (recType === 'file' ? !recFile : !recUrl.trim())}
              className="btn btn-primary flex-1"
            >
              {loading ? <Spinner size="sm" /> : 'Send recommendation'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// Icons
function QuestionIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function GiftIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 12 20 22 4 22 4 12" />
      <rect x="2" y="7" width="20" height="5" />
      <line x1="12" y1="22" x2="12" y2="7" />
      <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
      <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
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

function UploadIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
