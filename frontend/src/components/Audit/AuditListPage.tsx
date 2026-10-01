// AuditListPage Component
// Lists all stock audits with status and progress

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { listAudits, startAudit } from '../../api/audits';
import { formatDate } from '../../lib/dates';
import type { AuditSummary } from '../../api/audits';

interface AuditListPageProps {
  onOpenAudit: (auditId: number) => void;
}

export function AuditListPage({ onOpenAudit }: AuditListPageProps) {
  const { canDoStockOps } = useAuth();
  const [audits, setAudits] = useState<AuditSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    loadAudits();
  }, []);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const data = await listAudits();
      setAudits(data.audits);
    } catch (err) {
      console.error('Failed to load audits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAudit = async () => {
    setStarting(true);
    try {
      const audit = await startAudit(notes || undefined);
      setNotes('');
      onOpenAudit(audit.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to start audit');
    } finally {
      setStarting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const base = 'px-2 py-0.5 text-xs font-medium rounded';
    switch (status) {
      case 'DRAFT':
        return <span className={`${base} bg-base text-text`}>Draft</span>;
      case 'IN_PROGRESS':
        return <span className={`${base} bg-accent-dim text-accent`}>In Progress</span>;
      case 'FINALISED':
        return <span className={`${base} bg-green-100 text-green-700`}>Finalised</span>;
      default:
        return <span className={`${base} bg-base text-text`}>{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3 sticky top-0 z-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-text">Stock Audits</h1>
          {canDoStockOps && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes (optional)"
                className="input flex-1 sm:flex-initial text-sm min-h-[44px]"
              />
              <button
                onClick={handleStartAudit}
                disabled={starting}
                className="btn btn-primary btn-md disabled:opacity-50 min-h-[44px] whitespace-nowrap"
              >
                {starting ? 'Starting...' : '+ New'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Audit List */}
      <div className="p-2 sm:p-4">
        {loading ? (
          <div className="text-center py-8 text-text-secondary">Loading audits...</div>
        ) : audits.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">No audits found. Start a new audit to begin.</div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-elevated border-b border-border">
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Progress</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Variances</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Created By</th>
                  <th className="px-4 py-3 text-left font-medium text-text-secondary">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {audits.map((audit) => (
                  <tr key={audit.id} className="hover:bg-hover">
                    <td className="px-4 py-3 font-mono text-text">#{audit.id}</td>
                    <td className="px-4 py-3 text-text-secondary">{formatDate(audit.auditDate)}</td>
                    <td className="px-4 py-3">{getStatusBadge(audit.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-accent h-2 rounded-full"
                            style={{
                              width: `${audit.totalItems > 0 ? (audit.countedItems / audit.totalItems) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary">
                          {audit.countedItems}/{audit.totalItems}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {audit.variances > 0 ? (
                        <span className="text-red-600 font-medium">{audit.variances}</span>
                      ) : (
                        <span className="text-text-muted">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{audit.createdBy}</td>
                    <td className="px-4 py-3 text-text-secondary max-w-xs truncate">{audit.notes || '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onOpenAudit(audit.id)}
                        className="text-accent hover:text-accent-text text-sm font-medium"
                      >
                        {audit.status === 'FINALISED' ? 'View' : 'Open'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
