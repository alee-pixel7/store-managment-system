import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

function CountUp({ target, duration = 2 }: { target: string; duration?: number }) {
  const numericTarget = parseInt(target.replace(/,/g, ''), 10);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isNaN(numericTarget)) { setCount(0); return; }
    let start = 0;
    const step = numericTarget / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= numericTarget) { setCount(numericTarget); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [numericTarget, duration]);

  return <>{count.toLocaleString('en-IN')}</>;
}

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { login } = useAuth();

  useEffect(() => {
    if (error) {
      const t = setTimeout(() => setError(null), 5000);
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

  const stats = [
    { value: '31', label: 'Categories', suffix: '' },
    { value: '1019', label: 'Part Types', suffix: '' },
    { value: '12', label: 'Hour Session', suffix: 'h' },
  ];

  return (
    <div className="min-h-screen bg-base flex">
      {/* ═══════ LEFT PANEL — Brand Showcase ═══════ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-elevated via-surface to-base" />

        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(232,160,53,1) 1px, transparent 1px), linear-gradient(90deg, rgba(232,160,53,1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Radial glow behind logo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/[0.04] rounded-full blur-[100px]" />

        {/* Floating particles */}
        {[
          { x: '15%', y: '20%', size: 4, delay: 0, dur: 18 },
          { x: '75%', y: '15%', size: 3, delay: 2, dur: 22 },
          { x: '25%', y: '70%', size: 5, delay: 4, dur: 20 },
          { x: '80%', y: '65%', size: 3, delay: 1, dur: 25 },
          { x: '50%', y: '40%', size: 4, delay: 3, dur: 16 },
          { x: '60%', y: '80%', size: 3, delay: 5, dur: 21 },
        ].map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-accent/20"
            style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
            animate={{
              y: [0, -30, 0, 20, 0],
              x: [0, 15, -10, 5, 0],
              opacity: [0.2, 0.6, 0.3, 0.5, 0.2],
            }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Floating rings */}
        <motion.div
          className="absolute top-[18%] left-[12%] w-48 h-48 border border-accent/[0.06] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute bottom-[20%] right-[15%] w-64 h-64 border border-accent/[0.04] rounded-full"
          animate={{ rotate: -360 }}
          transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div
          className="absolute top-[55%] left-[65%] w-28 h-28 border border-accent/[0.06] rounded-full"
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-4 mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-xl shadow-accent/25">
              <svg className="w-8 h-8 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <div className="text-text font-bold text-xl tracking-wide">STORE MANAGEMENT</div>
              <div className="text-text-muted text-[11px] tracking-[0.25em] uppercase">Inventory Control System</div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            className="mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h1 className="text-4xl xl:text-5xl text-text font-light leading-tight mb-4">
              Industrial Parts
              <br />
              <span className="text-gradient-gold font-semibold">Inventory Control</span>
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed max-w-lg">
              Manage bearings, seals, fasteners, and consumables across your facility.
              Track stock movements, monitor levels, and maintain complete audit trails.
            </p>
          </motion.div>

          {/* Stats cards */}
          <motion.div
            className="grid grid-cols-3 gap-5 max-w-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className="glass rounded-xl p-4 border-t-2 border-t-accent/40"
              >
                <div className="text-gradient-gold text-3xl font-bold mb-1">
                  <CountUp target={stat.value} duration={1.5 + i * 0.3} />{stat.suffix}
                </div>
                <div className="text-text-muted text-[10px] tracking-[0.15em] uppercase">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ═══════ RIGHT PANEL — Login Form ═══════ */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Mobile header */}
          <div className="lg:hidden mb-10">
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-lg shadow-accent/20">
                <svg className="w-6 h-6 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <div className="text-text font-bold tracking-wide">STORE MGMT</div>
                <div className="text-text-muted text-[10px] tracking-[0.2em]">INVENTORY</div>
              </div>
            </motion.div>
          </div>

          {/* Glass card */}
          <div className="glass rounded-2xl border border-border-light shadow-2xl p-8">
            {/* Form header */}
            <div className="mb-7">
              <h2 className="text-text text-xl font-bold mb-1.5">Welcome back</h2>
              <p className="text-text-secondary text-sm">Sign in to access the inventory system</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className={`relative rounded-xl border transition-all duration-200 ${
                focusedField === 'username'
                  ? 'border-accent/40 ring-2 ring-accent/10 bg-accent/[0.03]'
                  : 'border-border hover:border-border-light bg-base/50'
              }`}>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className={`w-4 h-4 transition-colors ${focusedField === 'username' ? 'text-accent' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField('username')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="username"
                  autoFocus
                  placeholder="Username"
                  className="w-full bg-transparent pl-10 pr-4 py-3 text-text text-sm placeholder:text-text-muted outline-none"
                />
              </div>

              {/* Password */}
              <div className={`relative rounded-xl border transition-all duration-200 ${
                focusedField === 'password'
                  ? 'border-accent/40 ring-2 ring-accent/10 bg-accent/[0.03]'
                  : 'border-border hover:border-border-light bg-base/50'
              }`}>
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <svg className={`w-4 h-4 transition-colors ${focusedField === 'password' ? 'text-accent' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="current-password"
                  placeholder="Password"
                  className="w-full bg-transparent pl-10 pr-11 py-3 text-text text-sm placeholder:text-text-muted outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -8, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2.5 px-4 py-3 glass rounded-xl border border-danger/15">
                      <svg className="w-4 h-4 text-danger flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                      </svg>
                      <span className="text-sm text-danger">{error}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.97 }}
                className="w-full relative overflow-hidden bg-gradient-to-r from-accent to-accent-press hover:from-accent-hover hover:to-accent text-base font-bold py-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-accent/15 hover:shadow-xl hover:shadow-accent/25"
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
                  <span className="flex items-center justify-center gap-2">
                    Sign In
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
                  </span>
                )}
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-5 border-t border-border-light">
              <div className="flex items-center justify-between text-text-muted text-xs">
                <span>Session: 12 hours</span>
                <span className="font-mono text-text-muted/60">v1.0.0</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
