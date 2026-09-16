// ColumnMapper Component
// Maps Excel columns to database fields

import { useState, useEffect } from 'react';
import { ITEM_FIELDS, STOCK_FIELDS } from '../../api/import';

interface ColumnMapperProps {
  headers: string[];
  importType: 'items' | 'stock';
  initialMapping: Record<string, string>;
  onConfirm: (mapping: Record<string, string>) => void;
  onBack: () => void;
  loading: boolean;
  sheetName?: string;
}

export function ColumnMapper({
  headers,
  importType,
  initialMapping,
  onConfirm,
  onBack,
  loading,
  sheetName,
}: ColumnMapperProps) {
  const [mapping, setMapping] = useState<Record<string, string>>(initialMapping);
  const fields = importType === 'items' ? ITEM_FIELDS : STOCK_FIELDS;

  // Auto-detect mappings based on header names
  useEffect(() => {
    if (Object.keys(initialMapping).length > 0) return;

    const autoMapping: Record<string, string> = {};
    const fieldKeys = Object.keys(fields);

    for (const header of headers) {
      const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, '');

      for (const fieldKey of fieldKeys) {
        const normalizedField = fieldKey.toLowerCase().replace(/[^a-z0-9]/g, '');

        // Check for exact or close match
        if (
          normalized === normalizedField ||
          normalized.includes(normalizedField) ||
          normalizedField.includes(normalized)
        ) {
          autoMapping[header] = fieldKey;
          break;
        }

        // Check common aliases
        const aliases: Record<string, string[]> = {
          item_code: ['code', 'sku', 'partno', 'partnumber', 'part_number', 'itemcode', 'itemcode'],
          item_name: ['name', 'description', 'itemname', 'itemname', 'partname'],
          brand: ['make', 'manufacturer', 'make'],
          unit: ['uom', 'unitofmeasure', 'unitofmeasure'],
          min_stock: ['minimum', 'minstock', 'minlevel', 'reorder'],
          rack_location: ['location', 'rack', 'bin', 'shelf', 'position'],
          category: ['type', 'group', 'classification'],
          quantity: ['qty', 'stock', 'qty', 'count', 'openingstock'],
          rate: ['price', 'cost', 'unitprice', 'unitcost'],
          remarks: ['notes', 'comment', 'description'],
        };

        const fieldAliases = aliases[fieldKey] || [];
        for (const alias of fieldAliases) {
          if (normalized.includes(alias) || alias.includes(normalized)) {
            autoMapping[header] = fieldKey;
            break;
          }
        }

        if (autoMapping[header]) break;
      }
    }

    setMapping(autoMapping);
  }, [headers, fields, initialMapping]);

  const handleMappingChange = (header: string, field: string) => {
    setMapping((prev) => ({
      ...prev,
      [header]: field,
    }));
  };

  const handleConfirm = () => {
    // Validate required fields are mapped
    const mappedFields = Object.values(mapping);
    const requiredFields = Object.entries(fields)
      .filter(([_, config]) => config.required)
      .map(([key]) => key);

    const missingRequired = requiredFields.filter((f) => !mappedFields.includes(f));
    if (missingRequired.length > 0) {
      alert(`Please map required fields: ${missingRequired.join(', ')}`);
      return;
    }

    onConfirm(mapping);
  };

  const mappedCount = Object.values(mapping).filter(Boolean).length;

  return (
    <div className="bg-surface rounded-lg shadow p-6">
      <h2 className="text-lg font-medium text-text mb-4">
        Map Columns - {importType === 'items' ? 'Items' : 'Opening Stock'}
        {sheetName && <span className="text-text-secondary font-normal ml-2">({sheetName})</span>}
      </h2>

      <div className="mb-4 text-sm text-text-secondary">
        Map each Excel column to the corresponding database field. Required fields are marked with *.
        Your mapping will be saved for next time.
      </div>

      <div className="space-y-3 mb-6">
        {headers.map((header) => (
          <div key={header} className="flex items-center gap-4">
            <div className="w-48 text-sm font-mono text-text truncate" title={header}>
              {header}
            </div>
            <div className="text-text-muted">→</div>
            <select
              value={mapping[header] || ''}
              onChange={(e) => handleMappingChange(header, e.target.value)}
              className="flex-1 px-3 py-1.5 text-sm border border-border rounded focus:ring-1 focus:ring-accent focus:border-accent"
            >
              <option value="">-- Skip this column --</option>
              {Object.entries(fields).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label} {config.required ? '*' : ''} - {config.description}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-text hover:bg-hover rounded"
        >
          ← Back
        </button>

        <div className="flex items-center gap-4">
          <div className="text-sm text-text-secondary">
            {mappedCount} of {headers.length} columns mapped
          </div>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-accent rounded hover:bg-accent-hover disabled:opacity-50"
          >
            {loading ? 'Validating...' : 'Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
