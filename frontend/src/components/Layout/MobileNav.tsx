import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MobileNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  canDoStockOps: boolean;
}

export function MobileNav({ currentPage, onNavigate, canDoStockOps }: MobileNavProps) {
  const [showReports, setShowReports] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showReports) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowReports(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showReports]);

  const navItems = [
    {
      id: 'items',
      label: 'Search',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    ...(canDoStockOps
      ? [
          {
            id: 'stock-in',
            label: 'In',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            ),
          },
          {
            id: 'stock-out',
            label: 'Issue',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            ),
          },
          {
            id: 'stock-return',
            label: 'Return',
            icon: (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            ),
          },
        ]
      : []),
    {
      id: 'reports',
      label: 'Reports',
      isDropdown: true,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      id: 'audit-list',
      label: 'Audit',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'Home',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-border-light z-50 safe-area-bottom print:hidden md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = item.isDropdown
            ? currentPage === 'daily-report' || currentPage === 'monthly-report'
            : currentPage === item.id ||
              (item.id === 'items' && (currentPage === 'item-detail' || currentPage === 'items'));

          if (item.isDropdown) {
            return (
              <div key={item.id} className="relative" ref={menuRef}>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={() => setShowReports(!showReports)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl transition-colors duration-150 ${
                    isActive ? 'text-accent' : 'text-text-secondary'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="mobile-indicator"
                      className="absolute -top-1 w-6 h-0.5 bg-accent rounded-full shadow-[0_0_8px_rgba(232,160,53,0.4)]"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <div className={isActive ? 'drop-shadow-[0_0_6px_rgba(232,160,53,0.3)]' : ''}>
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-medium">{item.label}</span>
                </motion.button>
                <AnimatePresence>
                  {showReports && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-elevated border border-border rounded-xl shadow-xl z-[60] overflow-hidden"
                    >
                      <button
                        onClick={() => { onNavigate('daily-report'); setShowReports(false); }}
                        className="block w-full text-left px-4 py-2.5 text-sm text-text hover:bg-hover transition-colors"
                      >
                        Daily Report
                      </button>
                      <button
                        onClick={() => { onNavigate('monthly-report'); setShowReports(false); }}
                        className="block w-full text-left px-4 py-2.5 text-sm text-text hover:bg-hover transition-colors"
                      >
                        Monthly Report
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.85 }}
              onClick={() => onNavigate(item.id)}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-[56px] min-h-[44px] px-2 py-1 rounded-xl transition-colors duration-150 ${
                isActive ? 'text-accent' : 'text-text-secondary'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="mobile-indicator"
                  className="absolute -top-1 w-6 h-0.5 bg-accent rounded-full shadow-[0_0_8px_rgba(232,160,53,0.4)]"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div className={isActive ? 'drop-shadow-[0_0_6px_rgba(232,160,53,0.3)]' : ''}>
                {item.icon}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
