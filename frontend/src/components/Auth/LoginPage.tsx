// LoginPage - Industrial design login screen

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1d23] flex">
      {/* Left panel - industrial aesthetic */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        {/* Dark steel background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#2a2d35] via-[#1e2028] to-[#15171c]">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />

          {/* Decorative elements */}
          <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-[#3a3d45] rounded-full opacity-30" />
          <div className="absolute top-1/3 left-1/3 w-24 h-24 border border-[#3a3d45] rounded-full opacity-20" />
          <div className="absolute bottom-1/3 right-1/4 w-40 h-40 border border-[#3a3d45] rounded-full opacity-25" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          {/* Brand mark */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-[#c9a84c] rounded flex items-center justify-center">
                <svg className="w-7 h-7 text-[#1a1d23]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold text-lg tracking-wide">STORE MANAGEMENT</div>
                <div className="text-[#6a6d75] text-xs tracking-widest uppercase">Inventory Control System</div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-4">
            <h1 className="text-3xl xl:text-4xl text-white font-light leading-tight">
              Industrial Parts<br />
              <span className="text-[#c9a84c] font-medium">Inventory Control</span>
            </h1>
            <p className="text-[#8a8d95] text-sm leading-relaxed max-w-md">
              Manage bearings, seals, fasteners, and consumables across your facility.
              Track stock movements, monitor levels, and maintain complete audit trails.
            </p>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div>
              <div className="text-[#c9a84c] text-2xl font-light">—</div>
              <div className="text-[#6a6d75] text-xs mt-1 tracking-wide">CATEGORIES</div>
            </div>
            <div>
              <div className="text-[#c9a84c] text-2xl font-light">—</div>
              <div className="text-[#6a6d75] text-xs mt-1 tracking-wide">PART TYPES</div>
            </div>
            <div>
              <div className="text-[#c9a84c] text-2xl font-light">12h</div>
              <div className="text-[#6a6d75] text-xs mt-1 tracking-wide">SESSION</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile header */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#c9a84c] rounded flex items-center justify-center">
                <svg className="w-6 h-6 text-[#1a1d23]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="text-white font-semibold tracking-wide">STORE MGMT</div>
                <div className="text-[#6a6d75] text-xs tracking-widest">INVENTORY</div>
              </div>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-white text-xl font-medium mb-2">Sign In</h2>
            <p className="text-[#6a6d75] text-sm">Enter your credentials to access the system</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-[#8a8d95] text-xs tracking-wide uppercase mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="STORE ADMIN"
                autoComplete="username"
                autoFocus
                className="w-full bg-[#252830] border border-[#3a3d45] rounded px-4 py-3 text-white placeholder-[#4a4d55] focus:outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c] transition-colors"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[#8a8d95] text-xs tracking-wide uppercase mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="•••••"
                autoComplete="current-password"
                className="w-full bg-[#252830] border border-[#3a3d45] rounded px-4 py-3 text-white placeholder-[#4a4d55] focus:outline-none focus:border-[#c9a84c] focus:ring-1 focus:ring-[#c9a84c] transition-colors"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-900/30 border border-red-800/50 rounded px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#c9a84c] hover:bg-[#b89842] text-[#1a1d23] font-medium py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#c9a84c] focus:ring-offset-2 focus:ring-offset-[#1a1d23]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#2a2d35]">
            <div className="flex items-center justify-between text-[#4a4d55] text-xs">
              <span>Session: 12 hours</span>
              <span className="font-mono">v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
