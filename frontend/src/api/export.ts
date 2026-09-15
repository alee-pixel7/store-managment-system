// Export API Client

const API_BASE = '/api';

export function getExportUrl(type: string, params: Record<string, string>, format: 'excel' | 'pdf'): string {
  const token = localStorage.getItem('store_auth_token');
  const queryString = new URLSearchParams({ format, token: token || '' }).toString();
  
  switch (type) {
    case 'daily':
      return `${API_BASE}/export/daily/${params.date}?${queryString}`;
    case 'monthly':
      return `${API_BASE}/export/monthly/${params.year}/${params.month}?${queryString}`;
    case 'items':
      return `${API_BASE}/export/items?${queryString}`;
    case 'ledger':
      return `${API_BASE}/export/ledger/${params.itemId}?${queryString}`;
    default:
      throw new Error('Unknown export type');
  }
}

export async function downloadExport(
  type: string,
  params: Record<string, string>,
  format: 'excel' | 'pdf'
): Promise<void> {
  const url = getExportUrl(type, params, format);
  
  // Fetch with auth header
  const token = localStorage.getItem('store_auth_token');
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Export failed');
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get('Content-Disposition');
  const filename = contentDisposition?.split('filename=')?.[1]?.replace(/"/g, '') || `export.${format === 'excel' ? 'xlsx' : 'pdf'}`;

  // Trigger download
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
