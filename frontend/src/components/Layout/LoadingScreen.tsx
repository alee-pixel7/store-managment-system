// LoadingScreen — Premium loading state

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface LoadingScreenProps {
  onReady: () => void;
}

export function LoadingScreen({ onReady }: LoadingScreenProps) {
  const [status, setStatus] = useState('Starting backend...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 60;
    let interval: ReturnType<typeof setInterval>;

    const checkHealth = async () => {
      attempts++;
      setStatus(`Connecting... (${attempts}/${maxAttempts})`);
      try {
        const response = await fetch('/api/health', {
          signal: AbortSignal.timeout(2000),
        });
        if (response.ok) {
          // Guard: the Tauri splash serves static assets here — only accept
          // the real JSON health payload ({"status":"ok",...})
          const data = await response.json().catch(() => null);
          if (data?.status !== 'ok') throw new Error('not ready');
          setStatus('Ready!');
          clearInterval(interval);
          setTimeout(onReady, 300);
          return;
        }
      } catch { }
      if (attempts >= maxAttempts) {
        setError('Backend failed to start. Please restart.');
        clearInterval(interval);
      }
    };

    const listenForReady = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        await listen('backend-ready', () => {
          setStatus('Ready!');
          clearInterval(interval);
          setTimeout(onReady, 300);
        });
      } catch { }
    };

    listenForReady();
    interval = setInterval(checkHealth, 500);
    checkHealth();
    return () => clearInterval(interval);
  }, [onReady]);

  return (
    <div className="min-h-screen bg-base flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-xl shadow-accent/20">
            <svg className="w-9 h-9 text-base" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-text mb-1">Store Management</h1>
        <p className="text-sm text-text-secondary mb-6">Inventory Control System</p>

        {error ? (
          <div className="text-danger text-sm">{error}</div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-text-muted">{status}</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
