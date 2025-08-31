import React, { useState } from 'react';

interface SimpleLoginPageProps {
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export const SimpleLoginPage: React.FC<SimpleLoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await onLogin(username, password);
      if (!success) {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-100/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/30 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl mb-6 shadow-lg border border-slate-300">
              <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none">
                {/* Network topology icon with connected nodes */}
                {/* Main central node */}
                <circle cx="32" cy="32" r="4" fill="#3B82F6" stroke="#1E40AF" strokeWidth="1"/>
                
                {/* Top nodes */}
                <circle cx="18" cy="18" r="3" fill="#06B6D4" stroke="#0891B2" strokeWidth="1"/>
                <circle cx="46" cy="18" r="3" fill="#06B6D4" stroke="#0891B2" strokeWidth="1"/>
                
                {/* Side nodes */}
                <circle cx="12" cy="32" r="3" fill="#10B981" stroke="#059669" strokeWidth="1"/>
                <circle cx="52" cy="32" r="3" fill="#10B981" stroke="#059669" strokeWidth="1"/>
                
                {/* Bottom nodes */}
                <circle cx="18" cy="46" r="3" fill="#8B5CF6" stroke="#7C3AED" strokeWidth="1"/>
                <circle cx="46" cy="46" r="3" fill="#8B5CF6" stroke="#7C3AED" strokeWidth="1"/>
                
                {/* Connecting lines */}
                <line x1="28" y1="32" x2="15" y2="32" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
                <line x1="36" y1="32" x2="49" y2="32" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
                <line x1="29" y1="29" x2="21" y2="21" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
                <line x1="35" y1="29" x2="43" y2="21" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
                <line x1="29" y1="35" x2="21" y2="43" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
                <line x1="35" y1="35" x2="43" y2="43" stroke="#64748B" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2">SL1 Topology</h1>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter username"
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Enter password"
                required
                disabled={isLoading}
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className="group relative w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white py-4 px-6 rounded-2xl font-semibold hover:shadow-xl hover:shadow-slate-900/25 hover:-translate-y-0.5 focus:ring-4 focus:ring-slate-500/50 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 via-transparent to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center justify-center">
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                    <span className="text-white/90">Authenticating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign In to SL1 Topology</span>
                    <div className="ml-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              For password reset, contact administrator
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};