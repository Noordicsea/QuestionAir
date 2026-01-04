import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function Login() {
  const { login, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    
    if (!username || !password) {
      setLocalError('Please enter both username and password');
      return;
    }
    
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setLocalError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-sand-100 flex flex-col">
      {/* Decorative background */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(125, 154, 125, 0.15) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(201, 141, 111, 0.1) 0%, transparent 50%)
          `,
        }}
      />
      
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="font-display text-4xl font-medium text-ink-900 mb-2">
            Questionair
          </h1>
          <p className="text-ink-500">
            A place for our questions so we can breathe.
          </p>
        </div>
        
        {/* Login form */}
        <div className="w-full max-w-sm">
          <form onSubmit={handleSubmit} className="card p-6">
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="username" 
                  className="block text-sm font-medium text-ink-700 mb-1"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="Your username"
                  autoComplete="username"
                  autoFocus
                />
              </div>
              
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium text-ink-700 mb-1"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </div>
              
              {(localError || error) && (
                <p className="text-sm text-rust-600 bg-rust-50 px-3 py-2 rounded">
                  {localError || error}
                </p>
              )}
              
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary w-full h-11"
              >
                {loading ? <Spinner size="sm" /> : 'Sign in'}
              </button>
            </div>
          </form>
          
          <p className="text-center text-xs text-ink-400 mt-6">
            Take your time. Protect your energy.
          </p>
        </div>
      </div>
    </div>
  );
}

