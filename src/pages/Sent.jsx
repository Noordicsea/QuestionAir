import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../utils/api';
import QuestionCard from '../components/QuestionCard';
import Spinner from '../components/Spinner';
import EmptyState from '../components/EmptyState';

export default function Sent() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/questions/sent');
      setQuestions(data.questions);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const answeredCount = questions.filter(q => q.responseCount > 0).length;
  const pendingCount = questions.filter(q => q.responseCount === 0).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-display font-medium text-ink-900">
            Sent
          </h2>
          <p className="text-sm text-ink-500">
            {questions.length > 0 
              ? `${answeredCount} answered, ${pendingCount} waiting`
              : 'Questions you asked'
            }
          </p>
        </div>
        
        <Link to="/ask" className="btn btn-primary">
          <PlusIcon className="w-4 h-4" />
          Ask
        </Link>
      </div>
      
      {/* Questions list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : error ? (
        <div className="card p-4 bg-rust-50 text-rust-700">
          <p>{error}</p>
          <button onClick={loadQuestions} className="text-sm underline mt-2">
            Try again
          </button>
        </div>
      ) : questions.length === 0 ? (
        <EmptyState
          icon={SentEmptyIcon}
          title="No questions sent yet"
          description="Ask something when you're ready"
          action={
            <Link to="/ask" className="btn btn-primary">
              Ask a question
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {questions.map(q => (
            <QuestionCard 
              key={q.id} 
              question={q} 
              showAuthor={false} 
            />
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

