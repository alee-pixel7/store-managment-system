import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring, useReducedMotion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

/* ─── Ease-out Count-Up ─── */
function CountUp({ target, duration = 2 }: { target: string; duration?: number }) {
  const num = parseInt(target.replace(/,/g, ''), 10);
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (isNaN(num)) { setCount(0); return; }
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = (now - start) / (duration * 1000);
      if (elapsed >= 1) { setCount(num); return; }
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setCount(Math.floor(eased * num));
      requestAnimationFrame(tick);
    };
    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [num, duration]);
  return <>{count.toLocaleString('en-IN')}</>;
}

/* ─── Mouse Trail Dot ─── */
function MouseTrail({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const [dots, setDots] = useState<{ id: number; x: number; y: number }[]>([]);
  const idRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = idRef.current++;
      setDots(prev => [...prev.slice(-7), { id, x, y }]);
      setTimeout(() => {
        setDots(prev => prev.filter(d => d.id !== id));
      }, 800);
    };
    el.addEventListener('mousemove', handleMove);
    return () => el.removeEventListener('mousemove', handleMove);
  }, [containerRef]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      <AnimatePresence>
        {dots.map(dot => (
          <motion.div
            key={dot.id}
            className="absolute w-1 h-1 rounded-full bg-accent"
            style={{ left: dot.x, top: dot.y }}
            initial={{ opacity: 0.3, scale: 1 }}
            animate={{ opacity: 0, scale: 0.3 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ─── Industrial SVG shapes ─── */
const industrialShapes = [
  (size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
      <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  ),
  (size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
      <path d="M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z" />
      <circle cx="12" cy="12" r="4" />
    </svg>
  ),
  (size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="6" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="17.5" cy="9" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="17.5" cy="15" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="12" cy="18" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="6.5" cy="15" r="1.5" fill="currentColor" opacity="0.3" />
      <circle cx="6.5" cy="9" r="1.5" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  (size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
      <path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  (size: number) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.8">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
];

const floaters = [
  { x: '8%', y: '12%', size: 70, shape: 0, rotDur: 40, driftDur: 18, driftX: 40, driftY: -30, delay: 0 },
  { x: '70%', y: '8%', size: 55, shape: 1, rotDur: 50, driftDur: 22, driftX: -35, driftY: 25, delay: 1 },
  { x: '80%', y: '55%', size: 65, shape: 2, rotDur: 45, driftDur: 20, driftX: -25, driftY: -20, delay: 2 },
  { x: '15%', y: '65%', size: 50, shape: 3, rotDur: 55, driftDur: 24, driftX: 30, driftY: 15, delay: 0.5 },
  { x: '50%', y: '35%', size: 45, shape: 4, rotDur: 35, driftDur: 19, driftX: -20, driftY: 30, delay: 1.5 },
  { x: '35%', y: '80%', size: 60, shape: 0, rotDur: 48, driftDur: 21, driftX: 25, driftY: -25, delay: 3 },
];

const bgParticles = [
  { x: '20%', y: '30%', size: 3, dur: 30, delay: 0 },
  { x: '60%', y: '20%', size: 4, dur: 35, delay: 2 },
  { x: '40%', y: '75%', size: 3, dur: 28, delay: 4 },
  { x: '85%', y: '45%', size: 3, dur: 32, delay: 1 },
  { x: '10%', y: '55%', size: 4, dur: 27, delay: 3 },
];

const tickerItems = ['Bearings', 'Seals', 'Fasteners', 'Consumables', 'Tools', 'Gaskets', 'O-Rings', 'Filters', 'Belts', 'Lubricants'];

function Ticker() {
  const repeated = [...tickerItems, ...tickerItems, ...tickerItems];
  return (
    <div className="absolute bottom-0 left-0 right-0 h-10 overflow-hidden border-t border-accent/[0.10] bg-base/40 backdrop-blur-sm">
      <motion.div
        className="flex items-center h-full gap-6 whitespace-nowrap"
        animate={{ x: ['0%', '-33.333%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      >
        {repeated.map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-text-muted text-[11px] tracking-wider uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-accent/40" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   LOGIN PAGE
   ═══════════════════════════════════════════ */
export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shaking, setShaking] = useState(false);
  const { login } = useAuth();

  const prefersReducedMotion = useReducedMotion();
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window;
  const disableTilt = !!prefersReducedMotion || isTouchDevice;

  const cardRef = useRef<HTMLDivElement>(null);
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rawMouseX = useMotionValue(0.5);
  const rawMouseY = useMotionValue(0.5);
  const springConfig = { stiffness: 150, damping: 20, mass: 0.5 };
  const mouseX = useSpring(rawMouseX, springConfig);
  const mouseY = useSpring(rawMouseY, springConfig);
  const rotateX = useTransform(mouseY, [0, 1], [4, -4]);
  const rotateY = useTransform(mouseX, [0, 1], [-4, 4]);

  useEffect(() => {
    if (error) {
      setShaking(true);
      const shakeTimer = setTimeout(() => setShaking(false), 500);
      const errorTimer = setTimeout(() => setError(null), 5000);
      return () => { clearTimeout(shakeTimer); clearTimeout(errorTimer); };
    }
  }, [error]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (disableTilt || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    rawMouseX.set((e.clientX - rect.left) / rect.width);
    rawMouseY.set((e.clientY - rect.top) / rect.height);
  }, [disableTilt, rawMouseX, rawMouseY]);

  const handleMouseLeave = useCallback(() => {
    if (disableTilt) return;
    rawMouseX.set(0.5);
    rawMouseY.set(0.5);
  }, [disableTilt, rawMouseX, rawMouseY]);

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
      setSuccess(true);
      await new Promise(r => setTimeout(r, 600));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { value: '31', label: 'Categories' },
    { value: '1019', label: 'Part Types' },
    { value: '12h', label: 'Session' },
  ];

  const entrance = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  });

  return (
    <div className="min-h-screen bg-base flex relative overflow-hidden">
      {/* Noise texture */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.015]" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />

      {/* ═══ LEFT PANEL ═══ */}
      <div ref={leftPanelRef} className="hidden lg:flex lg:w-[55%] relative">
        <div className="absolute inset-0 bg-gradient-to-br from-elevated via-surface to-base" />

        {/* Aurora orbs — visible now */}
        <motion.div
          className="absolute w-[450px] h-[450px] rounded-full blur-[120px] bg-accent/[0.15]"
          style={{ top: '5%', left: '10%' }}
          animate={prefersReducedMotion ? {} : { x: [0, 80, -40, 60, 0], y: [0, -60, 50, -30, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[350px] h-[350px] rounded-full blur-[100px] bg-[#A78BFA]/[0.10]"
          style={{ bottom: '10%', right: '5%' }}
          animate={prefersReducedMotion ? {} : { x: [0, -70, 50, -30, 0], y: [0, 40, -60, 20, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full blur-[90px] bg-[#7C3AED]/[0.10]"
          style={{ top: '45%', left: '50%' }}
          animate={prefersReducedMotion ? {} : { x: [0, 50, -60, 30, 0], y: [0, -40, 30, -50, 0] }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Dot matrix pattern */}
        <div className="absolute inset-0 opacity-[0.06]" style={{
          backgroundImage: 'radial-gradient(circle, rgba(139,92,246,1) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }} />

        {/* Mouse trail */}
        {!prefersReducedMotion && <MouseTrail containerRef={leftPanelRef} />}

        {/* Subtle background particle drift — visible */}
        {!prefersReducedMotion && bgParticles.map((p, i) => (
          <motion.div
            key={`bg-${i}`}
            className="absolute rounded-full bg-accent/[0.20]"
            style={{ left: p.x, top: p.y, width: p.size, height: p.size }}
            animate={{ y: [0, -20, 10, -15, 0], x: [0, 8, -5, 3, 0], opacity: [0.15, 0.25, 0.18, 0.22, 0.15] }}
            transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}

        {/* Floating industrial shapes — visible */}
        {floaters.map((f, i) => (
          <motion.div
            key={i}
            className="absolute text-accent/[0.12]"
            style={{ left: f.x, top: f.y }}
            animate={prefersReducedMotion ? {} : {
              x: [0, f.driftX, -f.driftX * 0.6, f.driftX * 0.3, 0],
              y: [0, f.driftY, -f.driftY * 0.5, f.driftY * 0.4, 0],
              rotate: [0, 360],
            }}
            transition={{
              rotate: { duration: f.rotDur, repeat: Infinity, ease: 'linear' },
              x: { duration: f.driftDur, delay: f.delay, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: f.driftDur * 1.2, delay: f.delay, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            {industrialShapes[f.shape](f.size)}
          </motion.div>
        ))}

        {/* Rings — visible */}
        <motion.div className="absolute top-[20%] left-[15%] w-44 h-44 border border-accent/[0.08] rounded-full"
          animate={prefersReducedMotion ? {} : { rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
        />
        <motion.div className="absolute bottom-[25%] right-[18%] w-56 h-56 border border-accent/[0.06] rounded-full"
          animate={prefersReducedMotion ? {} : { rotate: -360 }} transition={{ duration: 65, repeat: Infinity, ease: 'linear' }}
        />

        {/* Content — staggered entrance */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 w-full pb-14">
          {/* Logo */}
          <motion.div className="flex items-center gap-4 mb-14" {...entrance(0)}>
            <motion.div
              className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center"
              animate={prefersReducedMotion ? {} : {
                boxShadow: [
                  '0 0 20px rgba(139,92,246,0.25), 0 0 40px rgba(139,92,246,0.12)',
                  '0 0 35px rgba(139,92,246,0.35), 0 0 70px rgba(139,92,246,0.18)',
                  '0 0 20px rgba(139,92,246,0.25), 0 0 40px rgba(139,92,246,0.12)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg className="w-9 h-9 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </motion.div>
            <div>
              <div className="text-text font-bold text-2xl tracking-wide">STORE MANAGEMENT</div>
              <div className="text-text-muted text-[11px] tracking-[0.3em] uppercase mt-0.5">Inventory Control System</div>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div className="mb-12" {...entrance(0.08)}>
            <h1 className="text-5xl xl:text-6xl text-text font-light leading-[1.1] mb-5">
              Pak Packages
              <br />
              <span className="text-gradient-gold font-bold">Inventory Control</span>
            </h1>
            <p className="text-text-secondary text-sm leading-relaxed max-w-md">
              Manage bearings, seals, fasteners, and consumables across your facility.
              Track stock movements, monitor levels, and maintain complete audit trails.
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div className="flex items-center gap-0 max-w-md" {...entrance(0.16)}>
            {stats.map((stat, i) => (
              <div key={stat.label} className="flex items-center gap-5">
                <div className="flex flex-col items-center">
                  <div className="text-gradient-gold text-3xl font-black tracking-tight">
                    <CountUp target={stat.value} duration={1.5 + i * 0.2} />
                  </div>
                  <div className="text-text-muted text-[9px] tracking-[0.2em] uppercase mt-1">{stat.label}</div>
                </div>
                {i < stats.length - 1 && <div className="w-px h-10 bg-accent/20 mx-5" />}
              </div>
            ))}
          </motion.div>
        </div>

        <Ticker />
      </div>

      {/* ═══ RIGHT PANEL ═══ */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 relative">
        {/* Subtle orb */}
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full blur-[100px] bg-accent/[0.06] pointer-events-none"
          style={{ top: '20%', right: '10%' }}
          animate={prefersReducedMotion ? {} : { x: [0, 30, -20, 0], y: [0, -20, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />

        <motion.div className="w-full max-w-sm relative z-10" {...entrance(0.2)}>
          {/* Mobile header */}
          <div className="lg:hidden mb-8">
            <motion.div className="flex items-center gap-3" {...entrance(0)}>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-lg shadow-accent/25">
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

          {/* ═══ LOGIN CARD — Deep Layered ═══ */}
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={disableTilt ? {} : { rotateX, rotateY, perspective: 800 }}
            className={`relative ${shaking ? 'animate-shake' : ''}`}
          >
            {/* Gradient sheen border — visible */}
            <div
              className="absolute -inset-px rounded-2xl pointer-events-none"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 40%, rgba(139,92,246,0.15) 100%)',
              }}
            />

            {/* Card glow pulse — breathing shadow */}
            <motion.div
              className="absolute -inset-1 rounded-2xl pointer-events-none"
              animate={prefersReducedMotion ? {} : {
                boxShadow: [
                  '0 0 30px rgba(139,92,246,0.06), 0 0 60px rgba(139,92,246,0.03)',
                  '0 0 40px rgba(139,92,246,0.12), 0 0 80px rgba(139,92,246,0.06)',
                  '0 0 30px rgba(139,92,246,0.06), 0 0 60px rgba(139,92,246,0.03)',
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Stacked shadow layers */}
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                boxShadow: '0 2px 4px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.5), 0 0 40px rgba(139,92,246,0.15)',
              }}
            />

            {/* Glass card body */}
            <div className="relative rounded-2xl p-8 bg-surface-glass backdrop-blur-xl border border-border-light">
              {/* Inner top highlight — visible */}
              <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/[0.10] to-transparent rounded-full" />

              {/* Card header with parallax depth */}
              <motion.div
                className="mb-7 text-center"
                style={disableTilt ? {} : { translateZ: 20 }}
              >
                <motion.div
                  className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center mx-auto mb-4 shadow-lg shadow-accent/25"
                  whileHover={{ scale: 1.05 }}
                  style={disableTilt ? {} : { translateZ: 40 }}
                >
                  {success ? (
                    <motion.svg
                      className="w-7 h-7 text-base"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    >
                      <motion.path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
                      />
                    </motion.svg>
                  ) : (
                    <svg className="w-7 h-7 text-base" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  )}
                </motion.div>
                <h2 className="text-text text-xl font-bold mb-1">Welcome back</h2>
                <p className="text-text-secondary text-sm">Sign in to access inventory</p>
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Username — with glow + icon shift on focus */}
                <motion.div
                  className={`relative rounded-xl border transition-all duration-300 ${
                    focusedField === 'username'
                      ? 'border-accent/50 bg-accent/[0.05]'
                      : 'border-border hover:border-border-light bg-base/50'
                  }`}
                  style={disableTilt ? {} : { translateZ: 10 }}
                  animate={focusedField === 'username' ? {
                    boxShadow: '0 0 0 4px rgba(139,92,246,0.12), 0 0 24px rgba(139,92,246,0.08)',
                  } : {
                    boxShadow: '0 0 0 0px rgba(139,92,246,0), 0 0 0px rgba(139,92,246,0)',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                    animate={focusedField === 'username' ? { y: -1 } : { y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <svg className={`w-4.5 h-4.5 transition-colors duration-200 ${focusedField === 'username' ? 'text-accent' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                    </svg>
                  </motion.div>
                  <input
                    type="text" value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="username" autoFocus placeholder="Username"
                    className="w-full bg-transparent pl-11 pr-4 py-3.5 text-text text-sm placeholder:text-text-muted outline-none"
                  />
                </motion.div>

                {/* Password — with glow + icon shift on focus */}
                <motion.div
                  className={`relative rounded-xl border transition-all duration-300 ${
                    focusedField === 'password'
                      ? 'border-accent/50 bg-accent/[0.05]'
                      : 'border-border hover:border-border-light bg-base/50'
                  }`}
                  style={disableTilt ? {} : { translateZ: 10 }}
                  animate={focusedField === 'password' ? {
                    boxShadow: '0 0 0 4px rgba(139,92,246,0.12), 0 0 24px rgba(139,92,246,0.08)',
                  } : {
                    boxShadow: '0 0 0 0px rgba(139,92,246,0), 0 0 0px rgba(139,92,246,0)',
                  }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none"
                    animate={focusedField === 'password' ? { y: -1 } : { y: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <svg className={`w-4.5 h-4.5 transition-colors duration-200 ${focusedField === 'password' ? 'text-accent' : 'text-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </motion.div>
                  <input
                    type={showPassword ? 'text' : 'password'} value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    autoComplete="current-password" placeholder="Password"
                    className="w-full bg-transparent pl-11 pr-11 py-3.5 text-text text-sm placeholder:text-text-muted outline-none"
                  />
                  <button
                    type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-text-muted hover:text-accent transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </motion.div>

                {/* Error — slides in */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                      exit={{ opacity: 0, y: -8, height: 0 }} className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-danger/20 bg-danger-dim">
                        <svg className="w-4 h-4 text-danger flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                        <span className="text-sm text-danger">{error}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit — spring press, shine sweep, success morph */}
                <motion.button
                  type="submit" disabled={loading || success}
                  whileTap={disableTilt ? {} : { scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="btn btn-primary btn-lg w-full relative overflow-hidden text-base font-bold group"
                  style={disableTilt ? {} : { translateZ: 5 }}
                >
                  {/* Shine sweep */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/15 to-transparent pointer-events-none" />

                  {success ? (
                    <span className="flex items-center justify-center gap-2 relative">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  ) : loading ? (
                    <span className="flex items-center justify-center gap-2 relative">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2 relative">
                      Sign In
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
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
        </motion.div>
      </div>
    </div>
  );
}
