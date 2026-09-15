// ImportWizard Component
// Multi-step wizard for importing Excel files with multi-sheet support

import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ColumnMapper } from './ColumnMapper';
import { PreviewTable } from './PreviewTable';
import {
  parseExcelFile,
  validateItems,
  validateStock,
  importItems,
  importOpeningStock,
  downloadErrors,
} from '../../api/import';
import type { ParsedFile, SheetInfo, ValidationError, ImportResult, MultiSheetData } from '../../api/import';

type ImportType = 'items' | 'stock';
type Step = 'upload' | 'sheets' | 'mapping' | 'preview' | 'result';

const MAPPING_KEY = 'store_import_mapping';

export function ImportWizard() {
  const { canDoStockOps } = useAuth();
  const [importType, setImportType] = useState<ImportType>('items');
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [multiSheetData, setMultiSheetData] = useState<MultiSheetData | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<SheetInfo | null>(null);
  const [fileData, setFileData] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Record<string, any>[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [duplicateHandling, setDuplicateHandling] = useState<'skip' | 'update'>('skip');

  // Load saved mapping
  const loadSavedMapping = (sheetName?: string) => {
    const key = sheetName
      ? `${MAPPING_KEY}_${importType}_${sheetName}`
      : `${MAPPING_KEY}_${importType}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setMapping(JSON.parse(saved));
      } catch {
        setMapping({});
      }
    } else {
      setMapping({});
    }
  };

  // Save mapping
  const saveMapping = (m: Record<string, string>, sheetName?: string) => {
    const key = sheetName
      ? `${MAPPING_KEY}_${importType}_${sheetName}`
      : `${MAPPING_KEY}_${importType}`;
    localStorage.setItem(key, JSON.stringify(m));
    setMapping(m);
  };

  // Handle file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setLoading(true);

    try {
      const parsed = await parseExcelFile(uploadedFile);
      setMultiSheetData(parsed);

      // If only one sheet, skip selection step
      if (parsed.sheets.length === 1) {
        handleSheetSelect(parsed.sheets[0]);
      } else {
        setStep('sheets');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setLoading(false);
    }
  };

  // Handle sheet selection
  const handleSheetSelect = (sheet: SheetInfo) => {
    setSelectedSheet(sheet);

    // Convert sheet to ParsedFile format
    const parsedFile: ParsedFile = {
      headers: sheet.headers,
      rows: sheet.rows,
      totalRows: sheet.totalRows,
      preview: sheet.rows.slice(0, 5),
    };
    setFileData(parsedFile);
    loadSavedMapping(sheet.name);
    setStep('mapping');
  };

  // Handle mapping confirm
  const handleMappingConfirm = async (m: Record<string, string>) => {
    saveMapping(m, selectedSheet?.name);
    setLoading(true);

    try {
      let response;
      if (importType === 'items') {
        response = await validateItems(fileData!, m);
      } else {
        response = await validateStock(fileData!, m);
      }

      setPreview(response.preview);
      setErrors(response.errors);
      setTotalRows(response.totalRows);
      setStep('preview');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle import confirm
  const handleImportConfirm = async () => {
    if (!fileData) return;
    setLoading(true);

    try {
      let importResult;
      if (importType === 'items') {
        importResult = await importItems(fileData.rows, mapping, duplicateHandling);
      } else {
        importResult = await importOpeningStock(fileData.rows, mapping);
      }

      setResult(importResult);
      setStep('result');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle download errors
  const handleDownloadErrors = async () => {
    if (errors.length === 0) return;
    try {
      await downloadErrors(errors);
    } catch (err) {
      alert('Failed to download errors');
    }
  };

  // Reset wizard
  const handleReset = () => {
    setFile(null);
    setMultiSheetData(null);
    setSelectedSheet(null);
    setFileData(null);
    setMapping({});
    setPreview([]);
    setErrors([]);
    setResult(null);
    setStep('upload');
  };

  if (!canDoStockOps) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center">
        <div className="text-text-secondary">You do not have permission to import data.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base">
      {/* Header */}
      <div className="bg-surface border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text">Import Data</h1>
          <button
            onClick={handleReset}
            className="px-4 py-1.5 text-sm font-medium text-text-secondary hover:text-text hover:bg-hover rounded"
          >
            Start Over
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto p-4">
        {/* Step Indicator */}
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            {['upload', 'sheets', 'mapping', 'preview', 'result'].map((s, i) => {
              // Skip sheets step if only one sheet
              if (s === 'sheets' && multiSheetData && multiSheetData.sheets.length <= 1) return null;
              const isActive = step === s;
              const isCompleted = i < ['upload', 'sheets', 'mapping', 'preview', 'result'].indexOf(step);
              return (
                <div key={s} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-accent text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-200 text-text-secondary'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="ml-2 text-sm text-text-secondary capitalize">{s}</span>
                  <div className="w-8 h-px bg-gray-300 mx-2" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="bg-surface rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-text mb-4">Select Import Type</h2>
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setImportType('items')}
                className={`px-6 py-3 rounded-lg border-2 ${
                  importType === 'items'
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border hover:border-border'
                }`}
              >
                <div className="font-medium">Import Items</div>
                <div className="text-sm text-text-secondary">Add new items to catalog</div>
              </button>
              <button
                onClick={() => setImportType('stock')}
                className={`px-6 py-3 rounded-lg border-2 ${
                  importType === 'stock'
                    ? 'border-accent bg-accent-dim text-accent'
                    : 'border-border hover:border-border'
                }`}
              >
                <div className="font-medium">Import Opening Stock</div>
                <div className="text-sm text-text-secondary">Set initial stock levels</div>
              </button>
            </div>

            <h2 className="text-lg font-medium text-text mb-4">Upload Excel File</h2>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-accent hover:text-accent-text"
              >
                {loading ? (
                  <div className="text-text-secondary">Processing file...</div>
                ) : (
                  <>
                    <div className="text-lg font-medium mb-2">
                      Click to select .xlsx file
                    </div>
                    <div className="text-sm text-text-secondary">
                      Supports Excel (.xlsx, .xls) and CSV files
                    </div>
                    <div className="text-xs text-text-secondary mt-2">
                      Multi-sheet files supported — each sheet can have its own mapping
                    </div>
                  </>
                )}
              </label>
            </div>
          </div>
        )}

        {/* Step: Sheet Selection */}
        {step === 'sheets' && multiSheetData && (
          <div className="bg-surface rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-text mb-2">Select Sheet to Import</h2>
            <p className="text-sm text-text-secondary mb-4">
              This file has {multiSheetData.totalSheets} sheets. Select one to import:
            </p>

            <div className="space-y-3">
              {multiSheetData.sheets.map((sheet) => (
                <button
                  key={sheet.name}
                  onClick={() => handleSheetSelect(sheet)}
                  className="w-full text-left p-4 border border-border rounded-lg hover:border-accent hover:bg-hover transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-text">{sheet.name}</div>
                      <div className="text-sm text-text-secondary">
                        {sheet.totalRows} rows, {sheet.headers.length} columns
                      </div>
                    </div>
                    <div className="text-xs text-text-secondary">
                      Header detected at row {sheet.detectedHeaderRow}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {sheet.headers.slice(0, 8).map((h) => (
                      <span key={h} className="px-2 py-0.5 text-xs bg-elevated rounded text-text-secondary">
                        {h}
                      </span>
                    ))}
                    {sheet.headers.length > 8 && (
                      <span className="px-2 py-0.5 text-xs bg-elevated rounded text-text-secondary">
                        +{sheet.headers.length - 8} more
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('upload')}
              className="mt-4 px-4 py-2 text-sm font-medium text-text-secondary hover:text-text hover:bg-hover rounded"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step: Mapping */}
        {step === 'mapping' && fileData && (
          <ColumnMapper
            headers={fileData.headers}
            importType={importType}
            initialMapping={mapping}
            onConfirm={handleMappingConfirm}
            onBack={() => setStep(selectedSheet ? 'sheets' : 'upload')}
            loading={loading}
            sheetName={selectedSheet?.name}
          />
        )}

        {/* Step: Preview */}
        {step === 'preview' && (
          <PreviewTable
            preview={preview}
            errors={errors}
            totalRows={totalRows}
            importType={importType}
            duplicateHandling={duplicateHandling}
            onDuplicateHandlingChange={setDuplicateHandling}
            onConfirm={handleImportConfirm}
            onBack={() => setStep('mapping')}
            onDownloadErrors={handleDownloadErrors}
            loading={loading}
          />
        )}

        {/* Step: Result */}
        {step === 'result' && result && (
          <div className="bg-surface rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-text mb-4">Import Complete</h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-green-600">{result.imported}</div>
                <div className="text-sm text-green-700">Imported</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-yellow-600">{result.skipped}</div>
                <div className="text-sm text-yellow-700">Skipped</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-red-600">{result.failed}</div>
                <div className="text-sm text-red-700">Failed</div>
              </div>
            </div>

            {result.duplicates.length > 0 && (
              <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                <div className="font-medium text-yellow-800 mb-2">
                  Skipped Items ({result.duplicates.length}):
                </div>
                <div className="text-sm text-yellow-700">
                  {result.duplicates.join(', ')}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div className="mb-4">
                <button
                  onClick={handleDownloadErrors}
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                >
                  Download Error List ({result.errors.length} errors)
                </button>
              </div>
            )}

            <button
              onClick={handleReset}
              className="px-4 py-2 text-sm font-medium text-white bg-accent rounded hover:bg-accent-hover"
            >
              Import More Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
