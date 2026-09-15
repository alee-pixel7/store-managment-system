// LoadingScreen Component
// Shows while the backend is starting up

import { useState, useEffect } from 'react';

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
      setStatus(`Connecting to backend... (attempt ${attempts}/${maxAttempts})`);

      try {
        const response = await fetch('http://localhost:5000/api/health', {
          signal: AbortSignal.timeout(2000),
        });

        if (response.ok) {
          setStatus('Backend ready!');
          clearInterval(interval);
          setTimeout(onReady, 300);
          return;
        }
      } catch {
        // Backend not ready yet
      }

      if (attempts >= maxAttempts) {
        setError('Backend failed to start. Please restart the application.');
        clearInterval(interval);
      }
    };

    // Listen for Tauri backend-ready event
    const listenForReady = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');
        await listen('backend-ready', () => {
          setStatus('Backend ready!');
          clearInterval(interval);
          setTimeout(onReady, 300);
        });
      } catch {
        // Not running in Tauri, fall back to polling
      }
    };

    listenForReady();
    interval = setInterval(checkHealth, 500);
    checkHealth();

    return () => clearInterval(interval);
  }, [onReady]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
      <div className="text-center">
        {/* Logo / Icon */}
        <div className="mb-6">
          <svg className="w-16 h-16 mx-auto text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-text mb-2">Store Management System</h1>

        {error ? (
          <div className="text-red-600 text-sm mt-4">{error}</div>
        ) : (
          <div className="mt-6">
            {/* Spinner */}
            <div className="inline-block w-6 h-6 border-3 border-accent border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-text-secondary">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
}
