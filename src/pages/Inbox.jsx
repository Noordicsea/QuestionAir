import { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import QuestionCard from '../components/QuestionCard';
import RecommendationCard from '../components/RecommendationCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const CONTENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'questions', label: 'Questions' },
  { value: 'recommendations', label: 'Recommendations' },
];

const DEPTH_OPTIONS = [
  { value: '', label: 'All depths' },
  { value: 'quick', label: 'Quick' },
  { value: 'medium', label: 'Medium' },
  { value: 'deep', label: 'Deep' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'new', label: 'New' },
  { value: 'holding', label: 'Holding' },
  { value: 'active', label: 'Answered' },
  { value: 'declined', label: 'Declined' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'needs_attention', label: 'Needs attention' },
  { value: 'random', label: 'Random' },
];

export default function Inbox() {
  const { settings } = useAuth();
  const { stats, refreshStats } = useOutletContext();
  const [questions, setQuestions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Content type filter
  const [contentType, setContentType] = useState('all');
  
  // Filters (for questions)
  const [depth, setDepth] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [showHeavy, setShowHeavy] = useState(settings?.heavyModeEnabled ? 'true' : 'false');
  const [showFilters, setShowFilters] = useState(false);
  
  // Recommendation stats
  const [recStats, setRecStats] = useState(null);

  useEffect(() => {
    loadContent();
  }, [depth, status, sort, showHeavy, contentType]);

  // Update showHeavy when settings change
  useEffect(() => {
    setShowHeavy(settings?.heavyModeEnabled ? 'true' : 'false');
  }, [settings?.heavyModeEnabled]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const promises = [];
      
      // Load questions if needed
      if (contentType === 'all' || contentType === 'questions') {
        promises.push(
          api.get('/questions', {
            depth: depth || undefined,
            status: status || undefined,
            sort,
            showHeavy,
          })
        );
      } else {
        promises.push(Promise.resolve({ questions: [] }));
      }
      
      // Load recommendations if needed
      if (contentType === 'all' || contentType === 'recommendations') {
        promises.push(api.get('/recommendations'));
        promises.push(api.get('/recommendations/stats/summary'));
      } else {
        promises.push(Promise.resolve({ recommendations: [] }));
        promises.push(Promise.resolve({ total: 0, new: 0 }));
      }
      
      const [questionsData, recsData, recStatsData] = await Promise.all(promises);
      
      setQuestions(questionsData.questions);
      setRecommendations(recsData.recommendations);
      setRecStats(recStatsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getRandomLight = () => {
    setContentType('questions');
    setDepth('quick');
    setShowHeavy('false');
    setSort('random');
  };

  // Combine and sort items for "all" view
  const getCombinedItems = () => {
    if (contentType === 'questions') {
      return questions.map(q => ({ type: 'question', data: q }));
    }
    if (contentType === 'recommendations') {
      return recommendations.map(r => ({ type: 'recommendation', data: r }));
    }
    
    // Combine both
    const combined = [
      ...questions.map(q => ({ type: 'question', data: q, date: new Date(q.createdAt) })),
      ...recommendations.map(r => ({ type: 'recommendation', data: r, date: new Date(r.createdAt) })),
    ];
    
    // Sort by date (newest first)
    combined.sort((a, b) => b.date - a.date);
    
    return combined;
  };

  const items = getCombinedItems();
  const totalNew = (stats?.inbox?.new || 0) + (recStats?.new || 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-display font-medium text-ink-900 dark:text-sand-100">
            Inbox
          </h2>
          <p className="text-sm text-ink-500 dark:text-sand-400">
            {totalNew > 0 
              ? `${totalNew} new item${totalNew > 1 ? 's' : ''}`
              : 'All caught up'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={getRandomLight}
            className="btn btn-ghost text-sm"
            title="Show a random light question"
          >
            <DiceIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Random light</span>
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn btn-ghost text-sm ${showFilters ? 'bg-sand-200 dark:bg-ink-700' : ''}`}
          >
            <FilterIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Filter</span>
          </button>
        </div>
      </div>

      {/* Content type tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-sand-200 dark:bg-ink-800 rounded-lg">
        {CONTENT_TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setContentType(opt.value)}
            className={`
              flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors
              ${contentType === opt.value
                ? 'bg-white dark:bg-ink-700 text-ink-900 dark:text-sand-100 shadow-sm'
                : 'text-ink-500 dark:text-sand-400 hover:text-ink-700 dark:hover:text-sand-300'
              }
            `}
          >
            {opt.label}
            {opt.value === 'questions' && stats?.inbox?.new > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-rust-500 text-white text-xs rounded-full">
                {stats.inbox.new}
              </span>
            )}
            {opt.value === 'recommendations' && recStats?.new > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-sage-500 text-white text-xs rounded-full">
                {recStats.new}
              </span>
            )}
          </button>
        ))}
      </div>
      
      {/* Filters panel - only for questions */}
      {showFilters && (contentType === 'all' || contentType === 'questions') && (
        <div className="card p-4 mb-4 animate-fade-in">
          <p className="text-xs font-medium text-ink-500 dark:text-sand-400 mb-3">
            Question filters
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink-600 dark:text-sand-400 mb-1">
                Depth
              </label>
              <select
                value={depth}
                onChange={(e) => setDepth(e.target.value)}
                className="input text-sm"
              >
                {DEPTH_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-ink-600 dark:text-sand-400 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="input text-sm"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-ink-600 dark:text-sand-400 mb-1">
                Sort by
              </label>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="input text-sm"
              >
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-ink-600 dark:text-sand-400 mb-1">
                Heavy
              </label>
              <select
                value={showHeavy}
                onChange={(e) => setShowHeavy(e.target.value)}
                className="input text-sm"
              >
                <option value="false">Hide heavy</option>
                <option value="true">Show all</option>
                <option value="only">Heavy only</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={() => {
              setDepth('');
              setStatus('');
              setSort('newest');
              setShowHeavy(settings?.heavyModeEnabled ? 'true' : 'false');
            }}
            className="text-xs text-ink-500 hover:text-ink-700 dark:text-sand-400 dark:hover:text-sand-300 mt-3"
          >
            Reset filters
          </button>
        </div>
      )}
      
      {/* Content list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="card p-4 bg-rust-50 dark:bg-rust-950 text-rust-700 dark:text-rust-300">
          <p>{error}</p>
          <button onClick={loadContent} className="text-sm underline mt-2">
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={InboxEmptyIcon}
          title={contentType === 'recommendations' ? 'No recommendations yet' : 'No questions here'}
          description={
            contentType === 'recommendations'
              ? "When someone recommends something, it'll appear here"
              : depth || status || showHeavy === 'only'
                ? "Try adjusting your filters"
                : "When someone asks you something, it'll appear here"
          }
          action={
            <Link to="/ask" className="btn btn-primary">
              {contentType === 'recommendations' ? 'Make a recommendation' : 'Ask a question'}
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            item.type === 'question' ? (
              <QuestionCard key={`q-${item.data.id}`} question={item.data} />
            ) : (
              <RecommendationCard key={`r-${item.data.id}`} recommendation={item.data} />
            )
          ))}
        </div>
      )}
    </div>
  );
}

function FilterIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function DiceIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.5" fill="currentColor" />
    </svg>
  );
}

function InboxEmptyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}
