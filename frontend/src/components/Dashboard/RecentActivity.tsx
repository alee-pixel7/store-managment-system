import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '../../lib/motion';

interface Transaction {
  id: number;
  txn_no: string;
  txn_type: string;
  txn_date: string;
  party: string;
  item_count: number;
  total_qty: number;
  created_by: string;
}

interface RecentActivityProps {
  transactions: Transaction[];
  onNavigate: (page: string) => void;
}

export function RecentActivity({ transactions, onNavigate }: RecentActivityProps) {
  const getTxnStyle = (type: string) => {
    switch (type) {
      case 'IN':
        return { dot: 'bg-ok', text: 'text-ok', bg: 'bg-ok-dim', border: 'border-ok/20', label: 'IN', icon: '📥' };
      case 'OUT':
        return { dot: 'bg-danger', text: 'text-danger', bg: 'bg-danger-dim', border: 'border-danger/20', label: 'OUT', icon: '📤' };
      case 'RETURN':
        return { dot: 'bg-accent', text: 'text-accent', bg: 'bg-accent-dim', border: 'border-accent/20', label: 'RET', icon: '🔄' };
      case 'ADJUST':
        return { dot: 'bg-purple-500', text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'ADJ', icon: '⚖️' };
      case 'REVERSAL':
        return { dot: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'REV', icon: '↩️' };
      default:
        return { dot: 'bg-text-muted', text: 'text-text-secondary', bg: 'bg-elevated', border: 'border-border', label: type, icon: '📋' };
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const handleTxnClick = (txnType: string) => {
    switch (txnType) {
      case 'IN': case 'ADJUST': onNavigate('stock-in'); break;
      case 'OUT': onNavigate('stock-out'); break;
      case 'RETURN': onNavigate('stock-return'); break;
    }
  };

  return (
    <div className="glass rounded-xl border border-border-light overflow-hidden h-full">
      <div className="px-5 py-4 border-b border-border-light flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent-dim flex items-center justify-center">
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xs font-semibold text-text-secondary uppercase tracking-[0.12em]">Recent Activity</h2>
        </div>
        {transactions.length > 0 && (
          <span className="text-[10px] text-text-muted bg-elevated px-2.5 py-1 rounded-full font-medium">{transactions.length} recent</span>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6">
          <div className="w-16 h-16 rounded-full bg-elevated flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm font-medium">No transactions yet</p>
          <p className="text-text-muted text-xs mt-1">Activity will appear here</p>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="relative max-h-[420px] overflow-y-auto"
        >
          {/* Timeline line */}
          <div className="absolute left-[42px] top-0 bottom-0 w-px bg-border-light" />

          {transactions.map((txn, idx) => {
            const style = getTxnStyle(txn.txn_type);
            const isLast = idx === transactions.length - 1;
            return (
              <motion.button
                key={txn.id}
                variants={staggerItem}
                onClick={() => handleTxnClick(txn.txn_type)}
                className="w-full px-5 py-3.5 text-left hover:bg-hover transition-colors group relative"
              >
                <div className="flex items-start gap-4">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 mt-0.5">
                    <div className={`w-3 h-3 rounded-full ${style.dot} ring-2 ring-base shadow-sm`} />
                    {idx === 0 && (
                      <div className={`absolute inset-0 w-3 h-3 rounded-full ${style.dot} animate-ping opacity-40`} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md ${style.bg} ${style.text} border ${style.border}`}>
                        {style.icon} {style.label}
                      </span>
                      <span className="font-mono text-sm text-text font-medium group-hover:text-accent transition-colors">
                        {txn.txn_no}
                      </span>
                      <span className="ml-auto flex-shrink-0 text-[11px] text-text-muted tabular-nums">
                        {formatTime(txn.txn_date)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-text-secondary">
                      <span className="font-medium text-text">{txn.party || 'System'}</span>
                      <span className="text-text-muted">·</span>
                      <span>{txn.item_count} item{txn.item_count !== 1 ? 's' : ''}</span>
                      <span className="text-text-muted">·</span>
                      <span className="tabular-nums font-medium">{txn.total_qty} pcs</span>
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
