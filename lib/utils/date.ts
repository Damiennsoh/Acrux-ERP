/**
 * Formats a date string or timestamp into a human-readable format.
 * Transforms '2026-03-29T00:00:00.000Z' into 'Mar 29, 2026'
 */
export function formatDate(dateStr: string | number | Date | undefined): string {
  if (!dateStr) return 'N/A';
  
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return 'Invalid Date';
  }
}

/**
 * Normalizes a date for input[type="date"] fields.
 * Extracts YYYY-MM-DD from ISO or complex strings.
 */
export function toISODate(dateStr: any): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    const d = new Date(dateStr);
    return d.toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}
