import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import QuestionCard from '../components/QuestionCard';
import RecommendationCard from '../components/RecommendationCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

const CONTENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'questions', label: 'Questions' },
  { value: 'recommendations', label: 'Recommendations' },
];

export default function Sent() {
  const [questions, setQuestions] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [contentType, setContentType] = useState('all');

  useEffect(() => {
    loadContent();
  }, []);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const [questionsData, recsData] = await Promise.all([
        api.get('/questions/sent'),
        api.get('/recommendations/sent'),
      ]);
      setQuestions(questionsData.questions);
      setRecommendations(recsData.recommendations);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const answeredCount = questions.filter(q => q.responseCount > 0).length;
  const pendingCount = questions.filter(q => q.responseCount === 0).length;
  const viewedRecsCount = recommendations.filter(r => r.status === 'viewed').length;

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-display font-medium text-ink-900 dark:text-sand-100">
            Sent
          </h2>
          <p className="text-sm text-ink-500 dark:text-sand-400">
            {questions.length + recommendations.length > 0 
              ? contentType === 'questions' 
                ? `${answeredCount} answered, ${pendingCount} waiting`
                : contentType === 'recommendations'
                  ? `${viewedRecsCount} viewed, ${recommendations.length - viewedRecsCount} pending`
                  : `${questions.length} questions, ${recommendations.length} recommendations`
              : 'Things you shared'
            }
          </p>
        </div>
        
        <Link to="/ask" className="btn btn-primary">
          <PlusIcon className="w-4 h-4" />
          Share
        </Link>
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
            {opt.value === 'questions' && questions.length > 0 && (
              <span className="ml-1.5 text-xs text-ink-400 dark:text-sand-500">
                ({questions.length})
              </span>
            )}
            {opt.value === 'recommendations' && recommendations.length > 0 && (
              <span className="ml-1.5 text-xs text-ink-400 dark:text-sand-500">
                ({recommendations.length})
              </span>
            )}
          </button>
        ))}
      </div>
      
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
          icon={SentEmptyIcon}
          title={contentType === 'recommendations' ? 'No recommendations sent yet' : 'No questions sent yet'}
          description={contentType === 'recommendations' ? 'Share something when you find something interesting' : 'Ask something when you\'re ready'}
          action={
            <Link to={contentType === 'recommendations' ? '/ask?tab=recommend' : '/ask'} className="btn btn-primary">
              {contentType === 'recommendations' ? 'Make a recommendation' : 'Ask a question'}
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item, index) => (
            item.type === 'question' ? (
              <QuestionCard 
                key={`q-${item.data.id}`} 
                question={item.data} 
                showAuthor={false} 
              />
            ) : (
              <RecommendationCard 
                key={`r-${item.data.id}`} 
                recommendation={item.data} 
                showAuthor={false} 
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

function PlusIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function SentEmptyIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
