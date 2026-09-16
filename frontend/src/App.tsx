import { useState, useCallback, useEffect } from 'react'
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

  const handleBackendReady = useCallback(() => {
    setBackendReady(true);
  }, []);

  useEffect(() => {
    if (!showReports) return;
    const handleClick = () => setShowReports(false);
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
        <nav className="bg-surface/80 backdrop-blur-xl border-b border-border-light print:hidden sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between h-14">
              <div className="flex items-center gap-8">
                <span className="font-bold text-text text-gradient-gold tracking-wide">STORE MGMT</span>
                <LayoutGroup>
                  <div className="flex gap-0.5">
                    {navButtons.filter(b => b.show).map((btn) => {
                      if (btn.isDropdown) {
                        const isActive = currentPage === 'daily-report' || currentPage === 'monthly-report';
                        return (
                          <div key={btn.id} className="relative">
                            <button
                              onClick={() => setShowReports(!showReports)}
                              className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                                isActive ? 'text-accent' : 'text-text-secondary hover:text-text hover:bg-hover'
                              }`}
                            >
                              {isActive && (
                                <motion.div
                                  layoutId="nav-pill"
                                  className="absolute inset-0 bg-accent-dim rounded-lg border border-accent/15"
                                  transition={{ type: 'tween', duration: 0.2 }}
                                />
                              )}
                              <span className="relative z-10">Reports ▾</span>
                            </button>
                            {showReports && (
                              <motion.div
                                initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                transition={{ duration: 0.12 }}
                                className="absolute left-0 top-full mt-1 w-44 bg-elevated border border-border rounded-xl shadow-xl z-[60] overflow-hidden"
                              >
                                <button
                                  onClick={() => { handleNavigate('daily-report'); setShowReports(false); }}
                                  className="block w-full text-left px-4 py-2.5 text-sm text-text hover:bg-hover transition-colors"
                                >
                                  Daily Report
                                </button>
                                <button
                                  onClick={() => { handleNavigate('monthly-report'); setShowReports(false); }}
                                  className="block w-full text-left px-4 py-2.5 text-sm text-text hover:bg-hover transition-colors"
                                >
                                  Monthly Report
                                </button>
                              </motion.div>
                            )}
                          </div>
                        );
                      }

                      const isActive = currentPage === btn.id || (btn.id === 'items' && currentPage === 'item-detail');
                      return (
                        <button
                          key={btn.id}
                          onClick={() => handleNavigate(btn.id)}
                          className={`relative px-3 py-1.5 text-sm font-medium rounded-lg transition-colors duration-150 ${
                            isActive ? 'text-accent' : 'text-text-secondary hover:text-text hover:bg-hover'
                          }`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="nav-pill"
                              className="absolute inset-0 bg-accent-dim rounded-lg border border-accent/15"
                              transition={{ type: 'tween', duration: 0.2 }}
                            />
                          )}
                          <span className="relative z-10">{btn.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </LayoutGroup>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-text">{user?.full_name}</div>
                  <div className="text-[10px] text-text-muted uppercase tracking-wider">{user?.role}</div>
                </div>
                <button
                  onClick={logout}
                  className="px-3 py-1.5 text-sm text-text-secondary hover:text-text hover:bg-hover rounded-lg transition-colors"
                >
                  Logout
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
