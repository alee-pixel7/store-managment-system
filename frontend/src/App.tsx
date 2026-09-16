import { useState, useCallback, useEffect } from 'react'
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

type Page = 'dashboard' | 'items' | 'stock-in' | 'stock-out' | 'stock-return' | 'item-detail' | 'import' | 'settings' | 'daily-report' | 'monthly-report' | 'audit-list' | 'audit-count' | 'analytics' | 'reorder';

function AppContent() {
  const { user, isAuthenticated, logout, canDoStockOps, isAdmin } = useAuth();
  const isMobile = useIsMobile();
  const [backendReady, setBackendReady] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('stock-out');
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<number | null>(null);
  const [navFilter, setNavFilter] = useState<string | null>(null);
  const [showReports, setShowReports] = useState(false);

  const handleBackendReady = useCallback(() => {
    setBackendReady(true);
  }, []);

  // Close reports dropdown on outside click
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

  return (
    <div className="min-h-screen bg-base">
      {/* Desktop Navigation - hidden on mobile */}
      {!isMobile && (
      <nav className="bg-surface border-b border-border print:hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-6">
              <span className="font-semibold text-text">Store Management</span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleNavigate('dashboard')}
                  className={`px-3 py-1.5 text-sm font-medium rounded ${
                    currentPage === 'dashboard'
                      ? 'bg-accent-dim text-accent'
                      : 'text-text-secondary hover:bg-hover'
                  }`}
                >
                  Dashboard
                </button>
                <button
                  onClick={() => handleNavigate('items')}
                  className={`px-3 py-1.5 text-sm font-medium rounded ${
                    currentPage === 'items' || currentPage === 'item-detail'
                      ? 'bg-accent-dim text-accent'
                      : 'text-text-secondary hover:bg-hover'
                  }`}
                >
                  Items
                </button>
                {canDoStockOps && (
                  <>
                    <button
                      onClick={() => handleNavigate('stock-in')}
                      className={`px-3 py-1.5 text-sm font-medium rounded ${
                        currentPage === 'stock-in'
                          ? 'bg-accent-dim text-accent'
                          : 'text-text-secondary hover:bg-hover'
                      }`}
                    >
                      Stock In
                    </button>
                    <button
                      onClick={() => handleNavigate('stock-out')}
                      className={`px-3 py-1.5 text-sm font-medium rounded ${
                        currentPage === 'stock-out'
                          ? 'bg-accent-dim text-accent'
                          : 'text-text-secondary hover:bg-hover'
                      }`}
                    >
                      Issue
                    </button>
                    <button
                      onClick={() => handleNavigate('stock-return')}
                      className={`px-3 py-1.5 text-sm font-medium rounded ${
                        currentPage === 'stock-return'
                          ? 'bg-accent-dim text-accent'
                          : 'text-text-secondary hover:bg-hover'
                      }`}
                    >
                      Return
                    </button>
                  </>
                )}
                <div className="relative">
                  <button
                    onClick={() => setShowReports(!showReports)}
                    className={`px-3 py-1.5 text-sm font-medium rounded ${
                      currentPage === 'daily-report' || currentPage === 'monthly-report'
                        ? 'bg-accent-dim text-accent'
                        : 'text-text-secondary hover:bg-hover'
                    }`}
                  >
                    Reports ▾
                  </button>
                  {showReports && (
                    <div className="absolute left-0 top-full mt-1 w-40 bg-surface border border-border rounded shadow-lg z-[60]">
                      <button
                        onClick={() => { handleNavigate('daily-report'); setShowReports(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-text hover:bg-hover"
                      >
                        Daily Report
                      </button>
                      <button
                        onClick={() => { handleNavigate('monthly-report'); setShowReports(false); }}
                        className="block w-full text-left px-4 py-2 text-sm text-text hover:bg-hover"
                      >
                        Monthly Report
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleNavigate('import')}
                  className={`px-3 py-1.5 text-sm font-medium rounded ${
                    currentPage === 'import'
                      ? 'bg-accent-dim text-accent'
                      : 'text-text-secondary hover:bg-hover'
                  }`}
                >
                  Import
                </button>
                <button
                  onClick={() => handleNavigate('audit-list')}
                  className={`px-3 py-1.5 text-sm font-medium rounded ${
                    currentPage === 'audit-list' || currentPage === 'audit-count'
                      ? 'bg-accent-dim text-accent'
                      : 'text-text-secondary hover:bg-hover'
                  }`}
                >
                  Audit
                </button>
                <button
                  onClick={() => handleNavigate('analytics')}
                  className={`px-3 py-1.5 text-sm font-medium rounded ${
                    currentPage === 'analytics'
                      ? 'bg-accent-dim text-accent'
                      : 'text-text-secondary hover:bg-hover'
                  }`}
                >
                  Analytics
                </button>
                <button
                  onClick={() => handleNavigate('reorder')}
                  className={`px-3 py-1.5 text-sm font-medium rounded ${
                    currentPage === 'reorder'
                      ? 'bg-accent-dim text-accent'
                      : 'text-text-secondary hover:bg-hover'
                  }`}
                >
                  Reorder
                </button>
                {isAdmin && (
                  <button
                    onClick={() => handleNavigate('settings')}
                    className={`px-3 py-1.5 text-sm font-medium rounded ${
                      currentPage === 'settings'
                        ? 'bg-accent-dim text-accent'
                        : 'text-text-secondary hover:bg-hover'
                    }`}
                  >
                    Settings
                  </button>
                )}
              </div>
            </div>

            {/* User info + logout */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-text">{user?.full_name}</div>
                <div className="text-xs text-text-secondary">{user?.role}</div>
              </div>
              <button
                onClick={logout}
                className="px-3 py-1.5 text-sm text-text-secondary hover:text-text hover:bg-hover rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      )}

      {/* Mobile Header - visible only on mobile */}
      {isMobile && (
      <nav className="bg-surface border-b border-border px-4 py-2 flex items-center justify-between print:hidden">
        <span className="font-semibold text-text">Store Management</span>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary">{user?.full_name}</span>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-sm text-text-secondary hover:text-text hover:bg-hover rounded min-h-[44px]"
          >
            Logout
          </button>
        </div>
      </nav>
      )}

      {/* Page Content */}
      <div className={isMobile ? 'pb-20 safe-area-bottom' : ''}>
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
            <div className="bg-surface border-b border-border px-4 py-3">
              <h1 className="text-xl font-semibold text-text">Settings</h1>
            </div>
            <div className="p-4 max-w-3xl mx-auto space-y-6">
              <BackupSettings />
            </div>
          </div>
        )}
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
