
/**
 * Standardizes organization names into a URL-friendly slug.
 * Example: "Green Land Power Inc." -> "green-land-power-inc"
 */
export function slugifyOrg(name: string): string {
  if (!name) return 'default-org';
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
