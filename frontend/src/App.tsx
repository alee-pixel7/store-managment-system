import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useIsMobile } from './hooks/useIsMobile'
import { LoginPage } from './components/Auth/LoginPage'
import { DashboardPage } from './components/Dashboard/DashboardPage'
import { ItemsPage } from './components/Items/ItemsPage'
import { ItemDetailPage } from './components/Items/ItemDetailPage'
import { StockInPage } from './components/Transactions/StockInPage'
import { StockOutPage } from './components/Transactions/StockOutPage'
import { StockReturnPage } from './components/Transactions/StockReturnPage'
import { ImportWizard } from './components/Import/ImportWizard'
import { BackupSettings } from './components/Settings/BackupSettings'
import { DailyReportPage } from './components/Reports/DailyReportPage'
import { MonthlyReportPage } from './components/Reports/MonthlyReportPage'
import { AuditListPage } from './components/Audit/AuditListPage'
import { AuditCountPage } from './components/Audit/AuditCountPage'
import { AnalyticsPage } from './components/Analytics/AnalyticsPage'
import { ReorderPointsPage } from './components/Reorder/ReorderPointsPage'
import { LoadingScreen } from './components/Layout/LoadingScreen'
import { MobileNav } from './components/Layout/MobileNav'
import { pageVariants, pageTransition } from './lib/motion'

type Page = 'dashboard' | 'items' | 'stock-in' | 'stock-out' | 'stock-return' | 'item-detail' | 'import' | 'settings' | 'daily-report' | 'monthly-report' | 'audit-list' | 'audit-count' | 'analytics' | 'reorder';

function AppContent() {
  const { user, isAuthenticated, logout, canDoStockOps, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [backendReady, setBackendReady] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [navFilter, setNavFilter] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(false);
  const reportsRef = useRef<HTMLDivElement>(null);

  const handleBackendReady = useCallback(() => {
    setBackendReady(true);
  }, []);

  useEffect(() => {
    if (!showReports) return;
    const handleClick = (e: MouseEvent) => {
      if (reportsRef.current && !reportsRef.current.contains(e.target as Node)) {
        setShowReports(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showReports]);

  if (!backendReady) {
    return <LoadingScreen onReady={handleBackendReady} />;
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const handleViewItem = (itemId: number) => {
    setSelectedItemId(itemId);
    setCurrentPage('item-detail');
  };

  const handleBackFromItem = () => {
    setSelectedItemId(null);
    setCurrentPage('items');
  };

  const handleOpenAudit = (auditId: number) => {
    setSelectedAuditId(auditId);
    setCurrentPage('audit-count');
  };

  const handleBackFromAudit = () => {
    setSelectedAuditId(null);
    setCurrentPage('audit-list');
  };

  const handleNavigate = (page: string) => {
    if (page.includes('?')) {
      const [base, query] = page.split('?');
      const params = new URLSearchParams(query);
      const filter = params.get('filter');
      setCurrentPage(base as Page);
      setNavFilter(filter);
    } else {
      setCurrentPage(page as Page);
      setNavFilter(null);
    }
    setSelectedItemId(null);
  };

  const navButtons = [
    { id: 'dashboard', label: 'Dashboard', show: true },
    { id: 'items', label: 'Items', show: true },
    { id: 'stock-in', label: 'Stock In', show: canDoStockOps },
    { id: 'stock-out', label: 'Issue', show: canDoStockOps },
    { id: 'stock-return', label: 'Return', show: canDoStockOps },
    { id: 'reports', label: 'Reports', show: true, isDropdown: true },
    { id: 'import', label: 'Import', show: true },
    { id: 'audit-list', label: 'Audit', show: true },
    { id: 'analytics', label: 'Analytics', show: true },
    { id: 'reorder', label: 'Reorder', show: true },
    { id: 'settings', label: 'Settings', show: isAdmin },
  ];

  return (
    <div className="min-h-screen bg-base">
      {/* Desktop Navigation */}
      {!isMobile && (
        <nav className="bg-surface/70 backdrop-blur-xl border-b border-border-light print:hidden sticky top-0 z-40">
          {/* Gradient accent line at top */}
          <div className="h-[2px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
          <div className="max-w-7xl mx-auto pl-2 pr-6">
            <div className="flex items-center justify-between h-20">
              {/* Logo */}
              <div className="flex items-center gap-3.5 flex-shrink-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-lg shadow-accent/20">
                  <svg className="w-5.5 h-5.5 text-base" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div className="hidden lg:block">
                  <div className="text-sm font-bold text-text tracking-wide leading-tight">STORE MANAGEMENT</div>
                  <div className="text-[9px] text-text-muted tracking-[0.2em] uppercase">Inventory Control</div>
                </div>
              </div>

              {/* Nav Items */}
              <LayoutGroup>
                <div className="flex items-center gap-2">
                  {navButtons.filter(b => b.show).map((btn) => {
                    if (btn.isDropdown) {
                      const isActive = currentPage === 'daily-report' || currentPage === 'monthly-report';
                      return (
                        <div key={btn.id} className="relative" ref={reportsRef}>
                          <button
                            onClick={() => setShowReports(!showReports)}
                            className={`relative flex flex-col items-center gap-2 px-5 py-3.5 rounded-xl transition-all duration-150 group ${
                              isActive ? 'text-accent bg-accent/8' : 'text-text-secondary hover:text-text hover:bg-hover'
                            }`}
                          >
                            {isActive && (
                              <motion.div
                                layoutId="active-underline"
                                className="absolute bottom-0 left-3 right-3 h-[3px] bg-gradient-to-r from-accent to-accent-press rounded-full shadow-[0_0_10px_rgba(232,160,53,0.4)]"
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                              />
                            )}
                            <svg className={`w-6 h-6 transition-transform duration-150 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-[11px] font-medium leading-tight flex items-center gap-1">
                              Reports
                              <motion.svg
                                animate={{ rotate: showReports ? 180 : 0 }}
                                transition={{ duration: 0.15 }}
                                className="w-3 h-3"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </motion.svg>
                            </span>
                          </button>
                          <AnimatePresence>
                            {showReports && (
                              <motion.div
                                initial={{ opacity: 0, y: -6, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.95 }}
                                transition={{ duration: 0.12 }}
                                className="absolute left-0 top-full mt-2 w-48 glass border border-border rounded-xl shadow-2xl z-[60] overflow-hidden"
                              >
                                <div className="p-1.5">
                                  <button
                                    onClick={() => { handleNavigate('daily-report'); setShowReports(false); }}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-text hover:bg-hover rounded-lg transition-colors group"
                                  >
                                    <svg className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Daily Report
                                  </button>
                                  <button
                                    onClick={() => { handleNavigate('monthly-report'); setShowReports(false); }}
                                    className="flex items-center gap-3 w-full text-left px-3 py-2.5 text-sm text-text hover:bg-hover rounded-lg transition-colors group"
                                  >
                                    <svg className="w-4 h-4 text-text-muted group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                    Monthly Report
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    }

                    const isActive = currentPage === btn.id || (btn.id === 'items' && currentPage === 'item-detail');
                    const icon = (() => {
                      switch (btn.id) {
                        case 'dashboard': return <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />;
                        case 'items': return <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />;
                        case 'stock-in': return <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />;
                        case 'stock-out': return <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />;
                        case 'stock-return': return <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />;
                        case 'import': return <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />;
                        case 'audit-list': return <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />;
                        case 'analytics': return <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />;
                        case 'reorder': return <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;
                        case 'settings': return <><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>;
                        default: return <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />;
                      }
                    })();

                    return (
                      <button
                        key={btn.id}
                        onClick={() => handleNavigate(btn.id)}
                        className={`relative flex flex-col items-center gap-2 px-5 py-3.5 rounded-xl transition-all duration-150 group ${
                          isActive ? 'text-accent bg-accent/8' : 'text-text-secondary hover:text-text hover:bg-hover'
                        }`}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="active-underline"
                            className="absolute bottom-0 left-3 right-3 h-[3px] bg-gradient-to-r from-accent to-accent-press rounded-full shadow-[0_0_10px_rgba(232,160,53,0.4)]"
                            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                          />
                        )}
                        <svg className={`w-6 h-6 transition-transform duration-150 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                          {icon}
                        </svg>
                        <span className="text-[11px] font-medium leading-tight">{btn.label}</span>
                      </button>
                    );
                  })}
                </div>
              </LayoutGroup>

              {/* User Section */}
              <div className="flex items-center gap-3.5 flex-shrink-0">
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium text-text leading-tight">{user?.full_name}</div>
                  <span className="text-[9px] font-bold text-accent bg-accent-dim px-2 py-0.5 rounded-full border border-accent/15 uppercase tracking-wider">{user?.role}</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-press flex items-center justify-center text-base font-bold text-base shadow-lg shadow-accent/15">
                  {user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <button
                  onClick={logout}
                  className="p-2.5 text-text-secondary hover:text-danger hover:bg-danger-dim rounded-xl transition-all duration-150"
                  title="Logout"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Mobile Header */}
      {isMobile && (
        <nav className="bg-surface/80 backdrop-blur-xl border-b border-border-light px-4 py-2.5 flex items-center justify-between print:hidden">
          <span className="font-bold text-text text-sm tracking-wide">STORE MGMT</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary">{user?.full_name}</span>
            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text hover:bg-hover rounded-lg min-h-[44px] transition-colors"
            >
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* Page Content */}
      <div className={isMobile ? 'pb-20 safe-area-bottom' : ''}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
          >
            {currentPage === 'dashboard' && (
              <DashboardPage onNavigate={handleNavigate} onViewItem={handleViewItem} />
            )}
            {currentPage === 'items' && (
              <ItemsPage onViewItem={handleViewItem} initialFilter={navFilter} />
            )}
            {currentPage === 'item-detail' && selectedItemId && (
              <ItemDetailPage itemId={selectedItemId} onBack={handleBackFromItem} />
            )}
            {currentPage === 'stock-in' && canDoStockOps && <StockInPage />}
            {currentPage === 'stock-out' && canDoStockOps && <StockOutPage />}
            {currentPage === 'stock-return' && canDoStockOps && <StockReturnPage />}
            {currentPage === 'daily-report' && <DailyReportPage />}
            {currentPage === 'monthly-report' && <MonthlyReportPage />}
            {currentPage === 'import' && <ImportWizard />}
            {currentPage === 'audit-list' && <AuditListPage onOpenAudit={handleOpenAudit} />}
            {currentPage === 'audit-count' && selectedAuditId && (
              <AuditCountPage auditId={selectedAuditId} onBack={handleBackFromAudit} />
            )}
            {currentPage === 'analytics' && <AnalyticsPage />}
            {currentPage === 'reorder' && <ReorderPointsPage />}
            {currentPage === 'settings' && isAdmin && (
              <div className="min-h-screen bg-base">
                <div className="bg-surface border-b border-border px-4 py-4">
                  <h1 className="text-xl font-bold text-text">Settings</h1>
                  <p className="text-sm text-text-secondary mt-0.5">System configuration and backup</p>
                </div>
                <div className="p-4 max-w-3xl mx-auto space-y-6">
                  <BackupSettings />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <MobileNav currentPage={currentPage} onNavigate={handleNavigate} canDoStockOps={canDoStockOps} />
      )}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
