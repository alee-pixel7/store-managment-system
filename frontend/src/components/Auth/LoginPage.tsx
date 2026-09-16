// LoginPage — Premium dark industrial design

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login } = useAuth();

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(t);
    }
  }, [error]);

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
    <div className="min-h-screen bg-base flex">
      {/* Left panel — animated industrial aesthetic */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[50%] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-elevated via-surface to-base">
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(232,160,53,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(232,160,53,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }} />

          {/* Animated gear SVG */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.07]">
            <svg width="500" height="500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-accent" style={{ animation: 'spin 30s linear infinite' }}>
              <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </div>

          {/* Floating rings */}
          <motion.div
            className="absolute top-[20%] left-[15%] w-40 h-40 border border-accent/10 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute bottom-[25%] right-[20%] w-56 h-56 border border-accent/5 rounded-full"
            animate={{ rotate: -360 }}
            transition={{ duration: 60, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute top-[60%] left-[60%] w-24 h-24 border border-accent/8 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-lg shadow-accent/20">
                <svg className="w-7 h-7 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="text-text font-semibold text-lg tracking-wide">STORE MANAGEMENT</div>
                <div className="text-text-muted text-[11px] tracking-[0.2em] uppercase">Inventory Control System</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl xl:text-4xl text-text font-light leading-tight">
              Industrial Parts
              <br />
              <span className="text-gradient-gold font-semibold">Inventory Control</span>
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed max-w-md">
              Manage bearings, seals, fasteners, and consumables across your facility.
              Track stock movements, monitor levels, and maintain complete audit trails.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-3 gap-6">
            <div>
              <div className="text-gradient-gold text-2xl font-bold">31</div>
              <div className="text-text-muted text-[10px] mt-1 tracking-[0.15em] uppercase">Categories</div>
            </div>
            <div>
              <div className="text-gradient-gold text-2xl font-bold">1,019</div>
              <div className="text-text-muted text-[10px] mt-1 tracking-[0.15em] uppercase">Part Types</div>
            </div>
            <div>
              <div className="text-gradient-gold text-2xl font-bold">12h</div>
              <div className="text-text-muted text-[10px] mt-1 tracking-[0.15em] uppercase">Session</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Mobile header */}
          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-lg shadow-accent/20">
                <svg className="w-6 h-6 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="text-text font-semibold tracking-wide">STORE MGMT</div>
                <div className="text-text-muted text-[10px] tracking-[0.2em]">INVENTORY</div>
              </div>
            </div>
          </div>

          {/* Form header */}
          <div className="mb-8">
            <h2 className="text-text text-xl font-semibold mb-2">Welcome back</h2>
            <p className="text-text-secondary text-sm">Sign in to access the inventory system</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username — floating label */}
            <div className="relative">
              <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                focusedField === 'username' || username
                  ? 'top-2 text-[10px] text-accent tracking-wider uppercase'
                  : 'top-3.5 text-sm text-text-muted'
              }`}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoComplete="username"
                autoFocus
                className="w-full bg-base border border-border rounded-xl px-4 pt-7 pb-2.5 text-text text-sm placeholder-transparent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200"
              />
            </div>

            {/* Password — floating label */}
            <div className="relative">
              <label className={`absolute left-4 transition-all duration-200 pointer-events-none ${
                focusedField === 'password' || password
                  ? 'top-2 text-[10px] text-accent tracking-wider uppercase'
                  : 'top-3.5 text-sm text-text-muted'
              }`}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                autoComplete="current-password"
                className="w-full bg-base border border-border rounded-xl px-4 pt-7 pb-2.5 text-text text-sm placeholder-transparent focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200"
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="animate-shake bg-danger-dim border border-danger/20 rounded-xl px-4 py-3 text-danger text-sm"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="w-full bg-gradient-to-r from-accent to-accent-press hover:from-accent-hover hover:to-accent text-base font-semibold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/15 hover:shadow-accent/25"
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
            </motion.button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-border-light">
            <div className="flex items-center justify-between text-text-muted text-xs">
              <span>Session: 12 hours</span>
              <span className="font-mono">v1.0.0</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CSS for gear spin */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
