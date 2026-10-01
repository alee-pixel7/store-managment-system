import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import AuthProvider, { useAuth } from './contexts/AuthContext'
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

type NavButton = {
  id: string;
  label: string;
  show: boolean;
  section: string;
  isDropdown?: boolean;
};

const NAV_SECTIONS = ['Main', 'Operations', 'Insights', 'Admin'];

/* Sidebar icons — one place, no inline switch in render */
function navIcon(id: string) {
  switch (id) {
    case 'dashboard': return <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />;
    case 'items': return <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />;
    case 'stock-in': return <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />;
    case 'stock-out': return <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />;
    case 'stock-return': return <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />;
    case 'reports': return <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />;
    case 'import': return <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />;
    case 'audit-list': return <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />;
    case 'analytics': return <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />;
    case 'reorder': return <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />;
    case 'settings': return <><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 001.066-2.573c-.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573-1.066c1.543.94 3.31-.826 2.37-2.37a1.724 1.724 0 001.066-2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-1.066 2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>;
    default: return <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />;
  }
}

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
    setShowReports(false);
  };

  const navButtons: NavButton[] = [
    { id: 'dashboard', label: 'Dashboard', show: true, section: 'Main' },
    { id: 'items', label: 'Items', show: true, section: 'Main' },
    { id: 'stock-in', label: 'Stock In', show: canDoStockOps, section: 'Operations' },
    { id: 'stock-out', label: 'Issue', show: canDoStockOps, section: 'Operations' },
    { id: 'stock-return', label: 'Return', show: canDoStockOps, section: 'Operations' },
    { id: 'import', label: 'Import', show: true, section: 'Operations' },
    { id: 'reports', label: 'Reports', show: true, section: 'Insights', isDropdown: true },
    { id: 'analytics', label: 'Analytics', show: true, section: 'Insights' },
    { id: 'reorder', label: 'Reorder', show: true, section: 'Insights' },
    { id: 'audit-list', label: 'Audit', show: true, section: 'Admin' },
    { id: 'settings', label: 'Settings', show: isAdmin, section: 'Admin' },
  ];

  const isPageActive = (id: string) =>
    currentPage === id ||
    (id === 'items' && currentPage === 'item-detail') ||
    (id === 'audit-list' && currentPage === 'audit-count') ||
    (id === 'reports' && (currentPage === 'daily-report' || currentPage === 'monthly-report'));

  const userInitials = user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-base">
      {/* ── Desktop Sidebar ─────────────────────────────── */}
      {!isMobile && (
        <aside className="fixed inset-y-0 left-0 w-[260px] bg-surface border-r border-border-light flex flex-col z-40 print:hidden">
          {/* Violet top edge */}
          <div className="h-[2px] bg-gradient-to-r from-accent/50 via-accent/20 to-transparent flex-shrink-0" />

          {/* Logo */}
          <div className="px-4 py-4 border-b border-border-light flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-lg shadow-accent/20 flex-shrink-0">
                <svg className="w-5 h-5 text-base" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-bold text-text tracking-wide leading-tight truncate">STORE MANAGEMENT</div>
                <div className="text-[9px] text-text-muted tracking-[0.2em] uppercase">Inventory Control</div>
              </div>
            </div>
          </div>

          {/* Nav sections */}
          <nav className="flex-1 min-h-0 overflow-y-auto px-3 py-4">
            {NAV_SECTIONS.map((section) => {
              const items = navButtons.filter((b) => b.show && b.section === section);
              if (items.length === 0) return null;
              return (
                <div key={section} className="mb-4">
                  <div className="px-3 mb-1.5 text-[10px] font-semibold text-text-muted tracking-[0.15em] uppercase select-none">
                    {section}
                  </div>
                  <div className="space-y-1">
                    {items.map((btn) => {
                      if (btn.isDropdown) {
                        const isActive = currentPage === 'daily-report' || currentPage === 'monthly-report';
                        return (
                          <div key={btn.id} ref={reportsRef}>
                            <button
                              onClick={() => setShowReports(!showReports)}
                              className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                            >
                              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                                {navIcon(btn.id)}
                              </svg>
                              <span className="flex-1 text-left">{btn.label}</span>
                              <motion.svg
                                animate={{ rotate: showReports ? 180 : 0 }}
                                transition={{ duration: 0.15 }}
                                className="w-3.5 h-3.5 flex-shrink-0 opacity-60"
                                fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                              </motion.svg>
                            </button>
                            <AnimatePresence initial={false}>
                              {showReports && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18, ease: 'easeOut' }}
                                  className="overflow-hidden"
                                >
                                  <div className="ml-[18px] my-0.5 pl-3 py-0.5 border-l border-border-light space-y-0.5">
                                    <button
                                      onClick={() => handleNavigate('daily-report')}
                                      className={`flex items-center w-full px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                                        currentPage === 'daily-report'
                                          ? 'bg-accent/10 text-accent-text font-medium'
                                          : 'text-text-secondary hover:text-text hover:bg-hover'
                                      }`}
                                    >
                                      Daily Report
                                    </button>
                                    <button
                                      onClick={() => handleNavigate('monthly-report')}
                                      className={`flex items-center w-full px-3 py-1.5 rounded-lg text-[13px] transition-colors ${
                                        currentPage === 'monthly-report'
                                          ? 'bg-accent/10 text-accent-text font-medium'
                                          : 'text-text-secondary hover:text-text hover:bg-hover'
                                      }`}
                                    >
                                      Monthly Report
                                    </button>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      }

                      const isActive = isPageActive(btn.id);
                      return (
                        <button
                          key={btn.id}
                          onClick={() => handleNavigate(btn.id)}
                          className={`sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
                        >
                          <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                            {navIcon(btn.id)}
                          </svg>
                          <span className="flex-1 text-left">{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* User card */}
          <div className="border-t border-border-light p-3 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-press flex items-center justify-center text-base font-bold text-[11px] shadow-md shadow-accent/15 flex-shrink-0">
                {userInitials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-text truncate leading-tight">{user?.full_name}</div>
                <span className="inline-block text-[9px] font-bold text-accent bg-accent-dim px-1.5 py-px rounded-full border border-accent/15 uppercase tracking-wider mt-0.5">
                  {user?.role}
                </span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 text-text-secondary hover:text-danger hover:bg-danger-dim rounded-lg transition-colors flex-shrink-0"
              >
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* ── Mobile Header ───────────────────────────────── */}
      {isMobile && (
        <nav className="bg-surface/80 backdrop-blur-xl border-b border-border-light px-4 py-2.5 flex items-center justify-between print:hidden sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-press flex items-center justify-center shadow-md shadow-accent/20">
              <svg className="w-4 h-4 text-base" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
              </svg>
            </div>
            <span className="font-bold text-text text-sm tracking-wide">STORE MGMT</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary max-w-[110px] truncate">{user?.full_name}</span>
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
      <div className={isMobile ? 'pb-20 safe-area-bottom' : 'pl-[260px] print:pl-0'}>
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
            {currentPage === 'analytics' && (
              <div className="min-h-screen bg-base">
                <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center shadow-lg shadow-purple-500/10">
                      <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-text tracking-tight">Analytics</h1>
                      <p className="text-sm text-text-secondary">Stock trends, machine consumption, and dead stock reports</p>
                    </div>
                  </motion.div>
                  <AnalyticsPage />
                </div>
              </div>
            )}
            {currentPage === 'reorder' && <ReorderPointsPage />}
            {currentPage === 'settings' && isAdmin && (
              <div className="min-h-screen bg-base">
                <div className="max-w-6xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-3 mb-6"
                  >
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shadow-lg shadow-accent/10">
                      <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-text tracking-tight">Settings</h1>
                      <p className="text-sm text-text-secondary">System configuration and backup</p>
                    </div>
                  </motion.div>
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
