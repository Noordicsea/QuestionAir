import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function AskQuestion() {
  const navigate = useNavigate();
  const { partner, settings } = useAuth();
  
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [depth, setDepth] = useState(settings?.defaultDepth || 'medium');
  const [isHeavy, setIsHeavy] = useState(false);
  const [cooldownHours, setCooldownHours] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const maxLength = depth === 'quick' && settings?.quickQuestionMaxLength 
    ? settings.quickQuestionMaxLength 
    : null;

  const handleSubmit = async (e) => {
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

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <h2 className="text-xl font-display font-medium text-ink-900 dark:text-sand-100 mb-1">
        Ask a question
      </h2>
      <p className="text-sm text-ink-500 dark:text-sand-400 mb-6">
        to {partner?.displayName || 'your partner'}
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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
    </div>
  );
}


