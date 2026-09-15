// PreviewTable Component
// Shows preview of data to be imported with validation errors

import type { ValidationError } from '../../api/import';

interface PreviewTableProps {
  preview: Record<string, any>[];
  errors: ValidationError[];
  totalRows: number;
  importType: 'items' | 'stock';
  duplicateHandling: 'skip' | 'update';
  onDuplicateHandlingChange: (value: 'skip' | 'update') => void;
  onConfirm: () => void;
  onBack: () => void;
  onDownloadErrors: () => void;
  loading: boolean;
}

export function PreviewTable({
  preview,
  errors,
  totalRows,
  importType,
  duplicateHandling,
  onDuplicateHandlingChange,
  onConfirm,
  onBack,
  onDownloadErrors,
  loading,
}: PreviewTableProps) {
  const columns = preview.length > 0 ? Object.keys(preview[0]) : [];

  const getRowErrors = (rowIndex: number) => {
    return errors.filter((e) => e.row === rowIndex + 1);
  };

  return (
    <div className="bg-surface rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-text mb-4">
        Preview - {importType === 'items' ? 'Items' : 'Opening Stock'}
      </h2>

      <div className="mb-4 text-sm text-text-secondary">
        Showing first {preview.length} of {totalRows} rows.
        {errors.length > 0 && (
          <span className="text-red-600 ml-2">
            {errors.length} validation error(s) found.
          </span>
        )}
      </div>

      {/* Duplicate handling (items only) */}
      {importType === 'items' && (
        <div className="mb-4 p-4 bg-elevated rounded-lg">
          <div className="text-sm font-medium text-text mb-2">
            Duplicate Item Code Handling:
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="skip"
                checked={duplicateHandling === 'skip'}
                onChange={(e) => onDuplicateHandlingChange(e.target.value as 'skip' | 'update')}
                className="w-4 h-4 text-accent"
              />
              <span className="text-sm text-text">Skip duplicates</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                value="update"
                checked={duplicateHandling === 'update'}
                onChange={(e) => onDuplicateHandlingChange(e.target.value as 'skip' | 'update')}
                className="w-4 h-4 text-accent"
              />
              <span className="text-sm text-text">Update existing items</span>
            </label>
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="overflow-x-auto mb-6">
        <table className="min-w-full border border-border">
          <thead className="bg-elevated">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary border-b">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium text-text-secondary border-b"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {preview.map((row, rowIdx) => {
              const rowErrors = getRowErrors(rowIdx);
              const hasErrors = rowErrors.length > 0;

              return (
                <tr
                  key={rowIdx}
                  className={hasErrors ? 'bg-red-50' : 'hover:bg-hover'}
                >
                  <td className="px-3 py-2 text-sm text-text-secondary border-b">
                    {rowIdx + 1}
                  </td>
                  {columns.map((col) => {
                    const cellError = rowErrors.find((e) => e.column === col);
                    return (
                      <td
                        key={col}
                        className={`px-3 py-2 text-sm border-b ${
                          cellError ? 'bg-red-100 text-red-700' : 'text-text'
                        }`}
                        title={cellError?.message}
                      >
                        {String(row[col] ?? '')}
                        {cellError && (
                          <div className="text-xs text-red-600 mt-0.5">
                            {cellError.message}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Error Summary */}
      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-red-800">
              {errors.length} validation error(s) found
            </div>
            <button
              onClick={onDownloadErrors}
              className="px-3 py-1 text-sm font-medium text-red-600 bg-surface border border-red-300 rounded hover:bg-red-50"
            >
              Download Error List
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text hover:bg-hover rounded"
        >
          ← Back
        </button>

        <button
          onClick={onConfirm}
          disabled={loading || (errors.length > 0 && importType === 'items')}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Importing...' : `Import ${totalRows} Rows`}
        </button>
      </div>
    </div>
  );
}
